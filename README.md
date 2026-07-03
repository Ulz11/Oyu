# Oyu · Суралцах орон зай 🎓⚖️

Оюугийн хувийн суралцах орон зай — ирээдүйн **шүүгч**-ийн замд.
Эрх зүйн 3-р курсын оюутанд зориулсан, **TOK (Мэдлэгийн онол)** суурьтай хос өрөөт
интерактив платформ.

> **Дизайн:** «Тэнгэр ба Шунх» — Монгол уламжлалт гурвал: тэнгэрийн хөх (lapis),
> шунх улаан (vermilion), алт — дулаан шаазан цаасан дээр. Apple шиг зөөлөн,
> bento сүлжээ, цэвэрхэн, тайван мэдрэмж.

---

## ✨ Онцлог

| | |
|---|---|
| **2 суралцах өрөө** | ⚖️ Хууль зүй (Корпораци/Бизнес) · 中 Хятад хэл |
| **15 хичээл** | 🇲🇳 Монголын эрх зүй (5) · 🌐 Олон улс (4) · 中文 суурь (4) + бизнес (2) |
| **🔊 Жинхэнэ хятад аудио** | Үг, харилцан яриа бүр дээр дуудлага (Web Speech · zh-CN) |
| **Сонсох дасгал** | Сонсоод зөв утгыг нь сонгох listening exercises |
| **TOK сэтгэлгээ** | Хичээл бүр мэдлэгийн асуулт, "мэдэх аргууд"-тай |
| **Түвшинтэй дасгал** | Анхан / Дунд / Гүнзгий · сонголт, үнэн-худал, холбох, сонсох |
| **Шалгалт** | Өрөө тус бүрд 8 асуулттай эцсийн шалгалт |
| **3D мэдлэгийн граф** | Эргэлдэх огторгуй · чирч эргүүлэх · томруулах · 2D/3D |
| **Тоглоомжуулалт** | XP, түвшин, 10 тэмдэг, өдрийн сургаал үг, confetti 🎉 |
| **Файл сан** | Материал, тэмдэглэлээ хадгалах |
| **Хэл** | Үндсэн: Монгол · Хоёр дахь суралцах: Хятад |

---

## 🛠 Технологи

- **Backend:** FastAPI · Python 3.14 · SQLite (built-in)
- **Frontend:** Цэвэр HTML5 / CSS / Vanilla JS (build хийх шаардлагагүй)
- **Фонт:** Playfair Display (кирилл serif), Golos Text (кирилл sans), Noto Sans/Serif SC
- **Аудио:** Web Speech API — Windows/Edge/Chrome-ийн жинхэнэ zh-CN дуу хоолой
- **Граф:** Canvas дээрх өөрийн бичсэн 3D force-directed engine (хамааралгүй)

---

## 🚀 Ажиллуулах

### 1. Хамаарлыг суулгах
```powershell
python -m pip install -r backend/requirements.txt
```

### 2. Серверийг асаах
```powershell
python -m uvicorn backend.main:app --reload
```

### 3. Нээх
Хөтчөөр **http://127.0.0.1:8000** (эсвэл 8000-ыг өөр порт зааж өгсөн бол тэр) уруу орно.

> **Windows дээр `python` олдохгүй бол:** `.\start.bat` файлыг давхар товшино уу —
> Python 3.14-ийг автоматаар олж сервер асаана.

---

## ☁️ Байршуулах (Deploy)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Ulz11/Oyu)

Дээрх товчийг дарж **Render** (үнэгүй) дээр нэг товшилтоор байршуулна —
[`render.yaml`](render.yaml) blueprint болон [`Dockerfile`](Dockerfile)-ийг автоматаар таньж
`/api/health` health check-тэй веб сервис үүсгэнэ.

Мөн **Railway / Fly.io / Heroku**-д шууд тохирно (`Dockerfile` + `Procfile` бэлэн).

> ⚠️ Үнэгүй түвшний диск нь түр зуурынх: сервер дахин асахад SQLite өгөгдөл
> (явц, файл) шинэчлэгдэнэ. Байнгын хадгалалт хэрэгтэй бол Render-ийн
> persistent disk-ийг `data/` хавтсанд холбоорой.

---

## 📁 Бүтэц

```
OYU/
├── backend/
│   ├── main.py          # FastAPI — API + статик frontend
│   ├── content.py       # Бүх хичээл, дасгал, шалгалт, граф (монголоор)
│   ├── database.py      # SQLite — явц, файл, тэмдэглэл
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   └── static/
│       ├── css/styles.css
│       └── js/{icons,api,graph,app}.js
├── data/                # Автоматаар үүснэ (oyu.db + uploads/)
├── start.bat            # Windows түргэн эхлүүлэгч
└── README.md
```

---

## 🔌 API

| Method | Зам | Тайлбар |
|---|---|---|
| `GET` | `/api/rooms` | Өрөөнүүд + явц |
| `GET` | `/api/rooms/{id}` | Өрөөний хичээлүүд |
| `GET` | `/api/lessons/{id}` | Хичээлийн агуулга (хариу нуугдсан) |
| `POST` | `/api/exercises/submit` | Дасгал дүгнэх |
| `GET/POST` | `/api/exam/{room}` | Шалгалт авах / дүгнэх |
| `GET` | `/api/graph/{room}` | Мэдлэгийн граф |
| `GET` | `/api/progress` | XP, түвшин, тэмдэг |
| `GET/POST/DELETE` | `/api/files` | Файл байршуулах/татах/устгах |
| `GET/POST/DELETE` | `/api/notes` | Тэмдэглэл |

Interactive API docs: **http://127.0.0.1:8000/docs**

---

## 📝 Агуулга нэмэх

Шинэ хичээл нэмэхийн тулд [`backend/content.py`](backend/content.py) доторх
`LESSONS` жагсаалтад Python dict нэмнэ — код өөрчлөх шаардлагагүй, автоматаар
UI-д гарч ирнэ. Граф зангилаа `GRAPHS`, шалгалт `EXAMS` дотор.

---

Оюу, амжилт хүсье. Мэдлэг бол шударга ёсны суурь. ⚖️
