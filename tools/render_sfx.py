"""
Vyrenderuje zvuky boja zo syntézy (js/audio/sound.js) do súborov assets/audio/*.wav.
Každý zvuk má viac variantov (sfx_<druh>_<číslo>.wav), hra z nich vyberá náhodne.
Nahraj namiesto nich skutočné nahrávky s rovnakými menami a spusti tools/pack_assets.py.
Spustenie: python tools/render_sfx.py   (potrebuje: pip install playwright)
"""
import os, base64
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'assets', 'audio')
SOUND = open(os.path.join(ROOT, 'js', 'audio', 'sound.js'), encoding='utf-8').read()
# druh: (počet variantov, dĺžka v sekundách)
KINDS = {'sw': (5, .9), 'hb': (4, .6), 'sh': (3, .7), 'dy': (4, .9), 'ar': (3, .6), 'cl': (3, .8), 'horn': (1, 2.6)}
JS = """
async ([kind, dur]) => {
  const sr = 22050;
  ac = new OfflineAudioContext(1, Math.ceil(sr * dur), sr);
  RV = null; ls = -1; ls2 = -1; mu = false;
  bus();
  snd(kind);
  const buf = await ac.startRendering();
  const d = buf.getChannelData(0);
  let peak = 0; for (const v of d) peak = Math.max(peak, Math.abs(v));
  const g = peak > 0 ? .89 / peak : 1;
  const n = d.length, b = new DataView(new ArrayBuffer(44 + n * 2));
  const w = (o, s) => [...s].forEach((c, i) => b.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); b.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  b.setUint32(16, 16, true); b.setUint16(20, 1, true); b.setUint16(22, 1, true);
  b.setUint32(24, sr, true); b.setUint32(28, sr * 2, true); b.setUint16(32, 2, true); b.setUint16(34, 16, true);
  w(36, 'data'); b.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const fade = i > n - 400 ? (n - i) / 400 : 1;
    b.setInt16(44 + i * 2, Math.max(-1, Math.min(1, d[i] * g * fade)) * 32767, true);
  }
  let s = ''; const u = new Uint8Array(b.buffer); for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s);
}
"""
with sync_playwright() as p:
    br = p.chromium.launch(); pg = br.new_page()
    pg.set_content('<script>let mode="battle",G=null;' + SOUND + '</script>')
    for kind, (n, dur) in KINDS.items():
        for i in range(1, n + 1):
            data = base64.b64decode(pg.evaluate(JS, [kind, dur]))
            path = os.path.join(OUT, f'sfx_{kind}_{i}.wav')
            open(path, 'wb').write(data)
            print(os.path.relpath(path, ROOT), len(data), 'B')
    br.close()
