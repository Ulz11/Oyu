# 🎨 Claude Design — бэлэн prompt

Хэрэв та энэ workspace-ийн дизайныг **Claude / Figma Make / Claude Artifacts** дээр
дахин үүсгэх, эсвэл өөр дэлгэц нэмэхийг хүсвэл доорх prompt-ыг хуулаад ашиглаарай.

---

## 📋 Copy–paste prompt

```
Build a calm, Apple-like learning workspace called "Oyu" for a Mongolian law
student whose goal is to become a judge. Primary UI language is MONGOLIAN
(Cyrillic); the second learning language is Chinese (show 汉字 in Noto Sans SC,
display hanzi in Noto Serif SC).

DESIGN DIRECTION — "Тэнгэр ба Шунх" (Sky & Cinnabar), the traditional Mongolian
triad of colors:
- Mood: scholarly, refined, quiet confidence. Apple-smooth, not flashy.
- Palette: deep LAPIS sky-blue ink (#16294f / #2a4a9e) on warm PORCELAIN paper
  (#f5f1e8 / #fffefa), CINNABAR-VERMILION seal red (#c2452d) for the Chinese
  room and audio elements, GOLD (#b98a2f / #ddba6b) for achievement/exams,
  jade green (#2e7d64) only for success states.
- Background: layered aurora washes (gold top-right, lapis bottom-left, faint
  vermilion right) over porcelain, plus a subtle SVG grain texture.
- Typography: 'Playfair Display' serif for display/headings (full Cyrillic
  support, judicial elegance, italic accents in gold), 'Golos Text' for
  body/UI (Cyrillic-first sans), Noto Sans SC / Noto Serif SC for Chinese.
- Layout: BENTO GRID dashboard — tiles of varied sizes, generous rounded
  corners (18–34px), soft layered shadows + inset top highlight, hover lift.
- Motion: staggered fade-up on load, cubic-bezier(.32,.72,0,1) easing, springy
  buttons cubic-bezier(.34,1.45,.5,1), confetti on perfect scores, pulsing
  ring animation on playing audio buttons.
- Icons: thin (1.6) stroke line icons in currentColor, inline SVG only.
- Audio: every Chinese word/dialog line has a round vermilion speaker button
  (Web Speech API, zh-CN voice); "listen and choose" exercise type with a
  large play button in a vermilion-tinted bar.
- Knowledge graph: 3D force-directed canvas — glossy gradient spheres with
  specular highlights, depth fog, slow auto-rotation, drag-to-orbit,
  scroll-to-zoom, click-to-highlight connections, 2D/3D toggle.

STRUCTURE:
- Left sidebar nav: Нүүр (Home), two rooms (⚖️ Хууль зүй, 语 Хятад хэл),
  Мэдлэгийн граф (knowledge graph), Миний файл (files), Явц (progress).
  Sidebar footer shows an XP/level card.
- Dashboard: navy hero greeting tile ("Өнөөдөр шүүгчийн замын нэг алхам…"),
  XP/level stat, two room cards with progress bars, stat tiles, quick links.
- Room view: lessons grouped by section. Law room has 2 sections —
  🇲🇳 Монголын эрх зүй and 🌐 Олон улсын эрх зүй. Each lesson row shows an
  order number, title, level pill (Анхан/Дунд/Гүнзгий), a TOK knowledge
  question, duration, XP, exercise count, plus an exam CTA at the bottom.
- Lesson view: hero with a large watermark CJK glyph, a highlighted TOK card
  (italic serif question + "ways of knowing" pills), content blocks (text,
  key points, law citation, case study, fun fact, vocab grid), then an
  interactive exercise section (multiple-choice, true/false, matching) that
  grades on submit with green/red states, explanations, a result ring, and
  confetti on a perfect score.
- Knowledge graph: force-directed interactive canvas, nodes color-coded by
  group, draggable, click to reveal connections.
- Files & Notes: drag-and-drop upload zone + quick-note cards.
- Progress: level bar, stat bento, and an achievement/badge grid.

Every lesson is TOK-based (framed around a knowledge question). All law content
is grounded in real Mongolian law (Компанийн тухай хууль, Иргэний хууль) AND
international law (CISG, New York Convention, arbitration). Keep it LIGHT theme,
clean, comfortable, and flexible.
```

---

## 🎯 Design tokens (хурдан лавлах)

| Token | Утга |
|---|---|
| `--paper` | `#f5f1e8` (шаазан цаас) |
| `--card` | `#fffefa` |
| `--ink` | `#182238` |
| `--lapis` / `--lapis-deep` | `#2a4a9e` / `#16294f` (тэнгэрийн хөх — хууль зүй) |
| `--verm` / `--verm-lt` | `#c2452d` / `#e0785a` (шунх улаан — хятад хэл, аудио) |
| `--gold` / `--gold-lt` | `#b98a2f` / `#ddba6b` (алт — амжилт, шалгалт) |
| `--ok` | `#2e7d64` (амжилттай төлөв) |
| Radius | `18 / 26 / 34px` |
| Easing | `cubic-bezier(.32,.72,0,1)` · spring `cubic-bezier(.34,1.45,.5,1)` |
| Fonts | Playfair Display · Golos Text · Noto Sans SC · Noto Serif SC |

Энэ дизайн систем нь [`frontend/static/css/styles.css`](frontend/static/css/styles.css)
дотор бүрэн хэрэгжсэн байгаа.
