#!/usr/bin/env python3
"""
Import modelu postavy (GLB, napr. z Meshy) do hry: telo človeka pre 3D bitku.
Použitie: python3 tools/model_import.py vstup.glb js/data/model_clovek.js [vyska=25.5] [--race=human|orc] [--name=MODEL_CLOVEK] [--tex=512]
- --fwd=-x|+x|-z ak model nepozerá na +Z (napr. kôň modelovaný pozdĺž osi x), --kind=beast pre zvieratá a bossov (bez kĺbov),
- --kind=garment pre brnenia (samostatný odev, telu sa prispôsobí v hre), --kind=prop pre zbrane (--grip=sword|pole, --at, --tris; dĺžka namiesto výšky),
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

OPTS = {}
RACES = {   # pomery pre hľadanie kĺbov: výška ramien, kolien, bedier, hlavy (podiel výšky), šírka pliec (podiel polšírky trupu)
    'human': dict(sh=.79, kn=.29, hip=.52, head=.875, shW=.8, legZ=.05, ang=16),
    'orc': dict(sh=.80, kn=.27, hip=.50, head=.86, shW=.82, legZ=.06, ang=18),
    'elf': dict(sh=.79, kn=.29, hip=.52, head=.875, shW=.8, legZ=.05, ang=16),
    'uruk': dict(sh=.79, kn=.28, hip=.51, head=.87, shW=.82, legZ=.06, ang=17),
    'hobbit': dict(sh=.72, kn=.25, hip=.47, head=.80, shW=.8, legZ=.06, ang=16),
    'dwarf': dict(sh=.74, kn=.25, hip=.48, head=.82, shW=.85, legZ=.07, ang=16),
    'troll': dict(sh=.80, kn=.27, hip=.48, head=.88, shW=.8, legZ=.08, ang=20),
    'wraith': dict(sh=.80, kn=.28, hip=.50, head=.86, shW=.75, legZ=.05, ang=10),
}
def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]; opts = dict(a[2:].split('=', 1) if '=' in a else (a[2:], '1') for a in sys.argv[1:] if a.startswith('--')); OPTS.update(opts)
    src, dst = args[0], args[1]; height = float(args[2]) if len(args) > 2 else 25.5
    race = opts.get('race', 'human'); RC = RACES.get(race, RACES['human']); name = opts.get('name', 'MODEL_CLOVEK'); texSize = int(opts.get('tex', 512))
    P, I, UV, texBytes = load_glb(src)
    if opts.get('kind') == 'garment': return garment(P, I, UV, texBytes, opts, dst, name, src)
    if opts.get('kind') == 'prop': return prop(P, I, UV, texBytes, opts, dst, name, texSize, src, height)
    y0 = P[:, 1].min(); h = P[:, 1].max() - y0; s = height / h
    # do súradníc hry: x = vpred (model +Z), y hore, z = vpravo (model -X); --fwd=-x|+x|-z určí, kam model pozerá, ak nie na +Z
    fwd = opts.get('fwd', '+z')
    if fwd == '-x': P = np.stack([P[:, 2], P[:, 1], -P[:, 0]], 1)
    elif fwd == '+x': P = np.stack([-P[:, 2], P[:, 1], P[:, 0]], 1)
    elif fwd == '-z': P = np.stack([-P[:, 0], P[:, 1], -P[:, 2]], 1)
    G = np.stack([P[:, 2] * s, (P[:, 1] - y0) * s, -P[:, 0] * s], 1)
    Y = G[:, 1] / height
    if opts.get('kind') == 'beast':   # zviera alebo boss: bez kĺbov, len obálka; kostru a váhy si hra určí podľa druhu
        G[:, 0] -= (G[:, 0].min() + G[:, 0].max()) / 2; G[:, 2] -= (G[:, 2].min() + G[:, 2].max()) / 2
        land = dict(kind='beast', race=race, height=height, bbox=[[float(v) for v in G.min(0)], [float(v) for v in G.max(0)]])
        return finish(G, I, UV, texBytes, land, dst, name, texSize, src, lodCell=float(opts.get('lod', 1.2)))
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
    def front2(y, z):
        for w in (.012, .02, .035, .06):
            sel = G[(np.abs(G[:, 1] - y) < w * height) & (np.abs(G[:, 2] - z) < w * height) & (Y > RC['head'] - .04)]
            if len(sel): return sel[:, 0].max()
        return hc[0] + headD / 2
    eyeY = hc[1] + .1 * headH; eyeZ = .017 * height; eyeX = front2(eyeY, eyeZ); mouthY = hc[1] - .27 * headH; mouthX = front2(mouthY, 0)
    land = dict(race=race, height=height, ankleY=ankleY, kneeY=kneeY, hipJY=hipJY, legZ=legZ, shY=float(a[1]), shZ=float(abs(a[2])), shX=float(a[0]), el=[float(v) for v in el], wr=[float(v) for v in wrist],
                hc=[float(v) for v in hc], headH=float(headH), eye=[float(eyeX), float(eyeY), float(eyeZ)], mouth=[float(mouthX), float(mouthY)],
                chestD=float(np.ptp(sl(.72)[np.abs(sl(.72)[:, 2]) < shZ * .6][:, 0])), headD=float(headD), headW=float(headW), hipW=float(np.ptp(sl(.5)[np.abs(sl(.5)[:, 2]) < .12 * height][:, 2])),
                handTip=[float(v) for v in tips[1]])
    return finish(G, I, UV, texBytes, land, dst, name, texSize, src)

def cluster_simplify(P, I, col, base, target):
    """Zjednodušenie zhlukovaním vrcholov v mriežke (bunka base, zväčšuje sa, kým nie je trojuholníkov najviac target); farby vrcholov sa spriemerujú."""
    k = 1.0
    while True:
        key = np.floor(P / (base * k)).astype(np.int64); _, inv = np.unique(key, axis=0, return_inverse=True); inv = inv.ravel(); n = inv.max() + 1
        J = inv[I]; J = J[(J[:, 0] != J[:, 1]) & (J[:, 1] != J[:, 2]) & (J[:, 0] != J[:, 2])]
        _, first = np.unique(np.sort(J, 1), axis=0, return_index=True); J = J[np.sort(first)]
        if len(J) <= target: break
        k *= 1.15
    cnt = np.bincount(inv, minlength=n).astype(np.float64); Pc = np.zeros((n, 3)); C = np.zeros((n, 3)); np.add.at(Pc, inv, P); np.add.at(C, inv, col); Pc /= np.maximum(cnt, 1)[:, None]; C /= np.maximum(cnt, 1)[:, None]
    used = np.unique(J); remap = -np.ones(n, np.int64); remap[used] = np.arange(len(used)); return Pc[used], remap[J], C[used]

def rgbm(C):   # farba a príznak kovu (svetlé a málo sýte = oceľ, striebro; zlatá s vyšším jasom tiež)
    mx, mn = C.max(1), C.min(1); sat = (mx - mn) / np.maximum(mx, 1e-3); metal = ((sat < .22) & (mx > .42)) | ((sat < .55) & (mx > .62) & (C[:, 0] >= C[:, 2]))
    A = np.clip((C - .02) / .9, 0, 1) ** (1 / 1.15)
    return np.hstack([np.round(A * 255), (metal * 255)[:, None]]).astype(np.uint8)

def tex_colors(UV, texBytes):
    from PIL import Image
    T = np.asarray(Image.open(io.BytesIO(texBytes)).convert('RGB').resize((512, 512), Image.LANCZOS)).astype(np.float64) / 255
    return T[(np.clip(UV[:, 1], 0, .999) * 512).astype(int), (np.clip(UV[:, 0], 0, .999) * 512).astype(int)]

def garment(P, I, UV, texBytes, opts, dst, name, src):
    """Brnenie alebo odev (--kind=garment): samostatný kus odevu z Meshy (tvárou do +Z, ruky spustené). Odstráni stojan figuríny (valec pod
    vodorovným viečkom navrchu), zapečie farby do vrcholov, zjednoduší sieť a zapíše orientačné body: výstrih, lem, šírka pliec, hĺbka a stred hrude.
    Telu sa prispôsobí až v hre (js/engine/garment.js) podľa rasy: rukávy podľa najbližšej časti tela."""
    col = tex_colors(UV, texBytes); y1 = P[:, 1].max(); h = np.ptp(P[:, 1])
    hi = np.percentile(col, 99.5); col = np.clip(col * min(1.25, .95 / max(hi, 1e-3)), 0, 1) ** (1 / 1.15)   # Meshy pečie do textúry tiene – mierne zosvetlenie (tmavá oceľ ostane tmavá)
    T = P[I]; N = np.cross(T[:, 1] - T[:, 0], T[:, 2] - T[:, 0]); N /= np.maximum(np.linalg.norm(N, axis=1), 1e-12)[:, None]; C = T.mean(1)
    cx0, cz0 = (P[:, 0].min() + P[:, 0].max()) / 2, (P[:, 2].min() + P[:, 2].max()) / 2
    cap = (np.abs(N[:, 1]) > .85) & (C[:, 1] > y1 - .05 * h) & (np.hypot(C[:, 0] - cx0, C[:, 2] - cz0) < .16 * h)
    if cap.sum() >= 6:   # stojan figuríny: všetko vo valci pod viečkom (aj vysoký golier, ktorý by na hre prenikal krkom)
        cc = C[cap].mean(0); rc = np.max(np.hypot(T[cap][:, :, 0] - cc[0], T[cap][:, :, 2] - cc[2]))
        keep = ~((np.hypot(C[:, 0] - cc[0], C[:, 2] - cc[2]) < rc * 1.12) & (C[:, 1] > y1 - .25 * h)); print('stojan: odstránených', int((~keep).sum()), 'trojuholníkov, polomer %.3f' % rc)
        I = I[keep]
    s = 30 / h; G0 = np.stack([P[:, 2], P[:, 1], -P[:, 0]], 1) * s   # do súradníc hry: x vpred, y hore, z vpravo; výška odevu 30
    def stats(G):   # vrch (výstrih), lem, šírka pliec (najďalej do strán tesne pod výstrihom, aj s rukávmi), hĺbka a stred hrude
        yT, yB = G[:, 1].max(), G[:, 1].min(); H = yT - yB
        top = G[(G[:, 1] < yT - .06 * H) & (G[:, 1] > yT - .16 * H)]; shW = float(np.percentile(np.abs(top[:, 2]), 99))
        ch = G[(np.abs(G[:, 1] - (yT - .2 * H)) < .03 * H) & (np.abs(G[:, 2]) < shW * .35)]
        return dict(yT=float(yT), yB=float(yB), shW=shW, chD=float(np.ptp(ch[:, 0])), cx=float((ch[:, 0].min() + ch[:, 0].max()) / 2))
    target = int(opts.get('tris', 4200))
    base = np.full(3, h * .004)
    Pc, Jc, Cc = cluster_simplify(P, I, col, base, target); G = np.stack([Pc[:, 2], Pc[:, 1], -Pc[:, 0]], 1) * s
    Pl, Jl, Cl = cluster_simplify(P, I, col, base, max(300, target // 6)); Gl = np.stack([Pl[:, 2], Pl[:, 1], -Pl[:, 0]], 1) * s
    land = dict(kind='garment', **stats(G))
    q = lambda A: base64.b64encode(np.round(A * 100).astype(np.int16).tobytes()).decode(); ix = lambda A: base64.b64encode(A.astype(np.uint16).tobytes()).decode(); cb = lambda C: base64.b64encode(rgbm(C).tobytes()).decode(); u8 = lambda A: base64.b64encode(A.astype(np.uint8).tobytes()).decode()
    out = {'land': land, 'p': q(G), 'i': ix(Jc), 'c': cb(Cc), 'pl': q(Gl), 'il': ix(Jl), 'cl': cb(Cl), 'n': [len(G), len(Jc), len(Gl), len(Jl)]}
    open(dst, 'w').write('/* Brnenie z modelu (import tools/model_import.py --kind=garment, zdroj: ' + src.split('/')[-1] + '): pozície ×100 (Int16, výška 30, x vpred), trojuholníky (Uint16), farby vrcholov RGB + kov, zjednodušená verzia, orientačné body; telu sa prispôsobí v hre. */\nconst ' + name + ' = ' + json.dumps(out) + ';\n')
    print(name, 'trojuholníky', len(Jc), 'LOD', len(Jl), 'vrcholy', len(G), 'kov', round(float((rgbm(Cc)[:, 3] > 0).mean()), 2), json.dumps(land)[:300])

def prop(P, I, UV, texBytes, opts, dst, name, texSize, src, length):
    """Zbraň (--kind=prop): model stojí zvisle (os y). Do súradníc kosti ruky v hre: rukoväť v počiatku, čepeľ alebo hrot smerom -y.
    --grip=sword: rukoväť hore (záštita = najširšie miesto v hornej časti), ostrie do ±z ako meče kreslené kódom;
    --grip=pole: hrot hore (kopija, sekera, palica), drží sa vo výške --at (podiel dĺžky od spodného konca), ostrie do +x.
    Textúra z Meshy je rozdelená na stovky ostrovov, preto sa farby zapečú do vrcholov (a kov sa označí na lesk) a sieť sa zjednoduší
    zhlukovaním vrcholov na --tris trojuholníkov (plná) a asi 300 (vzdialený zástup)."""
    from PIL import Image
    y0, y1 = P[:, 1].min(), P[:, 1].max(); s = length / (y1 - y0); grip = opts.get('grip', 'sword')
    col = tex_colors(UV, texBytes)
    def simplify(target):
        ext = np.ptp(P, 0); base = np.maximum(ext / np.array([16, 80, 16]) * .4, (y1 - y0) * .004); base[1] = max(base[1], (y1 - y0) * .012)
        return cluster_simplify(P, I, col, base, target)
    def toGame(Pc):
        if grip == 'sword':
            top = P[P[:, 1] > y1 - (y1 - y0) * .4]; bins = np.linspace(y1 - (y1 - y0) * .4, y1, 41)
            wid = [np.ptp(top[(top[:, 1] >= a) & (top[:, 1] < b)][:, 0]) if ((top[:, 1] >= a) & (top[:, 1] < b)).any() else 0 for a, b in zip(bins[:-1], bins[1:])]
            k = int(np.argmax(wid)); guard = (bins[k] + bins[k + 1]) / 2; oy = guard + (y1 - guard) * .55; cx, cz = (P[:, 0].min() + P[:, 0].max()) / 2, (P[:, 2].min() + P[:, 2].max()) / 2
            return np.stack([-(Pc[:, 2] - cz), Pc[:, 1] - oy, Pc[:, 0] - cx], 1) * s, (y0 - oy) * s
        oy = y0 + (y1 - y0) * float(opts.get('at', .3)); cz = (P[:, 2].min() + P[:, 2].max()) / 2
        return np.stack([Pc[:, 0], -(Pc[:, 1] - oy), -(Pc[:, 2] - cz)], 1) * s, -(y1 - oy) * s
    target = int(opts.get('tris', 1800))
    Pc, Jc, Cc = simplify(target); G, tip = toGame(Pc); Pl, Jl, Cl = simplify(max(160, target // 6)); Gl, _ = toGame(Pl)
    land = dict(kind='prop', grip=grip, len=length, tip=float(tip), bbox=[[float(v) for v in G.min(0)], [float(v) for v in G.max(0)]])
    q = lambda A: base64.b64encode(np.round(A * 100).astype(np.int16).tobytes()).decode(); ix = lambda A: base64.b64encode(A.astype(np.uint16).tobytes()).decode(); cb = lambda C: base64.b64encode(rgbm(C).tobytes()).decode()
    out = {'land': land, 'p': q(G), 'i': ix(Jc), 'c': cb(Cc), 'pl': q(Gl), 'il': ix(Jl), 'cl': cb(Cl), 'n': [len(G), len(Jc), len(Gl), len(Jl)]}
    open(dst, 'w').write('/* Zbraň z modelu (import tools/model_import.py --kind=prop, zdroj: ' + src.split('/')[-1] + '): pozície ×100 (Int16) v súradniciach ruky, trojuholníky (Uint16), farby vrcholov RGB + kov (Uint8), zjednodušená verzia. */\nconst ' + name + ' = ' + json.dumps(out) + ';\n')
    print(name, 'trojuholníky', len(Jc), 'LOD', len(Jl), 'kov', round(float((rgbm(Cc)[:, 3] > 0).mean()), 2), 'hrot', round(float(tip), 1))

def finish(G, I, UV, texBytes, land, dst, name, texSize, src, lodCell=.55):
    race = land.get('race', '')
    # zjednodušená verzia (zhlukovanie vrcholov v mriežke) pre vzdialené zástupy
    UVc = None
    def cluster(cell, keepUV=False):
        key = np.floor(G / cell).astype(np.int64)
        if UV is not None and keepUV: key = np.hstack([key, np.floor(UV * 48).astype(np.int64)])   # odľahčenie: vrcholy na švoch textúry ostanú oddelené (inak sa textúra rozmaže)
        _, inv = np.unique(key, axis=0, return_inverse=True); inv = inv.ravel()
        n = inv.max() + 1; Pc = np.zeros((n, 3)); cnt = np.zeros(n); np.add.at(Pc, inv, G); np.add.at(cnt, inv, 1); Pc /= cnt[:, None]
        nonlocal UVc
        if UV is not None: UVc = np.zeros((n, 2)); np.add.at(UVc, inv, UV); UVc /= cnt[:, None]
        T = inv[I][(inv[I][:, 0] != inv[I][:, 1]) & (inv[I][:, 1] != inv[I][:, 2]) & (inv[I][:, 0] != inv[I][:, 2])]
        return Pc, T
    Pl, Il = cluster(lodCell)
    lite = float(OPTS.get('lite', 0))   # --lite=0.3: odľahčená verzia pre hru v jednom súbore (menej vrcholov, textúra 256 px)
    if lite: G, I = cluster(lite, True); UV = None if UV is None else UVc; print('odľahčené:', len(G), 'vrcholov,', len(I), 'trojuholníkov')
    q = lambda A: base64.b64encode(np.round(A * 100).astype(np.int16).tobytes()).decode()
    assert np.abs(G).max() * 100 < 32000, 'model je príliš veľký pre Int16'
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
    print('vrcholy', len(G), 'trojuholníky', len(I), 'LOD', len(Pl), len(Il), json.dumps(land)[:200])

main()
