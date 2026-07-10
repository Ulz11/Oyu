# -*- coding: utf-8 -*-
"""SQLite давхарга — явц, файл, тэмдэглэл хадгална."""
import sqlite3
import json
from pathlib import Path
from datetime import date, datetime, timedelta, timezone

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
DB_PATH = DATA_DIR / "oyu.db"

DATA_DIR.mkdir(exist_ok=True)
UPLOAD_DIR.mkdir(exist_ok=True)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with connect() as c:
        c.executescript(
            """
            CREATE TABLE IF NOT EXISTS progress (
                lesson_id   TEXT PRIMARY KEY,
                room        TEXT,
                score       INTEGER DEFAULT 0,
                total       INTEGER DEFAULT 0,
                xp          INTEGER DEFAULT 0,
                perfect     INTEGER DEFAULT 0,
                completed_at TEXT
            );
            CREATE TABLE IF NOT EXISTS exam_results (
                room        TEXT PRIMARY KEY,
                score       INTEGER,
                total       INTEGER,
                passed      INTEGER,
                taken_at    TEXT
            );
            CREATE TABLE IF NOT EXISTS files (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                name        TEXT,
                stored      TEXT,
                room        TEXT,
                size        INTEGER,
                content_type TEXT,
                uploaded_at TEXT
            );
            CREATE TABLE IF NOT EXISTS notes (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                room        TEXT,
                title       TEXT,
                body        TEXT,
                updated_at  TEXT
            );
            CREATE TABLE IF NOT EXISTS obama_items (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                type        TEXT,
                title       TEXT,
                body        TEXT,
                link        TEXT,
                due_date    TEXT,
                priority    TEXT DEFAULT 'normal',
                done        INTEGER DEFAULT 0,
                read        INTEGER DEFAULT 0,
                created_at  TEXT,
                pack_id     TEXT,
                score       INTEGER,
                total       INTEGER
            );
            -- Зайлшгүй давталт (SM-2 lite). Картын агуулга content.py-д;
            -- энд зөвхөн картын хуваарийн төлөв хадгална.
            CREATE TABLE IF NOT EXISTS srs (
                card_key    TEXT PRIMARY KEY,
                lesson_id   TEXT,
                ease        REAL DEFAULT 2.5,
                interval    INTEGER DEFAULT 0,
                due         TEXT,
                reps        INTEGER DEFAULT 0,
                lapses      INTEGER DEFAULT 0,
                last_review TEXT
            );
            """
        )
        # Хуучин өгөгдлийн сан руу шинэ баганууд нэмэх (idempotent миграци)
        cols = {r[1] for r in c.execute("PRAGMA table_info(obama_items)")}
        for name, ddl in (("pack_id", "TEXT"), ("score", "INTEGER"), ("total", "INTEGER")):
            if name not in cols:
                c.execute(f"ALTER TABLE obama_items ADD COLUMN {name} {ddl}")


# ----------------------------- Явц (Progress) ------------------------------

def save_progress(lesson_id, room, score, total, xp, perfect):
    with connect() as c:
        c.execute(
            """INSERT INTO progress (lesson_id, room, score, total, xp, perfect, completed_at)
               VALUES (?,?,?,?,?,?,?)
               ON CONFLICT(lesson_id) DO UPDATE SET
                 score=MAX(score, excluded.score),
                 total=excluded.total,
                 xp=MAX(xp, excluded.xp),
                 perfect=MAX(perfect, excluded.perfect),
                 completed_at=excluded.completed_at""",
            (lesson_id, room, score, total, xp, perfect, _now()),
        )


def save_exam(room, score, total, passed):
    with connect() as c:
        c.execute(
            """INSERT INTO exam_results (room, score, total, passed, taken_at)
               VALUES (?,?,?,?,?)
               ON CONFLICT(room) DO UPDATE SET
                 score=MAX(score, excluded.score),
                 total=excluded.total,
                 passed=MAX(passed, excluded.passed),
                 taken_at=excluded.taken_at""",
            (room, score, total, 1 if passed else 0, _now()),
        )


def get_progress():
    with connect() as c:
        rows = c.execute("SELECT * FROM progress").fetchall()
        exams = c.execute("SELECT * FROM exam_results").fetchall()
    return [dict(r) for r in rows], [dict(r) for r in exams]


# ------------------------------- Файл (Files) ------------------------------

def add_file(name, stored, room, size, content_type):
    with connect() as c:
        cur = c.execute(
            """INSERT INTO files (name, stored, room, size, content_type, uploaded_at)
               VALUES (?,?,?,?,?,?)""",
            (name, stored, room, size, content_type, _now()),
        )
        return cur.lastrowid


def list_files():
    with connect() as c:
        rows = c.execute("SELECT * FROM files ORDER BY uploaded_at DESC").fetchall()
    return [dict(r) for r in rows]


def get_file(file_id):
    with connect() as c:
        row = c.execute("SELECT * FROM files WHERE id=?", (file_id,)).fetchone()
    return dict(row) if row else None


def delete_file(file_id):
    f = get_file(file_id)
    if not f:
        return False
    with connect() as c:
        c.execute("DELETE FROM files WHERE id=?", (file_id,))
    try:
        (UPLOAD_DIR / f["stored"]).unlink(missing_ok=True)
    except OSError:
        pass
    return True


# ----------------------------- Тэмдэглэл (Notes) ---------------------------

def upsert_note(note_id, room, title, body):
    with connect() as c:
        if note_id:
            c.execute(
                "UPDATE notes SET room=?, title=?, body=?, updated_at=? WHERE id=?",
                (room, title, body, _now(), note_id),
            )
            return note_id
        cur = c.execute(
            "INSERT INTO notes (room, title, body, updated_at) VALUES (?,?,?,?)",
            (room, title, body, _now()),
        )
        return cur.lastrowid


def list_notes():
    with connect() as c:
        rows = c.execute("SELECT * FROM notes ORDER BY updated_at DESC").fetchall()
    return [dict(r) for r in rows]


def delete_note(note_id):
    with connect() as c:
        c.execute("DELETE FROM notes WHERE id=?", (note_id,))
    return True


# --------------------------- Obama Room (даалгавар) -------------------------

def add_obama_item(item_type, title, body, link, due_date, priority, pack_id=None):
    with connect() as c:
        cur = c.execute(
            """INSERT INTO obama_items
               (type, title, body, link, due_date, priority, done, read, created_at, pack_id)
               VALUES (?,?,?,?,?,?,0,0,?,?)""",
            (item_type, title, body, link, due_date, priority, _now(), pack_id),
        )
        return cur.lastrowid


def record_pack_result(pack_id, score, total):
    """Багц дууссаны дараа холбогдох бүх картад оноог (хамгийн сайн) бичнэ."""
    with connect() as c:
        c.execute(
            """UPDATE obama_items
               SET score = MAX(COALESCE(score, 0), ?), total = ?, done = 1
               WHERE pack_id = ?""",
            (score, total, pack_id),
        )


def list_obama_items():
    with connect() as c:
        rows = c.execute("SELECT * FROM obama_items ORDER BY created_at DESC").fetchall()
    return [dict(r) for r in rows]


def unread_obama_count():
    with connect() as c:
        return c.execute("SELECT COUNT(*) FROM obama_items WHERE read=0").fetchone()[0]


def mark_obama_read(item_id):
    with connect() as c:
        c.execute("UPDATE obama_items SET read=1 WHERE id=?", (item_id,))


def mark_all_obama_read():
    with connect() as c:
        c.execute("UPDATE obama_items SET read=1")


def toggle_obama_done(item_id):
    with connect() as c:
        row = c.execute("SELECT done FROM obama_items WHERE id=?", (item_id,)).fetchone()
        if not row:
            return None
        newval = 0 if row["done"] else 1
        c.execute("UPDATE obama_items SET done=? WHERE id=?", (newval, item_id))
        return newval


def delete_obama_item(item_id):
    with connect() as c:
        c.execute("DELETE FROM obama_items WHERE id=?", (item_id,))
    return True


def done_obama_tasks_count():
    with connect() as c:
        return c.execute(
            "SELECT COUNT(*) FROM obama_items WHERE type='task' AND done=1"
        ).fetchone()[0]


# --------------------------- Зайлшгүй давталт (SRS) ------------------------
# SM-2 lite: карт бүрийг чанараар үнэлж (again/hard/good/easy), дараагийн
# давтах огноог тооцно. Картын урд/ард талыг content.py-аас card_key-ээр авна.

def _today() -> str:
    return date.today().isoformat()


_SRS_QUALITY = {"again": 0, "hard": 3, "good": 4, "easy": 5}


def activate_srs_cards(cards):
    """cards: [(card_key, lesson_id), ...] — байхгүй бол өнөөдөр давтахаар нэмнэ."""
    with connect() as c:
        for key, lesson_id in cards:
            c.execute(
                """INSERT OR IGNORE INTO srs
                   (card_key, lesson_id, ease, interval, due, reps, lapses)
                   VALUES (?,?,?,?,?,?,?)""",
                (key, lesson_id, 2.5, 0, _today(), 0, 0),
            )


def due_srs(limit=40):
    with connect() as c:
        rows = c.execute(
            "SELECT * FROM srs WHERE due <= ? ORDER BY due ASC LIMIT ?",
            (_today(), limit),
        ).fetchall()
    return [dict(r) for r in rows]


def srs_counts():
    with connect() as c:
        total = c.execute("SELECT COUNT(*) FROM srs").fetchone()[0]
        due = c.execute("SELECT COUNT(*) FROM srs WHERE due <= ?", (_today(),)).fetchone()[0]
        reps = c.execute("SELECT COALESCE(SUM(reps),0) FROM srs").fetchone()[0]
    return {"total": total, "due": due, "reps": reps}


def review_srs(card_key, grade):
    """SM-2 lite шинэчлэл. grade ∈ again|hard|good|easy."""
    q = _SRS_QUALITY.get(grade, 4)
    with connect() as c:
        row = c.execute("SELECT * FROM srs WHERE card_key=?", (card_key,)).fetchone()
        if not row:
            return None
        ease, interval, reps, lapses = row["ease"], row["interval"], row["reps"], row["lapses"]
        if q < 3:                       # again — эхнээс нь давтана
            reps, interval, lapses, due_days = 0, 0, lapses + 1, 0
        else:
            reps += 1
            if reps == 1:
                interval = 1
            elif reps == 2:
                interval = 3
            else:
                interval = round(interval * ease)
            ease = max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))
            due_days = interval
        due_date = (date.today() + timedelta(days=due_days)).isoformat()
        c.execute(
            """UPDATE srs SET ease=?, interval=?, due=?, reps=?, lapses=?, last_review=?
               WHERE card_key=?""",
            (ease, interval, due_date, reps, lapses, _now(), card_key),
        )
    return {"interval": interval, "due": due_date, "ease": round(ease, 2), "reps": reps}
