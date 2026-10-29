/*
 * GENERÁTOR GRAFIKY MAPY: hrady podľa frakcie, dediny podľa prosperity, polia, mosty, kamene.
 * Kreslí sa do assets/textures/map_*.png (2× rozlíšenie). Hra ich načíta v MapScene; ak súbor
 * chýba, použije pôvodné kreslenie z js/render.
 *   castle_<f>.png   hrad frakcie f (0 Gondor, 1 Rohan, 2 Mordor, 3 Isengard, 4 Harad, 5 Erebor, 6 vlastná, 7 Rhûn, 8 Lothlórien, 9 banditi), 240 × 200
 *   village_<lvl>.png dedina úrovne 1–5 (viac domov), village_burn.png vypálená, 160 × 110
 *   field_<v>.png    pole (pri dedinách), rocks_<v>.png skalky, bridge.png most
 */
const MAPART = {};
const CW = 240, CH = 200, VW2 = 160, VH2 = 110;

/* ---------- pomocné ---------- */
function stoneWall(c, x, y, w, h, col, dark, bricks) {
    c.fillStyle = col; c.fillRect(x, y, w, h);
    c.fillStyle = dark; c.fillRect(x + w * .72, y, w * .28, h);            // tieňová strana
    if (bricks) { c.strokeStyle = 'rgba(0,0,0,.14)'; c.lineWidth = 1; for (let yy = y + 6; yy < y + h; yy += 7) { c.beginPath(); c.moveTo(x, yy); c.lineTo(x + w, yy); c.stroke(); } for (let yy = y + 6, k = 0; yy < y + h; yy += 7, k++) for (let xx = x + (k % 2) * 6; xx < x + w; xx += 12) { c.beginPath(); c.moveTo(xx, yy - 7); c.lineTo(xx, yy); c.stroke(); } }
}
function merlons(c, x, y, w, col, n) { c.fillStyle = col; const mw = w / (n * 2 - 1); for (let k = 0; k < n; k++) c.fillRect(x + k * mw * 2, y - 6, mw, 6); }
function roofCone(c, x, y, w, h, col, dark) { c.fillStyle = col; c.beginPath(); c.moveTo(x - w / 2, y); c.lineTo(x, y - h); c.lineTo(x + w / 2, y); c.fill(); c.fillStyle = dark; c.beginPath(); c.moveTo(x, y - h); c.lineTo(x + w / 2, y); c.lineTo(x + w * .1, y); c.fill(); }
function windowLit(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x, y, w, h * .3); }
function banner(c, x, y, col, emb) { c.strokeStyle = '#3a2a1a'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 30); c.stroke(); c.fillStyle = col; c.beginPath(); c.moveTo(x, y - 30); c.lineTo(x + 16, y - 27); c.lineTo(x + 14, y - 12); c.lineTo(x, y - 14); c.fill(); if (emb) { c.fillStyle = emb; c.beginPath(); c.arc(x + 7, y - 21, 3, 0, 7); c.fill(); } }
function groundShadow(c, x, y, rx, ry) { ell(c, x, y, rx, ry, 0, 'rgba(0,0,0,.28)'); }
function hillBase(c, x, y, rx, ry, col) { ell(c, x, y, rx, ry, 0, col); ell(c, x - rx * .2, y - ry * .3, rx * .6, ry * .4, 0, 'rgba(255,255,255,.08)'); }

/* ---------- hrady ---------- */
MAPART.castle = (c, f) => {
    const cx = CW / 2, gy = CH * .82;   // základná čiara
    groundShadow(c, cx + 6, gy + 8, 95, 22);
    const col = FC[f] || '#888';
    if (f === 0 || f === 6) {           // Gondor / vlastný: biele mesto, sedem úrovní v náznaku, veža
        hillBase(c, cx, gy, 100, 26, '#8a8678');
        stoneWall(c, cx - 96, gy - 38, 192, 40, '#d8d4c8', '#b8b4a8', true); merlons(c, cx - 96, gy - 38, 192, '#e8e4da', 12);
        stoneWall(c, cx - 70, gy - 74, 140, 40, '#e4e0d6', '#c4c0b4', true); merlons(c, cx - 70, gy - 74, 140, '#f0ece4', 9);
        stoneWall(c, cx - 44, gy - 108, 88, 38, '#eeeae2', '#cecac0', true); merlons(c, cx - 44, gy - 108, 88, '#f6f2ea', 6);
        stoneWall(c, cx - 10, gy - 170, 20, 66, '#f6f4ee', '#d6d2c8', false); roofCone(c, cx, gy - 170, 26, 22, '#b8c4d0', '#8a98a8');
        [[-80, -30], [-50, -30], [-20, -30], [10, -30], [40, -30], [70, -30], [-50, -66], [0, -66], [50, -66], [-25, -100], [20, -100]].forEach(([dx, dy]) => windowLit(c, cx + dx, gy + dy, 5, 8, f === 6 ? '#ffd27a' : '#ffe9a8'));
        c.fillStyle = '#2a2a2e'; c.fillRect(cx - 9, gy - 22, 18, 24); c.beginPath(); c.arc(cx, gy - 22, 9, Math.PI, 0); c.fill();
        banner(c, cx + 14, gy - 170, col, EC[f]);
        // biely strom pred bránou
        c.strokeStyle = '#f4f4f4'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - 30, gy - 2); c.lineTo(cx - 30, gy - 18); c.moveTo(cx - 30, gy - 10); c.lineTo(cx - 36, gy - 16); c.moveTo(cx - 30, gy - 12); c.lineTo(cx - 24, gy - 18); c.stroke();
    } else if (f === 1) {               // Rohan: Zlatá sieň na kopci, drevená palisáda
        hillBase(c, cx, gy, 100, 28, '#6a7a3a');
        c.strokeStyle = '#5a3a1a'; c.lineWidth = 4; for (let k = -92; k <= 92; k += 8) { c.beginPath(); c.moveTo(cx + k, gy - 2); c.lineTo(cx + k, gy - 22 - (k % 16 ? 0 : 4)); c.stroke(); }
        c.fillStyle = '#7a5a30'; c.fillRect(cx - 60, gy - 60, 120, 40); c.fillStyle = '#5a4020'; c.fillRect(cx + 30, gy - 60, 30, 40);
        c.fillStyle = '#d9a441'; c.beginPath(); c.moveTo(cx - 72, gy - 58); c.lineTo(cx, gy - 108); c.lineTo(cx + 72, gy - 58); c.fill();
        c.fillStyle = '#b8862a'; c.beginPath(); c.moveTo(cx, gy - 108); c.lineTo(cx + 72, gy - 58); c.lineTo(cx + 20, gy - 58); c.fill();
        c.strokeStyle = '#8a6420'; c.lineWidth = 1.5; for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(cx - 72 + k * 12, gy - 58 + k * 0); c.lineTo(cx - 36 + k * 6, gy - 83); c.stroke(); }
        // konské hlavy na štítoch
        c.fillStyle = '#f0e8d0'; c.beginPath(); c.moveTo(cx - 4, gy - 110); c.lineTo(cx - 16, gy - 118); c.lineTo(cx - 12, gy - 106); c.fill(); c.beginPath(); c.moveTo(cx + 4, gy - 110); c.lineTo(cx + 16, gy - 118); c.lineTo(cx + 12, gy - 106); c.fill();
        c.fillStyle = '#3a2a1a'; c.fillRect(cx - 10, gy - 44, 20, 24); [[-40, -48], [40, -48]].forEach(([dx, dy]) => windowLit(c, cx + dx, gy + dy, 7, 9, '#ffd27a'));
        [[-100, 0], [100, 0]].forEach(([dx]) => { c.fillStyle = '#7a5a30'; c.fillRect(cx + dx - 8, gy - 44, 16, 44); c.fillStyle = '#5a3a1a'; c.fillRect(cx + dx - 10, gy - 48, 20, 6); });
        banner(c, cx + 80, gy - 44, col, EC[f]);
    } else if (f === 2) {               // Mordor: čierne hradby, ostré veže, žiara ohňa
        hillBase(c, cx, gy, 100, 26, '#2a1c1a');
        const g = c.createRadialGradient(cx, gy - 90, 5, cx, gy - 90, 110); g.addColorStop(0, 'rgba(255,90,20,.35)'); g.addColorStop(1, 'rgba(255,60,0,0)'); c.fillStyle = g; c.fillRect(0, 0, CW, CH);
        stoneWall(c, cx - 96, gy - 44, 192, 46, '#1e1a1c', '#0e0c0e', true);
        c.fillStyle = '#0e0c0e'; for (let k = -92; k < 96; k += 14) { c.beginPath(); c.moveTo(cx + k, gy - 44); c.lineTo(cx + k + 5, gy - 58); c.lineTo(cx + k + 10, gy - 44); c.fill(); }
        [[-60, 100, 20], [0, 150, 26], [60, 100, 20]].forEach(([dx, h, w]) => { stoneWall(c, cx + dx - w / 2, gy - h, w, h, '#1a1618', '#0a0809', true); c.fillStyle = '#0a0809'; c.beginPath(); c.moveTo(cx + dx - w / 2 - 4, gy - h); c.lineTo(cx + dx, gy - h - 30); c.lineTo(cx + dx + w / 2 + 4, gy - h); c.fill(); for (let k = 1; k <= 3; k++) windowLit(c, cx + dx - 2, gy - h + 16 * k, 4, 8, '#ff5a1a'); });
        c.fillStyle = '#ff6a1a'; c.beginPath(); c.arc(cx, gy - 160, 7, 0, 7); c.fill(); c.fillStyle = '#000'; c.fillRect(cx - 1, gy - 167, 2, 14);
        c.fillStyle = '#050405'; c.fillRect(cx - 12, gy - 30, 24, 32); c.strokeStyle = '#3a2a2a'; c.lineWidth = 2; c.strokeRect(cx - 12, gy - 30, 24, 32);
    } else if (f === 3) {               // Isengard: Orthanc, čierna veža s prstencom hradieb a dymiacimi jamami
        hillBase(c, cx, gy, 100, 26, '#4a4a3a');
        c.strokeStyle = '#3a3a3e'; c.lineWidth = 10; c.beginPath(); c.ellipse(cx, gy - 6, 94, 24, 0, 0, 7); c.stroke(); c.strokeStyle = '#5a5a60'; c.lineWidth = 2; c.stroke();
        [[-60, 0], [-30, 6], [30, 6], [60, 0]].forEach(([dx, dy]) => { ell(c, cx + dx, gy + dy - 4, 10, 4, 0, '#1a1410'); ell(c, cx + dx, gy + dy - 4, 6, 2.5, 0, '#ff6a1a'); for (let k = 0; k < 3; k++) ell(c, cx + dx + k * 3, gy + dy - 14 - k * 9, 7 + k * 3, 5 + k * 2, 0, 'rgba(80,80,90,' + (.35 - k * .1) + ')'); });
        c.fillStyle = '#16161a'; c.beginPath(); c.moveTo(cx - 20, gy - 2); c.lineTo(cx - 14, gy - 160); c.lineTo(cx + 14, gy - 160); c.lineTo(cx + 20, gy - 2); c.fill();
        c.fillStyle = '#0a0a0c'; c.beginPath(); c.moveTo(cx + 4, gy - 2); c.lineTo(cx + 6, gy - 160); c.lineTo(cx + 14, gy - 160); c.lineTo(cx + 20, gy - 2); c.fill();
        [[-14, -160], [-5, -160], [5, -160], [14, -160]].forEach(([dx, dy]) => { c.fillStyle = '#16161a'; c.beginPath(); c.moveTo(cx + dx - 3, gy + dy); c.lineTo(cx + dx, gy + dy - 22); c.lineTo(cx + dx + 3, gy + dy); c.fill(); });
        c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(cx - 12, gy - 150, 3, 140);
        windowLit(c, cx - 2, gy - 120, 4, 7, '#c8e8ff'); windowLit(c, cx - 2, gy - 80, 4, 7, '#c8e8ff');
        // Biela ruka na hradbe
        c.fillStyle = '#f2f2f2'; c.fillRect(cx - 70, gy - 22, 10, 12); for (let k = 0; k < 4; k++) c.fillRect(cx - 69 + k * 2.5, gy - 30, 1.8, 9);
    } else if (f === 4 || f === 7) {    // Harad / Rhûn: pieskové hradby, kupoly, veža
        const sand = f === 4 ? '#c8a070' : '#a88060', dk = f === 4 ? '#a07a48' : '#7a5a40';
        hillBase(c, cx, gy, 100, 26, f === 4 ? '#b89060' : '#7a6a4a');
        stoneWall(c, cx - 96, gy - 40, 192, 42, sand, dk, false); merlons(c, cx - 96, gy - 40, 192, sand, 14);
        [[-50, 22, '#b8803a'], [0, 30, f === 4 ? '#d9a441' : '#8a2a4a'], [50, 22, '#b8803a']].forEach(([dx, r, col2]) => { stoneWall(c, cx + dx - r, gy - 40 - r * .6, r * 2, r * .6 + 2, sand, dk, false); c.fillStyle = col2; c.beginPath(); c.arc(cx + dx, gy - 40 - r * .6, r, Math.PI, 0); c.fill(); c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.arc(cx + dx - r * .3, gy - 40 - r * .6 - r * .3, r * .3, 0, 7); c.fill(); c.fillStyle = '#d9a441'; c.fillRect(cx + dx - 1.5, gy - 40 - r * 1.6 - 8, 3, 10); });
        stoneWall(c, cx + 78, gy - 120, 16, 82, sand, dk, false); c.fillStyle = f === 4 ? '#d9a441' : '#8a2a4a'; c.beginPath(); c.arc(cx + 86, gy - 120, 10, Math.PI, 0); c.fill();
        [[-80, -28], [-20, -28], [20, -28], [60, -28]].forEach(([dx, dy]) => windowLit(c, cx + dx, gy + dy, 5, 9, '#ffd27a'));
        c.fillStyle = '#3a2a1a'; c.fillRect(cx - 12, gy - 30, 24, 32); c.fillStyle = '#5a3a1a'; c.beginPath(); c.arc(cx, gy - 30, 12, Math.PI, 0); c.fill();
        banner(c, cx - 86, gy - 46, col, EC[f]);
    } else if (f === 5) {               // Erebor: hora s bránou a sochami trpaslíkov
        c.fillStyle = '#6a6a70'; c.beginPath(); c.moveTo(cx - 110, gy + 4); c.lineTo(cx - 40, gy - 120); c.lineTo(cx, gy - 175); c.lineTo(cx + 45, gy - 115); c.lineTo(cx + 110, gy + 4); c.fill();
        c.fillStyle = '#4a4a52'; c.beginPath(); c.moveTo(cx, gy - 175); c.lineTo(cx + 45, gy - 115); c.lineTo(cx + 110, gy + 4); c.lineTo(cx + 10, gy + 4); c.fill();
        c.fillStyle = '#f0f2f6'; c.beginPath(); c.moveTo(cx, gy - 175); c.lineTo(cx - 14, gy - 150); c.lineTo(cx - 4, gy - 146); c.lineTo(cx + 6, gy - 154); c.lineTo(cx + 16, gy - 142); c.lineTo(cx + 20, gy - 148); c.fill();
        stoneWall(c, cx - 50, gy - 60, 100, 62, '#5a5a62', '#3a3a42', true);
        c.fillStyle = '#2a2a30'; c.beginPath(); c.moveTo(cx - 22, gy + 2); c.lineTo(cx - 22, gy - 40); c.lineTo(cx, gy - 56); c.lineTo(cx + 22, gy - 40); c.lineTo(cx + 22, gy + 2); c.fill();
        c.fillStyle = '#d9a441'; c.fillRect(cx - 24, gy - 42, 48, 3); windowLit(c, cx - 4, gy - 20, 8, 20, '#ffb84a');
        [[-40, 1], [40, -1]].forEach(([dx, sd]) => { c.fillStyle = '#4a4a52'; c.fillRect(cx + dx - 8, gy - 70, 16, 70); c.fillStyle = '#5e5e66'; c.beginPath(); c.arc(cx + dx, gy - 70, 8, 0, 7); c.fill(); c.fillStyle = '#3a3a42'; c.fillRect(cx + dx - 10, gy - 44, 20, 6); });
        banner(c, cx + 60, gy - 60, col, EC[f]);
    } else if (f === 8) {               // Lothlórien: mallorny so zlatými korunami a talany
        hillBase(c, cx, gy, 100, 26, '#3f6a3a');
        [[-70, 1.0], [0, 1.25], [70, 1.0], [-35, .8], [35, .8]].sort((a, b) => a[1] - b[1]).forEach(([dx, s]) => {
            c.fillStyle = '#b8b0a0'; c.fillRect(cx + dx - 5 * s, gy - 120 * s, 10 * s, 120 * s); c.fillStyle = '#8a8070'; c.fillRect(cx + dx + 1, gy - 120 * s, 4 * s, 120 * s);
            [[0, -125, 46], [-22, -108, 30], [24, -104, 30], [0, -95, 38]].forEach(([ox, oy, r]) => ell(c, cx + dx + ox * s, gy + oy * s, r * s, r * .7 * s, 0, '#d9b85a'));
            [[-10, -130, 20], [14, -118, 16]].forEach(([ox, oy, r]) => ell(c, cx + dx + ox * s, gy + oy * s, r * s, r * .6 * s, 0, '#f0d890'));
            c.fillStyle = '#e8dcc0'; c.fillRect(cx + dx - 14 * s, gy - 70 * s, 28 * s, 5 * s); windowLit(c, cx + dx - 3 * s, gy - 82 * s, 6 * s, 8 * s, '#cfe8ff');
        });
        c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1; [[-70, 0], [0, 70], [-35, 35]].forEach(([a, b]) => { c.beginPath(); c.moveTo(cx + a, gy - 68); c.lineTo(cx + b, gy - 68); c.stroke(); });
    } else {                            // banditi: drevená ohrada a stany
        hillBase(c, cx, gy, 90, 24, '#5a5040');
        c.strokeStyle = '#4a3a2a'; c.lineWidth = 3; for (let k = -80; k <= 80; k += 7) { c.beginPath(); c.moveTo(cx + k, gy - 2); c.lineTo(cx + k, gy - 16 - (k % 14 ? 0 : 5)); c.stroke(); }
        [[-50, 30], [10, 36], [55, 26]].forEach(([dx, w]) => { c.fillStyle = '#6a5a40'; c.beginPath(); c.moveTo(cx + dx - w / 2, gy - 10); c.lineTo(cx + dx, gy - 10 - w * .9); c.lineTo(cx + dx + w / 2, gy - 10); c.fill(); c.fillStyle = '#4a3a28'; c.beginPath(); c.moveTo(cx + dx, gy - 10 - w * .9); c.lineTo(cx + dx + w / 2, gy - 10); c.lineTo(cx + dx + w * .1, gy - 10); c.fill(); });
        ell(c, cx - 10, gy - 14, 8, 4, 0, '#2a1a10'); ell(c, cx - 10, gy - 16, 4, 3, 0, '#ff8a20');
    }
};

/* ---------- dediny ---------- */
function house(c, x, y, w, h, wall, roof, dark) {
    groundShadow(c, x + w * .5 + 3, y + 3, w * .6, 4);
    c.fillStyle = wall; c.fillRect(x, y - h, w, h); c.fillStyle = dark; c.fillRect(x + w * .7, y - h, w * .3, h);
    c.fillStyle = roof; c.beginPath(); c.moveTo(x - 3, y - h); c.lineTo(x + w / 2, y - h - w * .55); c.lineTo(x + w + 3, y - h); c.fill();
    c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.moveTo(x + w / 2, y - h - w * .55); c.lineTo(x + w + 3, y - h); c.lineTo(x + w * .5, y - h); c.fill();
    windowLit(c, x + w * .35, y - h * .7, w * .18, h * .35, '#ffd27a');
    c.fillStyle = '#3a2a1a'; c.fillRect(x + w * .72, y - h * .5, w * .16, h * .5);
}
/** Štýl dediny podľa kraja: g bežná, a Mordor (čierne drevo, kože), d juh (hlina, ploché strechy), s sever (tmavé drevo, snehové strechy). */
const VSTYLE = { g: ['#d8d4c8', '#5a6a8a', 'rgba(80,100,40,.35)'], a: ['#3a3230', '#1a1410', 'rgba(20,10,5,.4)'], d: ['#d0a870', '#b06030', 'rgba(140,100,40,.35)'], s: ['#6a5040', '#e8ecf4', 'rgba(200,210,230,.4)'] };
MAPART.village = (c, lvl, reg, burned) => {
    const st = VSTYLE[reg] || VSTYLE.g, wall = burned ? '#2a2420' : st[0], roof = burned ? '#1a1410' : st[1], dark = burned ? '#15100c' : shade(wall, .75);
    const cx = VW2 / 2, gy = VH2 * .8, n = Math.min(7, 2 + lvl);
    ell(c, cx, gy + 2, 70, 16, 0, burned ? 'rgba(20,10,5,.35)' : st[2]);
    const spots = [[-42, 0, 34, 24], [0, -14, 40, 27], [42, 2, 32, 22], [-18, 16, 28, 19], [24, 18, 30, 20], [-60, 12, 24, 16], [60, -10, 24, 17]];
    spots.slice(0, n).sort((a, b) => a[1] - b[1]).forEach(([dx, dy, w, h]) => house(c, cx + dx - w / 2, gy + dy, w, h, wall, roof, dark));
    if (lvl >= 3 && !burned) { c.fillStyle = '#6a4a2a'; c.fillRect(cx + 62, gy - 26, 4, 28); c.fillStyle = '#d9a441'; c.beginPath(); c.moveTo(cx + 64, gy - 26); c.lineTo(cx + 76, gy - 22); c.lineTo(cx + 64, gy - 18); c.fill(); }   // zástava trhu
    if (lvl >= 4 && !burned) { c.fillStyle = '#8a8a90'; c.fillRect(cx - 74, gy - 10, 12, 12); c.fillStyle = '#4a3a2a'; c.beginPath(); c.moveTo(cx - 76, gy - 10); c.lineTo(cx - 68, gy - 20); c.lineTo(cx - 60, gy - 10); c.fill(); }   // studňa
    if (burned) for (let k = 0; k < 4; k++) ell(c, cx - 30 + k * 20, gy - 40 - k * 6, 10 + k * 3, 7 + k * 2, 0, 'rgba(60,60,60,' + (.35 - k * .07) + ')');
    else if (lvl >= 2) for (let k = 0; k < 2; k++) ell(c, cx + 2 + k * 3, gy - 34 - k * 7, 4 + k * 2, 3 + k, 0, 'rgba(200,200,200,.3)');   // dym z komína
};
/* ---------- pole, skalky, most ---------- */
MAPART.field = (c, v, reg) => {
    const R = rng(v * 13 + 1), w = 120, h = 80;
    const cols = { g: ['#8a9a3a', '#a8903a'], a: ['#3a2a24', '#4a3028'], d: ['#b8a060', '#c8b070'], s: ['#9aa0a8', '#b8bcc4'] }[reg] || ['#8a9a3a', '#a8903a'];
    c.fillStyle = cols[v % 2]; c.beginPath(); c.moveTo(6, 4); c.lineTo(w - 4, 8); c.lineTo(w - 8, h - 4); c.lineTo(4, h - 8); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 2; for (let k = 10; k < w; k += 9) { c.beginPath(); c.moveTo(k, 6); c.lineTo(k - 3, h - 6); c.stroke(); }
    c.strokeStyle = '#5a4a2a'; c.lineWidth = 2; c.beginPath(); c.moveTo(6, 4); c.lineTo(w - 4, 8); c.lineTo(w - 8, h - 4); c.lineTo(4, h - 8); c.closePath(); c.stroke();
    if (v % 2 && reg !== 'a') { c.fillStyle = reg === 's' ? '#f0f4f8' : '#d9c070'; for (let k = 0; k < 14; k++) c.fillRect(10 + R() * (w - 20), 8 + R() * (h - 16), 2, 5); }
    if (reg === 'a') { c.fillStyle = '#ff6a1a'; c.globalAlpha = .5; for (let k = 0; k < 6; k++) c.fillRect(10 + R() * (w - 20), 8 + R() * (h - 16), 3, 2); c.globalAlpha = 1; }
};
MAPART.rocks = (c, v) => {
    const R = rng(v * 31 + 5);
    for (let k = 0; k < 4 + v; k++) { const x = 10 + R() * 60, y = 14 + R() * 30, r = 5 + R() * 8; ell(c, x + 2, y + 3, r, r * .5, 0, 'rgba(0,0,0,.3)'); ell(c, x, y, r, r * .7, 0, '#7a7a72'); ell(c, x - r * .3, y - r * .3, r * .45, r * .3, -.4, '#9a9a92'); }
};
MAPART.bridge = (c) => {
    c.fillStyle = '#6a5a40'; c.fillRect(6, 10, 68, 20); c.fillStyle = '#4a3a28'; c.fillRect(6, 26, 68, 4);
    c.strokeStyle = '#3a2a18'; c.lineWidth = 1; for (let k = 10; k < 74; k += 6) { c.beginPath(); c.moveTo(k, 10); c.lineTo(k, 30); c.stroke(); }
    c.fillStyle = '#8a7a60'; c.fillRect(4, 6, 72, 4); c.fillRect(4, 30, 72, 3);
};

/** Všetky obrázky mapy ako [cesta, plátno]. */
MAPART.buildAll = () => {
    const out = [], draw = (w, h, fn) => { const cv = mkCanvas(w * 2, h * 2), c = cv.getContext('2d'); c.scale(2, 2); fn(c); return cv; };
    for (let f = 0; f <= 9; f++) out.push(['textures/map_castle_' + f + '.png', draw(CW, CH, c => MAPART.castle(c, f))]);
    for (const reg of ['g', 'a', 'd', 's']) {
        for (let l = 1; l <= 5; l++) out.push(['textures/map_village_' + reg + l + '.png', draw(VW2, VH2, c => MAPART.village(c, l, reg, false))]);
        for (let v = 0; v < 2; v++) out.push(['textures/map_field_' + reg + v + '.png', draw(120, 80, c => MAPART.field(c, v, reg))]);
    }
    out.push(['textures/map_village_burn.png', draw(VW2, VH2, c => MAPART.village(c, 3, 'g', true))]);
    for (let v = 0; v < 3; v++) out.push(['textures/map_rocks_' + v + '.png', draw(80, 50, c => MAPART.rocks(c, v))]);
    out.push(['textures/map_bridge.png', draw(80, 40, c => MAPART.bridge(c))]);
    return out;
};
