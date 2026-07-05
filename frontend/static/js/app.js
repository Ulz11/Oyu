/* ============================================================
   Oyu · Суралцах орон зай — SPA v2
   Аудио (Web Speech · zh-CN) + 3D мэдлэгийн граф + шинэ палитр
   ============================================================ */

const state = { progress: null, answers: {}, graph: null, graphRoom: 'law', graphMode: '3d',
  obamaUnread: 0, obamaComposeType: 'reading', obamaJustCreated: new Set() };
const view = document.getElementById('view');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const ROOM_META = {
  law:     { icon: 'scale',     accent: 'lapis', glyph: '法' },
  chinese: { icon: 'language',  accent: 'verm',  glyph: '中' },
  pack:    { icon: 'briefcase', accent: 'gold',  glyph: '律' },
};
const LEVELS = { 1: 'Анхан', 2: 'Дунд', 3: 'Гүнзгий' };

/* ============================================================
   ДУУ ХООЛОЙ — жинхэнэ хятад дуудлага (Web Speech API)
   ============================================================ */
const Voice = {
  zh: null,
  ready: false,
  init() {
    if (!('speechSynthesis' in window)) return;
    const rank = (v) =>
      (/natural|neural|online/i.test(v.name) ? 8 : 0) +
      (/xiaoxiao|xiaoyi|yunxi|yunyang|yunjian/i.test(v.name) ? 6 : 0) +
      (/google/i.test(v.name) ? 4 : 0) +
      (/huihui|yaoyao|kangkang|tracy|hanhan/i.test(v.name) ? 2 : 0) +
      (v.lang === 'zh-CN' ? 1 : 0);
    const pick = () => {
      const vs = speechSynthesis.getVoices().filter(v => /^zh([-_]|$)/i.test(v.lang));
      if (vs.length) {
        Voice.zh = vs.sort((a, b) => rank(b) - rank(a))[0];
        Voice.ready = true;
        Voice.warned = false; // дуу хоолой олдвол анхааруулгыг дахин идэвхжүүлнэ
      }
    };
    pick();
    speechSynthesis.addEventListener('voiceschanged', pick);
  },
  warned: false,
  speak(text, btn = null, rate = 0.82) {
    if (!('speechSynthesis' in window)) { toast('Хөтөч аудио дэмжихгүй байна', 'x'); return; }
    if (!Voice.zh && speechSynthesis.getVoices().length && !Voice.warned) {
      Voice.warned = true;
      toast('Хятад дуу хоолой олдсонгүй — Edge эсвэл Chrome-д нээгээрэй', 'sound');
    }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    if (Voice.zh) u.voice = Voice.zh;
    u.rate = rate;
    if (btn) {
      $$('.speak-btn.playing').forEach(b => b.classList.remove('playing'));
      btn.classList.add('playing');
      u.onend = u.onerror = () => btn.classList.remove('playing');
    }
    speechSynthesis.speak(u);
  },
};
Voice.init();

function speakBtn(text, cls = '') {
  return `<button class="speak-btn ${cls}" data-tts="${esc(text)}"
    title="Сонсох" aria-label="Сонсох">${icon('sound')}</button>`;
}
function wireSpeak(root = document) {
  $$('[data-tts]', root).forEach(b => {
    b.onclick = (e) => { e.stopPropagation(); Voice.speak(b.dataset.tts, b); };
  });
}

/* ---------------------------------- utils --------------------------------- */
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function cjk(text) {
  return String(text).replace(/([㐀-鿿豈-﫿]+)/g, '<span class="cjk">$1</span>');
}
function fmtSize(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}
function toast(msg, ic = 'check') {
  const wrap = document.getElementById('toastWrap');
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = icon(ic) + '<span>' + esc(msg) + '</span>';
  wrap.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 2600);
}
function confetti() {
  const colors = ['#ec4899', '#e0a500', '#3b82f6', '#f5c518', '#a52a63', '#7aa9f7'];
  for (let i = 0; i < 100; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = colors[i % colors.length];
    c.style.animationDuration = (2 + Math.random() * 1.6) + 's';
    c.style.animationDelay = (Math.random() * 0.4) + 's';
    c.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    c.style.transform = `rotate(${Math.random() * 360}deg)`;
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 4200);
  }
}
function ring(pct, color, size = 66) {
  const r = size / 2 - 6, c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return `<svg class="result-ring" viewBox="0 0 ${size} ${size}">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="rgba(53,31,46,.1)" stroke-width="6"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="6"
      stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"
      transform="rotate(-90 ${size/2} ${size/2})" style="transition:stroke-dashoffset 1s var(--ease)"/>
    <text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle"
      font-family="Playfair Display" font-weight="700" font-size="${size/3.6}" fill="#a52a63">${pct}%</text>
  </svg>`;
}

/* ------------------------------- navigation ------------------------------- */
const NAV = [
  { group: 'Орон зай' },
  { id: '', icon: 'home', label: 'Нүүр хуудас' },
  { group: 'Суралцах өрөө' },
  { id: 'room/law', icon: 'scale', label: 'Хууль зүй' },
  { id: 'room/chinese', icon: 'language', label: 'Хятад хэл' },
  { group: 'Хэрэгсэл' },
  { id: 'graph', icon: 'graph', label: 'Мэдлэгийн граф' },
  { id: 'files', icon: 'folder', label: 'Миний файл' },
  { id: 'progress', icon: 'chart', label: 'Явц ба амжилт' },
  { group: 'Мэнторын өрөө' },
  { id: 'obama', icon: 'briefcase', label: 'Obama Room', unread: true },
];

function renderNav() {
  const cur = location.hash.replace(/^#\//, '');
  const nav = document.getElementById('nav');
  nav.innerHTML = NAV.map(n => {
    if (n.group) return `<div class="nav-group">${n.group}</div>`;
    const active = (cur === n.id) || (n.id && cur.startsWith(n.id)) || (n.id === '' && cur === '');
    const badge = (n.unread && state.obamaUnread > 0)
      ? `<span class="nav-badge-dot">${state.obamaUnread}</span>` : '';
    return `<a class="nav-item ${active ? 'active' : ''}" href="#/${n.id}">
      ${icon(n.icon)}<span>${n.label}</span>${badge}</a>`;
  }).join('');
}

function renderMiniProgress() {
  const p = state.progress;
  if (!p) return;
  const el = document.getElementById('miniProgress');
  const pct = Math.round(p.xpInto / p.xpNext * 100);
  el.innerHTML = `
    <div class="mp-top"><span class="mp-level">Түвшин ${p.level}</span>
      <span class="mp-xp">${p.totalXp} XP</span></div>
    <div class="mp-bar"><i style="width:${pct}%"></i></div>`;
}

/* Явцын нэг эх сурвалж: progress татах бүрд unread badge-ийг ч шинэчилнэ */
function syncProgress(prog) {
  state.progress = prog;
  if (typeof prog.obamaUnread === 'number') state.obamaUnread = prog.obamaUnread;
  renderMiniProgress();
  renderNav();
}

/* ================================ ROUTER ================================= */
async function router() {
  const raw = location.hash.replace(/^#\//, '');
  const [route, arg] = raw.includes('/')
    ? [raw.split('/')[0], raw.split('/').slice(1).join('/')]
    : [raw, null];
  renderNav();
  const main = document.getElementById('main');
  if (main) main.scrollTo(0, 0);
  document.getElementById('sidebar').classList.remove('open');
  if (state.graph) { state.graph.destroy(); state.graph = null; }
  if ('speechSynthesis' in window) speechSynthesis.cancel();

  view.innerHTML = '<div class="spinner"></div>';
  try {
    if (raw === '') return dashboard();
    if (route === 'room') return roomView(arg);
    if (route === 'lesson') return lessonView(arg);
    if (route === 'exam') return examView(arg);
    if (route === 'graph') return graphView();
    if (route === 'files') return filesView();
    if (route === 'progress') return progressView();
    if (route === 'obama') return obamaView();
    dashboard();
  } catch (e) {
    view.innerHTML = `<div class="empty">${icon('x')}<p>Алдаа гарлаа: ${esc(e.message)}</p></div>`;
  }
}

/* =============================== DASHBOARD =============================== */
async function dashboard() {
  const [rooms, prog, lawD, cnD] = await Promise.all([
    API.rooms(), API.progress(), API.room('law'), API.room('chinese')]);
  syncProgress(prog);
  const next = [...lawD.lessons, ...cnD.lessons].find(l => !l.done);

  const hour = new Date().getHours();
  const greet = hour < 5 ? 'Сайхан шөнө' : hour < 12 ? 'Өглөөний мэнд'
              : hour < 18 ? 'Өдрийн мэнд' : 'Оройн мэнд';

  const roomTiles = rooms.map(r => {
    const meta = ROOM_META[r.id];
    const pct = r.lessonCount ? Math.round(r.completed / r.lessonCount * 100) : 0;
    return `<div class="tile room-card ${meta.accent === 'verm' ? 'verm' : ''} hoverable col-6"
              onclick="location.hash='#/room/${r.id}'">
      <div class="room-top">
        <span class="room-glyph">${meta.glyph}</span>
        <span class="room-tag">${icon(meta.icon)} ${esc(r.tagline)}</span>
        <div class="room-name">${esc(r.name)}</div>
        <div class="room-desc">${esc(r.description)}</div>
        <div class="room-sections">
          ${r.sections.map(s => `<span class="room-sec">${s.flag} ${esc(s.name)}</span>`).join('')}
        </div>
      </div>
      <div class="room-foot">
        <div class="room-prog">
          <div class="bar"><i style="width:${pct}%"></i></div>
          <div class="lab">${r.completed}/${r.lessonCount} хичээл · ${pct}%</div>
        </div>
        <span class="btn btn-ghost btn-sm">Үргэлжлүүлэх ${icon('arrowRight')}</span>
      </div>
    </div>`;
  }).join('');

  const continueCard = next ? `
    <div class="tile col-12 continue-card hoverable" onclick="location.hash='#/lesson/${next.id}'">
      <div class="cc-ico">${icon('play')}</div>
      <div class="cc-main">
        <div class="cc-lab">Дараагийн хичээл · ${next.room === 'law' ? 'Хууль зүй' : 'Хятад хэл'}</div>
        <div class="cc-title">${cjk(esc(next.title))}</div>
      </div>
      <div class="cc-meta">
        <span class="level-pill lv${next.level}">${icon('layers')} ${LEVELS[next.level]}</span>
        <span class="mini-stat">${icon('clock')} ${next.duration} мин</span>
        <span class="mini-stat">${icon('star')} ${next.xp} XP</span>
      </div>
      <span class="btn btn-primary btn-sm">Эхлэх ${icon('arrowRight')}</span>
    </div>` : '';

  view.innerHTML = `
  <div class="bento stagger">
    <div class="tile hero">
      <div class="eyebrow">${greet}</div>
      <h1>Өнөөдөр <b>шүүгчийн</b> замын нэг алхмыг урагшлуулъя, Оюу.</h1>
      <p>Хууль зүй, хятад хэлээ TOK сэтгэлгээгээр гүнзгийрүүлэн судал. Мэдлэг бол шүүн тунгаах чадвар.</p>
      <div class="hero-actions">
        ${next ? `<span class="btn btn-gold" onclick="event.stopPropagation();location.hash='#/lesson/${next.id}'">
          ${icon('play')} Үргэлжлүүлэх</span>` : ''}
        <div class="hero-goal">${icon('gavel')} Зорилго: Шүүгч · Эрх зүйн 3-р курс</div>
      </div>
      <div class="hero-proverb">「 ${esc(prog.proverb || '')} 」</div>
    </div>

    <div class="tile col-4 obama-tile ${prog.obamaUnread > 0 ? 'has-unread' : ''}">
      <div class="tile-eyebrow">${icon('briefcase','lead')}<h3>Obama Room</h3>
        ${prog.obamaUnread > 0 ? `<span class="nav-badge-dot">${prog.obamaUnread}</span>` : ''}</div>
      <p style="color:var(--ink-2);font-size:14px">${prog.obamaUnread > 0
        ? `${prog.obamaUnread} шинэ уншлага/даалгавар хүлээж байна.`
        : 'Уншлага, даалгавар, сургалтын багц энд ирнэ.'}</p>
      <div style="margin-top:14px"><span class="btn btn-gold btn-sm"
        onclick="location.hash='#/obama'">${icon('inbox')} Нээх</span></div>
    </div>

    ${continueCard}

    ${roomTiles}

    <div class="tile col-3 stat stat-h verm">
      <div class="ico">${icon('book')}</div>
      <div><div class="stat-num">${prog.lessonsDone}</div>
      <div class="stat-label">Хичээл</div></div>
    </div>
    <div class="tile col-3 stat stat-h">
      <div class="ico">${icon('target')}</div>
      <div><div class="stat-num">${prog.perfect}</div>
      <div class="stat-label">Төгс дасгал</div></div>
    </div>
    <div class="tile col-3 stat stat-h gold">
      <div class="ico">${icon('gavel')}</div>
      <div><div class="stat-num">${prog.examsPassed}<small>/2</small></div>
      <div class="stat-label">Шалгалт</div></div>
    </div>
    <div class="tile col-3 stat stat-h">
      <div class="ico">${icon('award')}</div>
      <div><div class="stat-num">${prog.badges.filter(b => b.earned).length}</div>
      <div class="stat-label">Тэмдэг</div></div>
    </div>

    <div class="tile col-8">
      <div class="tile-eyebrow">${icon('graph','lead')}<h3>Мэдлэгийн граф — одоо 3D</h3>
        <span class="link" onclick="location.hash='#/graph'">Бүтэн харах ${icon('arrowRight')}</span></div>
      <p style="color:var(--ink-2);font-size:14.5px;max-width:54ch">Ойлголтууд хоорондоо хэрхэн
      холбогддогийг эргэлдэх огторгуйд хар: компани → хувьцаа → эрх; ханз → өнгө аяс → утга.
      Чирж эргүүлж, гүйлгэж томруулж, зангилаа дээр дарж судал.</p>
      <div style="display:flex;gap:10px;margin-top:16px">
        <span class="btn btn-primary btn-sm" onclick="location.hash='#/graph'">${icon('cube')} 3D орчинд судлах</span>
      </div>
    </div>
    <div class="tile stat gold col-4">
      <div class="ico">${icon('flame')}</div>
      <div>
        <div class="stat-num">${prog.totalXp}<small> XP</small></div>
        <div class="stat-label">Түвшин ${prog.level} · дараагийн түвшин хүртэл ${prog.xpNext - prog.xpInto} XP</div>
      </div>
    </div>
  </div>`;
}

/* ================================= ROOM ================================= */
async function roomView(roomId) {
  const data = await API.room(roomId);
  const meta = ROOM_META[roomId];
  const room = data.room;
  const bySection = {};
  data.lessons.forEach(l => { (bySection[l.section] ||= []).push(l); });

  const sectionsHtml = room.sections.map(sec => {
    const lessons = bySection[sec.id] || [];
    return `
    <div class="section-head">
      <div class="flag">${sec.flag}</div>
      <div><h3>${esc(sec.name)}</h3><div class="note">${esc(sec.note)}</div></div>
      <div class="line"></div>
    </div>
    ${lessons.map(l => `
      <div class="lesson-row" onclick="location.hash='#/lesson/${l.id}'">
        <div class="lesson-idx">${l.order}</div>
        <div class="lesson-main">
          <div class="t">${cjk(esc(l.title))}
            <span class="level-pill lv${l.level}">${icon('layers')} ${LEVELS[l.level]}</span>
            ${l.audio ? `<span class="pill audio-tag">${icon('sound')} аудио</span>` : ''}
            ${l.done ? `<span class="dot-done">${icon('check')}</span>` : ''}
          </div>
          <div class="s">${cjk(esc(l.subtitle))}</div>
          <div class="lesson-tok">${icon('brain')}<span>${esc(l.tok)}</span></div>
        </div>
        <div class="lesson-meta">
          <div class="row">
            <span class="mini-stat">${icon('clock')} ${l.duration} мин</span>
            <span class="mini-stat">${icon('star')} ${l.xp} XP</span>
          </div>
          <span class="mini-stat">${icon('feather')} ${l.exercises} дасгал</span>
          ${l.done ? `<span class="pill" style="background:var(--ok-bg);color:var(--ok)">${l.best} оноо</span>` : ''}
        </div>
      </div>`).join('')}`;
  }).join('');

  const exam = data.exam;
  const examDone = exam.result;

  view.innerHTML = `
  <a class="back-link" href="#/">${icon('arrowLeft')} Нүүр хуудас</a>
  <div class="page-head">
    <div class="eyebrow">${icon(meta.icon)} ${esc(room.subtitle)}</div>
    <h1 class="page-title">${esc(room.name)}</h1>
    <p class="page-sub">${esc(room.description)}</p>
  </div>

  <div class="stagger">${sectionsHtml}</div>

  <div class="tile col-12 mt-lg" style="display:flex;align-items:center;gap:22px;flex-wrap:wrap;
       background:linear-gradient(135deg,rgba(224,165,0,.1),transparent);border-color:rgba(224,165,0,.32)">
    <div style="width:54px;height:54px;border-radius:16px;display:grid;place-items:center;
         background:var(--gold-glow);color:var(--gold);flex:none">${icon('gavel')}</div>
    <div style="flex:1;min-width:220px">
      <h3 style="font-family:var(--serif);font-size:20px;font-weight:700;color:var(--lapis-deep)">${esc(exam.title)}</h3>
      <p style="color:var(--ink-2);font-size:14px;margin-top:3px">${esc(exam.subtitle)} ·
        ${exam.questions} асуулт · тэнцэх босго ${exam.pass}%
        ${examDone ? ` · <b style="color:${examDone.passed ? 'var(--ok)' : 'var(--err)'}">
          ${examDone.passed ? 'Тэнцсэн' : 'Дахин оролдоно уу'} (${examDone.score}/${examDone.total})</b>` : ''}</p>
    </div>
    <span class="btn btn-gold" onclick="location.hash='#/exam/${roomId}'">
      ${icon('scroll')} ${examDone ? 'Дахин өгөх' : 'Шалгалт өгөх'}</span>
  </div>`;
}

/* ================================ LESSON ================================ */
async function lessonView(lessonId) {
  const l = await API.lesson(lessonId);
  state.answers = {};
  const meta = ROOM_META[l.room];
  const isZh = l.room === 'chinese';

  const blockHtml = (b) => {
    switch (b.type) {
      case 'text': return `<div class="block block-text">${mdBold(b.body)}</div>`;
      case 'key': return `<div class="block block-key"><h4>${esc(b.title)}</h4>
        <ul>${b.items.map(i => `<li>${cjk(esc(i))}</li>`).join('')}</ul></div>`;
      case 'law': return `<div class="block block-law">
        <div class="cite">${icon('scroll')} ${esc(b.cite)}</div><p>${esc(b.body)}</p></div>`;
      case 'case': return `<div class="block block-case">
        <h4>${icon('users')} ${esc(b.title)}</h4><p>${cjk(esc(b.body))}</p></div>`;
      case 'fun': return `<div class="block block-fun"><div class="spark">${icon('bulb')}</div>
        <div><span class="flab">Сонирхолтой</span><p>${cjk(esc(b.body))}</p></div></div>`;
      case 'vocab': return `<div class="block block-vocab"><h4>${esc(b.title)}</h4>
        <div class="vocab-grid">${b.items.map(v => `
          <div class="vocab-card ${isZh && v.pinyin ? 'speakable' : ''}"
               ${isZh && v.pinyin ? `data-tts="${esc(v.term)}"` : ''}>
            ${isZh && v.pinyin ? speakBtn(v.term) : ''}
            <div class="term">${esc(v.term)}</div>
            ${v.pinyin ? `<div class="pinyin">${esc(v.pinyin)}</div>` : ''}
            <div class="gloss">${esc(v.gloss)}</div></div>`).join('')}</div></div>`;
      case 'dialog': return `<div class="block block-dialog">
        <h4>${icon('chat')} ${esc(b.title)}</h4>
        ${b.lines.map((ln, i) => `<div class="dlg-line ${i % 2 ? 'right' : ''}">
          ${speakBtn(ln.zh)}
          <div class="dlg-bubble">
            <div class="zh">${esc(ln.zh)}</div>
            <div class="py">${esc(ln.pinyin)}</div>
            <div class="mn">${esc(ln.mn)}</div>
          </div></div>`).join('')}</div>`;
      case 'compare': return `<div class="block block-compare">
        ${b.title ? `<h4>${icon('compass')} ${esc(b.title)}</h4>` : ''}
        <div class="compare-grid">
          <div class="compare-col left"><div class="compare-lab">${esc(b.left.label)}</div>
            <div class="compare-body">${cjk(esc(b.left.body))}</div></div>
          <div class="compare-col right"><div class="compare-lab">${esc(b.right.label)}</div>
            <div class="compare-body">${cjk(esc(b.right.body))}</div></div>
        </div></div>`;
      default: return '';
    }
  };

  const isPack = l.room === 'pack';
  const backHref = isPack ? '#/obama' : `#/room/${l.room}`;
  const backLabel = isPack ? 'Obama Room' : l.room === 'law' ? 'Хууль зүй' : 'Хятад хэл';

  view.innerHTML = `
  <a class="back-link" href="${backHref}">${icon('arrowLeft')} ${backLabel}</a>
  <div class="lesson-hero ${isZh ? 'verm' : isPack ? 'gold' : ''}">
    <span class="cjk-huge">${meta.glyph}</span>
    ${isPack ? `<span class="pill" style="background:var(--gold-glow);color:var(--gold);margin-right:6px">
      ${icon('briefcase')} Обамагийн багц</span>` : ''}
    <span class="level-pill lv${l.level}">${icon('layers')} ${LEVELS[l.level]} түвшин</span>
    <h1>${cjk(esc(l.title))}</h1>
    <div class="sub">${esc(l.subtitle)} ${l.tts ? speakBtn(l.tts, 'lg') : ''}</div>
    <div class="meta">
      <span class="pill">${icon('clock')} ${l.duration} минут</span>
      <span class="pill">${icon('star')} ${l.xp} XP</span>
      <span class="pill">${icon('feather')} ${l.exercises.length} дасгал</span>
      ${l.tts ? `<span class="pill audio-tag">${icon('sound')} аудиотой</span>` : ''}
      <span class="pill tok-tag">${icon('brain')} TOK · ${esc(l.tok.area)}</span>
    </div>
  </div>

  <div class="tok-card">
    <div class="lab">${icon('brain')} Мэдлэгийн онол · Асуулт</div>
    <div class="q">"${esc(l.tok.question)}"</div>
    <div class="ways">${l.tok.ways.map(w => `<span class="pill">${icon('compass')} ${esc(w)}</span>`).join('')}</div>
  </div>

  <div class="stagger">${l.blocks.map(blockHtml).join('')}</div>

  <div class="ex-wrap" id="exWrap">
    <div class="ex-head">${icon('target','lead')}<h2>Дасгал ажил</h2>
      <span class="pill" style="margin-left:auto">${l.exercises.length} даалгавар</span></div>
    <div class="ex-sub">Хариулаад "Шалгах" товчийг дар. Алдаанаас суралцах нь мэдлэгийн нэг хэлбэр.</div>
    <div id="exList">${l.exercises.map((e, i) => exerciseHtml(e, i)).join('')}</div>
    <div class="ex-foot">
      <div class="spacer"></div>
      <button class="btn btn-primary" id="exSubmit">${icon('check')} Хариу шалгах</button>
    </div>
    <div id="exResult"></div>
  </div>`;

  wireSpeak();
  wireExercises(l);
}

function mdBold(s) { return cjk(esc(s)).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); }

function exerciseHtml(e, i) {
  let body = '';
  if (e.type === 'mcq' || e.type === 'listen') {
    const listen = e.type === 'listen' ? `
      <div class="listen-bar">
        ${speakBtn(e.tts, 'lg')}
        <div class="hint"><b>Сонсох даалгавар.</b> Товч дээр дарж хэдэн ч удаа сонсож болно.</div>
      </div>` : '';
    body = `${listen}<div class="opts" data-ex="${e.id}">
      ${e.options.map((o, oi) => `<div class="opt" data-i="${oi}">
        <span class="mark">${icon('check')}</span><span>${cjk(esc(o))}</span></div>`).join('')}</div>`;
  } else if (e.type === 'truefalse') {
    body = `<div class="tf-row" data-ex="${e.id}">
      <div class="tf-btn" data-v="true">${icon('check')} Үнэн</div>
      <div class="tf-btn" data-v="false">${icon('x')} Худал</div></div>`;
  } else if (e.type === 'match') {
    // Сервер эрэмбэлж өгдөг тул хариултын дараалал таамаглагдахгүй байхаар холино
    const right = [...e.right];
    for (let k = right.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [right[k], right[j]] = [right[j], right[k]];
    }
    body = `<div class="match-grid" data-ex="${e.id}">
      <div><div class="match-col-lab">Ойлголт бүрд тохирох утгыг сонго</div>
      <div class="match-left">
        ${e.left.map(a => `<div class="match-item" data-a="${esc(a)}">
          <span>${cjk(esc(a))}</span>
          <select data-a="${esc(a)}"><option value="">— сонго —</option>
            ${right.map(b => `<option value="${esc(b)}">${esc(b)}</option>`).join('')}
          </select></div>`).join('')}
      </div></div></div>`;
  }
  return `<div class="ex-item" data-ex="${e.id}" data-type="${e.type}">
    <div class="ex-q"><div class="n">${i + 1}</div><div class="txt">${cjk(esc(e.prompt))}</div></div>
    ${body}
    <div class="ex-explain" id="exp-${e.id}"></div>
  </div>`;
}

/* Оролтын холболт — хичээл, шалгалт хоёулаа хэрэглэнэ (mcq/listen/tf/match + аудио) */
function wireAnswerInputs(answers) {
  $$('.opts').forEach(box => {
    const ex = box.dataset.ex;
    box.querySelectorAll('.opt').forEach(opt => {
      opt.onclick = () => {
        if (box.classList.contains('done')) return;
        box.querySelectorAll('.opt').forEach(o => o.classList.remove('sel'));
        opt.classList.add('sel');
        answers[ex] = +opt.dataset.i;
      };
    });
  });
  $$('.tf-row').forEach(box => {
    const ex = box.dataset.ex;
    box.querySelectorAll('.tf-btn').forEach(btn => {
      btn.onclick = () => {
        if (box.classList.contains('done')) return;
        box.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('sel'));
        btn.classList.add('sel');
        answers[ex] = btn.dataset.v === 'true';
      };
    });
  });
  $$('.match-grid').forEach(box => {
    const ex = box.dataset.ex;
    answers[ex] = answers[ex] || {};
    box.querySelectorAll('select').forEach(sel => {
      sel.onchange = () => { answers[ex][sel.dataset.a] = sel.value; };
    });
  });
  wireSpeak();
}

/* Асуулт хариулагдсан эсэх — match бүх мөрөө сонгосон байх ёстой */
function isAnswered(q, answers) {
  if (q.type === 'match') {
    const a = answers[q.id] || {};
    return (q.left || []).every(x => a[x]);
  }
  return answers[q.id] !== undefined;
}

/* Нэг даалгаврын үр дүнг дэлгэцэд буулгах — хичээл, шалгалт хоёулаа хэрэглэнэ */
function applyItemResult(e, r) {
  const item = document.querySelector(`.ex-item[data-ex="${e.id}"]`);
  if (!r || !item) return;
  if (e.type === 'mcq' || e.type === 'listen') {
    const box = item.querySelector('.opts'); box.classList.add('done');
    box.querySelectorAll('.opt').forEach(o => {
      o.classList.add('locked');
      const i = +o.dataset.i;
      if (i === r.answer) o.classList.add('correct');
      else if (o.classList.contains('sel')) o.classList.add('wrong');
    });
  } else if (e.type === 'truefalse') {
    const box = item.querySelector('.tf-row'); box.classList.add('done');
    box.querySelectorAll('.tf-btn').forEach(b => {
      const v = b.dataset.v === 'true';
      if (v === r.answer) b.classList.add('correct');
      else if (b.classList.contains('sel')) b.classList.add('wrong');
    });
  } else if (e.type === 'match') {
    item.querySelectorAll('.match-item').forEach(mi => {
      const a = mi.dataset.a;
      const sel = mi.querySelector('select'); sel.disabled = true;
      const truth = r.answer[a];
      if (sel.value === truth) mi.classList.add('correct');
      else { mi.classList.add('wrong'); sel.value = truth; }
    });
  }
  const exp = document.getElementById('exp-' + e.id);
  exp.innerHTML = `<b>${r.correct ? '✓ Зөв.' : '✕ Дахин хар.'}</b> ${cjk(esc(r.explain))}`;
  exp.classList.add('show');
}

function wireExercises(lesson) {
  const answers = state.answers;
  wireAnswerInputs(answers);

  $('#exSubmit').onclick = async () => {
    const btn = $('#exSubmit');
    btn.disabled = true; btn.innerHTML = 'Шалгаж байна…';
    const res = await API.submitEx(lesson.id, answers);
    applyExerciseResults(lesson, res);
    btn.style.display = 'none';
    syncProgress(await API.progress());
  };
}

function applyExerciseResults(lesson, res) {
  lesson.exercises.forEach(e => applyItemResult(e, res.results[e.id]));

  const pct = Math.round(res.score / res.total * 100);
  const pass = pct >= 60;
  const isPack = lesson.room === 'pack';
  const backHref = isPack ? '#/obama' : `#/room/${lesson.room}`;
  const backLabel = isPack ? 'Обама руу буцах' : 'Өрөө рүү';
  const box = document.getElementById('exResult');
  box.innerHTML = `<div class="result-banner ${pass ? 'pass' : 'fail'}" style="margin-top:24px;margin-bottom:0">
    ${ring(pct, pass ? 'var(--ok)' : 'var(--err)')}
    <div style="flex:1">
      <h3>${res.perfect ? 'Төгс! Гайхалтай.' : pass ? 'Сайн ажиллаа!' : 'Дахин нэг оролдоё'}</h3>
      <p>${res.score}/${res.total} зөв · +${res.xp} XP цуглууллаа${isPack
        ? ' · дүн Обамад харагдана' : ''}</p>
    </div>
    <a class="btn btn-ghost" href="${backHref}">${backLabel} ${icon('arrowRight')}</a>
  </div>`;
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (res.perfect) { confetti(); toast('Төгс дүн! +' + res.xp + ' XP', 'star'); }
  else toast('+' + res.xp + ' XP цуглууллаа', 'star');
}

/* ================================= EXAM ================================= */
async function examView(roomId) {
  const exam = await API.exam(roomId);
  const ans = {};
  view.innerHTML = `
  <a class="back-link" href="#/room/${roomId}">${icon('arrowLeft')} Буцах</a>
  <div class="page-head">
    <div class="eyebrow">${icon('gavel')} Эцсийн шалгалт · Тэнцэх босго ${exam.pass}%</div>
    <h1 class="page-title">${esc(exam.title)}</h1>
    <p class="page-sub">${esc(exam.subtitle)} · ${exam.questions.length} асуулт. Амжилт хүсье, Оюу.</p>
  </div>
  <div class="ex-wrap">
    <div id="examList">${exam.questions.map((q, i) => exerciseHtml(q, i)).join('')}</div>
    <div class="ex-foot"><div class="spacer"></div>
      <button class="btn btn-gold" id="examSubmit">${icon('scroll')} Шалгалт дуусгах</button></div>
    <div id="examResult"></div>
  </div>`;

  wireAnswerInputs(ans);

  $('#examSubmit').onclick = async () => {
    if (!exam.questions.every(q => isAnswered(q, ans))) {
      toast('Бүх асуултад хариулна уу', 'x'); return;
    }
    const btn = $('#examSubmit'); btn.disabled = true; btn.innerHTML = 'Дүгнэж байна…';
    const res = await API.submitExam(roomId, ans);
    exam.questions.forEach(q => applyItemResult(q, res.results[q.id]));
    btn.style.display = 'none';
    const box = document.getElementById('examResult');
    box.innerHTML = `<div class="result-banner ${res.passed ? 'pass' : 'fail'}" style="margin-top:24px">
      ${ring(res.percent, res.passed ? 'var(--ok)' : 'var(--err)')}
      <div style="flex:1"><h3>${res.passed ? 'Баяр хүргэе — тэнцлээ!' : 'Босго хүрсэнгүй'}</h3>
        <p>${res.score}/${res.total} зөв (${res.percent}%) · тэнцэх ${res.pass}%
        ${res.passed ? ' · «Ирээдүйн шүүгч» тэмдэг нээгдлээ' : ' · дахин оролдоод үзээрэй'}</p></div>
      <a class="btn btn-ghost" href="#/room/${roomId}">Өрөө рүү ${icon('arrowRight')}</a></div>`;
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    syncProgress(await API.progress());
    if (res.passed) { confetti(); toast('Шалгалт тэнцлээ!', 'gavel'); }
    else toast('Дахин оролдоно уу', 'x');
  };
}

/* ================================ GRAPH ================================ */
async function graphView() {
  const room = state.graphRoom;
  const mode = state.graphMode;
  view.innerHTML = `
  <div class="page-head">
    <div class="eyebrow">${icon('graph')} Мэдлэгийн сүлжээ</div>
    <h1 class="page-title">Мэдлэгийн <span class="accent">граф</span></h1>
    <p class="page-sub">Ойлголтуудыг тусад нь биш, холбоос болгон харах нь ойлголтыг гүнзгийрүүлдэг.
      Огторгуйг чирж эргүүлж, гүйлгэж томруулж, зангилаа дээр дарж судал.</p>
  </div>
  <div class="graph-shell">
    <div class="graph-toolbar">
      <div class="seg" id="graphSeg">
        <button data-r="law" class="${room==='law'?'active':''}">Хууль зүй</button>
        <button data-r="chinese" class="${room==='chinese'?'active':''}">Хятад хэл</button>
      </div>
      <div class="seg" id="modeSeg">
        <button data-m="3d" class="${mode==='3d'?'active':''}">3D огторгуй</button>
        <button data-m="2d" class="${mode==='2d'?'active':''}">2D хавтгай</button>
      </div>
      <div class="graph-legend" id="graphLegend"></div>
    </div>
    <canvas class="graph-canvas" id="graphCanvas"></canvas>
    <div class="graph-hint">✋ чирж эргүүл · ⚲ гүйлгэж томруул · зангилаа дээр дар</div>
    <div class="node-info" id="nodeInfo"></div>
  </div>`;

  const legends = {
    law: [['core', 'Гол ойлголт'], ['mn', 'Монгол эрх зүй'], ['intl', 'Олон улс'],
          ['cases', 'Дэлхийн кейс']],
    chinese: [['core', 'Гол'], ['foundation', 'Суурь'], ['business', 'Бизнес'],
              ['fluency', 'Хэлц · Уран зохиол']],
  };
  $('#graphLegend').innerHTML = legends[room].map(([g, l]) =>
    `<span><i style="background:${GROUP_COLORS[g].fill}"></i>${l}</span>`).join('');

  const data = await API.graph(room);
  const info = $('#nodeInfo');
  state.graph = new KnowledgeGraph($('#graphCanvas'), data, {
    mode,
    onSelect: (n) => {
      info.classList.add('show');
      info.innerHTML = `<div class="k">Зангилаа</div><h4>${cjk(esc(n.label))}</h4>
        <div class="links"><b>${n.links.length}</b> холбоос:<br>${n.links.map(x => cjk(esc(x))).join(' · ')}</div>`;
    },
  });

  $$('#graphSeg button').forEach(b => b.onclick = () => {
    state.graphRoom = b.dataset.r; graphView();
  });
  $$('#modeSeg button').forEach(b => b.onclick = () => {
    state.graphMode = b.dataset.m;
    state.graph.setMode(b.dataset.m);
    $$('#modeSeg button').forEach(x => x.classList.toggle('active', x === b));
  });
}

/* ================================ FILES ================================ */
async function filesView() {
  const [files, notes] = await Promise.all([API.files(), API.notes()]);
  view.innerHTML = `
  <div class="page-head">
    <div class="eyebrow">${icon('folder')} Хувийн сан</div>
    <h1 class="page-title">Миний <span class="accent">файл</span></h1>
    <p class="page-sub">Хичээлийн материал, эх сурвалж, тэмдэглэлээ энд хадгал. Бүх зүйл нэг дор.</p>
  </div>

  <div class="grid-2" style="align-items:start">
    <div>
      <div class="drop" id="drop">
        <div class="ic">${icon('upload')}</div>
        <h3>Файл байршуулах</h3>
        <p>Чирч оруулах эсвэл дарж сонгоно уу · дээд тал нь 25MB</p>
        <input type="file" id="fileInput" hidden multiple>
      </div>
      <div id="fileList">${files.length ? files.map(fileRow).join('')
        : `<div class="empty">${icon('file')}<p>Одоогоор файл алга. Эхнийхээ хийе!</p></div>`}</div>
    </div>

    <div>
      <div class="tile-eyebrow">${icon('feather','lead')}<h3>Түргэн тэмдэглэл</h3></div>
      <div class="note-card" style="margin-bottom:16px">
        <input id="noteTitle" placeholder="Гарчиг…">
        <textarea id="noteBody" placeholder="Санаагаа энд бич…"></textarea>
        <div style="display:flex;justify-content:flex-end;margin-top:10px">
          <button class="btn btn-primary btn-sm" id="noteSave">${icon('plus')} Хадгалах</button>
        </div>
      </div>
      <div id="noteList">${notes.map(noteCard).join('')}</div>
    </div>
  </div>`;

  const input = $('#fileInput'), drop = $('#drop');
  drop.onclick = () => input.click();
  input.onchange = () => handleUpload([...input.files]);
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => {
    e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => {
    e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => handleUpload([...e.dataTransfer.files]));

  $('#noteSave').onclick = async () => {
    const title = $('#noteTitle').value.trim(), body = $('#noteBody').value.trim();
    if (!title && !body) { toast('Юу нэгийг бичнэ үү', 'x'); return; }
    await API.saveNote({ title: title || 'Тэмдэглэл', body });
    toast('Тэмдэглэл хадгаллаа');
    filesView();
  };
  wireFileActions();
}

function fileRow(f) {
  const ext = (f.name.split('.').pop() || '').toUpperCase().slice(0, 4);
  return `<div class="file-row" data-id="${f.id}">
    <div class="file-ic">${ext.length <= 4 && ext ? ext : icon('file')}</div>
    <div class="file-main"><div class="n">${esc(f.name)}</div>
      <div class="m">${fmtSize(f.size)} · ${new Date(f.uploaded_at).toLocaleDateString('mn-MN')}</div></div>
    <div class="file-act">
      <a class="icon-btn" href="/api/files/${f.id}/download" title="Татах">${icon('download')}</a>
      <button class="icon-btn danger" data-del="${f.id}" title="Устгах">${icon('trash')}</button>
    </div></div>`;
}
function noteCard(n) {
  return `<div class="note-card" style="margin-bottom:12px" data-note="${n.id}">
    <div style="display:flex;align-items:flex-start;gap:10px">
      <div style="flex:1">
        <div style="font-family:var(--serif);font-size:16px;font-weight:700;color:var(--lapis-deep)">${esc(n.title)}</div>
        <div style="font-size:13.5px;color:var(--ink-2);margin-top:5px;white-space:pre-wrap">${esc(n.body)}</div>
        <div style="font-size:11.5px;color:var(--ink-soft);margin-top:8px">${new Date(n.updated_at).toLocaleString('mn-MN')}</div>
      </div>
      <button class="icon-btn danger" data-delnote="${n.id}">${icon('trash')}</button>
    </div></div>`;
}
function wireFileActions() {
  $$('[data-del]').forEach(b => b.onclick = async () => {
    await API.deleteFile(b.dataset.del); toast('Файл устгагдлаа'); filesView();
  });
  $$('[data-delnote]').forEach(b => b.onclick = async () => {
    await API.deleteNote(b.dataset.delnote); toast('Тэмдэглэл устлаа'); filesView();
  });
}
async function handleUpload(files) {
  if (!files.length) return;
  for (const f of files) {
    if (f.size > 25 * 1024 * 1024) { toast(f.name + ' хэт том байна', 'x'); continue; }
    try { await API.upload(f); toast(f.name + ' байршлаа'); }
    catch { toast('Байршуулж чадсангүй', 'x'); }
  }
  filesView();
}

/* =============================== OBAMA ROOM =============================== */
const OBAMA_TYPES = {
  reading: { label: 'Уншлага', icon: 'link2' },
  task:    { label: 'Даалгавар', icon: 'briefcase' },
  pack:    { label: 'Сургалтын багц', icon: 'book' },
  note:    { label: 'Тэмдэглэл', icon: 'bell' },
};

async function obamaView() {
  const [items, packs] = await Promise.all([API.obamaList(), API.packs()]);

  view.innerHTML = `
  <div class="page-head">
    <div class="eyebrow">${icon('briefcase')} Мэнторын өрөө</div>
    <h1 class="page-title">Obama <span class="accent">Room</span></h1>
    <p class="page-sub">Энд Обама уншлага, даалгавар, сургалтын багц нэмнэ — та тэдгээрийг
      мэдэгдлээр хүлээн авна. Багцыг нээж суралцаад дасгалаа өгөхөд дүн тань энд харагдана.</p>
  </div>

  <div class="compose-panel">
    <h3>${icon('plus')} Шинэ зүйл нэмэх</h3>
    <div class="type-seg" id="obamaTypeSeg">
      ${Object.entries(OBAMA_TYPES).map(([k, v]) => `
        <button data-t="${k}" class="t-${k} ${state.obamaComposeType === k ? 'active' : ''}">
          ${icon(v.icon)} ${v.label}</button>`).join('')}
    </div>
    <div class="compose-fields">
      <div class="row2" id="obPackRow">
        <select id="obPack">
          <option value="">— Сургалтын багц сонгох —</option>
          ${packs.map(p => `<option value="${esc(p.id)}">${esc(p.title)} · ${p.exercises} дасгал · ${p.xp} XP</option>`).join('')}
        </select>
      </div>
      <input type="text" id="obTitle" placeholder="Гарчиг…">
      <textarea id="obBody" placeholder="Агуулга, зааварчилгаа…"></textarea>
      <div class="row2" id="obReadingRow">
        <input type="url" id="obLink" placeholder="Холбоос (унших материал) — заавал биш">
      </div>
      <div class="row2" id="obTaskRow">
        <input type="date" id="obDue" placeholder="Дуусах хугацаа">
        <select id="obPriority">
          <option value="normal">Энгийн ач холбогдол</option>
          <option value="high">Яаралтай</option>
          <option value="low">Яарах шаардлагагүй</option>
        </select>
      </div>
    </div>
    <div class="compose-foot">
      <button class="btn btn-primary" id="obamaSubmit">${icon('bell')} Нэмээд мэдэгдэх</button>
    </div>
  </div>

  <div id="obamaFeed">${items.length ? items.map(obamaCard).join('')
    : `<div class="empty">${icon('inbox')}<p>Одоогоор зүйл алга. Дээрх маягтаар эхнийхээ нэмээрэй.</p></div>`}</div>`;

  wireObamaCompose(packs);
  wireObamaFeed();

  // Feed-ийг үзсэнээр unread-г арилгана (inbox семантик).
  // Саяхан энэ дэлгэцээс өөрөө нэмсэн зүйлийг "уншсан" болгохгүй —
  // тэгэхгүй бол Оюу мэдэгдлээ огт харахгүй байх байсан.
  const toRead = items.filter(i => !i.read && !state.obamaJustCreated.has(i.id));
  if (toRead.length) {
    await Promise.all(toRead.map(i => API.obamaRead(i.id)));
  }
  state.obamaUnread = items.filter(i => !i.read && state.obamaJustCreated.has(i.id)).length;
  renderNav();
}

function obamaCard(it) {
  const meta = OBAMA_TYPES[it.type] || OBAMA_TYPES.note;
  const unread = !it.read;
  const dueBadge = it.due_date
    ? `<span class="memo-due ${it.priority === 'high' ? 'high' : ''}">${icon('calendar')} ${esc(it.due_date)}</span>`
    : '';
  const linkBadge = it.link
    ? `<a href="${esc(it.link)}" target="_blank" rel="noopener">${icon('link2')} Холбоос нээх</a>` : '';
  const taskCheck = it.type === 'task'
    ? `<span class="memo-check ${it.done ? 'done' : ''}" data-toggledone="${it.id}">
        ${icon(it.done ? 'check' : 'target')} ${it.done ? 'Дуусгасан' : 'Дуусгах'}</span>` : '';
  let packStatus = '';
  if (it.type === 'pack' && it.pack_id) {
    if (it.done && it.total) {
      const pct = Math.round(it.score / it.total * 100);
      packStatus = `<span class="pill" style="background:var(--ok-bg);color:var(--ok)">
          ${icon('check')} Дууссан · ${it.score}/${it.total} (${pct}%)</span>
        <a class="btn btn-ghost btn-sm" href="#/lesson/${esc(it.pack_id)}">Дахин хийх</a>`;
    } else {
      packStatus = `<span class="pill">${icon('clock')} Эхлээгүй</span>
        <a class="btn btn-primary btn-sm" href="#/lesson/${esc(it.pack_id)}">${icon('book')} Багц нээх</a>`;
    }
  }
  return `<div class="memo-card t-${it.type} ${unread ? 'unread' : ''}" data-item="${it.id}">
    <div class="memo-ic">${icon(meta.icon)}</div>
    <div class="memo-main">
      <div class="memo-head">
        <span class="tt">${esc(it.title)}</span>
        <span class="memo-tag">${meta.label}</span>
        ${unread ? '<span class="pill" style="background:var(--gold-glow);color:var(--gold)">Шинэ</span>' : ''}
      </div>
      ${it.body ? `<div class="memo-body">${esc(it.body)}</div>` : ''}
      <div class="memo-meta">${dueBadge}${linkBadge}${taskCheck}${packStatus}
        <span style="font-size:11.5px;color:var(--ink-soft)">${new Date(it.created_at).toLocaleString('mn-MN')}</span>
      </div>
    </div>
    <div class="memo-act"><button class="icon-btn danger" data-delobama="${it.id}">${icon('trash')}</button></div>
  </div>`;
}

function wireObamaCompose(packs = []) {
  const syncRows = (t) => {
    $('#obReadingRow').classList.toggle('hidden', t !== 'reading');
    $('#obTaskRow').classList.toggle('hidden', t !== 'task');
    $('#obPackRow').classList.toggle('hidden', t !== 'pack');
  };
  $$('#obamaTypeSeg button').forEach(b => b.onclick = () => {
    state.obamaComposeType = b.dataset.t;
    $$('#obamaTypeSeg button').forEach(x => x.classList.toggle('active', x === b));
    syncRows(b.dataset.t);
  });
  syncRows(state.obamaComposeType);

  // Багц сонгоход гарчгийг автоматаар бөглөнө (засаж болно)
  $('#obPack').onchange = () => {
    const p = packs.find(x => x.id === $('#obPack').value);
    if (p) $('#obTitle').value = p.title;
  };

  $('#obamaSubmit').onclick = async () => {
    const t = state.obamaComposeType;
    const title = $('#obTitle').value.trim();
    if (!title) { toast('Гарчиг оруулна уу', 'x'); return; }
    if (t === 'pack' && !$('#obPack').value) { toast('Багц сонгоно уу', 'x'); return; }
    // Нуугдсан талбаруудын хуучин утгыг илгээхгүй
    const payload = {
      type: t,
      title,
      body: $('#obBody').value.trim(),
      link: t === 'reading' ? ($('#obLink').value.trim() || null) : null,
      due_date: t === 'task' ? ($('#obDue').value || null) : null,
      priority: t === 'task' ? $('#obPriority').value : 'normal',
      pack_id: t === 'pack' ? $('#obPack').value : null,
    };
    const res = await API.obamaCreate(payload);
    if (res && res.id) state.obamaJustCreated.add(res.id);
    toast('Нэмэгдлээ — Оюуд мэдэгдэл очлоо', 'bell');
    obamaView();
  };
}

function wireObamaFeed() {
  $$('[data-toggledone]').forEach(b => b.onclick = async () => {
    await API.obamaDone(b.dataset.toggledone);
    obamaView();
  });
  $$('[data-delobama]').forEach(b => b.onclick = async () => {
    await API.obamaDelete(b.dataset.delobama);
    toast('Устгагдлаа');
    obamaView();
  });
}

/* =============================== PROGRESS =============================== */
async function progressView() {
  const p = await API.progress();
  syncProgress(p);
  const pct = Math.round(p.xpInto / p.xpNext * 100);

  view.innerHTML = `
  <div class="page-head">
    <div class="eyebrow">${icon('chart')} Хувийн амжилт</div>
    <h1 class="page-title">Явц ба <span class="accent">амжилт</span></h1>
    <p class="page-sub">Тогтвортой суралцах нь авьяаснаас хүчтэй. Оюу, чиний ахиц энд.</p>
  </div>

  <div class="bento stagger">
    <div class="tile hero col-8" style="min-height:auto">
      <div class="eyebrow">Одоогийн түвшин</div>
      <h1 style="font-size:30px">Түвшин <b>${p.level}</b> · ${p.totalXp} XP</h1>
      <p>Дараагийн түвшин хүртэл ${p.xpNext - p.xpInto} XP үлдлээ.</p>
      <div class="mp-bar" style="margin-top:20px;max-width:420px;height:8px"><i style="width:${pct}%"></i></div>
    </div>
    <div class="tile col-4 stat gold"><div class="ico">${icon('gavel')}</div>
      <div><div class="stat-num">${p.examsPassed}<small>/2</small></div>
      <div class="stat-label">Тэнцсэн шалгалт</div></div></div>

    <div class="tile col-3 stat"><div class="ico">${icon('book')}</div>
      <div><div class="stat-num">${p.lessonsDone}</div><div class="stat-label">Хичээл</div></div></div>
    <div class="tile col-3 stat verm"><div class="ico">${icon('language')}</div>
      <div><div class="stat-num">${p.chinese}</div><div class="stat-label">Хятад хэл</div></div></div>
    <div class="tile col-3 stat"><div class="ico">${icon('scale')}</div>
      <div><div class="stat-num">${p.law}</div><div class="stat-label">Хууль зүй</div></div></div>
    <div class="tile col-3 stat gold"><div class="ico">${icon('target')}</div>
      <div><div class="stat-num">${p.perfect}</div><div class="stat-label">Төгс дасгал</div></div></div>
  </div>

  <div class="tile col-12 mt-lg">
    <div class="tile-eyebrow">${icon('award','lead')}<h3>Тэмдэг ба амжилтууд</h3>
      <span class="pill" style="margin-left:auto">${p.badges.filter(b=>b.earned).length}/${p.badges.length}</span></div>
    <div class="badge-grid">
      ${p.badges.map(b => `<div class="badge-card ${b.earned ? 'earned' : 'locked'}">
        <div class="badge-ic">${icon(b.icon)}</div>
        <div class="bn">${esc(b.name)}</div><div class="bd">${esc(b.desc)}</div></div>`).join('')}
    </div>
  </div>`;
}

/* ================================ boot ================================= */
const menuBtn = document.createElement('div');
menuBtn.className = 'menu-btn';
menuBtn.innerHTML = icon('menu');
menuBtn.onclick = () => document.getElementById('sidebar').classList.toggle('open');
document.body.appendChild(menuBtn);

window.addEventListener('hashchange', router);
(async () => {
  try {
    syncProgress(await API.progress());
    if (state.obamaUnread > 0 && location.hash.replace(/^#\//, '') !== 'obama') {
      setTimeout(() => toast(`Obama Room-д ${state.obamaUnread} шинэ зүйл ирлээ`, 'bell'), 500);
    }
  } catch (e) {}
  router();
})();
