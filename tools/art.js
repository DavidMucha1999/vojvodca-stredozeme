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
    blobs(c, T, T, bi * 211 + v * 7 + 3, 40, [b.dark[0]], 1.5, 3, .35);           // jemné zrno
    if (['lush', 'grass'].includes(b.id)) {                                       // kvety a kamienky v tráve
        const R = rng(v * 19 + bi);
        for (let i = 0; i < 6; i++) { c.fillStyle = ['#e8d870', '#f0f0f0', '#d890a0'][i % 3]; c.globalAlpha = .55; c.fillRect(R() * T, R() * T, 2, 2); }
        c.globalAlpha = 1;
    }
    if (['dry', 'steppe', 'sand'].includes(b.id)) { const R = rng(v * 23 + bi * 3); for (let i = 0; i < 5; i++) { const x = R() * T, y = R() * T, r = 1.5 + R() * 2; ell(c, x + 1, y + 1, r, r * .6, 0, 'rgba(0,0,0,.25)'); ell(c, x, y, r, r * .7, 0, '#8a8478'); } }
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
    if (!dead) { blobs(c, T, T, v * 5 + 11, 14, ['rgba(18,40,16,1)'], 14, 30, .3); }   // tmavý podrast ako škvrny, nie plný štvorec (hranice dlaždíc nevidno)
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
    if (kind === 1) {           // listnatý: koruna z viacerých chumáčov so svetlom zľava hore
        [['#243f1c', 0, -12, 10], ['#2c4a22', -4, -14, 8], ['#3a5c2a', 3, -16, 7], ['#4a6e34', -3, -18, 5], ['#5c8040', 1, -20, 3.5]].forEach(([col, dx, dy, r]) => ell(c, x + dx * s, y + dy * s, r * s, r * .85 * s, 0, col));
        ell(c, x + 4 * s, y - 11 * s, 6 * s, 4 * s, .3, 'rgba(0,0,0,.2)');
        return;
    }
    for (let i = 0; i < 4; i++) {   // ihličnatý: štyri poschodia, zubatý okraj
        c.fillStyle = ['#1a3f22', '#224f2a', '#2c6032', '#387240'][i];
        const top = y - (26 - i * 5) * s, bot = y - (6 - i * 5) * s, hw = (11 - i * 2) * s;
        c.beginPath(); c.moveTo(x, top);
        for (let k = 1; k <= 3; k++) { c.lineTo(x + hw * k / 3, bot - (k % 2) * 2 * s); } c.lineTo(x, bot + 1 * s); for (let k = 3; k >= 1; k--) { c.lineTo(x - hw * k / 3, bot - (k % 2) * 2 * s); } c.fill();
        c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.moveTo(x, top); c.lineTo(x + hw, bot); c.lineTo(x + hw * .2, bot); c.fill();
    }
    c.fillStyle = 'rgba(255,255,220,.16)'; c.beginPath(); c.moveTo(x, y - 26 * s); c.lineTo(x - 7 * s, y - 8 * s); c.lineTo(x - 1 * s, y - 9 * s); c.fill();
};
ART.mountain = (c, w, h, kind, seed) => {
    const R = rng(seed), cx = w / 2, base = h * .9, top = h * .1, hw = w * .48;
    const snow = kind === 'snow', doom = kind === 'doom';
    const lit = snow ? '#8e8a86' : doom ? '#3a2a26' : '#4e4440', mid = snow ? '#6e6a66' : doom ? '#2a1c18' : '#362e2a', dk = snow ? '#4a4642' : doom ? '#160e0c' : '#1e1816';
    ell(c, cx + w * .05, base + h * .02, hw * 1.08, h * .07, 0, 'rgba(0,0,0,.32)');
    // hrebeň: niekoľko vrcholov s nepravidelným obrysom
    const peaks = doom ? [[cx, top]] : [[cx, top], [cx - hw * .5, top + h * (.22 + R() * .18)], [cx + hw * .52, top + h * (.26 + R() * .16)], [cx - hw * .85, top + h * (.5 + R() * .1)], [cx + hw * .88, top + h * (.52 + R() * .1)]];
    peaks.sort((a, b) => b[1] - a[1]).forEach(([px, py], i) => {
        const pw = hw * (.45 + .55 * (1 - (py - top) / (base - top)));
        const ridge = (sd) => { c.moveTo(px, py); let x = px, y = py; for (let k = 1; k <= 5; k++) { x = px + sd * pw * k / 5; y = py + (base - py) * (k / 5) + (R() - .5) * h * .04; c.lineTo(x, y); } c.lineTo(px + sd * pw, base); };
        c.fillStyle = lit; c.beginPath(); ridge(-1); c.lineTo(px, base); c.fill();
        c.fillStyle = dk; c.beginPath(); ridge(1); c.lineTo(px, base); c.fill();
        c.fillStyle = mid; c.beginPath(); c.moveTo(px, py); c.lineTo(px + pw * .35, base); c.lineTo(px + pw * .05, base); c.fill();
        // strže
        c.strokeStyle = 'rgba(0,0,0,.22)'; c.lineWidth = 1.5;
        for (let k = 0; k < 5; k++) { const t = .2 + k * .15; c.beginPath(); c.moveTo(px + pw * t * .25 * (k % 2 ? -1 : 1), py + (base - py) * t); c.lineTo(px + pw * t * .8 * (k % 2 ? -1 : 1), py + (base - py) * Math.min(1, t + .18)); c.stroke(); }
        if (snow) {
            const sh = (base - py) * .34;
            c.fillStyle = '#f4f6fa'; c.beginPath(); c.moveTo(px, py); c.lineTo(px - pw * .34, py + sh); c.lineTo(px - pw * .2, py + sh * .8); c.lineTo(px - pw * .1, py + sh * 1.05); c.lineTo(px + pw * .05, py + sh * .85); c.lineTo(px + pw * .18, py + sh * 1.1); c.lineTo(px + pw * .34, py + sh * .9); c.fill();
            c.fillStyle = '#c4ccd8'; c.beginPath(); c.moveTo(px, py); c.lineTo(px + pw * .34, py + sh * .9); c.lineTo(px + pw * .18, py + sh * 1.1); c.lineTo(px + pw * .05, py + sh * .85); c.fill();
        }
    });
    // úpätie splýva s terénom
    // úpätie: zubatý okraj s trávou/kameňmi, aby hora nesedela na rovnej čiare
    const g = c.createLinearGradient(0, base - h * .14, 0, base); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.3)'); c.fillStyle = g; c.fillRect(0, base - h * .14, w, h * .14);
    c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.moveTo(0, base + 1);
    for (let x = 0; x <= w; x += w / 24) c.lineTo(x, base - h * (.01 + .035 * R())); c.lineTo(w, h); c.lineTo(0, h); c.fill(); c.globalCompositeOperation = 'source-over';
    const sc = snow ? '#a8aeb8' : doom ? '#4a3430' : '#5e5450'; for (let k = 0; k < 10; k++) { const x = w * .1 + R() * w * .8, r = 3 + R() * 6; ell(c, x, base - h * .02 - R() * h * .03, r, r * .6, 0, sc); }
    if (doom) {
        c.fillStyle = '#1a0c08'; c.beginPath(); c.moveTo(cx - w * .07, top); c.lineTo(cx + w * .07, top); c.lineTo(cx + w * .05, top + h * .06); c.lineTo(cx - w * .05, top + h * .06); c.fill();
        for (const [dx, wd] of [[-.02, 6], [.03, 4], [-.08, 3]]) { c.strokeStyle = '#ff6a1a'; c.lineWidth = wd; c.lineCap = 'round'; c.beginPath(); c.moveTo(cx + w * dx, top + h * .05); c.quadraticCurveTo(cx + w * (dx - .06), top + h * .45, cx + w * (dx - .2), base - h * .04); c.stroke(); c.strokeStyle = '#ffc060'; c.lineWidth = wd * .35; c.stroke(); }
        const gr = c.createRadialGradient(cx, top, 2, cx, top, w * .3); gr.addColorStop(0, 'rgba(255,130,40,.85)'); gr.addColorStop(1, 'rgba(255,60,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h * .55);
        for (let k = 0; k < 4; k++) ell(c, cx + (k - 1.5) * w * .05, top - h * .04 - k * h * .05, w * (.08 + k * .04), h * (.05 + k * .02), 0, 'rgba(60,40,40,' + (.45 - k * .1) + ')');
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
    if (biome === 'g') { blobs(c, T, T, 41, 14, ['#6a5a3a', '#5e4e32'], 20, 48, .22); blobs(c, T, T, 43, 50, ['#3e6a30'], 5, 12, .3); }   // udupaná hlina, tmavé trsy
    if (biome === 'd') blobs(c, T, T, 47, 30, ['#a08a50'], 2, 5, .5);
    strokes(c, T, T, 31, biome === 'g' ? 900 : 260, P[3], biome === 'g' ? 12 : 8, 2);
    if (biome === 'g') { const R = rng(53); for (let i = 0; i < 40; i++) { c.fillStyle = ['#e8d870', '#f0f0f0', '#d890a0', '#8ab0ff'][i % 4]; c.globalAlpha = .6; c.fillRect(R() * T, R() * T, 3, 3); } c.globalAlpha = 1; for (let i = 0; i < 18; i++) { const x = R() * T, y = R() * T, r = 2 + R() * 3; ell(c, x + 1, y + 1, r, r * .6, 0, 'rgba(0,0,0,.3)'); ell(c, x, y, r, r * .7, 0, '#8a8a80'); } }
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
