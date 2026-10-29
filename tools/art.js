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

/* ---------- vojaci (pohľad zhora, tvár doprava) ---------- */
/* layer 'base' = všetko okrem tímových farieb, 'team' = biele časti, ktoré Phaser zafarbí farbou frakcie */
ART.UNIT_FRAME = 192;   // 96 jednotiek sveta
ART.FRAMES = 12;        // 0 státie | 1–4 chôdza | 5–7 útok | 8–11 pád (rovnako ako js/engine/art.js)
const SKIN = { human: '#e2bf96', orc: '#5f7a4a', uruk: '#3e4a34', troll: '#7a8670', dwarf: '#dcb48c', elf: '#efd6b4', dark: '#8a5a3a', none: '#111' };
ART.UNITS = {
    i: { r: 6, armor: '#7d7f80', skin: 'human', helm: 'kettle', weapon: 'sword', shield: 'round' },
    a: { r: 6, armor: '#6a5a3e', skin: 'human', helm: 'hood', weapon: 'bow' },
    c: { r: 8, armor: '#8a8c90', skin: 'human', helm: 'kettle', weapon: 'sword', shield: 'kite', mount: 'horse' },
    v: { r: 7, armor: '#a8acb2', skin: 'human', helm: 'plume', weapon: 'sword', shield: 'kite' },
    r: { r: 9, armor: '#5a6a3a', skin: 'human', helm: 'rohan', weapon: 'spear', shield: 'round', mount: 'horse' },
    e: { r: 6, armor: '#6a8a6a', skin: 'elf', helm: 'elf', weapon: 'bow' },
    orc: { r: 6, armor: '#3a3028', skin: 'orc', helm: 'orc', weapon: 'scimitar', shield: 'round' },
    orc_a: { r: 6, armor: '#3a3028', skin: 'orc', helm: 'orc', weapon: 'bow' },
    t: { r: 11, armor: '#4e5446', skin: 'troll', helm: 'none', weapon: 'club', big: 1 },
    w: { r: 5, beast: 'wolf' },
    x: { r: 15, beast: 'oliphant' },
    z: { r: 10, armor: '#08080a', skin: 'none', helm: 'nazgul', weapon: 'sword', mount: 'darkhorse' },
    uG1: { r: 7, armor: '#22222a', skin: 'human', helm: 'winged', weapon: 'spear', shield: 'kite' },
    uG2: { r: 6, armor: '#3a5a32', skin: 'human', helm: 'hood', weapon: 'bow' },
    uR2: { r: 7, armor: '#4a6a2a', skin: 'human', helm: 'rohan', weapon: 'spear', shield: 'round' },
    uM1: { r: 6, armor: '#2a2420', skin: 'orc', helm: 'orc', weapon: 'scimitar', shield: 'round' },
    uM2: { r: 11, armor: '#2a2a26', skin: 'troll', helm: 'troll', weapon: 'axe', big: 1 },
    uI1: { r: 8, armor: '#1a1a1e', skin: 'uruk', helm: 'uruk', weapon: 'sword', shield: 'kite' },
    uI2: { r: 8, armor: '#2a2420', skin: 'orc', helm: 'orc', weapon: 'scimitar', mount: 'wolf' },
    uH1: { r: 6, armor: '#b0301a', skin: 'dark', helm: 'turban', weapon: 'spear', shield: 'round' },
    uH2: { r: 6, armor: '#c06a20', skin: 'dark', helm: 'turban', weapon: 'bow' },
    uE1: { r: 7, armor: '#3a5a8a', skin: 'dwarf', helm: 'dwarf', weapon: 'axe', shield: 'round', beard: 1 },
    uE2: { r: 6, armor: '#2a4a7a', skin: 'dwarf', helm: 'dwarf', weapon: 'xbow', beard: 1 },
    uN1: { r: 7, armor: '#6a2a4a', skin: 'human', helm: 'easterling', weapon: 'spear', shield: 'kite' },
    uN2: { r: 9, armor: '#5a1f4a', skin: 'human', helm: 'easterling', weapon: 'spear', mount: 'horse' },
    uL2: { r: 7, armor: '#5a7a5a', skin: 'elf', helm: 'elf', weapon: 'elfblade' },
    hero: { r: 9, armor: '#b8a060', skin: 'human', helm: 'hero', weapon: 'sword', shield: 'kite', cape: 1 },
    hero_spear: { r: 9, armor: '#b8a060', skin: 'human', helm: 'hero', weapon: 'spear', shield: 'kite', cape: 1 }
};

function drawMount(c, sp, kind, ph, layer) {
    const r = sp.r, step = Math.sin(ph) * r * .35;
    if (kind === 'wolf') {
        if (layer === 'team') return;
        const col = '#4a443e';
        [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([fx, fy], k) => ell(c, fx * r * .9 + (k % 3 ? step : -step), fy * r * .5, r * .32, r * .18, 0, '#2e2a26'));
        ell(c, 0, 0, r * 1.5, r * .55, 0, col); ell(c, r * 1.5, 0, r * .55, r * .4, 0, col);
        c.fillStyle = col; c.beginPath(); c.moveTo(r * 1.4, -r * .35); c.lineTo(r * 1.3, -r * .7); c.lineTo(r * 1.6, -r * .3); c.fill(); c.beginPath(); c.moveTo(r * 1.4, r * .35); c.lineTo(r * 1.3, r * .7); c.lineTo(r * 1.6, r * .3); c.fill();
        ell(c, r * 2, 0, r * .25, r * .2, 0, '#2e2a26');
        c.strokeStyle = col; c.lineWidth = r * .25; c.lineCap = 'round'; c.beginPath(); c.moveTo(-r * 1.4, 0); c.lineTo(-r * 2.1, Math.sin(ph * 2) * r * .3); c.stroke();
        return;
    }
    const dark = kind === 'darkhorse', col = dark ? '#121014' : '#6b4a2e', mane = dark ? '#000' : '#3a2416';
    if (layer === 'base') {
        [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([fx, fy], k) => ell(c, fx * r * 1.2 + (k === 0 || k === 3 ? step : -step), fy * r * .55, r * .3, r * .18, 0, '#2a1a10'));
        ell(c, 0, 0, r * 1.75, r * .78, 0, col);
        ell(c, -r * .2, -r * .25, r * 1.1, r * .3, 0, 'rgba(255,255,255,.1)');
        ell(c, r * 1.8, 0, r * .62, r * .36, 0, col);
        ell(c, r * 2.3, 0, r * .3, r * .26, 0, shade(col, .8));
        c.strokeStyle = mane; c.lineWidth = r * .22; c.lineCap = 'round';
        c.beginPath(); c.moveTo(r * .9, 0); c.lineTo(r * 1.7, 0); c.stroke();
        c.beginPath(); c.moveTo(-r * 1.7, 0); c.quadraticCurveTo(-r * 2.2, Math.sin(ph) * r * .3, -r * 2.5, Math.sin(ph * 2) * r * .4); c.stroke();
    }
    if (layer === 'team' && !dark) ell(c, -r * .1, 0, r * 1.05, r * .86, 0, '#ffffff');   // čaprák vo farbe frakcie
}

function drawWeapon(c, sp, a, lunge, layer) {
    if (layer === 'team') return;
    const r = sp.r, big = sp.big ? 1.4 : 1, hx = r * .45, hy = r * .7;
    c.save(); c.translate(hx + lunge, hy); c.rotate(a);
    c.lineCap = 'round';
    switch (sp.weapon) {
        case 'sword': case 'elfblade': case 'scimitar': {
            const L = r * (sp.weapon === 'elfblade' ? 2.6 : 2.2) * big;
            c.strokeStyle = '#2a2018'; c.lineWidth = r * .3; c.beginPath(); c.moveTo(-r * .3, 0); c.lineTo(r * .15, 0); c.stroke();
            c.strokeStyle = '#a07a2a'; c.lineWidth = r * .22; c.beginPath(); c.moveTo(r * .2, -r * .38); c.lineTo(r * .2, r * .38); c.stroke();
            c.fillStyle = '#d8dde2';
            c.beginPath(); c.moveTo(r * .25, -r * .12);
            if (sp.weapon === 'scimitar') { c.quadraticCurveTo(L * .6, -r * .35, L, r * .25); c.lineTo(r * .25, r * .12); }
            else { c.lineTo(L - r * .3, -r * .12); c.lineTo(L, 0); c.lineTo(L - r * .3, r * .12); c.lineTo(r * .25, r * .12); }
            c.fill(); c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = .8; c.stroke();
            c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1; c.beginPath(); c.moveTo(r * .35, -r * .04); c.lineTo(L - r * .4, -r * .04); c.stroke();
            break;
        }
        case 'spear': {
            const L = r * 4;
            c.strokeStyle = '#6a4a2a'; c.lineWidth = r * .2; c.beginPath(); c.moveTo(-r * 1.6, 0); c.lineTo(L - r * .5, 0); c.stroke();
            c.fillStyle = '#d8dde2'; c.beginPath(); c.moveTo(L + r * .3, 0); c.lineTo(L - r * .6, -r * .25); c.lineTo(L - r * .6, r * .25); c.fill();
            break;
        }
        case 'axe': {
            const L = r * 2.1 * big;
            c.strokeStyle = '#5a3a1a'; c.lineWidth = r * .25; c.beginPath(); c.moveTo(-r * .4, 0); c.lineTo(L, 0); c.stroke();
            c.fillStyle = '#b8bcc4'; c.beginPath(); c.moveTo(L - r * .2, 0); c.arc(L - r * .2, 0, r * .8, -1.2, 1.2); c.fill();
            c.strokeStyle = '#eef'; c.lineWidth = 1; c.beginPath(); c.arc(L - r * .2, 0, r * .78, -1, 1); c.stroke();
            break;
        }
        case 'club': {
            c.strokeStyle = '#4a3420'; c.lineWidth = r * .35; c.beginPath(); c.moveTo(-r * .3, 0); c.lineTo(r * 2.2, 0); c.stroke();
            ell(c, r * 2.3, 0, r * .55, r * .42, 0, '#5a4028'); c.fillStyle = '#ccc';
            [[2, -.4], [2.5, .3], [2.2, .45]].forEach(([dx, dy]) => { c.beginPath(); c.arc(r * dx, r * dy, r * .1, 0, 7); c.fill(); });
            break;
        }
        case 'bow': case 'xbow': {
            c.restore(); c.save();
            const pull = lunge < 0 ? -lunge : 0;
            c.translate(r * .9, 0);
            if (sp.weapon === 'xbow') {
                c.strokeStyle = '#5a3a1a'; c.lineWidth = r * .3; c.beginPath(); c.moveTo(-r * .9, 0); c.lineTo(r * .6, 0); c.stroke();
                c.strokeStyle = '#3a2a1a'; c.lineWidth = r * .2; c.beginPath(); c.arc(-r * .2, 0, r * .9, -1.1, 1.1); c.stroke();
                c.strokeStyle = 'rgba(240,240,240,.8)'; c.lineWidth = .8; c.beginPath(); c.moveTo(r * .2, -r * .8); c.lineTo(-r * .6, 0); c.lineTo(r * .2, r * .8); c.stroke();
            } else {
                c.strokeStyle = '#6b4a2e'; c.lineWidth = r * .22; c.beginPath(); c.arc(-r * .2, 0, r * 1.3, -1.25, 1.25); c.stroke();
                c.strokeStyle = 'rgba(240,240,240,.85)'; c.lineWidth = .9;
                const ex = -r * .2 + Math.cos(1.25) * r * 1.3, ey = Math.sin(1.25) * r * 1.3;
                c.beginPath(); c.moveTo(ex, -ey); c.lineTo(-r * .6 - pull * r * .12, 0); c.lineTo(ex, ey); c.stroke();
                if (pull) { c.strokeStyle = '#e8d8b0'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-r * .6 - pull * r * .12, 0); c.lineTo(r * 1.2, 0); c.stroke(); }
            }
            break;
        }
    }
    c.restore();
}

function drawHead(c, sp, layer) {
    const r = sp.r * (sp.big ? .8 : 1), skin = SKIN[sp.skin], hr = r * .48;
    if (layer === 'team') {
        if (sp.helm === 'plume' || sp.helm === 'hero') { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(-hr * .6, 0, hr * .9, hr * .28, 0, 0, 7); c.fill(); }
        if (sp.helm === 'turban' || sp.helm === 'easterling') { c.strokeStyle = '#fff'; c.lineWidth = hr * .35; c.beginPath(); c.arc(0, 0, hr * .95, 1.8, 4.5); c.stroke(); }
        return;
    }
    ell(c, 0, 0, hr, hr, 0, skin);
    const H = { kettle: '#9aa0a8', plume: '#c0c6ce', rohan: '#b89a50', winged: '#d0d4dc', orc: '#2a2a2a', uruk: '#1a1a1e', turban: '#d8b070', dwarf: '#9aa2aa', elf: null, hood: '#4a3a28', troll: '#1a1a1a', nazgul: '#050507', hero: '#cfd4da', easterling: '#c09030', none: null }[sp.helm];
    if (H) {
        c.fillStyle = H; c.beginPath(); c.arc(0, 0, hr * 1.06, Math.PI * .45, Math.PI * 1.55); c.closePath(); c.fill();
        c.beginPath(); c.arc(0, 0, hr * 1.06, Math.PI * 1.55, Math.PI * 2.45); c.fill();
        if (sp.helm !== 'hood' && sp.helm !== 'nazgul' && sp.helm !== 'turban') { c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-hr * .25, -hr * .3, hr * .35, hr * .2, -.5, 0, 7); c.fill(); }
    }
    if (sp.helm === 'winged') { c.fillStyle = '#e8eaee'; [-1, 1].forEach(sd => { c.beginPath(); c.moveTo(-hr * .2, sd * hr * .8); c.quadraticCurveTo(-hr * 1.2, sd * hr * 1.9, -hr * 1.6, sd * hr * 1.3); c.lineTo(-hr * .5, sd * hr * .7); c.fill(); }); }
    if (sp.helm === 'orc' || sp.helm === 'troll' || sp.helm === 'uruk') {
        c.fillStyle = '#d8d0b8';
        [-1, 1].forEach(sd => { c.beginPath(); c.moveTo(0, sd * hr * .7); c.lineTo(-hr * .5, sd * hr * 1.5); c.lineTo(hr * .3, sd * hr * .8); c.fill(); });
        c.fillStyle = '#ff3a2a'; c.fillRect(hr * .55, -hr * .35, hr * .22, hr * .2); c.fillRect(hr * .55, hr * .15, hr * .22, hr * .2);
        if (sp.helm === 'uruk') { c.fillStyle = '#f0f0f0'; c.beginPath(); c.arc(-hr * .1, 0, hr * .3, 0, 7); c.fill(); }
    }
    if (sp.helm === 'nazgul') { c.fillStyle = '#000'; c.beginPath(); c.arc(hr * .2, 0, hr * .7, 0, 7); c.fill(); c.fillStyle = '#9aa0a8'; c.beginPath(); c.moveTo(-hr, -hr * .6); c.lineTo(0, -hr * 1.3); c.lineTo(hr * .4, -hr * .4); c.lineTo(hr * .4, hr * .4); c.lineTo(0, hr * 1.3); c.lineTo(-hr, hr * .6); c.closePath(); c.globalAlpha = .7; c.fill(); c.globalAlpha = 1; }
    if (sp.helm === 'elf') { c.fillStyle = '#e8d890'; c.beginPath(); c.ellipse(-hr * .45, 0, hr * .8, hr * .95, 0, 0, 7); c.fill(); c.strokeStyle = '#e8d870'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, hr * .95, 1.8, 4.5); c.stroke(); }
    if (sp.helm === 'dwarf') { c.fillStyle = '#d9a441'; c.fillRect(-hr * .1, -hr * 1.05, hr * .2, hr * 2.1); }
    if (sp.helm === 'rohan') { c.fillStyle = '#e8e0c0'; c.beginPath(); c.ellipse(-hr * .9, 0, hr * .8, hr * .22, 0, 0, 7); c.fill(); }
    if (sp.beard) { c.fillStyle = '#8a3a1a'; c.beginPath(); c.ellipse(hr * .75, 0, hr * .55, hr * .45, 0, 0, 7); c.fill(); }
    if (sp.helm === 'hero') { c.fillStyle = '#d9a441'; c.fillRect(-hr * .9, -hr * .1, hr * 1.8, hr * .2); }
}

function drawBeast(c, sp, kind, frame, layer) {
    const r = sp.r, ph = frame < 4 ? frame / 4 * Math.PI * 2 : 0, atk = frame >= 4 && frame <= 6 ? [.0, .5, .2][frame - 4] : 0;
    if (kind === 'wolf') { drawMount(c, { r: r * 1.3 }, 'wolf', ph, layer); if (layer === 'base' && atk) { ell(c, r * 2.6 + atk * r, 0, r * .35, r * .3, 0, '#1a1614'); } return; }
    // olifant
    const step = Math.sin(ph) * r * .25;
    if (layer === 'base') {
        [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([fx, fy], k) => ell(c, fx * r * .9 + (k % 3 ? step : -step), fy * r * .7, r * .38, r * .34, 0, '#5a5650'));
        ell(c, 0, 0, r * 1.5, r * 1.05, 0, '#7a7670'); ell(c, -r * .3, -r * .35, r * .9, r * .35, 0, 'rgba(255,255,255,.08)');
        ell(c, r * 1.45, 0, r * .62, r * .7, 0, '#6e6a64');
        [-1, 1].forEach(sd => ell(c, r * 1.2, sd * r * .85, r * .45, r * .32, sd * .3, '#625e58'));
        c.strokeStyle = '#f0ead8'; c.lineWidth = r * .14; c.lineCap = 'round';
        [-1, 1].forEach(sd => { c.beginPath(); c.moveTo(r * 1.8, sd * r * .3); c.quadraticCurveTo(r * 2.6, sd * r * .5, r * 2.8 + atk * r, sd * r * .1); c.stroke(); });
        c.strokeStyle = '#5e5a54'; c.lineWidth = r * .22; c.beginPath(); c.moveTo(r * 2, 0); c.quadraticCurveTo(r * 2.7, Math.sin(ph) * r * .3, r * 3 + atk * r * 1.2, r * .2); c.stroke();
        c.fillStyle = '#6a4a2e'; c.fillRect(-r * .7, -r * .6, r * 1.2, r * 1.2);
        c.strokeStyle = '#3a2a1a'; c.lineWidth = 2; c.strokeRect(-r * .7, -r * .6, r * 1.2, r * 1.2);
    } else {
        c.fillStyle = '#fff'; c.fillRect(-r * .6, -r * .5, r, r);
    }
}

/** Jeden snímok vojaka do kontextu c (stred = poloha jednotky). */
ART.drawUnit = (c, key, frame12, layer) => {
    // 12 snímok hry -> vnútorné číslovanie: 0–3 chôdza, 4–6 útok, 7–9 pád, 10 státie
    const frame = frame12 === 0 ? 10 : frame12 <= 4 ? frame12 - 1 : frame12 <= 7 ? frame12 - 1 : Math.min(9, 7 + Math.floor((frame12 - 8) * 3 / 4));
    const sp = ART.UNITS[key], team = layer === 'team';
    c.save();
    const dying = frame12 >= 8 ? frame12 - 7 : 0;      // 1–4
    if (dying) {
        if (!team) ell(c, 0, 0, sp.r * (1.2 + dying * .4) * (sp.mount || sp.beast ? 1.6 : 1), sp.r * (.9 + dying * .25), 0, 'rgba(110,18,18,' + (.1 + dying * .08) + ')');
        c.rotate([.3, .7, 1.1, 1.4][dying - 1]); c.scale(1, [.92, .84, .76, .7][dying - 1]);
        if (team) c.globalAlpha = [.9, .78, .66, .55][dying - 1];
    }
    if (sp.beast) { drawBeast(c, sp, sp.beast, dying ? 0 : frame, layer); c.restore(); return; }
    const r = sp.r, ph = frame < 4 ? frame / 4 * Math.PI * 2 : 0, walk = frame < 4 || frame === 10;
    const atkA = { 4: -1.1, 5: .55, 6: .15 }[frame] || 0, lunge = { 4: -2, 5: 3.5, 6: 1 }[frame] || 0;
    const bodyX = frame === 5 ? r * .15 : 0, rr = sp.big ? r * .8 : r, hr = rr * .48;
    const cut = (fn) => { c.save(); c.globalCompositeOperation = 'destination-out'; c.globalAlpha = 1; fn(); c.restore(); };
    const bodyAt = () => { c.save(); c.translate(bodyX, 0); if (sp.big) c.scale(1.25, 1.25); };
    if (!team) {
        ell(c, 1, 2, r * (sp.mount ? 2.2 : 1.15), r * (sp.mount ? 1.1 : 1.15) * .85, 0, 'rgba(0,0,0,.28)');
        if (sp.mount) drawMount(c, sp, sp.mount, ph, 'base');
        if (!sp.mount) { const st = walk ? Math.sin(ph) * r * .45 : 0; ell(c, st, -r * .38, r * .32, r * .2, 0, '#2a2018'); ell(c, -st, r * .38, r * .32, r * .2, 0, '#2a2018'); }
        bodyAt();
        ell(c, 0, 0, rr * .72, rr, 0, sp.armor, 'rgba(0,0,0,.55)', 1.2);
        ell(c, -rr * .2, -rr * .3, rr * .3, rr * .55, 0, 'rgba(255,255,255,.16)');
        ell(c, rr * .1, -rr * .95, rr * .3, rr * .28, 0, shade(sp.armor, 1.15));
        ell(c, rr * .1, rr * .95, rr * .3, rr * .28, 0, shade(sp.armor, 1.15));
        if (sp.shield) { const sx = rr * .25 + (frame === 4 ? rr * .2 : 0); ell(c, sx, -rr * .95, rr * (sp.shield === 'kite' ? .3 : .4), rr * (sp.shield === 'kite' ? .6 : .45), 0, '#d9a441'); }
        drawWeapon(c, sp, walk ? Math.sin(ph) * .12 : atkA, ['bow', 'xbow'].includes(sp.weapon) ? (frame === 4 ? -6 : frame === 5 ? -8 : 0) : lunge, 'base');
        drawHead(c, sp, 'base');
        c.restore();
    } else {
        if (sp.mount && sp.mount !== 'darkhorse' && sp.mount !== 'wolf') { drawMount(c, sp, sp.mount, ph, 'team'); cut(() => { c.translate(bodyX, 0); ell(c, 0, 0, rr * .78, rr * 1.06, 0, '#000'); ell(c, rr * .1, -rr * .95, rr * .32, rr * .3, 0, '#000'); ell(c, rr * .1, rr * .95, rr * .32, rr * .3, 0, '#000'); }); }
        bodyAt();
        if (sp.cape) {
            c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(-rr * 1.6, Math.sin(ph) * rr * .25); c.quadraticCurveTo(-rr * 1.1, rr * 1.05, 0, rr * .85); c.lineTo(0, -rr * .85); c.quadraticCurveTo(-rr * 1.1, -rr * 1.05, -rr * 1.6, Math.sin(ph) * rr * .25); c.fill();
            cut(() => { ell(c, 0, 0, rr * .76, rr * 1.04, 0, '#000'); ell(c, rr * .1, -rr * .95, rr * .32, rr * .3, 0, '#000'); ell(c, rr * .1, rr * .95, rr * .32, rr * .3, 0, '#000'); });
        }
        if (sp.skin !== 'none' && sp.helm !== 'nazgul' && !sp.big) ell(c, 0, 0, rr * .32, rr * .78, 0, '#f2f2f2');
        if (sp.shield) { const sx = rr * .25 + (frame === 4 ? rr * .2 : 0); ell(c, sx, -rr * .95, rr * (sp.shield === 'kite' ? .24 : .33), rr * (sp.shield === 'kite' ? .52 : .38), 0, '#ffffff'); }
        cut(() => ell(c, 0, 0, hr * 1.12, hr * 1.12, 0, '#000'));
        drawHead(c, sp, 'team');
        c.restore();
    }
    c.restore();
};

/** Spritesheet: ART.FRAMES snímok vedľa seba. */
ART.unitSheet = (key, layer) => {
    const F = ART.UNIT_FRAME, cv = mkCanvas(F * ART.FRAMES, F), c = cv.getContext('2d');
    for (let k = 0; k < ART.FRAMES; k++) {
        c.save(); c.translate(k * F + F / 2, F / 2); c.scale(S, S);
        ART.drawUnit(c, key, k, layer);
        c.restore();
        if (k >= 8 && layer === 'base') {   // stmavenie padlých
            c.save(); c.globalCompositeOperation = 'source-atop'; c.fillStyle = 'rgba(20,10,10,' + (.12 + (k - 8) * .1) + ')'; c.fillRect(k * F, 0, F, F); c.restore();
        }
    }
    return cv;
};

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
