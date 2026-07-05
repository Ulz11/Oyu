# -*- coding: utf-8 -*-
"""
Oyu · Суралцах орон зай — FastAPI сервер
Python 3.14 · FastAPI

Ажиллуулах:
    pip install -r backend/requirements.txt
    uvicorn backend.main:app --reload
Дараа нь http://127.0.0.1:8000 хаягаар нээнэ.
"""
import hashlib
import hmac
import os
import re
import secrets
import time
import uuid
from datetime import date
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import content as C
from . import database as db

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

app = FastAPI(title="Oyu · Суралцах орон зай", version="1.0.0")

db.init_db()


# ================================ Нэвтрэлт ================================
# Хоёр хэрэглэгч: Оюу (суралцагч) ба Обама (мэнтор).
# Нууц үгийг орчны хувьсагчаар солино: OYU_PASSWORD, OBAMA_PASSWORD.
# Session = HMAC-гаар гарын үсэг зурсан күүки (30 хоног).

USERS = {
    "oyu":   {"name": "Оюу",   "role": "student",
              "password": os.environ.get("OYU_PASSWORD", "oyu123")},
    "obama": {"name": "Обама", "role": "mentor",
              "password": os.environ.get("OBAMA_PASSWORD", "obama123")},
}

_SECRET_FILE = db.DATA_DIR / "secret.key"


def _secret() -> bytes:
    env = os.environ.get("OYU_SECRET")
    if env:
        return env.encode()
    if _SECRET_FILE.exists():
        return _SECRET_FILE.read_bytes()
    s = secrets.token_bytes(32)
    _SECRET_FILE.write_bytes(s)
    return s


SECRET = _secret()
SESSION_DAYS = 30


def _sign(payload: str) -> str:
    return hmac.new(SECRET, payload.encode(), hashlib.sha256).hexdigest()


def _make_token(username: str) -> str:
    exp = int(time.time()) + 60 * 60 * 24 * SESSION_DAYS
    payload = f"{username}.{exp}"
    return f"{payload}.{_sign(payload)}"


def _session_user(request: Request):
    tok = request.cookies.get("oyu_session")
    if not tok:
        return None
    payload, _, sig = tok.rpartition(".")
    if not payload or not hmac.compare_digest(_sign(payload), sig):
        return None
    username, _, exp = payload.partition(".")
    if username not in USERS or not exp.isdigit() or int(exp) < time.time():
        return None
    u = USERS[username]
    return {"username": username, "name": u["name"], "role": u["role"]}


_PUBLIC_API = {"/api/health", "/api/auth/login", "/api/auth/logout", "/api/auth/me"}


@app.middleware("http")
async def auth_guard(request: Request, call_next):
    path = request.url.path
    if path.startswith("/api") and path not in _PUBLIC_API:
        user = _session_user(request)
        if not user:
            return JSONResponse({"detail": "Нэвтрээгүй байна"}, status_code=401)
        request.state.user = user
    return await call_next(request)


class LoginIn(BaseModel):
    username: str
    password: str


@app.post("/api/auth/login")
def auth_login(body: LoginIn, response: Response):
    u = USERS.get(body.username)
    if not u or not hmac.compare_digest(u["password"], body.password):
        raise HTTPException(401, "Нэвтрэх нэр эсвэл нууц үг буруу байна")
    response.set_cookie(
        "oyu_session", _make_token(body.username),
        max_age=60 * 60 * 24 * SESSION_DAYS, httponly=True, samesite="lax",
    )
    return {"username": body.username, "name": u["name"], "role": u["role"]}


@app.post("/api/auth/logout")
def auth_logout(response: Response):
    response.delete_cookie("oyu_session")
    return {"ok": True}


@app.get("/api/auth/me")
def auth_me(request: Request):
    user = _session_user(request)
    if not user:
        raise HTTPException(401, "Нэвтрээгүй байна")
    return user


# =============================== API загварууд ==============================

class ExerciseSubmit(BaseModel):
    lesson_id: str
    answers: dict  # {exercise_id: answer}


class ExamSubmit(BaseModel):
    room: str
    answers: dict


class NoteIn(BaseModel):
    id: int | None = None
    room: str = "general"
    title: str = ""
    body: str = ""


class ObamaItemIn(BaseModel):
    type: str = "note"          # reading | task | note | pack
    title: str
    body: str = ""
    link: str | None = None
    due_date: str | None = None
    priority: str = "normal"    # low | normal | high
    pack_id: str | None = None  # type == "pack" үед сургалтын багцын id


# ============================== Агуулгын API ===============================

@app.get("/api/rooms")
def get_rooms():
    prog, exams = db.get_progress()
    done = {p["lesson_id"] for p in prog}
    exam_map = {e["room"]: e for e in exams}
    out = []
    for r in C.ROOMS:
        lessons = C.lessons_for_room(r["id"])
        completed = sum(1 for l in lessons if l["id"] in done)
        out.append({
            **r,
            "lessonCount": len(lessons),
            "completed": completed,
            "exam": exam_map.get(r["id"]),
        })
    return out


@app.get("/api/rooms/{room_id}")
def room_detail(room_id: str):
    room = C.get_room(room_id)
    if not room:
        raise HTTPException(404, "Өрөө олдсонгүй")
    prog, exams = db.get_progress()
    done = {p["lesson_id"]: p for p in prog}
    lessons = [
        {**C.lesson_summary(l), "done": l["id"] in done,
         "best": done.get(l["id"], {}).get("score")}
        for l in C.lessons_for_room(room_id)
    ]
    lessons.sort(key=lambda x: (x["section"], x["order"]))
    exam = next((e for e in exams if e["room"] == room_id), None)
    return {"room": room, "lessons": lessons,
            "exam": {**C.EXAMS[room_id], "result": exam,
                     "questions": len(C.EXAMS[room_id]["questions"])}}


def _safe_exercise(e: dict) -> dict:
    """Дасгалын хариуг нуусан хувилбар — match-ийн pairs-ийг left/right болгоно."""
    item = {k: v for k, v in e.items() if k not in ("answer",)}
    if e["type"] == "match":
        item["left"] = [p["a"] for p in e["pairs"]]
        item["right"] = sorted([p["b"] for p in e["pairs"]])
        item.pop("pairs", None)
    return item


@app.get("/api/lessons/{lesson_id}")
def lesson_detail(lesson_id: str):
    lesson = C.get_lesson(lesson_id)
    if not lesson:
        raise HTTPException(404, "Хичээл олдсонгүй")
    return {**lesson, "exercises": [_safe_exercise(e) for e in lesson.get("exercises", [])]}


@app.post("/api/exercises/submit")
def submit_exercises(payload: ExerciseSubmit):
    lesson = C.get_lesson(payload.lesson_id)
    if not lesson:
        raise HTTPException(404, "Хичээл олдсонгүй")
    results = {}
    correct = 0
    exercises = lesson.get("exercises", [])
    for e in exercises:
        given = payload.answers.get(e["id"])
        ok = _grade(e, given)
        if ok:
            correct += 1
        results[e["id"]] = {
            "correct": ok,
            "answer": e.get("answer") if e["type"] != "match" else
                      {p["a"]: p["b"] for p in e["pairs"]},
            "explain": e.get("explain", ""),
        }
    total = len(exercises)
    perfect = 1 if total and correct == total else 0
    xp = round(lesson["xp"] * (correct / total)) if total else 0
    db.save_progress(payload.lesson_id, lesson["room"], correct, total, xp, perfect)
    if lesson["room"] == "pack":
        # Обамагийн оноосон багцын үр дүнг картад нь автоматаар холбоно
        db.record_pack_result(payload.lesson_id, correct, total)
    return {"score": correct, "total": total, "xp": xp,
            "perfect": bool(perfect), "results": results}


@app.get("/api/exam/{room_id}")
def get_exam(room_id: str):
    exam = C.EXAMS.get(room_id)
    if not exam:
        raise HTTPException(404, "Шалгалт олдсонгүй")
    return {**exam, "questions": [_safe_exercise(q) for q in exam["questions"]]}


@app.post("/api/exam/submit")
def submit_exam(payload: ExamSubmit):
    exam = C.EXAMS.get(payload.room)
    if not exam:
        raise HTTPException(404, "Шалгалт олдсонгүй")
    results = {}
    correct = 0
    for q in exam["questions"]:
        given = payload.answers.get(q["id"])
        ok = _grade(q, given)
        if ok:
            correct += 1
        results[q["id"]] = {
            "correct": ok,
            "answer": q.get("answer") if q["type"] != "match" else
                      {p["a"]: p["b"] for p in q["pairs"]},
            "explain": q.get("explain", ""),
        }
    total = len(exam["questions"])
    pct = round(correct / total * 100) if total else 0
    passed = pct >= exam["pass"]
    db.save_exam(payload.room, correct, total, passed)
    return {"score": correct, "total": total, "percent": pct,
            "passed": passed, "pass": exam["pass"], "results": results}


@app.get("/api/graph/{room_id}")
def get_graph(room_id: str):
    g = C.GRAPHS.get(room_id)
    if not g:
        raise HTTPException(404, "Граф олдсонгүй")
    return g


@app.get("/api/packs")
def packs_catalog():
    """Обамагийн оноож болох сургалтын багцуудын каталог."""
    return [C.lesson_summary(p) for p in C.TRAINING_PACKS]


@app.get("/api/progress")
def progress():
    prog, exams = db.get_progress()
    total_xp = sum(p["xp"] for p in prog)
    lessons_done = len(prog)
    chinese_done = sum(1 for p in prog if p["room"] == "chinese")
    law_done = sum(1 for p in prog if p["room"] == "law")
    intl_done = sum(1 for p in prog if p["lesson_id"].startswith("law-intl"))
    bizcn_done = sum(1 for p in prog if p["lesson_id"].startswith("cn-b"))
    cases_done = sum(1 for p in prog if p["lesson_id"].startswith("case-"))
    cn_adv_done = sum(1 for p in prog if p["lesson_id"].startswith("cn-adv"))
    packs_done = sum(1 for p in prog if p["room"] == "pack")
    perfect = sum(1 for p in prog if p["perfect"])
    exams_passed = sum(1 for e in exams if e["passed"])
    obama_tasks_done = db.done_obama_tasks_count()

    stats = {"lessons": lessons_done, "chinese": chinese_done, "law": law_done,
             "intl": intl_done, "bizcn": bizcn_done, "cases": cases_done,
             "cn_adv": cn_adv_done, "packs": packs_done,
             "perfect": perfect, "exams": exams_passed,
             "obama_tasks": obama_tasks_done}
    earned = [b for b in C.BADGES if _badge_ok(b["rule"], stats)]

    level = 1 + total_xp // 300
    into = total_xp % 300
    day = date.today().toordinal()
    return {
        "totalXp": total_xp, "level": level, "xpInto": into, "xpNext": 300,
        "lessonsDone": lessons_done, "perfect": perfect,
        "examsPassed": exams_passed, "chinese": chinese_done, "law": law_done,
        "badges": [{**b, "earned": b in earned} for b in C.BADGES],
        "proverb": C.PROVERBS[day % len(C.PROVERBS)],
        "obamaUnread": db.unread_obama_count(),
        "progress": prog, "exams": exams,
    }


# ================================ Файл API ================================

_SAFE = re.compile(r"[^A-Za-z0-9._-]+")


@app.get("/api/files")
def files_list():
    return db.list_files()


@app.post("/api/files")
async def upload(file: UploadFile = File(...), room: str = Form("general")):
    raw = await file.read()
    if len(raw) > 25 * 1024 * 1024:
        raise HTTPException(413, "Файл 25MB-аас хэтэрсэн байна")
    ext = Path(file.filename or "file").suffix
    stored = f"{uuid.uuid4().hex}{ext}"
    (db.UPLOAD_DIR / stored).write_bytes(raw)
    fid = db.add_file(file.filename or stored, stored, room, len(raw),
                      file.content_type or "application/octet-stream")
    return db.get_file(fid)


@app.get("/api/files/{file_id}/download")
def download(file_id: int):
    f = db.get_file(file_id)
    if not f:
        raise HTTPException(404, "Файл олдсонгүй")
    path = db.UPLOAD_DIR / f["stored"]
    if not path.exists():
        raise HTTPException(404, "Файл байхгүй байна")
    return FileResponse(path, filename=f["name"], media_type=f["content_type"])


@app.delete("/api/files/{file_id}")
def remove_file(file_id: int):
    if not db.delete_file(file_id):
        raise HTTPException(404, "Файл олдсонгүй")
    return {"ok": True}


# =============================== Тэмдэглэл API =============================

@app.get("/api/notes")
def notes_list():
    return db.list_notes()


@app.post("/api/notes")
def note_save(note: NoteIn):
    nid = db.upsert_note(note.id, note.room, note.title, note.body)
    return {"id": nid}


@app.delete("/api/notes/{note_id}")
def note_delete(note_id: int):
    db.delete_note(note_id)
    return {"ok": True}


# ============================ Obama Room API ===============================
# Обамагийн Оюуд өгөх уншлага, даалгавар, тэмдэглэлийн сан.
# "Мэдэгдэл" гэдэг нь энэ апп доторх unread badge + toast хэлбэртэй —
# и-мэйл/push тохируулаагүй тул гадаад суваг руу илгээдэггүй.

@app.get("/api/obama")
def obama_list():
    return db.list_obama_items()


@app.get("/api/obama/unread")
def obama_unread():
    return {"unread": db.unread_obama_count()}


@app.post("/api/obama")
def obama_create(item: ObamaItemIn, request: Request):
    if request.state.user["role"] != "mentor":
        raise HTTPException(403, "Зөвхөн мэнтор нэмнэ")
    if item.type not in ("reading", "task", "note", "pack"):
        raise HTTPException(400, "Буруу төрөл")
    pack_id = None
    if item.type == "pack":
        pack = C.get_lesson(item.pack_id or "")
        if not pack or pack.get("room") != "pack":
            raise HTTPException(400, "Сургалтын багц олдсонгүй")
        pack_id = pack["id"]
    iid = db.add_obama_item(item.type, item.title, item.body, item.link,
                             item.due_date, item.priority, pack_id)
    return {"id": iid}


@app.post("/api/obama/read-all")
def obama_read_all():
    db.mark_all_obama_read()
    return {"ok": True}


@app.post("/api/obama/{item_id}/read")
def obama_read(item_id: int):
    db.mark_obama_read(item_id)
    return {"ok": True}


@app.post("/api/obama/{item_id}/done")
def obama_done(item_id: int):
    newval = db.toggle_obama_done(item_id)
    if newval is None:
        raise HTTPException(404, "Олдсонгүй")
    return {"done": bool(newval)}


@app.delete("/api/obama/{item_id}")
def obama_delete(item_id: int, request: Request):
    if request.state.user["role"] != "mentor":
        raise HTTPException(403, "Зөвхөн мэнтор устгана")
    db.delete_obama_item(item_id)
    return {"ok": True}


# ============================== Дүгнэх логик ==============================

def _grade(item: dict, given) -> bool:
    t = item["type"]
    if t in ("mcq", "listen"):
        return given == item.get("answer")
    if t == "truefalse":
        return given == item.get("answer")
    if t == "match":
        if not isinstance(given, dict):
            return False
        truth = {p["a"]: p["b"] for p in item["pairs"]}
        return all(given.get(a) == b for a, b in truth.items())
    return False


def _badge_ok(rule: str, stats: dict) -> bool:
    m = re.match(r"(\w+)>=(\d+)", rule)
    if not m:
        return False
    key, val = m.group(1), int(m.group(2))
    return stats.get(key, 0) >= val


# ============================ Статик frontend =============================
# API-аас доор байрлуулж, бүх замыг frontend рүү чиглүүлнэ (SPA fallback).

@app.get("/api/health")
def health():
    return {"ok": True, "app": "Oyu", "lessons": len(C.LESSONS)}


if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="static")
else:
    @app.get("/")
    def _no_frontend():
        return JSONResponse({"error": "frontend directory not found"}, status_code=500)
