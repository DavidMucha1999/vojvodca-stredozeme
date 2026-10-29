/*
 * GENERÁTOR GRAFIKY: kreslenie obrázkov pre assets/.
 * Všetko sa kreslí v dvojnásobnom rozlíšení (S = 2). Výsledné PNG súbory
 * sa dajú kedykoľvek nahradiť ručne kreslenými obrázkami s rovnakým menom
 * a rozmermi – hra si ich načíta bez zmeny kódu.
 */
const S = 2;
const ART = {};

/* ---------- pomocné ---------- */
function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
function hash2(x, y) { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, s = t => t * t * (3 - 2 * t);
    const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
    return a + (b - a) * s(xf) + (c - a) * s(yf) + (a - b - c + d) * s(xf) * s(yf);
}
function fbm(x, y) { return vnoise(x, y) * .55 + vnoise(x * 2.1, y * 2.1) * .3 + vnoise(x * 4.3, y * 4.3) * .15; }
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255;
    const m = v => Math.max(0, Math.min(255, Math.round(f >= 1 ? v + (255 - v) * (f - 1) : v * f)));
    return '#' + ((1 << 24) + (m(r) << 16) + (m(g) << 8) + m(b)).toString(16).slice(1);
}
function ell(c, x, y, rx, ry, rot, fill, stroke, lw) {
    c.beginPath(); c.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot || 0, 0, Math.PI * 2);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); }
}

/* ---------- bezšvové textúry (dlaždice) ---------- */
function blobs(c, w, h, seed, n, cols, rmin, rmax, alpha) {
    const R = rng(seed);
    for (let i = 0; i < n; i++) {
        const x = R() * w, y = R() * h, r = rmin + R() * (rmax - rmin);
        c.globalAlpha = alpha * (.4 + R() * .6);
        c.fillStyle = cols[Math.floor(R() * cols.length)];
        for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) { c.beginPath(); c.arc(x + dx, y + dy, r, 0, 7); c.fill(); }
    }
    c.globalAlpha = 1;
}
function strokes(c, w, h, seed, n, col, len, lw) {
    const R = rng(seed); c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round';
    for (let i = 0; i < n; i++) {
        const x = R() * w, y = R() * h, a = -Math.PI / 2 + (R() - .5) * .9, l = len * (.6 + R() * .6);
        for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) { c.beginPath(); c.moveTo(x + dx, y + dy); c.lineTo(x + dx + Math.cos(a) * l, y + dy + Math.sin(a) * l); c.stroke(); }
    }
}

const BIOMES = [
    { id: 'lush', base: '#4a6d33', dark: ['#3a5a28', '#34522a'], light: ['#5c8240', '#6a8c48'], blade: 'rgba(30,60,24,.55)' },
    { id: 'grass', base: '#5a6a36', dark: ['#4a5a2c', '#46552a'], light: ['#6c7c42', '#788448'], blade: 'rgba(40,58,24,.5)' },
    { id: 'dry', base: '#6e6a3e', dark: ['#5e5a34', '#58502e'], light: ['#827c4a', '#8c8450'], blade: 'rgba(70,64,30,.5)' },
    { id: 'steppe', base: '#76603e', dark: ['#62503a', '#5a4a34'], light: ['#8a7450', '#94805a'], blade: 'rgba(80,60,34,.45)' },
    { id: 'ash', base: '#3a2a26', dark: ['#2a1c1a', '#241816'], light: ['#4a3630', '#55403a'], blade: 'rgba(20,10,8,.5)' },
    { id: 'sand', base: '#b8955a', dark: ['#a68250', '#9c784a'], light: ['#c8a86a', '#d4b478'], blade: 'rgba(140,100,50,.35)' },
    { id: 'snow', base: '#d8dee6', dark: ['#c2cad6', '#b8c2d0'], light: ['#eef2f6', '#ffffff'], blade: 'rgba(160,170,190,.4)' },
    { id: 'sea', base: '#24526a', dark: ['#1c4258', '#1a3c50'], light: ['#2e6680', '#3a7690'], blade: 'rgba(160,210,230,.25)' }
];
ART.TILE = 90;    // px v textúre (2× zo 45 jednotiek sveta = 10 jednotiek návrhu)

ART.groundTile = (c, bi, v) => {
    const T = ART.TILE, b = BIOMES[bi];
    c.fillStyle = b.base; c.fillRect(0, 0, T, T);
    blobs(c, T, T, bi * 97 + v * 13 + 1, 22, b.dark, 6, 20, .28);
    blobs(c, T, T, bi * 131 + v * 17 + 5, 18, b.light, 4, 14, .22);
    if (b.id === 'sea') {
        c.strokeStyle = b.blade; c.lineWidth = 2;
        const R = rng(v * 7 + 3);
        for (let i = 0; i < 9; i++) { const x = R() * T, y = R() * T; c.beginPath(); c.arc(x, y, 8 + R() * 8, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
    } else if (b.id !== 'ash' && b.id !== 'snow') strokes(c, T, T, bi * 53 + v * 29 + 9, 60, b.blade, 6, 1.4);
    if (b.id === 'ash') {
        const R = rng(v * 11 + 2); c.fillStyle = 'rgba(0,0,0,.25)';
        for (let i = 0; i < 30; i++) c.fillRect(R() * T, R() * T, 2, 2);
    }
};
ART.forestTile = (c, v, dead) => {
    // bezšvová dlaždica: stromy pri okraji sa nakreslia aj na protiľahlej strane, susedné dlaždice tak plynule nadväzujú
    const T = ART.TILE, R = rng(v * 77 + (dead ? 500 : 0) + 1), trees = [];
    if (!dead) { c.fillStyle = 'rgba(18,40,16,.35)'; c.fillRect(0, 0, T, T); }
    const n = dead ? 7 : 13;
    for (let i = 0; i < n; i++) { const x = R() * T, y = R() * T, s = .75 + R() * .45, k = dead ? 2 : (R() < .3 ? 1 : 0); for (const dx of [-T, 0, T]) for (const dy of [-T, 0, T]) trees.push([x + dx, y + dy, s, k]); }
    trees.filter(([x, y]) => x > -20 && x < T + 20 && y > -4 && y < T + 40).sort((a, b) => a[1] - b[1]).forEach(([x, y, s, k]) => ART.tree(c, x, y, s * 1.45, k));
};
ART.crackTile = (c, v) => {
    const T = ART.TILE, R = rng(v * 41 + 7);
    c.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
        let x = R() * T, y = R() * T; c.beginPath(); c.moveTo(x, y);
        for (let k = 0; k < 4; k++) { x += (R() - .5) * 30; y += (R() - .5) * 30; c.lineTo(x, y); }
        c.strokeStyle = 'rgba(255,110,30,.55)'; c.lineWidth = 3; c.stroke();
        c.strokeStyle = 'rgba(255,200,90,.6)'; c.lineWidth = 1; c.stroke();
    }
};

/* ---------- stromy, hory ---------- */
ART.tree = (c, x, y, s, kind) => {
    ell(c, x + 3 * s, y + 2 * s, 9 * s, 3.5 * s, 0, 'rgba(0,0,0,.28)');
    if (kind === 2) {           // mŕtvy strom
        c.strokeStyle = '#2a201a'; c.lineWidth = 2 * s; c.lineCap = 'round';
        c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 16 * s); c.moveTo(x, y - 9 * s); c.lineTo(x - 6 * s, y - 15 * s); c.moveTo(x, y - 12 * s); c.lineTo(x + 5 * s, y - 18 * s); c.stroke();
        return;
    }
    c.fillStyle = '#4a3420'; c.fillRect(x - 1.5 * s, y - 5 * s, 3 * s, 7 * s);
    if (kind === 1) {           // listnatý
        [['#2c4a22', 0, -13, 9], ['#3a5c2a', -3, -15, 6], ['#4a6e34', 2, -17, 4.5]].forEach(([col, dx, dy, r]) => ell(c, x + dx * s, y + dy * s, r * s, r * .9 * s, 0, col));
        return;
    }
    for (let i = 0; i < 3; i++) {   // ihličnatý
        c.fillStyle = ['#1f4a26', '#2a5c2e', '#357038'][i];
        c.beginPath(); c.moveTo(x, y - (24 - i * 5) * s); c.lineTo(x + (10 - i * 2) * s, y - (4 - i * 5) * s); c.lineTo(x - (10 - i * 2) * s, y - (4 - i * 5) * s); c.fill();
    }
    c.fillStyle = 'rgba(255,255,220,.12)'; c.beginPath(); c.moveTo(x, y - 24 * s); c.lineTo(x - 6 * s, y - 8 * s); c.lineTo(x, y - 9 * s); c.fill();
};
ART.mountain = (c, w, h, kind, seed) => {
    const R = rng(seed), cx = w / 2, base = h * .92, top = h * .08, hw = w * .48;
    const peaks = [[cx, top]];
    if (kind !== 'doom') { peaks.push([cx - hw * .45, top + h * (.22 + R() * .15)]); peaks.push([cx + hw * .5, top + h * (.25 + R() * .15)]); }
    ell(c, cx + w * .04, base, hw * 1.05, h * .06, 0, 'rgba(0,0,0,.3)');
    const lit = kind === 'snow' ? '#9a928a' : '#5a4a44', dk = kind === 'snow' ? '#5e5650' : '#2a1c18';
    peaks.sort((a, b) => a[1] - b[1]).reverse().forEach(([px, py], i) => {
        const pw = hw * (i === peaks.length - 1 ? 1 : .62);
        c.fillStyle = lit; c.beginPath(); c.moveTo(px, py); c.lineTo(px - pw, base); c.lineTo(px + pw * .08, base); c.fill();
        c.fillStyle = dk; c.beginPath(); c.moveTo(px, py); c.lineTo(px + pw, base); c.lineTo(px + pw * .08, base); c.fill();
        c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 2;
        for (let k = 0; k < 4; k++) { const t = .25 + k * .17; c.beginPath(); c.moveTo(px + pw * t * .3, py + (base - py) * t); c.lineTo(px + pw * t * .7, py + (base - py) * (t + .12)); c.stroke(); }
        if (kind === 'snow') {
            c.fillStyle = '#f2f4f8'; c.beginPath(); c.moveTo(px, py);
            c.lineTo(px - pw * .3, py + (base - py) * .32); c.lineTo(px - pw * .12, py + (base - py) * .26); c.lineTo(px + pw * .05, py + (base - py) * .36); c.lineTo(px + pw * .3, py + (base - py) * .28); c.fill();
            c.fillStyle = '#c8d0dc'; c.beginPath(); c.moveTo(px, py); c.lineTo(px + pw * .3, py + (base - py) * .28); c.lineTo(px + pw * .05, py + (base - py) * .36); c.fill();
        }
    });
    if (kind === 'doom') {
        c.fillStyle = '#1a0c08'; c.beginPath(); c.moveTo(cx - w * .06, top); c.lineTo(cx + w * .06, top); c.lineTo(cx + w * .04, top + h * .06); c.lineTo(cx - w * .04, top + h * .06); c.fill();
        c.strokeStyle = '#ff6a1a'; c.lineWidth = 6; c.lineCap = 'round';
        c.beginPath(); c.moveTo(cx - w * .02, top + h * .04); c.quadraticCurveTo(cx - w * .08, top + h * .4, cx - w * .2, base - h * .05); c.stroke();
        c.strokeStyle = '#ffc060'; c.lineWidth = 2; c.stroke();
        const g = c.createRadialGradient(cx, top, 2, cx, top, w * .25); g.addColorStop(0, 'rgba(255,130,40,.8)'); g.addColorStop(1, 'rgba(255,60,0,0)');
        c.fillStyle = g; c.fillRect(0, 0, w, h * .5);
    }
};

/* ---------- vojaci ---------- */
/* Kreslenie vojakov je v js/render/soldiers.js (používa ho aj hra pre hrdinu a ikonky výbavy). */
ART.UNIT_FRAME = Soldiers.FRAME;
ART.FRAMES = Soldiers.FRAMES;
ART.UNITS = Soldiers.UNITS;
ART.drawUnit = Soldiers.drawUnit;
ART.unitSheet = Soldiers.sheet;

/* ---------- bojisko ---------- */
ART.groundTex = (biome) => {
    const T = 512, cv = mkCanvas(T, T), c = cv.getContext('2d');
    const P = { g: ['#46683a', ['#3a5a30', '#36522c'], ['#58783e', '#628244'], 'rgba(20,50,20,.45)'], a: ['#3e2c26', ['#2c1e1a', '#261a16'], ['#4e3a32', '#5a443a'], 'rgba(0,0,0,.3)'], d: ['#b89a62', ['#a68656', '#9c7c4e'], ['#cab074', '#d6bc80'], 'rgba(130,95,50,.35)'], s: ['#dfe5ec', ['#c8d0dc', '#bec8d6'], ['#f2f5f8', '#ffffff'], 'rgba(170,180,200,.35)'] }[biome];
    c.fillStyle = P[0]; c.fillRect(0, 0, T, T);
    blobs(c, T, T, 11, 120, P[1], 14, 60, .4);
    blobs(c, T, T, 23, 90, P[2], 10, 44, .32);
    strokes(c, T, T, 31, biome === 'g' ? 700 : 260, P[3], biome === 'g' ? 12 : 8, 2);
    if (biome === 'a') { const R = rng(5); c.strokeStyle = 'rgba(255,110,30,.35)'; c.lineWidth = 3; for (let i = 0; i < 10; i++) { let x = R() * T, y = R() * T; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (R() - .5) * 50; y += (R() - .5) * 50; c.lineTo(x, y); } c.stroke(); } }
    return cv;
};
ART.waterTex = () => {
    const T = 256, cv = mkCanvas(T, T), c = cv.getContext('2d');
    c.fillStyle = '#2f6a86'; c.fillRect(0, 0, T, T);
    blobs(c, T, T, 7, 40, ['#285c76', '#3a7a96'], 10, 40, .5);
    c.strokeStyle = 'rgba(220,240,255,.35)'; c.lineWidth = 2;
    const R = rng(3);
    for (let i = 0; i < 30; i++) { const x = R() * T, y = R() * T; for (const dy of [-T, 0, T]) { c.beginPath(); c.moveTo(x - 10, y + dy); c.quadraticCurveTo(x, y + dy - 6, x + 10, y + dy); c.stroke(); } }
    return cv;
};
ART.stoneTex = (col) => {
    const T = 256, cv = mkCanvas(T, T), c = cv.getContext('2d');
    c.fillStyle = col; c.fillRect(0, 0, T, T);
    for (let y = 0; y < T; y += 32) for (let x = (y / 32 % 2) * 32 - 32; x < T; x += 64) {
        c.fillStyle = shade(col, .85 + hash2(x, y) * .3); c.fillRect(x + 2, y + 2, 60, 28);
        c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(x + 2, y + 2, 60, 4);
    }
    return cv;
};
ART.rock = (w) => { const cv = mkCanvas(w, w * .7), c = cv.getContext('2d'); ell(c, w / 2 + 3, w * .4 + 3, w * .42, w * .26, 0, 'rgba(0,0,0,.3)'); ell(c, w / 2, w * .35, w * .42, w * .28, 0, '#7a7a72'); ell(c, w * .42, w * .28, w * .22, w * .12, -.3, 'rgba(255,255,255,.2)'); return cv; };

/* ---------- rozhranie ---------- */
ART.panel = () => {
    const w = 96, h = 96, cv = mkCanvas(w, h), c = cv.getContext('2d');
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#3a2c20'); g.addColorStop(1, '#1c140e');
    c.fillStyle = g; c.beginPath(); c.roundRect(2, 2, w - 4, h - 4, 10); c.fill();
    c.strokeStyle = '#d9a441'; c.lineWidth = 3; c.stroke();
    c.strokeStyle = 'rgba(217,164,65,.35)'; c.lineWidth = 1.5; c.beginPath(); c.roundRect(8, 8, w - 16, h - 16, 6); c.stroke();
    [[12, 12], [w - 12, 12], [12, h - 12], [w - 12, h - 12]].forEach(([x, y]) => { c.fillStyle = '#d9a441'; c.beginPath(); c.moveTo(x, y - 4); c.lineTo(x + 4, y); c.lineTo(x, y + 4); c.lineTo(x - 4, y); c.fill(); });
    return cv;
};
ART.button = (state) => {
    const w = 64, h = 48, cv = mkCanvas(w, h), c = cv.getContext('2d');
    const top = { n: '#e6b552', h: '#f6cc6a', d: '#5a4c3c', p: '#c8963c' }[state], bot = { n: '#b8862e', h: '#d8a040', d: '#3e342a', p: '#a07428' }[state];
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, top); g.addColorStop(1, bot);
    c.fillStyle = g; c.beginPath(); c.roundRect(1, 1, w - 2, h - 2, 6); c.fill();
    c.strokeStyle = state === 'd' ? '#6a5a46' : '#5a3a10'; c.lineWidth = 2; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(8, 4); c.lineTo(w - 8, 4); c.stroke();
    return cv;
};
ART.house = (f) => {
    const cv = mkCanvas(28, 26), c = cv.getContext('2d');
    c.save(); c.scale(S, S); c.translate(7, 9);
    c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(-5, 2, 11, 2);
    c.fillStyle = VW[f] || '#a08060'; c.fillRect(-4, -3, 8, 6);
    c.fillStyle = VR[f] || '#7a3a22'; c.beginPath(); c.moveTo(-5, -3); c.lineTo(0, -8); c.lineTo(5, -3); c.fill();
    c.fillStyle = '#ffd27a'; c.fillRect(-1, -1, 2, 2);
    c.restore(); return cv;
};
