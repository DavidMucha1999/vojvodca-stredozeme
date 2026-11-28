"""
Vytvorí mapu sveta pre editor Tiled (assets/maps/stredozem.json) z aktuálnych dát hry
a náhľad mapy (assets/maps/stredozem-nahlad.jpg) ako podklad.
Bežne ho netreba spúšťať: mapu uprav v Tiled a potom spusti tools/pack_assets.py.
"""
import os, json, base64
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
scripts = ['js/core/setup.js', 'js/data/factions.js', 'js/data/castles.js', 'tools/terrain.js']
code = '\n'.join(open(os.path.join(ROOT, s), encoding='utf-8').read() for s in scripts)
with sync_playwright() as p:
    br = p.chromium.launch(); pg = br.new_page()
    pg.set_content('<canvas id="c"></canvas><div id="ov"></div><div id="hud"></div><script>' + code + '</script>')
    d = pg.evaluate("""() => {
      const src = document.querySelector('script').textContent;
      const roads = JSON.parse(src.match(/\\[\\[0, 1\\],[^]*?\\]\\]/)[0]);
      VL = mkVL();
      buildMap();
      const c = document.createElement('canvas'); c.width = 1800; c.height = 1200;
      c.getContext('2d').drawImage(MAP, 0, 0, 1800, 1200);
      return { castles: TW.map(t => [t.n, t.x / K, t.y / K, t.f]), villages: VL.map(v => [v.n, v.x / K, v.y / K, TW[v.t].n]), roads, img: c.toDataURL('image/jpeg', .82).split(',')[1] };
    }""")
    br.close()

open(os.path.join(ROOT, 'assets', 'maps', 'stredozem-nahlad.jpg'), 'wb').write(base64.b64decode(d['img']))
oid = 1
def obj(name, x, y, props, **extra):
    global oid
    o = {'id': oid, 'name': name, 'type': '', 'x': round(x, 2), 'y': round(y, 2), 'width': 0, 'height': 0, 'rotation': 0, 'visible': True,
         'properties': [{'name': k, 'type': t, 'value': v} for k, t, v in props]}
    o.update(extra); oid += 1
    return o
FN = ['Gondor', 'Rohan', 'Mordor', 'Isengard', 'Haradrim', 'Erebor', 'Vlastná družina', 'Rhûn', 'Lothlórien']
castles = [obj(n, x, y, [('frakcia', 'int', f), ('frakcia_nazov', 'string', FN[f])], point=True) for n, x, y, f in d['castles']]
villages = [obj(n, x, y, [('hrad', 'string', h)], point=True) for n, x, y, h in d['villages']]
pos = {c[0]: (c[1], c[2]) for c in d['castles']}
names = [c[0] for c in d['castles']]
roads = []
for a, b in d['roads']:
    (ax, ay), (bx, by) = pos[names[a]], pos[names[b]]
    roads.append(obj(names[a] + ' – ' + names[b], ax, ay, [('od', 'string', names[a]), ('do', 'string', names[b])], polyline=[{'x': 0, 'y': 0}, {'x': round(bx - ax, 2), 'y': round(by - ay, 2)}]))
layer = lambda i, name, objs: {'id': i, 'name': name, 'type': 'objectgroup', 'draworder': 'topdown', 'objects': objs, 'opacity': 1, 'visible': True, 'x': 0, 'y': 0}
tmj = {
    'type': 'map', 'version': '1.10', 'tiledversion': '1.10.2', 'orientation': 'orthogonal', 'renderorder': 'right-down',
    'width': 180, 'height': 120, 'tilewidth': 10, 'tileheight': 10, 'infinite': False, 'nextlayerid': 5, 'nextobjectid': oid,
    'properties': [{'name': 'popis', 'type': 'string', 'value': 'Mapa Stredozeme pre hru Vojvodca Stredozeme. Súradnice sú v jednotkách návrhu (svet = 4,5×). Po úprave spusti tools/pack_assets.py.'}],
    'tilesets': [],
    'layers': [
        {'id': 1, 'name': 'nahlad', 'type': 'imagelayer', 'image': 'stredozem-nahlad.jpg', 'opacity': .9, 'visible': True, 'x': 0, 'y': 0, 'repeatx': False, 'repeaty': False},
        layer(2, 'cesty', roads), layer(3, 'dediny', villages), layer(4, 'hrady', castles)
    ]
}
json.dump(tmj, open(os.path.join(ROOT, 'assets', 'maps', 'stredozem.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('hradov', len(castles), 'dedín', len(villages), 'ciest', len(roads))
