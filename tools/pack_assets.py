"""
Zbalí súbory hry tak, aby fungovala aj po otvorení dvojklikom (bez servera):
  assets/maps/stredozem.json  ->  js/data/map.js        (hrady, dediny, cesty, terén, lesy a hory z editora Tiled)
  assets/textures/*.png       ->  js/engine/assets.js   (terén, hory, vojaci, bojisko – z tools/generate_art.py)
  assets/sprites/*.png        ->  js/engine/assets.js   (vlastné obrázky namiesto kreslených)
  assets/audio/*.wav|ogg|mp3  ->  js/engine/assets.js   (zvuky; music_*.ogg nahradí syntetickú hudbu)
Spustenie: python tools/pack_assets.py   (nepotrebuje nič navyše)
"""
import os, json, base64, glob
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
A = lambda *p: os.path.join(ROOT, *p)

# --- Mapa z Tiled --------------------------------------------------------------
tmj = json.load(open(A('assets', 'maps', 'stredozem.json'), encoding='utf-8'))
layers = {l['name']: l for l in tmj['layers']}
prop = lambda o, k, d=None: next((p['value'] for p in o.get('properties', []) if p['name'] == k), d)
castles = [[o['name'], round(o['x'], 2), round(o['y'], 2), int(prop(o, 'frakcia', 6))] for o in layers['hrady']['objects']]
names = [c[0] for c in castles]
villages = []
for o in layers.get('dediny', {'objects': []})['objects']:
    h = prop(o, 'hrad')
    if h in names: villages.append([o['name'], round(o['x'], 2), round(o['y'], 2), names.index(h)])
    else: print('POZOR: dedina', o['name'], 'má neznámy hrad', h)
roads = []
for o in layers.get('cesty', {'objects': []})['objects']:
    a, b = prop(o, 'od'), prop(o, 'do')
    if a in names and b in names: roads.append([names.index(a), names.index(b)])
    else: print('POZOR: cesta', o['name'], 'spája neznáme hrady')
terrain = None
if 'zem' in layers and 'lesy' in layers:
    z, l = layers['zem'], layers['lesy']
    mountains = [[round(o['x'], 1), round(o['y'], 1), float(prop(o, 'velkost', 30)), prop(o, 'druh', 'snow'), int(prop(o, 'variant', 0))]
                 for o in layers.get('hory', {'objects': []})['objects']]
    terrain = {'cols': z['width'], 'rows': z['height'], 'tile': tmj['tilewidth'], 'ground': z['data'], 'forest': l['data'], 'mountains': mountains}
mapdata = {'castles': castles, 'villages': villages, 'roads': roads}
if terrain: mapdata['terrain'] = terrain
open(A('js', 'data', 'map.js'), 'w', encoding='utf-8').write(
    '/*\n * Mapa sveta vygenerovaná z assets/maps/stredozem.json (editor Tiled) nástrojom tools/pack_assets.py.\n'
    ' * Neupravuj ručne: zmeň mapu v Tiled a spusti tools/pack_assets.py.\n'
    ' * Súradnice sú v jednotkách návrhu (svet = súradnica × K).\n */\n'
    'const MAPDATA = ' + json.dumps(mapdata, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('mapa:', len(castles), 'hradov,', len(villages), 'dedín,', len(roads), 'ciest', ', terén' if terrain else ', bez terénu')

# --- Obrázky a zvuky -----------------------------------------------------------
MIME = {'.png': 'image/png', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg'}
def pack(folder, exts):
    out = {}
    for f in sorted(glob.glob(A('assets', folder, '*'))):
        e = os.path.splitext(f)[1].lower()
        if e in exts:
            out[os.path.splitext(os.path.basename(f))[0]] = 'data:' + MIME[e] + ';base64,' + base64.b64encode(open(f, 'rb').read()).decode()
    return out
sprites, textures, audio = pack('sprites', ('.png',)), pack('textures', ('.png',)), pack('audio', ('.wav', '.ogg', '.mp3'))
with open(A('js', 'engine', 'assets.js'), 'w', encoding='utf-8') as f:
    f.write('/*\n * Zbalené obrázky a zvuky z priečinka assets/ (vytvára tools/pack_assets.py). Neupravuj ručne.\n */\n')
    f.write('const ASSETS = {\n  sprites: {\n')
    f.write(',\n'.join('    ' + json.dumps(k) + ': "' + v + '"' for k, v in sprites.items()))
    f.write('\n  },\n  textures: {\n')
    f.write(',\n'.join('    ' + json.dumps(k) + ': "' + v + '"' for k, v in textures.items()))
    f.write('\n  },\n  audio: {\n')
    f.write(',\n'.join('    ' + json.dumps(k) + ': "' + v + '"' for k, v in audio.items()))
    f.write('\n  }\n};\n')
print('obrázky:', len(sprites), ' textúry:', len(textures), ' zvuky:', len(audio), ' veľkosť assets.js:', os.path.getsize(A('js', 'engine', 'assets.js')) // 1024, 'kB')
