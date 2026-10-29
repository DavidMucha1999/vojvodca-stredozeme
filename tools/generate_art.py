"""
Generátor grafiky a terénu.
  - vykreslí nové obrázky do assets/textures/ (terén, hory, vojaci s tímovou vrstvou, bojisko),
  - zapíše terén do mapy assets/maps/stredozem.json (vrstvy "zem", "lesy", "hory"),
    ktorú potom môžeš ďalej upravovať v editore Tiled,
  - na záver spustí tools/pack_assets.py, ktorý všetko zbalí pre hru.
Pozor: terén v mape prepíše. Ak si ho už ručne upravil v Tiled, spusti radšej len
  python tools/generate_art.py --bez-terenu
Spustenie: python tools/generate_art.py   (potrebuje: pip install playwright && playwright install chromium)
"""
import base64, json, os, subprocess, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
ASSETS = os.path.join(ROOT, 'assets')
keep_terrain = '--bez-terenu' in sys.argv

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + os.path.join(ROOT, 'tools', 'art.html'))
    pg.wait_for_timeout(300)
    res = pg.evaluate('buildAll()')
    b.close()
if errs:
    sys.exit('Chyby v generátore:\n  ' + '\n  '.join(errs))

total = 0
for f in res['files']:
    path = os.path.join(ASSETS, f['path'])
    if keep_terrain and f['path'].startswith('maps/'):
        continue
    os.makedirs(os.path.dirname(path), exist_ok=True)
    data = base64.b64decode(f['data'].split(',', 1)[1])
    open(path, 'wb').write(data)
    total += len(data)
print(f'obrázky: {len(res["files"])} súborov, {total / 1e6:.1f} MB')

if not keep_terrain:
    w = res['world']
    mp = os.path.join(ASSETS, 'maps', 'stredozem.json')
    tmj = json.load(open(mp, encoding='utf-8'))
    tmj['layers'] = [l for l in tmj['layers'] if l['name'] not in ('zem', 'lesy', 'hory')]
    nid = max([l['id'] for l in tmj['layers']] + [0]) + 1
    oid = tmj.get('nextobjectid', 1)
    tile = lambda lid, name, data: {'id': lid, 'name': name, 'type': 'tilelayer', 'x': 0, 'y': 0, 'width': w['cols'], 'height': w['rows'], 'opacity': 1, 'visible': True, 'data': data}
    objs = []
    for x, y, s, kind, var in w['mountains']:
        objs.append({'id': oid, 'name': 'hora', 'type': '', 'point': True, 'x': x, 'y': y, 'width': 0, 'height': 0, 'rotation': 0, 'visible': True,
                     'properties': [{'name': 'druh', 'type': 'string', 'value': kind}, {'name': 'velkost', 'type': 'float', 'value': s}, {'name': 'variant', 'type': 'int', 'value': var}]})
        oid += 1
    # vrstvy terénu pod objekty (náhľadový obrázok ostáva úplne dole, je skrytý)
    for l in tmj['layers']:
        if l['name'] == 'nahlad': l['visible'] = False
    pre = [l for l in tmj['layers'] if l['type'] == 'imagelayer']
    rest = [l for l in tmj['layers'] if l['type'] != 'imagelayer']
    tmj['layers'] = pre + [tile(nid, 'zem', w['ground']), tile(nid + 1, 'lesy', w['forest']),
                           {'id': nid + 2, 'name': 'hory', 'type': 'objectgroup', 'draworder': 'topdown', 'x': 0, 'y': 0, 'opacity': 1, 'visible': True, 'objects': objs}] + rest
    tmj['nextlayerid'] = nid + 3
    tmj['nextobjectid'] = oid
    tmj['tilesets'] = [{'firstgid': 1, 'name': 'teren', 'image': 'teren-tiled.png', 'imagewidth': 80, 'imageheight': 50,
                        'tilewidth': 10, 'tileheight': 10, 'tilecount': 40, 'columns': 8, 'margin': 0, 'spacing': 0}]
    json.dump(tmj, open(mp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'terén: {w["cols"]}×{w["rows"]} dlaždíc, {len(objs)} hôr zapísaných do assets/maps/stredozem.json')

subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'pack_assets.py')], check=True)
