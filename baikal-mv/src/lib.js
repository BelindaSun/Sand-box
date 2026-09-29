// 《冰下的夏天》 —— 绘制基础库
// 所有画面都由代码逐帧绘制，确定性（同一时间点永远画出同一帧）。

const W = 1920, H = 1080;
const WIDE_H = Math.round(W / 2.39);          // 2.39:1 宽画幅（现在）
const WIDE_Y = Math.round((H - WIDE_H) / 2);
const FILM_W = 1440, FILM_X = (W - FILM_W) / 2; // 4:3 胶片（记忆）

// ---------- 数学 ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
function rand(n) { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }
function noise1(x, s = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(rand(i + s * 131.7), rand(i + 1 + s * 131.7), u);
}
function fbm(x, s = 0) { return noise1(x, s) * .5 + noise1(x * 2.1, s + 7) * .3 + noise1(x * 4.3, s + 13) * .2; }
function mulberry(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function rgba(c, a) { return `rgba(${c[0]|0},${c[1]|0},${c[2]|0},${a})`; }
function mix(c1, c2, t) { return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)]; }
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// ---------- 胶片颗粒 ----------
const GRAIN = [];
function initGrain() {
  const r = mulberry(7);
  for (let k = 0; k < 8; k++) {
    const c = mkCanvas(256, 256), g = c.getContext('2d');
    const id = g.createImageData(256, 256);
    for (let i = 0; i < id.data.length; i += 4) {
      const v = 128 + (r() + r() + r() - 1.5) * 150;
      id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255;
    }
    g.putImageData(id, 0, 0); GRAIN.push(c);
  }
}
function grain(ctx, w, h, t, amt) {
  const f = Math.floor(t * 24);
  const c = GRAIN[f % GRAIN.length];
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = amt;
  const p = ctx.createPattern(c, 'repeat');
  ctx.translate(-rand(f) * 256, -rand(f + 99) * 256);
  ctx.fillStyle = p; ctx.fillRect(0, 0, w + 512, h + 512);
  ctx.restore();
}
function vignette(ctx, w, h, amt, col = [0, 0, 0]) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .35, w / 2, h / 2, Math.hypot(w, h) * .62);
  g.addColorStop(0, rgba(col, 0)); g.addColorStop(1, rgba(col, amt));
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}

// ---------- 画幅 ----------
// 现在：2.39:1，冷、静、数字
function wide(ctx, t, draw, o = {}) {
  ctx.save();
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.beginPath(); ctx.rect(0, WIDE_Y, W, WIDE_H); ctx.clip();
  ctx.translate(0, WIDE_Y);
  ctx.save(); draw(ctx, W, WIDE_H); ctx.restore();
  if (o.tint !== false) {
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = o.tint || 'rgba(110,140,170,0.25)'; ctx.fillRect(0, 0, W, WIDE_H);
    ctx.globalCompositeOperation = 'source-over';
  }
  vignette(ctx, W, WIDE_H, o.vig ?? .28);
  grain(ctx, W, WIDE_H, t, o.grain ?? .05);
  ctx.restore();
}
// 记忆：4:3 16mm，暖、晃、颗粒
function film(ctx, t, seed, draw, o = {}) {
  ctx.save();
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.beginPath(); ctx.rect(FILM_X, 0, FILM_W, H); ctx.clip();
  const dx = (noise1(t * 7, seed) - .5) * 4, dy = (noise1(t * 6, seed + 5) - .5) * 5;
  ctx.translate(FILM_X + dx, dy);
  ctx.save(); draw(ctx, FILM_W, H); ctx.restore();
  // 暖色调 + 抬黑
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = o.warm || 'rgba(255,150,70,0.45)'; ctx.fillRect(-10, -10, FILM_W + 20, H + 20);
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = 'rgba(45,28,18,0.35)'; ctx.fillRect(-10, -10, FILM_W + 20, H + 20);
  // 曝光闪烁
  const fl = (rand(Math.floor(t * 24) + seed) - .5) * .06;
  ctx.fillStyle = fl > 0 ? `rgba(255,235,210,${fl})` : `rgba(0,0,0,0)`;
  ctx.fillRect(-10, -10, FILM_W + 20, H + 20);
  ctx.globalCompositeOperation = 'source-over';
  if (fl < 0) { ctx.fillStyle = `rgba(0,0,0,${-fl})`; ctx.fillRect(-10, -10, FILM_W + 20, H + 20); }
  vignette(ctx, FILM_W, H, o.vig ?? .55, [20, 8, 0]);
  grain(ctx, FILM_W, H, t, o.grain ?? .22);
  // 灰尘与划痕
  const f = Math.floor(t * 24);
  ctx.fillStyle = 'rgba(20,10,5,0.7)';
  for (let i = 0; i < 3; i++) if (rand(f * 3 + i) > .6) {
    ctx.beginPath(); ctx.arc(rand(f + i * 7) * FILM_W, rand(f + i * 11) * H, 1 + rand(f + i) * 2.5, 0, 7); ctx.fill();
  }
  if (rand(f * 1.3) > .85) {
    ctx.strokeStyle = 'rgba(255,240,220,0.25)'; ctx.lineWidth = 1;
    const x = rand(f * 2.2) * FILM_W; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 6, H); ctx.stroke();
  }
  ctx.restore();
}
// 手持晃动
function shake(t, amp, s = 0) {
  return [(fbm(t * .9, s) - .5) * amp, (fbm(t * .8, s + 3) - .5) * amp, (fbm(t * .5, s + 9) - .5) * amp * .0015];
}

// ---------- 天空、光 ----------
function vgrad(ctx, x, y, w, h, stops) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  stops.forEach(([p, c]) => g.addColorStop(p, c));
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
}
function glow(ctx, x, y, r, col, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(col, a)); g.addColorStop(.4, rgba(col, a * .35)); g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
function moon(ctx, x, y, r, a = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  glow(ctx, x, y, r * 14, [150, 175, 210], .35 * a);
  glow(ctx, x, y, r * 4, [210, 225, 245], .5 * a);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = `rgba(245,247,250,${a})`; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.fillStyle = `rgba(200,205,215,${.35 * a})`;
  [[-.3, -.2, .28], [.25, .15, .2], [-.05, .35, .15], [.3, -.35, .12]].forEach(([u, v, s]) => {
    ctx.beginPath(); ctx.arc(x + u * r, y + v * r, s * r, 0, 7); ctx.fill();
  });
  ctx.restore();
}
function stars(ctx, w, h, t, n, seed, a = 1) {
  for (let i = 0; i < n; i++) {
    const tw = .5 + .5 * Math.sin(t * (1 + rand(i + seed) * 3) + i);
    ctx.fillStyle = `rgba(220,230,255,${(.15 + .5 * rand(i * 3 + seed)) * tw * a})`;
    ctx.fillRect(rand(i * 7 + seed) * w, rand(i * 13 + seed) * h, 1.6, 1.6);
  }
}
// 山脊线
function ridge(ctx, w, y, amp, seed, col, freq = 1) {
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, y + 400);
  for (let x = 0; x <= w; x += 8) ctx.lineTo(x, y - fbm(x / 260 * freq, seed) * amp);
  ctx.lineTo(w, y + 400); ctx.closePath(); ctx.fill();
}

// ---------- 雪、风 ----------
function snowDrift(ctx, w, h, t, o) {
  // 贴地吹过的雪粉
  const { n = 300, y0 = h * .5, y1 = h, speed = 600, seed = 1, a = .5, len = 40 } = o;
  ctx.save(); ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const yy = lerp(y0, y1, Math.pow(rand(i + seed), .7));
    const depth = (yy - y0) / (y1 - y0 + 1);
    const sp = speed * (.4 + depth) * (.7 + rand(i * 5) * .6);
    const x = ((rand(i * 3 + seed) * (w + 400) + t * sp) % (w + 400)) - 200;
    const gust = .5 + .5 * Math.sin(t * .7 + i * .1);
    ctx.strokeStyle = `rgba(255,255,255,${a * (.2 + .8 * rand(i * 9)) * gust})`;
    ctx.lineWidth = .6 + depth * 2;
    ctx.beginPath(); ctx.moveTo(x, yy + Math.sin(t * 3 + i) * 3); ctx.lineTo(x - len * (.4 + depth), yy); ctx.stroke();
  }
  ctx.restore();
}
function snowFall(ctx, w, h, t, o) {
  const { n = 250, seed = 3, a = .8, wind = 60, size = 3, speed = 70 } = o;
  for (let i = 0; i < n; i++) {
    const z = .3 + rand(i + seed) * .7;
    const y = ((rand(i * 3 + seed) * (h + 40)) + t * speed * z) % (h + 40) - 20;
    const x = ((rand(i * 7 + seed) * (w + 200)) + t * wind * z + Math.sin(t * .8 + i) * 18 * z) % (w + 200) - 100;
    ctx.fillStyle = `rgba(255,255,255,${a * z})`;
    ctx.beginPath(); ctx.arc(x, y, size * z, 0, 7); ctx.fill();
  }
}

// ---------- 人物 ----------
// 侧面骨骼人（dir=1 朝右，-1 朝左）。单位：h = 身高（像素）。
// pose: {hip:[x,y]相对脚底, torso, head, thighF, thighB, kneeF, kneeB, armF, armB, elbF, elbB}
function limb(ctx, ax, ay, ang, len) { return [ax + Math.sin(ang) * len, ay + Math.cos(ang) * len]; }
function strokeSeg(ctx, pts, w) {
  ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
}
function walkPose(ph, amt = 1) {
  const s = Math.sin(ph), c = Math.cos(ph);
  return {
    hip: [0, -.5 + Math.abs(c) * .008 * amt],
    torso: .06 * amt, head: 0,
    thighF: .38 * s * amt, thighB: -.38 * s * amt,
    kneeF: Math.max(0, -c) * .55 * amt, kneeB: Math.max(0, c) * .55 * amt,
    armF: -.32 * s * amt, armB: .32 * s * amt, elbF: .25, elbB: .25,
  };
}
const POSES = {
  stand: { hip: [0, -.5], torso: 0, head: 0, thighF: .03, thighB: -.03, kneeF: 0, kneeB: 0, armF: .05, armB: -.05, elbF: .1, elbB: .1 },
  crouch: { hip: [-.16, -.17], torso: .62, head: .2, thighF: 1.8, thighB: 1.72, kneeF: 2.15, kneeB: 2.02, armF: .85, armB: .7, elbF: .25, elbB: .35 },
  sit: { hip: [0, -.06], torso: .1, head: .05, thighF: 2.2, thighB: 2.1, kneeF: 1.9, kneeB: 1.85, armF: .95, armB: .85, elbF: .7, elbB: .75 },
};
function blendPose(a, b, t) {
  const r = {}; for (const k in a) r[k] = Array.isArray(a[k]) ? [lerp(a[k][0], b[k][0], t), lerp(a[k][1], b[k][1], t)] : lerp(a[k], b[k], t);
  return r;
}
// kind: man | woman | girl | boy
function person(ctx, x, y, h, pose, o = {}) {
  const dir = o.dir ?? 1, kind = o.kind || 'man', col = o.col || '#1d2127';
  const colB = o.colB || col;
  ctx.save(); ctx.translate(x, y); ctx.scale(dir * h, h);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const P = pose;
  const hip = P.hip;
  const torsoLen = .3, neck = .065, thigh = .25, shin = .24, ua = .16, fa = .15;
  const sh = limb(ctx, hip[0], hip[1], Math.PI - P.torso, torsoLen);
  const hd = limb(ctx, sh[0], sh[1], Math.PI - P.torso - P.head, neck + .06);
  const legW = kind === 'girl' || kind === 'woman' ? .055 : .068;
  // 后侧肢体
  ctx.strokeStyle = colB;
  const kB = limb(ctx, hip[0], hip[1], P.thighB, thigh), fB = limb(ctx, kB[0], kB[1], P.thighB - P.kneeB, shin);
  strokeSeg(ctx, [hip, kB, fB], legW);
  ctx.lineWidth = .05; ctx.beginPath(); ctx.moveTo(fB[0], fB[1]); ctx.lineTo(fB[0] + .06, fB[1]); ctx.stroke();
  const eB = limb(ctx, sh[0], sh[1], P.armB, ua), hB = limb(ctx, eB[0], eB[1], P.armB + P.elbB, fa);
  strokeSeg(ctx, [sh, eB, hB], .058);
  // 衣服
  ctx.fillStyle = col; ctx.strokeStyle = col;
  const coatLen = kind === 'man' ? .26 : kind === 'woman' ? .34 : kind === 'girl' ? .2 : .06;
  const tx = Math.sin(P.torso), ty = -Math.cos(P.torso); // 躯干向上方向
  const px = -ty, py = tx; // 垂直（向前）
  const kF0 = limb(ctx, hip[0], hip[1], P.thighF, thigh);
  const kAvg = [(kF0[0] + kB[0]) / 2 - hip[0], (kF0[1] + kB[1]) / 2 - hip[1]];
  const kl = Math.hypot(kAvg[0], kAvg[1]) || 1;
  const dn = [kAvg[0] / kl, kAvg[1] / kl];
  const flare = kind === 'girl' ? .09 + Math.sin(o.t * 5 || 0) * .015 : kind === 'woman' ? .07 : .045;
  const sway = (o.flutter || 0);
  ctx.beginPath();
  ctx.moveTo(sh[0] - px * .07, sh[1] - py * .07);
  ctx.quadraticCurveTo(sh[0] + px * .1, sh[1] + py * .1, sh[0] + px * .075, sh[1] + py * .075 + .02);
  ctx.lineTo(hip[0] + px * .075, hip[1] + py * .075);
  ctx.lineTo(hip[0] + dn[0] * coatLen + px * (.04 + flare), hip[1] + dn[1] * coatLen + py * .02);
  ctx.lineTo(hip[0] + dn[0] * coatLen * 1.02 - px * (.06 + flare) - sway * .05, hip[1] + Math.max(dn[1], .5) * coatLen);
  ctx.lineTo(hip[0] - px * .075, hip[1] - py * .075);
  ctx.closePath(); ctx.fill();
  // 前侧腿
  const kF = kF0, fF = limb(ctx, kF[0], kF[1], P.thighF - P.kneeF, shin);
  strokeSeg(ctx, [hip, kF, fF], legW);
  ctx.lineWidth = .05; ctx.beginPath(); ctx.moveTo(fF[0], fF[1]); ctx.lineTo(fF[0] + .06, fF[1]); ctx.stroke();
  // 头
  const hr = .058;
  ctx.beginPath(); ctx.ellipse(hd[0], hd[1], hr * .95, hr, 0, 0, 7); ctx.fill();
  strokeSeg(ctx, [sh, [(sh[0] + hd[0]) / 2, (sh[1] + hd[1]) / 2]], .05);
  if (kind === 'man') { // 旧毛线帽 / 护耳帽
    ctx.beginPath(); ctx.ellipse(hd[0] - .005, hd[1] - .022, hr * 1.12, hr * .72, -P.torso * .5, Math.PI, 0); ctx.fill();
    ctx.fillRect(hd[0] - hr * 1.1, hd[1] - .03, hr * 2.1, .025);
  }
  if (kind === 'woman') { // 头巾，脑后打结
    ctx.beginPath(); ctx.ellipse(hd[0] - .008, hd[1] - .005, hr * 1.12, hr * 1.12, 0, Math.PI * .75, Math.PI * 2.1); ctx.fill();
    const k = [hd[0] - hr * 1.05, hd[1] + hr * .5];
    ctx.beginPath(); ctx.moveTo(k[0] + .01, k[1] - .01); ctx.quadraticCurveTo(k[0] - .015 - sway * .01, k[1] + .02, k[0] - .01 - sway * .02, k[1] + .045);
    ctx.lineTo(k[0] + .02, k[1] + .02); ctx.fill();
  }
  if (kind === 'girl') { // 长发，随风（只往脑后飘）
    const wind = o.hair ?? .5, tt = o.t || 0;
    ctx.beginPath(); ctx.moveTo(hd[0] + hr * .15, hd[1] - hr * 1.02);
    ctx.quadraticCurveTo(hd[0] - hr * 1.0, hd[1] - hr * 1.2, hd[0] - hr * 1.05, hd[1] - hr * .2);
    for (let i = 0; i <= 8; i++) {
      const s = i / 8;
      ctx.lineTo(hd[0] - hr * 1.05 - s * .16 * wind + Math.sin(tt * 6 + s * 5) * .012 * s,
        hd[1] - hr * .2 + s * (.16 - .11 * wind) + Math.cos(tt * 5 + s * 4) * .012 * s);
    }
    for (let i = 8; i >= 0; i--) {
      const s = i / 8;
      ctx.lineTo(hd[0] - hr * .6 - s * .13 * wind + Math.sin(tt * 6 + s * 5 + 1) * .01 * s,
        hd[1] + hr * .9 + s * (.12 - .1 * wind) + Math.cos(tt * 5 + s * 4 + 1) * .01 * s);
    }
    ctx.lineTo(hd[0] - hr * .1, hd[1] + hr * .6);
    ctx.closePath(); ctx.fill();
  }
  if (kind === 'boy') {
    ctx.beginPath(); ctx.ellipse(hd[0] - .006, hd[1] - .018, hr * 1.05, hr * .75, 0, Math.PI, 0); ctx.fill();
  }
  // 前侧手臂
  const eF = limb(ctx, sh[0], sh[1], P.armF, ua), hF = limb(ctx, eF[0], eF[1], P.armF + P.elbF, fa);
  strokeSeg(ctx, [sh, eF, hF], .06);
  ctx.restore();
  return { hand: [x + dir * hF[0] * h, y + hF[1] * h], head: [x + dir * hd[0] * h, y + hd[1] * h], handB: [x + dir * hB[0] * h, y + hB[1] * h] };
}
// 背影行走（面朝画面深处）
function personBack(ctx, x, y, h, ph, o = {}) {
  const col = o.col || '#1d2127', kind = o.kind || 'man';
  ctx.save(); ctx.translate(x, y); ctx.scale(h, h); ctx.fillStyle = col; ctx.strokeStyle = col;
  ctx.lineCap = 'round';
  const s = Math.sin(ph), bob = Math.abs(Math.cos(ph)) * .01;
  const lift = v => Math.max(0, v) * .05;
  ctx.lineWidth = .075;
  ctx.beginPath(); ctx.moveTo(-.05, -.5); ctx.lineTo(-.055, -lift(s)); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(.05, -.5); ctx.lineTo(.055, -lift(-s)); ctx.stroke();
  ctx.translate(0, -bob);
  const coat = kind === 'woman' ? .2 : .25;
  ctx.beginPath();
  ctx.moveTo(-.12, -.8); ctx.quadraticCurveTo(0, -.84, .12, -.8);
  ctx.lineTo(.15 + (o.flutter || 0) * .02, -coat); ctx.lineTo(-.15, -coat); ctx.closePath(); ctx.fill();
  ctx.lineWidth = .06;
  ctx.beginPath(); ctx.moveTo(-.12, -.78); ctx.lineTo(-.15 - s * .01, -.5 + (o.armL ?? 0)); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(.12, -.78); ctx.lineTo(.15 + s * .01, -.5 + (o.armR ?? 0)); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, -.9, .058, .062, 0, 0, 7); ctx.fill();
  ctx.fillRect(-.02, -.86, .04, .06);
  if (kind === 'man') { ctx.beginPath(); ctx.ellipse(0, -.925, .066, .045, 0, Math.PI, 0); ctx.fill(); }
  if (kind === 'woman') { ctx.beginPath(); ctx.ellipse(0, -.905, .068, .075, 0, 0, 7); ctx.fill(); }
  ctx.restore();
}

// ---------- 火 ----------
function fire(ctx, x, y, s, t, o = {}) {
  const a = o.a ?? 1;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, x, y - s * .3, s * 6, [255, 120, 40], .28 * a * (0.85 + .15 * noise1(t * 8)));
  for (let i = 0; i < 5; i++) {
    const hh = s * (1.2 - i * .12) * (.8 + .4 * noise1(t * 6 + i * 3, i));
    const ww = s * (.42 - i * .05);
    const lean = (noise1(t * 3 + i, i + 20) - .5) * s * .5 + (o.wind || 0) * s;
    const col = i < 2 ? [255, 90, 20] : i < 4 ? [255, 160, 50] : [255, 230, 150];
    ctx.fillStyle = rgba(col, .55 * a);
    const ox = (i - 2) * s * .08;
    ctx.beginPath(); ctx.moveTo(x + ox - ww, y);
    ctx.quadraticCurveTo(x + ox - ww * .8, y - hh * .5, x + ox + lean, y - hh);
    ctx.quadraticCurveTo(x + ox + ww * .8, y - hh * .5, x + ox + ww, y);
    ctx.closePath(); ctx.fill();
  }
  // 火星
  for (let i = 0; i < (o.sparks ?? 8); i++) {
    const life = (t * .6 + rand(i)) % 1;
    const sx = x + (rand(i * 3) - .5) * s + Math.sin(t * 2 + i) * s * .3 * life + (o.wind || 0) * s * 2 * life;
    const sy = y - s * .5 - life * s * 3;
    ctx.fillStyle = rgba([255, 180, 90], (1 - life) * a);
    ctx.fillRect(sx, sy, 2, 2);
  }
  ctx.restore();
}

// ---------- 布条 ----------
// 从 (x,y) 系出的一条布条，向风向飘
function ribbon(ctx, x, y, len, wid, col, t, o = {}) {
  const wind = o.wind ?? 1, ang = o.ang ?? .15, ph = o.ph || 0;
  const N = 18, top = [], bot = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const hang = (1 - wind) * s * len * .9;
    const wx = Math.cos(ang) * s * len * wind * (o.side || 1);
    const wv = Math.sin(t * (5 + wind * 4) - s * 7 + ph) * len * .08 * s * (.3 + wind);
    const cx = x + wx + (o.pull ? o.pull(s) [0] : 0), cy = y + Math.sin(ang) * s * len * wind + hang + wv + (o.pull ? o.pull(s)[1] : 0);
    const w2 = wid * (1 - s * .25) * (0.8 + .2 * Math.cos(t * 7 - s * 9 + ph));
    top.push([cx, cy - w2 / 2]); bot.push([cx, cy + w2 / 2]);
  }
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(top[0][0], top[0][1]);
  top.forEach(p => ctx.lineTo(p[0], p[1]));
  for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
  ctx.closePath(); ctx.fill();
  // 褶皱光影
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = wid * .15;
  ctx.beginPath(); top.forEach((p, i) => { const q = [p[0], (p[1] + bot[i][1]) / 2]; i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.stroke();
  return top[N];
}
// 萨满岩式的木柱，缠满褪色布条
const RIBBON_COLS = [[70, 110, 160], [150, 60, 60], [200, 180, 90], [230, 225, 210], [90, 130, 90], [110, 140, 180], [170, 110, 70]];
function pole(ctx, x, y0, y1, w, t, o = {}) {
  const fade = o.fade ?? .6, wind = o.wind ?? .8;
  ctx.fillStyle = o.wood || '#4a3b2c';
  ctx.fillRect(x - w / 2, y0, w, y1 - y0);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + w * .15, y0, w * .35, y1 - y0);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 12; i++) { const yy = lerp(y0, y1, rand(i + 5)); ctx.beginPath(); ctx.moveTo(x - w / 2, yy); ctx.lineTo(x - w / 2 + w * rand(i), yy + 20); ctx.stroke(); }
  const n = o.n ?? 26;
  for (let i = 0; i < n; i++) {
    const yy = lerp(y0 + (y1 - y0) * .08, y0 + (y1 - y0) * (o.band ?? .55), rand(i * 3 + 1));
    let c = RIBBON_COLS[i % RIBBON_COLS.length];
    c = mix(c, [205, 200, 190], fade * (.5 + rand(i) * .5));
    if (o.frost) c = mix(c, [235, 240, 245], o.frost * rand(i * 2));
    ribbon(ctx, x + w * .45, yy, (o.len || 160) * (.6 + rand(i * 7) * .6), (o.wid || 16) * (.7 + rand(i) * .5), rgba(c, .92), t, { wind: wind * (.6 + rand(i * 11) * .5), ang: .1 + rand(i) * .5, ph: i * 1.7 });
  }
}

// ---------- 冰（俯视） ----------
let ICE_TOP = null;
function initIceTop() {
  const c = mkCanvas(W, H), g = c.getContext('2d'), r = mulberry(42);
  const gr = g.createRadialGradient(W * .5, H * .5, 50, W * .5, H * .5, W * .7);
  gr.addColorStop(0, '#12303f'); gr.addColorStop(1, '#050d14');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // 深处的色块
  for (let i = 0; i < 40; i++) { glowOn(g, r() * W, r() * H, 100 + r() * 300, [30, 70, 90], .15); }
  // 气泡柱
  for (let k = 0; k < 70; k++) {
    let x = r() * W, y = r() * H; const n = 3 + (r() * 9 | 0); let s = 10 + r() * 40;
    for (let j = 0; j < n; j++) {
      const a = .25 + r() * .6;
      g.fillStyle = `rgba(235,245,250,${a})`;
      g.beginPath(); g.ellipse(x, y, s, s * (.55 + r() * .3), r() * 3, 0, 7); g.fill();
      g.fillStyle = `rgba(255,255,255,${a})`; g.beginPath(); g.ellipse(x - s * .25, y - s * .2, s * .35, s * .2, 0, 0, 7); g.fill();
      g.strokeStyle = `rgba(180,210,225,${a * .6})`; g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, y, s, s * .6, 0, 0, 7); g.stroke();
      x += (r() - .5) * s * 1.2; y += (r() - .5) * s * 1.2; s *= .72 + r() * .2;
    }
  }
  // 冰裂
  g.lineCap = 'round';
  for (let k = 0; k < 16; k++) {
    let x = r() * W, y = r() * H, a = r() * 7;
    g.strokeStyle = `rgba(210,235,245,${.15 + r() * .35})`; g.lineWidth = .8 + r() * 2;
    g.beginPath(); g.moveTo(x, y);
    for (let j = 0; j < 40; j++) { a += (r() - .5) * .6; x += Math.cos(a) * 25; y += Math.sin(a) * 25; g.lineTo(x, y); }
    g.stroke();
  }
  ICE_TOP = c;
}
function glowOn(g, x, y, r, col, a) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0));
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}
let SNOW_TEX = null;
function initSnowTex() {
  const c = mkCanvas(W, H), g = c.getContext('2d'), r = mulberry(9);
  g.fillStyle = '#e9eef1'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${r() > .5 ? '255,255,255' : '190,205,215'},${r() * .25})`; g.beginPath(); g.ellipse(r() * W, r() * H, 5 + r() * 40, 2 + r() * 8, r() * .3, 0, 7); g.fill(); }
  SNOW_TEX = c;
}

// ---------- 焦散（水下光纹）----------
const CAU = mkCanvas(240, 180);
function caustics(t, sc = 1) {
  const g = CAU.getContext('2d'), id = g.createImageData(240, 180), d = id.data;
  for (let y = 0; y < 180; y++) for (let x = 0; x < 240; x++) {
    const u = x / 40 * sc, v = y / 40 * sc;
    let a = Math.sin(u * 1.7 + Math.sin(v * 1.3 + t * .9) * 1.6 + t * .6);
    let b = Math.sin(v * 1.9 + Math.sin(u * 1.1 - t * .7) * 1.8 - t * .5);
    let c = Math.sin((u + v) * 1.2 + Math.sin(u * .8 + t) + t * .3);
    const val = Math.pow(1 - Math.abs(a * b), 10) + Math.pow(1 - Math.abs(b * c), 12) * .7;
    const i = (y * 240 + x) * 4; d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = clamp(val * 255 * .9, 0, 255);
  }
  g.putImageData(id, 0, 0);
  return CAU;
}

// ---------- 手（俯视，掌心朝下）----------
function hand(ctx, x, y, s, ang, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  const skin = o.skin || [196, 160, 140];
  const lg = ctx.createLinearGradient(-60, 0, 60, 0);
  lg.addColorStop(0, rgba(mix(skin, [0, 0, 0], .35), 1)); lg.addColorStop(.5, rgba(skin, 1)); lg.addColorStop(1, rgba(mix(skin, [0, 0, 0], .25), 1));
  ctx.fillStyle = lg;
  // 手腕 + 手掌
  ctx.beginPath();
  ctx.moveTo(-38, 260); ctx.lineTo(-44, 70); ctx.quadraticCurveTo(-56, 0, -48, -40);
  ctx.lineTo(50, -44); ctx.quadraticCurveTo(58, 10, 46, 70); ctx.lineTo(40, 260); ctx.closePath(); ctx.fill();
  if (o.sleeve) { ctx.fillStyle = o.sleeve; ctx.fillRect(-60, 150, 124, 160); }
  ctx.fillStyle = lg;
  // 四指
  const fingers = [[-38, -40, 88, 15, -.08], [-12, -46, 102, 16, -.02], [14, -44, 96, 15.5, .04], [38, -36, 76, 13.5, .1]];
  const spread = o.spread ?? 1;
  fingers.forEach(([fx, fy, L, w, a]) => {
    ctx.save(); ctx.translate(fx, fy); ctx.rotate(a * spread);
    ctx.beginPath(); ctx.moveTo(-w, 0); ctx.lineTo(-w * .9, -L + w); ctx.arc(0, -L + w, w * .9, Math.PI, 0); ctx.lineTo(w, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(90,60,50,0.25)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-w * .6, -L * .38); ctx.lineTo(w * .6, -L * .4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-w * .5, -L * .7); ctx.lineTo(w * .5, -L * .7); ctx.stroke();
    if (o.nails !== false) { ctx.fillStyle = rgba(mix(skin, [255, 230, 220], .35), .8); ctx.beginPath(); ctx.ellipse(0, -L + w * 1.2, w * .55, w * .75, 0, 0, 7); ctx.fill(); ctx.fillStyle = lg; }
    ctx.restore();
  });
  // 拇指
  ctx.save(); ctx.translate(-46, 40); ctx.rotate(-.7 * spread);
  ctx.beginPath(); ctx.moveTo(-17, 0); ctx.lineTo(-15, -58); ctx.arc(0, -58, 15, Math.PI, 0); ctx.lineTo(17, 0); ctx.closePath(); ctx.fill();
  ctx.restore();
  // 指节
  ctx.strokeStyle = 'rgba(80,55,45,0.18)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-40, -30); ctx.quadraticCurveTo(0, -40, 44, -30); ctx.stroke();
  if (o.age) { ctx.strokeStyle = 'rgba(80,90,120,0.25)'; ctx.lineWidth = 3;
    [[-20, 150, -10, 40], [10, 160, 20, 20], [30, 140, 35, 50]].forEach(([a, b, c, d]) => { ctx.beginPath(); ctx.moveTo(a, b); ctx.quadraticCurveTo(a + 10, (b + d) / 2, c, d); ctx.stroke(); }); }
  ctx.restore();
}

// ---------- 交通工具 ----------
function trainCar(ctx, x, y, w, h, t, o = {}) {
  ctx.fillStyle = o.body || '#2f4a3a'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = o.stripe || '#c9a54a'; ctx.fillRect(x, y + h * .78, w, h * .05);
  ctx.fillStyle = '#1a1f1c'; ctx.fillRect(x, y + h, w, h * .12);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x, y, w, h * .08);
  const nw = o.windows || 10;
  for (let i = 0; i < nw; i++) {
    const wx = x + w * (.05 + i * .9 / nw), wy = y + h * .22, ww = w * .6 / nw, wh = h * .35;
    const lit = o.lit ? o.lit(i) : .6;
    ctx.fillStyle = `rgba(${lerp(40, 255, lit)},${lerp(45, 210, lit)},${lerp(45, 140, lit)},1)`;
    ctx.fillRect(wx, wy, ww, wh);
    if (o.who && o.who(i)) { ctx.fillStyle = '#2a1e16'; ctx.beginPath(); ctx.ellipse(wx + ww * .5, wy + wh * .55, ww * .16, wh * .22, 0, 0, 7); ctx.fill(); ctx.fillRect(wx + ww * .25, wy + wh * .72, ww * .5, wh * .3); }
  }
}
function bus(ctx, x, y, s, t, o = {}) { // UAZ “面包”小巴，侧面
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = o.col || '#5d6650';
  ctx.beginPath(); ctx.moveTo(-100, 0); ctx.lineTo(-100, -70); ctx.quadraticCurveTo(-98, -95, -70, -98); ctx.lineTo(80, -98);
  ctx.quadraticCurveTo(102, -95, 104, -60); ctx.lineTo(106, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2b3139';
  for (let i = 0; i < 3; i++) ctx.fillRect(-80 + i * 42, -86, 34, 26);
  ctx.fillRect(58, -86, 38, 30);
  ctx.fillStyle = 'rgba(200,215,225,0.25)'; ctx.fillRect(58, -86, 38, 12);
  if (o.door) { ctx.fillStyle = '#23272c'; ctx.fillRect(-40 + 0, -60 + 0, 36 * o.door, 58); }
  ctx.fillStyle = '#16181b';
  const wr = t * (o.speed || 0) * .1;
  [-62, 70].forEach(wx => { ctx.beginPath(); ctx.arc(wx, 2, 17, 0, 7); ctx.fill(); ctx.strokeStyle = '#555'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(wx, 2, 8, wr, wr + 2); ctx.stroke(); });
  ctx.restore();
}
function dust(ctx, x, y, t, amt, seed = 1) {
  for (let i = 0; i < 40; i++) {
    const life = (rand(i + seed) + t * .15) % 1;
    const px = x + (rand(i * 3 + seed) - .5) * 300 * (.3 + life) - life * 120;
    const py = y - life * 60 - rand(i * 5) * 30;
    ctx.fillStyle = `rgba(215,195,160,${amt * (1 - life) * .12})`;
    ctx.beginPath(); ctx.arc(px, py, 20 + life * 70, 0, 7); ctx.fill();
  }
}

// 握拳的手（侧面），握着布条往外拉
function fist(ctx, x, y, s, ang, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  const skin = o.skin || [196, 160, 140];
  // 袖子/前臂
  ctx.fillStyle = o.sleeve || '#333';
  ctx.beginPath(); ctx.moveTo(40, -48); ctx.lineTo(420, -70); ctx.lineTo(420, 70); ctx.lineTo(40, 50); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(40, 20, 380, 40);
  ctx.fillStyle = rgba(mix(skin, [0, 0, 0], .1), 1);
  ctx.beginPath(); ctx.moveTo(20, -38); ctx.lineTo(60, -40); ctx.lineTo(60, 40); ctx.lineTo(20, 38); ctx.fill();
  // 拳
  const lg = ctx.createLinearGradient(0, -50, 0, 50);
  lg.addColorStop(0, rgba(mix(skin, [255, 240, 225], .15), 1)); lg.addColorStop(.6, rgba(skin, 1)); lg.addColorStop(1, rgba(mix(skin, [0, 0, 0], .3), 1));
  ctx.fillStyle = lg;
  ctx.beginPath(); ctx.roundRect(-75, -48, 110, 96, 34); ctx.fill();
  // 四个指节
  for (let i = 0; i < 4; i++) {
    const yy = -34 + i * 23;
    ctx.fillStyle = lg; ctx.beginPath(); ctx.ellipse(-78, yy, 17, 12.5, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = rgba(mix(skin, [60, 30, 20], .5), .5); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-88, yy + 11); ctx.quadraticCurveTo(-60, yy + 13, -40, yy + 10); ctx.stroke();
  }
  // 拇指压在上面
  ctx.fillStyle = rgba(mix(skin, [255, 235, 220], .1), 1);
  ctx.beginPath(); ctx.moveTo(10, -46); ctx.quadraticCurveTo(-40, -70, -80, -50); ctx.quadraticCurveTo(-95, -40, -80, -32); ctx.quadraticCurveTo(-40, -40, 12, -24); ctx.fill();
  ctx.fillStyle = rgba(mix(skin, [255, 225, 215], .4), .8); ctx.beginPath(); ctx.ellipse(-80, -44, 9, 6, -.3, 0, 7); ctx.fill();
  if (o.age) { ctx.strokeStyle = 'rgba(70,80,110,.3)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(30, -10); ctx.quadraticCurveTo(0, 0, -30, -12); ctx.stroke();
    ctx.strokeStyle = rgba(mix(skin, [60, 30, 20], .5), .35); ctx.lineWidth = 1.5; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-60, -30 + i * 23); ctx.lineTo(-50, -26 + i * 23); ctx.stroke(); } }
  ctx.restore();
}
