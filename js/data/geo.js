/*
 * Geografia Stredozeme: pobrežie Veľkého mora, veľké rieky so šírkou, jazerá, reťaze hôr a prechody cez rieky (mosty a brody).
 * Súradnice sú v jednotkách návrhu (svet 1800 × 1200, skutočná poloha = súradnica × K), rovnako ako v js/data/map.js.
 * Pri načítaní upraví MAPDATA: voda v mriežke terénu, žiadne lesy vo vode, hory podľa reťazí, dediny mimo vody.
 * Kreslenie: js/engine/scenes/MapScene.js (buildWater), veľká mapa js/engine/scenes/UIMaps.js; priechodnosť: js/sim/nav.js.
 */
const GEO = (() => {
    // pobrežie od severného okraja (záliv Forochel) po západnom brehu, cez záliv Lhûnu, na juh a po južnom brehu na východ;
    // more je všetko na západ a juh od tejto čiary (polygón sa uzavrie cez pravý dolný a ľavý horný roh)
    const COAST = [[300, 0], [262, 34], [205, 62], [150, 58], [108, 92], [78, 140], [58, 192], [46, 250], [40, 300], [36, 345], [34, 390], [38, 432], [42, 466],
        [82, 470], [116, 488], [104, 502], [62, 498], [32, 506], [36, 560], [30, 620], [40, 682], [46, 742], [60, 800], [82, 858], [110, 910], [142, 962], [190, 1010],
        [240, 1060], [290, 1110], [330, 1150], [380, 1166], [425, 1160], [500, 1170], [560, 1172], [640, 1164], [720, 1150], [800, 1142], [900, 1150], [1000, 1160],
        [1100, 1168], [1180, 1173], [1280, 1180], [1380, 1188], [1428, 1184], [1452, 1158], [1476, 1182], [1550, 1190], [1650, 1196], [1800, 1192]];
    const SEA = [...COAST, [1800, 1200], [0, 1200], [0, 0]];
    // jazerá: stred, polomery, natočenie; tvar je zvlnená elipsa (deterministicky)
    const LAKES = [
        { n: 'Večerné jazero', x: 350, y: 300, rx: 32, ry: 20, rot: .3 },
        { n: 'Dlhé jazero', x: 1228, y: 322, rx: 15, ry: 44, rot: .12 },
        { n: 'Nen Hithoel', x: 1196, y: 700, rx: 17, ry: 42, rot: -.35 },
        { n: 'More Rhûn', x: 1680, y: 400, rx: 85, ry: 50, rot: -.12 },
        { n: 'Núrnen', x: 1700, y: 892, rx: 55, ry: 28, rot: .08 }];
    // rieky: body toku od prameňa po ústie, šírka pri prameni a pri ústí
    const RIVERS = [
        { n: 'Anduin', w: [6, 24], pts: [[890, 100], [900, 200], [940, 300], [990, 400], [1045, 500], [1100, 590], [1160, 660], [1196, 700], [1214, 742], [1222, 772], [1290, 830], [1360, 870], [1430, 900], [1440, 960], [1405, 1015], [1440, 1065], [1495, 1095], [1490, 1140], [1462, 1176], [1458, 1215]] },
        { n: 'Brandyvína', w: [4, 13], pts: [[360, 318], [380, 430], [380, 520], [350, 620], [310, 720], [280, 800], [285, 900], [300, 1000], [330, 1090], [348, 1195]] },
        { n: 'Šedá voda', w: [4, 16], pts: [[690, 170], [650, 280], [620, 380], [590, 480], [550, 570], [520, 640], [480, 740], [440, 860], [410, 980], [395, 1090], [386, 1195]] },
        { n: 'Bruinen', w: [3, 5], pts: [[790, 250], [760, 280], [720, 300], [680, 315], [650, 322]] },
        { n: 'Isen', w: [3, 9], pts: [[585, 840], [600, 900], [605, 955], [580, 1030], [545, 1110], [526, 1195]] },
        { n: 'Entova voda', w: [3, 9], pts: [[930, 730], [1000, 770], [1080, 805], [1160, 830], [1250, 850], [1330, 872], [1395, 893]] },
        { n: 'Lhûn', w: [3, 9], pts: [[190, 150], [170, 250], [150, 340], [126, 420], [104, 486]] },
        { n: 'Bystrá', w: [4, 8], pts: [[1230, 366], [1300, 395], [1380, 412], [1460, 435], [1530, 440], [1604, 425]] },
        { n: 'Rýchla riečka', w: [3, 4], pts: [[1186, 222], [1204, 258], [1222, 282]] },
        { n: 'Celebrant', w: [2.5, 4], pts: [[900, 545], [960, 560], [1010, 552], [1060, 520]] }];
    // reťaze hôr: druh (snow / dark), veľkosť vrchov, body hrebeňa
    const RANGES = [
        { n: 'Hmlisté hory', k: 'snow', s: 36, pts: [[900, 80], [870, 170], [820, 260], [800, 360], [810, 450], [800, 540], [760, 640], [690, 740], [630, 800]] },
        { n: 'Ered Luin', k: 'snow', s: 28, pts: [[200, 200], [215, 320], [210, 440], [195, 560], [180, 680], [175, 760]] },
        { n: 'Biele hory', k: 'snow', s: 34, pts: [[700, 1060], [800, 1030], [900, 1000], [1000, 975], [1090, 975], [1180, 995], [1260, 1010]] },
        { n: 'Šedé hory', k: 'snow', s: 28, pts: [[940, 70], [1040, 80], [1140, 85], [1240, 95], [1330, 110]] },
        { n: 'Ered Lithui', k: 'dark', s: 32, pts: [[1470, 490], [1560, 482], [1650, 478], [1740, 482], [1795, 492]] },
        { n: 'Ephel Dúath', k: 'dark', s: 32, pts: [[1465, 500], [1470, 600], [1475, 700], [1478, 800], [1482, 900], [1500, 990], [1580, 1010], [1660, 1005], [1745, 995]] },
        { n: 'Železné vrchy', k: 'dark', s: 22, pts: [[1360, 212], [1430, 222], [1490, 236]] },
        { n: 'Emyn Muil', k: 'dark', s: 18, pts: [[1250, 640], [1290, 690]] },
        { n: 'Osamelá hora', k: 'snow', s: 44, pts: [[1196, 182]] }];
    // prechody cez rieky (hrady stojace na rieke sú prechodom samy: Tharbad, Osgiliath, Pelargir)
    const CROSS = [
        { n: 'Brandyvínsky most', k: 'most', x: 292, y: 770 }, { n: 'Sarnský brod', k: 'brod', x: 300, y: 1000 },
        { n: 'Brod pri Hollin', k: 'brod', x: 590, y: 480 }, { n: 'Isenské brody', k: 'brod', x: 605, y: 955 },
        { n: 'Lhûnsky most', k: 'most', x: 150, y: 340 }, { n: 'Bruinenský brod', k: 'brod', x: 720, y: 300 },
        { n: 'Starý brod', k: 'brod', x: 940, y: 300 }, { n: 'Lórienský brod', k: 'brod', x: 1045, y: 500 },
        { n: 'Entvadský brod', k: 'brod', x: 1120, y: 817 }, { n: 'Cair Andros', k: 'most', x: 1430, y: 900 },
        { n: 'Esgarothský most', k: 'most', x: 1300, y: 395 }, { n: 'Brod na Bystrej', k: 'brod', x: 1460, y: 435 },
        { n: 'Celebrantský most', k: 'most', x: 960, y: 560 }];
    // hrady, ktoré geografia posunula (more Rhûn)
    const MOVE = { 'Mistrand': [1760, 318] };

    // ---------- geometria ----------
    const inPoly = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
    /** Hladká krivka cez body (Catmull–Rom), n bodov na úsek. */
    const smooth = (P, n = 6) => { if (P.length < 3) return P.map(p => p.slice()); const out = []; for (let i = 0; i < P.length - 1; i++) { const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
        for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t; out.push([0, 1].map(c => .5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3))); } }
        out.push(P[P.length - 1].slice()); return out; };
    const lakePoly = L => { const out = [], s = L.x * .013 + L.y * .007; for (let i = 0; i < 48; i++) { const a = i / 48 * 6.283, r = 1 + .1 * Math.sin(3 * a + s) + .06 * Math.sin(5 * a + 2 * s), x = Math.cos(a) * L.rx * r, y = Math.sin(a) * L.ry * r; out.push([L.x + x * Math.cos(L.rot) - y * Math.sin(L.rot), L.y + x * Math.sin(L.rot) + y * Math.cos(L.rot)]); } return out; };
    const lakes = LAKES.map(L => ({ ...L, poly: lakePoly(L), bb: [L.x - L.rx * 1.3, L.y - L.ry * 1.3, L.x + L.rx * 1.3, L.y + L.ry * 1.3] }));
    const rivers = RIVERS.map(R => { const pts = smooth(R.pts, 6), n = pts.length - 1; const w = pts.map((p, i) => R.w[0] + (R.w[1] - R.w[0]) * i / n);
        const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); return { ...R, pts, wd: w, bb: [Math.min(...xs) - 20, Math.min(...ys) - 20, Math.max(...xs) + 20, Math.max(...ys) + 20] }; });
    const coast = smooth(COAST, 4), sea = [...coast, [1800, 1200], [0, 1200], [0, 0]];
    /** Vzdialenosť bodu od rieky (a šírka rieky v najbližšom bode). */
    const riverDist = (x, y, R) => { let best = 1e9, bw = 0; const P = R.pts; for (let i = 1; i < P.length; i++) { const [ax, ay] = P[i - 1], [bx, by] = P[i], dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1; let t = ((x - ax) * dx + (y - ay) * dy) / l2; t = Math.max(0, Math.min(1, t)); const d = Math.hypot(ax + dx * t - x, ay + dy * t - y); if (d < best) { best = d; bw = R.wd[i - 1] + (R.wd[i] - R.wd[i - 1]) * t; } } return [best, bw]; };
    const isSea = (x, y) => x < 0 || y < 0 || x > 1800 || y > 1200 || inPoly(x, y, sea);
    const lakeAt = (x, y) => lakes.find(L => x > L.bb[0] && x < L.bb[2] && y > L.bb[1] && y < L.bb[3] && inPoly(x, y, L.poly)) || null;
    /** Rieka v bode (pad = rezerva k polovici šírky), alebo null. */
    const riverAt = (x, y, pad = 0) => { for (const R of rivers) { if (x < R.bb[0] || x > R.bb[2] || y < R.bb[1] || y > R.bb[3]) continue; const [d, w] = riverDist(x, y, R); if (d < w / 2 + pad) return R; } return null; };
    const still = (x, y) => isSea(x, y) || !!lakeAt(x, y);   // stojatá voda (more, jazerá)

    // ---------- úprava dát mapy ----------
    function apply(M) {
        if (!M || M.geo) return; M.geo = 1;
        for (const c of M.castles) if (MOVE[c[0]]) [c[1], c[2]] = MOVE[c[0]];
        // dediny mimo vody: posun von z mora, jazera alebo rieky k hradu, ku ktorému patria
        for (const v of M.villages) {
            const wet = (x, y) => still(x, y) || riverAt(x, y, 8);
            if (!wet(v[1], v[2])) continue;
            const c = M.castles[v[3]] || M.castles[0]; let best = null;
            for (let r = 12; r < 200 && !best; r += 6) for (let a = 0; a < 6.283; a += .4) { const x = v[1] + Math.cos(a) * r, y = v[2] + Math.sin(a) * r; if (!wet(x, y) && (!best || Math.hypot(x - c[1], y - c[2]) < Math.hypot(best[0] - c[1], best[1] - c[2]))) best = [x, y]; }
            if (best) [v[1], v[2]] = best;
        }
        const T = M.terrain, cw = 1800 / T.cols, ch = 1200 / T.rows;
        for (let j = 0; j < T.rows; j++) for (let i = 0; i < T.cols; i++) {
            const x = (i + .5) * cw, y = (j + .5) * ch, k = j * T.cols + i;
            if (still(x, y)) { T.ground[k] = 29 + (i + j) % 4; T.forest[k] = 0; }          // voda v mriežke terénu (dlaždice vody)
            else if (riverAt(x, y, 5)) T.forest[k] = 0;                                     // pri rieke nerastie hustý les
        }
        // hory podľa reťazí: vrchy pozdĺž hrebeňa, striedavo väčšie a menšie; nie na hradoch, dedinách ani vo vode. Hora osudu ostáva.
        const keep = T.mountains.filter(m => m[3] === 'doom'), out = [...keep];
        const busy = (x, y, r) => M.castles.some(c => Math.hypot(c[1] - x, c[2] - y) < r) || M.villages.some(v => Math.hypot(v[1] - x, v[2] - y) < r * .7) || still(x, y) || riverAt(x, y, 6) || keep.some(m => Math.hypot(m[0] - x, m[1] - y) < m[2] * .8);
        let seed = 17; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
        for (const R of RANGES) {
            const P = smooth(R.pts, 8); let acc = 0;
            for (let i = 0; i < P.length; i++) {
                if (i) acc += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
                if (i && acc < R.s * .62 && i < P.length - 1) continue; acc = 0;
                const s = R.s * (.78 + rnd() * .45), ox = (rnd() - .5) * R.s * .5, oy = (rnd() - .5) * R.s * .4, x = P[i][0] + ox, y = P[i][1] + oy;
                if (busy(x, y, R.s * 1.1)) continue;
                out.push([x, y, s, R.k, Math.floor(rnd() * 3)]);
                if (R.s >= 30 && rnd() < .55) { const x2 = x + (rnd() - .5) * R.s, y2 = y + R.s * (.35 + rnd() * .3); if (!busy(x2, y2, R.s)) out.push([x2, y2, s * .7, R.k, Math.floor(rnd() * 3)]); }   // podhorie
            }
        }
        T.mountains = out.sort((a, b) => a[1] - b[1]);
    }
    if (typeof MAPDATA !== 'undefined') apply(MAPDATA);
    return { COAST: coast, SEA: sea, LAKES: lakes, RIVERS: rivers, RANGES, CROSS, isSea, lakeAt, riverAt, still, smooth, inPoly };
})();
