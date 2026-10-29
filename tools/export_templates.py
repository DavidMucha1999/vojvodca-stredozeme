"""
Vygeneruje šablóny všetkých obrázkov hry do assets/templates/ (PNG v dvojnásobnom rozlíšení).
Grafik ich môže prekresliť, uložiť s rovnakým menom do assets/sprites/ a spustiť
tools/pack_assets.py – hra potom použije jeho obrázok namiesto kresleného.
Spustenie: python tools/export_templates.py   (potrebuje: pip install playwright)
"""
import os, base64, glob
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'assets', 'templates')
with sync_playwright() as p:
    br = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']); pg = br.new_page()
    pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    pg.goto('file://' + os.path.join(ROOT, 'phaser.html')); pg.wait_for_timeout(3000)
    # zachytíme plátna, ktoré Art registruje
    data = pg.evaluate("""() => {
      const got = {};
      const reg = Art.register;
      Art.register = (scene, key, canvas) => { got[key] = canvas.toDataURL('image/png').split(',')[1]; return reg(scene, key, canvas); };
      newGame(); ov.classList.add('hide'); mode = 'map';
      const S = game.scene.getScene('UI');
      for (const f of [0,1,2,3,4,5,6,7,8]) { Art.castle(S, f); Art.village(S, f); Art.village(S, f, 1); Art.rider(S, f); Art.banner(S, f); }
      Art.banner(S, 9); Art.rider(S, 9); Art.crown(S); Art.spark(S); Art.rider(S, G.fac, 1);
      const U0 = [];
      for (const k of ['i','a','c','v']) U0.push(mk(0, k));
      for (const k of Object.keys(FU)) U0.push(mk(0, k));
      for (const f of [0,1,2,3,4,5,7,8,9]) for (const k of ['o','a']) U0.push(mk(1, k, f));
      for (const [k, f] of [['t',2],['t',3],['w',3],['w',7],['x',4],['z',2]]) U0.push(mk(1, k, f));
      for (const [f, ks] of FK.entries()) for (const k of ks) U0.push(mk(1, k, f));
      U0.push(Object.assign(mk(0, 'i'), { bn: true }));
      const hero = { h: 1, t: 0, x: 0, y: 0, hp: 100, mh: 100, r: 9, k: 'h', f: 0, c: 0 };
      U0.push(hero);
      for (const u of U0) Art.unit(S, u);
      return got;
    }""")
    br.close()
for f in glob.glob(os.path.join(OUT, '*.png')): os.remove(f)
for key, b64 in sorted(data.items()):
    open(os.path.join(OUT, key + '.png'), 'wb').write(base64.b64decode(b64))
print(len(data), 'šablón v', os.path.relpath(OUT, ROOT))
