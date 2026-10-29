/*
 * GENERÁTOR SVETA: terén, lesy a hory pre mapu v editore Tiled (assets/maps/stredozem.json).
 * Súradnice návrhu sú 1800 × 1200 (mriežka 10), svet je 4,5× väčší.
 * Výsledok sa zapíše do vrstiev "zem", "lesy" a "hory"; v Tiled ich potom môžeš ďalej maľovať.
 */
const WORLD = { TILE: 10, COLS: 180, ROWS: 120, BASE: 4.5 };
const ROADS = [[0, 1], [1, 11], [1, 2], [1, 9], [9, 5], [5, 4], [4, 3], [4, 6], [6, 8], [6, 7], [7, 14], [14, 12], [12, 15], [15, 13], [3, 10], [2, 3], [3, 20], [20, 19], [19, 21], [7, 16], [16, 18], [18, 17], [17, 13], [6, 22], [22, 23], [22, 24], [24, 14], [4, 25], [25, 5], [26, 1], [26, 9], [9, 27], [1, 28], [28, 11], [13, 29], [29, 30], [16, 31], [20, 32], [33, 34], [34, 19], [0, 35], [3, 36], [36, 10], [22, 37], [37, 25], [3, 38], [38, 4], [38, 39], [39, 3], [15, 40], [40, 13], [14, 41], [9, 42], [42, 2], [2, 43], [16, 44], [44, 7], [35, 45], [45, 0], [33, 46], [46, 47], [47, 13], [35, 48]];
const RIVER = [[640, 0], [600, 300], [820, 420], [780, 640], [760, 800], [900, 880], [860, 1200]];   // dve bézierove krivky
const LAKE = { x: 1195, y: 326, rx: 110, ry: 60, rot: .2 };
const BIOME = { lush: 0, grass: 1, dry: 2, steppe: 3, ash: 4, sand: 5, snow: 6, sea: 7 };

function bez(p0, p1, p2, p3, t) { const u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]; }
function riverPoints() { const pts = []; for (const seg of [RIVER.slice(0, 4), RIVER.slice(3, 7)]) for (let t = 0; t <= 1.0001; t += .02) pts.push(bez(...seg, t)); return pts; }

function buildWorld(towns) {
    const tb = WORLD.TILE, rp = riverPoints(), ground = [], forest = [];
    const nearTown = (x, y, d) => towns.some(([n, tx, ty]) => Math.hypot(tx - x, ty - y) < d);
    const riverD = (x, y) => Math.min(...rp.map(p => Math.hypot(p[0] - x, p[1] - y)));
    const inLake = (x, y) => { const dx = x - LAKE.x, dy = y - LAKE.y, c = Math.cos(-LAKE.rot), s = Math.sin(-LAKE.rot); const u = dx * c - dy * s, v = dx * s + dy * c; return (u / LAKE.rx) ** 2 + (v / LAKE.ry) ** 2 < 1; };
    for (let j = 0; j < WORLD.ROWS; j++) for (let i = 0; i < WORLD.COLS; i++) {
        const x = (i + .5) * tb, y = (j + .5) * tb, n = fbm(x / 140, y / 140), v = Math.floor(hash2(i, j) * 4);
        let b;
        const t = x / 1800 + (n - .5) * .12;
        if (x < 30) b = 'sea';
        else if (y < 70 + n * 40) b = 'snow';
        else if (x > 1470 + (n - .5) * 40 && y > 40 && y < 1160 && !(y < 470 && x > 1560)) b = 'ash';
        else if (y > 1030 + (n - .5) * 60 && x > 1420) b = 'sand';
        else if (x > 1440 && y < 470) b = 'steppe';
        else b = t < .36 ? 'lush' : t < .6 ? 'grass' : t < .76 ? 'dry' : 'steppe';
        ground.push(1 + BIOME[b] * 4 + v);
        let f = 0;
        const fn = fbm(x / 70 + 50, y / 70 + 20);
        if (['lush', 'grass', 'dry'].includes(b) && x < 1450 && !inLake(x, y) && riverD(x, y) > 16 && !nearTown(x, y, 40) && fn > .63) f = 33 + Math.floor(hash2(i + 7, j + 3) * 4);
        else if (b === 'steppe' && fn > .72 && !nearTown(x, y, 40)) f = 37 + Math.floor(hash2(i, j + 9) * 2);
        else if (b === 'ash' && hash2(i + 3, j + 5) < .13 && !nearTown(x, y, 35)) f = 39 + Math.floor(hash2(i, j) * 2);
        forest.push(f);
    }
    // hory (deterministicky, mimo hradov)
    const R = rng(4242), mountains = [];
    const add = (x, y, s, kind) => { if (kind !== 'doom' && nearTown(x, y, 55)) return; mountains.push([+x.toFixed(1), +y.toFixed(1), +s.toFixed(1), kind, Math.floor(R() * 3)]); };
    for (let i = 0; i < 30; i++) add(i * 60 + R() * 30, 25 + R() * 55, 30 + R() * 28, 'snow');
    for (let i = 0; i < 26; i++) add(560 + R() * 150, 120 + R() * 380, 22 + R() * 22, 'snow');     // Hmlisté hory
    for (let i = 0; i < 60; i++) { const side = R(); add(side < .5 ? 1470 + R() * 60 : 1480 + R() * 300, side < .5 ? 60 + R() * 1080 : (R() < .5 ? 470 + R() * 40 : 840 + R() * 40), 22 + R() * 26, 'dark'); }
    add(1690, 600, 95, 'doom');
    mountains.sort((a, b) => a[1] - b[1]);
    return { cols: WORLD.COLS, rows: WORLD.ROWS, ground, forest, mountains, river: RIVER, lake: LAKE };
}

function terrainSheet() {
    const T = ART.TILE, cv = mkCanvas(T * 8, T * 5), c = cv.getContext('2d');
    const at = (k, fn) => { c.save(); c.translate((k % 8) * T, Math.floor(k / 8) * T); c.beginPath(); c.rect(0, 0, T, T); c.clip(); fn(c); c.restore(); };
    for (let b = 0; b < 8; b++) for (let v = 0; v < 4; v++) at(b * 4 + v, c => ART.groundTile(c, b, v));
    for (let v = 0; v < 4; v++) at(32 + v, c => ART.forestTile(c, v, false));
    for (let v = 0; v < 2; v++) at(36 + v, c => ART.forestTile(c, v, true));
    for (let v = 0; v < 2; v++) at(38 + v, c => ART.crackTile(c, v));
    return cv;
}

/** Zmenšená sada dlaždíc (10 px) iba na úpravu mapy v editore Tiled. */
function terrainSheetSmall(big) {
    const cv = mkCanvas(80, 50), c = cv.getContext('2d');
    c.imageSmoothingQuality = 'high'; c.drawImage(big, 0, 0, 80, 50);
    return cv;
}
