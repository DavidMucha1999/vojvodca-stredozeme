/*
 * Bojisko podľa miesta na mape: hustota lesa (dlaždice T.forest v okolí), blízkosť rieky Anduiny (bezierová krivka
 * ako v MapScene), kopce (hory T.mountains) a kraj (regionAt). FIELD nastaví startBattle; BattleScene podľa neho kreslí
 * stromy, rieku s brodom, kopec a skaly; simulácia spomaľuje v lese a vo vode a dáva výhodu z kopca.
 */
let FIELD = { forest: 0, river: false, hill: null, trees: [], reg: 'g' };
/** Body rieky (v jednotkách sveta) – rovnaká krivka ako na mape. */
const riverPoints = (() => { let pts = null; return () => {
    if (pts) return pts;
    const R = [[640, 0], [600, 300], [820, 420], [780, 640], [760, 800], [900, 880], [860, 1200]].map(([x, y]) => [x * K, y * K]);
    const bz = (p0, p1, p2, p3, t) => { const u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]; };
    pts = [];
    for (let i = 0; i <= 80; i++) pts.push(bz(R[0], R[1], R[2], R[3], i / 80));
    for (let i = 0; i <= 80; i++) pts.push(bz(R[3], R[4], R[5], R[6], i / 80));
    return pts;
}; })();
function battleTerrain(x, y) {
    const T = typeof MAPDATA !== 'undefined' && MAPDATA.terrain, reg = typeof regionAt === 'function' ? regionAt(x, y) : 'g';
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
    for (let i = 0; i < groves; i++) { const cx = 120 + rnd() * (BW - 240), cy = 60 + rnd() * (BH - 120), r = 40 + rnd() * 50 + forest * 40; if (river && cx > 660 && cx < 780) continue; trees.push({ x: cx, y: cy, r }); }
    return { forest, river, hill, trees, reg, mountain: hill && hill.kind === 'mountain' };
}
/** Spomalenie jednotky podľa terénu (les, voda) a bonus z kopca. */
function fieldSlow(u) {
    let s = 1;
    if (FIELD.river && u.x > 690 && u.x < 750 && (u.y < 440 || u.y > 520)) s *= .5;
    if (FIELD.trees.length) for (const t of FIELD.trees) if (Math.hypot(t.x - u.x, t.y - u.y) < t.r) { s *= .72; break; }
    if (FIELD.reg === 's' || FIELD.reg === 'd') s *= .92;   // sneh a piesok
    return s;
}
const onHill = u => FIELD.hill && Math.hypot(u.x - BW * .62, u.y - BH * .5) < 170;
