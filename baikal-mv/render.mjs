// 用法：
//   node render.mjs sheet out.jpg 10 12.5 30 ...        联系表
//   node render.mjs still out.jpg 12.5                   单帧
//   node render.mjs video out.mp4 [start] [end] [workers] 渲染视频（无声）
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
const FF = process.env.FFMPEG;
const [mode, out, ...rest] = process.argv.slice(2);
const url = 'file://' + path.resolve('src/index.html');
const FPS = 24;
async function openPage(browser) {
  const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on('console', m => console.log('[page]', m.text()));
  p.on('pageerror', e => console.log('[err]', e.message));
  await p.goto(url); await p.waitForFunction(() => window.ready);
  return p;
}
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--disable-gpu-sandbox'] });
if (mode === 'sheet' || mode === 'still') {
  const p = await openPage(browser);
  let times = rest.map(Number);
  if (rest[0] === 'all') times = await p.evaluate(k => SHOTS.map((s, i) => STARTS[i] + s.dur * k), +(rest[1] ?? .6));
  if (rest[0] === 'shot') times = await p.evaluate(([i, n]) => [...Array(n)].map((_, j) => STARTS[i] + SHOTS[i].dur * (j + .5) / n), [+rest[1], +(rest[2] ?? 8)]);
  const d = mode === 'sheet' ? await p.evaluate(([t, c]) => sheet(t, c, 1920 / c), [times, +(process.env.COLS || 4)]) : await p.evaluate(t => frameJPEG(t), times[0]);
  fs.writeFileSync(out, Buffer.from(d.split(',')[1], 'base64'));
} else if (mode === 'video') {
  const total = await (await openPage(browser)).evaluate(() => TOTAL);
  const start = +(rest[0] ?? 0), end = +(rest[1] ?? total), workers = +(rest[2] ?? 4);
  const n0 = Math.round(start * FPS), n1 = Math.round(end * FPS), per = Math.ceil((n1 - n0) / workers);
  const parts = [];
  const t0 = Date.now();
  await Promise.all([...Array(workers)].map(async (_, w) => {
    const a = n0 + w * per, b = Math.min(n1, a + per); if (a >= b) return;
    const part = `${out}.part${w}.mp4`; parts[w] = part;
    const p = await openPage(browser);
    const ff = spawn(FF, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-tune', 'grain', '-pix_fmt', 'yuv420p', part]);
    for (let f = a; f < b; f++) {
      const d = await p.evaluate(T => frameJPEG(T, .93), f / FPS);
      const buf = Buffer.from(d.split(',')[1], 'base64');
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (w === 0 && (f - a) % 120 === 0) console.log(`w0 ${f - a}/${b - a}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }));
  fs.writeFileSync(out + '.list', parts.filter(Boolean).map(p => `file '${path.resolve(p)}'`).join('\n'));
  await new Promise(r => spawn(FF, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', out + '.list', '-c', 'copy', out], { stdio: 'inherit' }).on('close', r));
  parts.filter(Boolean).forEach(p => fs.unlinkSync(p)); fs.unlinkSync(out + '.list');
  console.log('done', ((Date.now() - t0) / 1000).toFixed(0) + 's');
}
await browser.close();
