// 《冰下的夏天》 —— 分镜
// 每个镜头：{ id, dur, draw(ctx, t, d, p), xin?(与上一镜叠化秒数), fin?(从黑/白淡入), fout?(淡出到黑) }

// ================= 场景零件 =================
function curveThrough(ctx, pts, closed = true) {
  const n = pts.length, P = i => pts[(i + n) % n];
  ctx.moveTo(P(0)[0], P(0)[1]);
  const lim = closed ? n : n - 1;
  for (let i = 0; i < lim; i++) {
    const p0 = closed ? P(i - 1) : pts[Math.max(0, i - 1)], p1 = P(i), p2 = P(i + 1), p3 = closed ? P(i + 2) : pts[Math.min(n - 1, i + 2)];
    ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
}
function grass(ctx, w, y0, y1, n, t, o = {}) {
  const seed = o.seed || 1, blades = [];
  for (let i = 0; i < n; i++) blades.push([rand(i * 7 + seed) * w, lerp(y0, y1, Math.pow(rand(i * 3 + seed), .6)), i]);
  blades.sort((a, b) => a[1] - b[1]);
  ctx.lineCap = 'round';
  for (const [x, y, i] of blades) {
    const depth = (y - y0) / (y1 - y0 + 1e-6);
    const hg = (6 + 70 * depth) * (o.scale || 1) * (.6 + rand(i) * .8);
    const sw = ((noise1(t * (o.speed || .8) + x * .003, seed) - .5) * 2 + (o.lean || 0)) * (o.wind ?? .5) * hg * .7;
    ctx.strokeStyle = o.col(depth, i);
    ctx.lineWidth = .7 + depth * 2.2 * (o.thick || 1);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + sw * .3, y - hg * .6, x + sw, y - hg); ctx.stroke();
  }
}
function glints(ctx, x0, x1, y0, y1, t, n, o = {}) {
  const seed = o.seed || 2;
  for (let i = 0; i < n; i++) {
    let x = lerp(x0, x1, rand(i * 5 + seed));
    if (o.focus !== undefined) x = o.focus + (rand(i * 5 + seed) - .5) * (o.spread || 200) * (1 + (rand(i * 3 + seed)) * 1.5) * (0.3 + rand(i * 9) * 1.2);
    const yy = lerp(y0, y1, Math.pow(rand(i * 3 + seed), 1.6));
    const dep = (yy - y0) / (y1 - y0 + 1e-6);
    let fx = x; if (o.focus !== undefined) { const sp = (o.spread || 200) * (.35 + dep * 1.3); fx = o.focus + (rand(i * 5 + seed) - .5) * 2 * sp; }
    const tw = Math.max(0, Math.sin(t * (2 + rand(i) * 4) + i * 1.7));
    const len = (4 + dep * 40) * (.5 + rand(i * 11));
    ctx.strokeStyle = rgba(o.col || [255, 255, 255], (o.a ?? .8) * tw * tw);
    ctx.lineWidth = .8 + dep * 2;
    const drift = (o.drift || 0) * t;
    ctx.beginPath(); ctx.moveTo(fx - len / 2 + drift, yy); ctx.lineTo(fx + len / 2 + drift, yy); ctx.stroke();
  }
}
function cloud(ctx, x, y, s, seed, col = [255, 255, 255], a = 1) {
  const r = mulberry(seed);
  const shade = mix(col, [150, 170, 190], .35);
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = rgba(pass ? col : shade, a);
    for (let i = 0; i < 9; i++) {
      const u = (r() - .5) * 2, rr = s * (.25 + r() * .3) * (1 - Math.abs(u) * .4);
      ctx.beginPath(); ctx.arc(x + u * s * .9, y - rr * .5 - (pass ? s * .06 : 0) - r() * s * .15, rr, 0, 7); ctx.fill();
    }
  }
}
function stones(ctx, w, y0, y1, n, seed, o = {}) {
  const r = mulberry(seed), arr = [];
  for (let i = 0; i < n; i++) arr.push([r() * w, lerp(y0, y1, Math.pow(r(), .7)), r(), r(), r()]);
  arr.sort((a, b) => a[1] - b[1]);
  for (const [x, y, a, b, c] of arr) {
    const d = (y - y0) / (y1 - y0 + 1e-6), s = (4 + d * 40) * (.5 + a);
    ctx.fillStyle = rgba(mix(o.col || [60, 60, 60], o.col2 || [120, 115, 105], b), 1);
    ctx.beginPath(); ctx.ellipse(x, y, s, s * (.45 + c * .2), 0, 0, 7); ctx.fill();
    if (o.snow) { ctx.fillStyle = `rgba(235,240,245,${o.snow})`; ctx.beginPath(); ctx.ellipse(x, y - s * .25, s * .8, s * .25, 0, Math.PI, 0); ctx.fill(); }
    if (o.light) { ctx.fillStyle = rgba(o.light, .25); ctx.beginPath(); ctx.ellipse(x - s * .2, y - s * .15, s * .5, s * .15, 0, 0, 7); ctx.fill(); }
  }
}
let BUF = null, BUF2 = null, SNOWL = null;
function buf() { if (!BUF) BUF = mkCanvas(W, H); return BUF; }
function buf2() { if (!BUF2) BUF2 = mkCanvas(W, H); return BUF2; }

// —— 冬日冰原（远景）——
function winterIce(g, w, h, t, o = {}) {
  const hy = h * (o.hy ?? .5);
  vgrad(g, 0, 0, w, hy + 2, [[0, o.sky0 || '#cfd6dc'], [1, o.sky1 || '#e9ecee']]);
  ridge(g, w, hy, o.ridge ?? 14, o.rseed || 3, o.rcol || 'rgba(160,172,184,.45)', .6);
  vgrad(g, 0, hy, w, h - hy, [[0, '#e6eaec'], [.3, '#dde4e8'], [1, '#d3dde3']]);
  g.save(); g.globalAlpha = .5;
  for (let i = 0; i < 26; i++) {
    const yy = hy + Math.pow(i / 26, 1.8) * (h - hy);
    g.fillStyle = `rgba(${rand(i) > .5 ? '175,195,210' : '250,252,253'},${.25 + rand(i + 4) * .3})`;
    g.fillRect(0, yy, w, 1 + (yy - hy) * .02);
  }
  g.restore();
}
// —— 冬夜 ——
function winterNight(g, w, h, t, o = {}) {
  const hy = h * (o.hy ?? .5);
  vgrad(g, 0, 0, w, hy + 2, [[0, '#050a15'], [.7, '#132039'], [1, '#1d2d49']]);
  stars(g, w, hy, t, 160, 5, .8);
  if (o.moon) moon(g, o.moon[0], o.moon[1], o.moon[2] || 24);
  ridge(g, w, hy, 26, 8, '#0a111f', .8);
  vgrad(g, 0, hy, w, h - hy, [[0, '#1a2842'], [1, '#0b1322']]);
  if (o.moon) {
    g.save(); g.globalCompositeOperation = 'screen';
    glints(g, 0, w, hy + 3, h, t, 260, { focus: o.moon[0], spread: 90, col: [190, 210, 240], a: .5, seed: 11 });
    g.save(); g.translate(o.moon[0], hy); g.scale(1, (h - hy) / 180);
    glow(g, 0, 0, 180, [140, 165, 210], .45); g.restore();
    g.restore();
  }
}
// —— 夏日湖景 ——
function summerLake(g, w, h, t, o = {}) {
  const hy = h * (o.hy ?? .45);
  vgrad(g, 0, 0, w, hy + 2, [[0, '#5e97cf'], [1, '#cfe2ee']]);
  if (o.clouds !== false) for (let i = 0; i < 7; i++) {
    const x = ((rand(i) * 1.4 * w - t * (o.cloudSpeed || 8) * (1 + rand(i + 3))) % (w * 1.4) + w * 1.4) % (w * 1.4) - w * .2;
    cloud(g, x, hy * (.2 + rand(i + 9) * .55), 90 + rand(i + 2) * 120, i + 1, [255, 255, 255], .9);
  }
  ridge(g, w, hy, 60, 21, '#7d8d97', .5);
  ridge(g, w, hy + 4, 30, 23, '#5f7a6a', .9);
  vgrad(g, 0, hy, w, h - hy, [[0, '#3b86b5'], [.4, '#1f5f8e'], [1, '#174a70']]);
  g.save(); g.globalCompositeOperation = 'screen';
  glints(g, 0, w, hy + 2, h, t, 380, { col: [220, 240, 255], a: .6, seed: 4, drift: 3 });
  g.restore();
}

// —— 站台 ——
function platform(g, w, h, t, season) {
  const win = season === 'winter', dusk = season === 'dusk';
  const hy = h * .42;
  if (win) vgrad(g, 0, 0, w, hy + 2, [[0, '#b9c1c8'], [1, '#dde1e3']]);
  else if (dusk) vgrad(g, 0, 0, w, hy + 2, [[0, '#4b3f5e'], [.55, '#c77c5a'], [1, '#f0b77a']]);
  else vgrad(g, 0, 0, w, hy + 2, [[0, '#79a9d6'], [1, '#d6e6ef']]);
  ridge(g, w, hy, 50, 31, win ? '#a7b0b8' : dusk ? '#5b4a57' : '#7f8f8f', .5);
  // 湖
  vgrad(g, 0, hy, w, h * .12, win ? [[0, '#e3e7ea'], [1, '#d0d8de']] : dusk ? [[0, '#e0a071'], [1, '#6d5160']] : [[0, '#4b8fbd'], [1, '#2a6b98']]);
  if (!win) { g.save(); g.globalCompositeOperation = 'screen'; glints(g, 0, w, hy + 2, hy + h * .12, t, 120, { col: dusk ? [255, 210, 150] : [230, 245, 255], a: .6 }); g.restore(); }
  // 铁轨
  const ty = hy + h * .12;
  g.fillStyle = win ? '#9aa2a8' : dusk ? '#3a2f33' : '#6b665c'; g.fillRect(0, ty, w, h * .1);
  g.fillStyle = win ? '#e9edef' : 'rgba(0,0,0,.3)';
  for (let i = 0; i < 40; i++) g.fillRect(i * w / 40, ty + h * .03, w / 80, h * .06);
  g.fillStyle = win ? '#7d858b' : '#2a2224'; g.fillRect(0, ty + h * .03, w, 4); g.fillRect(0, ty + h * .08, w, 4);
  // 站台面
  const py = ty + h * .1;
  vgrad(g, 0, py, w, h - py, win ? [[0, '#e8ecee'], [1, '#d5dde2']] : dusk ? [[0, '#8a6c5c'], [1, '#4e3b36']] : [[0, '#b9b2a4'], [1, '#948c7d']]);
  g.fillStyle = win ? '#c9d1d6' : dusk ? '#c9a070' : '#d8cfae'; g.fillRect(0, py, w, 8);
  // 灯柱
  for (let i = 0; i < 3; i++) {
    const lx = w * (.18 + i * .36), ly = py + 30;
    g.fillStyle = win ? '#3c4046' : '#221c1d'; g.fillRect(lx - 4, ly - h * .42, 8, h * .42);
    g.fillRect(lx - 4, ly - h * .42, 40, 6);
    if (dusk) { g.save(); g.globalCompositeOperation = 'screen'; glow(g, lx + 36, ly - h * .41 + 12, 120, [255, 190, 110], .7); g.restore(); }
  }
  return { hy, ty, py };
}

// —— 岬角与木柱 ——
function headland(g, w, h, t, season, o = {}) {
  const win = season === 'winter';
  const hy = h * .5;
  if (win) vgrad(g, 0, 0, w, hy + 2, [[0, '#bfc6cc'], [1, '#e1e4e6']]);
  else vgrad(g, 0, 0, w, hy + 2, [[0, '#6a9fd2'], [1, '#d4e5ee']]);
  if (!win) cloud(g, w * .75, hy * .45, 150, 7, [255, 255, 255], .9);
  ridge(g, w, hy, 50, 41, win ? '#aeb6bd' : '#8494a0', .5);
  vgrad(g, 0, hy, w, h - hy, win ? [[0, '#dfe5e8'], [1, '#d3dbe0']] : [[0, '#3a82b1'], [1, '#1d5a86']]);
  if (!win) { g.save(); g.globalCompositeOperation = 'screen'; glints(g, 0, w, hy, h * .7, t, 160, { col: [230, 245, 255], a: .5 }); g.restore(); }
  // 岬角（岩石 + 草/雪）
  g.fillStyle = win ? '#e4e8eb' : '#9c9a6a';
  g.beginPath(); g.moveTo(0, h); g.lineTo(0, h * .66);
  for (let x = 0; x <= w; x += 20) g.lineTo(x, h * .66 - Math.sin(x / w * 3.1) * h * .08 + fbm(x / 90, 5) * 14);
  g.lineTo(w, h); g.closePath(); g.fill();
  g.fillStyle = win ? 'rgba(120,130,140,.35)' : 'rgba(90,80,50,.4)';
  for (let i = 0; i < 12; i++) { g.beginPath(); g.ellipse(rand(i) * w, h * (.72 + rand(i + 3) * .25), 30 + rand(i + 1) * 60, 10 + rand(i + 2) * 12, 0, 0, 7); g.fill(); }
  return { gy: h * .66 - Math.sin(.5 * 3.1) * h * .08 };
}

// ================= 分镜 =================
const SHOTS = [];
const S = (id, dur, draw, o = {}) => SHOTS.push(Object.assign({ id, dur, draw }, o));

// ---------- 前奏 ----------
S('01 黑场', 3, (c, t) => { c.fillStyle = '#000'; c.fillRect(0, 0, W, H); });

S('02 白色冰原', 8, (c, t, d, p) => wide(c, t, (g, w, h) => {
  const z = 1 + p * .05; g.translate(w / 2, h * .56); g.scale(z, z); g.translate(-w / 2, -h * .56);
  winterIce(g, w, h, t, { hy: .56, ridge: 8, rcol: 'rgba(165,176,188,.35)' });
  person(g, w * .5 + t * 2.2, h * .56 + 70, 24, walkPose(t * 3.4), { col: '#262a30' });
  snowDrift(g, w, h, t, { y0: h * .57, n: 260, a: .45, speed: 500 });
}, { vig: .15 }), { fin: 2 });

S('03 背影', 6, (c, t, d, p) => wide(c, t, (g, w, h) => {
  winterIce(g, w, h, t, { hy: .4, ridge: 10 });
  snowDrift(g, w, h, t, { y0: h * .45, n: 260, a: .35, speed: 520, seed: 4 });
  const fy = h * .9 - p * 50, fh = 480 - p * 60, fx = w * .54;
  const ph = t * 3.6;
  personBack(g, fx, fy, fh, ph, { col: '#23272d', armR: .04 });
  // 拖着的旧帆布包
  const bx = fx - fh * .12, by = h * .99, bs = .9 - p * .06;
  g.strokeStyle = '#3a342c'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(fx + fh * .15, fy - fh * .5); g.quadraticCurveTo(fx + fh * .2, by - 120, bx + 40 * bs, by - 50 * bs); g.stroke();
  g.fillStyle = '#5d5548';
  g.beginPath(); g.ellipse(bx, by - 30 * bs, 120 * bs, 55 * bs, -.08, 0, 7); g.fill();
  g.fillStyle = '#4b4439'; g.beginPath(); g.ellipse(bx - 40 * bs, by - 55 * bs, 60 * bs, 30 * bs, -.2, 0, 7); g.fill();
  g.fillStyle = 'rgba(240,245,248,.8)'; g.beginPath(); g.ellipse(bx + 10, by - 70 * bs, 70 * bs, 12 * bs, -.08, 0, 7); g.fill();
  snowDrift(g, w, h, t + 5, { y0: h * .8, n: 120, a: .5, speed: 700, seed: 9, len: 70 });
}));

S('04 擦开积雪', 5, (c, t, d, p) => wide(c, t, (g, w, h) => {
  g.drawImage(ICE_TOP, 0, -(H - h) / 2);
  if (!SNOWL) SNOWL = mkCanvas(W, WIDE_H);
  const s = SNOWL.getContext('2d');
  s.globalCompositeOperation = 'source-over'; s.clearRect(0, 0, W, WIDE_H);
  s.drawImage(SNOW_TEX, 0, 0, W, WIDE_H);
  // 擦拭路径：三道弧
  const path = u => { const k = Math.min(3.999, u * 4), i = Math.floor(k), f = ease(k - i); const dir = i % 2 ? -1 : 1;
    return [w * (.5 + (i - 1.5) * .02) + dir * (f - .5) * w * (.34 - i * .03), h * (.34 + i * .1) - Math.sin(f * Math.PI) * 50 + (noise1(u * 30, 4) - .5) * 30]; };
  const prog = clamp(t / 3.8);
  s.globalCompositeOperation = 'destination-out'; s.lineCap = 'round'; s.lineJoin = 'round';
  [[230, .35], [190, .6], [150, 1]].forEach(([lw, a]) => {
    s.strokeStyle = `rgba(0,0,0,${a})`; s.lineWidth = lw; s.beginPath();
    for (let u = 0; u <= prog; u += .004) { const q = path(u); u ? s.lineTo(q[0], q[1]) : s.moveTo(q[0], q[1]); }
    s.stroke();
  });
  s.globalCompositeOperation = 'source-over';
  g.drawImage(SNOWL, 0, 0);
  for (let i = 0; i < 160; i++) { // 被推开的雪屑
    const u = rand(i) * prog, q = path(u), a = rand(i * 3) * 7, r = 70 + rand(i * 5) * 50;
    g.fillStyle = `rgba(240,244,247,${.5 + rand(i * 7) * .4})`; g.beginPath(); g.ellipse(q[0] + Math.cos(a) * r, q[1] + Math.sin(a) * r * .8, 3 + rand(i) * 9, 2 + rand(i + 1) * 6, a, 0, 7); g.fill();
  }
  // 手套
  const q = path(prog), out = smooth(3.9, 5, t);
  const gx = q[0], gy = q[1] + out * 500;
  g.save(); g.translate(gx, gy); g.rotate(-.2 + Math.sin(t * 5) * .05);
  g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(18, 30, 105, 130, 0, 0, 7); g.fill();
  g.fillStyle = '#2b3036'; g.beginPath(); g.moveTo(-85, 90); g.lineTo(95, 90); g.lineTo(120, 520); g.lineTo(-110, 520); g.fill();
  g.fillStyle = '#5a5046'; g.beginPath(); g.roundRect(-95, 70, 200, 60, 26); g.fill();
  g.fillStyle = '#434a52'; g.beginPath(); g.ellipse(0, 0, 88, 110, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(-86, 40, 30, 58, -.55, 0, 7); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 3; g.beginPath(); g.moveTo(-60, 30); g.quadraticCurveTo(-70, 70, -50, 90); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = 4; g.beginPath(); g.ellipse(0, 0, 76, 98, 0, 3.7, 5.3); g.stroke();
  g.fillStyle = 'rgba(240,245,250,.75)';
  for (let i = 0; i < 14; i++) { g.beginPath(); g.ellipse((rand(i) - .5) * 120, -60 - rand(i + 2) * 40, 5 + rand(i + 1) * 8, 4, 0, 0, 7); g.fill(); }
  g.restore();
}, { tint: 'rgba(90,130,170,.2)' }));

S('05 冰中气泡', 3, (c, t, d, p) => wide(c, t, (g, w, h) => {
  const z = Math.pow(7, ease(p));
  g.save(); g.translate(w / 2, h / 2); g.scale(z, z); g.translate(-w / 2, -h / 2);
  g.drawImage(ICE_TOP, 0, -(H - h) / 2);
  g.restore();
  const r = 26 * z;
  g.fillStyle = 'rgba(230,242,248,.55)'; g.beginPath(); g.ellipse(w / 2, h / 2, r, r * .7, 0, 0, 7); g.fill();
  g.strokeStyle = 'rgba(200,225,238,.8)'; g.lineWidth = 2 + z; g.beginPath(); g.ellipse(w / 2, h / 2, r, r * .7, 0, 0, 7); g.stroke();
  const warm = smooth(.3, 1, p);
  g.globalCompositeOperation = 'screen';
  glow(g, w / 2 - r * .3, h / 2 - r * .25, r * (1 + warm * 6), mix([255, 255, 255], [255, 200, 140], warm), .8);
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = `rgba(255,228,192,${smooth(.72, 1, p)})`; g.fillRect(0, 0, w, h);
}, { vig: .2 }));

// ---------- 主歌一 ----------
S('06 水下·年轻的手', 5, (c, t, d, p) => film(c, t, 6, (g, w, h) => {
  vgrad(g, 0, 0, w, h, [[0, '#cfe9d8'], [.12, '#8cc3b4'], [.5, '#3b7a72'], [1, '#0f2f2d']]);
  g.globalCompositeOperation = 'screen';
  glow(g, w * .55, -60, 700, [255, 240, 200], .8);
  for (let i = 0; i < 7; i++) { // 光柱
    const x = w * (.1 + i * .14) + Math.sin(t * .6 + i) * 30;
    const lg = g.createLinearGradient(0, 0, 0, h); lg.addColorStop(0, 'rgba(255,245,210,.22)'); lg.addColorStop(1, 'rgba(255,245,210,0)');
    g.fillStyle = lg; g.beginPath(); g.moveTo(x - 30, 0); g.lineTo(x + 30, 0); g.lineTo(x + 180 + i * 10, h); g.lineTo(x + 40, h); g.fill();
  }
  g.globalAlpha = .5; g.drawImage(caustics(t * 1.2), 0, 0, w, h * .6); g.globalAlpha = 1;
  // 水面
  g.fillStyle = 'rgba(255,250,230,.5)';
  g.beginPath(); g.moveTo(0, 0); for (let x = 0; x <= w; x += 20) g.lineTo(x, h * .1 + Math.sin(x * .01 + t * 2) * 8 + Math.sin(x * .027 - t * 3) * 5); g.lineTo(w, 0); g.fill();
  g.globalCompositeOperation = 'source-over';
  // 手伸入水中
  const e = smooth(.8, 2.8, t), hy = lerp(-420, h * .3, e);
  g.globalAlpha = .92;
  hand(g, w * .5 + Math.sin(t * .8) * 10, hy, 1.45, Math.PI + Math.sin(t * .7) * .05, { skin: [150, 125, 105], spread: 1.2 });
  g.globalAlpha = 1;
  g.fillStyle = 'rgba(60,110,105,.25)'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) { // 气泡
    const life = ((t - 1) * .5 + rand(i)) % 1; if (t < 1 + rand(i) * 1.5) continue;
    const bx = w * .5 + (rand(i * 3) - .5) * 200 + Math.sin(t * 3 + i) * 8, by = hy + 250 - life * 500;
    g.strokeStyle = `rgba(230,250,245,${.7 * (1 - life)})`; g.lineWidth = 2;
    g.beginPath(); g.arc(bx, by, 3 + rand(i * 5) * 9, 0, 7); g.stroke();
  }
  for (let i = 0; i < 80; i++) { g.fillStyle = 'rgba(220,240,230,.3)'; g.fillRect((rand(i) * w + t * 6) % w, (rand(i + 9) * h - t * 10 + h) % h, 2, 2); }
}), { fin: .7, finCol: [255, 228, 192] });

S('07 绿皮车窗', 6, (c, t, d, p) => film(c, t, 7, (g, w, h) => {
  const [sx, sy] = shake(t * 3, 5, 2); g.translate(sx, sy);
  const wx = w * .1, wy = h * .14, ww = w * .8, wh = h * .56;
  // 窗外
  g.save(); g.beginPath(); g.roundRect(wx, wy, ww, wh, 26); g.clip();
  vgrad(g, wx, wy, ww, wh * .45, [[0, '#9cc4e0'], [1, '#e8eef0']]);
  const off = t * 60;
  g.save(); g.translate(-off * .2, 0); ridge(g, w * 2, wy + wh * .45, 70, 12, '#7c93a3', .6); g.restore();
  vgrad(g, wx, wy + wh * .45, ww, wh * .55, [[0, '#5d9ac2'], [1, '#2f6f98']]);
  g.globalCompositeOperation = 'screen';
  glints(g, wx, wx + ww, wy + wh * .46, wy + wh, t, 200, { col: [255, 245, 220], a: .7, drift: -40 });
  g.globalCompositeOperation = 'source-over';
  // 近处树木飞掠
  for (let i = 0; i < 22; i++) { // 近处的松树飞掠（带运动模糊）
    const x = ((rand(i) * w * 3 - t * 1100) % (w * 3) + w * 3) % (w * 3) - w * .5;
    const th = wh * (.25 + rand(i + 2) * .3), by = wy + wh + 10;
    for (let k = 0; k < 4; k++) {
      g.fillStyle = `rgba(30,48,34,${.22})`;
      g.beginPath(); g.moveTo(x + k * 14 - 40, by); g.lineTo(x + k * 14, by - th); g.lineTo(x + k * 14 + 40, by); g.fill();
    }
  }
  const pole = ((t * 1.3) % 1.7); if (pole < .12) { g.fillStyle = 'rgba(25,20,15,.85)'; g.fillRect(wx + ww * (1 - pole / .12), wy, 40, wh); }
  // 车窗倒影：两张脸
  g.globalCompositeOperation = 'multiply';
  g.globalAlpha = .22;
  profile(g, wx + ww * .2, wy + wh * .22 + Math.sin(t) * 2, 380, 'rgb(90,80,70)');
  g.save(); g.translate(wx + ww * .82, 0); g.scale(-1, 1); profile(g, 0, wy + wh * .26, 340, 'rgb(90,80,70)'); g.restore();
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  g.restore();
  // 车厢内
  g.fillStyle = '#34463a';
  g.beginPath(); g.rect(-20, -20, w + 40, h + 40); g.roundRect(wx, wy, ww, wh, 26); g.fill('evenodd');
  g.strokeStyle = '#1f2a23'; g.lineWidth = 16; g.beginPath(); g.roundRect(wx, wy, ww, wh, 26); g.stroke();
  // 窗帘
  g.fillStyle = 'rgba(245,238,225,.85)';
  g.beginPath(); g.moveTo(wx - 10, wy - 20); for (let y = 0; y <= wh + 40; y += 20) g.lineTo(wx + 90 + Math.sin(y * .05 + t * 2) * 12, wy - 20 + y); g.lineTo(wx - 10, wy + wh + 20); g.fill();
  // 小桌 + 铁杯托里的茶
  g.fillStyle = '#5a4332'; g.fillRect(wx + ww * .2, wy + wh + 30, ww * .6, 26);
  const gx = wx + ww * .62, gy = wy + wh + 30, jig = Math.sin(t * 40) * 1.2;
  g.fillStyle = 'rgba(200,110,40,.8)'; g.fillRect(gx - 26 + jig, gy - 110, 52, 90);
  g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(gx - 26 + jig, gy - 130, 52, 20);
  g.fillStyle = '#9a8d78'; g.beginPath(); g.moveTo(gx - 32, gy); g.lineTo(gx - 28, gy - 60); g.lineTo(gx + 28, gy - 60); g.lineTo(gx + 32, gy); g.fill();
  g.strokeStyle = '#9a8d78'; g.lineWidth = 7; g.beginPath(); g.arc(gx + 36, gy - 40, 18, -1.5, 1.5); g.stroke();
}));

S('08 她在前面跑', 6, (c, t, d, p) => film(c, t, 8, (g, w, h) => {
  const [sx, sy] = shake(t, 36, 5); g.translate(sx, sy);
  const hy = h * .56, sun = [w * .66, h * .42];
  vgrad(g, -40, -40, w + 80, hy + 42, [[0, '#d9a870'], [.6, '#f3d29a'], [1, '#fbe6bd']]);
  g.globalCompositeOperation = 'screen'; glow(g, sun[0], sun[1], 700, [255, 230, 170], 1); g.globalCompositeOperation = 'source-over';
  ridge(g, w + 40, hy, 30, 5, 'rgba(160,120,90,.5)', .6);
  g.fillStyle = '#f8e2b0'; g.fillRect(-20, hy - 6, w + 40, 12);
  vgrad(g, -40, hy, w + 80, h - hy + 40, [[0, '#c7a661'], [.4, '#8a8a3e'], [1, '#3b3f1c']]);
  // 她
  const run = smooth(0, 3.4, t) * (1 - smooth(3.2, 4, t));
  const x = w * lerp(.28, .56, smooth(0, 4, t)), y = hy + 170;
  const turned = t > 3.9;
  const pose = turned ? blendPose(POSES.stand, walkPose(0), 0) : walkPose(t * 9, 1.3 * run + .2);
  if (!turned) pose.torso = .2 * run;
  const hd = person(g, x, y, 330, pose, { kind: 'girl', col: '#2c2019', dir: turned ? -1 : 1, t, hair: turned ? .9 : .6 + run * .3 });
  // 逆光吃掉她的脸
  g.globalCompositeOperation = 'screen';
  glow(g, hd.head[0] + 20, hd.head[1], 260, [255, 225, 170], turned ? .9 : .45);
  glow(g, sun[0], sun[1], 180, [255, 250, 225], .9);
  g.globalCompositeOperation = 'source-over';
  // 前景草
  grass(g, w + 40, h * .76, h + 30, 700, t, { seed: 3, wind: .6, scale: 2.4, col: (d, i) => rgba(mix([240, 200, 120], [60, 55, 20], d * .85 + rand(i) * .15), .9) });
  g.globalCompositeOperation = 'screen';
  [[.2, 90, .2], [.35, 40, .3], [.5, 140, .12]].forEach(([u, r, a]) => { glow(g, lerp(sun[0], w * .2, u), lerp(sun[1], h * .8, u), r, [255, 200, 140], a); });
  g.globalCompositeOperation = 'source-over';
}));

// 系布条：布条绕柱一圈打结，两只手各攥一头往外拉，然后松开
function tieHands(g, w, h, t, o) {
  const px = o.px ?? w * .5, pw = o.pw ?? 150, ky = h * .52;
  const pull = o.pull, rel = o.rel, col = o.cols[0], col2 = o.cols[1];
  // 绕柱的一圈
  const lg = g.createLinearGradient(px - pw / 2, 0, px + pw / 2, 0);
  lg.addColorStop(0, rgba(mix(col, [0, 0, 0], .45), 1)); lg.addColorStop(.35, rgba(col, 1)); lg.addColorStop(1, rgba(mix(col, [0, 0, 0], .35), 1));
  g.fillStyle = lg; g.beginPath(); g.moveTo(px - pw / 2, ky - 26); g.quadraticCurveTo(px, ky - 16, px + pw / 2, ky - 26); g.lineTo(px + pw / 2, ky + 26); g.quadraticCurveTo(px, ky + 36, px - pw / 2, ky + 26); g.fill();
  const kx = px + pw / 2 + 10;
  const A = [kx + 330 + pull * 70, ky - 150 - pull * 30], B = [kx + 310 + pull * 60, ky + 170 + pull * 30];
  const free = smooth(0, .25, rel);
  // 两头：被攥着时绷直，松手后在风里飘
  if (free < 1) {
    g.globalAlpha = 1 - free;
    [[A, col], [B, col2]].forEach(([P, c], k) => {
      g.fillStyle = rgba(c, 1); g.beginPath();
      const nx = -(P[1] - ky), ny = P[0] - kx, nl = Math.hypot(nx, ny), hw = 18;
      g.moveTo(kx + nx / nl * hw, ky + ny / nl * hw); g.lineTo(P[0] + nx / nl * hw * .8, P[1] + ny / nl * hw * .8);
      g.lineTo(P[0] - nx / nl * hw * .8, P[1] - ny / nl * hw * .8); g.lineTo(kx - nx / nl * hw, ky - ny / nl * hw); g.fill();
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(kx, ky - 2 + (k ? 6 : -6), 3, 3);
    });
    g.globalAlpha = 1;
  }
  if (free > 0) {
    g.globalAlpha = free;
    ribbon(g, kx, ky - 8, 380, 38, rgba(col, 1), t, { wind: .75, ang: .12, ph: 0 });
    ribbon(g, kx, ky + 14, 350, 34, rgba(col2, 1), t, { wind: .7, ang: .28, ph: 2 });
    g.globalAlpha = 1;
  }
  g.fillStyle = rgba(mix(col, [0, 0, 0], .15), 1); g.beginPath(); g.ellipse(kx, ky + 2, 30, 30, 0, 0, 7); g.fill();
  g.fillStyle = rgba(mix(col, [255, 255, 255], .15), 1); g.beginPath(); g.ellipse(kx - 4, ky - 6, 14, 10, 0, 0, 7); g.fill();
  const out = ease(clamp(rel)) * 1100;
  fist(g, A[0] + out, A[1] - out * .35, o.sA ?? 1, -.45, { skin: o.skinA, age: o.age, sleeve: o.sleeveA });
  fist(g, B[0] + out, B[1] + out * .35, o.sB ?? .92, .5, { skin: o.skinB, age: o.age, sleeve: o.sleeveB });
}
S('09 系上两根蓝布条', 5, (c, t, d, p) => film(c, t, 9, (g, w, h) => {
  const [sx, sy] = shake(t, 14, 9); g.translate(sx, sy);
  vgrad(g, -30, -30, w + 60, h + 60, [[0, '#a9c8dc'], [.5, '#6e9cbb'], [1, '#3f6d86']]);
  g.globalCompositeOperation = 'screen';
  for (let i = 0; i < 26; i++) glow(g, rand(i) * w, h * (.3 + rand(i + 4) * .5), 40 + rand(i + 2) * 90, [255, 240, 210], .25 + rand(i + 3) * .3);
  g.globalCompositeOperation = 'source-over';
  pole(g, w * .36, -40, h + 40, 150, t, { fade: .75, n: 14, band: .35, len: 260, wid: 26 });
  const pull = smooth(1.2, 2.4, t), rel = smooth(3.4, 4.8, t);
  tieHands(g, w, h, t, { px: w * .36, pull, rel, cols: [[45, 95, 160], [58, 111, 174]], skinA: [170, 125, 95], skinB: [210, 165, 135], sleeveA: '#4d3f33', sleeveB: '#efe3cc', sA: 1.05, sB: .85 });
}));

S('10 冬夜月光·一个人', 9, (c, t, d, p) => wide(c, t, (g, w, h) => {
  const z = 1 + p * .04; g.translate(w * .32, h * .7); g.scale(z, z); g.translate(-w * .32, -h * .7);
  winterNight(g, w, h, t, { hy: .5, moon: [w * .32, h * .2, 26] });
  person(g, w * .32, h * .76, 64, POSES.sit, { col: '#070a10', dir: -1 });
  snowDrift(g, w, h, t, { y0: h * .52, n: 180, a: .18, speed: 260 });
}, { tint: 'rgba(60,90,140,.3)' }), { xin: .5 });

S('11 岸边生火', 9, (c, t, d, p) => wide(c, t, (g, w, h) => {
  winterNight(g, w, h, t, { hy: .42, moon: [w * .82, h * .14, 18] });
  stones(g, w, h * .6, h * 1.05, 70, 3, { col: [20, 24, 32], col2: [40, 46, 58], snow: .55 });
  const fx = w * .46, fy = h * .9;
  // 柴
  g.strokeStyle = '#1b140f'; g.lineWidth = 7; g.lineCap = 'round';
  [[-50, 8, 40, -30], [-30, -30, 50, 10], [-10, 5, 30, -45]].forEach(([a, b, cc, dd]) => { g.beginPath(); g.moveTo(fx + 200 + a, fy + b); g.lineTo(fx + 200 + cc, fy + dd); g.stroke(); });
  // 火柴：两次灭，第三次点着
  const strikes = [[1.6, .35], [3.4, .55]];
  let flash = 0; strikes.forEach(([s0, len]) => { if (t > s0 && t < s0 + len) flash = Math.max(flash, (1 - (t - s0) / len) * (0.7 + .3 * rand(Math.floor(t * 24)))); });
  const lit = smooth(5.6, 8, t), catchFlash = t > 5.6 && t < 6 ? 1 : 0;
  const hx = fx + 160, hy = fy - 70;
  const fireA = Math.max(lit, catchFlash * .6);
  // 人物边缘光
  const rim = Math.max(flash * .8, fireA * .8 * (0.85 + .15 * noise1(t * 7)));
  const pose = blendPose(POSES.crouch, POSES.crouch, 0);
  pose.armF = .95 + Math.sin(t * 2) * .03; pose.elbF = .15;
  if (rim > .02) { g.globalAlpha = rim; person(g, fx + 5, fy, 430, pose, { col: '#ff8a3d', dir: 1 }); g.globalAlpha = 1; }
  person(g, fx, fy, 430, pose, { col: '#06080d', dir: 1 });
  g.save(); g.globalCompositeOperation = 'lighter';
  if (flash > 0) { glow(g, hx, hy, 260, [255, 170, 80], flash * .8); glow(g, hx, hy, 30, [255, 240, 200], flash); }
  g.restore();
  if (fireA > 0) fire(g, fx + 200, fy - 10, 40 * (.3 + .7 * lit), t, { a: fireA, wind: .3, sparks: 6 });
  snowDrift(g, w, h, t, { y0: h * .45, n: 200, a: .25, speed: 420, seed: 7 });
}, { tint: 'rgba(60,90,140,.25)' }));

// 老人的侧脸
const PROFILE = [[.20, .08], [.52, .02], [.70, .10], [.745, .20], [.73, .24], [.745, .31], [.765, .36], [.752, .395], [.80, .45], [.855, .505], [.82, .525], [.785, .535], [.795, .565], [.782, .585], [.79, .61], [.775, .635], [.77, .67], [.735, .72], [.68, .745], [.64, .76], [.62, .82], [.70, .9], [.86, 1.05], [.0, 1.1], [.05, .82], [.24, .72], [.2, .5], [.17, .28]];
function profile(g, x, y, s, col) {
  g.fillStyle = col; g.beginPath(); curveThrough(g, PROFILE.map(([u, v]) => [x + u * s, y + v * s])); g.fill();
}
S('12 火光中的脸', 6, (c, t, d, p) => {
  const fl = t > 3.8 && t < 4.35;
  if (fl) return film(c, t, 12, (g, w, h) => {
    vgrad(g, 0, 0, w, h, [[0, '#0d0a14'], [1, '#1d1210']]);
    fire(g, w * .66, h * .78, 110, t, { sparks: 24 });
    const sit = Object.assign({}, POSES.sit); sit.torso = .1; sit.head = .1;
    person(g, w * .42, h * .86, 420, sit, { col: '#0b0705', kind: 'boy', dir: 1 });
    const sg = Object.assign({}, POSES.sit); sg.torso = .42; sg.head = .35;
    person(g, w * .33, h * .86, 390, sg, { col: '#0b0705', kind: 'girl', dir: 1, t, hair: .1 });
  });
  wide(c, t, (g, w, h) => {
    vgrad(g, 0, 0, w, h, [[0, '#070b16'], [1, '#141b2c']]);
    g.globalCompositeOperation = 'screen';
    for (let i = 0; i < 24; i++) { // 失焦的雪，被火照亮
      const x = (rand(i) * w + t * 30 * (1 + rand(i + 1))) % w, y = (rand(i + 5) * h + t * 20) % h;
      glow(g, x, y, 20 + rand(i + 3) * 40, rand(i) > .5 ? [255, 170, 90] : [150, 170, 210], .25);
    }
    const f = .85 + .15 * noise1(t * 9, 3);
    glow(g, w * 1.05, h * .7, 900, [255, 110, 40], .35 * f);
    g.globalCompositeOperation = 'source-over';
    const s = 760, x = w * .2, y = h * .06 + Math.sin(t * .4) * 4;
    g.globalAlpha = f; profile(g, x + 7, y, s, '#ff9b52'); g.globalAlpha = 1;
    profile(g, x, y + 1, s, '#07090e');
    g.globalCompositeOperation = 'screen';
    glow(g, x + .66 * s, y + .395 * s, 8, [255, 190, 120], .7 * f);
    // 呵出的白气
    for (let i = 0; i < 3; i++) {
      const ph = (t * .5 + i / 3) % 1;
      glow(g, x + .82 * s + ph * 180, y + .6 * s - ph * 90, 40 + ph * 120, [255, 200, 160], .18 * Math.sin(ph * Math.PI));
    }
    g.globalCompositeOperation = 'source-over';
  }, { tint: 'rgba(80,90,120,.2)' });
});

// ---------- 主歌二 ----------
S('13 火苗化作云', 5, (c, t, d, p) => wide(c, t, (g, w, h) => {
  summerLake(g, w, h, t, { cloudSpeed: 160, hy: .5 });
  // 云影掠过湖面
  g.fillStyle = 'rgba(10,40,70,.25)';
  for (let i = 0; i < 5; i++) { const x = ((rand(i) * w * 1.5 - t * 220) % (w * 1.5) + w * 1.5) % (w * 1.5) - w * .25; g.beginPath(); g.ellipse(x, h * (.6 + rand(i + 1) * .35), 260, 40, 0, 0, 7); g.fill(); }
  const k = 1 - smooth(0, 1.4, t);
  if (k > 0) { g.fillStyle = `rgba(8,10,16,${k})`; g.fillRect(0, 0, w, h);
    g.save(); g.globalCompositeOperation = 'lighter'; glow(g, w * .5, h * .6, 700 + (1 - k) * 600, [255, 140, 60], k * k * .9); glow(g, w * .5, h * .7, 250, [255, 220, 150], k * k * .8); g.restore(); }
}, { tint: 'rgba(120,150,170,.15)' }));

S('14 她下了小巴', 6, (c, t, d, p) => wide(c, t, (g, w, h) => {
  const hy = h * .42;
  vgrad(g, 0, 0, w, hy + 2, [[0, '#7eaad2'], [1, '#dde8ee']]);
  cloud(g, w * .2, hy * .5, 130, 3, [255, 255, 255], .85); cloud(g, w * .8, hy * .35, 90, 5, [255, 255, 255], .8);
  ridge(g, w, hy, 40, 11, '#8898a4', .5);
  g.fillStyle = '#4f8fbd'; g.fillRect(0, hy - 2, w, 16);
  g.fillStyle = '#b5ad7a'; g.beginPath(); g.moveTo(0, h); g.lineTo(0, hy + 14);
  for (let x = 0; x <= w; x += 30) g.lineTo(x, hy + 14 + Math.sin(x / w * 5) * 16 + 40 * (x / w)); g.lineTo(w, h); g.fill();
  vgrad(g, 0, hy + 60, w, h, [[0, 'rgba(160,150,90,0)'], [1, 'rgba(110,105,60,.6)']]);
  // 土路
  const ry = h * .74;
  g.fillStyle = '#c9b48f'; g.beginPath(); g.moveTo(0, ry - 20); g.quadraticCurveTo(w * .5, ry - 50, w, ry - 10); g.lineTo(w, ry + 40); g.quadraticCurveTo(w * .5, ry + 10, 0, ry + 30); g.fill();
  const roadY = x => ry + 5 - Math.sin(x / w * Math.PI) * 30;
  // 小巴
  const stopX = w * .44;
  let bx;
  if (t < 2.2) bx = lerp(-300, stopX, 1 - Math.pow(1 - t / 2.2, 2));
  else if (t < 4.3) bx = stopX;
  else bx = stopX + Math.pow(t - 4.3, 2) * 260;
  const moving = t < 2.2 || t > 4.3;
  dust(g, bx - 110, roadY(bx), t, moving ? 1 : smooth(2.2, 2, t) + .2, 3);
  bus(g, bx, roadY(bx) - 16, 1.1, t, { door: smooth(2.4, 2.8, t) * (1 - smooth(3.9, 4.2, t)), speed: moving ? 60 : 0 });
  // 她
  if (t > 2.9) {
    const wx = stopX - 20 + smooth(2.9, 4, t) * 50;
    const walking = t < 4 ? 1 : 0;
    person(g, wx, roadY(wx) + 26, 118, walking ? walkPose(t * 5, .8) : POSES.stand, { kind: 'woman', col: '#3a342f', dir: 1 });
  }
  grass(g, w, h * .82, h + 20, 500, t, { seed: 5, wind: .35, scale: 1, col: (d, i) => rgba(mix([200, 190, 130], [90, 95, 50], d), .9) });
}, { tint: 'rgba(130,150,160,.12)' }));

const shoreY = (x, w, h) => x < w * .55 ? lerp(h * .74, h * .8, x / (w * .55)) : h * .8 + Math.pow((x - w * .55) / (w * .45), 1.4) * h * .5;
function summerShore(g, w, h, t, o = {}) {
  const hy = h * .3;
  vgrad(g, 0, 0, w, hy + 2, [[0, '#86b2d6'], [1, '#e1ebef']]);
  ridge(g, w, hy, 70, 17, '#7e8d9c', .5);
  vgrad(g, 0, hy, w, h - hy, [[0, '#5a97c0'], [.5, '#2e729f'], [1, '#205a80']]);
  g.save(); g.globalCompositeOperation = 'screen';
  glints(g, 0, w, hy, h, t, 420, { col: [235, 245, 255], a: .6 + (o.windy || 0) * .3, seed: 5, drift: 6 + (o.windy || 0) * 30 });
  g.restore();
  // 岸
  g.fillStyle = '#8e8676';
  g.beginPath(); g.moveTo(0, h); g.lineTo(0, shoreY(0, w, h));
  for (let x = 0; x <= w; x += 10) g.lineTo(x, shoreY(x, w, h) + Math.sin(x * .05 + t * 2) * 2);
  g.lineTo(w, h); g.closePath(); g.fill();
  g.save(); g.clip();
  stones(g, w, h * .74, h * 1.05, 220, 8, { col: [110, 104, 92], col2: [170, 165, 150], light: [255, 250, 235] });
  g.restore();
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3;
  g.beginPath(); for (let x = 0; x <= w; x += 10) { const y = shoreY(x, w, h) - 3 + Math.sin(x * .03 - t * 2.4) * 3; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
}
S('15 她捧起湖水', 6, (c, t, d, p) => wide(c, t, (g, w, h) => {
  summerShore(g, w, h, t);
  const x = lerp(w * .3, w * .54, smooth(0, 1.6, t));
  const y = shoreY(x, w, h) + 4;
  const cr = smooth(1.5, 2.8, t), lift = smooth(4, 5.3, t);
  let pose = t < 1.6 ? walkPose(t * 5.5, .8) : blendPose(POSES.stand, POSES.crouch, cr);
  if (t > 2.8) { pose = Object.assign({}, POSES.crouch); pose.armF = lerp(.95, .5, lift); pose.armB = lerp(.85, .45, lift); pose.elbF = lerp(.2, 1.3, lift); pose.elbB = lerp(.3, 1.3, lift); pose.head = lerp(.25, .5, lift); }
  const r = person(g, x, y, 380, pose, { kind: 'woman', col: '#4a4039', colB: '#3b332d', dir: 1 });
  if (t > 3) { // 涟漪
    for (let i = 0; i < 4; i++) {
      const a = (t - 3 - i * .5); if (a < 0) continue;
      g.strokeStyle = `rgba(255,255,255,${.5 * Math.max(0, 1 - a / 2.5)})`; g.lineWidth = 2;
      g.beginPath(); g.ellipse(w * .6, h * .84, 30 + a * 90, 8 + a * 22, 0, 0, 7); g.stroke();
    }
  }
  if (lift > .1) { // 水从指缝滴落
    for (let i = 0; i < 6; i++) { const ph = (t * 1.6 + i / 6) % 1; g.fillStyle = `rgba(230,245,255,${.8 * (1 - ph)})`; g.beginPath(); g.arc(r.hand[0] + (rand(i) - .5) * 20, r.hand[1] + ph * 90, 3, 0, 7); g.fill(); }
  }
}, { tint: 'rgba(130,150,165,.12)' }));

// 湖底（夏）
let SEABED = null;
function seabed() {
  if (SEABED) return SEABED;
  const c = mkCanvas(W, H), g = c.getContext('2d'), r = mulberry(77);
  vgrad(g, 0, 0, W, H, [[0, '#5c8f84'], [1, '#3d6e68']]);
  for (let i = 0; i < 260; i++) {
    const x = r() * W, y = r() * H, s = 20 + r() * 70;
    g.fillStyle = rgba(mix([90, 120, 105], [170, 175, 150], r()), .9);
    g.beginPath(); g.ellipse(x, y, s, s * (.6 + r() * .3), r() * 3, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,240,.12)'; g.beginPath(); g.ellipse(x - s * .2, y - s * .2, s * .5, s * .25, 0, 0, 7); g.fill();
  }
  SEABED = c; return c;
}
S('16 冰上的手·水里的手', 5, (c, t, d, p) => wide(c, t, (g, w, h) => {
  const ice = t < 2.2 || t > 4.4;
  const hx = w * .5, hy = h * .56;
  if (ice) {
    g.drawImage(ICE_TOP, -200, -(H - h) / 2 - 80, W * 1.2, H * 1.2);
    const sg = g.createRadialGradient(hx, hy, h * .45, hx, hy, h * .85);
    sg.addColorStop(0, 'rgba(235,240,244,0)'); sg.addColorStop(.35, 'rgba(235,240,244,.75)'); sg.addColorStop(1, 'rgba(235,240,244,.95)');
    g.save(); g.translate(hx, hy); g.scale(1.6, 1); g.translate(-hx, -hy); g.fillStyle = sg; g.fillRect(-w, -h, w * 3, h * 3); g.restore();
    hand(g, hx, hy, 1.35, 0, { skin: [184, 150, 132], age: true, sleeve: '#2c3138' });
    g.globalCompositeOperation = 'screen'; glow(g, hx, hy - 60, 260, [200, 225, 240], .12); g.globalCompositeOperation = 'source-over';
  } else {
    const u = t - 2.2;
    g.drawImage(seabed(), 0, -(H - h) / 2);
    g.globalCompositeOperation = 'screen'; g.globalAlpha = .45; g.drawImage(caustics(t * 1.4, 1.4), 0, 0, w, h); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    const wob = Math.sin(u * 3) * .015;
    g.save(); g.translate(hx, hy); g.scale(1 + wob, 1 - wob); g.translate(-hx, -hy);
    hand(g, hx, hy, 1.28, Math.sin(u * 2) * .02, { skin: [196, 158, 138], sleeve: '#cbbfa6' });
    g.restore();
    g.fillStyle = 'rgba(40,110,120,.22)'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5; i++) { const a = (u * .8 + i / 5) % 1; g.strokeStyle = `rgba(255,255,255,${.35 * (1 - a)})`; g.lineWidth = 3; g.beginPath(); g.ellipse(hx, hy + 200, 120 + a * 500, 40 + a * 160, 0, 0, 7); g.stroke(); }
  }
}, { tint: 'rgba(110,140,160,.18)' }));

S('17 站台·谁走谁留', 6, (c, t, d, p) => film(c, t, 17, (g, w, h) => {
  const { ty, py } = platform(g, w, h, t, 'dusk');
  const off = Math.pow(Math.max(0, t - .6), 2) * 130;
  for (let k = 0; k < 4; k++) {
    const x = w * .05 - off + k * 760 - 400;
    if (x > w + 50 || x + 740 < -50) continue;
    trainCar(g, x, ty - h * .2, 740, h * .24, t, { body: '#34503f', stripe: '#d6b35e', windows: 9, lit: i => .75 + .2 * rand(i + k * 9), who: i => k === 1 && i === 4 });
  }
  person(g, w * .62, h * .95, 360, POSES.stand, { kind: 'boy', col: '#1a1210', dir: -1 });
  vgrad(g, 0, h * .8, w, h * .2, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(20,10,5,.4)']]);
}));

S('18 同一个站台', 6, (c, t, d, p) => wide(c, t, (g, w, h) => {
  if (t < 3) {
    platform(g, w, h, t, 'winter');
    person(g, w * .38, h * .96, 300, POSES.stand, { col: '#23272d', dir: 1 });
    g.fillStyle = '#5d5548'; g.beginPath(); g.ellipse(w * .38 - 60, h * .94, 50, 26, 0, 0, 7); g.fill();
    snowFall(g, w, h, t, { n: 200, a: .7, wind: 40 });
  } else {
    platform(g, w, h, t, 'summer');
    const bx = w * .38;
    g.fillStyle = '#6b4f37'; g.fillRect(bx - 150, h * .8, 300, 16); g.fillRect(bx - 140, h * .8, 10, 100); g.fillRect(bx + 130, h * .8, 10, 100);
    g.fillRect(bx - 150, h * .72, 300, 12);
    const bp = { hip: [0, -.37], torso: 0, head: .06, thighF: 1.52, thighB: 1.45, kneeF: 1.52, kneeB: 1.4, armF: .5, armB: .4, elbF: .9, elbB: .9 };
    person(g, bx, h * .96, 300, bp, { kind: 'woman', col: '#4a4039', dir: 1 });
  }
}, { tint: 'rgba(120,140,160,.15)' }));

// ---------- 副歌一 ----------
// 影子：月光把人拉得很长
function longShadow(g, x, y, len, kind, t, o = {}) {
  const b = buf2(), s = b.getContext('2d');
  s.clearRect(0, 0, W, H);
  s.save(); s.translate(x, y); s.transform(1, 0, o.skew || 0, 1, 0, 0); s.scale(2.1, -len / 300);
  personBack(s, 0, 0, 300, Math.sin(t * .8) * .15, { kind: kind === 'girl' ? 'woman' : kind === 'boy' ? 'man' : kind, col: '#000' });
  if (kind === 'girl') { s.fillStyle = '#000'; s.beginPath(); s.ellipse(0, -.86 * 300, 24, 40, 0, 0, 7); s.fill(); }
  s.restore();
  g.save(); g.globalAlpha = o.a ?? .55; g.filter = 'blur(5px)'; g.drawImage(b, 0, 0); g.restore();
}
function topGround(g, w, h, t, seed, base, c1, c2, n = 2600) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  const r = mulberry(seed);
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h, a = r() * 7 + Math.sin(t * .8 + x * .01) * .1, l = 6 + r() * 16;
    g.strokeStyle = rgba(mix(c1, c2, r()), .5); g.lineWidth = 1 + r() * 1.5;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
}
S('19 两个影子·各自一个影子', 8, (c, t, d, p) => {
  const drawA = (cc, tt) => film(cc, tt, 19, (g, w, h) => {
    topGround(g, w, h, tt, 19, '#34443f', [70, 95, 85], [150, 175, 165]);
    longShadow(g, w * .36, -10, 900, 'boy', tt, { skew: .05, a: .6 });
    longShadow(g, w * .64, -10, 850, 'girl', tt, { skew: -.07, a: .6 });
      }, { warm: 'rgba(210,180,130,.35)' });
  const drawB = (cc, tt) => wide(cc, tt, (g, w, h) => {
    vgrad(g, 0, 0, w, h, [[0, '#6d7f9c'], [1, '#5a6b88']]);
    g.globalAlpha = .35; g.drawImage(SNOW_TEX, 0, 0, w, h); g.globalAlpha = 1; g.fillStyle = 'rgba(40,60,100,.45)'; g.fillRect(0, 0, w, h);
    longShadow(g, w * .4, -10, 760, 'man', tt, { skew: .05, a: .6 });
  }, { tint: 'rgba(60,90,140,.35)' });
  const drawC = (cc, tt) => wide(cc, tt, (g, w, h) => {
    vgrad(g, 0, 0, w, h, [[0, '#46504a'], [1, '#353d38']]);
    stones(g, w, -20, h + 40, 260, 21, { col: [70, 75, 72], col2: [120, 125, 118] });
    g.fillStyle = 'rgba(20,30,50,.35)'; g.fillRect(0, 0, w, h);
    longShadow(g, w * .6, -10, 720, 'woman', tt, { skew: -.07, a: .6 });
  }, { tint: 'rgba(70,90,130,.3)' });
  const B = buf(), bg = B.getContext('2d');
  const seg = [[0, 3.2, drawA], [3.2, 5.5, drawB], [5.5, 8, drawC]];
  let i = seg.findIndex(s => t < s[1]); if (i < 0) i = 2;
  seg[i][2](c, t);
  const xf = .9;
  if (i > 0 && t < seg[i][0] + xf) { seg[i - 1][2](bg, t); c.globalAlpha = 1 - (t - seg[i][0]) / xf; c.drawImage(B, 0, 0); c.globalAlpha = 1; }
});

// 俯瞰冰面（无人机升起）
let CRACKS = null;
function initCracks() {
  const r = mulberry(5); CRACKS = [];
  for (let L = 0; L < 4; L++) {
    const n = 26, seg = 6 * Math.pow(3.2, L), R = 160 * Math.pow(3.4, L);
    for (let k = 0; k < n; k++) {
      let x = (r() - .5) * 2 * R, y = (r() - .5) * 2 * R, a = r() * 7; const pts = [[x, y]];
      for (let j = 0; j < 30; j++) { a += (r() - .5) * .7; x += Math.cos(a) * seg; y += Math.sin(a) * seg; pts.push([x, y]); }
      CRACKS.push({ L, pts, a: .25 + r() * .4 });
    }
  }
}
S('20 被月光吞没', 10, (c, t, d, p) => wide(c, t, (g, w, h) => {
  if (!CRACKS) initCracks();
  const z = 1.4 * Math.pow(.006, ease(p) * .9 + p * .1);
  g.fillStyle = '#0f1b2e'; g.fillRect(0, 0, w, h);
  g.save(); g.translate(w / 2, h / 2);
  const mg = g.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  mg.addColorStop(0, 'rgba(120,150,200,.12)'); mg.addColorStop(.5, 'rgba(160,190,230,.2)'); mg.addColorStop(1, 'rgba(120,150,200,.05)');
  g.fillStyle = mg; g.fillRect(-w / 2, -h / 2, w, h);
  g.scale(z, z);
  g.lineCap = 'round';
  for (const cr of CRACKS) {
    const pxw = Math.pow(3.2, cr.L) * z; if (pxw < .15) continue;
    g.strokeStyle = `rgba(190,215,240,${cr.a * clamp(pxw * 2) })`; g.lineWidth = Math.min(3, .6 + pxw) / z;
    g.beginPath(); cr.pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke();
  }
  // 雪斑
  for (let i = 0; i < 60; i++) { const R = 200 * Math.pow(3.4, i % 4); g.fillStyle = 'rgba(200,215,235,.06)'; g.beginPath(); g.ellipse((rand(i) - .5) * 2 * R, (rand(i + 1) - .5) * 2 * R, R * .3 * rand(i + 2) + 20, R * .1 * rand(i + 3) + 10, rand(i) * 3, 0, 7); g.fill(); }
  const dim = 1 - smooth(.7, 1, p);
  // 人与长影（俯视）
  g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.ellipse(-60, 110, 22, 120, -.3, 0, 7); g.fill();
  g.fillStyle = '#05070b'; g.beginPath(); g.ellipse(-40, 10, 26, 16, 0, 0, 7); g.fill(); g.beginPath(); g.arc(-40, 8, 10, 0, 7); g.fill();
  g.restore();
  const fs = Math.max(2.5, 30 * z);
  g.save(); g.globalCompositeOperation = 'lighter';
  glow(g, w / 2, h / 2, Math.max(40, 260 * z), [255, 120, 40], .5 * dim);
  glow(g, w / 2, h / 2, fs, [255, 200, 120], dim);
  g.restore();
  const dark = smooth(.35, 1, p);
  const vg = g.createRadialGradient(w / 2, h / 2, lerp(w * .6, 30, dark), w / 2, h / 2, lerp(w * .9, w * .4, dark));
  vg.addColorStop(0, 'rgba(4,8,16,0)'); vg.addColorStop(1, `rgba(4,8,16,${dark})`);
  g.fillStyle = vg; g.fillRect(0, 0, w, h);
  g.fillStyle = `rgba(150,175,220,${.08 * dark})`; g.fillRect(0, 0, w, h);
}, { tint: 'rgba(60,90,140,.3)' }));

// 分屏：左冬右夏，中间的缝慢慢合拢
function poleScene(g, w, h, t, season, who) {
  const { gy } = headland(g, w, h, t, season);
  const px = w * .5;
  pole(g, px, gy - h * .66, gy + 20, 30, t, { fade: season === 'winter' ? .7 : .5, frost: season === 'winter' ? .6 : 0, n: 22, band: .5, len: 110, wid: 12, wind: season === 'winter' ? .9 : .6 });
  if (who === 'him') person(g, px - 260, gy + 30, 380, POSES.stand, { col: '#23272d', dir: 1 });
  if (who === 'her') person(g, px + 260, gy + 30, 360, POSES.stand, { kind: 'woman', col: '#4a4039', dir: -1 });
  if (season === 'winter') snowFall(g, w, h, t, { n: 220, a: .8, wind: 70 });
}
S('21 分屏·一根柱子之隔', 12, (c, t, d, p) => wide(c, t, (g, w, h) => {
  const gap = lerp(220, 7, ease(clamp(t / 11.8)));
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  g.save(); g.beginPath(); g.rect(0, 0, w / 2 - gap / 2, h); g.clip(); g.translate(-gap / 2, 0); poleScene(g, w, h, t, 'winter', 'him'); g.restore();
  g.save(); g.beginPath(); g.rect(w / 2 + gap / 2, 0, w / 2, h); g.clip(); g.translate(gap / 2, 0); poleScene(g, w, h, t, 'summer', 'her'); g.restore();
}, { tint: 'rgba(120,140,160,.15)' }));

S('22 沿着湖岸跑远', 10, (c, t, d, p) => film(c, t, 22, (g, w, h) => {
  const [sx, sy] = shake(t, 24, 22); g.translate(sx, sy);
  const hy = h * .42, sun = [w * .62, h * .36];
  vgrad(g, -40, -40, w + 80, hy + 42, [[0, '#b8747a'], [.5, '#e9a066'], [1, '#fbd28f']]);
  g.globalCompositeOperation = 'screen'; glow(g, sun[0], sun[1], 600, [255, 210, 140], 1); glow(g, sun[0], sun[1], 70, [255, 250, 220], 1); g.globalCompositeOperation = 'source-over';
  ridge(g, w + 40, hy, 50, 8, '#8b5d62', .6);
  vgrad(g, -40, hy, w + 80, h, [[0, '#e3a36b'], [.3, '#9a6a6a'], [1, '#3e3040']]);
  g.globalCompositeOperation = 'screen';
  glints(g, -40, w + 40, hy + 2, h * .8, t, 500, { focus: sun[0], spread: 120, col: [255, 225, 160], a: .9, seed: 22 });
  g.globalCompositeOperation = 'source-over';
  // 岸线
  g.fillStyle = '#3a2a24';
  g.beginPath(); g.moveTo(-40, h + 40); g.lineTo(-40, h * .7);
  g.quadraticCurveTo(w * .4, h * .6, w * .75, hy + 30); g.lineTo(w + 40, hy + 26); g.lineTo(w + 40, h + 40); g.fill();
  g.strokeStyle = 'rgba(255,220,170,.6)'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(-40, h * .7 - 4 + Math.sin(t * 2) * 3); g.quadraticCurveTo(w * .4, h * .6 - 4, w * .75, hy + 27); g.stroke();
  // 两个人牵着手跑远
  const q = ease(clamp(t / 10)), path = u => [lerp(w * .2, w * .72, u), lerp(h * .9, hy + 40, Math.pow(u, .75))];
  const [x, y] = path(q), sc = lerp(420, 70, Math.pow(q, .6));
  const girl = person(g, x + sc * .45, y - sc * .03, sc * .95, walkPose(t * 8.5 + 1.2, 1.2), { kind: 'girl', col: '#1f1512', dir: 1, t, hair: .9 });
  const boy = person(g, x, y, sc, walkPose(t * 8.5, 1.2), { kind: 'boy', col: '#1a1210', dir: 1 });
  g.strokeStyle = '#1c1311'; g.lineWidth = sc * .045; g.lineCap = 'round';
  g.beginPath(); g.moveTo(boy.hand[0], boy.hand[1]); g.quadraticCurveTo((boy.hand[0] + girl.handB[0]) / 2, Math.max(boy.hand[1], girl.handB[1]) + sc * .03, girl.handB[0], girl.handB[1]); g.stroke();
  grass(g, w + 40, h * .8, h + 40, 400, t, { seed: 22, wind: .5, scale: 2, col: (d, i) => rgba(mix([220, 150, 100], [40, 25, 25], d), .95) });
}, { warm: 'rgba(255,140,60,.5)' }));

// ---------- 间奏 ----------
S('23 冰层轰鸣·他抬头', 8, (c, t, d, p) => wide(c, t, (g, w, h) => {
  const boom = t > 2.5 ? Math.exp(-(t - 2.5) * 3) : 0;
  g.translate((rand(Math.floor(t * 24)) - .5) * 14 * boom, (rand(Math.floor(t * 24) + 7) - .5) * 10 * boom);
  winterIce(g, w, h, t, { hy: .46 });
  // 冰裂纹在冰面上奔跑
  const cp = smooth(2.5, 3.3, t);
  if (cp > 0) {
    g.strokeStyle = 'rgba(120,150,175,.8)'; g.lineWidth = 2; g.beginPath();
    for (let x = w; x >= w * (1 - cp * 1.1); x -= 9) { const y = h * .6 + (w - x) * .03 + (rand(Math.floor(x / 9)) - .5) * 7 + (noise1(x * .01, 3) - .5) * 30; x === w ? g.moveTo(x, y) : g.lineTo(x, y); }
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1; g.stroke();
  }
  const pose = Object.assign({}, POSES.stand); pose.head = lerp(.35, -.35, smooth(3, 4.2, t)); pose.torso = lerp(.12, -.04, smooth(3, 4.2, t));
  person(g, w * .38, h * .9, 420, pose, { col: '#23272d', dir: 1 });
  snowDrift(g, w, h, t, { y0: h * .5, n: 220, a: .35, speed: 480 });
}));

S('24 起风了·她抬头', 7, (c, t, d, p) => wide(c, t, (g, w, h) => {
  const windy = smooth(1.5, 3, t);
  summerLake(g, w, h, t, { hy: .46, cloudSpeed: 10 + windy * 30 });
  g.fillStyle = '#9f9b6a'; g.beginPath(); g.moveTo(0, h); g.lineTo(0, h * .72); g.quadraticCurveTo(w * .5, h * .66, w, h * .74); g.lineTo(w, h); g.fill();
  const pose = Object.assign({}, POSES.stand); pose.head = lerp(.35, -.35, smooth(3, 4.2, t)); pose.torso = lerp(.12, -.04, smooth(3, 4.2, t));
  person(g, w * .62, h * .9, 420, pose, { kind: 'woman', col: '#4a4039', dir: -1, flutter: windy * Math.sin(t * 9) });
  grass(g, w, h * .7, h + 30, 700, t, { seed: 24, wind: .2 + windy * .9, lean: windy * .8, speed: .8 + windy * 1.5, scale: 1.3, col: (d, i) => rgba(mix([190, 185, 120], [80, 90, 40], d), .95) });
}, { tint: 'rgba(130,150,165,.12)' }));

function tieClose(g, w, h, t, season) {
  const win = season === 'winter';
  vgrad(g, 0, 0, w, h, win ? [[0, '#c8d0d6'], [1, '#e2e6e8']] : [[0, '#8fb6d4'], [1, '#d8e6ec']]);
  g.globalCompositeOperation = 'screen';
  for (let i = 0; i < 16; i++) glow(g, rand(i + 50) * w, h * (.4 + rand(i + 54) * .5), 60 + rand(i + 52) * 100, win ? [255, 255, 255] : [255, 245, 215], .3);
  g.globalCompositeOperation = 'source-over';
  pole(g, w * .34, -40, h + 40, 170, t, { fade: win ? .8 : .6, frost: win ? .7 : 0, n: 16, band: .38, len: 320, wid: 30, wind: win ? .9 : .6 });
  const pull = smooth(1, 2.8, t), rel = smooth(5.5, 7.5, t);
  tieHands(g, w, h, t, win
    ? { px: w * .34, pw: 170, pull, rel, cols: [[109, 143, 176], [109, 143, 176]], skinA: [182, 140, 120], skinB: [182, 140, 120], age: true, sleeveA: '#2c3138', sleeveB: '#2c3138' }
    : { px: w * .34, pw: 170, pull, rel, cols: [[58, 112, 176], [58, 112, 176]], skinA: [200, 160, 140], skinB: [200, 160, 140], age: true, sleeveA: '#b9ab8e', sleeveB: '#b9ab8e', sA: .92, sB: .85 });
  if (win) snowFall(g, w, h, t, { n: 320, a: .9, wind: 90, size: 5, speed: 110 });
}
S('25 他系上一根褪色的蓝布条', 12, (c, t, d, p) => wide(c, t, (g, w, h) => {
  if (t < 3.5) { poleScene(g, w, h, t, 'winter', 'him'); return; }
  tieClose(g, w, h, t - 3.5, 'winter');
}, { tint: 'rgba(110,140,170,.2)' }));
S('26 她也系上一根', 10, (c, t, d, p) => wide(c, t, (g, w, h) => {
  if (t < 3) { poleScene(g, w, h, t, 'summer', 'her'); return; }
  tieClose(g, w, h, t - 3, 'summer');
}, { tint: 'rgba(130,150,165,.12)' }));

// ---------- 副歌二：各自离开 ----------
const SUB27 = [
  [4, (c, t) => wide(c, t, (g, w, h) => { winterIce(g, w, h, t, { hy: .45 }); personBack(g, w * .5, h * .9 - t * 8, 300 - t * 10, t * 3.4, { col: '#23272d' }); snowDrift(g, w, h, t, { y0: h * .5, n: 220, a: .4, speed: 520 }); })],
  [4, (c, t) => wide(c, t, (g, w, h) => {
    vgrad(g, 0, 0, w, h * .45, [[0, '#7eaad2'], [1, '#dde8ee']]); g.fillStyle = '#b5ad7a'; g.fillRect(0, h * .45, w, h);
    g.fillStyle = '#c9b48f'; g.fillRect(0, h * .78, w, 60);
    const door = 1 - smooth(2.4, 3, t);
    bus(g, w * .5, h * .82, 3.2, t, { door });
    if (t < 2.4) person(g, w * .5 - 120 + smooth(0, 2.2, t) * 70, h * .82 + 20, 330, walkPose(t * 5, .7), { kind: 'woman', col: '#3a342f', dir: 1 });
  }, { tint: 'rgba(130,150,165,.12)' })],
  [5, (c, t) => film(c, t, 27, (g, w, h) => {
    const [sx, sy] = shake(t * 3, 4, 27); g.translate(sx, sy);
    vgrad(g, 0, 0, w, h, [[0, '#0b1224'], [1, '#1b2640']]);
    moon(g, w * .7, h * .22, 30);
    g.fillStyle = '#243553'; g.fillRect(0, h * .5, w, h * .5);
    g.globalCompositeOperation = 'screen'; glints(g, 0, w, h * .5, h, t, 200, { focus: w * .7, spread: 80, col: [200, 215, 240], a: .6, drift: -30 }); g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#1c1612'; g.beginPath(); g.rect(-20, -20, w + 40, h + 40); g.roundRect(w * .08, h * .1, w * .84, h * .6, 30); g.fill('evenodd');
    const bob = Math.sin(t * 2.5) * 3;
    personBack(g, w * .42, h * 1.5 + bob, 1150, 0, { kind: 'boy', col: '#0a0706' });
    g.save(); g.translate(w * .62, h * 1.41 + bob); g.rotate(-.2);
    personBack(g, 0, 0, 1000, 0, { kind: 'woman', col: '#0a0706' });
    g.fillStyle = '#0a0706'; g.beginPath(); g.ellipse(0, -900, 75, 120, 0, 0, 7); g.fill();
    g.restore();
  }, { warm: 'rgba(200,160,110,.35)' })],
  [3, (c, t) => wide(c, t, (g, w, h) => { winterIce(g, w, h, t, { hy: .5 }); personBack(g, w * .52, h * .66, 90, t * 3.4, { col: '#23272d' }); snowDrift(g, w, h, t, { y0: h * .52, n: 200, a: .4, speed: 500 }); })],
  [3, (c, t) => wide(c, t, (g, w, h) => {
    vgrad(g, 0, 0, w, h * .45, [[0, '#7eaad2'], [1, '#dde8ee']]); ridge(g, w, h * .45, 40, 11, '#8898a4', .5);
    g.fillStyle = '#b5ad7a'; g.fillRect(0, h * .45, w, h); g.fillStyle = '#c9b48f'; g.fillRect(0, h * .7, w, 40);
    const bx = w * .3 + t * 200; dust(g, bx - 120, h * .72, t, 1, 5); bus(g, bx, h * .72, 1.1, t, { speed: 60 });
  }, { tint: 'rgba(130,150,165,.12)' })],
  [3, (c, t) => film(c, t, 28, (g, w, h) => {
    vgrad(g, 0, 0, w, h, [[0, '#0b1224'], [1, '#243553']]);
    moon(g, w * .4 - t * 30, h * .3, 44);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(120,110,100,.5)';
    g.beginPath(); g.ellipse(w * .6, h * .55, 110, 140, -.3, 0, 7); g.fill(); g.beginPath(); g.ellipse(w * .7, h * .6, 150, 230, -.3, 0, 7); g.fill();
    g.globalCompositeOperation = 'source-over';
  }, { warm: 'rgba(200,160,110,.35)' })],
  [4, (c, t) => wide(c, t, (g, w, h) => { winterIce(g, w, h, t, { hy: .56, ridge: 8 }); person(g, w * .5 + t * 2, h * .56 + 40 - t * 2, 16, walkPose(t * 3.4), { col: '#262a30' }); snowDrift(g, w, h, t, { y0: h * .57, n: 260, a: .45 }); }, { vig: .15 })],
  [4, (c, t) => wide(c, t, (g, w, h) => {
    vgrad(g, 0, 0, w, h * .5, [[0, '#7eaad2'], [1, '#e2ecf0']]); ridge(g, w, h * .5, 50, 12, '#8898a4', .5);
    g.fillStyle = '#b8ad78'; g.fillRect(0, h * .5, w, h);
    g.strokeStyle = '#cbb892'; g.lineWidth = 8; g.beginPath(); g.moveTo(0, h * .62); g.quadraticCurveTo(w * .5, h * .54, w, h * .6); g.stroke();
    const bx = w * .25 + t * 110; dust(g, bx - 30, h * .58, t, .6, 8); bus(g, bx, h * .585, .22, t, {});
  }, { tint: 'rgba(130,150,165,.12)' })],
];
S('27 各自离开', 30, (c, t) => {
  let acc = 0;
  for (const [dd, fn] of SUB27) { if (t < acc + dd || dd === SUB27[SUB27.length - 1][0] && acc + dd >= 30) return fn(c, t - acc); acc += dd; }
  SUB27[SUB27.length - 1][1](c, t - (acc - SUB27[SUB27.length - 1][0]));
});

S('28 两根布条', 14, (c, t, d, p) => wide(c, t, (g, w, h) => {
  const z = 1 + p * .06; g.translate(w * .5, h * .5); g.scale(z, z); g.translate(-w * .5, -h * .5);
  const lg = g.createLinearGradient(0, 0, w, 0); lg.addColorStop(0, '#c7ced4'); lg.addColorStop(1, '#ddd8cd');
  g.fillStyle = lg; g.fillRect(0, 0, w, h);
  vgrad(g, 0, h * .7, w, h * .3, [[0, 'rgba(160,170,175,0)'], [1, 'rgba(140,145,140,.4)']]);
  const px = w * .36;
  pole(g, px, -60, h + 60, 120, t, { fade: .85, n: 20, band: .4, len: 300, wid: 18, wind: .7 });
  const gust = smooth(4, 7, t) * (1 - smooth(10, 12.5, t));
  const touch = smooth(6.3, 7.6, t) * (1 - smooth(8.6, 9.8, t));
  const ky = h * .56;
  const tailA = ribbon(g, px + 55, ky, 640, 46, '#8fa9c2', t, { wind: .55 + gust * .4, ang: .12, ph: 0, pull: s => [0, touch * 55 * s * s] });
  // 霜
  ribbon(g, px + 55, ky, 640, 46, frostPat(g), t, { wind: .55 + gust * .4, ang: .12, ph: 0, pull: s => [0, touch * 55 * s * s] });
  const tailB = ribbon(g, px + 55, ky + 110, 620, 44, '#2f67b0', t, { wind: .55 + gust * .4, ang: -.05, ph: touch * 0 + 1.4 * (1 - touch), pull: s => [0, -touch * 55 * s * s] });
  g.fillStyle = '#8fa6bc'; g.beginPath(); g.ellipse(px + 58, ky, 30, 24, 0, 0, 7); g.fill();
  g.fillStyle = '#3a70b0'; g.beginPath(); g.ellipse(px + 58, ky + 110, 28, 22, 0, 0, 7); g.fill();
}, { tint: 'rgba(130,140,150,.15)' }), { xin: .6 });

let FROST = null;
function frostPat(g) {
  if (!FROST) { const c = mkCanvas(64, 64), x = c.getContext('2d'), r = mulberry(12);
    for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(250,253,255,${.4 + r() * .6})`; x.fillRect(r() * 64, r() * 64, 1 + r() * 3, 1 + r() * 2); }
    FROST = c; }
  return g.createPattern(FROST, 'repeat');
}
// ---------- 尾声 ----------
function floes(g, w, h, t, hy, night) {
  const r = mulberry(3), arr = [];
  for (let i = 0; i < 70; i++) arr.push([r(), r(), r(), r(), r()]);
  arr.sort((a, b) => a[1] - b[1]);
  for (const [u, v, a, b, cc] of arr) {
    const d = Math.pow(v, 1.5), y = lerp(hy + 4, h * 1.1, d), s = lerp(20, 380, d) * (.5 + a);
    const x = ((u * w * 1.3 + t * (6 + d * 20) * (b > .5 ? 1 : -.6)) % (w * 1.3) + w * 1.3) % (w * 1.3) - w * .15;
    const pts = []; for (let k = 0; k < 7; k++) { const an = k / 7 * Math.PI * 2 + cc; const rr = s * (.7 + rand(u * 100 + k) * .5); pts.push([x + Math.cos(an) * rr, y + Math.sin(an) * rr * .28]); }
    if (!night) {
      g.fillStyle = 'rgba(120,210,215,.55)'; g.beginPath(); pts.forEach((q, k) => k ? g.lineTo(q[0], q[1] + s * .06) : g.moveTo(q[0], q[1] + s * .06)); g.closePath(); g.fill();
    }
    g.fillStyle = night ? `rgba(70,85,110,${.8})` : rgba(mix([235, 242, 245], [205, 220, 228], b), 1);
    g.beginPath(); pts.forEach((q, k) => k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.fill();
  }
}
S('29 开湖·本该相遇的季节', 14, (c, t, d, p) => wide(c, t, (g, w, h) => {
  const hy = h * .4;
  vgrad(g, 0, 0, w, hy + 2, [[0, '#8fb8dc'], [1, '#e5eef2']]);
  ridge(g, w, hy, 90, 15, '#9aa8b5', .5);
  g.fillStyle = 'rgba(255,255,255,.7)'; ridge(g, w, hy - 50, 40, 15, 'rgba(250,252,255,.55)', .5);
  ridge(g, w, hy + 4, 30, 16, '#6f808e', .8);
  vgrad(g, 0, hy, w, h - hy, [[0, '#2f7ea8'], [1, '#12476e']]);
  g.globalCompositeOperation = 'screen'; glints(g, 0, w, hy, h, t, 300, { col: [230, 245, 255], a: .6 }); g.globalCompositeOperation = 'source-over';
  floes(g, w, h, t, hy, false);
}, { tint: 'rgba(120,150,170,.12)' }), { xin: 1.5 });

S('30 浮冰间的月亮', 10, (c, t, d, p) => wide(c, t, (g, w, h) => {
  vgrad(g, 0, 0, w, h, [[0, '#060b16'], [1, '#0d1628']]);
  g.save(); g.globalCompositeOperation = 'screen';
  const mx = w * .5, my = h * .45;
  for (let i = 0; i < 22; i++) { const yy = my + (i - 11) * 9, ww = 90 * (1 - Math.abs(i - 11) / 12) + Math.sin(t * 2 + i) * 14; g.fillStyle = `rgba(220,230,250,${.55 * (1 - Math.abs(i - 11) / 12)})`; g.fillRect(mx - ww / 2 + Math.sin(t * 1.6 + i * .8) * 10, yy, ww, 4); }
  glow(g, mx, my, 300, [150, 170, 210], .25);
  glints(g, 0, w, 0, h, t, 160, { focus: mx, spread: 60, col: [200, 215, 240], a: .35, seed: 30 });
  g.restore();
  floes(g, w, h, t * .5, -h * .1, true);
}, { tint: 'rgba(60,90,140,.3)' }), { xin: 1.5, fout: 3.5 });

S('31 黑场', 6, (c, t) => { c.fillStyle = '#000'; c.fillRect(0, 0, W, H); });

// ================= 时间线：对齐网站用的《贝加尔湖畔》录音（4:05.8）=================
// 视频时间 = 歌曲时间。锚点（Belinda 听出来的）：0:34 器乐奏出主歌旋律，0:48 开唱，1:35 / 2:58 两次副歌。
// 其余按“每句约 3.9 秒”推算。stretch = 按比例变速（有动作编排的镜头）；extend = 原速延长（纯氛围镜头）。
const TIMING = {
  //      新时长  方式          对应
  '01': [3, 'stretch'],     // 0:00 前奏
  '02': [11, 'extend'],     // 0:03
  '03': [8, 'stretch'],     // 0:14
  '04': [7.5, 'stretch'],   // 0:22
  '05': [4.5, 'stretch'],   // 0:29.5 → 0:34 器乐旋律进来，进入记忆
  '06': [7, 'stretch'],     // 0:34
  '07': [11, 'extend'],     // 0:41  0:48「在我的怀里 在你的眼里」← 车窗倒影里两张侧脸
  '08': [7.8, 'stretch'],   // 0:52 「那里春风沉醉」
  '09': [4.5, 'stretch'],   // 0:59.8「那里绿草如茵」
  '10': [7.2, 'extend'],    // 1:04.3「月光把爱恋 洒满了湖面」← 他一个人
  '11': [6, 'stretch'],     // 1:11.5「两个人的篝火」← 两次熄灭；1:15.2 点着 ←「照亮整个夜晚」
  '12': [3.5, 'stretch'],   // 1:17.5 火光中的脸；1:19.7 闪回 ←「多少年以后」
  '13': [3, 'stretch'],     // 1:21  「如云般游走」
  '14': [4, 'stretch'],     // 1:24  她下了小巴 ←「那变换的脚步」
  '15': [4, 'stretch'],     // 1:28  「让我们难牵手」← 她捧起湖水
  '16': [3.5, 'stretch'],   // 1:32  冰上的手 / 水里的手
  '17': [3.4, 'stretch'],   // 1:35.5 副歌「这一生一世」← 站台
  '19': [5.6, 'stretch'],   // 1:38.9「有多少你我」← 两个影子
  '20': [9.5, 'stretch'],   // 1:44.5「被吞没在月光如水的夜里」
  '21': [8.5, 'stretch'],   // 1:54  「多想某一天 往日又重现」← 缝合拢前切断
  '22': [9.5, 'stretch'],   // 2:02.5「我们流连忘返 在贝加尔湖畔」
  '18': [6, 'extend'],      // 2:12  间奏：同一个站台
  '23': [9, 'stretch'],     // 2:18  冰层轰鸣
  '24': [8, 'stretch'],     // 2:27  她抬头
  '25': [15, 'stretch'],    // 2:35  他系布条；2:42 主歌反复「那纷飞的冰雪…」← 大雪
  '26': [8, 'stretch'],     // 2:50  她也系上一根
  '27': [20, 'stretch'],    // 2:58  副歌二 ← 各自离开
  '28': [14, 'extend'],     // 3:18  两根布条；3:24 左右碰到一起
  '29': [16, 'extend'],     // 3:32  开湖（叠化在最后一句上）
  '30': [12, 'extend'],     // 3:48  浮冰间的月亮，渐黑
  '31': [7, 'extend'],      // 4:00  黑场，4:05.8 歌曲结束
};
// 第 18 镜挪到间奏开头（主歌二只有 16 秒，放不下）
{ const i = SHOTS.findIndex(s => s.id.startsWith('18')), j = SHOTS.findIndex(s => s.id.startsWith('22'));
  const [s18] = SHOTS.splice(i, 1); SHOTS.splice(j, 0, s18); }
SHOTS.forEach(s => {
  const [d, mode] = TIMING[s.id.slice(0, 2)];
  s.dur0 = s.dur; s.dur = d; s.k = mode === 'extend' ? 1 : s.dur0 / d; s.dd = mode === 'extend' ? d : s.dur0;
});
const TOTAL = SHOTS.reduce((a, s) => a + s.dur, 0);
const STARTS = []; { let a = 0; SHOTS.forEach(s => { STARTS.push(a); a += s.dur; }); }
let RT = 0;
function shotAt(T) { let i = SHOTS.length - 1; while (i > 0 && T < STARTS[i]) i--; return SHOTS[i]; }
function drawShot(ctx, s, t) { s.draw(ctx, t * s.k, s.dd, clamp(t / s.dur)); }
function render(ctx, T) {
  RT = T;
  let i = SHOTS.length - 1; while (i > 0 && T < STARTS[i]) i--;
  const s = SHOTS[i], t = T - STARTS[i];
  ctx.save(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  drawShot(ctx, s, t);
  ctx.restore();
  if (s.xin && t < s.xin && i > 0) {
    const pv = SHOTS[i - 1], B = buf(), g = B.getContext('2d');
    g.save(); drawShot(g, pv, pv.dur + t); g.restore();
    ctx.save(); ctx.globalAlpha = 1 - t / s.xin; ctx.drawImage(B, 0, 0); ctx.restore();
  }
  if (s.fin && t < s.fin) { ctx.fillStyle = rgba(s.finCol || [0, 0, 0], 1 - t / s.fin); ctx.fillRect(0, 0, W, H); }
  if (s.fout && t > s.dur - s.fout) { ctx.fillStyle = `rgba(0,0,0,${(t - (s.dur - s.fout)) / s.fout})`; ctx.fillRect(0, 0, W, H); }
}
