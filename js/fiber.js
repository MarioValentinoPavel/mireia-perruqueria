// Fibra capilar ×400 en WebGL: cutícula en escamas, brillo anisótropo (Kajiya-Kay)
// y un frente de tratamiento que recorre la fibra de la raíz a la punta.
// Estado A = antes, estado B = después; el frente (0 raíz → 1 punta) decide qué parte ya está tratada.
(() => {
  const VS = `
attribute vec2 aUV;
uniform mat4 uPV;
uniform mat4 uM;
uniform mat3 uN;
uniform float uLen, uFront, uRot;
uniform float uDmgA, uDmgB, uWaveA, uWaveB, uRadA, uRadB;
varying vec3 vW;
varying vec3 vNo;
varying vec3 vTa;
varying float vS, vTh, vTr;

float tr(float s) { return 1.0 - smoothstep(uFront - 0.018, uFront + 0.018, s); }
float trw(float s) { return 1.0 - smoothstep(uFront - 0.07, uFront + 0.07, s); }
vec3 cl(float s) {
  float t = trw(s);
  float w = mix(uWaveA, uWaveB, t);
  float x = (s - 0.5) * uLen;
  float ph = x * 1.25 + 0.6;
  float a = w * (0.5 + 0.14 * sin(x * 0.41 + 1.3));
  return vec3(x, a * sin(ph), a * 0.8 * cos(ph));
}
float scaleF(float x, float th) {
  float w = 0.05 * sin(th * 3.0 + x * 1.7) + 0.026 * sin(th * 7.0 - x * 3.1) + 0.012 * sin(th * 17.0 + x * 0.9);
  return fract((x + w) / 0.17);
}
void main() {
  float s = aUV.y;
  float th = aUV.x * 6.2831853 + uRot;
  vec3 c = cl(s);
  vec3 T = normalize(cl(s + 0.0015) - cl(s - 0.0015));
  vec3 B1 = normalize(cross(T, vec3(0.0, 0.0, 1.0)));
  vec3 B2 = cross(B1, T);
  vec3 rd = cos(th) * B1 + sin(th) * B2;
  float t = tr(s);
  float dmg = mix(uDmgA, uDmgB, t);
  float rad = mix(uRadA, uRadB, trw(s)) * 0.5;
  float x = (s - 0.5) * uLen;
  float f = scaleF(x, th);
  float pw = mix(1.4, 5.0, dmg);
  float irr = 0.45 + 0.55 * abs(sin(th * 5.0 + x * 0.8 + 2.0) * sin(th * 2.0 - x * 1.3 + 0.4));
  float lift = (0.002 + dmg * 0.06 * irr) * pow(f, pw);
  vec4 w = uM * vec4(c + rd * (rad + lift), 1.0);
  vW = w.xyz;
  vNo = normalize(uN * rd);
  vTa = normalize(uN * T);
  vS = s; vTh = th; vTr = t;
  gl_Position = uPV * w;
}`;

  const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec3 vW;
varying vec3 vNo;
varying vec3 vTa;
varying float vS, vTh, vTr;
uniform vec3 uCam, uL1, uL2, uColA, uColB, uGlow, uRim;
uniform float uDmgA, uDmgB, uGlossA, uGlossB, uFront, uGlowOn, uBonds, uTime, uLen, uFade;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float scaleF(float x, float th) {
  float w = 0.05 * sin(th * 3.0 + x * 1.7) + 0.026 * sin(th * 7.0 - x * 3.1) + 0.012 * sin(th * 17.0 + x * 0.9);
  return fract((x + w) / 0.17);
}
float kk(vec3 T, vec3 H, float e) { float d = dot(T, H); return pow(sqrt(max(0.0, 1.0 - d * d)), e); }

void main() {
  float t = vTr;
  float dmg = mix(uDmgA, uDmgB, t);
  float gloss = mix(uGlossA, uGlossB, t);
  vec3 base = mix(uColA, uColB, t);
  vec3 N = normalize(vNo), T = normalize(vTa);
  vec3 V = normalize(uCam - vW);
  float x = (vS - 0.5) * uLen, th = vTh;

  // relieve de la cutícula: rampa de cada escama y borde libre que se levanta con el daño
  float f = scaleF(x, th);
  float pw = mix(1.4, 5.0, dmg);
  float amp = 0.0015 + dmg * 0.06;
  float slope = amp * pw * pow(max(f, 0.001), pw - 1.0) / 0.17;
  vec3 Np = normalize(N - T * slope * 1.3);
  float edge = smoothstep(0.93, 0.998, f);
  Np = normalize(mix(Np, normalize(N + T * 1.2), edge * (0.03 + 0.8 * dmg)));

  // pigmento con vetas
  float streak = 0.5 + 0.22 * sin(th * 3.0 + 1.7 * sin(x * 0.31)) + 0.16 * sin(th * 7.0 + x * 0.23 + 2.1 * sin(x * 0.13)) + 0.1 * sin(th * 13.0 - x * 0.4);
  vec3 col = base * (0.72 + 0.5 * streak);
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, vec3(lum) * 1.25 + 0.02, dmg * 0.45);

  float jit = (sin(th * 9.0 + x * 2.3) * sin(th * 4.0 - x * 3.7 + 1.1)) * 0.5 * dmg * 1.1;
  vec3 T1 = normalize(T + Np * (-0.08 + jit));
  vec3 T2 = normalize(T + Np * (0.18 + jit));
  float e1 = mix(30.0, 240.0, gloss) * (1.0 - 0.8 * dmg);
  float e2 = mix(10.0, 60.0, gloss) * (1.0 - 0.6 * dmg);
  float k1 = mix(0.03, 0.22, gloss) * (1.0 - 0.85 * dmg);

  vec3 L1 = normalize(uL1), L2 = normalize(uL2);
  vec3 H1 = normalize(L1 + V), H2 = normalize(L2 + V);
  float dif = pow(max(dot(Np, L1), 0.0), 1.3);
  vec3 acc = col * (0.06 + dif * 1.05);
  // franja especular nítida a lo largo de la fibra (varilla de cristal) + brillo anisótropo
  float es = mix(30.0, 420.0, gloss) * (1.0 - 0.75 * dmg);
  float stripe = pow(max(dot(Np, H1), 0.0), es) * mix(0.15, 1.7, gloss) * (1.0 - 0.85 * dmg);
  acc += vec3(1.0, 0.97, 0.93) * stripe;
  acc += vec3(1.0, 0.95, 0.9) * kk(T1, H1, e1) * k1;
  acc += col * kk(T2, H1, e2) * 1.2 * (1.0 - 0.5 * dmg);
  float stripe2 = pow(max(dot(Np, H2), 0.0), es * 0.5) * mix(0.05, 0.7, gloss) * (1.0 - 0.8 * dmg);
  acc += col * max(dot(Np, L2), 0.0) * 0.18 + uRim * stripe2;
  float fr = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  acc += uRim * fr * (0.12 + 0.2 * gloss);
  acc += vec3(1.0, 0.94, 0.88) * edge * dmg * 0.3 * max(dot(normalize(N + T), L1), 0.0);
  acc *= 1.0 - (0.05 + 0.25 * dmg) * (1.0 - f);

  // frente de tratamiento
  float g = exp(-pow((vS - uFront) * uLen / 0.2, 2.0)) * uGlowOn;
  acc += uGlow * g * (0.7 + 1.4 * fr);
  // enlaces que se reconstruyen (Fibre Clinix)
  vec2 q = vec2(fract(th / 6.2831853) * 20.0, x * 6.0);
  vec2 ci = floor(q), cf = fract(q);
  float hs = hash(ci);
  vec2 cc = vec2(hash(ci + 3.1), hash(ci + 7.7)) * 0.6 + 0.2;
  float dd = length((cf - cc) * vec2(0.157, 0.167));
  float tw = 0.5 + 0.5 * sin(uTime * 4.0 + hs * 40.0);
  float dotv = (smoothstep(0.022, 0.0, dd) + 0.3 * smoothstep(0.07, 0.0, dd)) * step(0.62, hs);
  acc += vec3(1.0, 0.9, 0.78) * dotv * tw * uBonds * t * (0.3 + 0.7 * max(dot(N, V), 0.0)) * 1.6;

  acc = acc / (1.0 + acc * 0.35);
  acc = pow(acc, vec3(1.0 / 2.2));
  float a = smoothstep(0.0, 0.05, vS) * smoothstep(1.0, 0.95, vS) * uFade;
  gl_FragColor = vec4(acc * a, a);
}`;

  // ---------- matrices (column-major) ----------
  const persp = (fov, asp, n, f) => { const t = 1 / Math.tan(fov / 2); return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, (2 * f * n) / (n - f), 0]; };
  const mul = (a, b) => { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; };
  const xform = (m, v) => [m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12], m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13], m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14], m[3] * v[0] + m[7] * v[1] + m[11] * v[2] + m[15]];
  function model(tx, ty, rz, ry, sc) {
    const cz = Math.cos(rz), sz = Math.sin(rz), cy = Math.cos(ry), sy = Math.sin(ry);
    // R = Rz * Ry
    return [
      cz * cy * sc, sz * cy * sc, -sy * sc, 0,
      -sz * sc, cz * sc, 0, 0,
      cz * sy * sc, sz * sy * sc, cy * sc, 0,
      tx, ty, 0, 1,
    ];
  }
  const nmat = (m) => { const s = Math.hypot(m[0], m[1], m[2]) || 1; return [m[0] / s, m[1] / s, m[2] / s, m[4] / s, m[5] / s, m[6] / s, m[8] / s, m[9] / s, m[10] / s]; };
  const hex = (h) => { const n = parseInt(h.replace('#', ''), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255].map((c) => Math.pow(c, 2.2)); };

  function create(canvas, opts = {}) {
    const gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
    if (!gl) return null;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; } return s; };
    const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn(gl.getProgramInfoLog(prog)); return null; }
    gl.useProgram(prog);

    // malla: tubo (u alrededor, s a lo largo); < 65 536 vértices para índices de 16 bits
    const NU = 48, NS = opts.lite ? 760 : 1260;
    const uv = new Float32Array((NU + 1) * (NS + 1) * 2);
    let k = 0;
    for (let j = 0; j <= NS; j++) for (let i = 0; i <= NU; i++) { uv[k++] = i / NU; uv[k++] = j / NS; }
    const idx = new Uint16Array(NU * NS * 6);
    k = 0;
    for (let j = 0; j < NS; j++) for (let i = 0; i < NU; i++) {
      const a = j * (NU + 1) + i, b = a + NU + 1;
      idx[k++] = a; idx[k++] = b; idx[k++] = a + 1; idx[k++] = a + 1; idx[k++] = b; idx[k++] = b + 1;
    }
    const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aUV');
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {};
    ['uPV', 'uM', 'uN', 'uLen', 'uFront', 'uRot', 'uDmgA', 'uDmgB', 'uWaveA', 'uWaveB', 'uRadA', 'uRadB', 'uCam', 'uL1', 'uL2', 'uColA', 'uColB', 'uGlow', 'uRim', 'uGlossA', 'uGlossB', 'uGlowOn', 'uBonds', 'uTime', 'uFade']
      .forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);

    const LEN = 26;
    // estado público, animable desde fuera (GSAP)
    const S = {
      A: { dmg: 0.85, wave: 0.25, rad: 1, gloss: 0.3, col: hex('#5a2f22') },
      B: { dmg: 0.05, wave: 0.25, rad: 1, gloss: 0.9, col: hex('#5a2f22') },
      front: -0.1, glowOn: 0, glow: hex('#fff2e2'), bonds: 0, fade: 1,
      // composición
      tx: 0, ty: -1, rz: 0.12, ry: 0.28, sc: 1, view: 8.5, camZ: 0,
      spin: 0.1, mx: 0, my: 0,
    };
    let W = 1, H = 1, dpr = 1, running = false, raf = 0, last = 0, time = 0, rot = 0;
    let pv = null, mm = null, mxs = 0, mys = 0;
    const FOV = 28 * Math.PI / 180;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, opts.lite ? 1.5 : 1.75);
      W = canvas.clientWidth || 1; H = canvas.clientHeight || 1;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    function camZ() { const asp = W / H; return S.view / (2 * Math.tan(FOV / 2) * asp) + S.camZ; }
    function draw() {
      const asp = W / H, cz = camZ();
      const proj = persp(FOV, asp, 0.1, 400);
      const view = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -cz, 1];
      pv = mul(proj, view);
      mm = model(S.tx, S.ty, S.rz, S.ry, S.sc);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix4fv(U.uPV, false, pv);
      gl.uniformMatrix4fv(U.uM, false, mm);
      gl.uniformMatrix3fv(U.uN, false, nmat(mm));
      gl.uniform1f(U.uLen, LEN); gl.uniform1f(U.uFront, S.front); gl.uniform1f(U.uRot, rot);
      gl.uniform1f(U.uDmgA, S.A.dmg); gl.uniform1f(U.uDmgB, S.B.dmg);
      gl.uniform1f(U.uWaveA, S.A.wave); gl.uniform1f(U.uWaveB, S.B.wave);
      gl.uniform1f(U.uRadA, S.A.rad); gl.uniform1f(U.uRadB, S.B.rad);
      gl.uniform1f(U.uGlossA, S.A.gloss); gl.uniform1f(U.uGlossB, S.B.gloss);
      gl.uniform3fv(U.uColA, S.A.col); gl.uniform3fv(U.uColB, S.B.col);
      gl.uniform3fv(U.uCam, [0, 0, cz]);
      gl.uniform3fv(U.uL1, [mxs * 0.35, 0.85 - mys * 0.35, 0.7]);
      gl.uniform3fv(U.uL2, [0.8, -0.35, -0.5]);
      gl.uniform3fv(U.uGlow, S.glow); gl.uniform3fv(U.uRim, hex('#d9cdc4'));
      gl.uniform1f(U.uGlowOn, S.glowOn); gl.uniform1f(U.uBonds, S.bonds);
      gl.uniform1f(U.uTime, time); gl.uniform1f(U.uFade, S.fade);
      gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
    }
    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      time += dt; rot += dt * S.spin;
      mxs += (S.mx - mxs) * Math.min(1, dt * 3); mys += (S.my - mys) * Math.min(1, dt * 3);
      draw();
    }
    // proyección de la fibra en pantalla: para arrastrar el frente con el dedo
    function sAt(px, py) {
      if (!pv || !mm) return null;
      const m = mul(pv, mm);
      let best = null, bd = Infinity;
      for (let i = 0; i <= 80; i++) {
        const s = i / 80, p = xform(m, [(s - 0.5) * LEN, 0, 0]);
        const sx = (p[0] / p[3] * 0.5 + 0.5) * W, sy = (-p[1] / p[3] * 0.5 + 0.5) * H;
        const d = Math.hypot(sx - px, sy - py);
        if (d < bd) { bd = d; best = s; }
      }
      return { s: best, d: bd };
    }
    // tramo de la fibra que se ve en pantalla (en s, 0 raíz → 1 punta)
    function visRange() {
      if (!pv || !mm) draw();
      const m = mul(pv, mm);
      let lo = 1, hi = 0;
      for (let i = 0; i <= 120; i++) {
        const s = i / 120, p = xform(m, [(s - 0.5) * LEN, 0, 0]);
        const sx = (p[0] / p[3] * 0.5 + 0.5) * W, sy = (-p[1] / p[3] * 0.5 + 0.5) * H;
        if (sx >= 0 && sx <= W && sy >= -H * 0.2 && sy <= H * 1.2) { lo = Math.min(lo, s); hi = Math.max(hi, s); }
      }
      return hi > lo ? [lo, hi] : [0, 1];
    }
    const api = {
      S, hex, sAt, visRange,
      resize,
      start() { if (running) return; running = true; last = 0; raf = requestAnimationFrame(frame); },
      stop() { running = false; cancelAnimationFrame(raf); },
      renderOnce() { draw(); },
      get running() { return running; },
      // B pasa a ser el nuevo A (se fija el resultado)
      commit() { S.A = { ...S.B, col: S.B.col.slice() }; S.front = -0.1; },
    };
    resize();
    window.addEventListener('resize', resize);
    return api;
  }
  window.Fiber = { create };
})();
