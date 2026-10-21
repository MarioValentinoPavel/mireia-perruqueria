// Cuero cabelludo ×40 (tricoscopia ilustrada) en canvas 2D.
// t = 0 sano · t = 1 avisa (pelos que se afinan, folículos vacíos, rojez) · t = 2 cuidado (se recupera)
(() => {
  const rng = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mix = (a, b, k) => a + (b - a) * k;

  function create(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const R = rng(20021);
    const units = [];
    const step = 0.2;
    for (let y = -1.1; y <= 1.1; y += step) {
      for (let x = -1.1; x <= 1.1; x += step) {
        const px = x + (R() - 0.5) * step * 0.85, py = y + (R() - 0.5) * step * 0.85;
        if (px * px + py * py > 1.3) continue;
        const r = R();
        const n = r < 0.28 ? 1 : r < 0.8 ? 2 : 3;
        const hairs = [];
        for (let i = 0; i < n; i++) {
          hairs.push({
            a: 0.62 + (R() - 0.5) * 0.42,
            len: 0.13 + R() * 0.1,
            bend: (R() - 0.5) * 0.7,
            w: 0.85 + R() * 0.35,
            thin: R(), loss: R(), ox: (R() - 0.5) * 0.014, oy: (R() - 0.5) * 0.014,
            tone: R(),
          });
        }
        units.push({ x: px, y: py, hairs, red: R(), s: 0.8 + R() * 0.5 });
      }
    }
    // textura de piel precalculada
    let tex = null, size = 0, dpr = 1;
    function makeTex(px) {
      const c = document.createElement('canvas');
      c.width = c.height = px;
      const g = c.getContext('2d');
      const r2 = rng(77);
      for (let i = 0; i < px * px * 0.012; i++) {
        const x = r2() * px, y = r2() * px, rr = 0.4 + r2() * 1.6 * dpr;
        g.fillStyle = r2() < 0.5 ? 'rgba(120,70,50,0.10)' : 'rgba(255,240,230,0.12)';
        g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill();
      }
      // pliegues finos de la piel
      g.strokeStyle = 'rgba(140,85,60,0.08)'; g.lineWidth = 0.8 * dpr;
      for (let i = 0; i < 26; i++) {
        g.beginPath();
        let x = r2() * px, y = r2() * px; g.moveTo(x, y);
        for (let k = 0; k < 5; k++) { x += (r2() - 0.5) * px * 0.18; y += (r2() - 0.5) * px * 0.18; g.lineTo(x, y); }
        g.stroke();
      }
      return c;
    }
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = canvas.clientWidth || 300;
      canvas.width = canvas.height = Math.round(size * dpr);
      tex = makeTex(canvas.width);
    }
    let cur = 0;
    function draw(t) {
      cur = t;
      const W = canvas.width, C = W / 2, S = W / 2;
      const warn = t <= 1 ? t : Math.max(0, 1 - (t - 1) * 0.9);
      const care = clamp(t - 1, 0, 1);
      ctx.save();
      ctx.clearRect(0, 0, W, W);
      ctx.beginPath(); ctx.arc(C, C, S, 0, Math.PI * 2); ctx.clip();
      // piel
      const g = ctx.createRadialGradient(C * 0.8, C * 0.75, S * 0.1, C, C, S * 1.05);
      g.addColorStop(0, '#f0d2bd'); g.addColorStop(0.6, '#e4bba1'); g.addColorStop(1, '#cf9f84');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, W);
      ctx.drawImage(tex, 0, 0);
      // rojez alrededor de algunos folículos cuando avisa
      if (warn > 0.02) {
        units.forEach((u) => {
          if (u.red > 0.55) return;
          const x = C + u.x * S, y = C + u.y * S, rr = S * 0.09 * u.s;
          const rg = ctx.createRadialGradient(x, y, 0, x, y, rr);
          rg.addColorStop(0, `rgba(206,92,78,${0.26 * warn})`); rg.addColorStop(1, 'rgba(206,92,78,0)');
          ctx.fillStyle = rg; ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
        });
      }
      const lw = S / 160;
      units.forEach((u) => {
        const x0 = C + u.x * S, y0 = C + u.y * S;
        let alive = 0;
        u.hairs.forEach((h, i) => {
          const lost = i > 0 && h.loss < 0.42 * warn;
          if (lost) return;
          alive++;
          const m = clamp((warn * 0.8 - h.thin * 0.9) * 3, 0, 1) * (1 - care * 0.6);
          const regrow = care * (h.loss < 0.42 ? 1 : 0);
          const len = S * h.len * mix(1, 0.45, m);
          const w = lw * 2.1 * h.w * mix(1, 0.38, m);
          const sx = x0 + h.ox * S, sy = y0 + h.oy * S;
          const dx = Math.cos(h.a), dy = Math.sin(h.a), px = -dy, py = dx;
          const cx = sx + dx * len * 0.5 + px * h.bend * len * 0.32, cy = sy + dy * len * 0.5 + py * h.bend * len * 0.32;
          const ex = sx + dx * len + px * h.bend * len * 0.14, ey = sy + dy * len + py * h.bend * len * 0.14;
          // sombra
          ctx.strokeStyle = 'rgba(70,35,20,0.18)'; ctx.lineWidth = w * 1.5; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(sx + lw, sy + lw * 1.4); ctx.quadraticCurveTo(cx + lw, cy + lw * 1.4, ex + lw, ey + lw * 1.4); ctx.stroke();
          // pelo
          const d = Math.round(mix(36 + h.tone * 18, 118, m)), d2 = Math.round(mix(22 + h.tone * 12, 82, m)), d3 = Math.round(mix(16, 62, m));
          ctx.strokeStyle = `rgb(${d},${d2},${d3})`; ctx.lineWidth = w;
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke();
          // reflejo
          ctx.strokeStyle = `rgba(255,230,210,${0.32 * (1 - m * 0.7)})`; ctx.lineWidth = Math.max(0.6, w * 0.28);
          ctx.beginPath(); ctx.moveTo(sx - px * w * 0.18, sy - py * w * 0.18); ctx.quadraticCurveTo(cx - px * w * 0.2, cy - py * w * 0.2, ex - px * w * 0.12, ey - py * w * 0.12); ctx.stroke();
          // pelo nuevo que asoma al cuidar
          if (regrow > 0 && h.loss < 0.42 && i > 0) {
            ctx.strokeStyle = 'rgba(60,34,22,0.8)'; ctx.lineWidth = w * 0.6;
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + dx * len * 0.25 * regrow, sy + dy * len * 0.25 * regrow); ctx.stroke();
          }
        });
        // orificio del folículo (más visible si queda vacío)
        const empty = alive < u.hairs.length;
        ctx.fillStyle = empty ? `rgba(150,92,70,${0.35 + 0.25 * warn})` : 'rgba(110,60,42,0.38)';
        ctx.beginPath(); ctx.ellipse(x0, y0, lw * (empty ? 3.2 : 2.5) * u.s, lw * (empty ? 2.6 : 2) * u.s, 0.6, 0, Math.PI * 2); ctx.fill();
      });
      // viñeta del ocular y brillo de la lente
      const v = ctx.createRadialGradient(C, C, S * 0.55, C, C, S);
      v.addColorStop(0, 'rgba(30,15,10,0)'); v.addColorStop(1, 'rgba(30,15,10,0.42)');
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, W);
      const gl = ctx.createRadialGradient(C * 0.62, C * 0.5, 0, C * 0.62, C * 0.5, S * 0.6);
      gl.addColorStop(0, 'rgba(255,250,245,0.18)'); gl.addColorStop(1, 'rgba(255,250,245,0)');
      ctx.fillStyle = gl; ctx.fillRect(0, 0, W, W);
      ctx.restore();
    }
    resize();
    draw(0);
    let rt = 0;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { resize(); draw(cur); }, 120); });
    return { draw, get t() { return cur; } };
  }
  window.Scalp = { create };
})();
