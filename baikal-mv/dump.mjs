import { chromium } from 'playwright'; import path from 'path'; import fs from 'fs';
const b = await chromium.launch(); const p = await b.newPage();
await p.goto('file://' + path.resolve('src/index.html')); await p.waitForFunction(() => window.ready);
fs.writeFileSync('out/shots.json', JSON.stringify(await p.evaluate(() => SHOTS.map((s, i) => ({ id: s.id, start: STARTS[i], dur: s.dur, k: s.k })))), null, 1);
await b.close();
