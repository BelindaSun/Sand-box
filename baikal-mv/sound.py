# 《冰下的夏天》环境音轨：全部用程序合成，给歌曲打底，音量刻意压低。
import json, numpy as np
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

SR = 48000
shots = {s['id'][:2]: s for s in json.load(open('out/shots.json'))}
TOTAL = max(s['start'] + s['dur'] for s in shots.values())
N = int(TOTAL * SR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(7)

def st(k, t=0.0): return shots[k]['start'] + t
def rng_(k): s = shots[k]; return s['start'], s['start'] + s['dur']
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'bandpass', fs=SR, output='sos'), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'lowpass', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'highpass', fs=SR, output='sos'), x)
def env(n, a, r):  # 淡入淡出
    e = np.ones(n); ai, ri = int(a * SR), int(r * SR)
    if ai: e[:ai] = np.linspace(0, 1, ai)
    if ri: e[-ri:] = np.minimum(e[-ri:], np.linspace(1, 0, ri))
    return e
def add(t0, sig, gain=1.0, pan=0.0):
    i = int(t0 * SR); j = min(N, i + len(sig))
    if j <= i: return
    s = sig[:j - i] * gain
    L[i:j] += s * np.sqrt((1 - pan) / 2) * 1.414; R[i:j] += s * np.sqrt((1 + pan) / 2) * 1.414
def noise(sec): return rng.standard_normal(int(sec * SR))
def slow(sec, rate, seed):
    r = np.random.default_rng(seed); k = max(2, int(sec * rate) + 2)
    return np.interp(np.arange(int(sec * SR)) / SR, np.linspace(0, sec, k), r.random(k))

# ---- 风 ----
def wind(t0, t1, level=1.0, bright=900, fade=1.5, seed=1):
    d = t1 - t0; n = noise(d)
    w = bp(n, 120, bright) * (0.4 + 0.9 * slow(d, .6, seed)) + bp(noise(d), 700, 2400) * 0.25 * slow(d, 1.1, seed + 1)
    w *= env(len(w), fade, fade)
    add(t0, w, 0.05 * level, pan=-0.2); add(t0, bp(noise(d), 150, bright) * env(len(w), fade, fade) * slow(d, .5, seed + 5), 0.035 * level, pan=0.3)

# ---- 贝加尔湖冰层的声音：低沉的“咚”+ 向下滑的啸音 ----
def iceboom(t0, g=1.0, pan=0.0):
    d = 3.0; tt = np.arange(int(d * SR)) / SR
    thump = lp(noise(d), 90, 4) * np.exp(-tt * 2.2) * 6
    f = 1400 * np.exp(-tt * 5) + 180
    chirp = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 3.5) * 0.5
    ring = np.sin(2 * np.pi * 55 * tt) * np.exp(-tt * 1.4) * 0.6
    add(t0, (thump + chirp + ring) * 0.22 * g, 1, pan)
    add(t0 + 0.09, chirp * 0.08 * g, 1, -pan)

# ---- 火柴、篝火 ----
def match(t0, ok=False):
    d = 0.35; tt = np.arange(int(d * SR)) / SR
    s = bp(noise(d), 1500, 7000) * np.exp(-tt * 14) * 0.5
    if ok:
        d2 = 1.4; t2 = np.arange(int(d2 * SR)) / SR
        s = np.concatenate([s, bp(noise(d2), 200, 2500) * np.exp(-t2 * 2) * 0.25])
    add(t0, s, 0.5, 0.25)
def crackle(t0, t1, level=1.0, seed=3):
    d = t1 - t0; n = int(d * SR); x = np.zeros(n); r = np.random.default_rng(seed)
    for p in r.random(int(d * 14)) * n:
        p = int(p); k = int(SR * .004)
        if p + k < n: x[p:p + k] += r.standard_normal(k) * np.exp(-np.arange(k) / (k / 4)) * r.random()
    x = hp(x, 900) + bp(noise(d), 80, 400) * 0.12 * slow(d, 3, seed)
    add(t0, x * env(n, 1, 1.5), 0.2 * level, 0.3)

# ---- 湖水 ----
def lapping(t0, t1, level=1.0, seed=4):
    d = t1 - t0; tt = np.arange(int(d * SR)) / SR
    wv = (0.5 + 0.5 * np.sin(2 * np.pi * tt / 3.1 + seed)) ** 3
    x = bp(noise(d), 250, 1800) * wv * 0.6 + bp(noise(d), 1800, 5000) * wv ** 2 * 0.15
    add(t0, x * env(len(x), 1, 1.5), 0.08 * level, -0.1)
def splash(t0, g=1.0):
    d = 1.2; tt = np.arange(int(d * SR)) / SR
    add(t0, bp(noise(d), 400, 4000) * np.exp(-tt * 4) * 0.4 * g, 1, 0.2)

# ---- 火车 ----
def clack(t0, t1, period=0.9, accel=0.0, level=1.0):
    d = t1 - t0; x = np.zeros(int(d * SR)); t = 0.0; p = period
    while t < d - .2:
        for off in (0, 0.13):
            i = int((t + off) * SR); k = int(.06 * SR)
            if i + k < len(x): x[i:i + k] += bp(noise(.06), 300, 1800)[:k] * np.exp(-np.arange(k) / (k / 5))
        t += p; p = max(0.28, p * (1 - accel))
    x += lp(noise(d), 180) * 0.4
    add(t0, x * env(len(x), .8, 1), 0.12 * level)
def whistle(t0, d=3.0, g=1.0):
    tt = np.arange(int(d * SR)) / SR
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5 * tt)
    x = sum(a * np.sin(2 * np.pi * f * vib * tt) for f, a in [(466, 1), (554, .8), (698, .6), (932, .25)])
    x = lp(x + bp(noise(d), 400, 1200) * .6, 1500) * env(len(tt), .25, 1.5)
    add(t0, x * 0.05 * g, 1, -0.4)

# ---- 小巴 ----
def engine(t0, t1, profile, level=1.0):
    d = t1 - t0; tt = np.arange(int(d * SR)) / SR
    a = np.interp(tt, profile[0], profile[1])
    f = 38 + 30 * a
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.3 + bp(noise(d), 60, 500) * 0.5
    add(t0, lp(x, 600) * (0.2 + a) * 0.1 * level, 1, 0.1)

# ================= 时间线 =================
iceboom(1.0, 1.2); iceboom(2.5, .35, .5)
wind(*rng_('02'), level=.9); wind(st('03'), st('05', 1), level=1.3, seed=2)
for i in range(4):  # 手套擦雪
    t0 = st('04', .1 + i * .95); d = .8; tt = np.arange(int(d * SR)) / SR
    add(t0, bp(noise(d), 1500, 6000) * np.sin(np.pi * tt / d) ** 2 * 0.12, 1, -.3 + i * .2)
clack(st('07'), st('07', 6), level=.8)
wind(*rng_('10'), level=.6, bright=600, seed=4)
wind(st('11'), st('12', 6), level=.9, seed=5)
match(st('11', 1.6)); match(st('11', 3.4)); match(st('11', 5.6), ok=True)
crackle(st('11', 5.8), st('12', 6))
lapping(st('13'), st('13', 5), .8)
engine(st('14'), st('14', 6), ([0, 2.2, 4.3, 6], [.9, .15, .15, 1]))
add(st('14', 2.5), bp(noise(.2), 300, 3000) * .15)  # 开门
lapping(st('15'), st('16', 5), 1.1, seed=6); splash(st('15', 3.1)); splash(st('15', 4.6), .5)
wind(st('16'), st('16', 2.2), level=.5, fade=.3)
clack(st('17', .5), st('17', 6), period=1.1, accel=.08)
wind(st('18'), st('18', 3), level=.7, fade=.4)
lapping(st('18', 3), st('18', 6), .5)
wind(st('19', 3.2), st('19', 5.5), level=.4, fade=.6); lapping(st('19', 5.5), st('19', 8), .4)
wind(*rng_('20'), level=.5, bright=500, seed=9); crackle(st('20'), st('20', 8), .6, seed=8)
wind(st('21'), st('21', 12), level=.35, fade=2)
lapping(st('22'), st('22', 10), .6)
wind(*rng_('23'), level=1, seed=11); iceboom(st('23', 2.5), 1.3, -.3)
wind(st('24', 1), st('24', 7), level=1.2, bright=2000, seed=12); lapping(st('24'), st('24', 7), .7)
wind(*rng_('25'), level=1.2, seed=13)
wind(*rng_('26'), level=.5, bright=1500, seed=14); lapping(st('26'), st('26', 10), .5)
s27 = st('27'); subs = [4, 4, 5, 3, 3, 3, 4, 4]; acc = 0
for i, d in enumerate(subs):
    a = s27 + acc
    if i in (0, 3, 6): wind(a, a + d, level=.9, fade=.3, seed=20 + i)
    if i in (1,): engine(a, a + d, ([0, 2.5, 4], [.1, .1, .3]), .8)
    if i in (4, 7): engine(a, a + d, ([0, d], [.8, .6]), .5 if i == 4 else .25)
    if i in (2, 5): clack(a, a + d, period=.75, level=.6)
    acc += d
wind(st('28'), st('28', 14), level=.9, bright=1400, seed=30)
lapping(st('29'), st('30', 10), .8, seed=31)
for k in range(9):  # 浮冰轻碰
    t0 = st('29', 1.5 + k * 2.3 + rng.random()); d = .5; tt = np.arange(int(d * SR)) / SR
    add(t0, (np.sin(2 * np.pi * (900 + rng.random() * 600) * tt) * .3 + bp(noise(d), 800, 3000)) * np.exp(-tt * 12) * .05, 1, rng.random() - .5)
whistle(st('31', .8), 4.0, .7)

mix = np.stack([L, R], 1)
mix = mix / (np.abs(mix).max() + 1e-9) * 0.35   # 峰值约 -9 dBFS，给歌留出空间
wavfile.write('out/ambience.wav', SR, (mix * 32767).astype(np.int16))
print('ok', TOTAL, 's')
