#!/usr/bin/env python3
"""
Import modelu postavy (GLB, napr. z Meshy) do hry: telo človeka pre 3D bitku.
Použitie: python3 tools/model_import.py vstup.glb js/data/model_clovek.js [vyska=25.5] [--race=human|orc] [--name=MODEL_CLOVEK] [--tex=512]
- --race nastaví pomery pre hľadanie kĺbov (ork má širšie plecia a väčšiu hlavu), --tex uloží textúru modelu (ak má UV) zmenšenú na danú veľkosť ako JPEG v base64,
- model stojí v A-póze alebo T-póze, tvárou do +Z, chodidlá dole (ako z Meshy),
- prevedie ho do súradníc hry (vpred +X, vpravo +Z, chodidlá na 0, výška v jednotkách hry),
- ruky spustí na prirodzený uhol (asi 16° od tela), nájde kĺby (členky, kolená, bedrá, ramená, lakte, zápästia, hlavu, oči, ústa),
- vyrobí aj zjednodušenú verziu pre vzdialené zástupy,
- zapíše JS súbor s dátami (base64) – hra ho načíta bez ďalších knižníc.
Kosti a váhy počíta hra sama podľa svojej kostry (js/engine/b3d.js, modelBody).
"""
import sys, json, struct, base64, io
import numpy as np

def load_glb(path):
    b = open(path, 'rb').read()
    cl = struct.unpack('<I', b[12:16])[0]; J = json.loads(b[20:20 + cl]); off = 20 + cl
    bl = struct.unpack('<I', b[off:off + 4])[0]; BIN = b[off + 8:off + 8 + bl]
    def acc(i):
        a = J['accessors'][i]; v = J['bufferViews'][a['bufferView']]; st = v.get('byteOffset', 0) + a.get('byteOffset', 0)
        n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]; dt = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8}[a['componentType']]
        arr = np.frombuffer(BIN[st:st + a['count'] * n * np.dtype(dt).itemsize], dtype=dt)
        return arr.reshape(-1, n) if n > 1 else arr
    Ps, Is, UVs, base = [], [], [], 0
    for m in J['meshes']:
        for pr in m['primitives']:
            P = acc(pr['attributes']['POSITION']).astype(np.float64); I = acc(pr['indices']).astype(np.int64) if 'indices' in pr else np.arange(len(P))
            Ps.append(P); Is.append(I + base); base += len(P)
            if 'TEXCOORD_0' in pr['attributes']: UVs.append(acc(pr['attributes']['TEXCOORD_0']).astype(np.float64))
    tex = None
    if J.get('images'):
        v = J['bufferViews'][J['images'][0]['bufferView']]; st = v.get('byteOffset', 0); tex = BIN[st:st + v['byteLength']]
    return np.vstack(Ps), np.concatenate(Is).reshape(-1, 3), (np.vstack(UVs) if len(UVs) == len(Ps) else None), tex

def seg_dist(P, a, b):
    ab = b - a; t = np.clip(((P - a) @ ab) / (ab @ ab), 0, 1); return np.linalg.norm(P - (a + t[:, None] * ab), axis=1)

RACES = {   # pomery pre hľadanie kĺbov: výška ramien, kolien, bedier, hlavy (podiel výšky), šírka pliec (podiel polšírky trupu)
    'human': dict(sh=.79, kn=.29, hip=.52, head=.875, shW=.8, legZ=.05, ang=16),
    'orc': dict(sh=.80, kn=.27, hip=.50, head=.86, shW=.82, legZ=.06, ang=18),
}
def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]; opts = dict(a[2:].split('=', 1) if '=' in a else (a[2:], '1') for a in sys.argv[1:] if a.startswith('--'))
    src, dst = args[0], args[1]; height = float(args[2]) if len(args) > 2 else 25.5
    race = opts.get('race', 'human'); RC = RACES[race]; name = opts.get('name', 'MODEL_CLOVEK'); texSize = int(opts.get('tex', 512))
    P, I, UV, texBytes = load_glb(src)
    y0 = P[:, 1].min(); h = P[:, 1].max() - y0; s = height / h
    # do súradníc hry: x = vpred (model +Z), y hore, z = vpravo (model -X)
    G = np.stack([P[:, 2] * s, (P[:, 1] - y0) * s, -P[:, 0] * s], 1)
    Y = G[:, 1] / height
    # konce rúk (najďalej do strán) a ramenné kĺby
    tips = {sd: G[np.argmax(G[:, 2] * sd)] for sd in (1, -1)}
    sl = lambda f, w=.006: G[np.abs(Y - f) < w]
    shY = RC['sh'] * height
    torso = sl(RC['sh'] + .01); shZ = np.abs(torso[:, 2]).max() * RC['shW']
    sh = {sd: np.array([np.median(sl(RC['sh'])[:, 0]), shY, sd * shZ]) for sd in (1, -1)}
    # spustenie rúk: otočenie okolo osi vpred v ramene; váha ruky podľa vzdialenosti od ramena a od trupu
    spine_a, spine_b = np.array([0, .5 * height, 0]), np.array([0, .86 * height, 0])
    for sd in (1, -1):
        a = sh[sd]; t = tips[sd]; d = t - a; ang = np.arctan2(abs(d[2]), -d[1]); rot = (ang - np.radians(RC['ang'])) * sd
        da = seg_dist(G, a + (t - a) * .12, t); ds = np.minimum(seg_dist(G, spine_a, spine_b), np.minimum(seg_dist(G, np.array([0, .05 * height, sd * .05 * height]), np.array([0, .5 * height, sd * .05 * height])), 1e9))
        w = np.clip((ds ** 4) / (da ** 4 + ds ** 4 + 1e-9), 0, 1) * (G[:, 2] * sd > shZ * .55)
        c, sn = np.cos(rot * w), np.sin(rot * w)
        dy, dz = G[:, 1] - a[1], G[:, 2] - a[2]
        G[:, 1], G[:, 2] = a[1] + dy * c - dz * sn, a[2] + dy * sn + dz * c
        tips[sd] = G[np.argmax(G[:, 2] * sd * (G[:, 1] < shY))]
    # kĺby
    t = tips[1]; a = sh[1]; d = t - a; L = np.linalg.norm(d); u = d / L
    wrist = t - u * .095 * height * .95; el = a + (wrist - a) * .55
    legZ = RC['legZ'] * height
    ankleY, kneeY, hipJY = .055 * height, RC['kn'] * height, RC['hip'] * height
    head = G[Y > RC['head']]; hcy = (head[:, 1].min() + head[:, 1].max()) / 2; mid = head[np.abs(head[:, 1] - hcy) < .02 * height]
    hc = np.array([(mid[:, 0].min() + mid[:, 0].max()) / 2, hcy, 0.0]); headD = np.ptp(mid[:, 0]); headW = np.ptp(mid[:, 2])
    headH = head[:, 1].max() - head[:, 1].min(); front = lambda y, z: G[(np.abs(G[:, 1] - y) < .012 * height) & (np.abs(G[:, 2] - z) < .012 * height) & (Y > RC['head'] - .02)][:, 0].max()
    eyeY = hc[1] + .1 * headH; eyeZ = .017 * height; eyeX = front(eyeY, eyeZ); mouthY = hc[1] - .27 * headH; mouthX = front(mouthY, 0)
    land = dict(race=race, height=height, ankleY=ankleY, kneeY=kneeY, hipJY=hipJY, legZ=legZ, shY=float(a[1]), shZ=float(abs(a[2])), shX=float(a[0]), el=[float(v) for v in el], wr=[float(v) for v in wrist],
                hc=[float(v) for v in hc], headH=float(headH), eye=[float(eyeX), float(eyeY), float(eyeZ)], mouth=[float(mouthX), float(mouthY)],
                chestD=float(np.ptp(sl(.72)[np.abs(sl(.72)[:, 2]) < shZ * .6][:, 0])), headD=float(headD), headW=float(headW), hipW=float(np.ptp(sl(.5)[np.abs(sl(.5)[:, 2]) < .12 * height][:, 2])),
                handTip=[float(v) for v in tips[1]])
    # zjednodušená verzia (zhlukovanie vrcholov v mriežke) pre vzdialené zástupy
    def cluster(cell):
        key = np.floor(G / cell).astype(np.int64); _, inv = np.unique(key, axis=0, return_inverse=True); inv = inv.ravel()
        n = inv.max() + 1; Pc = np.zeros((n, 3)); cnt = np.zeros(n); np.add.at(Pc, inv, G); np.add.at(cnt, inv, 1); Pc /= cnt[:, None]
        T = inv[I][(inv[I][:, 0] != inv[I][:, 1]) & (inv[I][:, 1] != inv[I][:, 2]) & (inv[I][:, 0] != inv[I][:, 2])]
        return Pc, T
    Pl, Il = cluster(.55)
    q = lambda A: base64.b64encode(np.round(A * 100).astype(np.int16).tobytes()).decode()
    ix = lambda A: base64.b64encode(A.astype(np.uint16).tobytes()).decode()
    out = {'land': land, 'p': q(G), 'i': ix(I), 'pl': q(Pl), 'il': ix(Il), 'n': [len(G), len(I), len(Pl), len(Il)]}
    if UV is not None and texBytes:   # UV súradnice (×10000, Uint16) a textúra zmenšená do JPEG
        from PIL import Image
        uv = np.clip(UV, 0, 1); out['uv'] = base64.b64encode(np.round(uv * 10000).astype(np.uint16).tobytes()).decode()
        im = Image.open(io.BytesIO(texBytes)).convert('RGB'); im = im.resize((texSize, texSize), Image.LANCZOS)
        # Meshy pečie do textúry tmavé tienenie – zosvetlenie (gama + roztiahnutie úrovní podľa vyplnených ostrovov), svetlo pridáva hra
        A = np.asarray(im).astype(np.float64) / 255; mask = A.max(axis=2) > .03; lo, hi = np.percentile(A[mask], 2), np.percentile(A[mask], 99.5)
        A = np.clip((A - lo) / max(1e-3, hi - lo), 0, 1) ** (1 / 1.35); A[~mask] = A[mask].mean(axis=0); im = Image.fromarray((A * 255).astype(np.uint8))
        bio = io.BytesIO(); im.save(bio, 'JPEG', quality=82); out['tex'] = 'data:image/jpeg;base64,' + base64.b64encode(bio.getvalue()).decode()
        print('textúra', texSize, 'px,', len(bio.getvalue()) // 1024, 'kB')
    open(dst, 'w').write('/* Telo (' + race + ') z modelu (import tools/model_import.py, zdroj: ' + src.split('/')[-1] + '): pozície ×100 (Int16), trojuholníky (Uint16), UV a textúra (ak sú), zjednodušená verzia a kĺby. */\nconst ' + name + ' = ' + json.dumps(out) + ';\n')
    print('vrcholy', len(G), 'trojuholníky', len(I), 'LOD', len(Pl), len(Il), json.dumps(land))

main()
