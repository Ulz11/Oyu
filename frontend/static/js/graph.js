/* ============================================================
   Oyu · Мэдлэгийн граф — 3D force-directed visualization
   Хамааралгүй, canvas дээрх өөрийн 3D engine:
   - 3D физик (түлхэлт · пүрш · төв рүү татах)
   - Перспектив проекц + гүний манан (depth fog)
   - Аажим авто-эргэлт; чирч эргүүлэх; гүйлгэж томруулах
   - Зангилаа дээр дарж холбоосыг гэрэлтүүлэх
   - 2D горим — z тэнхлэгийг хавтгайруулна
   ============================================================ */

const GROUP_COLORS = {
  core:       { fill: '#16294f', ring: '#ddba6b' },
  mn:         { fill: '#2a4a9e', ring: '#7d97d6' },
  intl:       { fill: '#b98a2f', ring: '#ddba6b' },
  cases:      { fill: '#2e7d64', ring: '#6fbfa4' },
  foundation: { fill: '#c2452d', ring: '#e0785a' },
  business:   { fill: '#b98a2f', ring: '#ddba6b' },
  fluency:    { fill: '#2e7d64', ring: '#6fbfa4' },
};

class KnowledgeGraph {
  constructor(canvas, data, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onSelect = opts.onSelect || (() => {});
    this.mode = opts.mode || '3d';           // '3d' | '2d'
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Камер
    this.rotY = 0.45; this.rotX = 0.22;
    this.zoom = 1; this.focal = 720;
    this.autoSpin = 0.0024;
    this.idleTimer = 0;

    this.setData(data);
    this._bind();
    this.resize();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  /* ------------------------------ өгөгдөл ------------------------------ */
  setData(data) {
    const N = data.nodes.length;
    // алтан спираль — бөмбөрцөг дээр жигд тараана
    this.nodes = data.nodes.map((n, i) => {
      const phi = Math.acos(1 - 2 * (i + 0.5) / N);
      const theta = i * 2.399963;
      const r = 150;
      return {
        ...n,
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.cos(phi) * 0.8,
        z: r * Math.sin(phi) * Math.sin(theta),
        vx: 0, vy: 0, vz: 0,
        sx: 0, sy: 0, sr: 0, depth: 0,
      };
    });
    this.index = Object.fromEntries(this.nodes.map(n => [n.id, n]));
    this.edges = data.edges
      .map(e => ({ ...e, S: this.index[e.s], T: this.index[e.t] }))
      .filter(e => e.S && e.T);
    this.hover = null;
    this.selected = null;
    this.alpha = 1;
  }

  setMode(mode) { this.mode = mode; this.alpha = 1; }

  /* ---------------------------- харилцан үйлдэл ---------------------------- */
  _bind() {
    const c = this.canvas;
    let dragging = false, lastX = 0, lastY = 0, moved = 0;

    const pos = (e) => {
      const r = c.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      return { x: t.clientX - r.left, y: t.clientY - r.top };
    };
    const pick = (p) => {
      // хамгийн ойрын (проекц дээрх) зангилаа
      let best = null, bd = 1e9;
      for (const n of this.nodes) {
        const d = Math.hypot(n.sx - p.x, n.sy - p.y);
        if (d < n.sr + 7 && n.depth < bd) { best = n; bd = n.depth; }
      }
      return best;
    };

    const down = (e) => {
      dragging = true; moved = 0;
      const p = pos(e); lastX = p.x; lastY = p.y;
      this.idleTimer = 160;
      if (e.touches) e.preventDefault();
    };
    const move = (e) => {
      const p = pos(e);
      if (dragging) {
        const dx = p.x - lastX, dy = p.y - lastY;
        moved += Math.abs(dx) + Math.abs(dy);
        if (this.mode === '3d') {
          this.rotY += dx * 0.0055;
          this.rotX = Math.max(-1.2, Math.min(1.2, this.rotX + dy * 0.0045));
        } else {
          // 2D: пан хийхийн оронд зөөлөн эргэлт байхгүй — үл тоомсорлоно
        }
        lastX = p.x; lastY = p.y;
        this.idleTimer = 160;
        if (e.touches) e.preventDefault();
      } else {
        const h = pick(p);
        this.hover = h ? h.id : null;
        c.style.cursor = h ? 'pointer' : 'grab';
        if (h) this.idleTimer = Math.max(this.idleTimer, 40);
      }
    };
    const up = (e) => {
      if (!dragging) return;
      dragging = false;
      if (moved < 6) {                      // товшилт — сонголт
        const p = pos(e.changedTouches ? { touches: e.changedTouches } : e);
        const n = pick(p);
        if (n) this.select(n);
      }
    };

    c.addEventListener('mousedown', down);
    c.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    c.addEventListener('touchstart', down, { passive: false });
    c.addEventListener('touchmove', move, { passive: false });
    c.addEventListener('touchend', up);
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom = Math.max(0.5, Math.min(2.4, this.zoom * (e.deltaY < 0 ? 1.09 : 0.92)));
      this.idleTimer = 120;
    }, { passive: false });

    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
  }

  select(n) {
    this.selected = n.id;
    const links = this.edges
      .filter(e => e.s === n.id || e.t === n.id)
      .map(e => (e.s === n.id ? e.T.label : e.S.label));
    this.onSelect({ ...n, links });
  }

  resize() {
    const c = this.canvas;
    const W = c.clientWidth, H = c.clientHeight;
    c.width = W * this.dpr; c.height = H * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.W = W; this.H = H;
  }

  /* -------------------------------- физик -------------------------------- */
  step() {
    const { nodes, edges } = this;
    const k = this.alpha;
    const flat = this.mode === '2d';

    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        let dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
        let d2 = dx * dx + dy * dy + dz * dz || 0.01;
        const rep = 26000 / d2;
        const d = Math.sqrt(d2);
        const fx = (dx / d) * rep, fy = (dy / d) * rep, fz = (dz / d) * rep;
        a.vx += fx * k; a.vy += fy * k; a.vz += fz * k;
        b.vx -= fx * k; b.vy -= fy * k; b.vz -= fz * k;
      }
    }
    for (const e of edges) {
      const a = e.S, b = e.T;
      let dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
      let d = Math.hypot(dx, dy, dz) || 0.01;
      const f = (d - 120) * 0.05 * k;
      const fx = (dx / d) * f, fy = (dy / d) * f, fz = (dz / d) * f;
      a.vx += fx; a.vy += fy; a.vz += fz;
      b.vx -= fx; b.vy -= fy; b.vz -= fz;
    }
    for (const n of nodes) {
      n.vx -= n.x * 0.004 * k; n.vy -= n.y * 0.004 * k; n.vz -= n.z * 0.004 * k;
      n.vx *= 0.85; n.vy *= 0.85; n.vz *= 0.85;
      n.x += n.vx; n.y += n.vy; n.z += n.vz;
      if (flat) { n.z *= 0.85; n.vz = 0; }       // 2D — хавтгайруулна
    }
    this.alpha = Math.max(0.028, this.alpha * 0.995);
  }

  /* -------------------------------- зурах -------------------------------- */
  project() {
    const cy = Math.cos(this.rotY), sy = Math.sin(this.rotY);
    const cx = Math.cos(this.rotX), sx = Math.sin(this.rotX);
    const CX = this.W / 2, CY = this.H / 2;
    for (const n of this.nodes) {
      const X1 = n.x * cy + n.z * sy;
      const Z1 = -n.x * sy + n.z * cy;
      const Y2 = n.y * cx - Z1 * sx;
      const Z2 = n.y * sx + Z1 * cx;
      const p = this.focal / (this.focal + Z2 + 60);
      n.sx = CX + X1 * p * this.zoom;
      n.sy = CY + Y2 * p * this.zoom;
      n.sr = Math.max(4, n.size * p * this.zoom * 0.92);
      n.depth = Z2;
      n.p = p;
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);
    const active = this.hover || this.selected;
    const connected = new Set();
    if (active) {
      connected.add(active);
      this.edges.forEach(e => {
        if (e.s === active) connected.add(e.t);
        if (e.t === active) connected.add(e.s);
      });
    }

    // ирмэгүүд — гүнээр бүдгэрнэ
    for (const e of this.edges) {
      const on = active && (e.s === active || e.t === active);
      const depthFade = Math.max(0.12, Math.min(1, ((e.S.p + e.T.p) / 2 - 0.45) * 1.7));
      ctx.beginPath();
      ctx.moveTo(e.S.sx, e.S.sy);
      const mx = (e.S.sx + e.T.sx) / 2, my = (e.S.sy + e.T.sy) / 2 - 12;
      ctx.quadraticCurveTo(mx, my, e.T.sx, e.T.sy);
      if (on) {
        ctx.strokeStyle = `rgba(185,138,47,${0.75 * depthFade})`;
        ctx.lineWidth = 2;
      } else {
        const a = active ? 0.05 : 0.16;
        ctx.strokeStyle = `rgba(24,34,56,${a * depthFade})`;
        ctx.lineWidth = 1;
      }
      ctx.stroke();
      if (on && depthFade > 0.5) {
        ctx.save();
        ctx.font = '11px "Golos Text", sans-serif';
        ctx.fillStyle = `rgba(74,85,112,${depthFade})`;
        ctx.textAlign = 'center';
        ctx.fillText(e.label, mx, my - 3);
        ctx.restore();
      }
    }

    // зангилаанууд — алсаас ойр руу
    const order = [...this.nodes].sort((a, b) => b.depth - a.depth);
    for (const n of order) {
      const c = GROUP_COLORS[n.group] || GROUP_COLORS.mn;
      const dim = active && !connected.has(n.id);
      const isActive = n.id === active;
      const fog = Math.max(0.18, Math.min(1, (n.p - 0.42) * 1.9));

      ctx.save();
      ctx.globalAlpha = (dim ? 0.22 : 1) * fog;

      // гүний сүүдэр
      ctx.beginPath();
      ctx.arc(n.sx, n.sy + n.sr * 0.14, n.sr, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(22,41,79,.16)';
      ctx.fill();

      if (isActive) { ctx.shadowColor = 'rgba(185,138,47,.55)'; ctx.shadowBlur = 24; }
      // бөмбөлөг мэт градиент
      const g = ctx.createRadialGradient(
        n.sx - n.sr * 0.35, n.sy - n.sr * 0.4, n.sr * 0.1,
        n.sx, n.sy, n.sr * 1.15);
      g.addColorStop(0, this._lighten(c.fill, 0.34));
      g.addColorStop(1, c.fill);
      ctx.beginPath();
      ctx.arc(n.sx, n.sy, n.sr, 0, Math.PI * 2);
      ctx.fillStyle = g; ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = isActive ? 2.6 : 1.6;
      ctx.strokeStyle = c.ring; ctx.stroke();
      // гялбаа
      ctx.beginPath();
      ctx.arc(n.sx - n.sr * 0.3, n.sy - n.sr * 0.35, n.sr * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fill();
      ctx.restore();

      // шошго
      if (fog > 0.3) {
        ctx.save();
        ctx.globalAlpha = (dim ? 0.25 : 1) * Math.min(1, fog * 1.15);
        const fs = Math.max(10.5, n.sr / 1.9);
        ctx.font = `${isActive ? '600 ' : '500 '}${fs}px "Golos Text", "Noto Sans SC", sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.lineWidth = 3.5; ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(245,241,232,.85)';
        ctx.strokeText(n.label, n.sx, n.sy + n.sr + 5);
        ctx.fillStyle = '#182238';
        ctx.fillText(n.label, n.sx, n.sy + n.sr + 5);
        ctx.restore();
      }
    }
  }

  _lighten(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, (n >> 16) + 255 * amt);
    const g = Math.min(255, ((n >> 8) & 255) + 255 * amt);
    const b = Math.min(255, (n & 255) + 255 * amt);
    return `rgb(${r | 0},${g | 0},${b | 0})`;
  }

  loop() {
    this.step();
    if (this.mode === '3d') {
      if (this.idleTimer > 0) this.idleTimer--;
      else this.rotY += this.autoSpin;          // амарч байхдаа аажим эргэнэ
    } else {
      // 2D руу зөөлөн буцна
      this.rotY *= 0.94; this.rotX *= 0.94;
    }
    this.project();
    this.draw();
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this._onResize);
  }
}
