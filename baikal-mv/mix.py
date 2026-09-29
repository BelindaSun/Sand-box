# 把网站用的《贝加尔湖畔》录音和环境音混在一起：歌在前，环境音低 14 dB。
# 需要先有 out/song48.wav（baikal.mp3 转成 48kHz 立体声）和 out/ambience.wav。
import numpy as np
from scipy.io import wavfile
sr, s = wavfile.read('out/song48.wav'); _, a = wavfile.read('out/ambience.wav')
s = s.astype(np.float64) / 32768; a = a.astype(np.float64) / 32768
n = max(len(s), len(a)); S = np.zeros((n, 2)); A = np.zeros((n, 2)); S[:len(s)] = s; A[:len(a)] = a
rms = lambda x: np.sqrt(np.mean(x[np.abs(x).sum(1) > 1e-4] ** 2))
Ag = A * rms(S) / rms(A) * 10 ** (-14 / 20)
Ag = 0.25 * np.tanh(Ag / 0.25)   # 柔和限幅：水花、火柴这类瞬态不盖过歌
M = S + Ag
pk = np.abs(M).max()
if pk > 0.98: M *= 0.98 / pk
wavfile.write('out/mix.wav', sr, (M * 32767).astype(np.int16))
print('mix ok', n / sr, 's, peak', round(pk, 3))
