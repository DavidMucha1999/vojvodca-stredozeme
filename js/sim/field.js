/*
 * Bojisko podľa miesta na mape: hustota lesa (dlaždice T.forest v okolí), blízkosť veľkej rieky (js/data/geo.js), kopce (hory T.mountains) a kraj (regionAt). FIELD nastaví startBattle; BattleScene podľa neho kreslí
 * stromy, rieku s brodom, kopec a skaly; simulácia spomaľuje v lese a vo vode a dáva výhodu z kopca.
 */
let FIELD = { forest: 0, river: false, hill: null, trees: [], reg: 'g' };
/** Body všetkých riek (v jednotkách sveta) z geografie (js/data/geo.js); rieky sú oddelené – susedné body môžu patriť rôznym riekam. */
const riverPoints = (() => { let pts = null; return () => {
    if (pts) return pts;
    pts = typeof GEO !== 'undefined' ? GEO.RIVERS.flatMap(R => R.pts.map(([x, y]) => [x * K, y * K])) : [];
    return pts;
}; })();
function battleTerrain(x, y) {
    const T = typeof MAPDATA !== 'undefined' && MAPDATA.terrain, reg = regionAt(x, y);
    let forest = 0, hill = null, river = false;
    if (T) {
        const ci = Math.floor(x / WW * T.cols), cj = Math.floor(y / WH * T.rows);
        let n = 0, f = 0;
        for (let j = cj - 2; j <= cj + 2; j++) for (let i = ci - 2; i <= ci + 2; i++) { if (i < 0 || j < 0 || i >= T.cols || j >= T.rows) continue; n++; if (T.forest[j * T.cols + i] >= 33) f++; }
        forest = n ? f / n : 0;
        for (const [mx, my, size] of T.mountains || []) { const d = Math.hypot(mx * K - x, my * K - y); if (d < size * K * .9) { hill = { kind: size > 55 ? 'mountain' : 'hill' }; break; } }
    }
    const rd = Math.min(...riverPoints().map(([px, py]) => Math.hypot(px - x, py - y)));
    river = rd < 45 * K;
    // stromy: zhluky podľa hustoty lesa (0 až 1), deterministicky podľa polohy
    let seed = Math.floor(x / 7 + y / 11) + 13; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
    const trees = [], groves = Math.round(2 + forest * 14);
    for (let i = 0; i < groves; i++) { const cx = 100 + rnd() * (BFW - 200), cy = 50 + rnd() * (BFH - 100), r = 40 + rnd() * 50 + forest * 40; if (river && cx > 660 && cx < 780) continue; if (Math.abs(cy - BFH / 2) < 160 && cx > 400 && cx < BFW - 400) continue; trees.push({ x: cx, y: cy, r }); }
    const F = { forest, river, hill, trees, reg, mountain: hill && hill.kind === 'mountain' };
    // kmene stromov ako prekážky (3D vrstva ich neskôr nahradí presnými miestami z obrazu – obsSet)
    const dens = .6 + forest * 1.4, ob = [];
    for (const tr of trees) { const n = Math.round(tr.r * tr.r / 420 * dens); for (let j = 0; j < n; j++) { const a = rnd() * 6.283, d = Math.sqrt(rnd()) * tr.r; ob.push([tr.x + Math.cos(a) * d, tr.y + Math.sin(a) * d * .8, 2.6, 26]); } }
    obsSet(ob);
    return F;
}
/** Prekážky na bojisku: kmene stromov a balvany [x, y, polomer, výška] v mriežke 40 jednotiek. Vojaci sa o ne neprekrývajú a šípy sa o ne zastavia. */
let OBS = [], OBG = new Map();
function obsSet(list) {
    OBS = list.filter(o => o[0] > 0 && o[1] > 0 && o[0] < BW && o[1] < BH); OBG = new Map();
    for (const o of OBS) { const k = (o[0] / 40 | 0) * 4096 + (o[1] / 40 | 0); const a = OBG.get(k); if (a) a.push(o); else OBG.set(k, [o]); }
}
function obsAdd(list) { obsSet(OBS.concat(list)); }
/** Vojaci a hrdina sa nedostanú do kmeňov a balvanov: vytlačia sa na okraj prekážky a kĺžu popri nej. Volá updBattle raz za snímok. */
function obsUnits() {
    if (!OBS.length || SGB) return;
    for (const u of U) {
        if (u.hp <= 0 || u.fled) continue;
        const cx = u.x / 40 | 0, cy = u.y / 40 | 0, ur = (u.r || 7) * .45;
        for (let i = cx - 1; i <= cx + 1; i++) for (let j = cy - 1; j <= cy + 1; j++) {
            const c = OBG.get(i * 4096 + j); if (!c) continue;
            for (const o of c) {
                const dx = u.x - o[0], dy = u.y - o[1], d = Math.hypot(dx, dy), m = o[2] + ur;
                if (d < m) { const k = d > .01 ? 1 / d : 0; u.x = o[0] + (d > .01 ? dx * k : 1) * m; u.y = o[1] + (d > .01 ? dy * k : 0) * m; }
            }
        }
    }
}
/** Šíp, ktorý v poslednom kroku (px,py → a.x,a.y) narazil do kmeňa alebo balvana pod ich výškou. */
function obsArrow(a, px, py) {
    if (!OBS.length || SGB) return false;
    const cx = a.x / 40 | 0, cy = a.y / 40 | 0;
    for (let i = cx - 1; i <= cx + 1; i++) for (let j = cy - 1; j <= cy + 1; j++) {
        const c = OBG.get(i * 4096 + j); if (!c) continue;
        for (const o of c) if (a.z < o[3] && Math.hypot(o[0] - a.sx, o[1] - a.sy) > 9 && segD(px, py, a.x, a.y, o[0], o[1]) < o[2] + .8) return true;
    }
    return false;
}
/** Spomalenie jednotky podľa terénu (les, voda) a bonus z kopca. */
function fieldSlow(u) {
    let s = 1;
    if (FIELD.river && u.x > 690 && u.x < 750 && (u.y < 440 || u.y > 520)) s *= .5;
    if (FIELD.trees.length) for (const t of FIELD.trees) if (Math.hypot(t.x - u.x, t.y - u.y) < t.r) { s *= .72; break; }
    if (FIELD.reg === 's' || FIELD.reg === 'd') s *= .92;   // sneh a piesok
    if (FIELD.hill && (u.vx3 || u.vy3)) {   // svah kopca: do kopca sa ide pomalšie (najviac o 25 % v strede), z kopca rýchlejšie
        const hx = BFW * .62 - u.x, hy = BFH * .5 - u.y, d = Math.hypot(hx, hy);
        if (d < 170 && d > 1) { const v = Math.hypot(u.vx3, u.vy3) || 1, c = (u.vx3 * hx + u.vy3 * hy) / (v * d), sl = 1 - d / 170; s *= c > 0 ? 1 - .25 * sl * c : 1 - .12 * sl * c; }
    }
    return s;
}
const onHill = u => FIELD.hill && Math.hypot(u.x - BFW * .62, u.y - BFH * .5) < 170;
