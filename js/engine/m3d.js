/*
 * ENGINE: 3D mapa (Three.js). Hra na mape ostáva rovnaká (js/sim, hľadanie cesty v nav.js), mení sa len zobrazenie:
 *   – krajina: výškové pole z MAPDATA a GEO (hory z reťazí, rieky, jazerá a more vyhĺbené, hrady a cesty zarovnané), vrcholové farby podľa druhu zeme,
 *     skaly a sneh podľa výšky, cesty ako vyšliapaná zem, voda s priehľadnou hladinou, lesy ako instancované stromy;
 *   – hrdina a velitelia sú postavy z 3D bitky (B3.kit.rig): rovnaký avatar a výbava, kôň, zástava; chôdza a cval podľa rýchlosti;
 *   – dediny sú domčeky, hrady modely z dielov: stavebnica podľa frakcie a vlastné modely (Minas Tirith v siedmich stupňoch, Edoras, Helmov žľab,
 *     Barad-dûr, Isengard s Orthancom, Erebor, Hobitov, Minas Morgul, Osgiliath, Rivendell) podľa opisov v Tolkienových knihách;
 *   – kamera: šikmo zhora, koliesko približuje (Z z mapy), Q a E alebo pravé tlačidlo otáčajú; klik na zem sa premieta lúčom do súradníc sveta.
 * Phaser (MapScene) beží ďalej: počíta pohyb, hľadá objekty pod kurzorom a kreslí štítky, ktoré sa sem premietajú z 3D polohy.
 * Súradnice: x sveta = X, y sveta = Z, výška = Y (jednotka je pixel sveta, postava ≈ 26 × 2,2 jednotiek).
 */
const M3 = (() => {
    const T = () => window.THREE, FS = 2.6, GX = 300, GY = 200, CX = WW / GX, CY = WH / GY, NX = GX + 1;
    let on = false, failed = false, R = null, canvas = null, scene3 = null, cam3 = null, hemi = null, sun = null, fogc = null, terrain = null, water = null;
    let hg = null, castles = [], fig = new Map(), hero = null, yaw = 0, pitch = .95, fw = 0, fh = 0, clock = 0, route = null, mark = null, shadowG = null, shadowM = null, rings = {}, vills = null, treeM = [], drag = null, bud = 0, tgtKey = '';
    const hs = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
    const vn = (x, y) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); return (hs(ix, iy) * (1 - u) + hs(ix + 1, iy) * u) * (1 - v) + (hs(ix, iy + 1) * (1 - u) + hs(ix + 1, iy + 1) * u) * v; };
    const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const want = () => typeof OPT !== 'undefined' ? OPT.map3d !== false && !failed && typeof B3 !== 'undefined' && B3.want() : !failed;

    /** Výška krajiny v bode sveta (dvojlineárne z mriežky). */
    function heightAt(x, y) {
        if (!hg) return 0;
        x = Math.max(0, Math.min(WW - .01, x)); y = Math.max(0, Math.min(WH - .01, y));
        const fx = x / CX, fy = y / CY, i = fx | 0, j = fy | 0, u = fx - i, v = fy - j, k = j * NX + i;
        return (hg[k] * (1 - u) + hg[k + 1] * u) * (1 - v) + (hg[k + NX] * (1 - u) + hg[k + NX + 1] * u) * v;
    }

    // ---------- zlučovanie dielov do jednej siete s farbami vrcholov ----------
    let SH = null;
    function shapes() {
        if (SH) return SH; const t = T();
        const prism = (() => { const A = [-.5, -.5, -.5], B = [.5, -.5, -.5], C = [.5, -.5, .5], D = [-.5, -.5, .5], E = [-.5, .5, 0], F = [.5, .5, 0], tr = [[A, F, B], [A, E, F], [C, E, D], [C, F, E], [A, D, E], [C, B, F]];
            const g = new t.BufferGeometry(); g.setAttribute('position', new t.Float32BufferAttribute(tr.flat(2), 3)); g.computeVertexNormals(); return g; })();
        return (SH = { box: new t.BoxGeometry(1, 1, 1), cyl: new t.CylinderGeometry(.5, .5, 1, 10), cyl6: new t.CylinderGeometry(.5, .5, 1, 6), cone: new t.ConeGeometry(.5, 1, 10), cone5: new t.ConeGeometry(.5, 1, 5), sph: new t.SphereGeometry(.5, 12, 8), hemi: new t.SphereGeometry(.5, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), prism });
    }
    function Mesher() {
        const t = T(), pos = [], nor = [], col = [], S = shapes();
        const me = {
            add(shape, color, p, r, s) {
                const g0 = S[shape], m = new t.Matrix4().compose(new t.Vector3(...p), new t.Quaternion().setFromEuler(new t.Euler(...r)), new t.Vector3(...s)), g = g0.index ? g0.toNonIndexed() : g0.clone();
                g.applyMatrix4(m); const P = g.attributes.position.array, N = g.attributes.normal.array, c = new t.Color(color);
                for (let i = 0; i < P.length; i += 3) { pos.push(P[i], P[i + 1], P[i + 2]); nor.push(N[i], N[i + 1], N[i + 2]); col.push(c.r, c.g, c.b); }
                g.dispose(); return me;
            },
            bx: (c, x, y0, z, w, h, d, ry = 0) => me.add('box', c, [x, y0 + h / 2, z], [0, ry, 0], [w, h, d]),
            cy: (c, x, y0, z, rad, h, ry = 0) => me.add('cyl', c, [x, y0 + h / 2, z], [0, ry, 0], [rad * 2, h, rad * 2]),
            cn: (c, x, y0, z, rad, h, ry = 0) => me.add('cone', c, [x, y0 + h / 2, z], [0, ry, 0], [rad * 2, h, rad * 2]),
            cn5: (c, x, y0, z, rad, h, ry = 0) => me.add('cone5', c, [x, y0 + h / 2, z], [0, ry, 0], [rad * 2, h, rad * 2]),
            pr: (c, x, y0, z, w, h, d, ry = 0) => me.add('prism', c, [x, y0 + h / 2, z], [0, ry, 0], [w, h, d]),
            dome: (c, x, y0, z, rad, h) => me.add('hemi', c, [x, y0, z], [0, 0, 0], [rad * 2, h * 2, rad * 2]),
            build() {
                const g = new t.BufferGeometry(); g.setAttribute('position', new t.BufferAttribute(new Float32Array(pos), 3)); g.setAttribute('normal', new t.BufferAttribute(new Float32Array(nor), 3)); g.setAttribute('color', new t.BufferAttribute(new Float32Array(col), 3));
                g.computeBoundingSphere(); return g;
            }
        };
        return me;
    }
    const mkMesh = g => new (T().Mesh)(g, mat());
    let MT = null; const mat = () => MT || (MT = new (T().MeshLambertMaterial)({ vertexColors: true }));

    // ---------- krajina ----------
    function buildField(sc) {
        const TR = MAPDATA.terrain, NY = GY + 1; hg = new Float32Array(NX * NY);
        const wet = new Float32Array(NX * NY), cr = GEO.CROSS.filter(c => c.k === 'brod').map(c => [c.x * K, c.y * K]);   // brody ostanú plytké, pod mostmi tečie rieka
        for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
            const x = i * CX, y = j * CY; let w = 0;
            if (GEO.still(x / K, y / K) || GEO.riverAt(x / K, y / K, 1.6)) { w = 1; for (const c of cr) if (Math.abs(c[0] - x) < 44 && Math.abs(c[1] - y) < 44 && Math.hypot(c[0] - x, c[1] - y) < 44) { w = 0; break; } }
            wet[j * NX + i] = w;
            hg[j * NX + i] = 16 + (vn(x / 700, y / 700) * 2 - 1) * 10 + (vn(x / 210, y / 210) * 2 - 1) * 4 + (vn(x / 70, y / 70) * 2 - 1) * 1.5;   // nad hladinou vody (−3)
        }
        for (let pass = 0; pass < 2; pass++) { const c = wet.slice(); for (let j = 1; j < NY - 1; j++) for (let i = 1; i < NX - 1; i++) { let s = 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) s += c[(j + dj) * NX + i + di]; wet[j * NX + i] = s / 9; } }
        for (const m of TR.mountains) {
            const mx = m[0] * K, my = m[1] * K, r = m[2] * K * .8, amp = m[2] * K * (m[3] === 'doom' ? 1.15 : m[3] === 'dark' ? .8 : .7) * (.85 + hs(m[0], m[1]) * .4), R2 = r * 1.8;
            for (let j = Math.max(0, Math.floor((my - R2) / CY)); j <= Math.min(GY, Math.ceil((my + R2) / CY)); j++) for (let i = Math.max(0, Math.floor((mx - R2) / CX)); i <= Math.min(GX, Math.ceil((mx + R2) / CX)); i++) {
                const x = i * CX, y = j * CY, d = Math.hypot(x - mx, y - my); if (d > R2) continue; const q = d / r;
                hg[j * NX + i] += amp * Math.exp(-q * q * 1.3) * (.82 + .36 * vn(x / 55, y / 55));
            }
        }
        for (let k = 0; k < hg.length; k++) { const s = sm(.14, .55, wet[k]); hg[k] = hg[k] * (1 - s) + -18 * s; }
        for (const t of TW) {   // hrad stojí na rovine
            const r1 = 150; for (let j = Math.max(0, Math.floor((t.y - r1) / CY)); j <= Math.min(GY, Math.ceil((t.y + r1) / CY)); j++) for (let i = Math.max(0, Math.floor((t.x - r1) / CX)); i <= Math.min(GX, Math.ceil((t.x + r1) / CX)); i++) {
                const d = Math.hypot(i * CX - t.x, j * CY - t.y), k = j * NX + i; if (hg[k] < -2 && d > 130) continue; const q = d < 90 ? 1 : 1 - sm(90, r1, d); hg[k] = hg[k] * (1 - q) + 14 * q;
            }
        }
        // farby
        const C = T().Color, pal = ['#4a6d33', '#5a6a36', '#6e6a3e', '#76603e', '#3a2a26', '#b8955a', '#d8dee6', '#24526a'].map(h => new C(h)), rock = new C('#5a5650'), rockD = new C('#2a2422'), snow = new C('#eef2f6'), sand = new C('#a8946a'), deep = new C('#0c2a38'), road = new C('#7e6a48'), tmp = new C();
        const pos = new Float32Array(NX * NY * 3), col = new Float32Array(NX * NY * 3);
        const rp = (sc && sc.roadPts) || [];
        for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
            const k = j * NX + i, x = i * CX, y = j * CY, h = hg[k], ti = Math.min(TR.cols - 1, x / (WW / TR.cols) | 0), tj = Math.min(TR.rows - 1, y / (WH / TR.rows) | 0), g = TR.ground[tj * TR.cols + ti] || 1, grp = Math.min(6, Math.floor((g - 1) / 4));
            tmp.copy(pal[grp]); const vv = .88 + .24 * vn(x / 95, y / 95) + (hs(i, j) - .5) * .06; tmp.multiplyScalar(vv * 1.14);
            const rg = regionAt(x, y), dk = rg === 'a'; if (dk) tmp.multiplyScalar(.5).lerp(new C('#3a1a12'), .25);   // Mordor: tmavá spálená zem
            const rk = sm(70, 150, h); if (rk > 0) tmp.lerp(dk ? rockD : rock, rk * .95);
            if (!dk && rg !== 'd') { const sn = sm(170, 250, h + (rg === 's' ? 70 : 0)); if (sn > 0) tmp.lerp(snow, sn); }
            const w = wet[k]; if (w > .03) { tmp.lerp(sand, sm(.03, .3, w) * .85); if (h < -2) tmp.lerp(deep, sm(-2, -16, h)); }
            col[k * 3] = tmp.r; col[k * 3 + 1] = tmp.g; col[k * 3 + 2] = tmp.b; pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = y;
        }
        for (const p of rp) { const ci = Math.round(p.x / CX), cj = Math.round(p.y / CY); for (let j = cj - 1; j <= cj + 1; j++) for (let i = ci - 1; i <= ci + 1; i++) { if (i < 0 || j < 0 || i > GX || j > GY) continue; const k = j * NX + i; if (hg[k] < 0) continue; const d = Math.hypot(i * CX - p.x, j * CY - p.y), q = 1 - sm(10, 40, d); if (q <= 0) continue; col[k * 3] += (road.r - col[k * 3]) * q * .8; col[k * 3 + 1] += (road.g - col[k * 3 + 1]) * q * .8; col[k * 3 + 2] += (road.b - col[k * 3 + 2]) * q * .8; } }
        const idx = new Uint32Array(GX * GY * 6); let n = 0;
        for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) { const a = j * NX + i, b = a + 1, c = a + NX, d = c + 1; idx[n++] = a; idx[n++] = c; idx[n++] = b; idx[n++] = b; idx[n++] = c; idx[n++] = d; }
        const g = new (T().BufferGeometry)(); g.setAttribute('position', new (T().BufferAttribute)(pos, 3)); g.setAttribute('color', new (T().BufferAttribute)(col, 3)); g.setIndex(new (T().BufferAttribute)(idx, 1)); g.computeVertexNormals(); g.computeBoundingSphere();
        terrain = new (T().Mesh)(g, new (T().MeshLambertMaterial)({ vertexColors: true })); scene3.add(terrain);
        water = new (T().Mesh)(new (T().PlaneGeometry)(WW * 1.8, WH * 1.8).rotateX(-Math.PI / 2), new (T().MeshPhongMaterial)({ color: 0x2f6b8a, transparent: true, opacity: .84, shininess: 90, specular: 0x8fb0c0, depthWrite: false }));
        water.position.set(WW / 2, -3, WH / 2); scene3.add(water);
    }

    function buildTrees(sc) {
        const TR = MAPDATA.terrain, t = T(), cell = WW / TR.cols, road = new Set(); for (const p of (sc.roadPts || [])) road.add((p.x / 60 | 0) * 4096 + (p.y / 60 | 0));
        const list = [];
        for (let j = 0; j < TR.rows; j++) for (let i = 0; i < TR.cols; i++) {
            const f = TR.forest[j * TR.cols + i]; if (f < 33) continue; const dead = f >= 37, n = dead ? 1 : 3 + (hs(i, j) * 2 | 0);
            for (let q = 0; q < n; q++) {
                const x = (i + hs(i * 3 + q, j)) * cell, y = (j + hs(i, j * 5 + q + 7)) * cell; if (heightAt(x, y) < -1 || road.has((x / 60 | 0) * 4096 + (y / 60 | 0))) continue;
                if (TW.some(c => Math.abs(c.x - x) < 120 && Math.abs(c.y - y) < 120)) continue; list.push([x, y, dead, hs(x, y)]);
            }
        }
        const cone = new t.ConeGeometry(1, 1, 7).translate(0, .5, 0), trunk = new t.CylinderGeometry(.5, .6, 1, 5).translate(0, .5, 0), m4 = new t.Matrix4(), q = new t.Quaternion(), e = new t.Euler(), c = new t.Color();
        const A = new t.InstancedMesh(cone, new t.MeshLambertMaterial({ color: 0xffffff }), list.length), B = new t.InstancedMesh(trunk, new t.MeshLambertMaterial({ color: 0x4a3420 }), list.length);
        list.forEach(([x, y, dead, r], k) => {
            const h = heightAt(x, y), rad = 15 + r * 12, hh = (dead ? 40 : 66) + r * 40, rg = regionAt(x, y); e.set(0, r * 20, 0); q.setFromEuler(e);
            m4.compose(new t.Vector3(x, h + 14, y), q, new t.Vector3(dead ? 6 : rad, hh, dead ? 6 : rad)); A.setMatrixAt(k, m4);
            c.set(dead ? '#4a4038' : rg === 'a' ? '#3a3a32' : rg === 's' ? '#2c4a42' : ['#2c5a26', '#35672b', '#26501f', '#456e2c'][(r * 4) | 0]); c.multiplyScalar(.85 + r * .3); A.setColorAt(k, c);
            m4.compose(new t.Vector3(x, h - 2, y), q, new t.Vector3(5 + r * 2, 22, 5 + r * 2)); B.setMatrixAt(k, m4);
        });
        A.instanceMatrix.needsUpdate = B.instanceMatrix.needsUpdate = true; A.frustumCulled = B.frustumCulled = false; scene3.add(A, B); treeM = [A, B];
    }

    function buildVillages() {
        const M = Mesher();
        for (const v of VL) {
            const f = TW[v.t] ? TW[v.t].f : 0, evil = bloc(f) === 1 && f !== 4, burn = v.st > 0, n = 3 + (lvl(v) | 0);
            for (let q = 0; q < n; q++) {
                const a = q / n * 6.283 + hs(v.x, v.y) * 3, rr = q ? 12 + hs(q, v.x) * 16 : 0, x = v.x + Math.cos(a) * rr, z = v.y + Math.sin(a) * rr, y = Math.max(0, heightAt(x, z)), w = 13 + hs(q, v.y) * 6, d = 9 + hs(v.x, q) * 4, hh = 8 + hs(q + 3, v.x) * 3, ry = a;
                M.bx(burn ? '#2a2420' : evil ? '#4a3a32' : ['#b8a888', '#c8b898', '#a89878'][q % 3], x, y, z, w, hh, d, ry);
                M.pr(burn ? '#1a1410' : evil ? '#2a2420' : ['#8a6a3a', '#7a4a30', '#9a7a42'][q % 3], x, y + hh, z, w * 1.15, 7, d * 1.15, ry);
            }
        }
        vills = mkMesh(M.build()); scene3.add(vills);
    }

    // ---------- mosty a brody ----------
    let bridges = [];
    /** Smer toku a šírka rieky v blízkosti prechodu (súradnice sveta). */
    function riverAtCross(c) {
        const R0 = GEO.riverAt(c.x, c.y, 14); if (!R0) return null; let best = 1e9, tx = 1, tz = 0, wd = 8;
        for (let i = 1; i < R0.pts.length; i++) { const [ax, ay] = R0.pts[i - 1], [bx, by] = R0.pts[i], mx = (ax + bx) / 2, my = (ay + by) / 2, d = Math.hypot(mx - c.x, my - c.y); if (d < best) { best = d; const l = Math.hypot(bx - ax, by - ay) || 1; tx = (bx - ax) / l; tz = (by - ay) / l; wd = R0.wd[i]; } }
        return { tx, tz, wd };
    }
    function buildCrossings() {
        bridges = []; const M = Mesher(), grp = [];
        for (const c of GEO.CROSS) {
            const rv = riverAtCross(c) || { tx: 0, tz: 1, wd: 8 }, cx = c.x * K, cz = c.y * K, wood = c.x < 700;
            let dx = -rv.tz, dz = rv.tx;   // smer mosta kolmo na tok
            const hl = rv.wd * K / 2 + 46;
            if (c.k === 'most') {
                const n = 9, W2 = 34, stone = wood ? '#8a6a40' : '#b8b0a0', stone2 = wood ? '#6a4e30' : '#9a9284', th = Math.atan2(-dz, dx), L = new (T().Group)();
                const B = Mesher();
                for (let i = -n; i <= n; i++) { const t = i / n, y = 7 + 7 * (1 - t * t), len = 2 * hl / (2 * n + 1) + .8; B.bx(stone, i * len, y - 3, 0, len, 3.4, W2); if (i % 2 === 0) { B.bx(stone2, i * len, y, W2 / 2 - 1, len * 1.6, 6, 2.4); B.bx(stone2, i * len, y, -W2 / 2 + 1, len * 1.6, 6, 2.4); } if (i % 3 === 0 && Math.abs(i) < n) B.cy(stone2, i * len, -18, 0, 5, y + 12); }
                B.bx(stone2, -hl - 10, 0, 0, 24, 8, W2 + 4); B.bx(stone2, hl + 10, 0, 0, 24, 8, W2 + 4);
                const m = mkMesh(B.build()); m.position.set(cx, 0, cz); m.rotation.y = th; scene3.add(m); grp.push(m);
                bridges.push({ x: cx, z: cz, dx, dz, hl, hw: W2 / 2 + 3, ford: 0 });
            } else {
                const n = 7; for (let i = -n; i <= n; i++) { const t = i / n, x = cx + dx * t * hl, z = cz + dz * t * hl + Math.sin(i * 2.3) * 5; M.cy('#8a8478', x, 0, z, 6 + (i & 1) * 2, 4 + Math.abs(Math.sin(i)) * 2); }
                for (const sd of [-1, 1]) { M.cy('#5a4630', cx + dx * hl * sd, 0, cz + dz * hl * sd - 4, 1.4, 22); M.bx('#d9a441', cx + dx * hl * sd + 3, 17, cz + dz * hl * sd - 4, 7, 4, .8); }
            }
        }
        const g = M.build(); if (g.attributes.position.count) { const m = mkMesh(g); scene3.add(m); }
    }
    /** Výška pod nohami: krajina, na moste jeho mostovka. */
    function groundY(x, y) {
        let h = Math.max(0, heightAt(x, y));
        for (const b of bridges) { const rx = x - b.x, rz = y - b.z, al = rx * b.dx + rz * b.dz, ac = -rx * b.dz + rz * b.dx; if (Math.abs(al) < b.hl && Math.abs(ac) < b.hw) { const t = al / b.hl; h = Math.max(h, 7 + 7 * (1 - t * t) + 1); } }
        return h;
    }

    // ---------- hrady ----------
    const PAL = {
        0: { wall: '#e6e2d6', wall2: '#cfcabb', roof: '#4a78aa', dark: '#6a6a70', flag: '#e8e4da', gate: '#2a2622' },
        1: { wall: '#8a6a44', wall2: '#6a4e30', roof: '#c4a850', dark: '#4a3a24', flag: '#7aa84a', gate: '#2a1c10' },
        2: { wall: '#2e2a28', wall2: '#1c1a1a', roof: '#6a1a10', dark: '#1a1414', flag: '#b02a1a', gate: '#ff5a20' },
        3: { wall: '#3c3c42', wall2: '#2a2a30', roof: '#22222a', dark: '#16161a', flag: '#8a8a94', gate: '#101014' },
        4: { wall: '#cfa868', wall2: '#b08848', roof: '#b4361e', dark: '#8a6a38', flag: '#c98a2a', gate: '#3a2410' },
        5: { wall: '#78787f', wall2: '#5e5e66', roof: '#3a5a8a', dark: '#3a3a40', flag: '#4a8fd0', gate: '#1a1a22' },
        6: { wall: '#b8a888', wall2: '#9a8a6a', roof: '#8a4a30', dark: '#5a4a3a', flag: '#d9a441', gate: '#2a1c10' },
        7: { wall: '#9a8a74', wall2: '#7a6a58', roof: '#7a2a5a', dark: '#4a3a34', flag: '#9a4a8a', gate: '#241818' },
        8: { wall: '#d8d4b8', wall2: '#bcb890', roof: '#b0a050', dark: '#7a8a5a', flag: '#e6d56a', gate: '#3a3a20' }
    };
    function flag(M, P, x, y0, z, h = 26) { M.cy('#3a2a1a', x, y0, z, .9, h); M.bx(P.flag, x + 5, y0 + h - 9, z, 10, 7, .6); }
    function slit(M, x, y, z, a, h = 5) { M.bx('#14100c', x, y, z, 1.4, h, 1.4, a); }
    /** Okná na štyroch stranách kvádra (cx, cz stred, w × d pôdorys, výška h od y0). */
    function windows(M, cx, y0, cz, w, d, h, cols, rows, col = '#2a2420') {
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
            const u = (c + .5) / cols - .5, y = y0 + h * (r + .55) / (rows + .1);
            M.bx(col, cx + u * w, y, cz + d / 2 + .2, 2.6, 4.2, .7); M.bx(col, cx + u * w, y, cz - d / 2 - .2, 2.6, 4.2, .7);
            M.bx(col, cx + w / 2 + .2, y, cz + u * d, .7, 4.2, 2.6); M.bx(col, cx - w / 2 - .2, y, cz + u * d, .7, 4.2, 2.6);
        }
    }
    function tower(M, P, x, y0, z, r, h, roof = true, rh = null) {
        M.cy(P.wall, x, y0, z, r, h); M.cy(P.wall2, x, y0 + h - 4, z, r + 1.6, 4); M.cy(P.wall2, x, y0, z, r + 1.2, 5);
        for (let i = 0; i < 4; i++) { const a = i * 1.5708 + .4; slit(M, x + Math.cos(a) * r, y0 + h * .55, z + Math.sin(a) * r, -a); }
        if (roof) M.cn(P.roof, x, y0 + h, z, r + 2.5, rh ?? r * 2.4);
        else for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; M.bx(P.wall2, x + Math.cos(a) * (r + .6), y0 + h, z + Math.sin(a) * (r + .6), 2.6, 3.4, 2.6, -a); }
    }
    function ringWall(M, P, R, h, n, y0 = 0, tw = 8, teeth = true, arc = null) {
        for (let i = 0; i < n; i++) {
            const a = (arc ? arc[0] + (arc[1] - arc[0]) * (i + .5) / n : (i + .5) / n * 6.283), len = 2 * R * Math.sin((arc ? (arc[1] - arc[0]) / n : 6.283 / n) / 2) + 1.5, x = Math.cos(a) * R, z = Math.sin(a) * R, ry = -a - Math.PI / 2;
            M.bx(P.wall, x, y0, z, len, h, 6, ry);
            if (teeth) for (let q = -2; q <= 2; q++) { const o = q * len / 5, tx = x + (-Math.sin(a)) * o, tz = z + Math.cos(a) * o; M.bx(P.wall2, tx, y0 + h, tz, len / 8, 3.2, 7, ry); }
        }
        for (let i = 0; i <= n; i++) { if (!arc && i === n) break; const a = arc ? arc[0] + (arc[1] - arc[0]) * i / n : i / n * 6.283; tower(M, P, Math.cos(a) * R, y0, Math.sin(a) * R, tw, h + 16); }
    }
    function generic(M, P, k, f) {
        const R = 62 * k;
        M.cy('#6a5a40', 0, 0, 0, R + 16, 2);
        ringWall(M, P, R, 30, 12, 0, 8 * k);
        M.bx(P.wall, 0, 0, R, 24, 40, 16); M.bx(P.gate, 0, 0, R + 8.2, 11, 22, .6); M.bx(P.wall2, -12, 40, R, 4, 4, 16); M.bx(P.wall2, 12, 40, R, 4, 4, 16);
        M.bx(P.wall, 0, 0, 0, 32 * k, 46, 32 * k); M.bx(P.wall2, 0, 46, 0, 36 * k, 4, 36 * k);
        windows(M, 0, 8, 0, 32 * k, 32 * k, 36, 3, 2); windows(M, 0, 2, R, 24, 16, 30, 2, 1);
        M.cy(P.gate, 0, 0, R + 8.1, 6, 20); M.bx(P.gate, 0, 0, R + 8.1, 12, 14, .8);
        for (const [x, z, ry] of [[-34, 22, .3], [30, 28, -.2], [-30, -26, .1], [32, -30, 0]]) { M.bx(P.wall2, x * k, 0, z * k, 13, 9, 10, ry); M.pr(P.roof, x * k, 9, z * k, 15, 7, 12, ry); }
        for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) tower(M, P, sx * 16 * k, 0, sz * 16 * k, 5, 62, true, 16);
        tower(M, P, 0, 46, 0, 9 * k, 40, true, 30); flag(M, P, 0, 116, 0, 24);
        if (f === 2 || f === 3) for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; M.cn(P.roof, Math.cos(a) * R, 46, Math.sin(a) * R, 2.2, 26); }
    }
    function mound(M, c, rad, h) { M.dome(c, 0, 0, 0, rad, h); }
    const SPEC = {
        'Minas Tirith'(M, P) {   // sedem kruhov hradieb na výbežku Mindolluinu, Biela veža, ostroha
            M.add('cone', '#6a6660', [0, 130, -150], [0, 0, 0], [420, 260, 330]); M.add('cone', '#58544e', [-90, 90, -170], [0, 0, 0], [220, 180, 200]);
            for (let i = 0; i < 7; i++) {
                const r = 175 - i * 19, y0 = i * 30, z0 = -i * 11;
                M.cy(i % 2 ? '#dcd8cb' : '#e8e4d8', 0, y0, z0, r, 34); M.cy('#c4c0b2', 0, y0 + 34, z0, r + 2.5, 3.5);
                const n = 22 - i * 2; for (let q = 0; q < n; q++) { const a = Math.PI * (.12 + .76 * q / (n - 1)); if (q % 2 === 0) M.bx('#cfcabb', Math.cos(a) * (r + 1), y0 + 37.5, z0 + Math.sin(a) * (r + 1), 5, 3, 5, -a); }
                if (i < 6) for (let q = 0; q < 4; q++) { const a = Math.PI * (.2 + .2 * q); M.bx('#e8e4d8', Math.cos(a) * r * .75, y0 + 34, z0 + Math.sin(a) * r * .75, 16, 12 + (q % 2) * 6, 12, -a); M.pr('#4a78aa', Math.cos(a) * r * .75, y0 + 46 + (q % 2) * 6, z0 + Math.sin(a) * r * .75, 18, 6, 14, -a); }
            }
            M.bx('#14100c', 0, 0, 176, 22, 30, 4); M.cy('#14100c', 0, 0, 175.5, 11, 30); M.bx('#e8e4d8', -22, 0, 172, 14, 50, 12); M.bx('#e8e4d8', 22, 0, 172, 14, 50, 12); M.cn('#4a78aa', -22, 50, 172, 9, 18); M.cn('#4a78aa', 22, 50, 172, 9, 18);   // Veľká brána s vežami
            for (let i = 0; i < 7; i++) for (const sd of [-1, 1]) { const r = 175 - i * 19, a = Math.PI * (sd < 0 ? .92 : .08), x = Math.cos(a) * (r - 2), z = -i * 11 + Math.sin(a) * (r - 2); M.cy('#ece8dc', x, i * 30, z, 7, 46); M.cn('#4a78aa', x, i * 30 + 46, z, 8.5, 16); }   // bašty na koncoch stupňov
            for (let i = 0; i < 7; i++) { const r = 175 - i * 19, z = -i * 11 + r * .98; M.bx('#14100c', 0, i * 30, z - 2, 10, 18, 1.6); }   // brány v každom stupni
            M.bx('#f0ecdf', 0, 0, 20, 10, 218, 14); M.bx('#f6f2e6', 0, 218, 20, 14, 5, 16);     // ostroha (múr, ktorý rozdeľuje mesto ako kýl lode)
            M.cy('#f4f0e4', 0, 214, -60, 11, 120); M.cy('#dcd8cb', 0, 330, -60, 13, 6); M.cn('#c8d6e8', 0, 336, -60, 12.5, 70); M.cy('#9a8a50', 0, 400, -60, .8, 22);   // Ecthelionova veža
            M.cy('#e8e4d8', 24, 214, -60, 5, 46); M.cn('#4a78aa', 24, 260, -60, 6.5, 14);
            M.bx('#f6f2e6', 0, 214, -34, 4, 14, 4); M.add('cone5', '#ffffff', [0, 236, -30], [0, 0, 0], [8, 14, 8]);   // Biely strom
            for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; M.cy('#f4f0e4', Math.cos(a) * 12, 214, -60 + Math.sin(a) * 12, 1.6, 130 + (i % 2) * 14); }   // štíhle okrajové veže citadely
            M.cy('#e8e4d8', 0, 214, -60, 15, 8); M.bx('#f6f2e6', 0, 330, -60, 3.5, 5, 3.5, .78); flag(M, { flag: '#f4f0e4' }, 0, 405, -60, 26);   // zástava Strážcov
        },
        Edoras(M, P) {   // pahorok so Zlatou sieňou Meduseld
            M.add('cone', '#5a7a34', [0, 36, 0], [0, 0, 0], [250, 72, 250]); M.cy('#6a8a3c', 0, 70, 0, 78, 4);
            for (let i = 0; i < 20; i++) { const a = i / 20 * 6.283; M.cy('#6a4e30', Math.cos(a) * 80, 72, Math.sin(a) * 80, 2.3, 22 + (i % 2) * 4); M.cn5('#6a4e30', Math.cos(a) * 80, 94 + (i % 2) * 4, Math.sin(a) * 80, 2.3, 7); }
            M.bx('#6a4a2a', 0, 74, 0, 70, 24, 30); M.pr('#c4a24a', 0, 98, 0, 76, 26, 38); M.pr('#d4b25a', 0, 108, 0, 78, 6, 30);   // Meduseld so zlatou slamenou strechou
            for (const sx of [-1, 1]) { M.bx('#c4a24a', sx * 39, 120, 0, 1.8, 14, 1.8, 0.4 * sx); }
            for (let q = -3; q <= 3; q++) M.cy('#8a6238', q * 9, 74, 15.5, 1.6, 24);
            M.bx('#3a2a18', 0, 74, 15.4, 8, 14, 1); for (const [x, z] of [[-50, 40], [46, 36], [-44, -38], [52, -30]]) { M.bx('#7a5a38', x, 74, z, 18, 12, 14, x * .05); M.pr('#a88c44', x, 86, z, 20, 8, 16, x * .05); }
            flag(M, { flag: '#3a8a3a' }, 0, 120, 0, 28);
            for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283 + .2; M.add('hemi', '#4a6a2a', [Math.cos(a) * 128, 4, Math.sin(a) * 128], [0, 0, 0], [30, 18, 30]); }   // mohyly kráľov
        },
        'Helmov žľab'(M, P) {   // Hornburg na skalnom výbežku, Hlboký múr cez žľab, rampa a strmé svahy
            const S = { wall: '#a8a296', wall2: '#8a8478', roof: '#4a5a6a' };
            M.add('cone', '#7a746a', [-85, 85, -55], [0, 0, 0], [270, 170, 230]); M.add('cone', '#6a645a', [-30, 55, -20], [0, 0, 0], [210, 110, 170]);
            M.add('cone', '#6e6860', [225, 62, 20], [0, 0, 0], [300, 125, 230]); M.add('cone', '#5e5850', [-240, 52, 50], [0, 0, 0], [260, 105, 200]);   // svahy žľabu
            M.bx(S.wall, 0, 0, 48, 250, 58, 14);
            for (let q = -12; q <= 12; q++) M.bx(S.wall2, q * 10, 58, 48, 6, 5, 15);
            for (let q = -11; q <= 11; q += 2) M.bx(S.wall2, q * 10, 0, 56, 6, 64, 4);
            for (let q = -12; q <= 12; q += 3) slit(M, q * 10, 30, 55.2, 0, 7);
            M.bx('#14100c', -32, 0, 55.4, 20, 30, 1); M.bx('#4a3a26', -32, 0, 55.9, 18, 28, .6);   // brána
            M.bx(S.wall2, 0, 58, 40, 250, 3, 4);                                                    // ochodza
            tower(M, S, -125, 0, 48, 15, 80, false); tower(M, S, 125, 0, 48, 15, 80, false); tower(M, S, 0, 0, 48, 13, 76, false);
            tower(M, S, -62, 0, 48, 11, 70, false); tower(M, S, 62, 0, 48, 11, 70, false);
            M.bx('#7a8a8a', 118, 0, 52, 24, 3, 20);   // vodný kanál (Deeping Stream)
            // Hornburg: nádvorie na skale, hradba, veža a rampa
            M.bx(S.wall, -85, 88, -40, 78, 6, 70);
            M.bx(S.wall, -85, 94, -40, 38, 46, 38); windows(M, -85, 98, -40, 38, 38, 36, 2, 2); M.cy(S.wall, -85, 140, -40, 14, 64); M.cy(S.wall2, -85, 200, -40, 16.5, 5); M.cn(S.roof, -85, 205, -40, 17, 42);
            for (const [x, z] of [[-110, -62], [-60, -62], [-110, -18], [-60, -18]]) tower(M, S, x, 94, z, 7, 46, true, 16);
            M.add('box', S.wall2, [-52, 56, 22], [-.62, 0, 0], [16, 3, 98]);   // rampa z nádvoria dolu k múru
            flag(M, { flag: '#7aa84a' }, -85, 247, -40, 22);
            for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; M.bx('#8a8478', -85 + Math.cos(a) * 33, 94, -40 + Math.sin(a) * 33, 7, 6 + (i % 2) * 3, 7, -a); }
        },
        'Barad-dûr'(M, P) {   // čierna pevnosť Sauronova na skalnom výbežku, Oko
            M.add('cone', '#26201e', [0, 70, 0], [0, 0, 0], [300, 140, 300]);
            M.cy('#14100e', 0, 120, 0, 62, 70); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; M.cn5('#0c0a0a', Math.cos(a) * 62, 190, Math.sin(a) * 62, 6, 50); M.cy('#1c1816', Math.cos(a) * 86, 100, Math.sin(a) * 86, 12, 56); M.cn5('#0c0a0a', Math.cos(a) * 86, 156, Math.sin(a) * 86, 14, 40); }
            M.cy('#1a1614', 0, 190, 0, 34, 120); M.cy('#100c0c', 0, 310, 0, 40, 16); M.cy('#1c1816', 0, 326, 0, 26, 70); M.cy('#100c0c', 0, 396, 0, 32, 10);
            for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; M.add('cone5', '#0a0808', [Math.cos(a) * 30, 436, Math.sin(a) * 30], [Math.sin(a) * .5, 0, -Math.cos(a) * .5], [10, 70, 10]); }
            M.add('sph', '#ff7a20', [0, 430, 0], [0, 0, 0], [26, 40, 26]); M.add('sph', '#ffe040', [0, 430, 0], [0, 0, 0], [8, 36, 8]);   // Oko
        },
        Isengard(M, P) {   // kruhový múr a Orthanc
            M.cy('#4a5a3a', 0, 0, 0, 150, 4);
            for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283, len = 2 * 150 * Math.sin(Math.PI / 24) + 1; M.bx('#4a4a50', Math.cos(a) * 150, 0, Math.sin(a) * 150, len, 46, 8, -a - Math.PI / 2); }
            M.bx('#1a1a1e', 0, 0, 150, 30, 36, 14); M.bx('#0c0c0e', 0, 0, 157.2, 14, 26, 1);
            M.cy('#1c1c22', 0, 0, 0, 22, 260); for (let i = 0; i < 4; i++) { const a = i / 4 * 6.283 + .4; M.cn5('#14141a', Math.cos(a) * 18, 90 + i * 8, Math.sin(a) * 18, 7, 170 - i * 12); }
            M.cy('#2a2a32', 0, 260, 0, 27, 6); for (let i = 0; i < 4; i++) { const a = i / 4 * 6.283 + .7; M.cn5('#14141a', Math.cos(a) * 22, 262, Math.sin(a) * 22, 4, 26); }
            for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; M.cy('#3a3a40', Math.cos(a) * 100, 0, Math.sin(a) * 100, 6, 22 + (i % 3) * 6); }
        },
        Erebor(M, P) {   // Osamelá hora s hrebeňmi, snehovou čiapkou a bránou Trpaslíkov
            M.add('cone', '#6a6a70', [0, 135, -50], [0, 0, 0], [300, 270, 260]); M.add('cone', '#fafcff', [0, 252, -50], [0, 0, 0], [84, 66, 76]);   // vrchol so snehom
            for (let i = 0; i < 5; i++) { const a = Math.PI * (.15 + .175 * i) + .1, x = Math.cos(a) * 130, z = -50 - Math.sin(a) * 90 + 90; M.add('cone', i % 2 ? '#5e5e66' : '#74747c', [x, 55 + (i % 3) * 14, z - 60], [0, 0, .08 * (i - 2)], [110, 120 + (i % 3) * 30, 100]); }   // hrebene
            M.add('cone', '#74747c', [-100, 50, 30], [0, 0, 0], [130, 100, 110]); M.add('cone', '#5e5e66', [105, 44, 36], [0, 0, 0], [120, 88, 100]);
            M.bx('#8a8a92', 0, 0, 96, 92, 8, 46); M.bx('#8a8a92', 0, 8, 100, 80, 6, 34); M.bx('#9a9aa2', 0, 14, 104, 68, 6, 24);   // schody pred bránou
            M.bx('#4a4a52', 0, 20, 100, 66, 62, 26); M.bx('#0c0c10', 0, 20, 113.4, 30, 44, 1);
            for (const sx of [-1, 1]) { for (let q = 0; q < 3; q++) M.bx('#a8a8b0', sx * (22 + q * 7), 20, 114, 4, 58, 4); M.bx('#a8a8b0', sx * 33, 78, 113, 8, 6, 6); }
            M.bx('#a8a8b0', 0, 64, 114, 34, 6, 5); M.add('cone5', '#d8b24a', [0, 74, 112], [0, 0, 0], [12, 14, 6]);   // zlatý erb nad bránou
            for (let q = -2; q <= 2; q++) M.cy('#a0a0a8', q * 14, 0, 124, 3, 14); M.bx('#8a8a92', 0, 14, 124, 76, 3, 8);
            for (let i = 0; i < 6; i++) { const a = Math.PI * (.12 + .15 * i); M.bx('#7a7a82', Math.cos(a) * 110, 0, Math.sin(a) * 110 + 30, 24, 10 + i * 3, 12, -a); }
        },
        Hobitov(M, P) {   // pahorok s okrúhlymi dverami
            M.dome('#5f8a3a', 0, 0, 0, 90, 56); M.dome('#6a9a42', 60, 0, 40, 42, 28); M.dome('#6a9a42', -64, 0, 30, 46, 30);
            for (const [x, z, a] of [[0, 54, 0], [58, 66, .5], [-62, 58, -.4]]) { M.add('cyl', '#3a6a2a', [x, 10, z + 8], [Math.PI / 2, 0, 0], [16, 1.4, 16]); M.add('cyl', ['#2a6a3a', '#7a2a1a', '#2a4a8a'][(a * 3 + 3 | 0) % 3], [x, 10, z + 8.9], [Math.PI / 2, 0, 0], [12, .6, 12]); }
            M.cy('#4a3420', 36, 56, 2, 2.2, 16); M.dome('#3a6a28', 36, 70, 2, 14, 9);
            M.bx('#c8b898', -90, 0, 76, 14, 8, 11); M.pr('#8a6a3a', -90, 8, 76, 17, 6, 13);
        },
        'Minas Morgul'(M, P) {   // bledá žiariaca veža v údolí
            M.add('cone', '#3a3a38', [0, 70, -40], [0, 0, 0], [280, 140, 240]);
            M.cy('#8a9a88', 0, 0, 0, 56, 36); M.cy('#7a8a78', 0, 36, 0, 46, 46); M.cy('#9aaa98', 0, 82, 0, 34, 60); M.cy('#7a8a78', 0, 142, 0, 24, 80);
            M.cn5('#4a5a4a', 0, 222, 0, 26, 80); for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283; M.cn5('#6a7a68', Math.cos(a) * 44, 82, Math.sin(a) * 44, 4, 56); M.add('sph', '#7aff9a', [Math.cos(a) * 44, 84, Math.sin(a) * 44], [0, 0, 0], [4, 4, 4]); }
            M.bx('#0e1410', 0, 0, 56, 26, 30, 6); M.add('sph', '#9affb0', [0, 224, 0], [0, 0, 0], [8, 8, 8]);
        },
        Osgiliath(M, P) {   // zbúrané mesto na oboch brehoch s prerušeným mostom
            const W2 = { wall: '#c4c0b0', wall2: '#a8a496', roof: '#6a6a70' };
            for (const sx of [-1, 1]) { ringWall(M, W2, 54, 22, 6, 0, 7, true, sx > 0 ? [-1.2, 1.2] : [Math.PI - 1.2, Math.PI + 1.2]); for (let i = 0; i < 5; i++) M.bx('#b8b4a4', sx * (40 + i * 11), 0, -30 + i * 14, 12, 14 + (i % 3) * 8, 10, i); }
            M.bx('#aaa698', -26, 4, 0, 18, 6, 22); M.bx('#aaa698', 26, 4, 0, 18, 6, 22); M.cy('#b4b0a0', 0, 0, 0, 5, 18);
            M.bx('#6a6a70', 44, 0, 62, 20, 36, 20); M.cn5('#4a5a6a', 44, 36, 62, 14, 18);
        },
        Rivendell(M, P) {   // Elrondov dom: terasy nad roklinou, zlaté strechy, altánky, oblúkový most a vodopád
            M.add('cone', '#6a7a54', [0, 26, -30], [0, 0, 0], [280, 52, 220]); M.cy('#d8d0b0', 0, 0, 0, 86, 14); M.cy('#e6dfc0', 0, 14, -8, 62, 8); M.cy('#ece6cc', 0, 22, -14, 40, 6);
            const H = [[-46, 14, 4, 14, 30], [44, 14, 0, 16, 38], [0, 28, -20, 20, 54], [-10, 14, 40, 11, 24], [64, 14, 36, 9, 20], [-66, 14, 34, 10, 22], [-26, 28, -44, 9, 26], [30, 28, -44, 10, 30]];
            for (const [x, y, z, r, h] of H) {
                M.cy('#ece6cc', x, y, z, r * .75, h); M.cy('#d8d0b0', x, y + h - 3, z, r * .9, 3);
                for (let q = 0; q < 6; q++) { const a = q / 6 * 6.283; M.cy('#f2ecd4', x + Math.cos(a) * r * .8, y, z + Math.sin(a) * r * .8, 1.1, h - 3); }
                M.cn('#c19a3e', x, y + h, z, r * 1.15, r * 1.5); M.add('sph', '#e8c860', [x, y + h + r * 1.5, z], [0, 0, 0], [3, 3, 3]);
            }
            for (let i = -6; i <= 6; i++) { const y = 3 + (36 - i * i) * .22; M.bx('#d8d0b0', i * 9, y, 98, 10, 2.2, 10); if (i % 2 === 0) { M.cy('#ece6cc', i * 9, 0, 98, 1.6, y); M.bx('#e6dfc0', i * 9, y + 2, 93.2, 2, 6, 1.2); M.bx('#e6dfc0', i * 9, y + 2, 102.8, 2, 6, 1.2); } }
            M.bx('#e6dfc0', -60, 0, 98, 14, 8, 14); M.bx('#e6dfc0', 60, 0, 98, 14, 8, 14);
            M.bx('#cfe6f0', 92, 0, -30, 7, 44, 3); M.dome('#b8d8e4', 92, 0, -26, 10, 3);   // vodopád
            for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283 + .2, r = 112 + (i % 3) * 8; M.cy('#4a3a20', Math.cos(a) * r, 0, Math.sin(a) * r * .85, 2.6, 28 + (i % 4) * 4); M.add('sph', ['#c8782a', '#d8a030', '#b85a22'][i % 3], [Math.cos(a) * r, 40 + (i % 4) * 4, Math.sin(a) * r * .85], [0, 0, 0], [26, 24, 26]); }
        },
        'Dol Amroth'(M, P) {   // biele mesto na výbežku nad morom, Lodný hrad s modrými strechami
            M.add('cone', '#8a8678', [0, 36, -30], [0, 0, 0], [300, 72, 220]); M.add('cone', '#7a766a', [60, 24, 20], [0, 0, 0], [180, 48, 140]);
            const W = PAL[0]; ringWall(M, W, 58, 26, 10, 66, 7);
            M.bx('#e6e2d6', 0, 66, 0, 44, 50, 36); windows(M, 0, 72, 0, 44, 36, 40, 3, 2); M.cy('#ece8dc', 0, 116, 0, 13, 70); M.cn('#4a78aa', 0, 186, 0, 15, 40);
            for (const [x, z] of [[-26, 14], [26, 14], [-26, -14], [26, -14]]) tower(M, W, x, 66, z, 6, 64, true, 16);
            M.add('box', '#e6e2d6', [0, 80, 62], [-.5, 0, 0], [18, 6, 56]); flag(M, { flag: '#4a78aa' }, 0, 226, 0, 22);
            for (let i = 0; i < 6; i++) M.bx('#dcd8cb', -70 + i * 28, 66, 70, 18, 14 + (i % 3) * 5, 14);
        },
        'Cirith Ungol'(M, P) {   // Veža Cirith Ungol v priesmyku
            const D = { wall: '#2a2422', wall2: '#1c1816', roof: '#0c0a0a' };
            M.add('cone', '#26201e', [-80, 70, -20], [0, 0, 0], [220, 140, 200]); M.add('cone', '#2e2724', [90, 60, -10], [0, 0, 0], [200, 120, 180]);
            M.bx('#2a2422', 0, 0, 40, 170, 40, 8); for (let q = -8; q <= 8; q++) M.bx('#1c1816', q * 10, 40, 40, 5, 5, 9);
            M.cy('#1a1614', 0, 0, 0, 24, 90); M.cy('#241e1c', 0, 90, 0, 20, 50); M.cy('#1a1614', 0, 140, 0, 14, 40);
            for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283; M.cn5('#0c0a0a', Math.cos(a) * 12, 180, Math.sin(a) * 12, 3, 30); }
            for (let i = 0; i < 6; i++) { const a = i * 1.05; M.bx('#ff5a20', Math.cos(a) * 24, 50 + (i % 3) * 30, Math.sin(a) * 24, 2.4, 4, 2.4, -a); }
            tower(M, D, -85, 0, 40, 10, 66); tower(M, D, 85, 0, 40, 10, 66);
        },
        Morannon(M, P) {   // Čierna brána medzi Zubami Mordoru
            M.add('cone', '#26201e', [-150, 90, -10], [0, 0, 0], [260, 180, 200]); M.add('cone', '#2a2422', [150, 90, -10], [0, 0, 0], [260, 180, 200]);
            M.bx('#14100e', 0, 0, 20, 110, 90, 24); M.bx('#0a0808', 0, 0, 32.4, 56, 66, 1.2); M.bx('#3a3430', 0, 0, 33, 4, 66, 1); M.bx('#8a2410', 0, 66, 33, 56, 3, 1.4);
            for (const sx of [-1, 1]) { M.cy('#1a1614', sx * 78, 0, 20, 24, 150); M.cy('#241e1c', sx * 78, 150, 20, 28, 8); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; M.cn5('#0c0a0a', sx * 78 + Math.cos(a) * 22, 158, 20 + Math.sin(a) * 22, 3.5, 36); } M.cn5('#0c0a0a', sx * 78, 158, 20, 10, 70); }
            for (let q = -4; q <= 4; q++) M.cn5('#0c0a0a', q * 13, 90, 20, 4, 24);
        },
        'Lothlórien'(M, P) {   // veľké mallorny s talanmi a pahorok Cerin Amroth
            M.dome('#6aa04a', 0, 0, 40, 70, 30); for (let i = 0; i < 40; i++) { const a = i * 2.4, r = 10 + (i % 7) * 8; M.add('sph', i % 3 ? '#f0e050' : '#ffffff', [Math.cos(a) * r, 25 - r * .2, 40 + Math.sin(a) * r], [0, 0, 0], [3, 3, 3]); }
            const T = [[0, -40, 17, 130], [-70, -10, 12, 100], [66, -16, 12, 104], [-40, 50, 11, 90], [50, 56, 11, 94], [-110, 40, 9, 80], [110, 30, 9, 84]];
            for (const [x, z, r, h] of T) {
                M.cy('#8a8268', x, 0, z, r, h); M.cy('#7a7258', x, 0, z, r * 1.5, 10);
                M.add('sph', '#e8c44a', [x, h + r * .6, z], [0, 0, 0], [r * 5, r * 3.2, r * 5]); M.add('sph', '#f2da6a', [x + r, h + r * 1.2, z - r], [0, 0, 0], [r * 3, r * 2, r * 3]);
                const py = h * .55; M.cy('#d8d4b8', x, py, z, r * 1.8, 3); M.cy('#e6e2c8', x, py + 3, z, r * .9, 12); M.cn('#c9b04a', x, py + 15, z, r * 1.1, 10);
                for (let q = 0; q < 8; q++) { const a = q / 8 * 6.283; M.cy('#cfc8a4', x + Math.cos(a) * r * 1.7, py + 3, z + Math.sin(a) * r * 1.7, .5, 5); }
            }
        },
        'Dol Guldur'(M, P) {   // temná pevnosť na skalnatom kopci v mŕtvom lese
            const D = { wall: '#26201e', wall2: '#14100e', roof: '#0c0a0a' };
            M.add('cone', '#2e2a28', [0, 60, 0], [0, 0, 0], [240, 120, 220]);
            M.cy('#1c1816', 0, 100, 0, 34, 80); M.cy('#241e1c', 0, 180, 0, 28, 30); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; M.bx('#14100e', Math.cos(a) * 26, 205 + (i % 2) * 14, Math.sin(a) * 26, 8, 26 + (i % 3) * 10, 8, -a); }
            for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283 + .5; tower(M, D, Math.cos(a) * 62, 70, Math.sin(a) * 62, 9, 48); }
            M.add('sph', '#7aff9a', [0, 232, 0], [0, 0, 0], [6, 6, 6]);
            for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283, r = 120 + (i % 3) * 20; M.cy('#2a2218', Math.cos(a) * r, 0, Math.sin(a) * r, 2, 40 + (i % 4) * 8); M.cn5('#2a2218', Math.cos(a) * r, 40, Math.sin(a) * r, 6, 22); }
        },
        Esgaroth(M, P) {   // dom na koloch nad jazerom
            for (let i = -6; i <= 6; i++) for (const z of [-34, 0, 34]) M.cy('#4a3420', i * 22, -18, z, 2.4, 28);
            M.bx('#7a5a38', 0, 8, 0, 170, 4, 90);
            const H = [[-62, -26], [-20, -30], [26, -28], [64, -22], [-60, 26], [-14, 30], [34, 28], [70, 24]];
            H.forEach(([x, z], i) => { M.bx(i % 2 ? '#a08060' : '#8a6a48', x, 12, z, 24, 16, 18); M.pr(i % 3 ? '#6a4a30' : '#7a5a3a', x, 28, z, 27, 12, 21); });
            M.bx('#8a6a48', 0, 12, 0, 40, 24, 30); M.pr('#4a78aa', 0, 36, 0, 44, 18, 34); M.cy('#6a4e30', 0, 54, 0, 3, 24); flag(M, { flag: '#4a8fd0' }, 0, 78, 0, 18);
            M.bx('#7a5a38', 110, 8, 0, 60, 3, 10);
        },
        Moria(M, P) {   // sivý útes s Durinovými dverami
            M.bx('#6a6a70', 0, 0, -10, 330, 150, 60); M.add('cone', '#5a5a62', [0, 190, -20], [0, 0, 0], [320, 120, 80]);
            M.bx('#8a8a92', -40, 0, 22, 12, 74, 6); M.bx('#8a8a92', 40, 0, 22, 12, 74, 6); M.add('cyl', '#8a8a92', [0, 74, 22], [Math.PI / 2, 0, 0], [92, 6, 92]); M.bx('#0c0c10', 0, 0, 20, 68, 80, 3);
            M.add('sph', '#e8f0ff', [0, 96, 25], [0, 0, 0], [16, 16, 4]);
            for (const sx of [-1, 1]) { M.cy('#3a2a1a', sx * 56, 0, 50, 2.4, 40); M.add('sph', '#2c5a28', [sx * 56, 52, 50], [0, 0, 0], [26, 22, 26]); }
        },
        Umbar(M, P) {   // prístav so sivými kupolami a minaretmi
            const H = PAL[4]; ringWall(M, H, 74, 28, 12, 0, 8); M.cy('#cfa868', 0, 0, 0, 70, 3);
            M.bx(H.wall, 0, 0, 0, 56, 40, 50); M.dome('#d8d4c4', 0, 40, 0, 26, 24); M.dome('#d8d4c4', -40, 28, 40, 14, 14); M.dome('#d8d4c4', 42, 28, 38, 14, 14);
            for (const [x, z] of [[-62, 0], [62, 0], [0, -60], [0, 62]]) { M.cy('#e0c890', x, 0, z, 4.4, 82); M.cn('#b4361e', x, 82, z, 6.4, 20); M.bx('#e0c890', x, 60, z, 11, 2.4, 11); }
            M.bx('#cfa868', 0, 0, 90, 170, 10, 12); for (let i = 0; i < 5; i++) { M.cy('#4a3420', -60 + i * 30, 0, 118, 1.4, 70); M.bx('#e8e0c8', -60 + i * 30 + 8, 30, 118, 14, 36, .8); }
        },
        Bree(M, P) {   // dedina na kopci s palisádou a dvojitými bránami
            M.add('cone', '#5a7a34', [0, 30, 0], [0, 0, 0], [250, 60, 230]);
            for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283; M.cy('#6a4e30', Math.cos(a) * 92, 58, Math.sin(a) * 82, 2.4, 22); M.cn5('#6a4e30', Math.cos(a) * 92, 80, Math.sin(a) * 82, 2.4, 6); }
            M.bx('#4a3420', 0, 58, 82, 24, 20, 3); M.bx('#4a3420', 0, 58, -82, 24, 20, 3);
            for (let i = 0; i < 11; i++) { const a = i * 2.2, r = 14 + (i % 4) * 16, x = Math.cos(a) * r, z = Math.sin(a) * r * .9; M.bx(['#b8a888', '#c8b898', '#a89878'][i % 3], x, 58, z, 20, 14, 15, a); M.pr(i % 2 ? '#7a4a30' : '#8a6a3a', x, 72, z, 22, 10, 18, a); }
            M.bx('#8a6a48', 0, 58, 0, 34, 20, 22); M.pr('#6a4a30', 0, 78, 0, 38, 14, 26); M.cy('#4a3420', 0, 92, -6, 1.2, 16);
        },
    };
    function castleGeo(t) {
        const f = t.f, P = PAL[f] || PAL[6], L = lvl(t), k = .85 + L * .07, M = Mesher();
        if (SPEC[t.n]) SPEC[t.n](M, P, k, f); else generic(M, P, k, f);
        return M.build();
    }
    function syncCastles() {
        castles.forEach((o, i) => {
            const t = o.t, sig = t.f + '|' + lvl(t); if (o.sig === sig) return; o.sig = sig;
            if (o.mesh) { scene3.remove(o.mesh); o.mesh.geometry.dispose(); }
            try { o.mesh = mkMesh(castleGeo(t)); } catch (e) { if (!syncCastles.err) { syncCastles.err = 1; console.error('Hrad 3D', t.n, e); } return; }
            o.mesh.position.set(t.x, Math.max(2, heightAt(t.x, t.y - 70)), t.y - 70); scene3.add(o.mesh);   // model stojí o kus za bodom mesta: družina a armády sú pred bránou
        });
    }

    // ---------- postavy ----------
    function lordUnit(e) {
        const mounted = e.kr || e.id % 3 === 0, base = { t: 1, fc: e.f, x: e.x, y: e.y, c: 0, hp: 1, vr: (e.id * 37 % 100) / 100, fv: e.id % 4, cmd: e.kr ? 1 : 0, bn: e.kr ? 1 : 0 };
        if (e.nz) return { ...base, boss: 'fell' };
        return { ...base, k: e.kind ? 'i' : mounted ? 'c' : 'i' };
    }
    function mkFig(u, isHero) {
        const o = B3.kit.rig(u); o.root.scale.setScalar(FS); scene3.add(o.root);
        const sh = new (T().Mesh)(shadowG || (shadowG = new (T().CircleGeometry)(1, 14).rotateX(-Math.PI / 2)), shadowM || (shadowM = new (T().MeshBasicMaterial)({ color: 0x000000, transparent: true, opacity: .32, depthWrite: false })));
        scene3.add(sh); o.sh = sh; o.hd = 0; o.mv = 0; o.isHero = isHero; o.fx = u.x; o.fy = u.y; o.ph = 0; o.mph = 0; return o;
    }
    function dropFig(o) { if (!o) return; if (o.fol) o.fol.forEach(dropFig); scene3.remove(o.root); if (o.sh) scene3.remove(o.sh); if (o.ring) scene3.remove(o.ring); }
    function ringFor(col) {
        const t = T(); if (!rings[col]) rings[col] = new t.MeshBasicMaterial({ color: col, transparent: true, opacity: .85, side: t.DoubleSide, depthTest: false, depthWrite: false });
        const m = new t.Mesh(rings.geo || (rings.geo = new t.RingGeometry(24, 30, 28).rotateX(-Math.PI / 2)), rings[col]); m.renderOrder = 5; return m;
    }
    function place(o, x, y, dt, lift = 0) {
        const mv = Math.hypot(x - o.fx, y - o.fy); if (mv > .02) { const hd = Math.atan2(y - o.fy, x - o.fx); let d = hd - o.hd; d = Math.atan2(Math.sin(d), Math.cos(d)); o.hd += d * Math.min(1, .18 * dt); }
        o.mv += (Math.min(60, mv / Math.max(.3, dt)) - o.mv) * .2; o.fx = x; o.fy = y;
        const h = groundY(x, y);
        o.root.position.set(x, h + lift, y); o.root.rotation.y = -o.hd; o.sh.position.set(x, h + .8, y); o.sh.scale.setScalar(o.mount ? 20 : 11);
        animate(o, mv, dt);
    }
    /** Chôdza a cval: nohy a kĺby kostry z bitky, rýchlosť z posunu na mape (jednotky sveta za tik / mierka postavy). */
    function animate(o, mv, dt) {
        const B = o.B, M = o.MB, s = o.mv / FS * .55;   // ekvivalent rýchlosti v bitke
        if (o.mount && M) {
            const gait = B3.kit.gaitOf(s), offs = [[0, .5, .75, .25], [0, .5, .5, 0], [.1, 0, .6, .5]][gait], A = [.32, .5, .78][gait] * Math.min(1, s / .6);
            o.mph += mv / FS / B3.kit.STRIDE[gait]; const P = o.mph * 6.283;
            ['FR', 'FL', 'BR', 'BL'].forEach((L, i) => { const p = P + offs[i] * 6.283, front = L[0] === 'F'; M[L].rotation.z = Math.sin(p) * A * (front ? 1 : .85); M[L + 'k'].rotation.z = front ? -Math.max(0, Math.cos(p)) * (1.1 * A + .05) : Math.max(0, Math.cos(p)) * (.9 * A + .05); });
            M.mb.position.y = o.mk.h + Math.abs(Math.sin(P * (gait === 2 ? 1 : 2))) * (gait === 2 ? 1.6 : .7) * Math.min(1, s);
            if (B) { B.lgR.rotation.set(-.42, 0, 1.15); B.lgL.rotation.set(.42, 0, 1.15); B.knR.rotation.z = B.knL.rotation.z = -1.45; B.hip.position.y = o.H.hipY; }
        } else if (B) {
            o.ph += mv / FS / 11; const p = o.ph, a = Math.min(1, s / .7) * .8;
            B.lgR.rotation.z = Math.sin(p) * a; B.lgL.rotation.z = -Math.sin(p) * a;
            B.knR.rotation.z = -Math.max(0, Math.cos(p)) * a * 1.3; B.knL.rotation.z = -Math.max(0, -Math.cos(p)) * a * 1.3;
            B.hip.position.y = o.H.hipY + Math.abs(Math.sin(p)) * .9 * Math.min(1, s);
            if (B.shL && B.shR) { B.shL.rotation.z = Math.sin(p) * a * .4 + .15; B.elL.rotation.z = .35; B.elR.rotation.z = .3; B.shR.rotation.z = -Math.sin(p) * a * .25 + .12; }
        }
    }
    /** Stopa za postavou (najnovší bod prvý): kolóna vojakov sa drží na nej. */
    function trail(o, x, y) { const t = o.tr || (o.tr = []), l = t[0]; if (!l || Math.hypot(x - l[0], y - l[1]) >= 8) { t.unshift([x, y]); if (t.length > 70) t.pop(); } }
    function behind(o, d, x, y) {
        let acc = 0, px = x, py = y;
        for (const p of o.tr || []) { const s = Math.hypot(p[0] - px, p[1] - py); if (acc + s >= d) { const k = (d - acc) / (s || 1); return [px + (p[0] - px) * k, py + (p[1] - py) * k]; } acc += s; px = p[0]; py = p[1]; }
        return null;
    }
    /** Kolóna: n pešiakov za veliteľom (o), každý v postavení vedľa trasy, rovnaké postavy ako v bitke. */
    function followers(o, owner, n, mk, dt, near) {
        const fl = o.fol || (o.fol = []);
        while (fl.length > n) dropFig(fl.pop());
        while (fl.length < n && near && bud > 0) { bud--; try { const f = mkFig(mk(fl.length), false); f.hd = o.hd; fl.push(f); } catch (e) { console.warn('3D vojak', e); n = fl.length; break; } }
        const hx = Math.cos(o.hd), hy = Math.sin(o.hd);
        fl.forEach((f, i) => {
            f.root.visible = f.sh.visible = near; if (!near) { f.fx = owner.x; f.fy = owner.y; return; }
            const side = (i % 2 ? 1 : -1) * (13 + (i >> 1) * 4), d = ((i >> 1) + 1) * 34 + 18;
            const p = behind(o, d, owner.x, owner.y) || [owner.x - hx * d, owner.y - hy * d];
            place(f, p[0] - hy * side, p[1] + hx * side, dt);
        });
    }
    const heroSig = () => { try { return JSON.stringify([G.eq, G.fac, G.name, G.look]); } catch (e) { return '' + G.fac; } };
    function syncFigs(sc, dt, vx, vz, vr) {
        // hrdina
        const hu = { h: 1, x: G.x, y: G.y, c: 0, hp: 1, f: 0 }, hsg = heroSig();
        if (!hero || hero.sig !== hsg) { if (hero) dropFig(hero); try { hero = mkFig(hu, true); hero.sig = hsg; } catch (e) { console.warn('3D hrdina', e); hero = null; } }
        if (hero) { hero.sig = hsg; place(hero, G.x, G.y, dt); trail(hero, G.x, G.y); followers(hero, G, Math.min(5, Math.ceil((typeof ar === 'function' ? ar() : 0) / 5)), i => ({ k: 'i', x: G.x, y: G.y, c: 0, hp: 1, vr: (i * 29 % 100) / 100, fv: i % 4 }), dt, true); }
        // velitelia a armády
        const seen = new Set(); bud = 2;
        for (const e of E) {
            seen.add(e.id); let o = fig.get(e.id);
            const near = Math.abs(e.x - vx) < vr && Math.abs(e.y - vz) < vr;
            if (!o) { if (!near || bud <= 0) continue; bud--; try { o = mkFig(lordUnit(e), false); o.ring = null; } catch (err) { console.warn('3D velitel', err); o = { bad: 1 }; } fig.set(e.id, o); }
            if (o.bad) continue;
            o.root.visible = o.sh.visible = near; if (o.ring) o.ring.visible = near; if (!near) { o.fx = e.x; o.fy = e.y; continue; }
            place(o, e.x, e.y, dt, e.nz ? 40 + Math.sin(clock * 2 + e.id) * 4 : 0); trail(o, e.x, e.y);
            followers(o, e, e.nz ? 0 : Math.min(5, Math.ceil(e.n / 5)), i => ({ t: 1, fc: e.f, k: 'i', x: e.x, y: e.y, c: 0, hp: 1, vr: ((e.id * 7 + i * 13) % 100) / 100, fv: (e.id + i) % 4 }), dt, near);
            const col = hos(e.f, G.fac) ? 0xe05040 : (AL[G.fac] && AL[G.fac][e.f]) || e.f === G.fac ? 0x70d060 : 0xe0d8b8;
            if (!o.ring || o.rc !== col) { if (o.ring) scene3.remove(o.ring); o.ring = ringFor(col); o.rc = col; scene3.add(o.ring); }
            o.ring.position.set(e.x, groundY(e.x, e.y) + 1.5, e.y); o.ring.scale.setScalar(o.mount ? 1.15 : .8);
        }
        for (const [id, o] of fig) if (!seen.has(id)) { dropFig(o); fig.delete(id); }
    }

    // ---------- obliehanie ----------
    let sieges = new Map(), flameM = null;
    function removeSiege(o) { scene3.remove(o.mesh); o.mesh.geometry.dispose(); o.fx.forEach(m => scene3.remove(m)); o.smoke.forEach(m => scene3.remove(m)); }
    /** Tábor obliehateľov: stany s erbom, ohne, a podľa stavu obliehania rebríky, baranidlo a obliehacia veža; nad hradom dym. */
    function buildSiege(t, s) {
        const M = Mesher(), tc = new (T().Color)(FC[s.f] || '#aa4433'), hex = '#' + tc.getHexString(), fx = [], smoke = [], t3 = T(), ox = t.x, oz = t.y - 70;
        const gy = (x, z) => groundY(x, z);
        for (let a = 0; a < 7; a++) {
            const an = Math.PI * (.12 + .76 * a / 6), x = ox + Math.cos(an) * 200, z = oz + Math.sin(an) * 200 + 40, y = gy(x, z);
            M.cn(['#d8c8a0', '#c8b890', '#d0c098'][a % 3], x, y, z, 17, 19, a); M.cy('#3a2a1a', x, y + 17, z, .8, 16); M.bx(hex, x + 4, y + 24, z, 8, 5, .6);
            if (a % 2 === 0) { const fxp = x + 22, fz = z + 10, fy = gy(fxp, fz); M.cy('#3a3028', fxp, fy, fz, 5, 2); const f = new t3.Mesh(new t3.ConeGeometry(4, 10, 6).translate(0, 5, 0), flameM || (flameM = new t3.MeshBasicMaterial({ color: 0xff8a28 }))); f.position.set(fxp, fy + 2, fz); scene3.add(f); fx.push(f); }
        }
        const fy = gy(ox, oz + 70);
        if (s.lad) for (const o of [-26, -14]) M.add('box', '#8a6a3a', [ox + o, fy + 30, oz + 82], [-.22, 0, 0], [3.4, 62, 1.6]);
        if (s.ram) { const x = ox + 28, z = oz + 110, y = gy(x, z); M.bx('#6b4a2e', x, y + 6, z, 16, 10, 40); M.pr('#3a2a1a', x, y + 16, z, 20, 9, 44, Math.PI / 2); M.cy('#8a8a90', x, y + 10, z + 26, 3.5, 12); M.cy('#2a2018', x - 9, y, z - 14, 5, 3); M.cy('#2a2018', x + 9, y, z + 14, 5, 3); }
        if (s.tow) { const x = ox + 90, z = oz + 100, y = gy(x, z); M.bx('#6b4a2e', x, y + 6, z, 26, 78, 26); for (let q = 0; q < 3; q++) M.bx('#3a2a1a', x, y + 14 + q * 24, z - 13.4, 22, 2.4, 1); M.bx('#8a6a3a', x, y + 80, z, 30, 4, 30); for (const sx of [-9, 9]) for (const sz of [-9, 9]) M.cy('#2a2018', x + sx, y, z + sz, 5, 4); M.bx(hex, x, y + 84, z, 12, 8, .8); }
        const mesh = mkMesh(M.build()); scene3.add(mesh);
        for (let i = 0; i < 6; i++) { const m = new t3.Mesh(new t3.SphereGeometry(1, 8, 6), new t3.MeshBasicMaterial({ color: 0x4a4440, transparent: true, opacity: .5, depthWrite: false })); m.userData = { i, x: ox + (i % 3 - 1) * 14, z: oz + (i % 2) * 10, y0: Math.max(2, groundY(ox, oz)) + 125 }; scene3.add(m); smoke.push(m); }
        return { mesh, fx, smoke };
    }
    function syncSieges(dt) {
        TW.forEach((t, i) => {
            const s = t.sg; let o = sieges.get(i);
            if (!s) { if (o) { removeSiege(o); sieges.delete(i); } return; }
            const sig = ['lad', 'ram', 'tow'].map(k => s[k] ? 1 : 0).join('') + '|' + s.f;
            if (!o || o.sig !== sig) { if (o) removeSiege(o); o = buildSiege(t, s); o.sig = sig; sieges.set(i, o); }
            o.fx.forEach((f, q) => { const k = 1 + Math.sin(clock * 9 + q * 2.1) * .22 + Math.sin(clock * 15 + q) * .1; f.scale.set(1 / k * .9 + .1, k, 1 / k * .9 + .1); });
            o.smoke.forEach(m => { const u = m.userData, ph = ((clock * .12 + u.i / 6) % 1); m.position.set(u.x + Math.sin(clock + u.i) * 6 + ph * 26, u.y0 + ph * 150, u.z + ph * 8); m.scale.setScalar(7 + ph * 26); m.material.opacity = .55 * (1 - ph) * Math.min(1, ph * 6); });
        });
    }

    // ---------- počasie ----------
    const NW = 1500, WT = { clear: {}, rain: { rain: 1, dark: .3, fog: .2 }, storm: { rain: 1.6, dark: .6, fog: .3 }, fog: { fog: 1 }, snow: { snow: 1, fog: .2, dark: .1 }, ash: { ash: 1, dark: .3, fog: .3 } };
    let wxS = { rain: 0, snow: 0, ash: 0, fog: 0, dark: 0 }, wP = null, flash = 0;
    let DOT = null;
    function dotTex() {
        if (DOT) return DOT; const c = document.createElement('canvas'); c.width = 32; c.height = 32; const x = c.getContext('2d'), g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
        g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.55, 'rgba(255,255,255,.85)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32);
        return (DOT = new (T().CanvasTexture)(c));
    }
    function buildWeather() {
        const t = T(), rnd = new Float32Array(NW * 3); for (let i = 0; i < rnd.length; i++) rnd[i] = Math.random();
        const mkPts = (col, size) => { const g = new t.BufferGeometry().setAttribute('position', new t.BufferAttribute(new Float32Array(NW * 3), 3)), m = new t.Points(g, new t.PointsMaterial({ color: col, size, transparent: true, opacity: .9, depthWrite: false, map: dotTex() })); m.frustumCulled = false; m.visible = false; scene3.add(m); return m; };
        const rain = new t.LineSegments(new t.BufferGeometry().setAttribute('position', new t.BufferAttribute(new Float32Array(NW * 6), 3)), new t.LineBasicMaterial({ color: 0xbcd0e0, transparent: true, opacity: .5, depthWrite: false }));
        rain.frustumCulled = false; rain.visible = false; scene3.add(rain);
        wP = { rnd, rain, snow: mkPts(0xffffff, 11), ash: mkPts(0x7a6458, 9) };
    }
    function stepWx(dt) {
        const tg = WT[typeof MW !== 'undefined' && MW ? MW.n : 'clear'] || {};
        for (const k in wxS) wxS[k] += ((tg[k] || 0) - wxS[k]) * Math.min(1, .03 * dt);
        if (tg.rain > 1.2 && Math.random() < .005 * dt) flash = 1; flash *= Math.pow(.9, dt);
    }
    const fr = v => v - Math.floor(v);
    function weatherFx(cx, cz, ty, d) {
        const w = wP; if (!w) return; const S = d * 2.2 + 700, SY = d * .9 + 340, R = w.rnd, c = clock;
        const dens = k => Math.min(NW, Math.floor(NW * (.3 + .7 * Math.min(1, k))));
        w.rain.visible = wxS.rain > .03;
        if (w.rain.visible) {
            const a = w.rain.geometry.attributes.position, n = dens(wxS.rain / 1.4), sl = .22, L = SY * .05; w.rain.material.opacity = Math.min(.5, wxS.rain * .35);
            for (let i = 0; i < n; i++) { const y = ty + SY * (1 - fr(R[i * 3 + 1] - c * 2.1)), x = cx + (R[i * 3] - .5) * S + sl * (y - ty), z = cz + (R[i * 3 + 2] - .5) * S; a.setXYZ(i * 2, x, y, z); a.setXYZ(i * 2 + 1, x - sl * L, y - L, z); }
            a.needsUpdate = true; w.rain.geometry.setDrawRange(0, n * 2);
        }
        for (const [P, k, sp, sw] of [[w.snow, wxS.snow, .1, 26], [w.ash, wxS.ash, .05, 40]]) {
            P.visible = k > .03; if (!P.visible) continue;
            const a = P.geometry.attributes.position, n = dens(k); P.material.opacity = Math.min(.9, k);
            for (let i = 0; i < n; i++) { const y = ty + SY * (1 - fr(R[i * 3 + 1] - c * sp)); a.setXYZ(i, cx + (R[i * 3] - .5) * S + Math.sin(c * 1.2 + R[i * 3 + 2] * 30) * sw, y, cz + (R[i * 3 + 2] - .5) * S + Math.cos(c * .9 + R[i * 3] * 30) * sw); }
            a.needsUpdate = true; P.geometry.setDrawRange(0, n);
        }
    }

    // ---------- scéna, kamera, klik ----------
    function setup(sc) {
        const t = T(), k = B3.kit.ensure(); R = k.R; canvas = k.canvas;
        R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); R.shadowMap.enabled = false; R.toneMapping = t.NoToneMapping; R.setClearColor(0x9fb4c8, 1);
        scene3 = new t.Scene(); fogc = new t.Color('#aebfcf'); scene3.fog = new t.Fog(fogc, 1800, 9000); scene3.background = fogc;
        cam3 = new t.PerspectiveCamera(40, W / H, 20, 20000);
        hemi = new t.HemisphereLight(0xdfe8ff, 0x6a5a40, 1.05); sun = new t.DirectionalLight(0xfff0d0, 2.2); sun.position.set(-700, 1000, 500); scene3.add(hemi, sun);
        buildField(sc); buildTrees(sc); buildVillages(); buildCrossings();
        castles = TW.map(t => ({ t, mesh: null, sig: '' })); syncCastles();
        route = new t.Line(new t.BufferGeometry().setAttribute('position', new t.BufferAttribute(new Float32Array(3 * 80), 3)), new t.LineBasicMaterial({ color: 0xffd24a, depthTest: false, transparent: true, opacity: .9 })); route.renderOrder = 6; route.frustumCulled = false; scene3.add(route);
        mark = new t.Mesh(new t.TorusGeometry(14, 2.4, 6, 20).rotateX(Math.PI / 2), new t.MeshBasicMaterial({ color: 0xffd24a, depthTest: false })); mark.renderOrder = 6; scene3.add(mark);
        buildWeather(); yaw = 0; canvas.style.display = 'block';
        const gc = game.canvas; if (gc) { gc.addEventListener('contextmenu', ctx); gc.addEventListener('mousedown', md); }
        window.addEventListener('mousemove', mm); window.addEventListener('mouseup', mu); window.addEventListener('keydown', kd);
    }
    const ctx = e => { if (on) e.preventDefault(); };
    const md = e => { if (on && e.button === 2) drag = e.clientX; };
    const mm = e => { if (on && drag != null && (e.buttons & 2)) { yaw -= (e.clientX - drag) * .006; drag = e.clientX; } else drag = null; };
    const mu = () => { drag = null; };
    const kd = e => { if (!on || /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '')) return; if (e.key === 'q' || e.key === 'Q') yaw += .12; else if (e.key === 'e' || e.key === 'E') yaw -= .12; };
    function fit() {
        const pc = game.canvas; if (!pc) return; const r = pc.getBoundingClientRect(), hr = canvas.parentNode.getBoundingClientRect(), w = Math.round(r.width) || 720, h = Math.round(r.height) || 480;
        canvas.style.left = (r.left - hr.left) + 'px'; canvas.style.top = (r.top - hr.top) + 'px'; canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
        if (fw !== w || fh !== h) { fw = w; fh = h; R.setSize(w, h, false); cam3.aspect = w / h; cam3.updateProjectionMatrix(); }
    }
    /** Súradnice sveta pod bodom obrazovky (sx, sy v logických pixeloch 720 × 480): lúč kamery krokuje po krajine. */
    function pick(sx, sy) {
        if (!on) return null; const t = T(), v = new t.Vector3(sx / W * 2 - 1, -(sy / H * 2 - 1), .5).unproject(cam3), o = cam3.position, d = v.sub(o).normalize();
        let tt = 0, prev = 0; for (let n = 0; n < 400; n++) { tt += 30; const x = o.x + d.x * tt, y = o.y + d.y * tt, z = o.z + d.z * tt; if (y <= Math.max(0, heightAt(x, z))) { let a = prev, b = tt; for (let q = 0; q < 12; q++) { const m = (a + b) / 2; if (o.y + d.y * m <= Math.max(0, heightAt(o.x + d.x * m, o.z + d.z * m))) b = m; else a = m; } return { x: o.x + d.x * b, y: o.z + d.z * b }; } prev = tt; }
        return null;
    }
    const pv = new Array(3);
    /** Premietnutie bodu sveta na obrazovku (logické pixely) alebo null, ak je mimo záberu. */
    function proj(x, y, up = 0) {
        if (!on) return null; const v = (proj.v || (proj.v = new (T().Vector3)())).set(x, Math.max(0, heightAt(x, y)) + up, y).project(cam3);
        if (v.z > 1 || Math.abs(v.x) > 1.15 || Math.abs(v.y) > 1.2) return null; return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H];
    }
    function updRoute() {
        const a = route.geometry.attributes.position; let n = 0; const put = (x, y) => { if (n < 80) { a.setXYZ(n++, x, Math.max(0, heightAt(x, y)) + 6, y); } };
        const far = Math.hypot(G.tx - G.x, G.ty - G.y) > 24;
        mark.visible = route.visible = far;
        if (far) { put(G.x, G.y); const nv = G._nv; if (nv && nv.p) for (let i = nv.i; i < nv.p.length; i++) put(nv.p[i][0], nv.p[i][1]); put(G.tx, G.ty); mark.position.set(G.tx, Math.max(0, heightAt(G.tx, G.ty)) + 4, G.ty); mark.rotation.y = clock * 1.5; }
        route.geometry.setDrawRange(0, n); a.needsUpdate = true;
    }
    function light() {
        const nt = typeof nightness === 'function' ? nightness() : 0, d = 1 - nt;
        hemi.intensity = .5 + .65 * d; sun.intensity = .3 + 1.9 * d; sun.color.setRGB(1, .86 + .1 * d, .62 + .3 * d); hemi.color.setRGB(.55 + .4 * d, .6 + .35 * d, .85 + .1 * d);
        fogc.setRGB(.05 + .6 * d, .08 + .68 * d, .14 + .66 * d); scene3.fog.color.copy(fogc); scene3.background.copy(fogc); R.setClearColor(fogc, 1);
        water.material.color.setRGB(.1 + .08 * d, .22 + .2 * d, .3 + .24 * d);
        const gr = Math.min(1, wxS.fog * .8 + wxS.rain * .3 + wxS.snow * .3 + wxS.ash * .4), g0 = d * .55 + .05;
        fogc.r += (g0 * (1 + wxS.ash * .12) - fogc.r) * gr; fogc.g += (g0 - fogc.g) * gr; fogc.b += (g0 * (1 - wxS.ash * .12) - fogc.b) * gr;
        scene3.fog.color.copy(fogc); scene3.background.copy(fogc); R.setClearColor(fogc, 1);
        hemi.intensity = hemi.intensity * (1 - wxS.dark * .45) + flash * 2.4; sun.intensity *= 1 - wxS.dark * .6;
    }
    function start(sc) {
        try { setup(sc); on = true; return true; }
        catch (e) { console.error('3D mapa sa nedá spustiť', e); failed = true; teardown(); return false; }
    }
    function teardown() {
        on = false; drag = null;
        const gc = game.canvas; if (gc) { gc.removeEventListener('contextmenu', ctx); gc.removeEventListener('mousedown', md); }
        window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu); window.removeEventListener('keydown', kd);
        if (canvas) canvas.style.display = 'none';
        if (scene3) scene3.traverse(o => { if (o.geometry) o.geometry.dispose(); });
        sieges = new Map(); flameM = null; wP = null; DOT = null; wxS = { rain: 0, snow: 0, ash: 0, fog: 0, dark: 0 }; scene3 = null; terrain = water = null; hg = null; castles = []; fig = new Map(); hero = null; vills = null; treeM = []; rings = {}; MT = null; shadowG = shadowM = null; route = mark = null;
    }
    function stop(sc) {
        if (!on && !scene3) return; teardown();
        if (sc && sc.cameras && sc.cameras.main) { try { sc.cameras.main.setBackgroundColor('#1e2a16'); for (const ch of sc.children.list) ch.setVisible(true); } catch (e) { } }
    }
    /** Jedna snímka 3D mapy (volá MapScene.update po výpočte sveta a 2D štítkov). Vráti true, ak 3D beží. */
    function frame(sc, delta) {
        if (!want()) { if (on) stop(sc); return false; }
        if (!on && !start(sc)) return false;
        const dt = Math.min(3, delta / 16.67); clock += delta / 1000; B3.kit.setClock(clock);
        const c = sc.cameras.main; c.setBackgroundColor('rgba(0,0,0,0)'); c.setZoom(RES); c.centerOn(W / 2, H / 2);
        for (const ch of sc.children.list) if (ch.visible) ch.setVisible(false);   // 2D vrstvy sa neukazujú, ostanú len premietnuté štítky
        stepWx(dt); fit(); light();
        const cx = cam.x + W / Z / 2, cy = cam.y + H / Z / 2, d = 900 / Z, ty = Math.max(0, heightAt(cx, cy));
        const cp = Math.cos(pitch);
        cam3.position.set(cx + Math.sin(yaw) * cp * d, ty + Math.sin(pitch) * d, cy + Math.cos(yaw) * cp * d);
        cam3.position.y = Math.max(cam3.position.y, heightAt(cam3.position.x, cam3.position.z) + 50);
        cam3.lookAt(cx, ty + 10, cy); const fg = Math.min(1, wxS.fog * .9 + wxS.rain * .25 + wxS.ash * .25 + wxS.snow * .25); scene3.fog.near = d * 1.5 * (1 - .75 * fg); scene3.fog.far = d * 7 * (1 - .7 * fg);
        syncCastles(); syncSieges(dt); weatherFx(cx, cy, ty, d); syncFigs(sc, dt, cx, cy, d * 1.6 + 500); updRoute();
        R.setRenderTarget(null); R.render(scene3, cam3);
        labels(sc);
        return true;
    }
    function labels(sc) {
        const show = (txt, p, dy, vis = true) => { if (!txt) return; if (p && vis) { txt.setScale(1).setPosition(p[0], p[1] + dy).setVisible(true); } };
        if (sc.towns) for (const o of sc.towns) { const p = proj(o.t.x, o.t.y + 70); show(o.txt, p, 8); if (p) o.stars.setScale(1).setPosition(p[0], p[1] - 4).setVisible(true); }
        if (sc.vill && Z > .55) for (const o of sc.vill) show(o.txt, proj(o.v.x, o.v.y + 30), 2);
        if (sc.armies) for (const e of E) { const o = sc.armies.get(e.id); if (o) show(o.txt, proj(e.x, e.y, 0), 22 * (1 / 1)); }
        if (sc.heroTxt && hero) { const p = proj(G.x, G.y); show(sc.heroTxt, p, 20); }
    }
    return { frame, stop, pick, proj, heightAt, want, get scene() { return scene3; }, get castles() { return castles; }, get camera() { return cam3; }, set yawTo(v) { yaw = v; }, set pitchTo(v) { pitch = v; }, get on() { return on; }, get yaw() { return yaw; } };
})();
