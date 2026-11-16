/*
 * Priechodnosť sveta a hľadanie cesty (etapa 2 prestavby mapy): more, jazerá a rieky sa nedajú prejsť,
 * rieky len cez mosty a brody (GEO.CROSS) a hrady stojace na rieke. Mriežka 180 × 120 políčok (10 jednotiek návrhu),
 * hľadanie A* s 8 smermi bez zrezávania rohov, výsledná trasa sa vyrovná (priama viditeľnosť).
 * navNext(o, tx, ty) vráti najbližší bod trasy pre hrdinu, armádu či posla; navOk(x, y) povie, či sa dá stáť na mieste.
 */
const NAV = (() => {
    const C = 180, R = 120, CS = WW / C, grid = new Uint8Array(C * R);   // 1 = priechodné
    let built = false;
    function build() {
        if (built || typeof GEO === 'undefined') return; built = true;
        const d = 1800 / C;
        for (let j = 0; j < R; j++) for (let i = 0; i < C; i++) {
            const x = (i + .5) * d, y = (j + .5) * d;
            grid[j * C + i] = GEO.still(x, y) || GEO.riverAt(x, y, Math.max(0, 7.6 - 0)) ? 0 : 1;
        }
        // prechody: mosty, brody a hrady na rieke (políčka v okruhu sa otvoria, ale nie more ani jazero)
        const open = (x, y, r) => { const ci = x / d, cj = y / d; for (let j = Math.floor(cj - r); j <= Math.ceil(cj + r); j++) for (let i = Math.floor(ci - r); i <= Math.ceil(ci + r); i++) { if (i < 0 || j < 0 || i >= C || j >= R) continue; if (Math.hypot(i + .5 - ci, j + .5 - cj) <= r && !GEO.still((i + .5) * d, (j + .5) * d)) grid[j * C + i] = 1; } };
        for (const c of GEO.CROSS) open(c.x, c.y, 1.7);
        if (typeof MAPDATA !== 'undefined') for (const c of MAPDATA.castles) if (GEO.riverAt(c[1], c[2], 8)) open(c[1], c[2], 1.8);
    }
    const cell = (x, y) => { const i = Math.floor(x / CS), j = Math.floor(y / CS); return i < 0 || j < 0 || i >= C || j >= R ? -1 : j * C + i; };
    const ok = (x, y) => { build(); const k = cell(x, y); return k >= 0 && grid[k] === 1; };
    /** Priama cesta bez vody? Presný prechod všetkými políčkami, ktoré úsečka pretína (cez roh len keď sú voľné obe susedné). */
    function los(ax, ay, bx, by) {
        build();
        const fx = ax / CS, fy = ay / CS, gx = bx / CS, gy = by / CS, dx = gx - fx, dy = gy - fy;
        let i = Math.floor(fx), j = Math.floor(fy); const ie = Math.floor(gx), je = Math.floor(gy), sx = Math.sign(dx), sy = Math.sign(dy);
        const at = (a, b) => a >= 0 && b >= 0 && a < C && b < R && grid[b * C + a] === 1;
        let tx = dx ? ((sx > 0 ? i + 1 : i) - fx) / dx : Infinity, ty = dy ? ((sy > 0 ? j + 1 : j) - fy) / dy : Infinity;
        const ddx = dx ? Math.abs(1 / dx) : Infinity, ddy = dy ? Math.abs(1 / dy) : Infinity;
        for (let n = 0; n < 2000; n++) {
            if (!at(i, j)) return false;
            if (i === ie && j === je) return true;
            if (Math.abs(tx - ty) < 1e-9) { if (!at(i + sx, j) || !at(i, j + sy)) return false; i += sx; j += sy; tx += ddx; ty += ddy; }
            else if (tx < ty) { i += sx; tx += ddx; } else { j += sy; ty += ddy; }
            if (Math.min(tx, ty) > 1 + 1e-9 && !(i === ie && j === je)) return at(ie, je);
        }
        return false;
    }
    /** Najbližšie priechodné miesto (stred políčka), alebo to isté, ak je priechodné. */
    function snap(x, y) {
        build(); if (ok(x, y)) return [x, y];
        const ci = Math.floor(x / CS), cj = Math.floor(y / CS);
        for (let r = 1; r < 60; r++) { let best = null, bd = 1e9;
            for (let j = cj - r; j <= cj + r; j++) for (let i = ci - r; i <= ci + r; i++) { if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== r || i < 0 || j < 0 || i >= C || j >= R || !grid[j * C + i]) continue; const px = (i + .5) * CS, py = (j + .5) * CS, dd = Math.hypot(px - x, py - y); if (dd < bd) { bd = dd; best = [px, py]; } }
            if (best) return best; }
        return [x, y];
    }
    // A* (binárna halda), 8 smerov, diagonála len keď sú voľné obe susedné strany
    const gS = new Float32Array(C * R), from = new Int32Array(C * R), seen = new Uint32Array(C * R), closed = new Uint32Array(C * R); let stamp = 0;
    function astar(s, g) {
        stamp++; const heap = [], f = [], push = (k, fk) => { heap.push(k); f.push(fk); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (f[p] <= f[i]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; [f[p], f[i]] = [f[i], f[p]]; i = p; } };
        const pop = () => { const top = heap[0], lk = heap.pop(), lf = f.pop(); if (heap.length) { heap[0] = lk; f[0] = lf; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && f[l] < f[m]) m = l; if (r < heap.length && f[r] < f[m]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; [f[m], f[i]] = [f[i], f[m]]; i = m; } } return top; };
        const gx = g % C, gy = (g / C) | 0, h = k => { const dx = Math.abs(k % C - gx), dy = Math.abs(((k / C) | 0) - gy); return dx + dy + (1.4142 - 2) * Math.min(dx, dy); };
        seen[s] = stamp; gS[s] = 0; from[s] = -1; push(s, h(s));
        let n = 0;
        while (heap.length) {
            const k = pop(); if (closed[k] === stamp) continue; closed[k] = stamp;
            if (k === g) { const path = []; for (let q = g; q >= 0; q = from[q]) path.push(q); return path.reverse(); }
            if (++n > 22000) break;
            const x = k % C, y = (k / C) | 0;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= C || ny >= R) continue;
                const nk = ny * C + nx; if (!grid[nk] || closed[nk] === stamp) continue;
                if (dx && dy && (!grid[y * C + nx] || !grid[ny * C + x])) continue;   // nezrezávať roh cez vodu
                const ng = gS[k] + (dx && dy ? 1.4142 : 1);
                if (seen[nk] !== stamp || ng < gS[nk]) { seen[nk] = stamp; gS[nk] = ng; from[nk] = k; push(nk, ng + h(nk)); }
            }
        }
        return null;
    }
    /** Trasa z (ax, ay) do (bx, by) v súradniciach sveta: zoznam bodov (bez štartu), vyrovnaná podľa priamej viditeľnosti. */
    function path(ax, ay, bx, by) {
        build(); [ax, ay] = snap(ax, ay); [bx, by] = snap(bx, by);
        if (los(ax, ay, bx, by)) return [[bx, by]];
        const s = cell(ax, ay), g = cell(bx, by); if (s < 0 || g < 0) return null;
        const cells = astar(s, g); if (!cells) return null;
        const pts = cells.map(k => [(k % C + .5) * CS, (((k / C) | 0) + .5) * CS]); pts[pts.length - 1] = [bx, by];
        const out = []; let cur = [ax, ay], i = 0;
        while (i < pts.length) { let j = pts.length - 1; while (j > i && !los(cur[0], cur[1], pts[j][0], pts[j][1])) j--; out.push(pts[j]); cur = pts[j]; i = j + 1; }
        return out;
    }
    let budget = 8;
    /** Ďalší bod na ceste objektu o (hrdina, armáda, posol) k cieľu; trasa sa pamätá v o._nv. Bez rozpočtu na výpočet vráti null (počká). */
    function next(o, tx, ty) {
        build();
        if (los(o.x, o.y, tx, ty)) { o._nv = null; return [tx, ty]; }
        const gk = cell(...snap(tx, ty)), nv = o._nv;
        if (!nv || nv.g !== gk || nv.t-- <= 0) {
            if (budget <= 0) return nv && nv.g === gk ? nv.p[Math.min(nv.i, nv.p.length - 1)] : null;
            budget--; const p = path(o.x, o.y, tx, ty); if (!p) { o._nv = null; return null; }
            o._nv = { g: gk, p, i: 0, t: 240 };
        }
        const v = o._nv;
        while (v.i < v.p.length - 1 && (Math.hypot(v.p[v.i][0] - o.x, v.p[v.i][1] - o.y) < CS * .45 || los(o.x, o.y, v.p[v.i + 1][0], v.p[v.i + 1][1]))) v.i++;
        return v.p[v.i];
    }
    return { build, ok, los, snap, path, next, get grid() { build(); return grid; }, C, R, CS, resetBudget(n = 8) { budget = n; } };
})();
const navOk = (x, y) => NAV.ok(x, y);
/** Pohyb k cieľu po súši: vráti smer [dx, dy, vzdialenosť k bodu trasy] alebo null (stoj). */
function navStep(o, tx, ty) {
    const w = NAV.next(o, tx, ty); if (!w) return null;
    const dx = w[0] - o.x, dy = w[1] - o.y, d = Math.hypot(dx, dy);
    return d < .001 ? null : [dx / d, dy / d, d];
}
/** Posun objektu o o krok m v smere st (z navStep). Keď by krok skončil vo vode, skúsi kĺzať pozdĺž brehu (len jedna os);
 *  ak ani to nejde, zabudne trasu (vypočíta sa nová) a vráti false. */
function navMove(o, st, m, clamp) {
    const ok = (x, y) => NAV.ok(x, y), cx = x => clamp ? Math.max(10, Math.min(WW - 10, x)) : x, cy = y => clamp ? Math.max(10, Math.min(WH - 10, y)) : y;
    let x = cx(o.x + st[0] * m), y = cy(o.y + st[1] * m);
    if (ok(x, y)) { o.x = x; o.y = y; return true; }
    x = cx(o.x + Math.sign(st[0]) * m * Math.max(.5, Math.abs(st[0]))); if (Math.abs(st[0]) > .1 && ok(x, o.y)) { o.x = x; return true; }
    y = cy(o.y + Math.sign(st[1]) * m * Math.max(.5, Math.abs(st[1]))); if (Math.abs(st[1]) > .1 && ok(o.x, y)) { o.y = y; return true; }
    o._nv = null; return false;
}
/** Po načítaní uloženej hry alebo zmene mapy: hrdina, armády, dediny a poslovia nesmú stáť vo vode. */
function navFixPositions() {
    const fix = o => { if (o && o.x != null && !NAV.ok(o.x, o.y)) { const [x, y] = NAV.snap(o.x, o.y); o.x = x; o.y = y; } };
    if (typeof G !== 'undefined' && G) { fix(G); if (!NAV.ok(G.tx, G.ty)) { G.tx = G.x; G.ty = G.y; } (G.envs || []).forEach(fix); (G.cars || []).forEach(fix); }
    if (typeof E !== 'undefined') E.forEach(fix);
    if (typeof VL !== 'undefined') VL.forEach(fix);
}
