/*
 * ENGINE: 3D bitka (Three.js, vendor/three.min.js) v štýle Mount & Blade. Herná logika ostáva v js/sim (battle.js, combat.js, bosses.js);
 * tu sa bitka len zobrazuje. Grafické pomôcky (materiály, obloha, tráva, voda, dodatočné spracovanie) sú v js/engine/b3dgfx.js.
 *   – Bojisko: terén s výškou podľa mapy (kopec, rieka s brodom), textúra terénu s detailom, skalami na svahoch, rozdupaným blatom a spáleninou,
 *     tráva a kvety vo vetre (ohýbajú sa pod vojakmi), duby, brezy, smreky, mŕtve stromy a kríky hojdajúce sa vo vetre, balvany s machom,
 *     cesta s plotmi, voda s vlnami, odrazom a penou, obloha s mrakmi a slnkom podľa dennej doby, hviezdy a mesiac, dážď, sneh, popol, kaluže.
 *   – Hradby s cimburím, vežami, bránou, rebríkmi, obliehacou vežou a baranidlom, zástavy s erbom na vežiach, žeravé koše v noci.
 *   – Postavy: jedna kostrová sieť na vojaka (rýchle kreslenie), telo podľa rasy (človek, elf, trpaslík, ork, uruk, troll), tvár, uši, brada,
 *     vlasy, prilby podľa frakcie, kov s leskom, plášť a zástavy vlniace sa vo vetre, erby na štítoch; lakte, kolená, dýchanie, zásahy, pád
 *     podľa smeru úderu; kone a vargovia s kĺbmi a chôdzou krok / klus / cval.
 *   – Efekty: stopa čepele, iskry so zábleskom pri kryte, krv, prach za jazdou, para z koní, špliechanie vody, horiaca zem, iskry a popol.
 *   – Kamera: nálet nad bojiskom na začiatku (preskočí klávesa či klik), spomalenie pri páde bossa alebo veliteľa, fotorežim (P).
 * Ovládanie kamery: koliesko približuje, Z a C alebo stredné tlačidlo myši otáčajú, WASD je vzhľadom na kameru, myš mieri na zem.
 * Plátno Three.js leží pod plátnom Phaseru (ten je priehľadný), takže lišty, rozkazy a okná ostávajú z UIScene.
 * Súradnice: x simulácie = X, y simulácie = Z, výška = Y (1 jednotka ≈ 7 cm, človek ≈ 26 jednotiek).
 */
const B3 = (() => {
    let R = null, canvas = null, scene = null, cam = null, sun = null, hemi = null, on = false, comp = null, skyM = null;
    let units = new Map(), yaw = 0, pitch = .36, zoom = 110, tgt = null, terrain = null, overlay = null, ovPos = null, ovCol = null;
    let arrowPool = [], stuck = [], pts = null, ptsPos = null, ptsCol = null, decals = [], torches = [], wx = null, siege = {}, clock = 0, drag = null;
    let hTex = null, trTex = null, trData = null, trDirty = 0, grassM = null, waterM = null, blobs = null, flashL = [], fires = [], trails = [], grade = null, frameN = 0;
    let intro = null, slow = null, photo = null, sunDir = null, braziers = [], lp = -.12, fpv = false;
    const FPP = { aR: 1.25, eR: .9, aRy: .15, aL: 1.0, eL: 1.0 };
    const FPC = { f: 1.4, up: .5, side: 0, fov: 66 };   // kamera v prvej osobe: posun vpred od hlavy (záporný = dozadu), hore, do strany a zorné pole   // póza rúk v prvej osobe (zbraň a štít v zábere)
    const lookOn = () => on && (typeof OPT === 'undefined' || OPT.aimMode !== 'ground');
    const MAT = {};
    const T = () => window.THREE;
    const C = c => new (T().Color)(c);
    const isOn = () => on;
    const QN = () => B3G.QN();

    /** Dá sa 3D použiť? (Three.js + WebGL, voľba v Nastaveniach) */
    function want() {
        if (typeof OPT !== 'undefined' && OPT.b3d === false) return false;
        if (!window.THREE || typeof B3G === 'undefined') return false;
        if (want.ok == null) { try { const c = document.createElement('canvas'); want.ok = !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { want.ok = false; } }
        return want.ok;
    }

    // ---------- geometria: zlučovanie dielov s farbami vrcholov, kosťami, kovom a látkou ----------
    let PR = null;
    function prims() {
        if (PR) return PR;
        const t = T();
        PR = {
            box: new t.BoxGeometry(1, 1, 1), cyl: new t.CylinderGeometry(.5, .5, 1, 8), cyl6: new t.CylinderGeometry(.5, .5, 1, 6), cyl12: new t.CylinderGeometry(.5, .5, 1, 12),
            cone: new t.ConeGeometry(.5, 1, 8), cone6: new t.ConeGeometry(.5, 1, 6), sph: new t.IcosahedronGeometry(.5, 1), sph0: new t.IcosahedronGeometry(.5, 0), sph2: new t.IcosahedronGeometry(.5, 2),
            disc: new t.CylinderGeometry(.5, .5, 1, 18), taper: new t.CylinderGeometry(.36, .5, 1, 12), taperU: new t.CylinderGeometry(.5, .36, 1, 12),
            hemi: new t.SphereGeometry(.5, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), torus: new t.TorusGeometry(.5, .14, 6, 16).rotateX(Math.PI / 2),
            capeBox: new t.BoxGeometry(1, 1, 1, 1, 8, 1).translate(0, -.5, 0),
            rbox: (() => { const g = new t.BoxGeometry(1, 1, 1, 3, 3, 3), p = g.attributes.position, v = new t.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const c = v.clone(), l = v.length() || 1; v.multiplyScalar(.5 / l * 1.12); c.lerp(v, .42); p.setXYZ(i, c.x, c.y, c.z); } g.computeVertexNormals(); return g; })(),   // zaoblený kváder (telo, čižmy, tvár)
            tri: (() => { const g = new t.BufferGeometry(); g.setAttribute('position', new t.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0], 3)); g.computeVertexNormals(); return g; })()
        };
        return PR;
    }
    /** Diel z primitív: add(tvar, farba, [x,y,z], [rx,ry,rz], [sx,sy,sz], {b: kosť, m: kov, cl: [vrch, dĺžka, sila] látka}). build(kosti) zlúči do jednej geometrie. */
    function Part() {
        const t = T(), items = [];
        return {
            add(shape, color, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1], o) {
                const m = new t.Matrix4().compose(new t.Vector3(...p), new t.Quaternion().setFromEuler(new t.Euler(...r)), new t.Vector3(...s));
                items.push([typeof shape === 'string' ? prims()[shape] : shape, C(color), m, o || {}, typeof shape === 'string' ? shape : null]); return this;
            },
            get n() { return items.length; },
            build(BN, mdef = 4, lod = false) {
                const metalLast = items.filter(i => !i[3].m && !i[3].tex).concat(items.filter(i => i[3].m && !i[3].tex)).concat(items.filter(i => i[3].tex));
                // zjednodušená verzia pre vzdialený zástup: hrubšie telo a hlava (o.lod) a lacnejšie primitíva (guľa, valec, zaoblený kváder)
                const LOWP = { sph2: 'sph', sph: 'sph0', cyl12: 'cyl6', cyl: 'cyl6', disc: 'cyl6', rbox: 'box' };
                let n = 0; const gs = metalLast.map(([g0, c, m, o, nm]) => { const g = lod && o.lod ? o.lod : lod && nm && LOWP[nm] ? prims()[LOWP[nm]] : g0, ng = (g.index ? g.toNonIndexed() : g.clone()); ng.applyMatrix4(m); n += ng.attributes.position.count; return [ng, c, o]; });
                const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), cl = new Float32Array(n), mt = new Float32Array(n), si = BN ? new Uint16Array(n * 4) : null, sw = BN ? new Float32Array(n * 4) : null;
                const hasUV = gs.some(([g]) => g.attributes.uv), uv = hasUV ? new Float32Array(n * 2) : null; let nt = 0;   // textúrované diely (telo z modelu s textúrou) idú na koniec do tretej skupiny
                // reťaze končatín pre animáciu vzdialeného zástupu na grafickej karte: [reťaz, článok]; kĺby z pokojovej kostry
                const CH = BN ? { lgR: [0, 0], knR: [0, 1], lgL: [1, 0], knL: [1, 1], shR: [2, 0], elR: [2, 1], hR: [2, 1], wp: [2, 1], shL: [3, 0], elL: [3, 1], hL: [3, 1], shd: [3, 1], FR: [4, 0], FRk: [4, 1], FL: [5, 0], FLk: [5, 1], BR: [6, 0], BRk: [6, 1], BL: [7, 0], BLk: [7, 1] } : null;
                const CR = [['lgR', 'knR'], ['lgL', 'knL'], ['shR', 'elR'], ['shL', 'elL'], ['FR', 'FRk'], ['FL', 'FLk'], ['BR', 'BRk'], ['BL', 'BLk']], jp = b => { const e = BN.rest[b] && BN.rest[b].elements; return e ? [e[12], e[13], e[14]] : [0, 0, 0]; };
                const p1 = BN ? new Float32Array(n * 3) : null, p2 = BN ? new Float32Array(n * 3) : null, cls = BN ? new Float32Array(n) : null;
                let o0 = 0, nm = 0, PV = null;
                // plynulé kĺby: vrcholy pri kĺbe (lakeť, koleno, bedrá, krk koňa) sa delia medzi dve kosti, aby sa ohyb nelámal
                const J = BN && BN.blend ? BN.blend.map(([c, p, r]) => { const e = BN.rest[c].elements; return [BN.idx[c], BN.idx[p], e[12], e[13], e[14], r, c, p]; }) : null;
                for (const [g, c, o] of gs) {
                    const P = g.attributes.position, cnt = P.count;
                    if (o.cl) for (let i = 0; i < cnt; i++) cl[o0 + i] = Math.max(0, Math.min(1, (o.cl[0] - P.getY(i)) / o.cl[1])) * (o.cl[2] ?? 1);
                    const mc = o.t ?? (o.m ? mdef : 0);
                    if (BN && o.b) { const M = BN.rest[o.b]; g.applyMatrix4(M); }
                    pos.set(g.attributes.position.array, o0 * 3); nor.set(g.attributes.normal.array, o0 * 3);
                    if (o.pre && BN) {   // hotová tvarovaná sieť (telo zo SDF): farby, materiál a váhy kostí už má
                        const Cc = g.attributes.color, Am = g.attributes.aMat, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
                        if (!PV) PV = CR.map(c => BN.rest[c[0]] ? [jp(c[0]), jp(c[1])] : null);
                        for (let i = 0; i < cnt; i++) { const v = o0 + i; col[v * 3] = Cc.getX(i); col[v * 3 + 1] = Cc.getY(i); col[v * 3 + 2] = Cc.getZ(i); mt[v] = Am.getX(i);
                            for (let k = 0; k < 4; k++) { si[v * 4 + k] = SI.getComponent(i, k); sw[v * 4 + k] = SW.getComponent(i, k); }
                            const ch2 = CH[BN.list[si[v * 4]][0]]; if (ch2 && PV[ch2[0]]) { cls[v] = ch2[0] * 2 + ch2[1] + 1; p1.set(PV[ch2[0]][0], v * 3); p2.set(PV[ch2[0]][1], v * 3); } }
                        if (g.attributes.uv && uv) uv.set(g.attributes.uv.array, o0 * 2);
                        if (o.tex) nt += cnt; else if (o.m) nm += cnt; o0 += cnt; g.dispose(); continue;
                    }
                    const bi = BN ? BN.idx[o.b || BN.root] : 0, bn = o.b || (BN && BN.root), chn = CH && CH[bn] && BN.rest[CR[CH[bn][0]][0]] ? CH[bn] : null, P1 = chn ? jp(CR[chn[0]][0]) : null, P2 = chn ? jp(CR[chn[0]][1]) : null;
                    const VC = o.vc && g.attributes.color;   // farby vo vrcholoch (zbraň z modelu)
                    for (let i = 0; i < cnt; i++) {
                        const v = o0 + i; if (VC) { col[v * 3] = VC.getX(i); col[v * 3 + 1] = VC.getY(i); col[v * 3 + 2] = VC.getZ(i); } else { col[v * 3] = c.r; col[v * 3 + 1] = c.g; col[v * 3 + 2] = c.b; } mt[v] = mc;
                        if (!BN) continue;
                        si[v * 4] = bi; sw[v * 4] = 1;
                        if (chn) { cls[v] = chn[0] * 2 + chn[1] + 1; p1.set(P1, v * 3); p2.set(P2, v * 3); }
                        if (!J || o.rigid) continue;
                        const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2]; let bw = 0, bo = -1;
                        for (const j of J) { if (j[6] !== bn && j[7] !== bn) continue; const d = Math.hypot(x - j[2], y - j[3], z - j[4]); if (d >= j[5]) continue; const w = .5 * (1 - d / j[5]); if (w > bw) { bw = w; bo = j[6] === bn ? j[1] : j[0]; } }
                        if (bo >= 0) { si[v * 4 + 1] = bo; sw[v * 4] = 1 - bw; sw[v * 4 + 1] = bw; }
                    }
                    if (o.m) nm += cnt;
                    o0 += cnt; g.dispose();
                }
                const out = new t.BufferGeometry(); out.setAttribute('position', new t.BufferAttribute(pos, 3)); out.setAttribute('normal', new t.BufferAttribute(nor, 3)); out.setAttribute('color', new t.BufferAttribute(col, 3)); out.setAttribute('aCloth', new t.BufferAttribute(cl, 1)); out.setAttribute('aMat', new t.BufferAttribute(mt, 1));
                if (BN) { out.setAttribute('skinIndex', new t.Uint16BufferAttribute(si, 4)); out.setAttribute('skinWeight', new t.BufferAttribute(sw, 4)); out.setAttribute('aP1', new t.BufferAttribute(p1, 3)); out.setAttribute('aP2', new t.BufferAttribute(p2, 3)); out.setAttribute('aCls', new t.BufferAttribute(cls, 1)); }
                if (uv) out.setAttribute('uv', new t.BufferAttribute(uv, 2));
                out.addGroup(0, n - nm - nt, 0); if (nm) out.addGroup(n - nm - nt, nm, 1); if (nt) out.addGroup(n - nt, nt, 2);
                out.computeBoundingSphere(); if (out.boundingSphere) out.boundingSphere.radius *= 1.6;
                return out;
            }
        };
    }
    // ---------- tvarované telá: SDF (hladko zliate elipsoidy a kužeľové valce) → povrch metódou surface nets ----------
    const SDF = {
        sm(a, b, k) { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * .25; },
        cap(px, py, pz, a, b, ra, rb) { const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2], L = bx * bx + by * by + bz * bz || 1, t = Math.max(0, Math.min(1, ((px - a[0]) * bx + (py - a[1]) * by + (pz - a[2]) * bz) / L)); return Math.hypot(px - a[0] - bx * t, py - a[1] - by * t, pz - a[2] - bz * t) - (ra + (rb - ra) * t); },
        ell(px, py, pz, c, r) { const x = (px - c[0]) / r[0], y = (py - c[1]) / r[1], z = (pz - c[2]) / r[2], k0 = Math.hypot(x, y, z), k1 = Math.hypot(x / r[0], y / r[1], z / r[2]) || 1e-6; return k0 * (k0 - 1) / k1; }
    };
    /** Surface nets: povrch z poľa vzdialeností f v mriežke s krokom st. Vráti indexovanú geometriu s normálami z gradientu. */
    function surfNets(f, mn, mx, st) {
        const nx = Math.ceil((mx[0] - mn[0]) / st), ny = Math.ceil((mx[1] - mn[1]) / st), nz = Math.ceil((mx[2] - mn[2]) / st), X = nx + 1, Y = ny + 1;
        const V = new Float32Array(X * Y * (nz + 1)); for (let k = 0; k <= nz; k++) for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) V[i + X * (j + Y * k)] = f(mn[0] + i * st, mn[1] + j * st, mn[2] + k * st);
        const cid = new Int32Array(nx * ny * nz).fill(-1), P = [], E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]], cv = new Float32Array(8);
        for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
            let m = 0; for (let c = 0; c < 8; c++) { cv[c] = V[(i + (c & 1)) + X * ((j + (c >> 1 & 1)) + Y * (k + (c >> 2 & 1)))]; if (cv[c] < 0) m |= 1 << c; }
            if (m === 0 || m === 255) continue;
            let sx = 0, sy = 0, sz = 0, n = 0;
            for (const [a, b] of E) { const va = cv[a], vb = cv[b]; if ((va < 0) === (vb < 0)) continue; const t = va / (va - vb); sx += (a & 1) + ((b & 1) - (a & 1)) * t; sy += (a >> 1 & 1) + ((b >> 1 & 1) - (a >> 1 & 1)) * t; sz += (a >> 2 & 1) + ((b >> 2 & 1) - (a >> 2 & 1)) * t; n++; }
            cid[i + nx * (j + ny * k)] = P.length / 3; P.push(mn[0] + (i + sx / n) * st, mn[1] + (j + sy / n) * st, mn[2] + (k + sz / n) * st);
        }
        const I = [], C = (i, j, k) => cid[i + nx * (j + ny * k)];
        for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
            const v0 = V[i + X * (j + Y * k)] < 0;
            const quad = (a, b, c, d, flip) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (flip) I.push(a, c, b, a, d, c); else I.push(a, b, c, a, c, d); };
            if (j > 0 && k > 0 && (V[(i + 1) + X * (j + Y * k)] < 0) !== v0) quad(C(i, j, k), C(i, j - 1, k), C(i, j - 1, k - 1), C(i, j, k - 1), !v0);
            if (i > 0 && k > 0 && (V[i + X * ((j + 1) + Y * k)] < 0) !== v0) quad(C(i, j, k), C(i, j, k - 1), C(i - 1, j, k - 1), C(i - 1, j, k), !v0);
            if (i > 0 && j > 0 && (V[i + X * (j + Y * (k + 1))] < 0) !== v0) quad(C(i, j, k), C(i - 1, j, k), C(i - 1, j - 1, k), C(i, j - 1, k), !v0);
        }
        const N = new Float32Array(P.length), e = st * .5;
        for (let v = 0; v < P.length; v += 3) { const x = P[v], y = P[v + 1], z = P[v + 2], gx = f(x + e, y, z) - f(x - e, y, z), gy = f(x, y + e, z) - f(x, y - e, z), gz = f(x, y, z + e) - f(x, y, z - e), l = Math.hypot(gx, gy, gz) || 1; N[v] = gx / l; N[v + 1] = gy / l; N[v + 2] = gz / l; }
        let agree = 0; for (let i = 0; i < Math.min(I.length, 900); i += 3) { const a = I[i] * 3, b = I[i + 1] * 3, c = I[i + 2] * 3, ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2]; agree += Math.sign((uy * vz - uz * vy) * N[a] + (uz * vx - ux * vz) * N[a + 1] + (ux * vy - uy * vx) * N[a + 2]); }
        if (agree < 0) for (let i = 0; i < I.length; i += 3) { const tmp = I[i + 1]; I[i + 1] = I[i + 2]; I[i + 2] = tmp; }   // trojuholníky otočené von
        return { P, N, I };
    }
    /** Telo z SDF podľa kostry: segmenty [kosť, začiatok, koniec, polomer a, polomer b]; váhy kostí z dvoch najbližších segmentov (plynulé kĺby). */
    function sdfMesh(segs, extra, mn, mx, st, BN, sub) {
        const t = T(), f = (x, y, z) => { let d = 1e9; for (const g of segs) d = SDF.sm(d, SDF.cap(x, y, z, g[1], g[2], g[3], g[4]), g[5] || .8); for (const e of extra) d = SDF.sm(d, SDF.ell(x, y, z, e[1], e[2]), e[3] || .8); if (sub) for (const e of sub) d = -SDF.sm(-d, SDF.ell(x, y, z, e[1], e[2]), e[3] || .25); return d; };
        const { P, N, I } = surfNets(f, mn, mx, st), n = P.length / 3, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), main = new Array(n);
        for (let v = 0; v < n; v++) {
            const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2]; let b1 = -1, d1 = 1e9, b2 = -1, d2 = 1e9;
            for (const g of segs) { const d = Math.max(.05, SDF.cap(x, y, z, g[1], g[2], 0, 0)), bi = BN.idx[g[0]]; if (d < d1) { if (bi !== b1) { b2 = b1; d2 = d1; } b1 = bi; d1 = d; } else if (d < d2 && bi !== b1) { b2 = bi; d2 = d; } }
            const w1 = 1 / Math.pow(d1, 4), w2 = b2 >= 0 ? 1 / Math.pow(d2, 4) : 0, s = w1 + w2; si[v * 4] = b1; sw[v * 4] = w1 / s; if (b2 >= 0) { si[v * 4 + 1] = b2; sw[v * 4 + 1] = w2 / s; }
            main[v] = BN.list[b1][0];
        }
        return { P, N, I, si, sw, main, n };
    }
    /** Z tvarovaného tela poskladá geometriu pre Part (farba a materiál podľa oblasti); kov a látka zvlášť kvôli dvom materiálom. */
    function sdfGeos(M, colorOf) {
        const t = T(), out = [];
        for (const grp of [0, 1, 2]) {   // 0 látka a koža (farby vrcholov), 1 kov, 2 textúra modelu
            const metal = grp === 1, tri = []; for (let i = 0; i < M.I.length; i += 3) { const a = M.I[i], r = colorOf(M.main[a], M.P[a * 3 + 1], M.P[a * 3 + 2]); if ((r[3] ? 2 : r[2] ? 1 : 0) === grp) tri.push(M.I[i], M.I[i + 1], M.I[i + 2]); }
            if (!tri.length) continue;
            const n = tri.length, pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), mt = new Float32Array(n), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), c = new t.Color(), uv = M.UV ? new Float32Array(n * 2) : null;
            tri.forEach((v, k) => { pos.set([M.P[v * 3], M.P[v * 3 + 1], M.P[v * 3 + 2]], k * 3); if (uv) { uv[k * 2] = M.UV[v * 2]; uv[k * 2 + 1] = M.UV[v * 2 + 1]; } nor.set([M.N[v * 3], M.N[v * 3 + 1], M.N[v * 3 + 2]], k * 3); const r = colorOf(M.main[v], M.P[v * 3 + 1], M.P[v * 3 + 2]); c.set(r[0]); col.set([c.r, c.g, c.b], k * 3); mt[k] = r[1]; si.set(M.si.subarray(v * 4, v * 4 + 4), k * 4); sw.set(M.sw.subarray(v * 4, v * 4 + 4), k * 4); });
            const g = new t.BufferGeometry(); g.setAttribute('position', new t.BufferAttribute(pos, 3)); g.setAttribute('normal', new t.BufferAttribute(nor, 3)); g.setAttribute('color', new t.BufferAttribute(col, 3)); g.setAttribute('aMat', new t.BufferAttribute(mt, 1)); g.setAttribute('skinIndex', new t.Uint16BufferAttribute(si, 4)); g.setAttribute('skinWeight', new t.BufferAttribute(sw, 4)); if (uv) g.setAttribute('uv', new t.BufferAttribute(uv, 2));
            out.push([g, metal, grp === 2]);
        }
        return out;
    }
    // ---------- telo človeka z modelu (Meshy, import tools/model_import.py → js/data/model_clovek.js) ----------
    /** Modely postáv podľa rasy (z Meshy cez tools/model_import.py): človek a ork. Vypínajú sa v Nastaveniach (Telá v 3D). */
    const MODELS = {
        human: () => typeof MODEL_CLOVEK !== 'undefined' ? MODEL_CLOVEK : null, orc: () => typeof MODEL_ORK !== 'undefined' ? MODEL_ORK : null, elf: () => typeof MODEL_ELF !== 'undefined' ? MODEL_ELF : null,
        hobbit: () => typeof MODEL_HOBIT !== 'undefined' ? MODEL_HOBIT : null, dwarf: () => typeof MODEL_TRPASLIK !== 'undefined' ? MODEL_TRPASLIK : null, uruk: () => typeof MODEL_URUK !== 'undefined' ? MODEL_URUK : null,
        troll: () => typeof MODEL_TROL !== 'undefined' ? MODEL_TROL : null, wraith: () => typeof MODEL_NAZGUL !== 'undefined' ? MODEL_NAZGUL : null, trollking: () => typeof MODEL_KRAL_TROLOV !== 'undefined' ? MODEL_KRAL_TROLOV : null,
        varg: () => typeof MODEL_VARG !== 'undefined' ? MODEL_VARG : null, oliphant: () => typeof MODEL_OLIFANT !== 'undefined' ? MODEL_OLIFANT : null, ent: () => typeof MODEL_ENT !== 'undefined' ? MODEL_ENT : null,
        dragon: () => typeof MODEL_DRAK !== 'undefined' ? MODEL_DRAK : null, balrog: () => typeof MODEL_BALROG !== 'undefined' ? MODEL_BALROG : null, fell: () => typeof MODEL_BESTIA !== 'undefined' ? MODEL_BESTIA : null,
        ponik: () => typeof MODEL_KON_PONIK !== 'undefined' ? MODEL_KON_PONIK : null, rohan: () => typeof MODEL_KON_ROHAN !== 'undefined' ? MODEL_KON_ROHAN : null, mearas: () => typeof MODEL_KON_MEARAS !== 'undefined' ? MODEL_KON_MEARAS : null, gondor: () => typeof MODEL_KON_GONDOR !== 'undefined' ? MODEL_KON_GONDOR : null
    };
    /** Tmavé varianty koní (Čierny kôň Mordoru, kôň nazgûla): rovnaký model, textúra v atlase stmavená. */
    const VARIANTS = { gondor_d: ['gondor', '#3a3034'], mearas_d: ['mearas', '#1c1a22'] };
    const modelOf0 = k => MODELS[k] ? MODELS[k]() : VARIANTS[k] ? MODELS[VARIANTS[k][0]]() : null;
    const modelOf = race => (typeof OPT !== 'undefined' && OPT.modelHuman === false) ? null : modelOf0(race);
    /** Zbrane z modelov (Meshy, tools/model_import.py --kind=prop): rukoväť v počiatku kosti ruky, farby vo vrcholoch, kov zvlášť (lesk). */
    const WMODELS = {
        w_zelezny_mec: () => typeof MODEL_W_ZELEZNY_MEC !== 'undefined' ? MODEL_W_ZELEZNY_MEC : null, w_mec_strazcu: () => typeof MODEL_W_MEC_STRAZCU !== 'undefined' ? MODEL_W_MEC_STRAZCU : null,
        w_rohanska_kopija: () => typeof MODEL_W_ROHANSKA_KOPIJA !== 'undefined' ? MODEL_W_ROHANSKA_KOPIJA : null, w_dunadansky_mec: () => typeof MODEL_W_DUNADANSKY_MEC !== 'undefined' ? MODEL_W_DUNADANSKY_MEC : null,
        w_orcrist: () => typeof MODEL_W_ORCRIST !== 'undefined' ? MODEL_W_ORCRIST : null, w_sekera_erebor: () => typeof MODEL_W_SEKERA_EREBOR !== 'undefined' ? MODEL_W_SEKERA_EREBOR : null,
        w_glamdring: () => typeof MODEL_W_GLAMDRING !== 'undefined' ? MODEL_W_GLAMDRING : null, w_plamen_anoru: () => typeof MODEL_W_PLAMEN_ANORU !== 'undefined' ? MODEL_W_PLAMEN_ANORU : null,
        w_anduril: () => typeof MODEL_W_ANDURIL !== 'undefined' ? MODEL_W_ANDURIL : null, w_gondor_obojrucny: () => typeof MODEL_W_GONDOR_OBOJRUCNY !== 'undefined' ? MODEL_W_GONDOR_OBOJRUCNY : null
    };
    /** Výbava u kováča (názov v js/data/equipment.js) → model zbrane. */
    const WEAPON_BY_NAME = { 'Železný meč': 'w_zelezny_mec', 'Meč Gondorskej stráže': 'w_mec_strazcu', 'Rohanská kopija': 'w_rohanska_kopija', 'Dúnadanský meč': 'w_dunadansky_mec', 'Orcrist': 'w_orcrist',
        'Trpasličia sekera z Ereboru': 'w_sekera_erebor', 'Glamdring': 'w_glamdring', 'Plameň Anoru': 'w_plamen_anoru', 'Andúril': 'w_anduril', 'Gondorský obojručný meč': 'w_gondor_obojrucny' };
    const weaponModel = k => k && WMODELS[k] && (typeof OPT === 'undefined' || OPT.modelHuman !== false) ? WMODELS[k]() : null;
    const weaponOf = i => { const it = typeof shOf === 'function' && i != null ? shOf('w')[i] : null; return (it && WEAPON_BY_NAME[it.n]) || null; };
    /** Brnenia z modelov (Meshy, --kind=garment): samostatný odev, telu rasy ho prispôsobí GarmentFit (js/engine/garment.js). */
    const AMODELS = {
        a_kozeny_odev: () => typeof MODEL_A_KOZENY_ODEV !== 'undefined' ? MODEL_A_KOZENY_ODEV : null, a_rohanska_kruzkova: () => typeof MODEL_A_ROHANSKA_KRUZKOVA !== 'undefined' ? MODEL_A_ROHANSKA_KRUZKOVA : null,
        a_gondorsky_plat: () => typeof MODEL_A_GONDORSKY_PLAT !== 'undefined' ? MODEL_A_GONDORSKY_PLAT : null, a_galadrimska_supinova: () => typeof MODEL_A_GALADRIMSKA_SUPINOVA !== 'undefined' ? MODEL_A_GALADRIMSKA_SUPINOVA : null,
        a_plat_z_ereboru: () => typeof MODEL_A_PLAT_Z_EREBORU !== 'undefined' ? MODEL_A_PLAT_Z_EREBORU : null, a_mithrilova_kosela: () => typeof MODEL_A_MITHRILOVA_KOSELA !== 'undefined' ? MODEL_A_MITHRILOVA_KOSELA : null
    };
    const ARMOR_BY_NAME = { 'Kožený odev': 'a_kozeny_odev', 'Rohanská krúžková zbroj': 'a_rohanska_kruzkova', 'Gondorský plát': 'a_gondorsky_plat', 'Galadrimská šupinová zbroj': 'a_galadrimska_supinova', 'Plát z Ereboru': 'a_plat_z_ereboru', 'Mithrilová košeľa': 'a_mithrilova_kosela' };
    const armorModel = k => k && AMODELS[k] && typeof GarmentFit !== 'undefined' && (typeof OPT === 'undefined' || OPT.modelHuman !== false) ? AMODELS[k]() : null;
    const armorOf = i => { const it = typeof shOf === 'function' && i != null ? shOf('a')[i] : null; return (it && ARMOR_BY_NAME[it.n]) || null; };
    const b64 = (s2, Tp) => { const a = atob(s2), u8 = new Uint8Array(a.length); for (let i = 0; i < a.length; i++) u8[i] = a.charCodeAt(i); return new Tp(u8.buffer); };
    let REFM = null;
    const GGC = {};
    /** Brnenie nasadené na telo rasy (kostra BN, rozmery rc): [nekovové časti, kov] ako hotové kostrové siete (pre Part s o.pre); low = zjednodušené. */
    function garmentGeos(k, BN, rc, low) {
        const ck = k + rc.race + (low ? 'l' : 'h'); if (GGC[ck]) return GGC[ck];
        const t = T(), A0 = armorModel(k), Pq = b64(low ? A0.pl : A0.p, Int16Array), I = b64(low ? A0.il : A0.i, Uint16Array), Cb = b64(low ? A0.cl : A0.c, Uint8Array), n = Pq.length / 3, G = new Float32Array(n * 3);
        for (let i = 0; i < G.length; i++) G[i] = Pq[i] / 100;
        if (!REFM && modelOf0('human')) { const H0 = decodeModel(modelOf0('human'), 'human'); REFM = GarmentFit.bodyMeasures(H0, modelOf0('human').land); }
        const F = GarmentFit.fit(G, A0.land, modelBody(BN, rc, false), rc.md.land, REFM), col = new Float32Array(n * 3), c = new t.Color();
        for (let v = 0; v < n; v++) { c.setRGB(Cb[v * 4] / 255, Cb[v * 4 + 1] / 255, Cb[v * 4 + 2] / 255, t.SRGBColorSpace); col[v * 3] = c.r; col[v * 3 + 1] = c.g; col[v * 3 + 2] = c.b; }
        const out = [0, 1].map(metal => {
            const tri = []; for (let i = 0; i < I.length; i += 3) if ((Cb[I[i] * 4 + 3] + Cb[I[i + 1] * 4 + 3] + Cb[I[i + 2] * 4 + 3] > 382) === !!metal) tri.push(I[i], I[i + 1], I[i + 2]);
            if (!tri.length) return null;
            const g = new t.BufferGeometry(); g.setAttribute('position', new t.BufferAttribute(F.P, 3)); g.setAttribute('color', new t.BufferAttribute(col, 3)); g.setAttribute('aMat', new t.BufferAttribute(new Float32Array(n), 1));
            g.setAttribute('skinIndex', new t.Uint16BufferAttribute(F.si, 4)); g.setAttribute('skinWeight', new t.BufferAttribute(F.sw, 4)); g.setIndex(tri); g.computeVertexNormals(); return g;
        });
        return (GGC[ck] = out);
    }
    const WGC = {};
    /** Geometrie zbrane z modelu: [nekovové časti, kov]; low = zjednodušená pre vzdialené zástupy. */
    function weaponGeos(k, low) {
        const ck = k + (low ? 'l' : 'h'); if (WGC[ck]) return WGC[ck];
        const t = T(), M0 = weaponModel(k), dec = (b64, Tp) => { const s2 = atob(b64), u8 = new Uint8Array(s2.length); for (let i = 0; i < s2.length; i++) u8[i] = s2.charCodeAt(i); return new Tp(u8.buffer); };
        const Pq = dec(low ? M0.pl : M0.p, Int16Array), I = dec(low ? M0.il : M0.i, Uint16Array), Cb = dec(low ? M0.cl : M0.c, Uint8Array), n = Pq.length / 3, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), c = new t.Color();
        for (let v = 0; v < n; v++) { pos[v * 3] = Pq[v * 3] / 100; pos[v * 3 + 1] = Pq[v * 3 + 1] / 100; pos[v * 3 + 2] = Pq[v * 3 + 2] / 100; c.setRGB(Cb[v * 4] / 255, Cb[v * 4 + 1] / 255, Cb[v * 4 + 2] / 255, t.SRGBColorSpace); col[v * 3] = c.r; col[v * 3 + 1] = c.g; col[v * 3 + 2] = c.b; }
        const out = [0, 1].map(metal => {
            const tri = []; for (let i = 0; i < I.length; i += 3) if ((Cb[I[i] * 4 + 3] + Cb[I[i + 1] * 4 + 3] + Cb[I[i + 2] * 4 + 3] > 382) === !!metal) tri.push(I[i], I[i + 1], I[i + 2]);
            if (!tri.length) return null;
            const g = new t.BufferGeometry(); g.setAttribute('position', new t.BufferAttribute(pos, 3)); g.setAttribute('color', new t.BufferAttribute(col, 3)); g.setIndex(tri); g.computeVertexNormals(); return g;
        });
        return (WGC[ck] = out);
    }
    /** Atlas textúr všetkých modelov (4×4 políčka po 512 px) – jeden materiál pre všetky textúrované telá, aj pre vzdialené zástupy. */
    let ATLAS = null;
    function atlas() {
        if (ATLAS) return ATLAS;
        const t = T(), names = Object.keys(MODELS).concat(Object.keys(VARIANTS)).filter(k => modelOf0(k) && modelOf0(k).tex), rows = Math.max(1, Math.ceil(names.length / 4)), c = document.createElement('canvas'); c.width = 2048; c.height = rows * 512;
        const x = c.getContext('2d'); x.fillStyle = '#8a8078'; x.fillRect(0, 0, c.width, c.height);
        const tex = new t.CanvasTexture(c); tex.colorSpace = t.SRGBColorSpace; tex.flipY = false; tex.anisotropy = 4; const slots = {};
        const ready = Promise.all(names.map((k, i) => new Promise(res => { slots[k] = i; const im = new Image(); im.onload = () => { const ox = (i % 4) * 512, oy = (i >> 2) * 512; x.drawImage(im, ox, oy, 512, 512); if (VARIANTS[k]) { x.globalCompositeOperation = 'multiply'; x.fillStyle = VARIANTS[k][1]; x.fillRect(ox, oy, 512, 512); x.globalCompositeOperation = 'source-over'; } tex.needsUpdate = true; res(); }; im.onerror = res; im.src = modelOf0(k).tex; })));
        return (ATLAS = { tex, slots, ready, rows });
    }
    /** Rozbalí model (pozície ×100, trojuholníky, UV do atlasu) a dopočíta normály. */
    function decodeModel(M0, key, low, scale = 1) {
        const dec = (b64, Tp) => { const s2 = atob(b64), u8 = new Uint8Array(s2.length); for (let i = 0; i < s2.length; i++) u8[i] = s2.charCodeAt(i); return new Tp(u8.buffer); };
        const Pq = dec(low ? M0.pl : M0.p, Int16Array), I = Array.from(dec(low ? M0.il : M0.i, Uint16Array)), n = Pq.length / 3, P = new Float32Array(n * 3);
        for (let i = 0; i < P.length; i++) P[i] = Pq[i] / 100 * scale;
        let UV = null; if (M0.uv && !low) { const q = dec(M0.uv, Uint16Array), sl = atlas().slots[key] || 0, ox = sl % 4, oy = sl >> 2; UV = new Float32Array(q.length); for (let i = 0; i < q.length; i += 2) { UV[i] = (q[i] / 10000 + ox) / 4; UV[i + 1] = (q[i + 1] / 10000 + oy) / atlas().rows; } }
        const N = new Float32Array(n * 3);
        for (let i = 0; i < I.length; i += 3) { const a = I[i] * 3, b = I[i + 1] * 3, c = I[i + 2] * 3, ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2], nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; for (const v of [a, b, c]) { N[v] += nx; N[v + 1] += ny; N[v + 2] += nz; } }
        for (let v = 0; v < N.length; v += 3) { const l = Math.hypot(N[v], N[v + 1], N[v + 2]) || 1; N[v] /= l; N[v + 1] /= l; N[v + 2] /= l; }
        return { P, N, I, n, UV };
    }
    /** Váhy kostí podľa vzdialenosti od úsečiek kostí (dve najbližšie, plynulé kĺby). */
    function skinBySegs(M, segs, BN, pw = 4) {
        const { P, n } = M, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), main = new Array(n);
        for (let v = 0; v < n; v++) {
            const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2]; let b1 = -1, d1 = 1e9, b2 = -1, d2 = 1e9;
            for (const g of segs) { const d = Math.max(.05, SDF.cap(x, y, z, g[1], g[2], 0, 0)), bi = BN.idx[g[0]]; if (bi === b1) { d1 = Math.min(d1, d); continue; } if (d < d1) { b2 = b1; d2 = d1; b1 = bi; d1 = d; } else if (d < d2 && bi !== b1) { b2 = bi; d2 = d; } }
            const w1 = 1 / Math.pow(d1, pw), w2 = b2 >= 0 ? 1 / Math.pow(d2, pw) : 0, sm = w1 + w2; si[v * 4] = b1; sw[v * 4] = w1 / sm; if (b2 >= 0) { si[v * 4 + 1] = b2; sw[v * 4 + 1] = w2 / sm; } main[v] = BN.list[b1][0];
        }
        return Object.assign(M, { si, sw, main });
    }
    const MRC = {};
    /** Rozmery kostry z kĺbov modelu (členky, kolená, bedrá, ramená, lakte, zápästia, hlava, oči, ústa). */
    function modelRace(race) {
        if (MRC[race]) return MRC[race];
        const MD = modelOf(race), L = MD.land, foot = L.ankleY + .3, lt = L.hipJY - L.kneeY, ls = L.kneeY - L.ankleY, hipY = lt + ls + foot, chY = hipY + .8, H = L.shY - chY + 1.9;
        const elO = [L.el[0] - L.shX, L.el[1] - L.shY, L.el[2] - L.shZ], hO = [L.wr[0] - L.el[0], L.wr[1] - L.el[1], L.wr[2] - L.el[2]], len = v => Math.hypot(v[0], v[1], v[2]);
        const base = RACE[race] || (race === 'trollking' ? RACE.troll : RACE.human);
        MRC[race] = { model: 1, race, md: MD, hunch0: base.hunch, ears: base.ears, tusks: base.tusks, noFace: base.noFace, W: (L.shZ - .7) * 2, D: Math.max(3.4, L.chestD), H, lt, ls, a1: len(elO), a2: len(hO), hs: (L.headD / 4.1 + L.headW / 3.9) / 2, hunch: 0, foot, legZ: L.legZ, shZ: L.shZ, shX: L.shX, elO, hO,
            hc: [L.hc[0], L.hc[1] - chY, 0], hipW: L.hipW, ey: [L.eye[0], L.eye[1] - chY, 0], eyeZ: L.eye[2], mo: [L.mouth[0], L.mouth[1] - chY, 0], wpO: [.25, -.9, 0], chY, headH: L.headH, tip: L.handTip };
        return MRC[race];
    }
    const MBC = {};
    /** Sieť tela z modelu s váhami kostí podľa vzdialenosti od kostí hernej kostry (rovnako ako pri tvarovaných telách); low = zjednodušená verzia. */
    function modelBody(BN, rc, low) {
        const key = rc.race + (low ? 'l' : 'h'); if (MBC[key]) return MBC[key];
        const M0 = rc.md, M = decodeModel(M0, rc.race, low), P = M.P, n = M.n;
        const J = b => { const e = BN.rest[b].elements; return [e[12], e[13], e[14]]; }, add = (a, d) => [a[0] + d[0], a[1] + d[1], a[2] + d[2]], hip = J('hip'), ch = J('ch'), hd = J('hd'), L = M0.land;
        const segs = [['hip', add(hip, [0, -.6, 0]), add(ch, [0, .3, 0])], ['ch', add(ch, [0, .4, 0]), add(ch, [0, rc.H - 1.4, 0])], ['ch', add(ch, [0, rc.H - 1.2, 0]), add(hd, [-.3, -rc.headH * .55, 0])], ['hd', add(hd, [0, -rc.headH * .35, 0]), add(hd, [0, rc.headH * .45, 0])]];
        for (const [sd, sh2, el, hh, lg, kn] of [[1, 'shR', 'elR', 'hR', 'lgR', 'knR'], [-1, 'shL', 'elL', 'hL', 'lgL', 'knL']]) {
            const S = J(sh2), E = J(el), Hh = J(hh), Tp = [L.handTip[0], L.handTip[1], L.handTip[2] * sd], Lg = J(lg), K = J(kn), A = add(K, [0, -rc.ls, 0]);
            segs.push([sh2, add(S, [0, .2, 0]), E], [el, E, Hh], [hh, Hh, Tp], [lg, add(Lg, [0, .5, 0]), K], [kn, K, A], [kn, A, add(A, [2.2, -1.2, 0])]);
        }
        return (MBC[key] = skinBySegs(M, segs, BN));
    }
    /** Zviera alebo boss z modelu (varg s jazdcom, olifant s vežou, ent, drak, Balrog, okrídlená šelma): kostra podľa druhu z obálky modelu,
     *  váhy podľa úsečiek; nohy, krídla a ruky sú kosti, ktoré hýbe rovnaký kód ako doteraz (o.legs, o.wings, o.arms). */
    function beastModel(kind, BN0, scale) {
        const key = 'beast' + kind; if (MBC[key]) return MBC[key];
        const M0 = modelOf0(kind), b = M0.land.bbox, L = b[1][0] - b[0][0], W = b[1][2] - b[0][2], H = b[1][1] - b[0][1], M = decodeModel(M0, kind, false, scale || 1);
        let BN = BN0, segs, legs = null, wings = null, arms = null;
        if (kind === 'oliphant') {
            BN = skel([['body', null, [0, H * .55, 0]], ['hd', 'body', [L * .36, H * .05, 0]], ['FR', 'body', [L * .2, -H * .17, W * .25]], ['FL', 'body', [L * .2, -H * .17, -W * .25]], ['BR', 'body', [-L * .26, -H * .17, W * .25]], ['BL', 'body', [-L * .26, -H * .17, -W * .25]]]);
            segs = [['body', [-L * .5, H * .55, 0], [L * .3, H * .55, 0]], ['hd', [L * .38, H * .6, 0], [L * .5, H * .08, 0]]]; legs = ['FR', 'FL', 'BR', 'BL'];
            for (const n of legs) { const e = BN.rest[n].elements; segs.push([n, [e[12], e[13] + H * .05, e[14]], [e[12], 0, e[14]]]); }
        } else if (kind === 'ent') {
            BN = skel([['body', null, [0, H * .3, 0]], ['lgR', 'body', [0, 0, W * .07]], ['lgL', 'body', [0, 0, -W * .07]], ['arR', 'body', [0, H * .42, W * .15]], ['arL', 'body', [0, H * .42, -W * .15]]]);
            segs = [['body', [0, H * .28, 0], [0, H, 0]], ['lgR', [0, H * .3, W * .07], [0, 0, W * .09]], ['lgL', [0, H * .3, -W * .07], [0, 0, -W * .09]], ['arR', [0, H * .72, W * .15], [0, H * .45, W * .5]], ['arL', [0, H * .72, -W * .15], [0, H * .45, -W * .5]]];
            legs = ['lgR', 'lgL']; arms = ['arR', 'arL'];
        } else {   // drak, Balrog, okrídlená šelma: telo a dve krídla (os x = vpred, krídla do ±z)
            const wy = kind === 'balrog' ? H * .72 : H * .55, wz = kind === 'balrog' ? W * .08 : W * .07, wx = kind === 'balrog' ? -L * .1 : 0;
            BN = skel([['body', null, [0, 0, 0]], ['wR', 'body', [wx, wy, wz]], ['wL', 'body', [wx, wy, -wz]]]);
            segs = [['body', [-L * .5, H * .45, 0], [L * .5, H * .45, 0]], ['body', [0, 0, 0], [0, H, 0]], ['wR', [wx, wy, wz], [wx, wy * 1.05, W * .5]], ['wL', [wx, wy, -wz], [wx, wy * 1.05, -W * .5]]];
            wings = ['wR', 'wL'];
        }
        skinBySegs(M, segs, BN, 6);
        const P2 = Part(); for (const [g] of sdfGeos(M, () => ['#ffffff', 0, false])) P2.add(g, '#ffffff', [0, 0, 0], [0, 0, 0], [1, 1, 1], { pre: 1, tex: !!M0.tex });
        return (MBC[key] = { geo: P2.build(BN, 4), BN, legs, wings, arms, kind, L, W, H });
    }
    /** Varg s jazdcom z modelu na kostre herného vlka (kĺby nôh, krk, hlava, chvost). */
    function vargModel(BN, k) {
        const key = 'varg'; if (MBC[key]) return MBC[key];
        const M = decodeModel(modelOf0('varg'), 'varg', false, 1 / k), J = b => { const e = BN.rest[b].elements; return [e[12], e[13], e[14]]; }, add = (a, d) => [a[0] + d[0], a[1] + d[1], a[2] + d[2]];
        const mb = J('mb'), segs = [['mb', add(mb, [-9, 1, 0]), add(mb, [9, 1, 0])], ['mb', add(mb, [0, 2, 0]), add(mb, [0, 24, 0])], ['nk', J('nk'), J('hd')], ['hd', J('hd'), add(J('hd'), [5, -1, 0])], ['tl', J('tl'), add(J('tl'), [-7, -3, 0])]];
        for (const Lg of ['FR', 'FL', 'BR', 'BL']) { const A = J(Lg), K = J(Lg + 'k'); segs.push([Lg, A, K], [Lg + 'k', K, add(K, [0, -(K[1] - 1), 0])]); }
        return (MBC[key] = skinBySegs(M, segs, BN, 6));
    }
    /** Kôň z modelu (poník, rohanský, gondorský bojový, Mearas a ich tmavé varianty) na kostre herného koňa: telo, krk, hlava, chvost, nohy s kĺbmi.
     *  Model sa posunie tak, aby stred kopýt sedel pod telom, a stojí na zemi. */
    function horseModel(key, BN, k) {
        const ck = 'horse' + key; if (MBC[ck]) return MBC[ck];
        const M = decodeModel(modelOf0(key), key, false, 1 / k), P = M.P, J = b => { const e = BN.rest[b].elements; return [e[12], e[13], e[14]]; }, add = (a, d) => [a[0] + d[0], a[1] + d[1], a[2] + d[2]];
        let ymin = 1e9, ymax = -1e9; for (let i = 1; i < P.length; i += 3) { ymin = Math.min(ymin, P[i]); ymax = Math.max(ymax, P[i]); }
        let sx = 0, n = 0; for (let i = 0; i < P.length; i += 3) if (P[i + 1] < ymin + (ymax - ymin) * .1) { sx += P[i]; n++; }
        const dx = n ? sx / n + .3 : 0; for (let i = 0; i < P.length; i += 3) { P[i] -= dx; P[i + 1] -= ymin; }   // kopytá pod kostrou, na zemi
        const mb = J('mb'), segs = [['mb', add(mb, [-10, 1, 0]), add(mb, [8, 1, 0])], ['mb', add(mb, [0, -4, 0]), add(mb, [0, 5, 0])], ['nk', add(J('nk'), [-1, -1, 0]), J('hd')], ['hd', J('hd'), add(J('hd'), [6, -3, 0])], ['tl', J('tl'), add(J('tl'), [-8, -6, 0])]];
        for (const Lg of ['FR', 'FL', 'BR', 'BL']) { const A = J(Lg), K = J(Lg + 'k'); segs.push([Lg, add(A, [0, 1.5, 0]), K], [Lg + 'k', K, add(K, [0, -(K[1] - .5), 0])]); }
        return (MBC[ck] = skinBySegs(M, segs, BN, 6));
    }
    const SDFC = new Map();
    /** Ľudské (elfské, orkské, trolie…) telo zo SDF v pokojovej póze; vrátené z vyrovnávacej pamäte podľa rasy. */
    function bodySDF(race, rc, BN, key, low) {
        key = (key || race) + (low ? ':lo' : ''); if (SDFC.has(key)) return SDFC.get(key);
        const { W, D, H, lt, ls, a1, a2 } = rc, bk = { orc: 1.12, uruk: 1.14, troll: 1.28, dwarf: 1.14, elf: .88, hobbit: .95, wraith: .9 }[race] || 1;
        const J = b => { const e = BN.rest[b].elements; return [e[12], e[13], e[14]]; }, add = (a, d) => [a[0] + d[0], a[1] + d[1], a[2] + d[2]];
        const hip = J('hip'), ch = J('ch'), segs = [], ex = [];
        segs.push(['hip', add(hip, [0, -.6, 0]), add(ch, [0, .4, 0]), W * .36 * bk, W * .38 * bk, 1.2]);
        segs.push(['ch', add(ch, [0, .5, 0]), add(ch, [0, H - 1.6, 0]), W * .4 * bk, W * .46 * bk, 1.2]);
        segs.push(['ch', add(ch, [0, H - 1.4, 0]), add(ch, [0, H + .9, 0]), .95 * bk, .85 * bk, .9]);   // krk
        ex.push(['ch', add(ch, [.15, H * .62, 0]), [D * .55 * bk, H * .36, W * .5 * bk], 1.3], ['ch', add(ch, [.35, H * .62, W * .2]), [D * .3, H * .2, W * .18], .9], ['ch', add(ch, [.35, H * .62, -W * .2]), [D * .3, H * .2, W * .18], .9]);   // hruď a prsné svaly
        ex.push(['hip', add(hip, [0, -.4, 0]), [D * .5 * bk, 1.9, W * .42 * bk], 1]);
        ex.push(['ch', add(ch, [-.15, H - 1.75, 0]), [D * .34 * bk, .8, W * .3 * bk], .9]);   // trapézy (prechod krk–ramená, pod hranicou kože)
        for (const z of [-1, 1]) ex.push(['hip', add(hip, [-.8, -1, z * W * .17]), [1.9 * bk, 1.7, W * .17], .8]);   // sedacie svaly
        for (const [sd, sh, el, hd, lg, kn] of [[1, 'shR', 'elR', 'hR', 'lgR', 'knR'], [-1, 'shL', 'elL', 'hL', 'lgL', 'knL']]) {
            const S = J(sh), E = J(el), Hh = J(hd), L = J(lg), K = J(kn), F = add(K, [.2, -ls + .9, 0]);
            segs.push([sh, S, E, 1.2 * bk, 1.0 * bk, .6], [el, E, add(Hh, [0, .3, 0]), 1.0 * bk, .72 * bk, .5]);
            ex.push([sh, add(S, [0, -.2, 0]), [1.35 * bk, 1.4 * bk, 1.35 * bk], .7], [sh, add(S, [.3, -a1 * .5, 0]), [1.0 * bk, a1 * .32, .95 * bk], .5]);   // ramenný sval a biceps
            segs.push([lg, add(L, [0, .4, 0]), K, 1.6 * bk, 1.15 * bk, .8], [kn, K, F, 1.15 * bk, .78 * bk, .5]);
            ex.push([kn, add(K, [-.35, -ls * .32, 0]), [1.0 * bk, ls * .3, .95 * bk], .5]);   // lýtko
            ex.push([lg, add(L, [.3, -lt * .42, 0]), [1.2 * bk, lt * .32, 1.1 * bk], .6], [el, add(E, [.15, -a2 * .3, 0]), [.82 * bk, a2 * .27, .8 * bk], .4]);   // stehenný sval a predlaktie
        }
        const R = Math.max(D, W) * .8 + 3.2, M = sdfMesh(segs, ex, [-R, 0, -R], [R, hip[1] + .8 + H + 1.4, R], low ? .9 : .42, BN);   // low: hrubšie telo pre vzdialený zástup
        SDFC.set(key, M); return M;
    }
    /** Hlava zo SDF: lebka, stredná časť tváre, sánka, brada, lícne kosti, obočnicové oblúky a ušné chrupavky – hladko zliate, s variantom podľa fv a rasy. */
    const HEADC = new Map();
    function headSDF(race, rc, BN, fv, hs, HX, HY, low) {
        const key = race + ':' + fv + ':' + hs + ':' + HX.toFixed(2) + ':' + HY.toFixed(2) + (low ? ':lo' : ''); if (HEADC.has(key)) return HEADC.get(key);
        const jw = [1, 1.1, .9, 1.22, 1, .9, 1.16, 1.05][fv], cb = [1, 1.1, .95, 1, 1.15, .9, 1, 1.05][fv], brow = [1, 1.15, .9, 1.3, 1, .9, 1.2, 1.1][fv];
        const orc = race === 'orc' || race === 'uruk' || race === 'troll', dw = race === 'dwarf', el = race === 'elf';
        const k = hs, ex = [];
        ex.push(['hdc', [HX - .2, HY + .35 * k, 0], [2.05 * k, 2.1 * k, 1.95 * k], .5]);   // lebka
        ex.push(['hdc', [HX + .35, HY - .5 * k, 0], [1.75 * k, 1.75 * k, (1.75 + (jw - 1) * .35) * k], .5]);   // stredná časť tváre
        ex.push(['hdc', [HX + (orc ? .55 : .35), HY - 1.3 * k, 0], [1.55 * k, 1.15 * k, 1.3 * jw * k * (el ? .88 : 1) * (orc ? 1.12 : 1)], .55]);   // sánka
        ex.push(['hdc', [HX + (orc ? 1.5 : 1.2) * k, HY - 1.85 * k, 0], [.7 * k * (dw ? 1.1 : 1), .62 * k, (orc ? .95 : .7) * k * jw], .4]);   // brada
        for (const z of [-1, 1]) {
            ex.push(['hdc', [HX + 1.1 * k, HY - .45 * k, z * 1.4 * k * (el ? .9 : 1)], [.8 * k * cb, .52 * k, .6 * k], .4]);   // lícna kosť
            ex.push(['hdc', [HX + .5 * k, HY - 1.05 * k, z * 1.45 * k * jw], [1.1 * k, .85 * k, .5 * k], .45]);   // uhol sánky
        }
        ex.push(['hdc', [HX + 1.55 * k, HY + .78 * k, 0], [.5 * k * brow, .36 * k * brow, 1.55 * k], .35]);   // obočnicový oblúk
        const nz = [1, 1.2, .9, 1.35, 1.05, .85, 1.25, 1.1][fv], nw = orc ? 1.4 : 1;
        ex.push(['hdc', [HX + 1.85 * k, HY + .05 * k, 0], [.45 * k * nz, .95 * k, .36 * k], .3], ['hdc', [HX + 2.15 * k, HY - .55 * k, 0], [.5 * k * nz, .4 * k, .5 * k * nw], .3]);   // koreň a špička nosa
        for (const z of [-1, 1]) ex.push(['hdc', [HX + 1.9 * k, HY - .65 * k, z * .45 * k * nw], [.4 * k, .32 * k, .28 * k], .25]);   // nosové krídla
        if (!el && !orc) for (const z of [-1, 1]) ex.push(['hdc', [HX - .15, HY - .05 * k, z * 2.0 * k], [.45 * k, .85 * k, .28 * k], .25], ['hdc', [HX - .35, HY + .2 * k, z * 2.1 * k], [.3 * k, .5 * k, .2 * k], .2]);   // ušnica s chrupavkou
        const sub = []; for (const z of [-1, 1]) sub.push(['hdc', [HX + 2.4 * k, HY + .38 * k, z * .85 * k], [.55 * k, .45 * k, .55 * k], .25]);   // očné jamky: oko je zapustené, nad ním tieň viečka
        const segs = [['hdc', [HX - .2, HY, 0], [HX - .2, HY + .1, 0], 1, 1, 1]];
        const R = 3.4 * k, M = sdfMesh(segs, ex, [HX - R - .2, HY - 3.1 * k, -R], [HX + R + .4, HY + 3 * k, R], low ? .6 : .27, BN, sub);   // krok .27: ~50 ms na hlavu, výsledok sa ukladá
        HEADC.set(key, M); return M;
    }
    /** Telo koňa zo SDF: trup, hruď, zadok, krk, hlava s nozdrami, nohy s kĺbmi. */
    function horseSDF(key, BN, up, lo) {
        if (SDFC.has(key)) return SDFC.get(key);
        const J = b => { const e = BN.rest[b].elements; return [e[12], e[13], e[14]]; }, add = (a, d) => [a[0] + d[0], a[1] + d[1], a[2] + d[2]];
        const mb = J('mb'), nk = J('nk'), hd = J('hd'), tl = J('tl'), segs = [], ex = [];
        ex.push(['mb', mb, [11.2, 4.8, 4.2], 1.6], ['mb', add(mb, [6.4, .4, 0]), [4.8, 5, 4.2], 1.4], ['mb', add(mb, [-6.8, .7, 0]), [5, 5.1, 4.4], 1.4], ['mb', add(mb, [0, -2.3, 0]), [8.4, 2.8, 3.4], 1.2]);
        segs.push(['nk', add(nk, [-1.2, -.6, 0]), add(hd, [-.2, .2, 0]), 2.6, 1.6, 1.4], ['hd', add(hd, [-.2, .4, 0]), add(hd, [4.6, -2.8, 0]), 1.6, 1.05, .8], ['tl', add(tl, [1.6, 0, 0]), tl, 1.1, .6, .6]);
        ex.push(['hd', add(hd, [4.9, -2.7, 0]), [1.2, .95, 1.15], .6]);
        for (const L of ['FR', 'FL', 'BR', 'BL']) { const A = J(L), K = J(L + 'k'), Ft = add(K, [0, -lo + .6, 0]); segs.push([L, add(A, [0, 1.4, 0]), K, 1.75, 1.0, 1.0], [L + 'k', K, Ft, .82, .66, .4]); ex.push([L + 'k', add(K, [0, -.2, 0]), [.95, 1.1, .95], .4]); }
        const M = sdfMesh(segs, ex, [-20, 0, -7], [23, mb[1] + 21, 7], .45, BN);
        SDFC.set(key, M); return M;
    }
    /** Materiál prostredia (hradby, skaly, trosky): Standard s plochým tieňovaním, na nízkej kvalite Lambert. */
    const mat = k => MAT[k + QN()] || (MAT[k + QN()] = k === 'glow' ? new (T().MeshBasicMaterial)({ vertexColors: true })
        : QN() === 0 ? new (T().MeshLambertMaterial)({ vertexColors: true, flatShading: true, side: k === 'vs' ? T().DoubleSide : T().FrontSide })
        : new (T().MeshStandardMaterial)({ vertexColors: true, flatShading: true, roughness: .88, metalness: 0, envMapIntensity: .5, side: k === 'vs' ? T().DoubleSide : T().FrontSide }));
    const chrMats = () => [B3G.chrMat('c'), B3G.chrMat('m'), B3G.chrMat('t', null, atlas().tex)];
    /** Krídlo: koreň v počiatku, rozpätie do +Z (druhé krídlo sa zrkadlí scale.z = -1). */
    function wingGeo(len, c1, c2) {
        const t = T(), a = C(c1), b = C(c2).clone().lerp(C('#ffffff'), .12), P = [], Cl = [], L = len;
        const tri = (p, q, r, c) => { P.push(...p, ...q, ...r); for (let k = 0; k < 3; k++) Cl.push(c.r, c.g, c.b); P.push(...p, ...r, ...q); for (let k = 0; k < 3; k++) Cl.push(c.r, c.g, c.b); };   // oba smery: osvetlená je aj spodná strana
        const add = (u, v) => [u[0] + v[0], u[1] + v[1], u[2] + v[2]], mid = (u, v, k = .5) => [u[0] + (v[0] - u[0]) * k, u[1] + (v[1] - u[1]) * k, u[2] + (v[2] - u[2]) * k];
        const S = [0, 0, 0], E = [-L * .08, L * .2, L * .38], W = [-L * .12, L * .3, L * .62], F = [[-L * .05, L * .26, L], [-L * .3, L * .1, L * .95], [-L * .5, -L * .02, L * .76], [-L * .58, -L * .07, L * .48]], B = [-L * .55, 0, L * .12];
        const bone = (u, v, w, c) => { const o = [0, w, 0], n = [0, 0, w * .6]; tri(add(u, [0, -w, 0]), add(u, o), v, c); tri(add(u, [0, 0, -w * .6]), add(u, n), v, c); };
        tri(S, E, W, b); tri(S, W, F[3], b); tri(S, F[3], B, b);
        const ms = []; for (let k = 0; k < 3; k++) ms.push(mid(mid(F[k], F[k + 1]), W, .16));   // vykrojený zadný okraj
        for (let k = 0; k < 3; k++) { tri(W, F[k], ms[k], b); tri(W, ms[k], F[k + 1], b); }
        bone(S, E, L * .035, a); bone(E, W, L * .03, a); for (const f of F) bone(W, f, L * .022, a);
        bone(S, F[3], L * .016, a);
        for (let k = 0; k < 2; k++) tri(add(F[0], [0, 0, L * .01]), add(F[0], [-L * .02, 0, -L * .06]), add(F[0], [L * .01, L * .02, -L * .03]), a);   // pazúr na vrchole
        const g = new t.BufferGeometry(); g.setAttribute('position', new t.Float32BufferAttribute(P, 3)); g.setAttribute('color', new t.Float32BufferAttribute(Cl, 3)); g.computeVertexNormals();
        return g;
    }
    const shadowsOn = () => QN() >= 1;
    const mesh = (geo, m = 'v') => { const x = new (T().Mesh)(geo, mat(m)); x.castShadow = x.receiveShadow = shadowsOn(); return x; };
    const sh = (hex, k) => { const c = C(hex); c.multiplyScalar(k); return '#' + c.getHexString(); };
    /** Je farba kovová? (sivá, nie tmavá) – podľa nej dostane diel lesk a odraz. */
    const metalish = hex => { if (!hex) return false; const c = C(hex), hsl = {}; c.getHSL(hsl); return hsl.s < .2 && hsl.l > .2 && hsl.l < .85; };

    // ---------- výška terénu (hradby a rebríky sú tiež „terén“, aby obrancovia stáli hore) ----------
    let CREEK = 0, creekM = null; const creekX = y => 330 + Math.sin(y * .008) * 80 + y * .22;
    const creekD = (x, y) => CREEK ? Math.abs(x - creekX(y)) : 1e9;
    /** Ročné obdobie z hry (0 jar, 1 leto, 2 jeseň, 3 zima). */
    const seas = () => (typeof season === 'function' && G ? season() : 1);
    function heightAt(x, y, mesh) {
        const F = FIELD || {};
        let h = Math.sin(x * .011) * 2.2 + Math.cos(y * .013 + x * .004) * 2 + Math.sin((x + y) * .027) * .8;
        if (F.hill) h += 46 * Math.exp(-Math.pow((x - BW * .62) / 170, 2) - Math.pow((y - BH * .5) / 120, 2)) * (F.mountain ? 1.3 : 1);
        if (F.river) { const d = Math.abs(x - riverX()); if (d < 46) h -= (y > fordY()[0] && y < fordY()[1] ? 4 : 11) * Math.cos(d / 46 * Math.PI / 2); }
        if (!SGB || x < 900) h += (Math.abs(Math.sin(x * .029 + Math.sin(y * .017) * 2.1)) - .55) * 1.6 + (Math.abs(Math.sin(y * .041 - x * .013)) - .5) * .9;   // ryhy a zvlnenie (erózia)
        if (CREEK) { const d = Math.abs(x - creekX(y)); if (d < 22) h = h + (-8 - Math.cos(d / 22 * Math.PI / 2) * 1.2 - h) * Math.pow(Math.cos(d / 22 * Math.PI / 2), .7); }   // koryto potoka
        if (SGB) {
            if (x > 990) h = Math.min(h, 2) * .2;   // pred hradbami a na nádvorí je rovina
            const WALL = 40, gate = y > 440 && y < 520;
            if (mesh) { if (x > 1001 && x < 1047 && !gate) h = WALL; return h; }   // mriežka terénu: svah ostane skrytý vnútri múru
            if (x >= 1000 && x <= 1048 && !gate) h = WALL;                               // ochodza hradieb
            const ramp = (x0, x1) => Math.max(0, Math.min(1, (x - x0) / (x1 - x0))) * WALL;
            const off = SGB.ladOff || [0, 0];
            if (SGB.lad && x > 960 && x < 1000) [250, 710].forEach((l, i) => { if (Math.abs(y - l) < 18 && !(off[i] > 0)) h = Math.max(h, ramp(965, 1000)); });   // rebríky
            if (SGB.tow && x > 925 && x < 1000 && Math.abs(y - 610) < 30 && (U && U[0] && (U[0].tt || 0) > 320)) h = Math.max(h, ramp(930, 990));   // obliehacia veža
        }
        return h;
    }

    // ---------- kraj, denná doba, farby ----------
    function biome() {
        const b = biome0(), se = seas();
        if ((BI || 'g') === 'g') {
            if (se === 0) { b.g1 = '#4e7a2e'; b.g2 = '#76a040'; b.tip = '#b8d070'; b.flowers = [...b.flowers, '#ffd0e0', '#f8f080', '#a0c0ff']; }
            if (se === 2) { b.g1 = '#6a6a30'; b.g2 = '#8a7a3a'; b.grass = ['#6a6a2c', '#7a7030', '#8a7a34', '#5e6428']; b.tip = '#d0a858'; b.flowers = []; }
            if (se === 3) { b.g1 = '#5a6650'; b.g2 = '#6e7a62'; b.grass = ['#5a6450', '#66705a', '#4e5848']; b.tip = '#e4ecee'; b.flowers = []; }   // zima: námraza na končekoch
        }
        return b;
    }
    function biome0() {
        return {
            g: { g1: '#4a6a2c', g2: '#6a8a3a', dirt: '#6a5a3e', mud: '#3e3020', rock: '#7a7468', grass: ['#3e5a26', '#4a662c', '#566e30', '#5e7434', '#46602a'], tip: '#98a858', flowers: ['#f0e060', '#ffffff', '#c070e0', '#e04040', '#f0a030'], gd: 1, sky: { zen: '#3a6ab0', hor: '#b8d0e4', gnd: '#5a6a4a' } },
            a: { g1: '#4e423a', g2: '#62514a', dirt: '#3a2e28', mud: '#2a201a', rock: '#55504c', grass: ['#3a3428'], tip: '#4a4030', flowers: [], gd: 0, sky: { zen: '#5a3428', hor: '#b87050', gnd: '#3a2a22' } },
            d: { g1: '#b09868', g2: '#c8b080', dirt: '#9a8058', mud: '#6a5438', rock: '#a08868', grass: ['#a89058', '#b8a068', '#9a8850'], tip: '#e0d098', flowers: [], gd: .35, sky: { zen: '#4a80c0', hor: '#e8dcc0', gnd: '#a89070' } },
            s: { g1: '#dde4ea', g2: '#c8d2da', dirt: '#8a8a8a', mud: '#6a665e', rock: '#8a8e94', grass: ['#8a9a7a', '#a8b098'], tip: '#eef2f4', flowers: [], gd: .25, sky: { zen: '#5a80b0', hor: '#d8e2ea', gnd: '#c8d2da' } }
        }[{ g: 'g', a: 'a', d: 'd', s: 's' }[BI] || 'g'];
    }
    /** Slnko podľa dennej doby v hre (dayT): výška, smer, farba; noc, súmrak. */
    function dayLight() {
        const ph = (typeof dayT !== 'undefined' ? dayT : 0) / (typeof DAY_LEN !== 'undefined' ? DAY_LEN : 600), el = Math.cos(ph * 6.283), night = !!WX.night;
        const e = night ? .35 : Math.max(.12, el), az = -2.3 + ph * 1.2;   // výška slnka (v noci mesiac)
        const dir = new (T().Vector3)(Math.cos(az) * Math.cos(Math.asin(Math.min(.95, e))), Math.min(.95, e), Math.sin(az) * Math.cos(Math.asin(Math.min(.95, e)))).normalize();
        const low = night ? 0 : 1 - Math.min(1, e / .45);   // súmrak: nízke teplé slnko
        return { dir, night, low, e };
    }
    /** Farebné ladenie podľa krajiny (najbližší hrad) a počasia. */
    function gradeFor() {
        let f = -1, bd = 1e9; if (typeof TW !== 'undefined' && G) for (const t of TW) { const d = Math.hypot(t.x - G.x, t.y - G.y); if (d < bd) { bd = d; f = t.f; } }
        const P = { 0: [[0, 0, .01], [.97, 1, 1.05], .95, 1.04], 1: [[.01, .005, 0], [1.06, 1.02, .9], 1.1, 1.05], 2: [[.02, 0, 0], [1.12, .95, .88], .92, 1.04], 3: [[0, 0, 0], [.98, .98, .96], .78, 1.1],
            4: [[.01, .005, 0], [1.1, 1, .82], 1.08, 1.05], 5: [[0, 0, .01], [.95, .98, 1.08], 1, 1.04], 7: [[.01, 0, 0], [1.08, .98, .86], .92, 1.06], 8: [[0, .01, 0], [1.04, 1.06, .92], 1.06, 1] }[f] || [[0, 0, 0], [1, 1, 1], 1.05, 1.04];
        let [lift, gain, sat, con] = P, bloom = f === 8 ? .75 : .45;
        if (WX.night) { gain = gain.map((v, i) => v * [.9, .96, 1.12][i]); sat *= .78; bloom += .25; }
        if (WX.n === 'fog') sat *= .78; if (WX.n === 'storm' || WX.n === 'rain') { sat *= .85; gain = gain.map((v, i) => v * [.95, .97, 1.02][i]); }
        return { lift, gain, sat, con, bloom };
    }

    // ---------- svet ----------
    function buildWorld() {
        const t = T(), DL = dayLight(), night = DL.night, q = QN(), storm = WX.n === 'storm' || WX.n === 'rain', fog = WX.n === 'fog';
        CREEK = !(FIELD && FIELD.river) && !SGB && (BI || 'g') === 'g' && ((((G && G.x) || 0) * 7 + ((G && G.y) || 0) * 3) | 0) % 5 < 3 ? 1 : 0;   // potok cez bojisko (nie vždy)
        const B = biome();
        scene = new t.Scene(); sunDir = DL.dir;
        // obloha: farby podľa kraja, dennej doby a počasia
        const zen = C(night ? '#050914' : B.sky.zen).lerp(C('#3a3040'), DL.low * .5), hor = C(night ? '#141c30' : B.sky.hor).lerp(C('#f0a060'), DL.low * .7), zen0 = zen.clone(), hor0 = hor.clone();
        if (storm) { zen.lerp(C('#3a4048'), .75); hor.lerp(C('#6a7078'), .7); } if (fog) { zen.lerp(C('#a8b0b4'), .7); hor.lerp(C('#c8ccd0'), .8); }
        const sunC = night ? C('#9aaad8') : C('#fff2d8').lerp(C('#ff9a50'), DL.low);
        skyM = B3G.sky({ zen, hor, gnd: B.sky.gnd, sunDir: DL.dir, sunC, cloud: storm ? .85 : fog ? .9 : BI === 'a' ? .7 : .42, cloudC: night ? '#1a2030' : storm ? '#5a6068' : BI === 'a' ? '#4a2a22' : '#f4f2ee', night: night ? 1 : 0, vol: q >= 2 });
        if (q >= 1) scene.add(skyM); else scene.background = hor.clone();
        const fogC = hor.clone().lerp(zen, .15);
        scene.fog = new t.Fog(fogC, fog ? 50 : night ? 130 : 420, fog ? 430 : night ? 700 : 1700);
        if (q >= 1) { try { scene.environment = B3G.envFrom(R, skyM); } catch (e) { } }
        const cloud0 = BI === 'a' ? .7 : .42;
        wxB = { zen: zen0, hor: hor0, sZen: C(night ? '#0a0c12' : '#3a4048'), sHor: C(night ? '#1a1e26' : '#6a7078'), fZen: C(night ? '#20242c' : '#a8b0b4'), fHor: C(night ? '#2a2e36' : '#c8ccd0'), cloud: cloud0, cloudC: C(night ? '#1a2030' : BI === 'a' ? '#4a2a22' : '#f4f2ee'), sCloud: C(night ? '#1a2030' : '#5a6068'),
            sunI: night ? 1.5 : 1.35 + (1 - DL.low) * .4, hemiI: night ? 2.4 : .85, fogN: night ? 130 : 420, fogF: night ? 700 : 1700, fogC: hor0.clone().lerp(zen0, .15), wet: 0 };
        wxS = null; bolt = null; nextBolt = 200;
        hemi = new t.HemisphereLight(night ? C('#5a6aa0') : hor.clone().lerp(C('#ffffff'), .5), C(night ? '#202030' : BI === 's' ? '#d8e0e6' : BI === 'd' ? '#c8a878' : BI === 'a' ? '#4a3a32' : B.g2).lerp(C('#808080'), BI === 's' ? .05 : .2), night ? 2.4 : storm ? 1.1 : BI === 's' ? 1.05 : .85); scene.add(hemi);   // svetlo odrazené od zeme: v tráve zelenkasté, v snehu jasné, na púšti piesočné
        sun = new t.DirectionalLight(sunC, night ? 1.5 : storm ? .6 : fog ? .65 : 1.35 + (1 - DL.low) * .4);
        sun.castShadow = shadowsOn();
        if (sun.castShadow) { const s = sun.shadow, ms = [1024, 1024, 2048, 4096][q]; s.mapSize.set(ms, ms); const sx = [280, 280, 400, 560][q]; s.camera.left = -sx; s.camera.right = sx; s.camera.top = sx; s.camera.bottom = -sx; /* na vysokej a ultra tiene pokryjú veľkú časť bojiska */ s.camera.near = 10; s.camera.far = 1200; s.bias = -.0012; s.normalBias = 1.1; }
        scene.add(sun); scene.add(sun.target);
        B3G.U_WET.value = storm ? 1 : 0; B3G.U_SNOW.value = WX.n === 'snow' ? .25 : 0;
        B3G.U_MUD().set(BI === 's' ? '#6a6660' : BI === 'd' ? '#9a8058' : B.mud); DIRT_K = BI === 's' ? .7 : BI === 'd' ? .85 : 1;
        FAR = new Map(); REG = new Map(); RAGS = []; smokeSh = null; fireL = null; ORDK = null; CINE = 0; M0 = new t.Matrix4(); M1 = new t.Matrix4(); arTr = null; puddleM = null; roofs = []; roofL = []; loose = []; pano = null; AQ.lvl = 0; AQ.t0 = 0; AQ.n = 0;
        grade = gradeFor();
        // cesta: krivka cez bojisko (pri obliehaní k bráne)
        const road = []; for (let i = 0; i <= 40; i++) { const x = i / 40 * (SGB ? 1000 : BW); road.push([x, SGB ? 480 + Math.sin(x * .006) * 30 * (1 - x / 1000) : BH * .8 + Math.sin(x * .005 + 1) * 40]); }
        const roadD = (x, y) => { let m = 1e9; for (let i = 0; i < road.length - 1; i++) { const [ax, ay] = road[i], [bx, by] = road[i + 1], dx = bx - ax, dy = by - ay, k = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy))); m = Math.min(m, Math.hypot(x - ax - dx * k, y - ay - dy * k)); } return m; };
        // stromy (najprv miesta, aby terén pod nimi stmavol)
        let seed = 11 + Math.floor((FIELD && FIELD.forest || 0) * 97); const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
        const spots = treeSpots(rnd, roadD);
        obsSet(spots.map(q => [q[0], q[1], 2.4 * q[2], 26 * q[2]]));   // simulácia: kmene presne tam, kde stoja stromy (js/sim/field.js)
        // terén: mriežka s výškou a farbami vrcholov (kraj, škvrny, cesta, breh, zatienenie pod stromami)
        const NX = 144, NY = 96, pos = [], col = [], idx = [];
        const cell = new Map(); for (const s of spots) { const k = Math.floor(s[0] / 40) + ',' + Math.floor(s[1] / 40); (cell.get(k) || cell.set(k, []).get(k)).push(s); }
        const near = (x, y) => { let o = 0; const cx = Math.floor(x / 40), cy = Math.floor(y / 40); for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const s of cell.get((cx + i) + ',' + (cy + j)) || []) o += Math.max(0, 1 - Math.hypot(s[0] - x, s[1] - y) / (18 * s[2])); return Math.min(1, o); };
        for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) {
            const x = i / NX * BW, y = j / NY * BH, h = heightAt(x, y, 1);
            pos.push(x, h, y);
            let c = C(B.g1).lerp(C(B.g2), .5 + .5 * Math.sin(x * .02 + y * .031) * Math.cos(y * .017));
            c.multiplyScalar(.9 + rnd() * .14);
            if (!SGB || x < 960) { const n1 = Math.sin(x * .045 + Math.sin(y * .03) * 2) * Math.sin(y * .052 + 1.3), n2 = Math.sin(x * .011 + 2) * Math.cos(y * .014);   // veľké škvrny: vyschnutá tráva, machová zeleň, svetlé lúky
                if (BI === 'g') { if (n1 > .35) c.lerp(C('#a89c58'), (n1 - .35) * .5); else if (n1 < -.4) c.lerp(C('#2e5a2a'), (-.4 - n1) * .55); if (n2 > .4) c.multiplyScalar(1.1); }
                else c.multiplyScalar(.94 + .12 * n1); }
            const rd = roadD(x, y); if (rd < 16) c.lerp(C(B.dirt), (1 - rd / 16) * .85);
            if (SGB && x > 1000) c = C('#8a8478').multiplyScalar(.85 + rnd() * .2);
            if (FIELD && FIELD.river && Math.abs(x - riverX()) < 54) c.lerp(C(B.dirt).multiplyScalar(.8), Math.min(1, (54 - Math.abs(x - riverX())) / 14) * .7);
            c.multiplyScalar(1 - near(x, y) * .35);   // zatienenie pod korunami
            if (SGB && x > 980 && x < 1000) c.multiplyScalar(.75);
            col.push(c.r, c.g, c.b);
        }
        for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + 1, c2 = a + NX + 1, d = c2 + 1; idx.push(a, c2, b, b, c2, d); }
        const g = new t.BufferGeometry(); g.setAttribute('position', new t.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new t.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
        // mapa blata a spáleniny (dupot, oheň) a mapa výšky a hustoty trávy pre trávu a vodu
        trData = new Uint8Array(192 * 128 * 4); trTex = new t.DataTexture(trData, 192, 128, t.RGBAFormat); trTex.magFilter = trTex.minFilter = t.LinearFilter; trTex.needsUpdate = true;
        const HD = new Float32Array(289 * 193 * 4);
        for (let j = 0; j < 193; j++) for (let i = 0; i < 289; i++) {
            const x = i * 5, y = j * 5, k = (j * 289 + i) * 4, rd = roadD(x, y);
            HD[k] = heightAt(x, y, 1);
            let gd = B.gd * Math.min(1, Math.max(0, (rd - 12) / 8));
            if (FIELD && FIELD.river && Math.abs(x - riverX()) < 60) gd = 0;
            if (creekD(x, y) < 16) gd = 0;
            if (SGB && x > 940) gd = 0;
            if (HD[k] > 25) gd *= .3;
            HD[k + 1] = gd * (.75 + .5 * Math.sin(x * .03 + y * .021) * Math.cos(y * .04));
        }
        hdData = HD; hTex = new t.DataTexture(HD, 289, 193, t.RGBAFormat, t.FloatType); hTex.magFilter = hTex.minFilter = t.NearestFilter; hTex.needsUpdate = true;
        terrain = new t.Mesh(g, B3G.terrainMat(trTex, B)); terrain.receiveShadow = true; scene.add(terrain);
        const fs = new t.Shape([new t.Vector2(-2500, -2500), new t.Vector2(BW + 2500, -2500), new t.Vector2(BW + 2500, BH + 2500), new t.Vector2(-2500, BH + 2500)]); fs.holes.push(new t.Path([new t.Vector2(4, 4), new t.Vector2(4, BH - 4), new t.Vector2(BW - 4, BH - 4), new t.Vector2(BW - 4, 4)]));
        const far = new t.Mesh(new t.ShapeGeometry(fs).rotateX(Math.PI / 2), new t.MeshLambertMaterial({ color: C(B.g1).multiplyScalar(.85), side: t.DoubleSide })); far.position.y = -1; scene.add(far);   // okolie bojiska až po hmlu (s otvorom pre terén)
        if (CREEK) { creekM = B3G.water(hTex, 180, 760, -6.6, { hor: hor.getStyle(), zen: zen.getStyle(), deep: '#3a5a52' }); creekM.material.uniforms.uSunDir.value.copy(DL.dir); creekM.material.uniforms.uSunC.value.copy(sunC); scene.add(creekM); } else creekM = null;
        if (FIELD && FIELD.river) { waterM = B3G.water(hTex, riverX() - 60, riverX() + 60, -4.5, { hor: hor.getStyle(), zen: zen.getStyle() }); waterM.material.uniforms.uSunDir.value.copy(DL.dir); waterM.material.uniforms.uSunC.value.copy(sunC); scene.add(waterM); }
        if (q >= 1 && B.gd > 0) { grassM = B3G.grass(hTex, B, [0, 9000, 20000, 42000][q]); grassM.material.uniforms.uSunC.value.copy(sunC).multiplyScalar(night ? .35 : .9); grassM.material.uniforms.uAmb.value.copy(hemi.color).multiplyScalar(night ? .3 : .55); grassM.userData.n0 = grassM.geometry.instanceCount; grassM.material.uniforms.tTr.value = trTex; scene.add(grassM); }
        buildFlora(rnd, B, spots, road, roadD); buildProps(rnd, B, roadD);
        if (SGB) buildSiege();
        // kaluže: v daždi sa naplnia (odraz oblohy, krúžky od kvapiek), v suchu sú neviditeľné
        if (q >= 1 && !['s', 'd', 'a'].includes(BI)) { const pm = puddleM = B3G.puddleMat({ hor: hor0.getStyle(), zen: zen0.getStyle() }); for (let i = 0; i < 26; i++) { const x = rnd() * (SGB ? 960 : BW), y = rnd() * BH; if (FIELD && FIELD.river && Math.abs(x - riverX()) < 70) continue; const p = new t.Mesh(new t.CircleGeometry(6 + rnd() * 10, 16), pm); p.rotation.x = -Math.PI / 2; p.scale.y = .5 + rnd() * .6; p.position.set(x, heightAt(x, y) + .35, y); p.renderOrder = 2; scene.add(p); } }
        buildPanorama(B, fogC, night); buildPrints(B); buildBirds(); buildAtmo(rnd, B, DL, night, storm, fog, sunC, fogC);
        // počasie: dážď (čiarky, hustota podľa meniaceho sa počasia), sneh, popol okolo kamery
        wx = null; rainN = 0; if (!['snow', 'ash'].includes(WX.n)) makeRain();
        if (['snow', 'ash'].includes(WX.n) && q >= 1) {
            const rain = WX.n === 'rain' || WX.n === 'storm', n = WX.n === 'storm' ? 2600 : rain ? 1600 : 1400, p = new Float32Array(n * (rain ? 6 : 3));
            for (let i = 0; i < n; i++) { const x = (Math.random() - .5) * 600, y = Math.random() * 260, z = (Math.random() - .5) * 600; if (rain) p.set([x, y, z, x - 1.2, y + 7, z - .4], i * 6); else p.set([x, y, z], i * 3); }
            const gg = new t.BufferGeometry(); gg.setAttribute('position', new t.BufferAttribute(p, 3));
            wx = rain ? new t.LineSegments(gg, new t.LineBasicMaterial({ color: C('#b4c4dc'), transparent: true, opacity: .45 })) : new t.Points(gg, new t.PointsMaterial({ color: C(WX.n === 'snow' ? '#ffffff' : '#5a4a42'), size: WX.n === 'snow' ? 1.6 : 1.2, transparent: true, opacity: .85 }));
            wx.userData.rain = rain; wx.frustumCulled = false; scene.add(wx);
        }
        // iskry, krv, prach (častice zo simulácie PT)
        ptsPos = new Float32Array(900 * 3); ptsCol = new Float32Array(900 * 3);
        const pg = new t.BufferGeometry(); pg.setAttribute('position', new t.BufferAttribute(ptsPos, 3)); pg.setAttribute('color', new t.BufferAttribute(ptsCol, 3));
        pts = new t.Points(pg, new t.PointsMaterial({ size: 2.4, vertexColors: true })); pts.frustumCulled = false; scene.add(pts);
        // prekryv na zemi: oblúky úderov, nápriahy, ohlásené útoky bossov, kryt, veliteľ
        ovPos = new Float32Array(12000 * 3); ovCol = new Float32Array(12000 * 3);
        const og = new t.BufferGeometry(); og.setAttribute('position', new t.BufferAttribute(ovPos, 3)); og.setAttribute('color', new t.BufferAttribute(ovCol, 3));
        overlay = new t.Mesh(og, new t.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .5, depthWrite: false, side: t.DoubleSide })); overlay.frustumCulled = false; overlay.renderOrder = 5; scene.add(overlay);
        // mäkké tiene pod vojakmi (dojem zatienenia pri zemi)
        if (q >= 1) { blobs = new t.InstancedMesh(new t.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new t.MeshBasicMaterial({ color: 0x000000, alphaMap: B3G.softTex(), transparent: true, opacity: .42, depthWrite: false }), 700); blobs.count = 0; blobs.renderOrder = 3; blobs.frustumCulled = false; scene.add(blobs); }
        FIRE = Psys(2400, true); DUST = Psys(1600, false); debris = []; rocks = []; fxState = {}; fires = []; trails = []; braziers = [];
        // záblesky svetla (kryt, údery) a fakle v noci
        flashL = [0, 1].map(() => { const l = new t.PointLight(C('#ffd080'), 0, 120, 1); scene.add(l); return l; });
        torches = [];
        if (night) for (let i = 0; i < 5; i++) { const l = new t.PointLight(C('#ffa040'), 14, 220, 1); scene.add(l); torches.push(l); }
        if (q >= 3) { fireL = new t.PointLight(C('#ff9a40'), 0, 220, 1); fireL.castShadow = true; fireL.shadow.mapSize.set(256, 256); fireL.shadow.bias = -.004; fireL.shadow.autoUpdate = false; scene.add(fireL); }   // svetlo ohňa s tieňom (vytvorené vopred, aby sa shadery neprekladali v boji)
    }
    // ---------- atmosféra: nízka hmla nad zemou, lúče slnka a padajúce lístie/lupene ----------
    let mistL = [], shaftL = [], leafP = null;
    function buildAtmo(rnd, B, DL, night, storm, fog, sunC, fogC) {
        mistL = []; shaftL = []; leafP = null;
        const t = T(), q = QN(); if (q < 1) return;
        const mk = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); fn(x, w, h); const tx = new t.CanvasTexture(c); return tx; };
        // hmla: mäkké pásy tesne nad zemou, hustejšie pri vode, za úsvitu a po daždi
        const mt = mk(128, 128, (x, w, h) => { const g = x.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(.5, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
        const base = night ? .22 : fog ? .0 : storm ? .12 : .1 + DL.low * .22, n = fog ? 0 : q >= 2 ? 16 : 8;
        for (let i = 0; i < n; i++) {
            let x = 120 + rnd() * (BW - 240), y = 60 + rnd() * (BH - 120);
            if (i % 3 === 0) { if (CREEK) { y = 60 + rnd() * (BH - 120); x = creekX(y) + (rnd() - .5) * 30; } else if (FIELD && FIELD.river) x = riverX() + (rnd() - .5) * 120; }
            if (SGB && x > 930) continue;
            const m = new t.Mesh(new t.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new t.MeshBasicMaterial({ map: mt, color: fogC.clone().lerp(C('#ffffff'), .3), transparent: true, opacity: base * (.6 + rnd() * .6), depthWrite: false, fog: false }));
            const w = 160 + rnd() * 220; m.scale.set(w, 1, w * (.4 + rnd() * .3)); m.rotation.y = rnd() * 6.28; m.position.set(x, heightAt(x, y) + 3 + rnd() * 5, y); m.renderOrder = 4; m.frustumCulled = false; scene.add(m); mistL.push({ m, v: (rnd() - .5) * .05, o: m.material.opacity, ph: rnd() * 6 });
        }
        // lúče slnka: pretiahnuté žiarivé pásy v smere slnka (cez koruny stromov); len cez deň a pri jasnom nebi
        if (!night && !storm && !fog && q >= 2 && DL.e > .12) {
            const st = mk(32, 128, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(.3, 'rgba(255,240,200,.8)'); g.addColorStop(1, 'rgba(255,240,200,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); const gx = x.createLinearGradient(0, 0, w, 0); gx.addColorStop(0, 'rgba(0,0,0,1)'); gx.addColorStop(.5, 'rgba(0,0,0,0)'); gx.addColorStop(1, 'rgba(0,0,0,1)'); x.globalCompositeOperation = 'destination-out'; x.fillStyle = gx; x.fillRect(0, 0, w, h); });
            const up = new t.Vector3(0, 1, 0), dir = DL.dir.clone().normalize();
            for (let i = 0; i < 9; i++) {
                const x = 150 + rnd() * (BW - 300), y = 80 + rnd() * (BH - 160); if ((FIELD && FIELD.river && Math.abs(x - riverX()) < 60) || (SGB && x > 900)) continue;
                const g = new t.Group(), L = 150 + rnd() * 90; for (const a of [0, Math.PI / 2]) { const pl = new t.Mesh(new t.PlaneGeometry(14 + rnd() * 10, L), new t.MeshBasicMaterial({ map: st, color: sunC, transparent: true, opacity: .09 + rnd() * .05, blending: t.AdditiveBlending, depthWrite: false, side: t.DoubleSide, fog: false })); pl.rotation.y = a; g.add(pl); }
                g.quaternion.setFromUnitVectors(up, dir); g.position.set(x, heightAt(x, y) + L * .5 * dir.y, y).addScaledVector(dir, 0); g.renderOrder = 4; g.frustumCulled = false; scene.add(g); shaftL.push({ g, o: g.children.map(c => c.material.opacity), ph: rnd() * 6 });
            }
        }
        // padajúce lístie (jeseň) a lupene (jar) okolo kamery
        const se = seas(); if (!storm && WX.n !== 'snow' && WX.n !== 'ash' && (se === 0 || se === 2) && BI === 'g') {
            const N = q >= 2 ? 260 : 120, p = new Float32Array(N * 3), c = new Float32Array(N * 3), pal = se === 2 ? ['#c8742a', '#d8a030', '#a84a22', '#b89a2a'] : ['#f4f0e8', '#f0c8d8', '#f8e0e8'];
            for (let i = 0; i < N; i++) { p.set([(Math.random() - .5) * 420, Math.random() * 90, (Math.random() - .5) * 420], i * 3); const k = C(pal[i % pal.length]); c.set([k.r, k.g, k.b], i * 3); }
            const gg = new t.BufferGeometry(); gg.setAttribute('position', new t.BufferAttribute(p, 3)); gg.setAttribute('color', new t.BufferAttribute(c, 3));
            const rd = mk(16, 16, (x, w, h) => { x.fillStyle = '#fff'; x.beginPath(); x.ellipse(8, 8, 7, 4, .6, 0, 6.3); x.fill(); });   // drobný oválny lístok namiesto štvorčeka
            leafP = new t.Points(gg, new t.PointsMaterial({ size: 1.5, map: rd, vertexColors: true, transparent: true, alphaTest: .3, opacity: .9, depthWrite: false })); leafP.frustumCulled = false; scene.add(leafP);
        }
    }
    function stepAtmo(dt) {
        for (const m of mistL) { m.m.position.x += m.v * dt; if (m.m.position.x < 40 || m.m.position.x > BW - 40) m.v = -m.v; m.m.material.opacity = m.o * (.8 + .2 * Math.sin(clock * .15 + m.ph)); }
        for (const s of shaftL) s.g.children.forEach((c, i) => { c.material.opacity = s.o[i] * (.75 + .25 * Math.sin(clock * .3 + s.ph + i)); });
        if (leafP && cam) { leafP.position.set(cam.position.x, 0, cam.position.z); const p = leafP.geometry.attributes.position; for (let i = 0; i < p.count; i++) { let y = p.getY(i) - .35 * dt; if (y < 0) y += 90; p.setY(i, y); p.setX(i, p.getX(i) + Math.sin(clock * 1.7 + i) * .12 * dt + .08 * dt); p.setZ(i, p.getZ(i) + Math.cos(clock * 1.3 + i * 1.7) * .1 * dt); } p.needsUpdate = true; }
    }
    // ---------- predmety na bojisku: tábory, ohne, barikády, kolíky, vozy, zrúcaniny, útesy; rozbitné ----------
    let props = [], campF = [];
    function buildProps(rnd, B, roadD) {
        props = []; campF = [];
        const t = T(), F = FIELD || {}, wood = '#6a4a2c', dark = '#3a2a1a', cloth = BI === 'a' ? '#4a3a32' : '#c8b898';
        const ok = (x, y, r = 20) => x > 10 && x < BW - 10 && y > 10 && y < BH - 10 && !(F.river && Math.abs(x - riverX()) < 70 + r) && !(SGB && x > 940) && roadD(x, y) > 18 + r * .4;
        const put = (geo, x, y, a, kind, r, o) => { const m = mesh(geo); m.position.set(x, heightAt(x, y), y); m.rotation.y = a; scene.add(m); props.push({ m, x, y, r, kind, ...(o || {}) }); return m; };
        // tábory za líniami: stany s vlajočkou, ohniská, vozy so sudmi
        const tent = c => Part().add('cone6', c, [0, 9, 0], [0, Math.PI / 6, 0], [24, 18, 20]).add('cyl6', dark, [0, 13, 0], [0, 0, 0], [.6, 26, .6]).add('box', '#2a1a10', [10.5, 4, 0], [0, 0, -.35], [.3, 8, 5]).build();
        const cart = Part().add('box', wood, [0, 6, 0], [0, 0, 0], [18, 3, 9]).add('box', sh(wood, .85), [0, 9, 4.3], [0, 0, 0], [18, 4, .6]).add('box', sh(wood, .85), [0, 9, -4.3], [0, 0, 0], [18, 4, .6])
            .add('cyl12', dark, [-5, 3.4, 5.2], [Math.PI / 2, 0, 0], [6.8, .8, 6.8]).add('cyl12', dark, [-5, 3.4, -5.2], [Math.PI / 2, 0, 0], [6.8, .8, 6.8]).add('cyl12', dark, [5, 3.4, 5.2], [Math.PI / 2, 0, 0], [6.8, .8, 6.8]).add('cyl12', dark, [5, 3.4, -5.2], [Math.PI / 2, 0, 0], [6.8, .8, 6.8])
            .add('cyl12', '#7a5230', [2, 11, 1.5], [0, 0, 0], [4, 5, 4]).add('cyl12', '#7a5230', [-3, 11, -1.5], [0, 0, 0], [4, 5, 4]).add('box', dark, [12, 5, 0], [0, 0, .3], [10, .8, .8]).build();
        const fire = Part().add('cyl6', dark, [0, 1, 0], [0, 0, 1.4], [1.4, 8, 1.4]).add('cyl6', dark, [0, 1, 0], [1.2, 0, 1.4], [1.4, 8, 1.4]).add('cyl6', dark, [0, 1, 0], [-1.2, 0, 1.4], [1.4, 8, 1.4]);
        for (let i = 0; i < 8; i++) fire.add('sph0', '#6a6660', [Math.cos(i * .785) * 5, .5, Math.sin(i * .785) * 5], [0, 0, 0], [2, 1.4, 2]);
        const fg = fire.build();
        for (const side of [0, 1]) {
            if (SGB && side) continue;
            const fc = side ? (U.find(u => u.t && u.fc != null) || {}).fc ?? 2 : G.fac, cx = side ? BW - 45 : 45;
            for (let i = 0; i < 4; i++) { const y = 140 + i * 210 + (rnd() - .5) * 60, x = cx + (rnd() - .5) * 30; if (!ok(x, y, 14)) continue; const m = put(tent(cloth), x, y, rnd() * 6, 'tent', 13, { hp: 2 }); const f = bannerMesh(fc, 5, 4); f.position.set(0, 27, 0); m.add(f); }
            for (let i = 0; i < 3; i++) { const y = 240 + i * 230 + (rnd() - .5) * 40, x = cx + (side ? -36 : 36); if (!ok(x, y, 8)) continue; put(fg, x, y, rnd() * 6, 'fire', 0); campF.push({ x, y }); }
            for (let i = 0; i < 2; i++) { const y = 80 + rnd() * (BH - 160), x = cx + (side ? -8 : 8) + (rnd() - .5) * 20; if (ok(x, y, 14)) put(cart, x, y, rnd() * 6, 'cart', 12, { hp: 3 }); }
        }
        // kozy proti jazde (barikády) a rady kolíkov pred líniou
        const bar = Part(); for (const z of [-9, 0, 9]) bar.add('cyl6', wood, [0, 4, z], [.8, 0, 0], [1.1, 14, 1.1]).add('cyl6', wood, [0, 4, z], [-.8, 0, 0], [1.1, 14, 1.1]); bar.add('cyl6', sh(wood, .8), [0, 4, 0], [Math.PI / 2, 0, 0], [1.2, 24, 1.2]);
        const bg = bar.build();
        for (let i = 0; i < 7; i++) { const x = 380 + rnd() * 680, y = 90 + rnd() * (BH - 180); if (ok(x, y, 14)) put(bg, x, y, rnd() * 3, 'bar', 11, { hp: 2 }); }
        const stake = Part().add('cyl6', wood, [0, 5, 0], [0, 0, -.55], [1, 12, 1]).add('cone6', '#8a6a4a', [-3.1, 10.2, 0], [0, 0, -.55], [1, 2.4, 1]).build();
        if (!SGB) for (let i = 0; i < 14; i++) { const x = 300 + (i % 2) * 6, y = BH / 2 - 160 + i * 23; if (ok(x, y, 4)) put(stake, x, y, Math.PI, 'stake', 6, { hp: 1 }); }
        // zrúcaniny: zlomené stĺpy a kus starého múru (kameň s kvádrami)
        if (BI !== 'd' || rnd() < .5) {
            const rx = 250 + rnd() * 900, ry = rnd() < .5 ? 60 + rnd() * 80 : BH - 140 + rnd() * 80;
            if (ok(rx, ry, 40)) { const P = Part(), st = BI === 'a' ? '#5a524c' : '#9a948a';
                for (let i = 0; i < 4; i++) { const hh = 8 + rnd() * 26; P.add('cyl12', st, [i * 14 - 20, hh / 2, (rnd() - .5) * 8], [rnd() * .1, 0, rnd() * .1], [5, hh, 5]); P.add('box', st, [i * 14 - 20 + rnd() * 6, 1, 8 + rnd() * 6], [rnd(), rnd(), rnd()], [4, 3, 6]); }
                P.add('box', st, [0, 7, -12], [0, 0, 0], [46, 14, 4]).add('box', st, [-12, 16, -12], [0, 0, 0], [20, 6, 4]);
                const m = put(P.build(), rx, ry, rnd() * 6, 'ruin', 0); if (QN() >= 1) m.material = B3G.stoneMat(); }
        }
        // kopy sena a balíky, studňa a vyhorená chatrč (len v mierne zeleni a v pustatine)
        if (!SGB && BI !== 's') {
            const hay = Part().add('cyl12', '#c8a850', [0, 3, 0], [0, 0, 0], [8, 6, 8]).add('cone', '#d8b860', [0, 9, 0], [0, 0, 0], [7, 6, 7]).add('cyl6', '#6a4a2a', [0, 11, 0], [0, 0, 0], [.4, 5, .4]).build();
            for (let i = 0; i < 4; i++) { const x = 160 + rnd() * 1000, y = 80 + rnd() * (BH - 160); if (ok(x, y, 14)) put(hay, x, y, rnd() * 6, 'hay', 7, { hp: 1 }); }
            const bale = Part().add('cyl12', '#c8a850', [0, 3, 0], [Math.PI / 2, 0, 0], [6, 9, 6]).add('torus', '#6a5a30', [0, 3, 3], [0, 0, 0], [5.6, .3, 5.6]).add('torus', '#6a5a30', [0, 3, -3], [0, 0, 0], [5.6, .3, 5.6]).build();
            for (let i = 0; i < 5; i++) { const x = 220 + rnd() * 900, y = 80 + rnd() * (BH - 160); if (ok(x, y, 10)) put(bale, x, y, rnd() * 6, 'hay', 5, { hp: 1 }); }
            const wx = 300 + rnd() * 800, wy = 120 + rnd() * (BH - 240);
            if (ok(wx, wy, 26)) { put(Part().add('cyl12', '#8a847a', [0, 3, 0], [0, 0, 0], [8, 6, 8]).add('cyl12', '#1a2a30', [0, 6.1, 0], [0, 0, 0], [6, .2, 6]).add('box', wood, [-4.2, 9, 0], [0, 0, 0], [1, 12, 1]).add('box', wood, [4.2, 9, 0], [0, 0, 0], [1, 12, 1]).add('box', wood, [0, 15, 0], [0, 0, 0], [10, 1, 1]).add('cone6', '#6a4a2c', [0, 17.5, 0], [0, Math.PI / 2, 0], [8, 4.5, 11]).build(), wx, wy, rnd() * 6, 'well', 0);
                if (rnd() < .7) { const hx = wx + 48, hy = wy + (rnd() - .5) * 40; if (ok(hx, hy, 30)) { const hu = Part().add('box', '#5a4a3a', [0, 6, 0], [0, 0, 0], [24, 12, 18]).add('box', '#2a2220', [0, 13, 0], [0, 0, .5], [16, 1.4, 22]).add('box', '#2a2220', [0, 13, 0], [0, 0, -.5], [16, 1.4, 22]).add('box', '#1a1410', [12.2, 5, 0], [0, 0, 0], [.4, 8, 5]).add('cyl6', '#2a1a10', [-6, 14, 5], [0, 0, .3], [.9, 8, .9]).add('cyl6', '#2a1a10', [5, 15, -4], [0, 0, -.4], [.9, 7, .9]).build(); put(hu, hx, hy, rnd() * 6, 'hut', 14, { hp: 3 }); } } }
        }
        // útesy a skalné steny za okrajom bojiska
        const cliff = Part(); for (let i = 0; i < 5; i++) cliff.add('sph0', B.rock, [i * 26 - 52, 14 + (i % 2) * 10, 0], [rnd(), rnd(), rnd()], [34, 40 + rnd() * 30, 26]);
        const cg = cliff.build(); for (let i = 0; i < 9; i++) { const x = 60 + i * 165 + rnd() * 40, y = i % 2 ? -26 : BH + 26; if (!(SGB && x > 940)) put(cg, x, y, rnd() * .4, 'cliff', 0); }
    }
    /** Vojaci a kone, ktorí prejdú cez barikádu, kolík, voz alebo stan, ich rozbijú (triesky, prevrátený stan). */
    function stepProps(dt) {
        if (!props.length) return;
        for (const c of campF) { if (Math.random() < .5 * dt) flame(c.x + (Math.random() - .5) * 4, heightAt(c.x, c.y) + 2, c.y + (Math.random() - .5) * 4, .55); if (Math.random() < .06 * dt) smoke(c.x, heightAt(c.x, c.y) + 10, c.y, .8); }
        if (frameN % 6) return;
        for (const p of props) {
            if (!p.hp || p.broken) continue;
            for (const u of U) {
                if (u.hp <= 0 || u.fled || Math.abs(u.x - p.x) > p.r + 8 || Math.abs(u.y - p.y) > p.r + 8) continue;
                const o = units.get(u); if (!o || o.sp < .5) continue;
                p.hp -= o.mount ? 2 : 1; if (p.hp > 0) continue;
                p.broken = 1; const a = Math.atan2(u.vy3 || 0, u.vx3 || 0), col = p.kind === 'tent' ? '#c8b898' : '#6a4a2c';
                for (let i = 0; i < (p.kind === 'stake' ? 2 : 6); i++) chunk(p.x, heightAt(p.x, p.y) + 4, p.y, col, .45, 1);
                splinters(p.x, p.y, 8); if (p.kind === 'cart') { p.m.rotation.z = 1.4; p.m.position.y -= 2; } else if (p.kind === 'tent') { p.m.scale.y = .22; p.m.rotation.z = .2; } else scene.remove(p.m);
                break;
            }
        }
    }
    /** Miesta stromov a kríkov (zhluky lesa z FIELD.trees, okraje bojiska). */
    function treeSpots(rnd, roadD) {
        const F = FIELD || { trees: [] }, spots = [];
        const place = (x, y, k) => { if (F.river && Math.abs(x - riverX()) < 60) return; if (SGB && x > 800) return; if (x < 0 || x > BW || y < 0 || y > BH) return; if (roadD(x, y) < 20) return; spots.push([x, y, k || .75 + rnd() * .6, rnd()]); };
        const dens = .6 + (F.forest || 0) * 1.4;
        for (const tr of F.trees || []) { const n = Math.round(tr.r * tr.r / 420 * dens); for (let j = 0; j < n; j++) { const a = rnd() * 6.283, d = Math.sqrt(rnd()) * tr.r; place(tr.x + Math.cos(a) * d, tr.y + Math.sin(a) * d * .8); } }
        for (let i = 0; i < 40; i++) { place(rnd() * BW, 20 + rnd() * 50); place(rnd() * BW, BH - 6 - rnd() * 40); }
        for (let i = 0; i < 24; i++) { place(10 + rnd() * 50, rnd() * BH); if (!SGB) place(BW - 10 - rnd() * 50, rnd() * BH); }
        return spots;
    }
    /** Stromy, kríky, balvany s machom alebo snehom, ploty pri ceste – rozmanité tvary, hojdajú sa vo vetre. */
    function buildFlora(rnd, B, spots, road, roadD) {
        const t = T(), F = FIELD || { trees: [] };
        const M = new t.Matrix4(), q = new t.Quaternion(), e = new t.Euler(), v = new t.Vector3(), s = new t.Vector3();
        const inst = (geo, list, fn, matl) => { if (!list.length) return; const im = new t.InstancedMesh(geo, matl || B3G.foliageMat(), list.length); list.forEach((p, i) => { fn(p, i); im.setMatrixAt(i, M); }); im.castShadow = shadowsOn(); im.receiveShadow = true; scene.add(im); };
        const at = (x, y, k, ky) => M.compose(v.set(x, heightAt(x, y) - 1, y), q.setFromEuler(e.set(0, rnd() * 6.28, 0)), s.set(k, k * (ky || 1), k));
        const snow = BI === 's', dead = BI === 'a';
        // druhy stromov: dub (koruna z viacerých gúľ), breza (biely kmeň), smrek (poschodia kužeľov), mŕtvy strom, krík
        const oak = (sd) => { const P = Part(); let r = sd; const rr = () => (r = r * 16807 % 2147483647) / 2147483647;
            P.add('taperU', '#4a3420', [0, 9, 0], [0, 0, (rr() - .5) * .15], [3.2, 18, 3.2]).add('cyl6', '#4a3420', [3, 16, 1], [.3, 0, -.7], [1.2, 9, 1.2]).add('cyl6', '#4a3420', [-2.5, 15, -1.5], [-.4, 0, .8], [1.1, 8, 1.1]);
            const se = seas(), leaf = se === 2 ? ['#c8742a', '#d8a030', '#a84a22', '#b89a2a'] : se === 3 ? ['#6a5a48', '#5a4e40', '#7a6a58', '#4a4238'] : se === 0 ? ['#5a9a3a', '#6aa840', '#4e8a34', '#7ab048'] : ['#3e6a2a', '#4a7a30', '#36602a', '#56823a'];   // farba lístia podľa ročného obdobia
            for (let i = 0; i < 7; i++) { const a = rr() * 6.28, d = rr() * 7; P.add('sph2', snow ? '#e8eef2' : leaf[i % 4], [Math.cos(a) * d, 22 + rr() * 9, Math.sin(a) * d], [0, 0, 0], [11 + rr() * 7, 9 + rr() * 5, 11 + rr() * 7]); }
            return P.build(); };
        const birch = (sd) => { const P = Part(); let r = sd; const rr = () => (r = r * 16807 % 2147483647) / 2147483647;
            P.add('cyl6', '#e8e4dc', [0, 12, 0], [0, 0, 0], [1.8, 24, 1.8]); for (let i = 0; i < 6; i++) P.add('box', '#2a2622', [.9, 4 + i * 3.6, 0], [0, rr() * 3, 0], [.3, .5, 1.4]);
            for (let i = 0; i < 5; i++) { const a = rr() * 6.28; P.add('sph', snow ? '#eef2f4' : seas() === 2 ? (i % 2 ? '#e0b030' : '#d89a28') : i % 2 ? '#8aa848' : '#7a9a3a', [Math.cos(a) * 3, 24 + rr() * 8, Math.sin(a) * 3], [0, 0, 0], [7, 8 + rr() * 4, 7]); }
            return P.build(); };
        const spruce = () => { const P = Part(); P.add('cyl6', '#4a3424', [0, 6, 0], [0, 0, 0], [2.2, 12, 2.2]);
            for (let i = 0; i < 5; i++) { const y = 10 + i * 6.4, r = 17 - i * 3; P.add('cone', '#2e4a2a', [0, y, 0], [0, 0, 0], [r, 11, r]); if (snow) P.add('cone', '#eef2f4', [0, y + 3, 0], [0, 0, 0], [r * .8, 5.4, r * .8]); }
            return P.build(); };
        const deadT = (sd) => { const P = Part(); let r = sd; const rr = () => (r = r * 16807 % 2147483647) / 2147483647; const c = dead ? '#1e1a18' : '#4a4038';
            P.add('taperU', c, [0, 10, 0], [0, 0, (rr() - .5) * .3], [2.6, 20, 2.6]); for (let i = 0; i < 5; i++) { const a = rr() * 6.28; P.add('cyl6', c, [Math.cos(a) * 2.5, 12 + rr() * 10, Math.sin(a) * 2.5], [Math.sin(a) * .8, 0, -Math.cos(a) * .8], [.8, 8 + rr() * 5, .8]); }
            return P.build(); };
        const bush = () => { const P = Part(); for (let i = 0; i < 4; i++) { const a = i * 1.6; P.add('sph', snow ? '#dfe6ea' : BI === 'd' ? '#8a8048' : i % 2 ? '#3e6a2a' : '#4e7a34', [Math.cos(a) * 2.4, 2.6 + (i % 2), Math.sin(a) * 2.4], [0, 0, 0], [6, 5, 6]); } return P.build(); };
        const kinds = BI === 'a' ? [['dead', 1]] : BI === 'd' ? [['bush', .6], ['dead', .4]] : BI === 's' ? [['spruce', .7], ['dead', .1], ['birch', .2]] : [['oak', .45], ['spruce', .25], ['birch', .2], ['bush', .1]];
        const groups = {};
        for (const sp of spots) { let r = sp[3], k = kinds[kinds.length - 1][0]; for (const [n, w] of kinds) { if (r < w) { k = n; break; } r -= w; } (groups[k] = groups[k] || []).push(sp); }
        const mk = { oak: () => [oak(17), oak(9311), oak(4471)], birch: () => [birch(77), birch(3113)], spruce: () => [spruce()], dead: () => [deadT(5), deadT(919)], bush: () => [bush()] };
        for (const k in groups) { const geos = mk[k](); geos.forEach((gm, vi) => inst(gm, groups[k].filter((p, i) => i % geos.length === vi), ([x, y, sc]) => at(x, y, k === 'bush' ? sc * .9 : sc, k === 'spruce' ? 1 + (sc - 1) * .5 : 1))); }
        // padnuté kmene a podrast (paprade) pri lesoch
        if (BI !== 'a' && BI !== 'd') {
            const logs = spots.filter((p, i) => i % 9 === 4).map(([x, y]) => [x + (rnd() - .5) * 30, y + (rnd() - .5) * 30, rnd() * 6.28, .7 + rnd() * .6]).filter(([x, y]) => x > 5 && y > 5 && x < BW - 5 && y < BH - 5 && roadD(x, y) > 22 && !(SGB && x > 800) && creekD(x, y) > 20);
            const lg = Part().add('cyl12', '#4a3622', [0, 2, 0], [0, 0, Math.PI / 2], [3.6, 34, 3.6]).add('cyl12', '#6a5032', [17, 2, 0], [0, 0, Math.PI / 2], [3.2, .4, 3.2]).add('cyl6', '#4a3622', [-6, 4, 2], [.6, 0, .4], [1, 8, 1]).add('sph', snow ? '#e8eef2' : '#4a6a2a', [4, 3.6, 0], [0, 0, 0], [6, 1.6, 4]).build();
            inst(lg, logs, ([x, y, a, k]) => { M.compose(v.set(x, heightAt(x, y) - .6, y), q.setFromEuler(e.set(0, a, 0)), s.set(k, k, k)); }, mat('v'));
            const fern = Part(); for (let i = 0; i < 7; i++) { const a = i * .9; fern.add('cone6', snow ? '#c8d0cc' : seas() === 2 ? '#8a6a2a' : '#3e6a2c', [Math.cos(a) * 1.6, 1.6, Math.sin(a) * 1.6], [Math.sin(a) * .9, 0, -Math.cos(a) * .9], [1.2, 5, .4]); }
            const fg2 = fern.build(), ferns = []; for (const [x, y] of spots) for (let j = 0; j < 3; j++) { const fx = x + (rnd() - .5) * 46, fy = y + (rnd() - .5) * 46; if (fx > 0 && fy > 0 && fx < BW && fy < BH && roadD(fx, fy) > 18 && creekD(fx, fy) > 14 && !(SGB && fx > 800)) ferns.push([fx, fy, .7 + rnd() * .7]); }
            inst(fg2, ferns.slice(0, 900), ([x, y, k]) => at(x, y, k));
        }
        // kríky navyše po bojisku
        const extra = []; if (BI !== 'a') for (let i = 0; i < 40; i++) { const x = rnd() * BW, y = rnd() * BH; if (Math.abs(x - BW * .5) < 300 && Math.abs(y - BH * .5) < 260) continue; if ((F.river && Math.abs(x - riverX()) < 70) || (SGB && x > 800) || roadD(x, y) < 20) continue; extra.push([x, y, .6 + rnd() * .5]); }
        inst(bush(), extra, ([x, y, sc]) => at(x, y, sc));
        // balvany: mach alebo sneh navrchu
        const rocksL = []; for (let i = 0; i < 34 + (F.hill ? 18 : 0); i++) { const x = rnd() * BW, y = rnd() * BH; if ((!F.river || Math.abs(x - riverX()) > 60) && !(SGB && x > 960)) rocksL.push([x, y, .6 + rnd() * 1.3]); }
        obsAdd(rocksL.map(r => [r[0], r[1], 4 * r[2], 5.5 * r[2]]));   // balvany sú prekážky aj kryt pred šípmi
        const rg = Part().add('sph', B.rock, [0, 1.2, 0], [0, 0, 0], [8, 5.6, 7]).add('sph0', sh(B.rock, .9), [2.6, .6, 1.8], [.4, .3, 0], [4.6, 3.6, 4]).build();
        const top = C(snow ? '#eef2f4' : BI === 'g' ? '#5a7a30' : BI === 'd' ? '#c0a878' : B.rock), cA = rg.attributes.color, nA = rg.attributes.normal;
        for (let i = 0; i < cA.count; i++) { const k = Math.max(0, (nA.getY(i) - .45) / .55); if (k > 0) { const c = C('#000').setRGB(cA.getX(i), cA.getY(i), cA.getZ(i)).lerp(top, k * .85); cA.setXYZ(i, c.r, c.g, c.b); } }
        inst(rg, rocksL, ([x, y, k]) => { M.compose(v.set(x, heightAt(x, y) - .5, y), q.setFromEuler(e.set(rnd() * .4, rnd() * 6, rnd() * .3)), s.set(k, k, k)); }, mat('v'));
        // lúčne kvety v zhlukoch (podľa ročného obdobia), trstina pri vode, pne, kopy kameňov a stojace kamene
        if (q >= 1 && BI === 'g' && seas() !== 3) {
            const fl = seas() === 2 ? ['#d89a28', '#c8742a', '#e8d8a0'] : seas() === 0 ? ['#f4f0e8', '#f0c8d8', '#e8d050', '#c8a0e0'] : ['#f2d040', '#f4f0e8', '#d86a8a', '#7a9ae0'], fp = Part();
            for (let i = 0; i < 6; i++) { const a = i * 1.05, d = 1.5 + (i % 3) * .9; fp.add('cyl6', '#4a7a30', [Math.cos(a) * d, 1.3, Math.sin(a) * d], [0, 0, 0], [.14, 2.6, .14]).add('sph', fl[i % fl.length], [Math.cos(a) * d, 2.8, Math.sin(a) * d], [0, 0, 0], [.9, .6, .9]); }
            const fg3 = fp.build(), pts = [];
            for (let i = 0; i < 90; i++) { const cx = rnd() * BW, cy = rnd() * BH; if ((F.river && Math.abs(cx - riverX()) < 70) || (SGB && cx > 900) || roadD(cx, cy) < 16 || creekD(cx, cy) < 12) continue; const n = 4 + (rnd() * 6 | 0); for (let j = 0; j < n; j++) pts.push([cx + (rnd() - .5) * 26, cy + (rnd() - .5) * 26, 1.5 + rnd() * .9]); }
            inst(fg3, pts.filter(([x, y]) => x > 0 && y > 0 && x < BW && y < BH), ([x, y, k]) => at(x, y, k));
        }
        if (q >= 1 && BI !== 'd' && BI !== 'a') {   // trstina a rôpa pri brehu potoka a rieky
            const rp = Part(); for (let i = 0; i < 7; i++) { const a = i * .9, d = .5 + (i % 3) * .7; rp.add('cyl6', snow ? '#d8d0b0' : '#6a8a3a', [Math.cos(a) * d, 5, Math.sin(a) * d], [Math.sin(a) * .1, 0, Math.cos(a) * .1], [.22, 10 + (i % 3) * 2.5, .22]).add('cyl6', '#5a3a22', [Math.cos(a) * d, 10.5 + (i % 3) * 2.5, Math.sin(a) * d], [0, 0, 0], [.5, 2, .5]); }
            const rg2 = rp.build(), rl = [];
            for (let i = 0; i < 400 && rl.length < 160; i++) { const x = rnd() * BW, y = rnd() * BH, cd = creekD(x, y), rv = F.river ? Math.abs(Math.abs(x - riverX()) - 62) : 99; if (!((cd > 11 && cd < 22) || rv < 7)) continue; if (SGB && x > 900) continue; rl.push([x, y, 1 + rnd() * .8]); }
            inst(rg2, rl, ([x, y, k]) => at(x, y, k));
        }
        if (BI !== 'a') {   // pne so sekerou, kopy kameňov a stojaci kameň
            const stump = Part().add('cyl12', '#5a4028', [0, 1.6, 0], [0, 0, 0], [3.4, 3.2, 3.4]).add('cyl12', '#c8a878', [0, 3.25, 0], [0, 0, 0], [3, .15, 3]).add('cone6', '#5a4028', [2.4, .6, 0], [0, 0, 1.2], [.9, 2.4, .9]).build(), st = [];
            for (let i = 0; i < 26; i++) { const x = rnd() * BW, y = rnd() * BH; if (roadD(x, y) > 22 && creekD(x, y) > 16 && !(F.river && Math.abs(x - riverX()) < 70) && !(SGB && x > 900)) st.push([x, y, .8 + rnd() * .5]); }
            inst(stump, st, ([x, y, k]) => { M.compose(v.set(x, heightAt(x, y) - .3, y), q.setFromEuler(e.set(0, rnd() * 6, 0)), s.set(k, k, k)); }, mat('v'));
            const cairn = Part(); for (let i = 0; i < 6; i++) cairn.add('sph0', sh(B.rock, .85 + (i % 3) * .1), [Math.cos(i * 1.4) * (3 - i * .35), .9 + (i > 3 ? 2.2 : i > 1 ? 1.4 : 0), Math.sin(i * 1.4) * (3 - i * .35)], [i, i * .6, 0], [3.2 - i * .2, 2.2, 3]);
            const ca = cairn.build(), cl = []; for (let i = 0; i < 9; i++) { const x = rnd() * BW, y = rnd() * BH; if (roadD(x, y) > 24 && creekD(x, y) > 18 && !(F.river && Math.abs(x - riverX()) < 70) && !(SGB && x > 900)) cl.push([x, y, .8 + rnd() * .6]); }
            inst(ca, cl, ([x, y, k]) => { M.compose(v.set(x, heightAt(x, y) - .4, y), q.setFromEuler(e.set(0, rnd() * 6, 0)), s.set(k, k, k)); }, mat('v'));
            if (!SGB && rnd() < .8) { const mx = 200 + rnd() * 900, my = 60 + rnd() * (BH - 120); if (roadD(mx, my) > 30 && !(F.river && Math.abs(mx - riverX()) < 90) && creekD(mx, my) > 24) { const sg = Part(); for (let i = 0; i < 5; i++) { const a = i * 1.257; sg.add('box', sh(B.rock, .9 + (i % 2) * .15), [Math.cos(a) * 10, 7, Math.sin(a) * 10], [.05, a, .04], [3.2, 14 + (i % 3) * 3, 5.4]); } sg.add('box', sh(B.rock, .8), [0, 15, 8], [0, 0, 0], [3, 2.6, 18]); const m2 = mesh(sg.build()); m2.position.set(mx, heightAt(mx, my) - .8, my); scene.add(m2); if (QN() >= 1) m2.material = B3G.stoneMat(); } }   // kruh stojacich kameňov
        }
        // plot pri ceste
        const fence = []; for (let i = 2; i < road.length - 2; i++) { if (i % 9 > 4) continue; const [ax, ay] = road[i], [bx, by] = road[i + 1], a = Math.atan2(by - ay, bx - ax), nx = -Math.sin(a) * 19, ny = Math.cos(a) * 19; fence.push([ax + nx, ay + ny, a, Math.hypot(bx - ax, by - ay)]); }
        const fg = Part().add('box', '#5a4028', [0, 4, 0], [0, 0, 0], [1, 8, 1]).add('box', '#6a4a2e', [18, 5.4, 0], [0, 0, 0], [36, .9, .5]).add('box', '#6a4a2e', [18, 2.8, 0], [0, 0, 0], [36, .9, .5]).build();
        if (BI !== 'a') inst(fg, fence, ([x, y, a, L]) => { M.compose(v.set(x, heightAt(x, y), y), q.setFromEuler(e.set(0, -a, 0)), s.set(L / 36, 1, 1)); }, mat('v'));
    }
    /** Hradby s cimburím, veže, brána, hradný palác; rebríky, obliehacia veža a baranidlo sa hýbu v snímke. */
    function buildSiege() {
        const t = T(), W = Part(), stone = '#8a857a', dark = '#6e6a62';
        for (let y = 0; y < BH; y += 40) { if (y + 40 > 440 && y < 520) { if (y < 440) W.add('box', stone, [1024, 20, (y + 440) / 2], [0, 0, 0], [48, 40, 440 - y]); if (y + 40 > 520) W.add('box', stone, [1024, 20, (520 + y + 40) / 2], [0, 0, 0], [48, 40, y + 40 - 520]); continue; } W.add('box', ((y / 40) % 2 ? stone : dark), [1024, 20, y + 20], [0, 0, 0], [48, 40, 40]); }
        for (let y = 0; y < BH; y += 40) if (!(y > 420 && y < 540)) for (let k = 0; k < 4; k++) W.add('box', k % 2 ? '#7e7a70' : '#949086', [1000.4, 4 + k * 9 + (y / 40 % 2) * 4, y + 6 + k * 7], [0, 0, 0], [.6, 3, 12]);   // kamenné kvádre na líci múru
        for (let y = 4; y < BH; y += 20) if (!(y > 436 && y < 524)) W.add('box', dark, [1002, 44, y + 5], [0, 0, 0], [6, 8, 10]);   // cimburie na vonkajšom okraji
        W.add('box', '#5a5048', [1024, 46, 480], [0, 0, 0], [52, 12, 92]);   // preklad nad bránou
        siege.towers = [150, 390, 570, 810].map(y => { const T2 = Part().add('cyl12', stone, [0, 34, 0], [0, 0, 0], [36, 68, 36]).add('cone', '#5a4a3a', [0, 78, 0], [0, 0, 0], [42, 22, 42]); for (let k = 0; k < 4; k++) T2.add('box', '#1a1614', [Math.cos(k * 1.57) * 18, 52, Math.sin(k * 1.57) * 18], [0, -k * 1.57, 0], [1, 6, 2.4]);
            const m = mesh(T2.build()); if (QN() >= 1) m.material = B3G.stoneMat(); m.position.set(1024, 0, y); scene.add(m); return { m, y, hits: 0, fall: 0 }; });   // veže zvlášť: po zásahoch trebuchetu sa zrútia
        W.add('box', '#9a958a', [1290, 40, 330], [0, 0, 0], [140, 80, 120]).add('box', dark, [1290, 84, 330], [0, 0, 0], [150, 8, 130]).add('cyl12', stone, [1350, 70, 380], [0, 0, 0], [40, 140, 40]).add('cone', '#5a3a2a', [1350, 150, 380], [0, 0, 0], [48, 30, 48]);
        for (let k = 0; k < 6; k++) W.add('box', '#1a1614', [1219.5, 30 + (k % 2) * 26, 290 + (k >> 1) * 30], [0, 0, 0], [1, 8, 4]);   // okná paláca
        for (const [x, z, w, d] of [[1120, 200, 50, 40], [1150, 760, 60, 44], [1240, 640, 46, 50]]) W.add('box', '#a89a84', [x, 12, z], [0, 0, 0], [w, 24, d]).add('box', '#6a3a2a', [x, 28, z], [0, 0, .5], [w * .75, 4, d + 4]).add('box', '#6a3a2a', [x, 28, z], [0, 0, -.5], [w * .75, 4, d + 4]);   // domy na nádvorí
        const wm = mesh(W.build()); if (QN() >= 1) wm.material = B3G.stoneMat(); scene.add(wm);   // murivo s kvádrami a maltou
        // strechy domov na nádvorí neskôr v bitke chytia od horiacich šípov
        roofs = [[1120, 200, 50, 40], [1150, 760, 60, 44], [1240, 640, 46, 50], [1290, 330, 150, 130]].map(([x, z, w, d], i) => ({ x, z, w, d, y: i === 3 ? 88 : 30, at: 700 + i * 650 + Math.random() * 600 + (i === 3 ? 900 : 0), on: 0, k: 0 }));
        roofL = [0, 1].map(() => { const l = new t.PointLight(C('#ff7a30'), 0, 300, 1); l.userData.r = null; scene.add(l); return l; });
        siege.gate = mesh(Part().add('box', '#5a3a1a', [1004, 22, 480], [0, 0, 0], [8, 44, 84]).add('box', '#9a9a9a', [1001, 14, 480], [0, 0, 0], [3, 4, 84], { m: 1 }).add('box', '#9a9a9a', [1001, 32, 480], [0, 0, 0], [3, 4, 84], { m: 1 }).build()); scene.add(siege.gate);
        const lad = Part(); for (const z of [-9, 9]) lad.add('box', '#7a5a30', [0, 0, z], [0, 0, 0], [62, 2, 2]); for (let k = -26; k <= 26; k += 7) lad.add('box', '#8a6a3a', [k, 0, 0], [0, 0, 0], [1.6, 1.6, 18]);
        const lg = lad.build(); siege.lad = [250, 710].map(l => { const m = mesh(lg); m.position.set(982, 20, l); m.rotation.z = Math.atan2(40, 36); scene.add(m); return m; });
        const tw = Part().add('box', '#6b4a2e', [0, 34, 0], [0, 0, 0], [60, 68, 60]).add('box', '#4a3220', [0, 70, 0], [0, 0, 0], [64, 6, 64]);
        for (let k = 8; k < 66; k += 12) tw.add('box', '#4a3220', [30.3, k, 0], [0, 0, 0], [.6, 1.6, 60]).add('box', '#4a3220', [0, k, 30.3], [0, 0, 0], [60, 1.6, .6]);   // trámy a koža
        for (const [x, z] of [[-22, 32], [22, 32], [-22, -32], [22, -32]]) tw.add('cyl12', '#3a2a1a', [x, 6, z], [Math.PI / 2, 0, 0], [12, 4, 12]);
        siege.tower = mesh(tw.build());
        siege.tower.visible = !!SGB.tow; scene.add(siege.tower);
        siege.bridge = mesh(Part().add('box', '#8a6a3a', [28, 0, 0], [0, 0, 0], [56, 2, 40]).add('box', '#4a3220', [28, 1.2, 0], [0, 0, 0], [56, .6, 2]).build()); siege.bridge.position.set(30, 42, 0); siege.bridge.rotation.z = Math.PI / 2; siege.tower.add(siege.bridge);   // mostík padne na hradby
        const dc = (U.find(u => u.t !== (SGB.att ?? 0) && !u.h && u.fc != null) || {}).fc, df = dc != null ? dc : (SGB.att ?? 0) ? G.fac : 2;
        siege.flags = [150, 390, 570, 810, 380].map((y, i) => { const g = new t.Group(); g.add(mesh(Part().add('cyl', '#3a2a1a', [0, 16, 0], [0, 0, 0], [.8, 32, .8]).build())); const f = bannerMesh(df, 14, 11); f.position.set(0, 30, 0); g.add(f); g.position.set(i === 4 ? 1350 : 1024, i === 4 ? 165 : 88, y); scene.add(g); return g; });
        const rm = Part().add('cyl12', '#6b4a2e', [0, 9, 0], [0, 0, Math.PI / 2], [10, 60, 10]).add('cone', '#4a4a4a', [33, 9, 0], [0, 0, -Math.PI / 2], [11, 8, 11], { m: 1 }).add('box', '#3a2a1a', [0, 22, 0], [0, 0, .25], [50, 2, 26]);
        for (const x of [-20, 20]) for (const z of [-11, 11]) rm.add('box', '#3a2a1a', [x, 11, z], [0, 0, 0], [1.6, 22, 1.6]);
        siege.ram = mesh(rm.build()); siege.ram.visible = !!SGB.ram; scene.add(siege.ram);
        if (WX.night) for (const y of [200, 330, 640, 760]) braziers.push({ x: 1024, y, l: null });   // žeravé koše na hradbách
        // trebuchety za útočníkmi: rameno s protiváhou a prakom vrhá kamene na hradby a veže
        siege.treb = [210, 750].map((y, i) => { const g = new t.Group(), fr = Part(), w = '#6b4a2e';
            fr.add('box', w, [0, 2, 0], [0, 0, 0], [40, 3, 26]); for (const z of [-11, 11]) fr.add('box', w, [0, 18, z], [0, 0, .35], [2.4, 34, 2.4]).add('box', w, [0, 18, z], [0, 0, -.35], [2.4, 34, 2.4]);
            fr.add('cyl6', '#3a2a1a', [0, 33, 0], [Math.PI / 2, 0, 0], [1.6, 24, 1.6]); for (const x of [-16, 16]) for (const z of [-13, 13]) fr.add('cyl12', '#3a2a1a', [x, 3, z], [Math.PI / 2, 0, 0], [6, 2, 6]);
            g.add(mesh(fr.build())); const arm = new t.Group(); arm.position.set(0, 33, 0); g.add(arm);
            arm.add(mesh(Part().add('box', w, [10, 0, 0], [0, 0, 0], [62, 2.4, 2.4]).add('box', '#4a4a4a', [-20, -6, 0], [0, 0, 0], [9, 12, 10], { m: 1 }).add('box', '#5a3a1a', [40, 0, 0], [0, 0, 0], [3, 3, 3]).build()));
            g.position.set(640, heightAt(640, y), y); g.rotation.y = 0; scene.add(g); return { g, arm, t: 120 + i * 210, y }; });
        // detaily hradu: cimburie veží, kamenné pásy, pilastre múru, vlajky na múre, trhovisko s prístreškami, sudy a debny, komíny, okná a dvere domov
        { const D = Part(), Wd = Part(), st2 = '#7e7a70';
            for (const y of [150, 390, 570, 810]) {
                for (let k = 0; k < 10; k++) { const a = k * .628; D.add('box', st2, [1024 + Math.cos(a) * 17.5, 70, y + Math.sin(a) * 17.5], [0, -a, 0], [3.2, 5, 5]); }   // zuby cimburia veže
                D.add('cyl12', '#6e6a62', [1024, 40, y], [0, 0, 0], [39, 3, 39]).add('cyl12', '#6e6a62', [1024, 66, y], [0, 0, 0], [40, 3, 40]);   // kamenné pásy
                for (const k of [-1, 1]) D.add('box', '#2a2420', [1005.4, 52, y + k * 7], [0, 0, 0], [.6, 9, 2.6]);   // okná
            }
            for (let y = 20; y < BH; y += 80) if (!(y > 410 && y < 550)) D.add('box', '#7e7a70', [997.5, 18, y], [0, 0, 0], [5, 36, 8]).add('box', '#6e6a62', [996, 38, y], [0, 0, 0], [8, 2.4, 11]);   // opory múru
            D.add('box', '#6e6a62', [999, 22, 440], [0, 0, 0], [8, 46, 14]).add('box', '#6e6a62', [999, 22, 520], [0, 0, 0], [8, 46, 14]).add('box', '#5a5048', [1000, 47, 480], [0, 0, 0], [6, 4, 94]);   // brána: piliere a preklad
            for (let k = -3; k <= 3; k++) D.add('box', '#4a4640', [996.6, 36 - Math.abs(k) * 2.4 + 6, 480 + k * 12], [0, 0, 0], [.5, 4, 3]);   // klenák oblúka
            const hs = [[1120, 200, 50, 40], [1150, 760, 60, 44], [1240, 640, 46, 50]];
            for (const [x, z, w, d] of hs) {
                D.add('box', '#6a6258', [x + w * .25, 36, z - d * .2], [0, 0, 0], [5, 14, 5]);   // komín
                Wd.add('box', '#4a3220', [x - w / 2 - .3, 12, z - d * .2], [0, 0, 0], [.4, 24, 2.2]).add('box', '#4a3220', [x - w / 2 - .3, 12, z + d * .2], [0, 0, 0], [.4, 24, 2.2]).add('box', '#4a3220', [x - w / 2 - .3, 24, z], [0, 0, 0], [.5, 1.6, d]).add('box', '#4a3220', [x - w / 2 - .3, 1, z], [0, 0, 0], [.5, 1.6, d]);   // hrazdenie priečelia
                Wd.add('box', '#2a1a10', [x - w / 2 - .5, 8, z + d * .05], [0, 0, 0], [.5, 12, 7]).add('box', '#e8c870', [x - w / 2 - .6, 16, z - d * .3], [0, 0, 0], [.4, 5, 5]).add('box', '#e8c870', [x - w / 2 - .6, 16, z + d * .3], [0, 0, 0], [.4, 5, 5]);   // dvere a okná (v noci žiaria)
            }
            for (let i = 0; i < 5; i++) { const x = 1090 + i * 30, z = 470 + (i % 2) * 22 - 20, c = ['#a83020', '#c8b060', '#3a5a8a', '#6a3a6a', '#4a7a3a'][i];   // trhové stánky s farebnými prístreškami
                Wd.add('box', '#5a4028', [x, 4, z], [0, 0, 0], [10, 8, 6]).add('box', c, [x, 11, z], [.3, 0, 0], [12, .8, 9]).add('cyl6', '#4a3220', [x - 5, 6, z + 4], [0, 0, 0], [.6, 12, .6]).add('cyl6', '#4a3220', [x + 5, 6, z + 4], [0, 0, 0], [.6, 12, .6]); }
            for (let i = 0; i < 12; i++) { const x = 1075 + (i % 6) * 16 + (i >> 2) * 5, z = 300 + (i >> 1) * 34 + (i % 2) * 12; if (i % 3 === 0) Wd.add('box', '#7a5a34', [x, 3, z], [0, i, 0], [5, 6, 5]).add('box', '#5a3a1a', [x, 6.2, z], [0, i, 0], [5.4, .6, 5.4]); else Wd.add('cyl12', '#6a4a2a', [x, 4, z], [0, 0, 0], [4.4, 8, 4.4]).add('torus', '#3a3a3a', [x, 2.5, z], [0, 0, 0], [4.5, .5, 4.5]).add('torus', '#3a3a3a', [x, 6, z], [0, 0, 0], [4.5, .5, 4.5]); }   // sudy a debny
            const dm = mesh(D.build()); if (QN() >= 1) dm.material = B3G.stoneMat(); scene.add(dm); scene.add(mesh(Wd.build()));
            const df2 = (U.find(u => u.t !== (SGB.att ?? 0) && !u.h && u.fc != null) || {}).fc ?? 2; for (const y of [250, 330, 630, 710]) { const f = bannerMesh(df2, 7, 16); f.rotation.y = -Math.PI / 2; f.position.set(997, 32, y); scene.add(f); }   // zástavy visiace na múre
        }
        siege.burn = 0;
    }
    function updSiege() {
        if (!SGB) return;
        stepSiegeBig();
        const tt = U[0].tt || 0, pl = Math.min(1, tt / 160), pt = Math.min(1, tt / 320), off = SGB.ladOff || [0, 0];
        siege.gate.visible = SGB.gate > 0;
        siege.lad.forEach((m, i) => { m.visible = !!SGB.lad; if ((off[i] || 0) > 0) { m.rotation.z = .08; m.position.x = 950; m.position.y = 2; } else { m.rotation.z = Math.atan2(40, 36) * pl; m.position.x = 982 - (1 - pl) * 12; m.position.y = 2 + 18 * pl; } });
        siege.tower.position.set(960 - (1 - pt) * 150, 0, 610);
        const br = siege.bridge; if (pt < 1) br.rotation.z = Math.PI / 2; else if (br.rotation.z > 0) { br.rotation.z = Math.max(0, br.rotation.z - .05); if (br.rotation.z === 0) { dust(1010, 610, 16, 20, '#8a8478'); SHAKE = Math.max(SHAKE, 1.5); } }
        siege.ram.position.set(965 + Math.sin(clock * 3) * 5, 0, 480); siege.ram.visible = !!SGB.ram && SGB.gate > 0;
        for (const b of braziers) { if (Math.random() < .5) flame(b.x - 20 + (Math.random() - .5) * 3, 47, b.y + (Math.random() - .5) * 3, .8); if (Math.random() < .08) FIRE.add({ x: b.x - 20, y: 50, z: b.y, vx: (Math.random() - .5) * .3, vy: 1 + Math.random(), vz: (Math.random() - .5) * .3, l: 50, c: '#ffd080', c1: '#802004', s0: 1.5, s1: .5, a0: 1 }); }
    }
    /** Trebuchety (cyklus: nabitie, šľah ramena, let kameňa), zásahy do hradieb a veží (praskliny, sutiny, zrútenie veže), horiaca obliehacia veža. */
    function stepSiegeBig() {
        if (!siege.treb || photo) return;
        const dt = Math.min(3, frameDt), t = T();
        for (const tb of siege.treb) {
            tb.t -= dt; const cy = 420;
            if (tb.t > 30) tb.arm.rotation.z = -1.05 * Math.min(1, (cy - tb.t) / 200);   // pomaly naťahujú
            else if (tb.t > 0) tb.arm.rotation.z = -1.05 + (1 - tb.t / 30) * 2.5;      // šľah
            if (tb.t <= 0 && !tb.shot) { tb.shot = 1; const tw = siege.towers.filter(w => !w.fall), tgtW = tw.length && Math.random() < .55 ? tw[Math.floor(Math.random() * tw.length)] : null, ty = tgtW ? tgtW.y : 80 + Math.random() * (BH - 160);
                const m = mesh(Part().add('sph0', '#7a746a', [0, 0, 0], [0, 0, 0], [7, 6, 7]).build()); scene.add(m); siege.shots = siege.shots || []; siege.shots.push({ m, x0: 650, y0: tb.y, z0: 70, x: tgtW ? 1024 : 1002, y: ty, w: tgtW, k: 0 }); }
            if (tb.t < -90) { tb.t = 380 + Math.random() * 200; tb.shot = 0; }
        }
        for (let i = (siege.shots || []).length - 1; i >= 0; i--) {
            const r = siege.shots[i]; r.k = Math.min(1, r.k + dt / 85); const k = r.k;
            r.m.position.set(r.x0 + (r.x - r.x0) * k, r.z0 + (Math.sin(k * Math.PI) * 190) + (40 - r.z0) * k, r.y0 + (r.y - r.y0) * k); r.m.rotation.x += .1 * dt;
            if (k < 1) continue;
            scene.remove(r.m); siege.shots.splice(i, 1);
            const hy = r.w ? 50 : 30; for (let j = 0; j < 8; j++) chunk(r.x - 4, hy, r.y + (Math.random() - .5) * 16, '#8a857a', .7, 1.2);
            dust(r.x - 10, r.y, 18, 18, '#a8a090'); SHAKE = Math.max(SHAKE, .8); if (typeof snd === 'function') snd('sh');
            if (!r.w) { const d = new t.Mesh(new t.CircleGeometry(5 + Math.random() * 4, 9), new t.MeshBasicMaterial({ color: 0x1a1612, transparent: true, opacity: .7, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); d.rotation.y = -Math.PI / 2; d.position.set(999.6, 10 + Math.random() * 26, r.y); scene.add(d); }   // prasklina v múre
            else if (++r.w.hits >= 3 && !r.w.fall) { r.w.fall = 1; for (let j = 0; j < 22; j++) chunk(1024 + (Math.random() - .5) * 30, 40 + Math.random() * 40, r.w.y + (Math.random() - .5) * 30, '#8a857a', 1, 1.6); dust(1024, r.w.y, 40, 40, '#a8a090'); ring(1024, r.w.y, 90, '#d8d0c0'); SHAKE = Math.max(SHAKE, 3); if (typeof TS !== 'undefined') TS = { s: 'Trebuchet zrútil vežu hradieb!', l: 160 }; }
        }
        for (const w of siege.towers) if (w.fall && w.fall < 1) { w.fall = Math.min(1, w.fall + dt * .012); w.m.position.y = -48 * w.fall * w.fall; w.m.rotation.z = .35 * w.fall; w.m.rotation.x = .2 * w.fall; if (Math.random() < .5) dust(1024 + (Math.random() - .5) * 30, w.y + (Math.random() - .5) * 30, 1, 14, '#a8a090'); }
        // obliehacia veža vzbĺkne od horiacich šípov (neskôr v bitke)
        if (SGB.tow && siege.tower.visible && !siege.burn && (U[0].tt || 0) > 1400 && Math.random() < .002 * dt) siege.burn = 1;
        if (siege.burn) { siege.burn = Math.min(1, siege.burn + dt * .001); const p = siege.tower.position; for (let i = 0; i < 2 * siege.burn * dt; i++) flame(p.x + (Math.random() - .5) * 56, 20 + Math.random() * 54, p.z + (Math.random() - .5) * 56, 1 + siege.burn); if (Math.random() < .3 * dt) smoke(p.x, 80, p.z, 2.6, '#2a2420'); }
    }
    /** Zástava s erbom frakcie f: látka, ktorá sa vlní (žrď je zvlášť). */
    function bannerMesh(f, w = 10, h = 8) {
        const t = T(), g = new t.PlaneGeometry(w, h, 8, 2).translate(-w / 2, 0, 0), cl = new Float32Array(g.attributes.position.count);
        for (let i = 0; i < cl.length; i++) cl[i] = Math.min(1, -g.attributes.position.getX(i) / w) * 1.2;
        g.setAttribute('aCloth', new t.BufferAttribute(cl, 1));
        const m = new t.Mesh(g, B3G.bannerMat(f)); m.castShadow = shadowsOn(); return m;
    }

    // ---------- postavy ----------
    const SKIN = { human: '#e2bf96', orc: '#5f7a4a', uruk: '#3e4a34', troll: '#7a8670', dwarf: '#dcb48c', elf: '#efd6b4', dark: '#8a5a3a', none: '#141414', hobbit: '#e8c4a0', wraith: '#101012' };
    /** Proporcie tela podľa rasy: šírka a hĺbka trupu, výška trupu, stehno, holeň, rameno, predlaktie, hlava, zhrbenie. */
    const RACE = {
        human: { W: 7.2, D: 4.4, H: 9, lt: 5.2, ls: 5, a1: 4.8, a2: 4.4, hs: 1, hunch: 0 },
        elf: { W: 6.6, D: 4, H: 9.6, lt: 5.8, ls: 5.5, a1: 5, a2: 4.7, hs: .95, hunch: 0, ears: 'elf' },
        dwarf: { W: 8.8, D: 5.6, H: 7.8, lt: 3.6, ls: 3.4, a1: 4.2, a2: 3.8, hs: 1.12, hunch: 0, beard: 1 },
        hobbit: { W: 6.2, D: 4.6, H: 6.8, lt: 3.4, ls: 3.2, a1: 3.8, a2: 3.4, hs: 1.12, hunch: 0 },
        orc: { W: 7.6, D: 5, H: 8.4, lt: 4.4, ls: 4.4, a1: 5.3, a2: 5, hs: 1, hunch: .32, ears: 'orc', tusks: 1 },
        uruk: { W: 8.6, D: 5.2, H: 9.8, lt: 5.3, ls: 5.1, a1: 5.3, a2: 4.9, hs: 1, hunch: .12, ears: 'orc' },
        troll: { W: 11, D: 7.6, H: 10, lt: 4.8, ls: 4.6, a1: 6.4, a2: 6.2, hs: .82, hunch: .4, ears: 'orc', tusks: 1 },
        wraith: { W: 7, D: 4.4, H: 9.4, lt: 5.4, ls: 5.2, a1: 5, a2: 4.6, hs: 1, hunch: .05, noFace: 1 }
    };
    /** Telesné varianty (štíhly, drobný, svalnatý, vysoký, mohutný…): mierka šírky, hĺbky, výšky trupu, nôh a rúk. Variant 0 = základná postava. */
    const BUILD = [[1, 1, 1, 1, 1], [.9, .92, 1.03, 1.06, 1.02], [1.12, 1.1, .97, .94, .98], [1, 1, 1.02, 1.1, 1.05], [1.1, 1.04, 1.03, 1, 1.05], [.93, .95, .94, .92, .95], [1.16, 1.18, 1, .96, 1], [.92, .9, 1, 1.04, 1.08]];
    function varRace(rc, fv) { const k = BUILD[fv] || BUILD[0]; return { ...rc, W: rc.W * k[0], D: rc.D * k[1], H: rc.H * k[2], lt: rc.lt * k[3], ls: rc.ls * k[3], a1: rc.a1 * k[4], a2: rc.a2 * k[4], fvk: fv }; }
    const TPL = new Map();
    const ELITE = new Set(['v', 'uG1', 'uG3', 'uI1', 'uI3', 'uE1', 'uN1', 'uL2', 'uR2', 'uM2', 'z']);   // elitné jednotky: výraznejšia zbroj a hrebeň
    /** Popis postavy jednotky u pre 3D: rasa, telo, výbava, farby, zviera, frakcia (erb). */
    function specOf(u) {
        if (u.boss) return { boss: u.boss };
        const fac = u.t ? (u.fc ?? 9) : (G.fac ?? 6), team = u.t ? (FC[u.fc] || '#8a7a6a') : FC[G.fac] || '#d9a441';
        const raceOf = L => L && ({ elf: 'elf', dwarf: 'dwarf', orc: 'orc', uruk: 'uruk', hobbit: 'hobbit', wraith: 'wraith' }[L.race]) || 'human';
        if (u.h) { const S = Soldiers.heroSpec(typeof twoHand === 'function' && twoHand() ? { ...G.eq, s: 0 } : G.eq), L = Portraits.hero(), lo = Figures.lookOpts(L); const C = typeof CMB !== 'undefined' ? CMB : {}, RW = typeof rangedW === 'function' ? rangedW() : null, rng = C.wpn === 'r', broken = C.shMax && C.shp <= 0;
            return { hero: 1, hm: ['', 'ponik', 'rohan', 'gondor', 'mearas', '', '', 'gondor_d', 'mearas_d'][G.eq.m] || null, mdl: modelOf(raceOf(L)) ? 1 : 0, race: raceOf(L), fac, skin: lo.skin || SKIN.human, hair: lo.hcol || '#4a3020', beard: lo.beard ? 1 : 0, longHair: lo.hstyle === 'long', armor: S.armorG.col, rim: S.armorG.rim, helmG: S.helmG, shieldG: rng || broken ? null : S.shieldG, weaponG: rng ? null : S.weaponG, wm: rng ? null : weaponOf(G.eq.w), am: armorOf(G.eq.a), wg: (av => av >= .4 ? 2 : av >= .2 ? 1 : 0)((shOf('a')[G.eq.a] || {}).v || 0), rk: ((shOf('a')[G.eq.a] || {}).v || 0) >= .49 ? 1 : 0, weapon: rng ? (RW && RW.rt === 'xbow' ? 'xbow' : RW && RW.rt === 'jav' ? 'spear' : 'bow') : S.weaponG.t, quiver: !!C.ammo0, horse: G.eq.m && !(u.dis) ? S.horse : null, team, cape: heroSide() ? '#2a1414' : '#6a2a2a' }; }
        const kind = Art.unitArt(u), sp = (Soldiers.UNITS[kind] || Soldiers.UNITS.i);
        if (u.cp) { const c = compDef(u.cp); if (c && c.eq) { const S = Soldiers.heroSpec(c.eq), L = c.look || {}, lo = Figures.lookOpts(L); return { hero: 1, mdl: modelOf(raceOf(L)) ? 1 : 0, hm: u.mnt ? ['', 'ponik', 'rohan', 'gondor', 'mearas', '', '', 'gondor_d', 'mearas_d'][u.mnt] || null : null, race: raceOf(L), fac, skin: lo.skin || SKIN.human, hair: lo.hcol || '#4a3020', beard: lo.beard ? 1 : 0, longHair: lo.hstyle === 'long', armor: S.armorG.col, rim: S.armorG.rim, helmG: L.helm || c.eq.h ? S.helmG : null, shieldG: S.shieldG, weaponG: S.weaponG, wm: weaponOf(c.eq.w), am: armorOf(c.eq.a), weapon: S.weaponG.t, horse: u.mnt ? Soldiers.GEAR.m[u.mnt] : null, team, cape: '#4a3a2a' }; } }
        const fu = u.uk && FU[u.uk], fv = u.fv ?? (u.fv = Math.random() * 4 | 0), race = { orc: 'orc', uruk: 'uruk', troll: 'troll', dwarf: 'dwarf', elf: 'elf', none: 'wraith' }[sp.skin] || 'human';
        // rozmanitosť: časť pešiakov nesie sekeru alebo kyjak namiesto meča, niektorí bojujú bez prilby
        const vr = u.vr ?? (u.vr = Math.random()), plainW = !sp.weapon || sp.weapon === 'sword' || sp.weapon === 'scimitar', bare = (race === 'human' || race === 'orc') && sp.helm && sp.helm !== 'hood' && !fu && vr > .86;
        const wpn = plainW && !sp.mount && vr < .22 ? 'axe' : plainW && !sp.mount && vr > .9 && race !== 'elf' ? 'mace' : sp.weapon || 'sword';
        // zbrane dobra z modelov: Gondor, Rohan, Erebor, Lothlórien a tvoje vojsko, ak stojíš na strane dobra; veterán (vylepšený pešiak) nesie meč strážcu
        const good = u.t ? [0, 1, 5, 8].includes(u.fc) : !(typeof heroSide === 'function' && heroSide());
        // brnenia dobra z modelov: trpaslíci plát z Ereboru, elfovia galadhrimskú šupinovú, Strážca Citadely a rytieri Dol Amrothu gondorský plát,
        // veterán a jazdci Rohanu rohanskú krúžkovú, lukostrelci a hraničiari kožený odev (bežný pešiak a jazdec zatiaľ zbroj kreslenú kódom)
        const am = !good ? null : race === 'dwarf' ? 'a_plat_z_ereboru' : race === 'elf' ? 'a_galadrimska_supinova' : u.uk === 'uG1' || u.uk === 'uG3' ? 'a_gondorsky_plat'
            : kind === 'v' || kind === 'r' || u.uk === 'uR2' ? 'a_rohanska_kruzkova' : kind === 'a' || u.uk === 'uG2' ? 'a_kozeny_odev' : null;
        const wm = !good ? null : wpn === 'spear' ? 'w_rohanska_kopija' : wpn === 'elfblade' ? 'w_orcrist' : wpn === 'axe' && race === 'dwarf' ? 'w_sekera_erebor' : wpn === 'sword' ? (kind === 'v' ? 'w_mec_strazcu' : 'w_zelezny_mec') : null;
        const gon = u.uk === 'uG3' || (u.t ? u.fc === 0 : G.fac === 0), hm = sp.mount === 'horse' ? (gon ? 'gondor' : 'rohan') : sp.mount === 'darkhorse' ? 'mearas_d' : null;   // plemeno koňa jednotky: Gondor bojový kôň, inak rohanský; Nazgûl čierny
        return { hm, mdl: modelOf(race) ? 1 : 0, race, fac, skin: SKIN[sp.skin] || SKIN.human, hair: race === 'elf' ? ['#e8d8a0', '#c8b070', '#d8d4c0', '#8a7a50'][fv & 3] : ['#3a2a1a', '#6a4a2a', '#2a1a10', '#8a6a3a', '#a07a3a', '#5a2a1a', '#1a1410', '#9a9a96'][fv], fv, rk: ELITE.has(kind) || ELITE.has(u.uk) ? 1 : 0, wg: sp.weapon === 'bow' || sp.weapon === 'xbow' || sp.helm === 'hood' ? 0 : ELITE.has(kind) || ELITE.has(u.uk) || kind === 'c' || sp.big ? 2 : 1, beard: sp.beard || (race === 'human' && (fv === 0 || fv === 3 || fv === 5 || fv === 7)) ? 1 : 0, armor: (fu && fu.col) || sp.armor, helm: bare ? 'none' : sp.helm, helmCol: fu && fu.hel, weapon: wpn, wm: weaponModel(wm) ? wm : null, am: armorModel(am) ? am : null, shield: sp.shield, mount: sp.mount, beast: sp.beast, big: sp.big, team, quiver: sp.weapon === 'bow' || sp.weapon === 'xbow', scale: race === 'troll' ? 1.55 : sp.big ? 1.6 : 1 };
    }
    const keyOf = s => JSON.stringify(s);
    /** Šablóna (geometrie a kostra) pre popis s; zdieľajú ju všetky rovnaké jednotky. */
    function template(s) {
        const k = keyOf(s); if (TPL.has(k)) return TPL.get(k);
        let tp;
        if (s.boss) tp = bossTemplate(s.boss);
        else if (s.beast === 'oliphant') tp = modelOf('oliphant') ? { beast: 'oliphant', mdl: beastModel('oliphant') } : beastOliphant(s);
        else if (s.beast === 'ent') tp = modelOf('ent') ? { beast: 'ent', mdl: beastModel('ent') } : beastEnt(s);
        else if (s.beast === 'wolf') tp = { humanoid: humanoid({ ...s, race: 'orc', skin: SKIN.orc, armor: '#2a2420', weapon: 'scimitar' }), mount: mountParts('wolf', s) };
        else tp = { humanoid: humanoid(s), mount: s.mount || s.horse ? mountParts(s.mount === 'wolf' || (s.horse && s.horse.wolf) ? 'wolf' : s.mount === 'darkhorse' ? 'dark' : 'horse', s.mount === 'wolf' && modelOf('varg') ? { ...s, vargModel: 1 } : s) : null };
        TPL.set(k, tp); return tp;
    }
    /** Kostra: [meno, rodič, poloha voči rodičovi]. Vráti rest (matice v priestore siete) a indexy. */
    function skel(list) {
        const t = T(), rest = {}, idx = {};
        list.forEach(([n, p, o], i) => { idx[n] = i; const m = new t.Matrix4().makeTranslation(...o); rest[n] = p ? rest[p].clone().multiply(m) : m; });
        return { list, rest, idx, root: list[0][0] };
    }
    /** Humanoid ako jedna kostrová sieť: trup, hlava s tvárou a prilbou, ruky s lakťami, zbraň, štít, nohy s kolenami, plášť, tulec. */
    function humanoid(s) {
        const MM = s.mdl ? modelRace(s.race) : null, rc0 = MM || RACE[s.race] || RACE.human, rc = !MM && !s.hero && s.fv && s.race !== 'troll' && s.race !== 'wraith' ? varRace(rc0, s.fv) : rc0, { W, D, H, lt, ls, a1, a2, hs } = rc, foot = rc.foot ?? 1.1, hipY = lt + ls + foot;
        const fv = s.fv ?? 0, trimC = [0, 1, 5, 8].includes(s.fac) ? '#d8b450' : '#a07a3c', armor = s.armor || '#7d7f80', team = s.team || '#d9a441', skin = s.race === 'human' || s.race === 'dwarf' ? sh(s.skin || SKIN.human, [1, .93, 1.05, .86, .97, 1.02, .9, 1.07][fv]) : s.skin || SKIN.human, rim = s.rim || sh(armor, 1.25), pants = sh(armor, .55), boots = '#3a2a1c', leather = '#5a3e26';
        const mA = metalish(armor), mR = metalish(rim), hair = s.hair || '#4a3020';
        const hc = rc.hc || [.15, H + 2.3 * hs, 0], HX = hc[0], HY = hc[1], nhc = [-hc[0], -hc[1], 0];
        const shZ = rc.shZ ?? W / 2 + .7, shX = rc.shX || 0, legZ = rc.legZ ?? W * .2, mz = v => [v[0], v[1], -v[2]];
        const BN = skel([['hip', null, [0, hipY, 0]], ['ch', 'hip', [0, .8, 0]], ['hd', 'ch', hc], ['hdc', 'hd', nhc], ['det', 'hd', nhc], ['shR', 'ch', [shX, H - 1.9, shZ]], ['elR', 'shR', rc.elO || [0, -a1, 0]], ['hR', 'elR', rc.hO || [0, -a2, 0]],
            ['shL', 'ch', [shX, H - 1.9, -shZ]], ['elL', 'shL', rc.elO ? mz(rc.elO) : [0, -a1, 0]], ['hL', 'elL', rc.hO ? mz(rc.hO) : [0, -a2, 0]], ['shd', 'elL', [0, -a2 * .5, 0]],
            ['lgR', 'hip', [0, -.3, legZ]], ['knR', 'lgR', [0, -lt, 0]], ['lgL', 'hip', [0, -.3, -legZ]], ['knL', 'lgL', [0, -lt, 0]], ['cape', 'ch', [-D / 2 - .35, H - .9, 0]],
            ['mo', 'det', rc.mo || [HX + 1.98 * hs, HY - 1.3 * hs, 0]], ['ey', 'det', rc.ey || [HX + 1.9 * hs, HY + .38 * hs, 0]], ['br', 'det', [HX + 1.95 * hs, HY + 1.0 * hs, 0]], ['wp', 'hR', rc.wpO || [0, 0, 0]]]);
        BN.blend = [['elR', 'shR', 2], ['elL', 'shL', 2], ['knR', 'lgR', 2.4], ['knL', 'lgL', 2.4], ['lgR', 'hip', 2.2], ['lgL', 'hip', 2.2], ['ch', 'hip', 2.6], ['shR', 'ch', 1.6], ['shL', 'ch', 1.6]];
        const orcish = ['orc', 'uruk', 'troll'].includes(s.race), mdef = orcish ? 5 : 4;
        const brown = hex => { const hsl = {}; C(hex).getHSL(hsl); return hsl.h > .02 && hsl.h < .14 && hsl.s > .18 && hsl.l < .5; };
        const fab = hex => metalish(hex) ? (orcish ? 5 : s.rk ? 4 : 1) : brown(hex) ? 3 : 2;   // krúžky / hrdza, koža, tkanina
        const P = Part(), b = n => ({ b: n }), bm = (n, m) => ({ b: n, m }), bt = (n, t, m) => ({ b: n, t, m });
        const W2 = Part(), S2 = Part();   // samostatná zbraň a štít (padnú na zem pri smrti)
        const WP = { add(sh_, c, p, r, sc, o) { P.add(sh_, c, p, r, sc, { ...o, b: 'wp', rigid: 1 }); W2.add(sh_, c, p, r, sc, { m: o && o.m, vc: o && o.vc, t: o && o.t }); return WP; } };
        const SP = { add(sh_, c, p, r, sc, o) { P.add(sh_, c, p, r, sc, { ...o, b: 'shd', rigid: 1 }); S2.add(sh_, c, p, r, sc, { m: o && o.m }); return SP; } };
        // trup, pás, kabátec vo farbe frakcie, náplecníky, krk, hlava
        // tvarované telo zo SDF (trup s hruďou, krk, ramená so svalmi, stehná, lýtka) – farba podľa oblasti: brnenie, rukávy, nohavice, čižmy, koža
        const sleeve0 = mA ? armor : sh(armor, .9), fore0 = mA ? armor : s.race === 'orc' || s.race === 'troll' ? skin : sh(armor, .85), chY = BN.rest.ch.elements[13], knY = BN.rest.knR.elements[13];
        const regionOf = (bn, y) => bn === 'hd' ? [skin, 0, false] : bn === 'hR' || bn === 'hL' ? (mA ? [sh(armor, .9), 4, true] : [skin, 0, false]) : bn === 'ch' ? (y > chY + H + .15 ? [skin, 0, false] : [armor, fab(armor), mA]) : bn === 'hip' ? (y > hipY - .7 ? [sh(armor, .85), fab(armor), mA] : [pants, 2, false])
            : bn[0] === 's' ? [sleeve0, fab(sleeve0), mA] : bn[0] === 'e' ? [fore0, fore0 === skin ? 0 : fab(fore0), mA && fore0 === armor] : bn[0] === 'l' ? [pants, 2, false] : y < knY - ls * .38 ? [boots, 3, false] : [pants, 2, false];
        const fullTex = MM && MM.md.tex && ['orc', 'troll', 'trollking', 'wraith', 'uruk'].includes(s.race);
        if (fullTex) {   // telo z modelu s vlastným vzhľadom (ork, uruk, troll, Nazgûl): celé telo textúrou modelu; zbroj hrdinu navrch
            const texOf = (bn, y) => ['#ffffff', 0, false, 1]; const lo = sdfGeos(modelBody(BN, rc, true), regionOf), hi = sdfGeos(modelBody(BN, rc, false), texOf);
            hi.forEach(([g]) => P.add(g, '#ffffff', [0, 0, 0], [0, 0, 0], [1, 1, 1], { pre: 1, tex: 1, lod: (lo[0] || [])[0] }));
        } else if (MM && MM.md.tex) {   // textúra modelu len na koži (tvár, krk, ruky), zvyšok tela nesie zbroj a odev vo farbách jednotky
            const mix = (bn, y) => { const r = regionOf(bn, y); return r[0] === skin ? ['#ffffff', 0, false, 1] : r; }, lo = sdfGeos(modelBody(BN, rc, true), regionOf);
            sdfGeos(modelBody(BN, rc, false), mix).forEach(([g, metal, tx]) => P.add(g, '#ffffff', [0, 0, 0], [0, 0, 0], [1, 1, 1], { pre: 1, m: metal, tex: tx ? 1 : 0, lod: tx ? null : (lo.find(x => x[1] === metal) || [])[0] }));
        } else if (MM) { const lo = sdfGeos(modelBody(BN, rc, true), regionOf); sdfGeos(modelBody(BN, rc, false), regionOf).forEach(([g, metal], i) => P.add(g, '#ffffff', [0, 0, 0], [0, 0, 0], [1, 1, 1], { pre: 1, m: metal, lod: (lo.find(x => x[1] === metal) || [])[0] })); }   // telo z modelu (Meshy)
        else { const bk0 = (s.race || 'human') + ':' + (rc.fvk || 0), lo = sdfGeos(bodySDF(s.race || 'human', rc, BN, bk0, true), regionOf); for (const [g, metal] of sdfGeos(bodySDF(s.race || 'human', rc, BN, bk0), regionOf)) P.add(g, '#ffffff', [0, 0, 0], [0, 0, 0], [1, 1, 1], { pre: 1, m: metal, lod: (lo.find(x => x[1] === metal) || [])[0] }); }
        const GA = MM && !fullTex && armorModel(s.am) ? s.am : null;   // brnenie z modelu (Meshy) nasadené na telo
        if (GA) { const hi = garmentGeos(GA, BN, rc), lo = garmentGeos(GA, BN, rc, true); hi.forEach((g, metal) => { if (g) P.add(g, '#ffffff', [0, 0, 0], [0, 0, 0], [1, 1, 1], { pre: 1, m: metal, lod: lo[metal] || g }); }); }
        const noTab = (fullTex && s.race !== 'orc') || !!GA;   // trollovia, Nazgûl a uruci bez kabátca a opasku (majú vlastný vzhľad); brnenie z modelu má vlastný opasok a šosy
        if (!noTab) P.add('rbox', team, [D * .56, H * .44, 0], [0, 0, 0], [.5, H * .82, W * .44], bt('ch', 2)).add('rbox', team, [-D * .56, H * .44, 0], [0, 0, 0], [.5, H * .82, W * .44], bt('ch', 2))
            .add('cyl12', leather, [0, .35, 0], [0, 0, 0], [D * .98, 1.2, W * .8], bt('ch', 3)).add('box', '#c8a040', [D * .49, .35, 0], [0, 0, 0], [.35, 1, 1], bm('ch', 1))
            .add('sph2', rim, [-.1, H - 1.6, W / 2 - .2], [0, 0, -.1], [D * .95, 2.8, 3.4], bm('ch', mR)).add('sph2', rim, [-.1, H - 1.6, -W / 2 + .2], [0, 0, -.1], [D * .95, 2.8, 3.4], bm('ch', mR));
        if (!MM && !rc.noFace) { const lo = sdfGeos(headSDF(s.race || 'human', rc, BN, s.fv || 0, hs, HX, HY + chY, true), () => [skin, 0, false]); for (const [g, metal] of sdfGeos(headSDF(s.race || 'human', rc, BN, s.fv || 0, hs, HX, HY + chY), () => [skin, 0, false])) P.add(g, '#ffffff', [0, 0, 0], [0, 0, 0], [1, 1, 1], { pre: 1, m: metal, lod: (lo.find(x => x[1] === metal) || [])[0] }); }   // hlava zo SDF
        else if (!MM) P.add('sph2', skin, hc, [0, 0, 0], [4.1 * hs, 4.9 * hs, 3.9 * hs], b('hdc'));
        if (fullTex && mA && !noTab) P.add('taperU', armor, [.3, (H - .8) / 2 + .3, 0], [0, 0, 0], [D * 1.05, H - 1.2, W * 1.02], bt('ch', fab(armor), mA));   // textúrovaný ork v plátovej zbroji: kyrys navrch
        if (!noTab) P.add('taper', mA ? sh(armor, .85) : sh(armor, .8), [0, -1.4, 0], [0, 0, 0], [MM ? D * 1.3 : D * 1.12, 3.4, MM ? Math.max(W * .9, rc.hipW * 1.06) : W * .9], bt('hip', fab(armor), mA));
        // vrstvená výstroj: chlopne kabátca vejú pri behu, mešec a dýka na opasku, druhá lamela náplecníkov
        if (!noTab) P.add('rbox', team, [D * .5, -2.4, 0], [0, 0, 0], [.35, 4.4, W * .4], { b: 'hip', t: 2, cl: [-.2, 4.4, .5], rigid: 1 }).add('rbox', team, [-D * .5, -2.4, 0], [0, 0, 0], [.35, 4.4, W * .4], { b: 'hip', t: 2, cl: [-.2, 4.4, .5], rigid: 1 });
        if (!noTab) P.add('rbox', leather, [D * .2, -.1, W * .48], [0, 0, 0], [1.4, 1.6, .8], bt('hip', 3)).add('cyl6', '#2a1c12', [-D * .1, -.8, -W * .48], [0, 0, .5], [.5, 3, .5], bt('hip', 3));
        if (mR && !noTab) for (const z of [-1, 1]) P.add('sph2', sh(rim, .82), [-.15, H - 2.7, z * (W / 2 - .05)], [0, 0, -.1], [D * .85, 2, 3], bm('ch', mR));   // sukňa krúžkovej košele / šosy
        if (!noTab && !s.hero && s.race !== 'wraith') {   // šerpa vo farbe frakcie cez hruď, náramenná páska a spona opasku: rozpoznanie strany už z diaľky
            P.add('rbox', team, [D * .52, H * .5, 0], [.62, 0, 0], [.4, H * 1.0, 1.7], bt('ch', 2)).add('rbox', sh(team, 1.2), [-D * .52, H * .5, 0], [.62, 0, 0], [.4, H * 1.0, 1.7], bt('ch', 2))
                .add('cyl12', team, [0, -a1 * .45, 0], [0, 0, 0], [2.75, 1.1, 2.75], bt('shR', 2)).add('cyl12', team, [0, -a1 * .45, 0], [0, 0, 0], [2.75, 1.1, 2.75], bt('shL', 2));
            P.add('box', trimC, [D * .5 + .25, .35, 0], [0, 0, 0], [.2, 1.4, 1.8], bm('ch', 1));
        }
        if (!noTab && s.rk && s.race !== 'wraith') {   // elitná jednotka: plátové náramenníky so zlatým lemom, šošy a zdobený pás
            for (const z of [-1, 1]) P.add('sph2', mA ? sh(armor, 1.12) : sh(rim, 1.05), [-.1, H - 1.3, z * (W / 2 + .75)], [0, 0, z * .3], [3.4, 2.2, 3], bm('ch', 1)).add('torus', '#d8b450', [-.1, H - 1.3, z * (W / 2 + .75)], [0, 0, z * .3 + Math.PI / 2], [3.1, 1, 2.8], bm('ch', 1));
            for (let i = -1; i <= 1; i++) P.add('rbox', sh(armor, .8), [D * .55, -1.6, i * W * .22], [0, 0, .12], [.5, 3.4, W * .2], { b: 'hip', m: mA, t: 8, rigid: 1 });   // šosy (šupinové)
        }
        if (!noTab && (s.race === 'orc' || s.race === 'uruk' || s.race === 'troll') && !s.hero) {   // hrubé hroty na ramenách, handrový pás a pásy z kože
            for (const z of [-1, 1]) { P.add('cone', '#6a6458', [-.1, H - .2, z * (W / 2 + .9)], [z * .55, 0, 0], [.9, 2.4 + (fv % 3) * .6, .9], bm('ch', 1)); if (fv & 1) P.add('cone', '#6a6458', [.9, H - .5, z * (W / 2 + .5)], [z * .8, 0, .3], [.7, 1.8, .7], bm('ch', 1)); }
            P.add('rbox', sh(pants, .8), [D * .5, -2.6, 0], [0, 0, 0], [.3, 4.2, W * .5], { b: 'hip', t: 2, cl: [-.2, 4.2, .5], rigid: 1 }).add('rbox', leather, [0, -.1, 0], [0, 0, 0], [D * 1.05, .9, W * .85], bt('ch', 3));
        }
        if (!MM && !noTab && s.race !== 'wraith' && s.race !== 'troll') {   // váha brnenia: ľahké (kožený kyrys a remene), ťažké (plátový kyrys, nákrčník, ochrany predlaktí)
            if (s.wg === 0) P.add('taperU', sh(leather, 1.05), [.4, (H - .8) / 2 + .3, 0], [0, 0, 0], [D * 1.06, H * .62, W * .94], bt('ch', 3)).add('rbox', sh(leather, .8), [D * .54, H * .5, 0], [-.62, 0, 0], [.35, H * .95, 1.1], bt('ch', 3)).add('box', '#c8a040', [D * .54 + .2, H * .55, W * .18], [-.62, 0, 0], [.3, 1.1, 1.1], bm('ch', 1));
            if (s.wg === 2 || (s.hero && mA)) {
                if (s.wg === 2) P.add('taperU', sh(armor, 1.1), [.5, (H - .8) / 2 + .45, 0], [0, 0, 0], [D * 1.1, H - 1.5, W * 1.0], bt('ch', 4, 1)).add('box', trimC, [D * .56 + .3, H * .45, 0], [0, 0, 0], [.25, H * .55, .5], bm('ch', 1));   // kyrys s rebrom
                P.add('torus', sh(armor, 1.12), [-.1, H - .5, 0], [0, 0, .05], [D * .95, 1.6, W * .56], bt('ch', 4, 1));   // nákrčník
                for (const bn of ['elR', 'elL']) P.add('cyl12', sh(armor, 1.04), [0, -a2 * .5, 0], [0, 0, 0], [2.35, a2 * .62, 2.35], bt(bn, 4, 1)).add('torus', trimC, [0, -a2 * .85, 0], [0, 0, 0], [2.4, .35, 2.4], bm(bn, 1));   // ochrany predlaktí
            }
        }
        if (!MM && !noTab && mA && !s.hero && s.race !== 'wraith') P.add('torus', sh(armor, .72), [HX - .6 * hs, HY - 2.9 * hs, 0], [0, 0, .12], [3.3 * hs, 2.4, 3.3 * hs], bt('ch', 1, 1));   // kolčugová kapucňa na krku
        if (!MM && (rc.tusks || s.race === 'orc' || s.race === 'troll')) P.add('rbox', skin, [HX + 1.1 * hs, HY - 1.5 * hs, 0], [0, 0, 0], [2.4 * hs, 1.7 * hs, 3.4 * hs], b('hdc'));   // čeľusť
        // tvár (detail: pri vzdialenej kamere sa skryje)
        if (MM && rc.noFace) { }   // Nazgûl: pod kapucňou nič
        else if (MM) {   // tvár z modelu: len oči, obočie a ústa (výrazy), brada; ork má navyše kly
            if (rc.tusks && s.race === 'orc') for (const z of [-1, 1]) P.add('cone', '#e8e0c8', [rc.mo[0] + .1, rc.mo[1] - .25, z * .55], [0, 0, .1], [.32, .9, .32], b('det'));
            const ez = rc.eyeZ, ex = rc.ey[0], ey = rc.ey[1];
            const eyeC = rc.tusks || s.race === 'uruk' ? '#d8a020' : '#1a1410';
            for (const z of [-1, 1]) { if (eyeC === '#1a1410') P.add('box', '#ece6dc', [-.02, 0, z * ez], [0, 0, 0], [.14, .26, .4], b('ey')); P.add('box', eyeC, [.04, 0, z * ez], [0, 0, 0], [.12, .22, eyeC === '#1a1410' ? .2 : .3], b('ey')).add('box', '#2a1c12', [ex + .02, ey + .36, z * ez], [z * .12, 0, 0], [.18, .14, .62], b('det')); }
            P.add('box', '#3a1410', [0, 0, 0], [0, 0, 0], [.16, .14, .7], b('mo'));
            if (s.beard && !MM.md.tex) P.add('cone', hair, [rc.mo[0] - .35, rc.mo[1] - 1.2, 0], [0, 0, Math.PI - .2], [1.9, 2.8, 2.2], b('det')).add('box', hair, [rc.mo[0] + .02, rc.mo[1] + .32, 0], [0, 0, 0], [.3, .3, 1.2], b('det'));
        } else if (!rc.noFace) {
            const eye = s.race === 'orc' || s.race === 'uruk' || s.race === 'troll' ? '#d8a020' : '#1a1410';
            const mixC = (a, c, k) => { const q = C(a).lerp(C(c), k); return '#' + q.getHexString(); }, lipU = s.race === 'orc' || s.race === 'troll' || s.race === 'uruk' ? sh(skin, .6) : mixC(skin, '#9a4a48', .4), lipL = s.race === 'orc' || s.race === 'troll' || s.race === 'uruk' ? sh(skin, .7) : mixC(skin, '#b05a54', .3);   // pery: horná tmavšia, dolná plnšia
            const skD = sh(skin, .78), nz = [1, 1.2, .9, 1.35, 1.05, .85, 1.25, 1.1][fv], bw = [1, 1.25, .8, 1.5, 1, .9, 1.35, 1.1][fv];
            for (const z of [-1, 1]) P.add('box', '#1a0e0a', [HX + 2.1 * hs * (1 + (nz - 1) * .15), HY - .9 * hs, z * .22 * hs], [0, 0, 0], [.1, .12, .18], b('det'));   // nozdry (nos je súčasťou hlavy zo SDF)
            P.add('box', skD, [HX + 1.88 * hs, HY + .55 * hs, 0], [0, 0, 0], [.3, .25, 2.0 * hs], b('det'));   // oblúk obočia
            if (s.race === 'human' || s.race === 'dwarf') {   // jazva, pehy a vrásky podľa variantu tváre
                if (fv === 2 || fv === 5) P.add('box', '#b87a68', [HX + 1.98 * hs, HY + .1 * hs, (fv === 2 ? 1 : -1) * .9 * hs], [(fv === 2 ? 1 : -1) * .5, 0, 0], [.1, .12, 1.5 * hs], b('det'));
                if (fv === 4 || fv === 7) for (const z of [-1, 1]) P.add('box', sh(skin, .86), [HX + 1.9 * hs, HY - .85 * hs, z * .95 * hs], [0, 0, 0], [.1, .08, .9 * hs], b('det'));
            }
            const iris = s.race === 'elf' ? ['#4a9ac8', '#5ac88a', '#a8a8b0', '#c8a850'][fv & 3] : ['#5a3a1c', '#3a6a9a', '#4a7a3a', '#6a6a70', '#3a2a1a', '#6a8aaa', '#7a5a2a', '#2a4a5a'][fv];
            for (const z of [-1, 1]) {
                if (eye === '#1a1410') {   // oko: bielko, farebná dúhovka, zrenica, odlesk a viečka
                    P.add('box', '#ece6dc', [-.04 * hs, 0, z * .85 * hs], [0, 0, 0], [.22, .5 * hs, 1.05 * hs], b('ey')).add('box', iris, [.07 * hs, 0, z * .85 * hs], [0, 0, 0], [.14, .4 * hs, .34 * hs], b('ey')).add('box', '#0a0806', [.13 * hs, 0, z * .85 * hs], [0, 0, 0], [.1, .2 * hs, .15 * hs], b('ey')).add('box', '#ffffff', [.17 * hs, .1 * hs, z * .85 * hs + .1], [0, 0, 0], [.06, .1, .1], b('ey'));
                    P.add('box', skD, [.05 * hs, .3 * hs, z * .85 * hs], [0, 0, 0], [.28, .09, 1.1 * hs], b('det'));   // horné a dolné viečko
                } else { P.add('box', eye, [.03 * hs, 0, z * .85 * hs], [0, 0, 0], [.2, .45 * hs, .45 * hs], b('ey')); P.add('box', '#0a0806', [.12 * hs, 0, z * .85 * hs], [0, 0, 0], [.1, .42 * hs, .1], b('ey')); }   // štrbinová zrenica orka
                { const bc = s.race === 'elf' ? sh(hair, .8) : fv & 1 ? '#2a1c12' : sh(hair, .75); P.add('box', bc, [0, -.04, z * .55 * hs], [z * .05, 0, 0], [.35, .22 + .1 * bw, .75 * hs], b('br')).add('box', bc, [0, .08, z * 1.2 * hs], [z * .3, 0, 0], [.32, .18 + .08 * bw, .7 * hs], b('br')); }   // obočie (hýbe sa so šírkou emócií)
                const ear = rc.ears === 'elf' ? ['cone', [HX - .3, HY + .7 * hs, z * 2.0 * hs], [z * 1.15, 0, .45], [.55, 2.6, .55]] : rc.ears === 'orc' ? ['cone', [HX - .2, HY + .2 * hs, z * 2.1 * hs], [z * 1.45, 0, .2], [1, 3, .6]] : null;
                if (ear) P.add(ear[0], skin, ear[1], ear[2], ear[3], b('det'));
                if (rc.tusks) P.add('cone', '#e8e0c8', [HX + 2.0 * hs, HY - 1.45 * hs, z * .85 * hs], [0, 0, 0], [.4, 1, .4], b('det'));
            }
            P.add('box', '#3a1410', [0, 0, 0], [0, 0, 0], [.24, .24, 1.2 * hs], b('mo')).add('box', s.race === 'orc' || s.race === 'uruk' ? '#d8c890' : '#f0ece0', [.02, .1, 0], [0, 0, 0], [.12, .1, .95 * hs], b('mo')).add('box', '#a03a3a', [-.02, -.1, 0], [0, 0, 0], [.14, .06, .6 * hs], b('mo')).add('rbox', lipU, [.06, .2, 0], [0, 0, 0], [.24, .2, 1.3 * hs], b('mo')).add('rbox', lipL, [.08, -.2, 0], [0, 0, 0], [.26, .22, 1.1 * hs], b('mo'));   // ústa a pery (otvoria sa pri pokriku a bolesti)
            if (s.race === 'orc' || s.race === 'uruk') {   // bojová maľba, rozdielne kly a hrubšie obočie podľa variantu
                const pc = ['#c8c0a8', '#a83020', '#e8e0c8', '#2a2a2a'][fv & 3];
                if (fv < 5) for (const z of [-1, 1]) P.add('box', pc, [HX + 1.75 * hs, HY - .1 * hs, z * .55 * hs], [z * .2, 0, 0], [.14, 1.9 * hs, .32], b('det'));   // pruhy cez tvár
                if (fv % 3 === 0) P.add('box', pc, [HX + 2.05 * hs, HY + .3 * hs, 0], [0, 0, 0], [.12, .3, 2.2 * hs], b('det'));   // pás cez oči
                if (s.race === 'orc') for (const z of [-1, 1]) P.add('cone', '#e8e0c8', [rc.tusks ? HX + 2.0 * hs : HX + 2, HY - 1.45 * hs, z * (.85 + (fv % 3) * .15) * hs], [0, 0, 0], [.4 + (fv & 1) * .15, 1 + (fv % 4) * .3, .4], b('det'));
            }
            if (s.race === 'elf') { if (fv % 2) P.add('torus', '#d8c070', [HX - .1, HY + 1.0 * hs, 0], [0, 0, .08], [4.5 * hs, .45, 4.3 * hs], bm('hdc', 1)).add('sph', '#7ac8e8', [HX + 1.9 * hs, HY + 1.0 * hs, 0], [0, 0, 0], [.55, .55, .55], bm('det', 1)); else for (const z of [-1, 1]) P.add('sph', '#d8c070', [HX - .2, HY - .2, z * 2.45 * hs], [0, 0, 0], [.4, .4, .4], bm('det', 1)); }   // diadém s drahokamom alebo náušnice
            if (s.race === 'dwarf') { for (const z of [-1, 1]) P.add('box', sh(hair, .8), [HX + 1.95 * hs, HY + 1.05 * hs, z * .9 * hs], [z * .12, 0, 0], [.55, .5, 1.5 * hs], b('det'));   // huňaté obočie
                if (fv % 2 === 0) for (let i = 0; i < 3; i++) P.add('torus', '#c8a040', [HX + 1.6, HY - 3.2 - i * 1.2, 0], [0, 0, 0], [1.6, .3, 1.6], bm('det', 1)); }   // zlaté krúžky na brade
            if (rc.tusks || s.race === 'uruk') for (const [y, z, a] of [[.4, .5, .6], [-.3, -.6, -.4]]) P.add('box', '#3a2018', [HX + 2.02 * hs, HY + y * hs, z * hs], [a, 0, 0], [.12, .14, 1.4 * hs], b('det'));   // jazvy
            if ((s.beard || rc.beard) && s.race === 'human' && (fv === 3 || fv === 7)) {   // strniská a fúzy / kozia briadka
                P.add('rbox', sh(hair, .85), [HX + 2.0 * hs, HY - .75 * hs, 0], [0, 0, 0], [.3, .35, 2.5 * hs], b('det'));
                if (fv === 7) P.add('cone', hair, [HX + 1.7 * hs, HY - 2.3 * hs, 0], [0, 0, Math.PI - .15], [1.2 * hs, 2.6, 1.3 * hs], b('det'));
                else P.add('hemi', sh(hair, .8), [HX + .8 * hs, HY - 1.3 * hs, 0], [0, 0, Math.PI - .5], [3.8 * hs, 2.6 * hs, 3.9 * hs], b('det'));
            } else if (s.beard || rc.beard) {   // brada a fúzy
                const long = s.race === 'dwarf' ? 7.4 : fv === 5 ? 3 : 4;
                for (const z of [-1, 1]) P.add('cone', sh(hair, .9), [HX + 1.45 * hs, HY - 1.5 * hs - long * .4, z * .9 * hs], [z * .15, 0, Math.PI - .25], [1.6 * hs, long * .8, 1.6 * hs], b('det'));   // pramene brady
                P.add('cone', hair, [HX + 1.5 * hs, HY - 1.6 * hs - long / 2, 0], [0, 0, Math.PI - .2], [3.2 * hs, long, 3.6 * hs], b('det')).add('box', hair, [HX + 2.05 * hs, HY - .85 * hs, 0], [0, 0, 0], [.5, .6, 2.4 * hs], b('det'));
                if (s.race === 'dwarf') for (const z of [-1, 1]) P.add('cyl6', hair, [HX + 1.6, HY - 4.4, z * 1.2], [0, 0, .15], [.7, 4, .7], b('det')).add('sph', '#c8a040', [HX + 1.8, HY - 6.4, z * 1.2], [0, 0, 0], [.8, .8, .8], bm('det', 1));
            }
        } else P.add('box', '#050505', [HX + 1.7, HY - .3, 0], [0, 0, 0], [1, 3.4, 3], b('hdc'));   // prázdna tvár pod kapucňou
        // prilba alebo vlasy
        const hk = s.helmG ? s.helmG.kind : s.helm, hcol = s.helmG ? s.helmG.col : s.helmCol || (hk === 'hood' ? sh(armor, .9) : '#8a8c90'), hm = metalish(hcol);
        const hairOn = () => { const st = s.longHair || s.race === 'elf' ? -1 : fv;
            if (st === 3 || st === 6) { P.add('hemi', sh(hair, .9), [HX - .2, HY + .15 * hs, 0], [0, 0, .2], [4.3 * hs, 4.1 * hs, 4.1 * hs], b('hdc')); if (st === 6) P.add('rbox', hair, [HX - 1.2, HY + 2.2 * hs, 0], [0, 0, 0], [2.4, .5, .5], b('hdc')); return; }   // ostrihaná hlava / ježko
            if (st === 1) { P.add('hemi', hair, [HX - .3, HY + .3 * hs, 0], [0, 0, .25], [4.6 * hs, 4.6 * hs, 4.3 * hs], b('hdc')).add('sph2', hair, [HX - 1.9, HY + 3.2 * hs, 0], [0, 0, 0], [2, 2.3, 2], b('hdc')).add('cyl6', sh(hair, .7), [HX - 1.9, HY + 2.3 * hs, 0], [0, 0, 0], [.9, .7, .9], b('hdc')); return; }   // drdol
            if (st === 4) { P.add('hemi', hair, [HX - .3, HY + .3 * hs, 0], [0, 0, .25], [4.6 * hs, 4.6 * hs, 4.3 * hs], b('hdc')).add('rbox', hair, [HX + 1.7 * hs, HY + 1.8 * hs, .6], [0, 0, -.3], [.8, 1.4, 3.4], b('hdc')); return; }   // čelo so strapcom
            if (st === 2) { P.add('hemi', hair, [HX - .3, HY + .3 * hs, 0], [0, 0, .25], [4.6 * hs, 4.6 * hs, 4.3 * hs], b('hdc')); for (let i = 0; i < 4; i++) P.add('rbox', sh(hair, .9 - i * .04), [HX - 2.1 - i * .15, HY - .6 - i * 1.1, .4], [0, 0, .08], [.9, 1.5, 1.1 - i * .12], b('hdc')); return; }   // copánok
            if (st === 5) { P.add('hemi', hair, [HX - .3, HY + .3 * hs, 0], [0, 0, .25], [4.6 * hs, 4.6 * hs, 4.3 * hs], b('hdc')); for (let i = 0; i < 5; i++) P.add('sph2', sh(hair, .85 + (i % 2) * .15), [HX - 1.2 - i * .15, HY - .4 - i * .95, 2.3 * hs], [0, 0, 0], [1.1, 1.1, 1.1], b('hdc')); return; }   // cop na boku
            if (st === 7) { for (let i = 0; i < 6; i++) P.add('sph2', sh(hair, .8 + (i % 3) * .12), [HX - .5 - (i % 2) * .6, HY + .9 * hs + (i < 3 ? .7 : 0), (i % 3 - 1) * 1.45 * hs], [0, 0, 0], [1.9, 1.7, 1.7], b('hdc')); return; }   // kučery
            P.add('hemi', hair, [HX - .3, HY + .3 * hs, 0], [0, 0, .25], [4.6 * hs, 4.6 * hs, 4.3 * hs], b('hdc')); if (s.longHair || s.race === 'elf') { P.add('rbox', hair, [HX - 1.8 * hs, HY - 2.4 * hs, 0], [0, 0, .1], [1.3, 5.4 * hs, 3.8 * hs], b('hdc')); for (let i = 0; i < 5; i++) P.add('rbox', sh(hair, .9 + i % 2 * .15), [HX - 1.9 * hs + (i % 2) * .3, HY - 3 * hs - (i % 3) * .5, (i - 2) * .75 * hs], [0, 0, .08 + (i - 2) * .03], [.6, 5.4 * hs, .7], b('hdc')); }   // pramene vlasov
            else for (let i = 0; i < 4; i++) P.add('rbox', sh(hair, .85 + i % 2 * .2), [HX - 1.7 * hs, HY - .6 * hs, (i - 1.5) * 1.05 * hs], [0, 0, .2], [.7, 2.2 * hs, .9], b('hdc')); };
        const helmBase = (sc = 1) => P.add('hemi', hcol, [HX - .2, HY + .72 * hs, 0], [0, 0, .08], [4.8 * hs * sc, 5.2 * hs * sc, 4.6 * hs * sc], bt('hdc', hm ? 4 : 0, hm)).add('torus', sh(hcol, .78), [HX - .2, HY + .78 * hs, 0], [0, 0, .08], [4.9 * hs, 2.2, 4.7 * hs], bt('hdc', hm ? 4 : 0, hm));   // prilba vyššie: oči ostanú viditeľné
        if (noTab && !s.hero) { }   // trollovia, uruci a Nazgûl: prilba a vlasy sú súčasťou modelu
        else if ((hk === 'hood' || hk === 'nazgul') && MM && MM.md.tex) { }   // kapucňa a plášť sú v modeli (Nazgûl)
        else if (hk === 'hood' || hk === 'nazgul') { const hcc = hk === 'nazgul' ? '#0c0c0e' : hcol; P.add('sph2', hcc, [HX - .5, HY + .5, 0], [0, 0, .15], [5.4 * hs, 6 * hs, 5.2 * hs], b('hdc')).add('cone', hcc, [HX - 1.4, HY + 3, 0], [0, 0, .5], [3, 3.4, 3], b('hdc')).add('box', hcc, [HX - 2.2, HY - 2.6, 0], [0, 0, .15], [1, 4.6, 5], b('hdc')); }
        else if (hk === 'turban') { P.add('torus', hcol || '#c84a2a', [HX - .1, HY + .9, 0], [0, 0, .1], [4.8 * hs, 5, 4.6 * hs], b('hdc')).add('torus', sh(hcol || '#c84a2a', .85), [HX - .2, HY + 1.9, 0], [0, 0, .1], [4.2 * hs, 5, 4 * hs], b('hdc')).add('sph', hcol || '#c84a2a', [HX - .3, HY + 2.2, 0], [0, 0, 0], [3.6, 2.6, 3.6], b('hdc')); }
        else if (hk === 'cap') P.add('hemi', hcol || '#6a4a2e', [HX - .2, HY + .6, 0], [0, 0, .15], [4.6 * hs, 3.6 * hs, 4.4 * hs], b('hdc'));
        else if (hk && hk !== 'none') {
            helmBase(hk === 'elf' ? .98 : 1);
            if (hk === 'gondor' || hk === 'winged' || hk === 'citadel') {   // vysoká prilba s chráničmi líc a krídlami morských vtákov
                P.add('taper', hcol, [HX - .2, HY + 2.9 * hs, 0], [0, 0, .05], [3.6, 2.6, 3.4], bm('hdc', hm));
                for (const z of [-1, 1]) {
                    P.add('rbox', hcol, [HX + 1.2, HY - 1.1, z * 1.95 * hs], [z * .08, 0, 0], [2.2, 2.8, .35], bm('hdc', hm));
                    const wc = (s.helmG && s.helmG.wings) || '#f2f4f6';
                    P.add('box', wc, [HX - .7, HY + 2.3, z * 2.5 * hs], [z * .35, 0, -.45], [.4, 4, 1.5], b('det')).add('box', wc, [HX - 1.4, HY + 2.9, z * 2.6 * hs], [z * .4, 0, -.7], [.35, 3, 1.2], b('det'));
                }
            }
            if (hk === 'rohan' || hk === 'plume') {   // nánosník, lícnice, zlatý pás a konský chvost
                P.add('box', hcol, [HX + 2.35 * hs, HY - .2, 0], [0, 0, 0], [.35, 2.4, .55], bm('hdc', hm)).add('torus', '#c8a040', [HX - .1, HY + 1.2, 0], [0, 0, .08], [4.7 * hs, 1.2, 4.5 * hs], bm('hdc', 1));
                for (const z of [-1, 1]) P.add('rbox', hcol, [HX + 1.1, HY - 1.2, z * 1.95 * hs], [0, 0, 0], [2, 2.6, .35], bm('hdc', hm));
                const tc = (s.helmG && s.helmG.tail) || (hk === 'plume' ? '#c83a2a' : '#ece0c4');
                for (let i = 0; i < 4; i++) P.add('box', tc, [HX - 2.1 - i * .5, HY + 1.4 - i * 1.6, (i % 2 - .5) * .6], [0, 0, .5 + i * .12], [.7, 4, .7], b('det'));
            }
            if (hk === 'orc' || hk === 'troll') { for (let i = -1; i <= 1; i++) P.add('cone', sh(hcol, .7), [HX - .2 - Math.abs(i) * .5, HY + 2.6, i * 1.4], [i * .3, 0, 0], [.9, 2.4, .9], bm('det', hm)); P.add('box', sh(hcol, .8), [HX + 2.2, HY - .3, 0], [0, 0, .1], [.4, 2.6, .9], bm('hdc', hm)); }
            if (hk === 'uruk') P.add('box', sh(hcol, .7), [HX - .2, HY + 2.6, 0], [0, 0, 0], [5, 1, .6], bm('hdc', hm)).add('box', '#e8e4dc', [HX + 2.25, HY + .9, 0], [0, 0, 0], [.2, 1.4, 1.5], b('det'));
            if (hk === 'dwarf') P.add('cone', hcol, [HX - .2, HY + 3, 0], [0, 0, 0], [4.6, 3, 4.6], bm('hdc', hm)).add('box', hcol, [HX + 2.15 * hs, HY - .8, 0], [0, 0, 0], [.35, 2.4, 3.2], bm('hdc', hm)).add('box', '#1a1410', [HX + 2.35 * hs, HY - .2, 0], [0, 0, 0], [.1, .35, 2.6], b('det'));
            if (hk === 'elf') P.add('cone', '#d8b850', [HX - .4, HY + 2.6, 0], [0, 0, .25], [4.4, 6.4, 4.2], bt('hdc', 6, 1)).add('box', '#f4e2a0', [HX - .6, HY + 4.4, 0], [0, 0, .3], [3.6, 1.4, .5], bt('det', 6, 1));
            if (hk === 'mask' || hk === 'easterling') P.add('box', '#c09030', [HX + 2.15 * hs, HY - .4, 0], [0, 0, 0], [.4, 3.4, 3.8], bm('hdc', 1)).add('box', '#1a1410', [HX + 2.4 * hs, HY + .4, 0], [0, 0, 0], [.1, .35, 3], b('det'));
            if (!['gondor', 'winged', 'citadel', 'rohan', 'plume', 'orc', 'troll', 'uruk', 'dwarf', 'elf', 'mask', 'easterling'].includes(hk)) {
                P.add('box', hcol, [HX + 2.3 * hs, HY - .2, 0], [0, 0, 0], [.35, 2.2, .55], bm('hdc', hm));   // nánosník
                const hv = s.hero ? 0 : fv & 3;
                if (hv === 0 || s.hero) P.add('torus', sh(hcol, 1.1), [HX - .1, HY + .15, 0], [0, 0, .08], [5.6 * hs, 1.1, 5.3 * hs], bm('hdc', hm));   // široký okraj prilby (kotlík)
                else if (hv === 1) { P.add('cone', sh(hcol, 1.05), [HX - .2, HY + 2.3 * hs, 0], [0, 0, 0], [4.2, 4.4, 4.2], bm('hdc', hm)); for (let i = 0; i < 4; i++) P.add('box', trimC, [HX - .2 + Math.cos(i * 1.571 + .79) * 1.9, HY + 1.6 * hs, Math.sin(i * 1.571 + .79) * 1.9], [0, -(i * 1.571 + .79), 0], [.3, 3.2, .6], bm('det', 1)); P.add('sph', trimC, [HX - .2, HY + 4.6 * hs, 0], [0, 0, 0], [.7, .7, .7], bm('det', 1)); }   // špicatá prilba s pásmi
                else if (hv === 2) { P.add('rbox', sh(hcol, 1.02), [HX + 2.2 * hs, HY - .9 * hs, 0], [0, 0, 0], [.45, 3.9 * hs, 4.1 * hs], bm('hdc', hm)).add('box', '#0a0806', [HX + 2.5 * hs, HY - .1 * hs, 0], [0, 0, 0], [.1, .38, 3.2 * hs], b('det')).add('box', '#0a0806', [HX + 2.5 * hs, HY - 1.3 * hs, 0], [0, 0, 0], [.1, 2.0 * hs, .35], b('det')); }   // barbuta s T-štrbinou
                else for (const z of [-1, 1]) P.add('rbox', sh(hcol, 1.05), [HX + 1.2, HY - 1.3, z * 2.0 * hs], [0, 0, 0], [2.6, 3.2, .4], bm('hdc', hm)).add('rbox', sh(hcol, .9), [HX - 2.1, HY - .4, z * 1.2 * hs], [0, 0, 0], [1.2, 3.6, 1.4], bm('hdc', hm));   // otvorená prilba s lícnicami a chráničom šije
                if (!s.hero) { P.add('rbox', hcol, [HX - .2, HY + 2.6 * hs, 0], [0, 0, .08], [.8, 1.2, 4.8 * hs], bm('hdc', hm));   // hrebeň
                    if (fv % 2) for (const z of [-1, 1]) P.add('rbox', hcol, [HX + .9, HY - .9, z * 2.05 * hs], [0, 0, 0], [2.4, 2.2, .35], bm('hdc', hm)); }   // lícnice
            }
            if (!s.hero && s.team && !['orc', 'troll', 'uruk', 'dwarf', 'elf', 'mask', 'easterling', 'plume', 'rohan'].includes(hk))   // chochol vo farbe frakcie
                for (let i = 0; i < 3; i++) P.add('box', s.rk ? trimC : s.team, [HX - 1.5 - i * .6, HY + 3.1 * hs - i * 1.1, 0], [0, 0, .4 + i * .15], [.7, 2.6, 1 + (s.rk ? .9 : 0)], b('det'));
        } else if (!(MM && MM.md.tex)) {
            hairOn();   // textúrované modely majú vlasy v sebe
            if (s.hero && !MM) {   // hrdina bez prilby: kožená čelenka s kovovou ozdobou, aby bol rozpoznateľný aj z diaľky
                P.add('torus', sh(leather, 1.0), [HX - .1, HY + .95 * hs, 0], [0, 0, .06], [4.75 * hs, 1.1, 4.55 * hs], bt('hdc', 3)).add('box', trimC, [HX + 2.28 * hs, HY + .95 * hs, 0], [0, 0, 0], [.22, .75, .75], bm('hdc', 1));
            }
        }
        // tulec na chrbte (lukostrelci)
        if (s.quiver) { P.add('cyl12', leather, [-D / 2 - .8, H * .55, 1.4], [.35, 0, 0], [1.8, 7.4, 1.8], bt('ch', 3)); for (let i = 0; i < 4; i++) P.add('box', '#e8e4dc', [-D / 2 - .8 + (i % 2) * .5, H * .55 + 4.2, 1.4 + (i - 1.5) * .35 + 1.3], [.35, 0, 0], [.3, 1.4, .25], b('det')); }
        // plášť (látka, ktorá sa vlní)
        if (s.hero && !MM && !mA && !noTab) {   // kožený ramenný popruh a váčok na opasku
            P.add('box', sh(leather, .85), [D * .02, H * .52, 0], [0, 0, .62], [.42, H * .82, W * .64], bt('ch', 3));
            P.add('rbox', sh(leather, 1.1), [D * .1, -.8, -W * .52], [0, 0, 0], [1.6, 2.2, 1.9], bt('hip', 3)).add('box', trimC, [D * .1 + .9, -.5, -W * .52], [0, 0, 0], [.1, .5, .5], bm('hip', 1));
        }
        if (s.cape || s.hero) { const cc = s.cape || team; P.add('capeBox', cc, [0, 0, 0], [0, 0, 0], [.5, H + 3.5, W * .95], { b: 'cape', cl: [0, H + 3.5, 1], t: 2, rigid: 1 });
            if (!noTab) { P.add('sph2', sh(cc, 1.08), [-.4, H - .6, 0], [0, 0, 0], [D * .95, 2.2, W * 1.02], bt('ch', 2)).add('sph', '#d8b450', [D * .5 + .15, H - .5, 0], [0, 0, 0], [.8, .8, .8], bm('ch', 1));   // golier plášťa a spona na krku
                for (const z of [-1, 1]) P.add('sph2', sh(cc, .92), [-.7, H - 1.2, z * (W / 2 - .3)], [0, 0, z * .15], [D * .8, 1.9, 2.8], bt('ch', 2)); } }   // záhyby plášťa na pleciach
        // manžety čižiem (okraj čižmy pod kolenom) a špičky
        if (!noTab || !MM) for (const [kb, z] of [['knR', 0], ['knL', 0]]) P.add('cyl12', sh(boots, 1.3), [0, -ls * .36, 0], [0, 0, 0], [2.05, .95, 2.05], { b: kb, t: 3 });
        // pravá ruka so zbraňou
        const sleeve = mA ? armor : sh(armor, .9), fore = mA ? armor : s.race === 'orc' || s.race === 'troll' ? skin : sh(armor, .85), sT = fab(sleeve), fT = fore === skin ? 0 : fab(fore);
        P.add('cyl12', leather, [0, -a2 + 1.3, 0], [0, 0, 0], [2.4, 2, 2.4], bt('elR', 3))
        ; if (!MM) { P.add('sph2', mA ? sh(armor, .9) : skin, [.1, -.6, 0], [0, 0, 0], [1.5, 1.9, 1.3], { b: 'hR', m: mA }).add('sph2', mA ? sh(armor, .96) : sh(skin, .96), [.55, -.35, 0], [0, 0, 0], [.9, 1.1, 1.35], { b: 'hR', m: mA }).add('cyl12', mA ? sh(armor, .75) : sh(leather, 1.1), [0, .15, 0], [0, 0, 0], [1.75, 1.05, 1.75], { b: 'hR', t: mA ? 0 : 3, m: mA });
        for (let i = 0; i < 4; i++) P.add('cyl6', mA ? sh(armor, .9) : skin, [.62, -.25 - i * .42, 0], [Math.PI / 2, 0, 0], [.42, 1.35, .42], { b: 'hR', m: mA });   // prsty okolo rukoväte
        P.add('cyl6', mA ? sh(armor, .9) : skin, [.35, -.15, .65], [.5, 0, -.6], [.42, 1, .42], { b: 'hR', m: mA }); }   // palec
        if (!MM) for (const hb of ['hR', 'hL']) {   // kĺby prstov, rukavica s manžetou a pásikom
            const gl = s.wg !== 0 || mA, gc = mA ? sh(armor, .8) : sh(leather, 1.05);
            for (let i = 0; i < 4; i++) P.add('sph2', mA ? sh(armor, .98) : sh(skin, .94), [.66, -.25 - i * .42, 0], [0, 0, 0], [.5, .5, .5], { b: hb, m: mA });
            if (gl && !mA) P.add('cyl12', gc, [.05, -.28, 0], [0, 0, 0], [1.62, .55, 1.62], { b: hb, t: 3 }).add('box', sh(trimC, .8), [.55, -.28, 0], [0, 0, 0], [.18, .22, 1.7], { b: hb, t: 3 });
        }
        const Wg = s.weaponG, wb = (Wg && (Wg.blade || (Wg.grad && Wg.grad[0]) || Wg.head)) || '#b8bec6', wt = s.weapon, guard = (Wg && Wg.guard) || '#6a6058';
        let tipY = -14; const WMd = weaponModel(s.wm);
        if (WMd) {   // zbraň z modelu (Meshy): drevo a koža s farbami vrcholov, kov s leskom; vo vzdialenom zástupe zjednodušená
            const [gn, gm] = weaponGeos(s.wm), [ln, lm] = weaponGeos(s.wm, true);
            if (gn) WP.add(gn, '#ffffff', [0, 0, 0], [0, 0, 0], [1, 1, 1], { vc: 1, lod: ln || gn });
            if (gm) WP.add(gm, '#ffffff', [0, 0, 0], [0, 0, 0], [1, 1, 1], { vc: 1, m: 1, t: 0, lod: lm || gm });
            tipY = WMd.land.tip;
        }
        else if (wt === 'spear') { WP.add('cyl6', (Wg && Wg.shaft) || '#7a5a34', [0, -6, 0], [0, 0, 0], [.75, 38, .75], b('wp')).add('sph2', wb, [0, -27.5, 0], [0, 0, 0], [1.1, 5.6, .3], bm('wp', 1)).add('cone6', '#6a6a6a', [0, -24.6, 0], [Math.PI, 0, 0], [1, 1.6, 1], bm('wp', 1)); if (fv % 3 === 1) WP.add('box', wb, [0, -25.2, 0], [0, 0, 0], [.3, .5, 4.2], bm('wp', 1)); else if (fv % 3 === 2) for (const z of [-1, 1]) WP.add('cone6', wb, [0, -25.4, z * 1.1], [z * 2.4, 0, 0], [.4, 2, .4], bm('wp', 1)); WP.add('cyl6', '#8a8a8e', [0, -24.2, 0], [0, 0, 0], [1.3, 1.1, 1.3], bm('wp', 1)); if (!s.hero) for (let i = 0; i < 3; i++) WP.add('cone6', s.rk ? trimC : s.team, [0, -22.4 - i * 1.4, i % 2 ? .45 : -.45], [0, 0, 0], [.5, 2.8, .5], b('wp')); tipY = -30; }
        else if (wt === 'axe') { for (let i = 0; i < 3; i++) WP.add('cyl6', '#7a7a7e', [0, -1.5 - i * 4.3, 0], [0, 0, 0], [1, .5, 1], bm('wp', 1)); if (fv & 1) WP.add('box', wb, [-1.7, -12, 0], [0, 0, 0], [3, 3.6, .4], bm('wp', 1)).add('box', wb, [-2.6, -13.4, 0], [0, 0, -.55], [1.6, 2.4, .35], bm('wp', 1)); WP.add('sph', '#7a7a7e', [0, 3.2, 0], [0, 0, 0], [.9, .9, .9], bm('wp', 1)).add('cyl6', (Wg && Wg.haft) || '#5a3a1a', [0, -5.5, 0], [0, 0, 0], [.85, 16, .85], b('wp')).add('box', wb, [1.7, -12, 0], [0, 0, 0], [3, 3.6, .4], bm('wp', 1)).add('box', wb, [2.6, -13.4, 0], [0, 0, .55], [1.6, 2.4, .35], bm('wp', 1)).add('cone6', wb, [-1, -12, 0], [0, 0, Math.PI / 2], [.7, 1.8, .4], bm('wp', 1)); tipY = -14; }
        else if (wt === 'club' || wt === 'mace') { WP.add('taperU', '#5a4030', [0, -6.5, 0], [0, 0, 0], [2, 15, 2], b('wp')).add('sph2', wt === 'mace' ? '#7a7c80' : '#4a3424', [0, -14.5, 0], [0, 0, 0], [4.4, 5.2, 4.4], bm('wp', wt === 'mace')); for (let i = 0; i < 5; i++) WP.add('cone6', '#8a8a8a', [Math.cos(i * 1.26) * 2.2, -14.5 + (i % 2) * 1.5, Math.sin(i * 1.26) * 2.2], [Math.sin(i * 1.26) * 1.57, 0, -Math.cos(i * 1.26) * 1.57], [.6, 1.6, .6], bm('wp', 1)); tipY = -16; }
        else if (wt === 'bow' || wt === 'xbow' || wt === 'none') { }
        else {   // meče: rovný, široký obojručný, zakrivená šabľa, štíhla elfská čepeľ
            const L = Wg ? 6 + Wg.L * 3.4 : 11, wide = Wg && Wg.t === 'broad' ? 1.7 : 1.25, curve = wt === 'scimitar' || wt === 'curve' || (Wg && Wg.t === 'curve') ? .13 : wt === 'elfblade' ? .07 : 0;
            WP.add('cyl6', leather, [0, -.6, 0], [0, 0, 0], [.6, 2.4, .6], b('wp')).add('sph2', guard, [0, 1.15, 0], [0, 0, 0], [.95, .8, .95], bm('wp', 1)).add('rbox', guard, [0, -2, 0], [0, 0, 0], [.75, .6, 3.8], bm('wp', 1))
                .add('sph', guard, [0, -2.15, 1.95], [0, 0, 0], [.7, .7, .7], bm('wp', 1)).add('sph', guard, [0, -2.15, -1.95], [0, 0, 0], [.7, .7, .7], bm('wp', 1));
            for (let i = 0; i < 3; i++) WP.add('cyl6', sh(leather, .65), [0, -.15 - i * .75, 0], [0, 0, 0], [.72, .22, .72], b('wp'));   // omotávka rukoväte
            if (wt === 'scimitar' && !s.hero) for (let i = 0; i < 3; i++) WP.add('cone6', sh(wb, .7), [Math.sin(.13 * (i + 1.5) * 1.4) * (3 + i * 2.8) + .15, -3.6 - i * 2.8, 0], [0, 0, 1.1], [.3, .8, wide * .4], bm('wp', 1));   // zúbky a štrbiny na čepeli
            if (fv % 3 === 1) WP.add('sph', guard, [0, 1.45, 0], [0, 0, 0], [.95, .95, .95], bm('wp', 1)).add('cyl6', guard, [-.15, -2, 0], [Math.PI / 2, 0, 0], [.4, 4.6, .4], bm('wp', 1));   // guľový záver a rovná záštita
            else if (fv % 3 === 2) for (const z of [-1, 1]) WP.add('cone6', guard, [-.15, -2.2, z * 2.2], [z * (Math.PI / 2 + .5), 0, 0], [.4, 1.6, .4], bm('wp', 1));   // zahnuté ramená záštity
            if (!s.hero) P.add('rbox', '#3a2a1c', [-D * .15, -2.6, -W * .5 + .1], [0, 0, .75], [.8, 8, 1], bt('hip', 3)).add('box', '#c8a040', [-D * .15 + 2.2, .2, -W * .5 + .1], [0, 0, .75], [.45, 1.1, 1.2], bm('hip', 1));   // pošva na boku
            let px = 0, py = -2.3, an = 0; const seg = curve ? 4 : 1, sl = L / seg;
            for (let i = 0; i < seg; i++) {
                an += curve; const dx = Math.sin(an) * sl, dy = -Math.cos(an) * sl, mx = px + dx / 2, my = py + dy / 2;
                WP.add('box', wb, [mx, my, 0], [0, 0, an], [.3, sl + .1, wide], bm('wp', 1))
                    .add('box', sh(wb, .7), [mx, my, 0], [0, 0, an], [.36, sl * .9, wide * .2], bm('wp', 1))   // ryha uprostred čepele
                    .add('box', sh(wb, 1.25), [mx, my, wide * .46], [0, 0, an], [.33, sl + .1, wide * .1], bm('wp', 1)).add('box', sh(wb, 1.25), [mx, my, -wide * .46], [0, 0, an], [.33, sl + .1, wide * .1], bm('wp', 1));   // brúsené hrany
                px += dx; py += dy;
            }
            WP.add('cone6', wb, [px + Math.sin(an) * .7, py - Math.cos(an) * .7, 0], [0, 0, Math.PI + an], [.3, 1.4, wide], bm('wp', 1));
            tipY = py;
        }
        // ľavá ruka so štítom alebo lukom
        P.add('cyl12', leather, [0, -a2 + 1.3, 0], [0, 0, 0], [2.4, 2, 2.4], bt('elL', 3))
        ; if (!MM) { P.add('sph2', mA ? sh(armor, .9) : skin, [.1, -.6, 0], [0, 0, 0], [1.5, 1.9, 1.3], { b: 'hL', m: mA }).add('sph2', mA ? sh(armor, .96) : sh(skin, .96), [.55, -.35, 0], [0, 0, 0], [.9, 1.1, 1.35], { b: 'hL', m: mA }).add('cyl12', mA ? sh(armor, .75) : sh(leather, 1.1), [0, .15, 0], [0, 0, 0], [1.75, 1.05, 1.75], { b: 'hL', t: mA ? 0 : 3, m: mA });
        for (let i = 0; i < 4; i++) P.add('cyl6', mA ? sh(armor, .9) : skin, [.62, -.25 - i * .42, 0], [Math.PI / 2, 0, 0], [.42, 1.35, .42], { b: 'hL', m: mA });   // prsty okolo rukoväte
        P.add('cyl6', mA ? sh(armor, .9) : skin, [.35, -.15, .65], [.5, 0, -.6], [.42, 1, .42], { b: 'hL', m: mA }); }   // palec
        const SG = s.shieldG, shape = SG ? SG.shape : s.shield;
        if (shape) {
            const scol = SG ? SG.col : team, srim = SG ? SG.rim : sh(team, .55);
            if (shape === 'kite') SP.add('box', srim, [1.6, 0, -.3], [0, 0, 0], [.8, 12, 7.6], bm('shd', metalish(srim))).add('box', srim, [1.6, -6.4, -.3], [Math.PI / 4, 0, 0], [.8, 5.4, 5.4], bm('shd', metalish(srim))).add('box', scol, [1.95, 0, -.3], [0, 0, 0], [.6, 11, 6.6], bt('shd', 7)).add('box', scol, [1.95, -6.2, -.3], [Math.PI / 4, 0, 0], [.6, 4.7, 4.7], bt('shd', 7));
            else {
                SP.add('disc', srim, [1.6, 0, -.3], [0, 0, Math.PI / 2], [9.6, .8, 9.6], bm('shd', metalish(srim))).add('disc', scol, [1.95, 0, -.3], [0, 0, Math.PI / 2], [8.6, .6, 8.6], bt('shd', 7)).add('sph2', '#c8b060', [2.4, 0, -.3], [0, 0, 0], [1.6, 1.6, 1.6], bm('shd', 1));
                for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; SP.add('sph', '#c8b060', [2.3, Math.sin(a) * 4.5, -.3 + Math.cos(a) * 4.5], [0, 0, 0], [.45, .45, .45], bm('shd', 1)); }   // nity po obvode
                if (fv % 3 === 0) SP.add('cone6', '#a8a8ac', [3, 0, -.3], [0, 0, -Math.PI / 2], [1.1, 2, 1.1], bm('shd', 1));   // hrot v strede
                else if (fv % 3 === 1) for (const a of [0, Math.PI / 2]) SP.add('box', sh(srim, .85), [2.5, 0, -.3], [a, 0, 0], [.2, 8.4, .7], bm('shd', metalish(srim)));   // kovové pásy do kríža
            }
            if (!s.hero) { const wr = (fv >> 1) & 3;   // opotrebenie: tmavá záplata, prasklina alebo vyštrbený okraj
                if (wr === 1) SP.add('box', sh(scol, .55), [2.2, 2.2, 1.2], [0, 0, 0], [.14, 2.6, 2.4], b('shd')).add('box', sh(scol, .7), [2.22, 1.6, .7], [.3, 0, 0], [.1, 1.4, 1.2], b('shd'));
                else if (wr === 2) SP.add('box', '#1a1410', [2.3, -.5, -.3], [.4, 0, .25], [.1, 6.5, .22], b('shd')).add('box', '#1a1410', [2.3, -2.8, 1.4], [-.5, 0, .1], [.1, 3, .2], b('shd'));
                else if (wr === 3) SP.add('box', '#4a3a28', [1.65, 3.4, 4.1], [.3, 0, 0], [.9, 1.8, 1.7], b('shd')).add('box', sh(scol, .5), [2.2, -2.4, -2.8], [0, 0, 0], [.14, 1.8, 2.6], b('shd')); }
            if (shape === 'kite') SP.add('box', '#b89848', [2.27, 0, -.3], [0, 0, 0], [.08, 10.4, .4], bm('shd', 1));   // stredový hrebeň a puklica kopijovitého štítu
        }
        if (wt === 'bow') { const Rb = 8.5; for (let i = 0; i < 9; i++) { const th = -1.05 + i * .2625, x = Rb * Math.sin(th), y = Rb * (1 - Math.cos(th)) * .55; P.add('cyl6', '#6a4a2a', [x, y - .6, 0], [0, 0, -th * .55 + Math.PI / 2], [.65, 2.4, .65], b('hL')); } P.add('box', '#e8e4d0', [0, Rb * (1 - Math.cos(1.05)) * .55 - .6, 0], [0, 0, 0], [Rb * 2 * Math.sin(1.05), .12, .12], b('hL')); }
        if (wt === 'xbow') P.add('box', '#5a3a1a', [0, -3.5, 0], [0, 0, 0], [1, 9, 1.2], b('hL')).add('box', '#7a7e86', [0, -7.4, 0], [0, 0, 0], [11, .6, .6], bm('hL', 1));
        // nohy s kolenami a čižmami
        const greave = mA ? armor : null;
        for (const [lg, kn] of [['lgR', 'knR'], ['lgL', 'knL']]) {
            if (!MM) P.add('cyl12', boots, [0, -ls * .68, 0], [0, 0, 0], [2.6, ls * .64, 2.6], bt(kn, 3)).add('rbox', boots, [.9, -ls - .45, 0], [0, 0, 0], [4, 1.3, 2.4], bt(kn, 3));
            if (!MM) {   // podrážka, päta, špička a remienky
                const so = sh(boots, .55);
                P.add('rbox', so, [.95, -ls - 1.08, 0], [0, 0, 0], [4.25, .42, 2.6], bt(kn, 3)).add('box', so, [-.7, -ls - 1.25, 0], [0, 0, 0], [1.3, .6, 2.3], bt(kn, 3)).add('sph2', sh(boots, 1.12), [2.55, -ls - .55, 0], [0, 0, 0], [1.1, .75, 1.15], bt(kn, 3));
                for (const yy of [.38, .7]) P.add('cyl12', sh(boots, .7), [0, -ls * yy, 0], [0, 0, 0], [2.72, .22, 2.72], bt(kn, 3)).add('box', sh(trimC, .85), [1.35, -ls * yy, 0], [0, 0, 0], [.14, .3, .5], bt(kn, 3));
            }
            if (greave) P.add('sph2', greave, [.7, 0, 0], [0, 0, 0], [1.6, 1.6, 1.6], bm(kn, 1)).add('box', greave, [.85, -ls * .4, 0], [0, 0, 0], [.4, ls * .55, 1.8], bm(kn, 1));
        }
        const geo = P.build(BN, mdef), geoLow = P.build(BN, mdef, true);
        return { geoLow, lens: { lt, ls, a1, a2 }, two: !shape && (wt === 'spear' || !!(Wg && Wg.t === 'broad')), twoY: wt === 'spear' ? 7 : 1.3, tabX: D * .56 + .27, tabY: H * .5, geo, BN, wGeo: W2.n ? W2.build(null, mdef) : null, sGeo: S2.n ? S2.build(null, mdef) : null, lz: W * .2, hipY, scale: s.scale || 1, race: s.race, bow: wt === 'bow' || wt === 'xbow', spear: wt === 'spear', hunch: rc.hunch, shield: shape, tipY, fac: s.fac, emblem: !!shape && !(SG && SG.plain) };
    }
    /** Kôň, varg alebo čierny kôň ako kostrová sieť: telo, krk, hlava, chvost, nohy s kĺbmi (koleno vpredu, hlezno vzadu). */
    function mountParts(kind, s) {
        const H = s.horse || {}, wolf = kind === 'wolf', c = wolf ? (H.col || '#45403a') : kind === 'dark' ? '#121014' : H.col || '#7a5638', mane = H.mane || (wolf ? '#1e1a18' : '#2a1a10'), k = wolf ? .82 : (H.s || 1);
        const up = wolf ? 4 : 5.6, lo = wolf ? 4.2 : 6, h = up + lo + (wolf ? 4.2 : 4.6);
        const BN = skel([['mb', null, [0, h, 0]], ['nk', 'mb', [wolf ? 9 : 9.5, 2, 0]], ['hd', 'nk', wolf ? [3.5, 2.5, 0] : [5.2, 7.4, 0]], ['tl', 'mb', [wolf ? -9.5 : -11, 2.5, 0]],
            ['FR', 'mb', [7, -3, 2.9]], ['FRk', 'FR', [0, -up, 0]], ['FL', 'mb', [7, -3, -2.9]], ['FLk', 'FL', [0, -up, 0]], ['BR', 'mb', [-7.6, -2.4, 2.9]], ['BRk', 'BR', [0, -up, 0]], ['BL', 'mb', [-7.6, -2.4, -2.9]], ['BLk', 'BL', [0, -up, 0]]]);
        BN.blend = [['FRk', 'FR', 1.8], ['FLk', 'FL', 1.8], ['BRk', 'BR', 1.8], ['BLk', 'BL', 1.8], ['nk', 'mb', 3.2], ['hd', 'nk', 2.2], ['FR', 'mb', 2.4], ['FL', 'mb', 2.4], ['BR', 'mb', 2.4], ['BL', 'mb', 2.4]];
        const P = Part(), b = n => ({ b: n });
        const back = H.back || sh(c, .8);
        if (!wolf && s.hm && modelOf(s.hm)) {   // kôň z modelu: sedlo, postroj a pancier sú v modeli (Mearas bez sedla)
            const M = horseModel(s.hm, BN, k); for (const [g] of sdfGeos(M, () => ['#ffffff', 0, false, 1])) P.add(g, '#ffffff', [0, 0, 0], [0, 0, 0], [1, 1, 1], { pre: 1, tex: 1 });
            if (H.plume) P.add('cone', H.plume, [15, 29 / k, 0], [0, 0, .3], [1.2, 3.6, 1.2], b('hd'));
            return { geo: P.build(BN), BN, k, h, wolf, seat: (h + 5.2) * k, mdl: 1 };
        }
        if (wolf && s.vargModel) { const M = vargModel(BN, k); for (const [g] of sdfGeos(M, () => ['#ffffff', 0, false])) P.add(g, '#ffffff', [0, 0, 0], [0, 0, 0], [1, 1, 1], { pre: 1, tex: 1 }); return { geo: P.build(BN), BN, k, h, wolf, seat: (h + 3.6) * k, hideRider: 1 }; }   // varg s jazdcom z modelu (Meshy)
        if (wolf) P.add('sph2', c, [0, 0, 0], [0, 0, 0], [20, 8.4, 7.4], b('mb')).add('sph2', c, [6.6, .5, 0], [0, 0, 0], [9, 9.4, 7.8], b('mb')).add('sph2', back, [-7, .7, 0], [0, 0, 0], [8.6, 8.4, 7.4], b('mb')).add('sph2', sh(c, .82), [0, -2.4, 0], [0, 0, 0], [16, 5, 6.6], b('mb'));
        else {   // kôň s tvarovaným telom zo SDF (krk, hlava, svalnaté nohy s kĺbmi); svetlejšie brucho, tmavšie spodné nohy
            const M = horseSDF('horse', BN, up, lo), mbY = BN.rest.mb.elements[13];
            for (const [g] of sdfGeos(M, (bn, y) => [bn.endsWith('k') ? sh(c, .82) : bn === 'mb' && y < mbY - 3.4 ? sh(c, 1.08) : c, 0, false])) P.add(g, '#ffffff', [0, 0, 0], [0, 0, 0], [1, 1, 1], { pre: 1 });
        }
        if (wolf) for (let i = 0; i < 6; i++) P.add('cone6', back, [5 - i * 2.6, 3.8, 0], [0, 0, -.6], [1.6, 3.4, 2.4], b('mb'));
        if (wolf) {   // chrbtový hrebeň, rozstrapkané boky, jazvy, kožené popruhy s podložkou pre jazdca
            for (let i = 0; i < 9; i++) P.add('cone', sh(back, .8 + (i % 3) * .12), [6 - i * 1.7, 3.6 + Math.sin(i * .9) * .5, (i % 2 ? .8 : -.8)], [0, 0, -.2 - i * .02], [.8, 2.4 + (i % 2) * .8, .6], b('mb'));
            for (const z of [-1, 1]) { for (let i = 0; i < 4; i++) P.add('cone', sh(c, .75 + i * .06), [-7 + i * 2.7, -2.7, z * 3.6], [z * .9, 0, Math.PI], [.6, 2, .5], b('mb')); P.add('box', '#c8c0a8', [1 - z, 1.4, z * 3.6], [0, 0, .5], [3.2, .22, .22], b('mb')).add('box', '#c8c0a8', [3, .5, z * 3.5], [0, 0, -.3], [2.2, .2, .2], b('mb')); }
            P.add('rbox', '#3a2418', [-1.2, 4, 0], [0, 0, 0], [7, .9, 7.4], b('mb')).add('torus', '#2a1810', [3.6, -.8, 0], [0, 0, 0], [7.4, 1, 7.4], b('mb')).add('torus', '#2a1810', [-6, -.4, 0], [0, 0, 0], [6.4, 1, 6.4], b('mb')).add('sph', '#a08040', [3.6, -.8, 3.8], [0, 0, 0], [.8, .8, .8], { b: 'mb', m: 1 }).add('sph', '#a08040', [3.6, -.8, -3.8], [0, 0, 0], [.8, .8, .8], { b: 'mb', m: 1 });
        }
        if (!wolf) {
            P.add('box', '#5a3a1e', [-.8, 4.8, 0], [0, 0, 0], [6.4, 1.4, 6.8], b('mb')).add('box', '#4a2e18', [2.2, 6, 0], [0, 0, .3], [1.2, 2, 2.6], b('mb')).add('box', s.team || '#6a2a2a', [-.8, 4, 0], [0, 0, 0], [10, .6, 9.4], b('mb'));
            for (const z of [-1, 1]) P.add('box', '#3a2a1a', [-.4, 0, z * 4.3], [0, 0, 0], [.4, 8, .5], b('mb')).add('box', '#8a8a8a', [-.4, -4.4, z * 4.4], [0, 0, 0], [1.2, .5, .8], { b: 'mb', m: 1 });
            if (H.barding || H.caparison) {   // brnenie koňa a čaprak vo farbe frakcie
                if (H.barding) P.add('sph2', H.barding, [.4, .3, 0], [0, 0, 0], [23.6, 10.4, 8.9], { b: 'mb', m: metalish(H.barding) }).add('taperU', H.barding, [2.4, 3.6, 0], [0, 0, -.62], [4.9, 8.4, 4.1], { b: 'nk', m: metalish(H.barding) }).add('box', H.barding, [2.4, -1.2, 0], [0, 0, 1.0], [3.1, 4.2, 2.7], { b: 'hd', m: metalish(H.barding) });
                P.add('taper', s.team || '#6a2a2a', [0, -3.6, 0], [0, 0, 0], [24, 6, 9.6], { b: 'mb', cl: [-1, 6, .25] });
            }

            for (let i = 0; i < 6; i++) P.add('rbox', mane, [.6 + i * 1.05, 4.2 + i * 1.25, 0], [0, 0, -.62], [1.4, 2.8, .9], { b: 'nk', cl: [20, 1, .22] });   // hriva veje
            P.add('sph2', sh(c, .55), [5.6, -2.7, .55], [0, 0, 0], [.5, .4, .4], b('hd')).add('sph2', sh(c, .55), [5.6, -2.7, -.55], [0, 0, 0], [.5, .4, .4], b('hd'));   // nozdry
            for (const z of [-1, 1]) P.add('cone', c, [-.6, 2.6, z * 1], [z * .2, 0, -.2], [.7, 2, .7], b('hd')).add('box', kind === 'dark' || H.redEye ? '#ff3010' : '#0a0806', [1.9, .9, z * 1.62], [0, 0, 0], [.7, .6, .2], b('hd')).add('box', '#2a1a10', [2.6, -.4, z * 1.25], [0, 0, 1], [.25, 4.6, .25], b('hd'));
            P.add('box', mane, [-.8, 2.4, 0], [0, 0, .5], [1.2, 2.2, 1.6], b('hd'));
            if (H.plume) P.add('cone', H.plume, [-.6, 4.4, 0], [0, 0, .3], [1.2, 3.6, 1.2], b('hd'));
            P.add('taper', mane, [-1.6, -3.4, 0], [0, 0, .45], [1.8, 8, 1.6], { b: 'tl', cl: [0, 8, .7] });
            // postroj: ohlávka s lícnymi remienkami a strmeňmi, prsný remeň, čelný chochol a stuha v chvoste vo farbe frakcie
            const lea = '#2a1c12', tm = s.team || '#6a2a2a';
            P.add('torus', lea, [2.5, .1, 0], [0, 0, 1.0], [3.2, .45, 3.1], b('hd')).add('torus', lea, [3.3, -1.2, 0], [0, 0, 1.0], [2.6, .4, 2.5], b('hd')).add('box', lea, [1.3, 1.2, 0], [0, 0, .2], [.3, 2.8, 2.6], b('hd'))
                .add('cyl6', '#c8a040', [3.4, -1.3, 1.4], [Math.PI / 2, 0, 0], [.35, .5, .35], { b: 'hd', m: 1 }).add('cyl6', '#c8a040', [3.4, -1.3, -1.4], [Math.PI / 2, 0, 0], [.35, .5, .35], { b: 'hd', m: 1 })
                .add('rbox', lea, [4.4, 1.6, 0], [0, 0, 0], [.35, 1, 2.6], b('hd')).add('box', tm, [1.8, 3.2, 0], [0, 0, .3], [1, 2, 1.6], b('hd'));
            P.add('torus', lea, [8, -1.6, 0], [0, 0, 0], [8.6, 1, 8.6], b('mb')).add('sph', '#c8a040', [8, -1.7, 4.4], [0, 0, 0], [.9, .9, .9], { b: 'mb', m: 1 }).add('sph', '#c8a040', [8, -1.7, -4.4], [0, 0, 0], [.9, .9, .9], { b: 'mb', m: 1 });
            P.add('box', tm, [-12, 2.4, 0], [0, 0, .7], [.9, 1.4, 2.2], b('tl'));
            if (!H.barding && !H.caparison) P.add('rbox', sh(tm, .85), [-5.4, 2.4, 0], [0, 0, 0], [5, .5, 9.4], b('mb')).add('rbox', sh(tm, 1.3), [-5.4, 2.7, 0], [0, 0, 0], [4.6, .3, 9.6], b('mb'));   // sedlová dečka
        } else {
            P.add('taperU', c, [1.2, .6, 0], [0, 0, -.9], [4.4, 5, 4.2], b('nk')).add('box', c, [.6, .2, 0], [0, 0, 0], [4, 3.6, 3.6], b('hd')).add('taperU', sh(c, .85), [3.4, -.6, 0], [0, 0, -Math.PI / 2], [2, 3.8, 2], b('hd'));
            for (const z of [-1, 1]) P.add('cone', c, [-.4, 2.4, z * 1.2], [z * .2, 0, -.2], [1, 2.2, .8], b('hd')).add('box', H.eye || '#e8c040', [1.9, .9, z * 1.25], [0, 0, 0], [.3, .45, .4], b('hd')).add('cone6', '#e8e0c8', [4.4, -1.4, z * .5], [Math.PI, 0, 0], [.35, .9, .35], b('hd'));
            P.add('sph2', back, [-3, -1, 0], [0, 0, .9], [3.2, 9, 3.2], b('tl'));
            // varg: dolná čeľusť so zubami, nos, obočie, hrivka, srsť na zadkoch, jazvy, popruhy a sedlová podložka
            const jw = sh(c, .62), dk = sh(c, .45), tt = '#e8e0c8', ln = '#241812';
            P.add('taperU', jw, [3.1, -2.1, 0], [0, 0, -Math.PI / 2 - .12], [1.5, 3.7, 1.7], b('hd')).add('sph2', '#1a0e0c', [5.1, -.4, 0], [0, 0, 0], [.9, .7, 1.1], b('hd')).add('sph2', '#6a1c1c', [3.4, -1.4, 0], [0, 0, 0], [2.4, .35, 1.3], b('hd'));
            for (const z of [-1, 1]) {
                P.add('box', dk, [1.9, 1.5, z * 1.5], [0, 0, 0], [1.6, .5, .5], b('hd')).add('cone', sh(c, .5), [-.35, 2.5, z * 1.2], [z * .2, 0, -.2], [.55, 1.5, .5], b('hd'));
                for (let i = 0; i < 3; i++) P.add('cone6', tt, [4.4 - i * .8, -1.2, z * (.85 + i * .1)], [Math.PI, 0, 0], [.22, .5 + (i ? 0 : .3), .22], b('hd')).add('cone6', tt, [4.2 - i * .75, -1.5, z * (.8 + i * .12)], [0, 0, 0], [.2, .42, .2], b('hd'));
            }
            for (let i = 0; i < 7; i++) P.add('cone', sh(c, .85 + (i & 1) * .15), [-.2 - i * .35, 1.3 - i * .15, (i % 3 - 1) * 1.3], [(i % 3 - 1) * .5, 0, 2.2 + i * .08], [.55, 2.6, .55], b('nk'));   // hrivka okolo krku
        }
        for (const L of ['FR', 'FL', 'BR', 'BL']) (wolf ? P.add('taperU', c, [0, -up / 2 + .4, 0], [0, 0, 0], [2.4, up + 1.2, 2.2], b(L)).add('cyl12', c, [0, -lo / 2, 0], [0, 0, 0], [1.3, lo, 1.3], b(L + 'k')) : P)
            .add('box', wolf ? sh(c, .7) : H.hoof || '#1a1410', [wolf ? .6 : .2, -lo - .5, 0], [0, 0, 0], wolf ? [2.2, 1, 1.6] : [2, 1.2, 2], b(L + 'k'));
        if (wolf) for (const L of ['FR', 'FL', 'BR', 'BL']) for (const z of [-.5, 0, .5]) P.add('cone6', '#d8d0b8', [1.7, -lo - .65, z], [0, 0, -Math.PI / 2 - .35], [.22, .85, .22], b(L + 'k'));   // pazúry
        return { geo: P.build(BN), BN, k, h, wolf, seat: (h + (wolf ? 3.6 : 5.2)) * k };
    }
    function beastOliphant(s) {
        const c = '#8e867c', b = Part().add('sph2', c, [0, 34, 0], [0, 0, 0], [52, 34, 32]).add('sph2', c, [28, 36, 0], [0, 0, 0], [20, 20, 18]).add('cyl12', c, [36, 22, 0], [0, 0, -.4], [4, 26, 4]).add('cone', '#e8e0c8', [36, 30, 5], [0, 0, -1.9], [2, 16, 2]).add('cone', '#e8e0c8', [36, 30, -5], [0, 0, -1.9], [2, 16, 2])
            .add('box', '#6b4a2e', [-2, 56, 0], [0, 0, 0], [26, 14, 20]).add('box', s.team, [-2, 64, 0], [0, 0, 0], [28, 3, 22])
            .add('cyl6', '#4a3220', [-14, 72, 10], [0, 0, 0], [1.2, 16, 1.2]).add('cyl6', '#4a3220', [10, 72, 10], [0, 0, 0], [1.2, 16, 1.2]).add('cyl6', '#4a3220', [-14, 72, -10], [0, 0, 0], [1.2, 16, 1.2]).add('cyl6', '#4a3220', [10, 72, -10], [0, 0, 0], [1.2, 16, 1.2])
            .add('cone', s.team || '#a03020', [-2, 85, 0], [0, Math.PI / 4, 0], [36, 10, 30]).add('box', '#a03020', [0, 50, 0], [0, 0, 0], [40, 3, 34]).add('sph2', sh(c, .9), [30, 40, 10], [0, 0, 0], [3, 12, 10]).add('sph2', sh(c, .9), [30, 40, -10], [0, 0, 0], [3, 12, 10]);
        for (const [x, z] of [[-6, 5], [4, -4], [-9, -6]]) b.add('box', '#8a3a24', [x, 70, z], [0, 0, 0], [2.6, 5, 2.4]).add('sph2', '#8a5a3a', [x, 74, z], [0, 0, 0], [2, 2.2, 2]).add('cyl6', '#5a3a1a', [x + 1.8, 71, z], [0, 0, .2], [.4, 9, .4]);   // lukostrelci vo vežičke
        // olifant: chobot s článkami a koncom, veľké uši, kly s bronzovými prúžkami, záhyby kože, chvost, bojové maľby, pancier a štíty na veži
        const dk = sh(c, .72), lt = sh(c, 1.14), br = '#b08a3a', tm = s.team || '#a03020';
        for (let i = 0; i < 9; i++) { const t = i / 8, r = 5.4 - 2.8 * t; b.add('sph2', i & 1 ? dk : c, [35 + 12 * Math.pow(t, 2.1), 27 - 23 * t, 0], [0, 0, 0], [r * 1.25, r * 1.5, r * 1.25]); if (i > 1 && i < 8 && i % 2) b.add('torus', sh(c, .6), [35 + 12 * Math.pow(t, 2.1), 27 - 23 * t, 0], [Math.PI / 2, 0, 0], [r * 1.15, .5, r * 1.15]); }   // chobot: plynulá zahnutá reťaz s vráskami
        b.add('sph2', sh(c, .55), [48.5, 3.6, 0], [0, 0, 0], [2, 2.4, 2]).add('cone', sh(c, .55), [50.5, 5.6, 0], [0, 0, 1.0], [1.4, 3.2, 1.4]);
        for (const z of [-1, 1]) {
            b.add('sph2', dk, [19, 40, z * 17], [0, z * .5, 0], [2.4, 15, 12]).add('sph2', sh('#b09890', 1), [19.8, 40, z * 17.5], [0, z * .5, 0], [1.2, 12.4, 9.4])   // ucho s vnútornou stranou
             .add('cone', '#d8d0b0', [41.5, 25.6, z * 8], [z * .1, 0, -1.9], [2.8, 20, 2.8]).add('cone', '#d8d0b0', [56, 25.5, z * 8.3], [z * .1, 0, -.9], [1.9, 9, 1.9])   // kly (zalomené)
             .add('torus', br, [35.5, 28, z * 7], [0, 0, 1.2], [3.4, 1, 3.4]).add('torus', br, [44, 23.4, z * 8], [0, 0, 1.2], [3, 1, 3]).add('sph', '#0a0806', [38, 41, z * 6.4], [0, 0, 0], [1, 1, 1])
             .add('box', '#8a4a2a', [30, 52, z * 12], [0, 0, 0], [.8, 10, 14]).add('sph', br, [30.6, 52, z * 12], [0, 0, 0], [2.4, 2.4, 2.4]);   // štít zavesený na veži
            for (let i = 0; i < 5; i++) b.add('sph2', dk, [-12 + i * 9, 36 + (i % 2) * 3, z * 15.6], [0, 0, .3], [.7, 7, 1.2]);   // záhyby kože na bokoch
            b.add('box', sh(tm, .8), [-4, 33, z * 16.2], [0, 0, 0], [24, 9, .8]).add('box', br, [-4, 28, z * 16.6], [0, 0, 0], [24, .9, .6]);   // pokrývka vo farbe frakcie
        }
        b.add('cyl12', dk, [-27, 38, 0], [0, 0, .7], [2.6, 20, 2.6]).add('sph2', '#2a2420', [-33, 24, 0], [0, 0, 0], [5, 6, 5]);   // chvost so strapcom
        for (let i = 0; i < 4; i++) b.add('box', '#e8d8b0', [-14 + i * 9, 74, 11.4], [0, 0, 0], [6, 5, .6]).add('box', '#e8d8b0', [-14 + i * 9, 74, -11.4], [0, 0, 0], [6, 5, .6]);   // lat na veži
        b.add('cyl6', '#4a3220', [-12, 92, 0], [0, 0, 0], [1, 22, 1]).add('box', tm, [-4, 98, 0], [0, 0, 0], [16, 8, .5]).add('box', '#e8c060', [-4, 98, .3], [0, 0, 0], [5, 2, .2]);   // zástava
        const leg = Part().add('cyl12', c, [0, -10, 0], [0, 0, 0], [8, 20, 8]).add('cyl12', '#4a4440', [0, -20, 0], [0, 0, 0], [8.6, 1.4, 8.6]).add('torus', dk, [0, -6, 0], [Math.PI / 2, 0, 0], [8.4, .9, 8.4]).add('torus', dk, [0, -13, 0], [Math.PI / 2, 0, 0], [8.4, .9, 8.4]);
        for (let i = 0; i < 4; i++) { const a = (i - 1.5) * .55; leg.add('cone6', '#d8d0b8', [Math.sin(a) * 4.6, -20.6, Math.cos(a) * 4.6], [Math.cos(a) * 1.4, 0, Math.sin(a) * -1.4], [1.2, 1.8, 1.2]); }   // necht
        return { beast: 'oliphant', body: b.build(), leg: leg.build() };
    }
    function beastEnt(s) {
        const b = Part().add('taperU', '#5a4a32', [0, 30, 0], [0, 0, 0], [11, 40, 11]).add('sph2', '#3e6a30', [0, 56, 0], [0, 0, 0], [26, 18, 26]).add('sph2', '#4e7a38', [4, 64, 3], [0, 0, 0], [16, 12, 16]).add('box', '#c8b060', [5.6, 44, 2], [0, 0, 0], [1, 1.4, 1]).add('box', '#c8b060', [5.6, 44, -2], [0, 0, 0], [1, 1.4, 1]).add('box', '#3a2a1a', [5.6, 40, 0], [0, 0, 0], [.6, .5, 3]);
        const arm = Part().add('cyl12', '#5a4a32', [0, -10, 0], [0, 0, 0], [3, 20, 3]).add('cone', '#4a3a26', [0, -22, 0], [Math.PI, 0, 0], [5, 6, 5]).build();
        const leg = Part().add('cyl12', '#4a3a26', [0, -6, 0], [0, 0, 0], [5, 12, 5]).build();
        return { beast: 'ent', body: b.build(), arm, leg };
    }
    function bossTemplate(k) {
        if (k === 'trollking' && modelOf('trollking')) return { humanoid: humanoid({ mdl: 1, race: 'trollking', skin: SKIN.troll, armor: '#4e5446', helm: 'none', hair: '#2a2a20', weapon: 'none', team: '#4e5446', scale: 2.1, fac: 2 }) };   // Kráľ trollov z modelu (zbroj, prilba s rohmi a palcát sú v modeli)
        if ((k === 'balrog' || k === 'dragon' || k === 'fell') && modelOf(k)) return { boss: k, mdl: beastModel(k) };
        if (k === 'trollking') return { humanoid: humanoid({ race: 'troll', skin: SKIN.troll, armor: '#4e5446', helm: 'none', hair: '#2a2a20', weapon: 'club', team: '#4e5446', scale: 2.1, fac: 2 }), crown: Part().add('torus', '#d9a441', [0, 0, 0], [0, 0, 0], [5, 3, 5], { m: 1 }).add('cone', '#ffd24a', [0, 1.6, 2], [0, 0, 0], [1, 2.4, 1], { m: 1 }).add('cone', '#ffd24a', [0, 2, 0], [0, 0, 0], [1, 3, 1], { m: 1 }).add('cone', '#ffd24a', [0, 1.6, -2], [0, 0, 0], [1, 2.4, 1], { m: 1 }).build() };
        if (k === 'balrog') {
            const b = Part().add('taperU', '#24120a', [0, 44, 0], [0, 0, 0], [24, 34, 32]).add('sph2', '#2e160c', [4, 66, 0], [0, 0, 0], [16, 16, 16]).add('cone', '#0a0604', [2, 76, 7], [.6, 0, .3], [3, 14, 3]).add('cone', '#0a0604', [2, 76, -7], [-.6, 0, .3], [3, 14, 3])
                .add('taperU', '#24120a', [0, 14, 8], [0, 0, 0], [9, 28, 9]).add('taperU', '#24120a', [0, 14, -8], [0, 0, 0], [9, 28, 9]).add('box', '#1a0c06', [3, 1, 8], [0, 0, 0], [12, 2.4, 6]).add('box', '#1a0c06', [3, 1, -8], [0, 0, 0], [12, 2.4, 6]);
            const glow = Part().add('box', '#ffcc30', [11.2, 68, 3], [0, 0, 0], [1, 1.8, 2.4]).add('box', '#ffcc30', [11.2, 68, -3], [0, 0, 0], [1, 1.8, 2.4]).add('box', '#ff6a10', [11.2, 62, 0], [0, 0, 0], [1, 1.4, 6])
                .add('box', '#ff5a10', [11.6, 44, 0], [0, 0, .2], [.6, 22, 1.4]).add('box', '#ff7a20', [11.6, 40, 6], [0, 0, -.5], [.6, 14, 1]).add('box', '#ff7a20', [11.6, 40, -6], [0, 0, .6], [.6, 14, 1])
                .add('box', '#ffb040', [26, 58, 22], [0, 0, -.5], [2.4, 40, 1.6]).add('box', '#ff5a10', [26, 58, 22], [0, 0, -.5], [4, 34, 3]).build();   // oči, žeravé pukliny a plamenný meč
            const fire = Part().add('sph2', '#ff6a10', [0, 42, 0], [0, 0, 0], [40, 66, 46]).add('sph2', '#ff9a30', [0, 74, 0], [0, 0, 0], [26, 30, 30]).build();
            b.add('taperU', '#24120a', [6, 56, 18], [0, 0, -.5], [8, 26, 8]).add('taperU', '#24120a', [4, 56, -18], [0, 0, .3], [8, 26, 8]);
            // Balrog: svalnatý trup, ramená s ostňami, predlaktia a pazúry, rohatá hlava s čeľusťou a zubami, kopytá, hrebeň na chrbte
            const sk = '#2e1710', dk2 = '#170a06', hn = '#0c0604', em = '#ff6a10';
            for (const z of [-1, 1]) {
                b.add('sph2', sk, [6, 52, z * 8.5], [0, 0, 0], [12, 12, 11]).add('sph2', sk, [2, 63, z * 17], [0, 0, 0], [17, 15, 15]).add('cone', hn, [2, 72, z * 19], [z * .3, 0, .2], [4, 10, 4]).add('cone', hn, [-3, 69, z * 24], [z * .8, 0, .5], [3, 8, 3])   // prsné svaly, plecia s ostňami
                    .add('sph2', sk, [0, 28, z * 9], [0, 0, 0], [16, 32, 14]).add('cyl12', dk2, [2, 11, z * 9], [0, 0, 0], [8, 20, 8]).add('box', hn, [5, 1.4, z * 9], [0, 0, 0], [11, 2.8, 8]).add('cone6', hn, [10.5, 1.6, z * 9], [0, 0, -Math.PI / 2], [3.4, 4.6, 3.4])   // stehná, holene, kopytá
                    .add('cone', hn, [6, 33, z * 17.6], [z * 1.1, 0, .3], [2.4, 9, 2.4]);
            }
            b.add('cyl12', sk, [14, 54.5, 20.5], [0, 0, -1.35], [6, 17, 6]).add('sph2', dk2, [24, 53, 22], [0, 0, 0], [9, 8, 9]).add('cyl12', sk, [10, 52, -23], [0, 0, -.5], [6, 16, 6]).add('sph2', dk2, [17, 45, -24], [0, 0, 0], [9, 8, 9]);   // predlaktia a ruky
            for (const [x, y, z] of [[24, 53, 22], [17, 45, -24]]) for (const q of [-1, 0, 1]) b.add('cone6', hn, [x + 4.6, y - 1, z + q * 3], [0, 0, -1.3], [1.5, 5.4, 1.5]);   // pazúry
            b.add('box', dk2, [8, 59.4, 0], [0, 0, 0], [8, 3.4, 10]).add('box', '#6a0c06', [11, 60.8, 0], [0, 0, 0], [1.2, .8, 8]).add('box', hn, [12, 71, 0], [0, 0, 0], [3, 2, 17]);   // dolná čeľusť, ústa, obočie
            for (let i = 0; i < 5; i++) for (const sg of [-1, 1]) b.add('cone6', '#e8dcc0', [12.2, 61.6 + (sg > 0 ? 1.2 : -.2), (i - 2) * 1.8], [sg > 0 ? Math.PI : 0, 0, 0], [.7, 1.8, .7]);   // zuby
            b.add('cone', hn, [-1, 80, 11], [.5, 0, -.6], [3.4, 18, 3.4]).add('cone', hn, [-1, 80, -11], [-.5, 0, -.6], [3.4, 18, 3.4]).add('cone', hn, [-6, 88, 15], [.8, 0, -1], [2.2, 12, 2.2]).add('cone', hn, [-6, 88, -15], [-.8, 0, -1], [2.2, 12, 2.2]);   // veľké zakrivené rohy
            for (let i = 0; i < 9; i++) b.add('cone', i & 1 ? hn : dk2, [-11 - (i % 3) * .5, 72 - i * 4.4, 0], [0, 0, 1.9], [3.4 - i * .12, 9 - i * .3, 3.4 - i * .12]);   // chrbtový hrebeň
            for (let i = 0; i < 4; i++) for (const z of [-1, 1]) b.add('rbox', sk, [8.6, 36 + i * 4.4, z * 6], [0, 0, 0], [2.4, 2.8, 10]);   // brušné ryhy
            return { boss: 'balrog', body: b.build(), wing: wingGeo(70, '#120804', '#2a120a'), fire, glow };
        }
        if (k === 'dragon') {
            const col = '#5a1e14', bel = '#a8662e', rid = '#2a0c08', hrn = '#d8c8a0', tth = '#ece4cc', b = Part().add('sph2', col, [0, 0, 0], [0, 0, 0], [52, 26, 28]).add('sph2', bel, [0, -6, 0], [0, 0, 0], [40, 14, 20]);
            for (let i = 0; i < 5; i++) b.add('sph2', sh(col, 1 - i * .02), [22 + i * 5.6, 6 + i * 3.1, 0], [0, 0, 0], [(13 - i * 1.3) * 1.4, (13 - i * 1.3) * 1.15, (13 - i * 1.3) * 1.05]);   // zahnutý krk
            for (let i = 0; i < 5; i++) b.add('rbox', sh(bel, 1.1 - i * .03), [26 + i * 5.2, 2.5 + i * 2.8, 0], [0, 0, .5], [3.6, 2.2, 12 - i * 1.4]);   // brušné pláty krku
            b.add('sph2', col, [50, 20, 0], [0, 0, 0], [16, 10, 10]).add('taperU', col, [59, 17.8, 0], [0, 0, -Math.PI / 2], [7, 12, 8]).add('taperU', sh(col, .72), [57, 13.8, 0], [0, 0, -Math.PI / 2 - .2], [5, 11, 6.4]).add('sph2', '#6a1010', [57, 15.4, 0], [0, 0, 0], [9, 1.2, 5]);   // lebka, papuľa, spodná čeľusť, jazyk
            for (const z of [-1, 1]) {
                for (let i = 0; i < 4; i++) b.add('cone6', tth, [53.5 + i * 2.6, 15.8, z * (3 + i * .1)], [Math.PI, 0, 0], [.6, i === 1 ? 2.8 : 1.8, .6]).add('cone6', tth, [53 + i * 2.5, 14.4, z * (2.8 + i * .1)], [0, 0, 0], [.5, 1.5, .5]);   // zuby
                b.add('box', rid, [52.6, 24.6, z * 5], [0, 0, z * .1], [3.8, 1.2, 1.6]).add('cone', hrn, [45, 27, z * 4.6], [z * .3, 0, 1.0], [2.6, 15, 2.6]).add('cone', hrn, [43, 22, z * 7.4], [z * .8, 0, .9], [1.8, 8, 1.8]).add('sph2', '#0a0404', [64.6, 19.6, z * 1.8], [0, 0, 0], [1.2, 1, 1]);   // obočie, rohy, líce, nozdry
            }
            for (let i = 0; i < 6; i++) b.add('sph2', col, [-30 - i * 9, -2 + i * .6, 0], [0, 0, 0], [16 - i * 2, 12 - i * 1.4, 12 - i * 1.4]);
            b.add('cone', rid, [-86, 1, 0], [0, 0, Math.PI / 2], [5, 12, 3]).add('cone', rid, [-84, 5, 0], [0, 0, 2.2], [3, 7, 2.4]).add('cone', rid, [-84, -3, 0], [0, 0, 1.0], [3, 7, 2.4]);   // koniec chvosta s čepeľou
            for (let i = 0; i < 12; i++) b.add('cone6', i % 3 ? rid : sh(rid, 1.5), [30 - i * 6.6, 14 - Math.abs(i - 4) * .7 - (i > 6 ? (i - 6) * .5 : 0), 0], [0, 0, -.25], [2.2 + (i % 2) * .8, 5.4 + (i % 3), 1.2]);   // chrbtový hrebeň
            for (let i = 0; i < 8; i++) for (const z of [-1, 1]) b.add('rbox', sh(col, .8 + (i & 1) * .3), [20 - i * 5.4, 7 - Math.abs(i - 3), z * 12.6], [0, 0, 0], [2.6, 3.4, 1.4]);   // šupiny na bokoch
            for (let i = 0; i < 7; i++) b.add('rbox', sh(bel, 1.05), [24 - i * 7.6, -12.4, 0], [0, 0, 0], [5, .9, 15 - i * 1.2]);   // brušné pláty
            for (const [x, z] of [[14, 10], [14, -10], [-14, 10], [-14, -10]]) {
                const fr = x > 0; b.add('sph2', col, [x, -6, z * 1.1], [0, 0, 0], [fr ? 12 : 16, 17, 11]).add('cyl12', col, [x, -16, z], [0, 0, 0], [6, 18, 6]).add('box', sh(col, .7), [x + 2.5, -25, z], [0, 0, 0], [9, 2.6, 8]);   // stehno, holeň, chodidlo
                for (const q of [-1, 0, 1]) b.add('cone6', hrn, [x + 8, -24.2, z + q * 2.6], [0, 0, -Math.PI / 2 - .3], [1.2, 4.4, 1.2]);   // pazúry
            }
            return { boss: 'dragon', body: b.build(), wing: wingGeo(90, '#3a100a', '#6a2214'), glow: Part().add('box', '#ffe040', [54.4, 21.6, 4.5], [0, 0, 0], [1.8, 1.8, 1.8]).add('box', '#ffe040', [54.4, 21.6, -4.5], [0, 0, 0], [1.8, 1.8, 1.8]).build() };
        }
        const b = Part().add('sph2', '#1a1a20', [0, 0, 0], [0, 0, 0], [36, 16, 16]).add('taperU', '#1a1a20', [20, 8, 0], [0, 0, -1], [6, 18, 6]).add('box', '#24242a', [30, 14, 0], [0, 0, 0], [14, 7, 7]).add('cone', '#0a0a10', [-4, 18, 0], [0, 0, 0], [7, 14, 7]).add('sph2', '#050508', [-4, 26, 0], [0, 0, 0], [5, 5, 5]).add('box', '#ff3020', [-1.6, 26, 0], [0, 0, 0], [.8, .8, 2]);
        for (let i = 0; i < 4; i++) b.add('sph2', '#1a1a20', [-20 - i * 8, -1, 0], [0, 0, 0], [10 - i * 2, 7 - i, 7 - i]);
        return { boss: 'fell', body: b.build(), wing: wingGeo(80, '#1a1a22', '#0e0e14'), glow: Part().add('box', '#ff3020', [-1.4, 26, 0], [0, 0, 0], [1, 1, 2.2]).build() };
    }
    /** Kostrová sieť zo šablóny (H = humanoid alebo kôň): vlastné kosti pre každú jednotku, zdieľaná geometria. */
    function skinned(H, own) {
        const t = T(), bones = {}, list = H.BN.list.map(([n, p, o]) => { const bn = new t.Bone(); bn.name = n; bn.position.set(...o); bones[n] = bn; return bn; });
        H.BN.list.forEach(([n, p]) => { if (p) bones[p].add(bones[n]); });
        if (bones.shR) { bones.shR.rotation.order = 'YZX'; bones.shL.rotation.order = 'YZX'; }
        const sm = new t.SkinnedMesh(H.geo, chrMats()); /* spoločné materiály (menej prepínania stavu GPU) */ sm.add(bones[H.BN.root]); sm.updateMatrixWorld(true); sm.bind(new t.Skeleton(list)); sm.boundingSphere = H.geo.boundingSphere.clone();   // guľa zo šablóny: three.js by ju inak počítal cez kosti z každého vrcholu (sekanie pri novom vojakovi)
        sm.castShadow = sm.receiveShadow = shadowsOn();
        return { sm, B: bones };
    }
    /** Model jednotky zo šablóny: kostrová sieť jazdca a koňa, alebo skupina dielov (bossovia, olifanty, enti). */
    const heroKey = u => { const C = typeof CMB !== 'undefined' ? CMB : {}; return [C.wpn, C.shMax && C.shp <= 0 ? 1 : 0, u.dis ? 1 : 0, G && G.eq ? G.eq.w : 0].join(); };
    function rig(u) {
        const t = T(), s = specOf(u), tp = template(s), root = new t.Group(), o = { root, s, tp, ph: Math.random() * 6, mph: Math.random(), atk: 0, lc: u.c, px: u.x, py: u.y, dead: 0, sp: 0, hit: 0, hp0: u.hp, bl: 0, id: units.size, hk: u.h ? heroKey(u) : null };
        const vr = u.vr ?? (u.vr = Math.random()), tj = u.h ? 0 : (vr - .5) * .16;   // odtieň a veľkosť sa u vojakov mierne líšia
        o.own = { dirt: { value: 0 }, flash: { value: 0 }, tint: { value: new t.Color(1 + tj, 1 + tj * .8 + (vr * 7 % 1 - .5) * .05, 1 + tj * .6) } }; o.vs = u.h || u.cp ? 1 : .94 + ((vr * 13) % 1) * .12;
        o.cz = -.12; o.cv = 0; o.cx = 0; o.cxv = 0; o.ry0 = 0; o.pa = null;
        root.rotation.order = 'YXZ';
        if (tp.boss || tp.beast) {
            if (tp.mdl) {   // zviera alebo boss z modelu: kostrová sieť, nohy, krídla a ruky sú kosti
                const M = tp.mdl, k = skinned(M); root.add(k.sm); o.body = k.sm; o.MBn = k.B;
                if (M.legs) o.legs = M.legs.map(n => k.B[n]); if (M.arms) o.arms = M.arms.map(n => k.B[n]);
                if (M.wings) o.wings = M.wings.map(n => { const w = k.B[n]; w.userData.sd = n.endsWith('R') ? 1 : -1; return w; });
                if (tp.boss === 'balrog') { o.light = new t.PointLight(C('#ff7a20'), 120, 300, 1); o.light.position.y = M.H * .6; root.add(o.light); }
                return o;
            }
            if (tp.body) { o.body = mesh(tp.body); root.add(o.body); }
            if (tp.wing) { o.wings = [1, -1].map(sd => { const w = mesh(tp.wing, 'vs'); w.scale.z = sd; w.position.set(tp.boss === 'balrog' ? -6 : 0, tp.boss === 'balrog' ? 62 : 6, sd * (tp.boss === 'balrog' ? 10 : 8)); w.userData.sd = sd; root.add(w); return w; }); }
            if (tp.glow) root.add(new t.Mesh(tp.glow, mat('glow')));
            if (tp.fire) { o.fire = new t.Mesh(tp.fire, new t.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .13, depthWrite: false, blending: t.AdditiveBlending })); root.add(o.fire); o.light = new t.PointLight(C('#ff7a20'), 50, 300, 1); o.light.position.y = 70; root.add(o.light); }
            if (tp.beast === 'oliphant') o.legs = [[18, 12], [18, -12], [-18, 12], [-18, -12]].map(([x, z]) => { const l = mesh(tp.leg); l.position.set(x, 22, z); root.add(l); return l; });
            if (tp.beast === 'ent') { o.legs = [7, -7].map(z => { const l = mesh(tp.leg); l.position.set(0, 12, z); root.add(l); return l; }); o.arms = [9, -9].map(z => { const a = mesh(tp.arm); a.position.set(0, 44, z); root.add(a); return a; }); }
            if (tp.humanoid) { Object.assign(o, humanRig(tp.humanoid, root, 0, o)); if (tp.crown) { const c = mesh(tp.crown); c.position.set(.2, (RACE.troll.H + 5) , 0); o.B.ch.add(c); } }
            return o;
        }
        let seat = 0;
        if (tp.mount) {
            const M = tp.mount, k = skinned(M, o.own); k.sm.scale.setScalar(M.k); root.add(k.sm);
            o.mount = k.sm; o.MB = k.B; o.mk = M; seat = M.seat;
        }
        Object.assign(o, humanRig(tp.humanoid, root, seat, o));
        if (tp.mount && tp.mount.hideRider) o.sm.visible = false;   // jazdec je súčasťou modelu zvieraťa (varg z Meshy)
        if (u.bn || u.cmd) {   // zástava s erbom na chrbte
            const pole = mesh(Part().add('cyl6', '#3a2a1a', [0, 12, 0], [0, 0, 0], [.7, 34, .7]).add('sph', '#c8a040', [0, 29.4, 0], [0, 0, 0], [1.2, 1.2, 1.2], { m: 1 }).build());
            const f = bannerMesh(s.fac, 9, 8); f.position.set(0, 24.5, 0); pole.add(f);
            pole.position.set(-tp.humanoid.BN.list[0][2][1] * 0 - 3.2, 0, -2.4); o.B.ch.add(pole); o.flag = pole;
        }
        if (WX.night && (units.size % 5 === 0 || u.h) && !tp.humanoid.shield && !tp.humanoid.bow) { const f = new t.Mesh(prims().cone, new t.MeshBasicMaterial({ color: C('#ffb040') })); f.scale.set(1.6, 3, 1.6); f.position.set(0, 4.6, 0); const st = mesh(Part().add('cyl6', '#4a3020', [0, 1, 0], [0, 0, 0], [.6, 6, .6]).build()); st.add(f); st.position.set(.2, -.8, 0); st.rotation.z = Math.PI; o.B.hL.add(st); o.torch = f; }
        return o;
    }
    function humanRig(H, root, seat, o) {
        const t = T(), k = skinned(H, o && o.own); k.sm.scale.setScalar(H.scale * (o && o.vs || 1)); root.add(k.sm);
        if (seat) k.sm.position.y = seat - (H.hipY - .5) * H.scale;
        if (H.emblem && QN() >= 1) { const e = new t.Mesh(H.shield === 'kite' ? new t.PlaneGeometry(5.6, 8) : new t.CircleGeometry(3.6, 20), B3G.emblemMat(H.fac ?? 9)); e.rotation.y = Math.PI / 2; e.position.set(2.32, H.shield === 'kite' ? -.6 : 0, -.3); k.B.shd.add(e); }
        if (QN() >= 1 && H.tabX && !H.bow && H.race !== 'wraith') { const e = new t.Mesh(new t.PlaneGeometry(2.4, 2.8), B3G.emblemMat(H.fac ?? 9)); e.rotation.y = Math.PI / 2; e.position.set(H.tabX, H.tabY, 0); e.renderOrder = 1; k.B.ch.add(e); }   // vyšitý erb na kabátci
        const tip = new t.Object3D(); tip.position.set(0, H.tipY, 0); k.B.hR.add(tip); const mid = new t.Object3D(); mid.position.set(0, -2.6, 0); k.B.hR.add(mid);
        return { sm: k.sm, B: k.B, H, tip, mid, scaleH: H.scale * (o && o.vs || 1) };
    }

    /** Pózy pravej ruky pre smer úderu z pohľadu útočníka: [nápriah zdvih, švih, koniec zdvih, švih, lakeť pri nápriahu, lakeť na konci]. AI_D prevádza smer z pohľadu obrancu. */
    /** Kľúčové pózy úderov ako vo Warbande: pre každý druh zbrane a smer W = plný nápriah, I = dopad (stred letu čepele), E = dokončenie.
     *  Hodnoty [aR, aRy, eR, wz, wy, tw, ln]: aR zdvih ramena vpred, aRy švih ramena do strany (+ k ľavému boku), eR ohnutie lakťa,
     *  wz sklon zbrane v zápästí, wy pootočenie zbrane okolo predlaktia (ostrie), tw vytočenie trupu (+ doľava), ln záklon (+) / predklon (−). */
    const SWP = {
        one: {
            r: { W: [1.75, -1.6, 1.4, .5, 0, -.55, .05], I: [1.5, .2, .25, .15, 0, .1, -.12], E: [1.35, 1.1, .5, .3, 0, .45, -.1] },
            l: { W: [1.75, 1.5, 1.6, .5, 0, .5, .05], I: [1.5, -.2, .25, .15, 0, -.1, -.12], E: [1.35, -1.1, .5, .3, 0, -.45, -.1] },
            u: { W: [2.85, -.25, .3, -.3, 1.57, -.25, .3], I: [1.6, 0, .3, .2, 1.57, .05, -.2], E: [.9, .1, .4, .4, 1.57, .1, -.25] },
            t: { W: [.1, -.8, 1.6, -.4, 1.57, -.5, .05], I: [1.55, -.05, .05, 0, 1.57, .25, -.2], E: [1.5, 0, .15, 0, 1.57, .2, -.18] }
        },
        spear: {
            t: { W: [.2, -.35, 1.75, 0, 0, -.5, 0], I: [1.45, -.05, .1, 0, 0, .2, -.25], E: [1.4, 0, .2, 0, 0, .15, -.2] },
            u: { W: [2.6, -.3, .6, -1.2, 0, -.35, .15], I: [2.05, -.1, .45, -1.35, 0, .15, -.15], E: [1.95, 0, .5, -1.45, 0, .15, -.2] }
        }
    };
    /** Pózy pre pohľad z prvej osoby (ako vo Warbande): rovnaké údery, ale ruka a zbraň ostávajú v zábere kamery v hlave –
     *  nápriah sprava v pravom hornom rohu, zľava v ľavom, zhora nad stredom, bod a kopija zdola sprava hrotom k stredu. */
    const SWPF = {
        one: {
            r: { W: [1.45, .15, 1.2, -.6, 0, -.15, 0], I: [1.5, .2, .25, .15, 0, .1, -.12], E: [1.35, 1.1, .5, .3, 0, .45, -.1] },
            l: { W: [1.2, .7, 1.2, .9, 0, .2, 0], I: [1.5, -.2, .25, .15, 0, -.1, -.12], E: [1.35, -1.1, .5, .3, 0, -.45, -.1] },
            u: { W: [1.35, .3, 1.0, 1.4, 1.57, 0, .15], I: [1.6, .1, .3, -.5, 1.57, .05, -.2], E: [1.5, .15, .3, -1.0, 1.57, .05, -.2] },
            t: { W: [1.1, .2, 1.4, -.9, 1.57, -.2, 0], I: [1.55, -.05, .05, 0, 1.57, .25, -.2], E: [1.5, 0, .15, 0, 1.57, .2, -.18] }
        },
        spear: {
            t: { W: [1.0, .2, 1.1, -.6, 0, -.2, 0], I: [1.45, .2, .5, -.35, 0, .1, -.2], E: [1.5, .15, .45, -.4, 0, .1, -.2] },
            u: { W: [1.6, .2, 1.4, -1.6, 0, -.2, .1], I: [1.75, .2, 1.2, -1.8, 0, .1, -.15], E: [1.85, .25, .9, -1.75, 0, .1, -.2] }
        }
    };
    /** Kľúčové pózy pre druh zbrane a smer (kopija pozná len bod a bod zhora; sek zboku kopijou je bod); fp = pohľad z prvej osoby. */
    const swingKeys = (cls, d, fp) => { const B0 = fp ? SWPF : SWP, T0 = B0[cls] || B0.one; return T0[d] || (cls === 'spear' ? T0.t : T0.u); };
    const AI_D = { l: 'r', r: 'l', u: 'u', t: 't' };   // smer úderu vojaka z pohľadu obrancu → z pohľadu útočníka
    /** Póza jednotky podľa simulácie: chôdza/beh s kolenami, dýchanie, nápriah, úder, kryt, streľba, zásah, zapotácanie, útek, pád podľa smeru; jazda. */
    /** Chod koňa podľa rýchlosti (jednotky/tik): krok, klus, cval; dĺžka kroku = vzdialenosť na jeden cyklus nôh (stále rovnaká, aby kopytá nešmýkali). */
    const gaitOf = s => s < .7 ? 0 : s < 1.5 ? 1 : 2, STRIDE = [24, 40, 54];
    function pose(o, u, dt) {
        const r = o.root, mdx = u.x - o.px, mdy = u.y - o.py, moved = Math.hypot(mdx, mdy); o.px = u.x; o.py = u.y;
        o.sp += (Math.min(3.0, moved / Math.max(.3, dt)) - o.sp) * .18;
        // smer pohybu voči pohľadu: dopredu, cúvanie, úkrok do strany (animácia nôh v poseHuman)
        if (moved > .03) { const rel = Math.atan2(mdy, mdx) - u.f, k = Math.min(1, o.sp / .5); o.mf = (o.mf || 0) + (Math.cos(rel) * k - (o.mf || 0)) * .15; o.ms = (o.ms || 0) + (Math.sin(rel) * k - (o.ms || 0)) * .15; } else { o.mf = (o.mf || 0) * .85; o.ms = (o.ms || 0) * .85; }   // vyhladená skutočná rýchlosť (plynulý prechod medzi chodmi)
        if (u.c > o.lc + 5) o.atk = 1; o.lc = u.c;
        if (o.atk > 0) o.atk = Math.max(0, o.atk - dt * .07);
        const fly = u.fly > 0 ? 70 + Math.sin(clock * 4) * 6 : u.boss === 'fell' ? 34 + Math.sin(clock * 2) * 4 : 0;
        if (o.kbx || o.kbz) { o.kox = (o.kox || 0) + o.kbx * .35; o.koz = (o.koz || 0) + o.kbz * .35; o.kbx *= .65; o.kbz *= .65; if (Math.abs(o.kbx) + Math.abs(o.kbz) < .02) o.kbx = o.kbz = 0; }
        if (o.kox || o.koz) { o.kox *= Math.pow(.92, dt); o.koz *= Math.pow(.92, dt); if (Math.abs(o.kox) + Math.abs(o.koz) < .05) o.kox = o.koz = 0; }
        r.position.set(u.x + (o.kox || 0), heightAt(u.x, u.y) + fly, u.y + (o.koz || 0));
        if (u.hp < o.hp0 - .5) onHit(o, u, o.hp0 - u.hp);
        o.hp0 = u.hp;
        if (o.hit > 0) o.hit = Math.max(0, o.hit - dt * .08);
        if (o.own && o.own.flash) o.own.flash.value = Math.max(0, o.hit - .55) * 2.2;   // krátky záblesk po zásahu (hit začína na .5 – 1)
        o.dirt = Math.min(1, (o.dirt || 0) + moved * .00035 + (o.atk > 0 ? .0012 * dt : 0)); o.own.dirt.value = o.dirt * DIRT_K;   // blato a prach sa počas bitky nalepia na nohy, výstroj aj koňa
        if (u.hp <= 0) return poseDead(o, u, dt);
        const yawT = -(o.mount && !o.unh ? (u.h ? (CMB.mvA ?? u.f) : (u.hd ?? u.f)) : u.f); let d = yawT - r.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); r.rotation.y += d * Math.min(1, (o.mount ? .13 : u.boss || o.tp.beast ? .15 : .3) * dt);   // kôň hľadí smerom jazdy (nie tam, kam mieri jazdec); kôň, zver a boss sa otáčajú pomalšie a plynulejšie
        r.rotation.z = u.stun > 0 ? Math.sin(clock * 9) * .12 : 0; r.rotation.x = 0;
        if (o.lance > 0 && (o.lance -= dt) <= 0 && o.B) o.B.wp.scale.setScalar(1);
        if (o.far) { o.ph += o.sp * dt * .2; if (o.mount) o.mph += o.sp * dt / STRIDE[gaitOf(o.sp)]; o.rout = u.rout; return; }   // vzdialený vojak: hromadná sieť, animuje ho grafická karta
        if (o.B) return poseHuman(o, u, dt);
        // bossovia a zvieratá z dielov
        o.ph += o.sp * dt * .18;
        const sw = Math.sin(o.ph) * Math.min(1, o.sp / 1.1);
        if (o.legs && o.tp.beast === 'ent') o.legs.forEach((l, i) => { l.rotation.z = (i ? -sw : sw) * .35; });
        if (o.wings) { const lift = (fly || u.boss === 'fell' ? .1 : .45) + Math.sin(clock * (u.boss === 'fell' || fly ? 5 : 1.6)) * (fly || u.boss === 'fell' ? .6 : .15); o.wings.forEach(w => { w.rotation.x = -w.userData.sd * lift; }); }
        if (o.fire) { const s = 1 + Math.sin(clock * 7) * .06; o.fire.scale.set(s, s * (1 + Math.sin(clock * 5) * .05), s); o.light.intensity = 48 + Math.sin(clock * 11) * 12; }
        if (o.legs && o.tp.beast === 'oliphant') o.legs.forEach((l, i) => { l.rotation.z = Math.sin(o.ph * .6 + i * 1.6) * .25 * Math.min(1, o.sp); });
        if (o.arms) o.arms.forEach((a, i) => { a.rotation.z = (o.atk > 0 ? 1.8 - (1 - o.atk) * 1.6 : .2) + (i ? .1 : 0); });
    }
    /** Zásah: trhnutie trupom, krv (sprej, kvapky na brnení). */
    function onHit(o, u, dmg) {
        o.hit = Math.min(1, .5 + dmg / 20); o.dirt = Math.min(1, (o.dirt || 0) + .04); o.hz = u.lz || 'torso';
        if (u.lhA != null) { const k = Math.min(5, 1 + dmg * .12); o.kbx = (o.kbx || 0) + Math.cos(u.lhA) * k; o.kbz = (o.kbz || 0) + Math.sin(u.lhA) * k; }   // úder odsunie telo
        if (o.MB && !u.h && Math.random() < .35) o.spook = 40;   // kôň sa pri zásahu splaší
        if (typeof OPT !== 'undefined' && !OPT.blood || !DUST) return;
        const orc = u.t && typeof bloc === 'function' && bloc(u.fc), col = orc ? '#1e1410' : '#7a0e0a', y = heightAt(u.x, u.y) + 16 * (o.scaleH || 1) + (o.mount ? 14 : 0);
        if (dmg > 4 && Math.random() < .5) { const ka = u.lhA != null ? u.lhA : Math.random() * 6.283, dd = 4 + Math.random() * 8; decal(u.x + Math.cos(ka) * dd, u.y + Math.sin(ka) * dd, col, 1.2 + Math.random() * 1.8, true); }   // škvrny krvi na zemi pri zásahu (v smere úderu)
        for (let i = 0; i < 8; i++) { const a = Math.random() * 6.283; DUST.add({ x: u.x, y, z: u.y, vx: Math.cos(a) * (.4 + Math.random()), vy: .6 + Math.random() * 1.2, vz: Math.sin(a) * (.4 + Math.random()), g: .09, l: 22 + Math.random() * 12, c: col, s0: 2.4, s1: 1.4, a0: .9 }); }
        if (false) { o.bl++; const t = T(), m = new t.Mesh(prims().sph, MAT.blood || (MAT.blood = new t.MeshStandardMaterial({ color: C('#4a0806'), roughness: .3 }))); const sd = Math.random() < .5 ? 1 : -1; m.position.set(sd * ((o.H.hipY ? 2.3 : 2.3)), 2 + Math.random() * 6, (Math.random() - .5) * 5); m.scale.set(.4, 1.6 + Math.random() * 1.6, 1.4 + Math.random()); o.B.ch.add(m); }
    }
    /** Pád: kolená sa podlomia, telo padne od útočníka (najbližší nepriateľ); kôň padne na bok. */
    function poseDead(o, u, dt) {
        const r = o.root;
        if (!o.dead) {
            o.dead = 1; o.fall = 0;
            let best = null, bd = 60; for (const v of U) if (v.t !== u.t && v.hp > 0) { const dd = Math.hypot(v.x - u.x, v.y - u.y); if (dd < bd) { bd = dd; best = v; } }
            const away = u.lhA != null ? u.lhA : best ? Math.atan2(u.y - best.y, u.x - best.x) : u.f + Math.PI;
            o.rel = u.lz === 'legs' ? (Math.random() - .5) * .8 : away - u.f; o.kneel = u.lz === 'legs' ? .45 : u.lz === 'head' ? .05 : .2;   // zásah do nohy: najprv na koleno; do hlavy: hneď dozadu
            o.ang = 0; o.av = .01 + Math.random() * .012 + o.hit * .02; o.ox = o.oz = 0; o.sl = { vx: 0, vz: 0 }; o.slT = 0; o.limb = 0; o.lv = 0; o.rs = Math.random() - .5;
            o.dirt = Math.min(1, (o.dirt || 0) + .3); o.own.dirt.value = o.dirt * DIRT_K;
            if (typeof OPT !== 'undefined' && OPT.blood) decal(u.x, u.y, u.t && bloc(u.fc) ? '#2a1a14' : '#5a100c', 7 + Math.random() * 4, true);
            if ((u.boss || u.cmd) && !slow) { slow = { t: 100, k: .3, u }; }
            dropGear(o, u);
            // rôzne pády: dozadu, tvárou dopredu, zrútenie na kolená, s otočkou, na bok; jazdec často spadne z koňa a kôň odbehne
            const rr = Math.random(); o.dtype = u.lz === 'legs' ? 'kneel' : u.lz === 'head' ? 'back' : rr < .25 ? 'fwd' : rr < .45 ? 'collapse' : rr < .6 ? 'spin' : 'side';
            if (o.dtype === 'fwd') o.rel += Math.PI; if (o.dtype === 'collapse') o.kneel = .7; o.spinV = o.dtype === 'spin' ? (Math.random() < .5 ? -1 : 1) * .035 : 0;
            if (o.mount && o.MB && !o.tp.beast && !u.boss && !u.h && QN() >= 1 && Math.random() < .65) unhorse(o, u);
            if (!o.mount && !u.h) ragStart(o, u);
        }
        if (o.rag) { if (!DOWN) DOWN = new (T().Vector3)(0, -1, 0); ragStep(o, dt); ragApply(o); if (o.B.ey) { o.B.ey.scale.y = .12; o.B.mo.scale.y = 1.6; } return; }
        const base = r.position.y - heightAt(u.x, u.y);
        o.fall = Math.min(1, o.fall + dt * .05);
        const f = o.fall, kn = o.kneel ?? .2;
        // pád ako handrová bábka: ťažisko sa preváži, telo dopadne, odrazí sa a dosadne; končatiny dobiehajú s oneskorením
        if (f > kn && (o.ang < 1.45 || o.av)) { o.av += Math.sin(Math.max(.1, o.ang)) * .0075 * dt; o.ang += o.av * dt; if (o.ang >= 1.45) { o.ang = 1.45; o.av = Math.abs(o.av) > .008 ? -o.av * .3 : 0; } }
        const tilt = o.ang / 1.45;
        if (o.spinV) r.rotation.y += o.spinV * dt * (1 - tilt * .8);
        if (o.unh && o.sm) { const k = Math.min(1, o.fall * 1.6); o.sm.position.y = o.unh.y0 + (-1.5 - o.unh.y0) * k * k; o.sm.position.z = 7 * k; }   // jazdec padá zo sedla
        if (o.hg) stepLooseHorse(o, dt);
        o.lv += ((tilt - o.limb) * .12 - o.lv * .09) * dt; o.limb += o.lv * dt; const lb = o.limb;
        if (o.B) {
            o.B.knR.rotation.z = o.B.knL.rotation.z = -1.3 * Math.min(1, f * 3) * (1 - tilt * .6); o.B.lgR.rotation.z = o.B.lgL.rotation.z = .7 * Math.min(1, f * 3) * (1 - tilt * .7);
            o.B.shR.rotation.z = .4 + lb * (1.6 + o.rs * .6); o.B.shL.rotation.z = .3 + lb * (1.9 - o.rs * .5); o.B.elR.rotation.z = .3 + Math.abs(o.rs) * lb; o.B.ch.rotation.z = -.2 * (1 - tilt);
            o.B.hd.rotation.y = o.rs * .8 * lb;
            if (o.B.ey) { o.B.ey.scale.y = .12; o.B.mo.scale.y = 1.6; }   // oči zatvorené
        }
        // na strmom svahu sa telo zošmykne dolu
        if (tilt > .9 && o.slT < 160 && !o.tp.boss) {
            const x = u.x + o.ox, z = u.y + o.oz, gx = (heightAt(x + 3, z) - heightAt(x - 3, z)) / 6, gz = (heightAt(x, z + 3) - heightAt(x, z - 3)) / 6;
            if (Math.hypot(gx, gz) > .2) { o.sl.vx -= gx * .07 * dt; o.sl.vz -= gz * .07 * dt; }
            const fr = Math.pow(.92, dt); o.sl.vx *= fr; o.sl.vz *= fr; o.ox += o.sl.vx * dt; o.oz += o.sl.vz * dt; o.slT += dt;
        }
        const px = u.x + o.ox, pz = u.y + o.oz; r.position.set(px, heightAt(px, pz) + base, pz);
        const mnt = o.mount && !o.unh, ang = o.ang * (mnt ? .95 : 1);
        r.rotation.z = -Math.cos(o.rel) * ang; r.rotation.x = Math.sin(o.rel) * ang;
        r.position.y -= Math.min(1, f * 3) * (o.B && !mnt ? 4 * (o.scaleH || 1) * (1 - tilt * .6) : 1) + tilt * 1.5;
        if (o.MB && !o.unh) { for (const L of ['FR', 'FL', 'BR', 'BL']) { o.MB[L].rotation.z = (L[0] === 'F' ? .6 : -.5) * lb; o.MB[L + 'k'].rotation.z = (L[0] === 'F' ? -1 : .8) * lb; } o.MB.nk.rotation.z = -.4 * lb; }
    }
    /** Zhodenie z koňa: kôň sa oddelí do vlastnej skupiny, cvalom odbehne, spomalí a začne sa pásť; jazdec spadne na zem. */
    function unhorse(o, u) {
        const t = T(), r = o.root, hg = new t.Group(); hg.position.copy(r.position); hg.rotation.order = 'YXZ'; hg.rotation.y = r.rotation.y;
        r.remove(o.mount); hg.add(o.mount); scene.add(hg);
        o.unh = { y0: o.sm ? o.sm.position.y : 0 }; o.hg = { g: hg, sp: 2.4, a: -r.rotation.y + (Math.random() - .5) * .8, x: u.x, y: u.y };
    }
    function stepLooseHorse(o, dt) {
        const H = o.hg; H.sp *= Math.pow(.988, dt); if (H.sp < .05) H.sp = 0;
        H.x = Math.max(15, Math.min(BW - 15, H.x + Math.cos(H.a) * H.sp * dt)); H.y = Math.max(15, Math.min(BH - 15, H.y + Math.sin(H.a) * H.sp * dt));
        H.g.position.set(H.x, heightAt(H.x, H.y), H.y); H.g.rotation.y = -H.a;
        const sp0 = o.sp; o.sp = H.sp; poseMount(o, { h: 0, rear: 0 }, dt); o.sp = sp0;
    }
    /** Pri páde vypadne zbraň z ruky a niekedy aj štít; ostanú ležať na zemi. */
    let loose = [];
    function dropGear(o, u) {
        if (!o.B || QN() < 1 || !cam || Math.hypot(cam.position.x - u.x, cam.position.z - u.y) > 650) return;
        const t = T(), H = o.H;
        const put = (geo, bone, flat) => { const m = new t.Mesh(geo, chrMats()); m.castShadow = shadowsOn(); m.rotation.order = 'YXZ'; const p = new t.Vector3(); bone.getWorldPosition(p); m.position.copy(p); m.scale.setScalar(o.scaleH || 1); bone.scale.setScalar(.001); scene.add(m);
            const a = Math.random() * 6.283; debris.push({ m, vx: Math.cos(a) * .6, vy: .6 + Math.random() * .6, vz: Math.sin(a) * .6, wx: .08 + Math.random() * .1, wz: Math.random() * .1, rest: 0, flat }); loose.push(m); if (loose.length > 140) scene.remove(loose.shift()); };
        if (H.wGeo && Math.random() < .6) put(H.wGeo, o.B.wp, 'w');
        if (H.sGeo && !u.h && Math.random() < .35) put(H.sGeo, o.B.shd, 's');
    }
    function poseHuman(o, u, dt) {
        const B = o.B, H = o.H, C2 = typeof CMB !== 'undefined' ? CMB : {}, lerp = (a, b, k) => a + (b - a) * k;
        const climb = SGB && SGB.lad && u.x > 962 && u.x < 1000 && [250, 710].some((l, i) => Math.abs(u.y - l) < 18 && !((SGB.ladOff || [])[i] > 0)) && !o.mount && !o.tp.boss;
        // jazda: kôň (krok, klus, cval) a jazdec v sedle
        if (o.MB) poseMount(o, u, dt);
        if (climb) {   // lezenie po rebríku: telom k hradbám, ruky striedavo hore
            o.root.rotation.y = 0; const c = Math.sin(clock * 9 + o.ph);
            B.shR.rotation.set(0, 0, 2.7 + c * .4); B.elR.rotation.z = .3; B.shL.rotation.set(0, 0, 2.7 - c * .4); B.elL.rotation.z = .3;
            B.lgR.rotation.z = .6 + c * .5; B.knR.rotation.z = -1.1; B.lgL.rotation.z = .6 - c * .5; B.knL.rotation.z = -1.1; B.ch.rotation.set(0, 0, 0);
            return;
        }
        const bk = !o.mount && (o.mf || 0) < -.35, sdK = o.mount ? 0 : Math.min(1, Math.max(0, (Math.abs(o.ms || 0) - .35) / .4)), sdS = (o.ms || 0) < 0 ? -1 : 1;   // cúvanie, úkrok do strany
        o.ph += o.sp * dt * .2 * (bk ? -.75 : 1);
        const amt = Math.min(1, o.sp / 1.0), run = u.rout ? 1.3 : 1, breath = Math.sin(clock * 2.2 + o.id) * .5 + .5;
        if (!o.mount) {
            [[B.lgR, B.knR, 0], [B.lgL, B.knL, Math.PI]].forEach(([lg, kn, off]) => { const p = o.ph + off; lg.rotation.set(sdK * sdS * Math.sin(p) * .5 * amt, 0, Math.sin(p) * .62 * amt * run * (1 - sdK * .7) + (1 - amt) * .04); kn.rotation.z = -(Math.max(0, Math.cos(p)) * 1.15 * amt * run + .06 + (1 - amt) * .05); });
            B.hip.position.y = H.hipY + Math.abs(Math.sin(o.ph)) * .55 * amt - (1 - amt) * .12 - breath * .05;
            if (QN() >= 1) {   // nohy na svahu: nižšia noha nesie váhu, vyššia sa pokrčí (inverzná kinematika chodidiel)
                const sc = o.scaleH || 1, ry = o.root.rotation.y, sx = Math.sin(ry), sz = Math.cos(ry), fx = Math.cos(ry), fz = -Math.sin(ry), base = o.root.position.y, L = (H.hipY - .6) * sc, lz = (H.lz || 1.4) * sc;
                const foot = (lg, side) => { const fw = Math.sin(lg.rotation.z) * L; return heightAt(u.x + fx * fw + sx * side, u.y + fz * fw + sz * side) - base; };
                const dR = foot(B.lgR, lz), dL = foot(B.lgL, -lz), drop = Math.min(4, Math.max(0, -Math.min(dR, dL)));
                B.hip.position.y -= drop / sc;
                for (const [lg, kn, d] of [[B.lgR, B.knR, dR], [B.lgL, B.knL, dL]]) { const lift = Math.min(L * .6, Math.max(0, d + drop)); if (lift > .05) { const k = 2 * Math.acos(Math.max(.25, 1 - lift / L)); lg.rotation.z += k * .5; kn.rotation.z -= k; } }
            }
        } else {
            B.lgR.rotation.set(-.42, 0, 1.15); B.lgL.rotation.set(.42, 0, 1.15); B.knR.rotation.z = B.knL.rotation.z = -1.45; B.hip.position.y = H.hipY;
        }
        // trup: zhrbenie (orkovia, trollovia), predklon v behu, trhnutie pri zásahu, dýchanie
        const lean = (H.hunch || 0) + Math.min(.32, o.sp * .1) * (o.mount ? .4 : 1) * (bk ? -.4 : 1) + (u.rout ? .2 : 0);
        const pr = u.lhA != null ? u.lhA - u.f : Math.PI;   // zapotácanie v smere úderu
        B.ch.rotation.set(Math.sin(pr) * o.hit * .32, 0, -lean - Math.cos(pr) * o.hit * .38); B.ch.scale.set(1, 1 + breath * .012, 1 + breath * .008);
        if (u.h) { B.hd.scale.setScalar(fpv && lookOn() && !photo ? .001 : 1); B.hd.rotation.z = lookOn() ? Math.max(-.6, Math.min(.5, lp * .6)) : 0; }   // v prvej osobe bez vlastnej hlavy
        if (u.h && (CMB.kickT || 0) > 0) { const k = Math.sin((1 - CMB.kickT / 16) * Math.PI); B.lgR.rotation.z = 1.5 * k; B.knR.rotation.z = -.15; }   // kopnutie
        // ruky
        const sw = Math.sin(o.ph) * amt;
        let aR = (H.spear ? .9 : .2) - sw * .45, aRy = 0, eR = H.spear ? 1.1 : .5 + breath * .05, aL = H.bow ? .35 : .3 + sw * .4, eL = H.shield ? .9 : .45;
        // údery ako vo Warbande: kľúčové pózy podľa druhu zbrane (SWP), čas z bojovej simulácie (nápriah C.rd / u.wu, let čepele C.sw / u.as)
        let wz = H.spear ? 0 : .45, wy = 0, tw0 = 0, ln0 = 0;   // zápästie (sklon a pootočenie zbrane), vytočenie a záklon trupu
        const fpH = u.h && fpv && lookOn() && !photo, cls = H.spear ? 'spear' : 'one', R0 = () => [aR, aRy, eR, wz, wy, 0, 0], setK = k => { [aR, aRy, eR, wz, wy, tw0, ln0] = k; }, mixK = (a, b, k) => a.map((v, i) => lerp(v, b[i], k)), ease = k => k * k * (3 - 2 * k);
        const wind = (d, p) => { const P = swingKeys(cls, d, fpH); setK(mixK(R0(), P.W, ease(Math.min(1, p)))); };
        const strike = (d, p) => { const P = swingKeys(cls, d, fpH); setK(p < .45 ? mixK(P.W, P.I, ease(p / .45)) : mixK(P.I, P.E, ease((p - .45) / .55))); };
        if (u.wu > 0 && u.wu0) wind(u.wd ? AI_D[u.wd] : 'u', (1 - u.wu / u.wu0) * 1.25);   // nápriah – smer čitateľný z pózy
        else if (u.as && !u.h) strike(u.as.d ? AI_D[u.as.d] : 'u', Math.min(1, u.as.t / Math.max(1, u.as.dur)));   // čepeľ letí presne podľa simulácie (aiSwing)
        else if (o.atk > 0) { const p = 1 - o.atk; if (H.bow) { aL = 1.5; eL = 0; aR = 1.45; eR = 2.2 * (1 - Math.min(1, p * 3)); aRy = .3; } else if (!u.h) strike(u.lwd ? AI_D[u.lwd] : (H.spear ? 't' : 'u'), Math.min(1, .55 + p)); }   // dokončenie úderu (nápor, staršie údery)
        if (u.h) {
            const swg = C2.swing, R = C2.rd, S = C2.sw; o.atk = 0;
            if (R) { wind(R.d, R.t / Math.max(1, R.ready)); const hold = R.t - R.ready - 20; if (hold > 0) { const k = Math.min(1, hold / 60) * .035; aR += Math.sin(clock * 55) * k; eR += Math.cos(clock * 47) * k; } }   // plný nápriah: ruka sa jemne chveje
            else if (S) strike(S.d, Math.min(1, S.t / Math.max(1, S.dur)));
            else if (swg && swg.t > 0) { const p = 1 - swg.t / 10; if (swg.k === 'c') { aR = 1.4; eR = .2; } else strike(swg.d || (swg.k === 't' ? 't' : 'r'), Math.min(1, .45 + p * .55)); }
            if (C2.couch) { aR = 1.5; aRy = .1; eR = .25; }
            if (C2.blk) { aL = 1.25; eL = .95; if (OPT.blkDir === 'manual' && !(C2.shp > 0)) { const Bk = { u: [2.6, .2, .9], l: [1.8, .9, 1], r: [1.8, -.9, 1], t: [1.1, .3, 1.2] }[C2.bd] || [1.9, 0, .9]; aR = Bk[0]; aRy = Bk[1]; eR = Bk[2]; } else if (!C2.shp) { aR = Math.max(aR, 1.7); eR = 1.1; } }
            if (C2.draw > 0 && H.bow) { aL = 1.55; eL = 0; aR = 1.5; eR = 2.3 * Math.min(1, C2.draw / 20); aRy = .32; }
        }
        if (H.bow && !(o.atk > 0) && !(u.h && C2.draw > 0)) { aL = .5 + sw * .3; eL = .4; }
        if (u.h && fpv && lookOn() && !C2.rd && !C2.sw && !(C2.swing && C2.swing.t > 0) && !C2.blk && !(C2.draw > 0)) { aR = FPP.aR; eR = FPP.eR; aRy = FPP.aRy; if (!H.bow) { aL = FPP.aL; eL = FPP.eL; } }   // prvá osoba: zbraň a štít pred sebou
        if (!u.t && !u.h && u.hx != null && typeof fmOf === 'function' && fmOf(u) === 'wall' && !(o.atk > 0) && !(u.wu > 0)) { aL = 1.2; eL = 1; }   // štítový val: štíty vpred
        if (u.boss && u.atk) { const p = 1 - u.atk.t / u.atk.t0; wind('u', Math.min(1, p * 1.3)); }   // Kráľ trollov dvíha kyjak
        if (u.rout) { aR = 2.4 + sw * .4; eR = 1.2; aL = 2.4 - sw * .4; eL = 1.2; }
        if (o.torch && !(u.h && (C2.blk || C2.draw))) { aL = Math.max(aL, 1.2); eL = 1.1; }
        // lukostrelec: ruka siahne do tulca za chrbtom, založí šíp a napne tetivu (podľa času do výstrelu)
        if (H.bow && !u.h && !o.mount && !(o.atk > 0) && u.c > 0 && u.c < 28 && (u.bd ?? 999) < (WX.r || 190) + 30) { if (u.c > 17) { aR = 2.75; aRy = -.7; eR = 1.7; } else { const k = 1 - u.c / 17; aL = 1.5; eL = 0; aR = 1.45; eR = 2.2 * k; aRy = .3; } }
        // výkrok do úderu a dotočenie trupu
        if (o.atk > 0 && !H.bow && !o.mount) { const p = 1 - o.atk, lu = Math.sin(Math.min(1, p * 1.8) * Math.PI); B.hip.position.x = lu * 1.6; B.lgL.rotation.z += .55 * lu; B.knL.rotation.z -= .35 * lu; B.lgR.rotation.z -= .3 * lu; B.ch.rotation.z -= .15 * lu; } else if (!o.mount) B.hip.position.x *= .8;
        // reakcia podľa miesta zásahu: hlava trhne dozadu, ruka sa chytí za ruku, noha podklesne
        if (!u.h) B.hd.rotation.z *= .8;
        if (o.hit > .2 && o.hz) { const k = o.hit; if (o.hz === 'head') { B.hd.rotation.z = Math.min(.9, B.hd.rotation.z + .8 * k); B.ch.rotation.z += .2 * k; } else if (o.hz === 'arm') { aL = 1.1; eL = 1.9; aR -= .5 * k; } else if (o.hz === 'legs' && !o.mount) { B.hip.position.y -= 1.8 * k; B.knR.rotation.z -= 1.1 * k; B.lgR.rotation.z += .55 * k; } }
        // živý zástup: jasot po víťazstve, štíty nad hlavu pod šípmi, nečinní búchajú zbraňou do štítu alebo pokrikujú
        let shout = 0, raise = 0;
        const idle = !(o.atk > 0) && !(u.wu > 0) && !u.h && !u.rout && !(u.stun > 0);
        if (idle && (FRX.win0 && !u.t || FRX.win1 && u.t)) { const c = Math.sin(clock * 6 + o.id * 1.7); aR = 2.7 + c * .25; eR = .3; aRy = 0; if (!H.shield || o.id % 2) { aL = 2.5 - c * .25; eL = .3; } shout = 1; if (!o.mount) B.hip.position.y += Math.max(0, c) * .7; }
        else if (idle && o.raise > 0 && H.shield) { aL = 2.35; eL = .5; raise = Math.min(1, o.raise / 10); }
        else if (idle && o.sp < .3 && (u.bd ?? 0) > 170) {
            const kind = o.id % 4;
            if (kind === 0 && H.shield && !H.bow) { const beat = Math.pow(Math.max(0, Math.sin(clock * 5.5 + (u.t ? 1.3 : 0))), 6); aR = 1.1 + beat * .55; eR = 1.3 - beat * .45; aRy = .55; aL = .95; eL = 1; shout = beat > .5 ? 1 : 0; }
            else if (kind === 1 && ((clock * .45 + o.id * .13) % 3) < 1.1) { aR = 2.5 + Math.sin(clock * 9 + o.id) * .25; eR = .35; aRy = 0; shout = 1; }
            else B.hd.rotation.y = Math.sin(clock * .6 + o.id) * .45;
        }
        if (!idle || o.sp >= .3) B.hd.rotation.y *= .9;
        if (o.point > 0) { o.point -= dt; if (idle || u.h && !C2.rd && !(C2.swing && C2.swing.t > 0) && !C2.blk && !(C2.draw > 0)) { const k = Math.min(1, o.point / 15); aR = 1.6 * k + aR * (1 - k); eR = .05; aRy = .25; shout = 1; } }   // veliteľ ukazuje mečom smer
        // spätný ráz: zbraň odskočí od krytu
        const rc = (u.rc || 0) > 0 ? u.rc / 14 : 0; if (rc) { aR += .6 * rc; eR += .5 * rc; aRy *= 1 - rc * .5; u.rc -= dt; }
        // plynulé prechody medzi pózami
        const tg = [aR, aRy, eR, aL, eL, wz, wy, tw0, ln0]; if (!o.pa || o.pa.length < 9) o.pa = tg.slice(); const kb = 1 - Math.pow(u.h ? .25 : .42, dt); for (let i = 0; i < 9; i++) o.pa[i] += (tg[i] - o.pa[i]) * kb; [aR, aRy, eR, aL, eL, wz, wy, tw0, ln0] = o.pa;
        if (B.wp) { B.wp.rotation.order = 'ZYX'; B.wp.rotation.set(0, wy, wz); }   // zbraň v zápästí: najprv pootočenie ostria okolo čepele, potom sklon
        // výraz tváre: pokrik pri útoku, bolesť pri zásahu, žmurkanie
        if (B.mo) {
            const yell = shout || o.atk > .3 || u.wu > 0 || u.rout || (u.h && (C2.rd || (C2.swing && C2.swing.t > 0) || C2.cry > 840)), mT = yell ? 3.8 : o.hit > .3 ? 2.6 : 1;
            o.mo = (o.mo || 1) + (mT - (o.mo || 1)) * Math.min(1, .3 * dt); B.mo.scale.set(1, o.mo, 1 + (o.mo - 1) * .12);
            if (B.br) { const bt2 = yell ? -.3 : o.hit > .3 ? .35 : 0; o.br = (o.br || 0) + (bt2 - (o.br || 0)) * Math.min(1, .35 * dt); B.br.position.y = o.br; B.br.rotation.x = 0; }   // hnev: obočie dole; bolesť a prekvapenie: hore
            B.ey.scale.y = o.hit > .45 ? .4 : ((clock * .55 + o.id * .37) % 4) < .05 ? .15 : yell ? .8 : 1;
        }
        B.shR.rotation.set(0, aRy, aR); B.elR.rotation.z = Math.max(0, eR);
        B.shL.rotation.set(0, 0, aL); B.elL.rotation.z = Math.max(0, eL);
        B.shL.rotation.x = H.bow ? .15 : -.12; B.shR.rotation.x = .12;
        B.shd.rotation.z = -(aL + eL) * .92 + raise * 1.45;   // štít ostáva zvislo čelom vpred (pod šípmi nad hlavou)
        if (H.shield && !u.h && u.tg && (u.bd ?? 99) < 45) { let ra = Math.atan2(u.tg.y - u.y, u.tg.x - u.x) - u.f; ra = Math.atan2(Math.sin(ra), Math.cos(ra)); B.shd.rotation.y = Math.max(-.6, Math.min(.6, -ra)) * .6; } else B.shd.rotation.y *= .9;   // štít sa natočí k súperovi
        if (!u.h && !o.mount && (u.bd ?? 99) < 26 && !(o.atk > 0)) { B.ch.rotation.z -= .14; if (H.shield) { B.shL.rotation.z = Math.max(B.shL.rotation.z, .95); B.elL.rotation.z = Math.max(B.elL.rotation.z, 1); } if (o.sp < .3) { B.lgL.rotation.z += .3; B.lgR.rotation.z -= .22; B.knR.rotation.z -= .2; } }   // tlačenica v šíku: predklon, štít vpred, nohy zapreté
        { let twm = 0; if (o.mount && !o.unh) { twm = -u.f - o.root.rotation.y; twm = Math.max(-1.3, Math.min(1.3, Math.atan2(Math.sin(twm), Math.cos(twm)))); }   // jazdec sa v sedle natočí k cieľu, kôň ide rovno
            const tw = o.mount || u.rout ? twm * .75 : Math.sin(o.ph) * .16 * amt, wsh = !o.mount && amt < .25 ? Math.sin(clock * .7 + o.id * 2.1) : 0;   // protismerné otáčanie ramien a bokov pri chôdzi, prenášanie váhy v pokoji
            B.ch.rotation.y = tw0 + aRy * .15 + tw; B.hip.rotation.y = (twm ? twm * .25 : -tw * .8) - tw0 * .25; B.ch.rotation.z += ln0; B.hip.position.z = wsh * .22; B.ch.rotation.x += wsh * .02 + Math.sin(o.ph * 2) * .02 * amt; }   // trup sa otáča so švihom
        // plášť a zástava na pružine: vejú v behu, rozhojdajú sa pri otočke, dobiehajú pri zastavení
        const ry = o.root.rotation.y, dy = Math.atan2(Math.sin(ry - o.ry0), Math.cos(ry - o.ry0)); o.ry0 = ry;
        const ct = -.12 - Math.min(.7, o.sp * .25) - o.hit * .2 + Math.sin(clock * 1.3 + o.id) * .04, dd = Math.min(2, dt);
        o.cv += ((ct - o.cz) * .1 - o.cv * .16) * dd; o.cz += o.cv * dd; o.cxv += -dy * .35 + (-o.cx * .08 - o.cxv * .14) * dd; o.cx += o.cxv * dd;
        B.cape.rotation.z = Math.max(-1.3, Math.min(.3, o.cz)); B.cape.rotation.x = Math.max(-.6, Math.min(.6, o.cx));
        if (o.flag) { o.flag.rotation.x = Math.sin(clock * 2 + o.ph) * .04 + o.cx * .3; o.flag.rotation.z = (o.cz + .12) * .25; }
        // obojručná zbraň a kopija: ľavá ruka drží rukoväť (inverzná kinematika ramena a lakťa)
        if (H.two && !u.rout && QN() >= 1 && !(H.bow) && Math.hypot(cam ? cam.position.x - u.x : 0, cam ? cam.position.z - u.y : 0) < 380) armIK(o, H.twoY);
        // detail tváre a prilby sa na diaľku skryje
        const far = cam && Math.hypot(cam.position.x - u.x, cam.position.z - u.y) > [0, 300, 420, 650][QN()];
        B.det.scale.setScalar(far ? .001 : 1);
    }
    // ---------- kosti podľa bodov: mierenie kosti, inverzná kinematika ramena, handrová bábka ----------
    const IKV = { t: null, a: null, b: null, c: null, q: null, q2: null };
    function aimBone(bone, target, rest) {
        const t = T(); if (!IKV.a) { IKV.a = new t.Vector3(); IKV.b = new t.Vector3(); IKV.q = new t.Quaternion(); IKV.q2 = new t.Quaternion(); }
        bone.parent.updateWorldMatrix(true, false); bone.updateWorldMatrix(false, false);
        const p = bone.getWorldPosition(IKV.a), d = IKV.b.copy(target).sub(p); if (d.lengthSq() < 1e-6) return; d.normalize();
        bone.parent.getWorldQuaternion(IKV.q).invert(); d.applyQuaternion(IKV.q).normalize();
        bone.quaternion.setFromUnitVectors(rest || DOWN, d); bone.updateWorldMatrix(false, false);
    }
    let DOWN = null;
    function armIK(o, gy) {
        const t = T(); if (!DOWN) DOWN = new t.Vector3(0, -1, 0); const B = o.B, L = o.H.lens, k = o.scaleH || 1, a1 = L.a1 * k, a2 = L.a2 * k;
        o.root.updateMatrixWorld(true); const S = B.shL.getWorldPosition(new t.Vector3()), T1 = B.hR.localToWorld(new t.Vector3(0, gy, 0)), dir = T1.clone().sub(S); let d = dir.length(); if (d < .01) return; dir.divideScalar(d); d = Math.min(d, a1 + a2 - .05);
        const x = (a1 * a1 - a2 * a2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, a1 * a1 - x * x)), pole = new t.Vector3(0, -1, 0); pole.addScaledVector(dir, -pole.dot(dir)).normalize();
        const E = S.clone().addScaledVector(dir, x).addScaledVector(pole, h); aimBone(B.shL, E); aimBone(B.elL, T1);
    }
    /** Handrová bábka (Verlet): 13 bodov tela s väzbami, gravitácia, zem, odrážanie od iných padlých; podľa bodov sa natočí telo a končatiny. */
    let RAGS = [];
    function ragStart(o, u) {
        if (!o.B || o.mount || o.tp.boss || QN() < 1 || !o.inS || !o.H.lens || RAGS.filter(r => !r.rag.done).length >= 24) return false;
        const t = T(), B = o.B, L = o.H.lens, k = o.scaleH || 1; o.root.updateMatrixWorld(true);
        const w = (b, y = 0) => b.localToWorld(new t.Vector3(0, y, 0)), P = { Lp: w(B.lgL), Rp: w(B.lgR), Ls: w(B.shL), Rs: w(B.shR), Hd: w(B.hd), Lk: w(B.knL), Rk: w(B.knR), Lf: w(B.knL, -L.ls), Rf: w(B.knR, -L.ls), Le: w(B.elL), Re: w(B.elR), Lh: w(B.hL), Rh: w(B.hR) };
        const ka = u.lhA != null ? u.lhA : -o.root.rotation.y + Math.PI, kv = .35 + o.hit * .5 + (o.kbx || o.kbz ? .4 : 0), V = {};
        // hybnosť behu: zasiahnutý v behu sa pretočí a šmykne dopredu v smere pohybu (nie len od útočníka); pri cúvaní dozadu
        const mom = Math.min(1.3, Math.max(0, o.sp - .4) * .4) * Math.sign(o.mf || 0), mx = Math.cos(o.root.rotation.y) * mom, mz = -Math.sin(o.root.rotation.y) * mom;   // smer pohľadu: rotation.y = -u.f, vpred = (cos f, sin f)
        for (const n in P) { const up = n === 'Hd' || n[1] === 's' || n[1] === 'e' || n[1] === 'h' ? 1 : .35; V[n] = P[n].clone().sub(new t.Vector3(Math.cos(ka) * kv * up + mx * (up > .5 ? 1 : .55), .15 * up, Math.sin(ka) * kv * up + mz * (up > .5 ? 1 : .55))); }
        const pairs = [['Lp', 'Rp'], ['Ls', 'Rs'], ['Lp', 'Ls'], ['Rp', 'Rs'], ['Lp', 'Rs'], ['Rp', 'Ls'], ['Hd', 'Ls'], ['Hd', 'Rs'], ['Hd', 'Lp'], ['Hd', 'Rp'], ['Lp', 'Lk'], ['Lk', 'Lf'], ['Rp', 'Rk'], ['Rk', 'Rf'], ['Ls', 'Le'], ['Le', 'Lh'], ['Rs', 'Re'], ['Re', 'Rh']];
        const C2 = pairs.map(([a, b]) => [a, b, P[a].distanceTo(P[b]), 0]); C2.push(['Lp', 'Lf', (L.lt + L.ls) * k * .55, 1], ['Rp', 'Rf', (L.lt + L.ls) * k * .55, 1], ['Ls', 'Lh', (L.a1 + L.a2) * k * .4, 1], ['Rs', 'Rh', (L.a1 + L.a2) * k * .4, 1]);
        o.rag = { P, V, C: C2, still: 0, done: 0, sm0: o.sm.position.clone(), k, hipY: o.H.hipY }; RAGS.push(o); if (RAGS.length > 40) { const i = RAGS.findIndex(r => r.rag.done); RAGS.splice(i >= 0 ? i : 0, 1); }
        B.hip.position.set(0, o.H.hipY, 0); B.hip.rotation.set(0, 0, 0); B.ch.rotation.set(0, 0, 0); B.ch.scale.set(1, 1, 1);
        return true;
    }
    function ragStep(o, dt) {
        const R2 = o.rag; if (R2.done) return;
        const h = Math.max(.02, Math.min(2, dt)), g = .05 * h * h, ih = .985 / (R2.hp || 1); let mv = 0; R2.hp = h;   // rýchlosť z posunu za predošlý krok (premenlivý krok aj v spomalení)
        for (const n in R2.P) { const p = R2.P[n], q = R2.V[n], vx = (p.x - q.x) * ih, vy = (p.y - q.y) * ih, vz = (p.z - q.z) * ih; q.copy(p); p.x += vx * h; p.y += vy * h - g; p.z += vz * h; mv = Math.max(mv, Math.abs(vx) + Math.abs(vy) + Math.abs(vz)); }
        for (let it = 0; it < 5; it++) {
            for (const [a, b, L, min] of R2.C) { const A = R2.P[a], Bp = R2.P[b], dx = Bp.x - A.x, dy = Bp.y - A.y, dz = Bp.z - A.z, d = Math.hypot(dx, dy, dz) || 1e-4; if (min && d >= L) continue; const f = (d - L) / d * .5; A.x += dx * f; A.y += dy * f; A.z += dz * f; Bp.x -= dx * f; Bp.y -= dy * f; Bp.z -= dz * f; }
            for (const n in R2.P) { const p = R2.P[n], gy = heightAt(p.x, p.z) + .7 * R2.k; if (p.y < gy) { p.y = gy; const q = R2.V[n]; q.x += (p.x - q.x) * .45; q.z += (p.z - q.z) * .45; } }
            for (const r of RAGS) { if (r === o || !r.rag) continue; const O = r.rag.P; if (Math.abs(O.Lp.x - R2.P.Lp.x) > 30 || Math.abs(O.Lp.z - R2.P.Lp.z) > 30) continue;   // padlí sa navzájom nepretínajú
                for (const n of ['Lp', 'Rp', 'Ls', 'Rs', 'Hd']) for (const m of ['Lp', 'Rp', 'Ls', 'Rs', 'Hd']) { const A = R2.P[n], Bq = O[m], dx = A.x - Bq.x, dy = A.y - Bq.y, dz = A.z - Bq.z, d = Math.hypot(dx, dy, dz), rr = 2.4 * R2.k; if (d < rr && d > 1e-4) { const f = (rr - d) / d * (r.rag.done ? 1 : .5); A.x += dx * f; A.y += dy * f + (rr - d) * .3; A.z += dz * f; } } }
        }
        R2.still = mv < .02 ? R2.still + 1 : 0; if (R2.still > 45) R2.done = 1;
    }
    function ragApply(o) {
        const t = T(), R2 = o.rag, P = R2.P, B = o.B, r = o.root;
        const hm = P.Lp.clone().add(P.Rp).multiplyScalar(.5), sm2 = P.Ls.clone().add(P.Rs).multiplyScalar(.5), Y = sm2.sub(hm).normalize(), Z = P.Rp.clone().sub(P.Lp); Z.addScaledVector(Y, -Z.dot(Y)).normalize(); const X = new t.Vector3().crossVectors(Y, Z);
        const M = new t.Matrix4().makeBasis(X, Y, Z); r.quaternion.setFromRotationMatrix(M);
        const off = R2.sm0.clone().add(new t.Vector3(0, (R2.hipY - .3) * (o.sm.scale.y), 0)).applyQuaternion(r.quaternion); r.position.copy(hm).sub(off); r.updateMatrixWorld(true);
        aimBone(B.lgR, P.Rk); aimBone(B.knR, P.Rf); aimBone(B.lgL, P.Lk); aimBone(B.knL, P.Lf); aimBone(B.shR, P.Re); aimBone(B.elR, P.Rh); aimBone(B.shL, P.Le); aimBone(B.elL, P.Lh);
    }
    /** Kôň a varg: krok (štvortakt), klus (diagonálne páry), cval (s hojdaním tela); hlava, krk a chvost. */
    function poseMount(o, u, dt) {
        const M = o.MB, s = o.sp, gait = gaitOf(s), offs = [[0, .5, .75, .25], [0, .5, .5, 0], [.1, 0, .6, .5]][gait], A = [.32, .5, .78][gait] * Math.min(1, s / .6);
        o.mph += s * dt / STRIDE[gait];
        const P = o.mph * 6.283;
        ['FR', 'FL', 'BR', 'BL'].forEach((L, i) => { const p = P + offs[i] * 6.283, front = L[0] === 'F'; M[L].rotation.z = Math.sin(p) * A * (front ? 1 : .85); M[L + 'k'].rotation.z = front ? -Math.max(0, Math.cos(p)) * (1.1 * A + .05) : Math.max(0, Math.cos(p)) * (.9 * A + .05); });
        M.mb.position.y = o.mk.h + Math.abs(Math.sin(P * (gait === 2 ? 1 : 2))) * (gait === 2 ? 1.6 : .7) * Math.min(1, s);
        M.mb.rotation.z = gait === 2 ? Math.sin(P) * .09 : 0;
        if (o.spook > 0) o.spook -= dt;
        const rear = u.h ? (typeof CMB !== 'undefined' ? CMB.rear : 0) : u.rear > 0 ? u.rear : o.spook > 0 ? o.spook : 0;
        if (rear > 0) { const k = Math.min(1, rear / 12) * Math.min(1, (45 - rear) / 8 + .2); M.mb.rotation.z = .62 * k; M.mb.position.y = o.mk.h + 4 * k; M.FR.rotation.z = M.FL.rotation.z = 1 * k; M.FRk.rotation.z = M.FLk.rotation.z = -1.3 * k; M.BR.rotation.z = M.BL.rotation.z = -.5 * k; M.nk.rotation.z = .3 * k; }   // kôň sa vzopne
        let nkT = Math.sin(P * (gait === 2 ? 1 : 2)) * .07 * Math.min(1, s) + (s < .2 ? Math.sin(clock * .7 + o.id) * .05 - .04 : 0), hdT = null;
        if (s < .15 && !(rear > 0)) {   // kôň v pokoji: spása trávu, pohodí hlavou, hrabe kopytom
            const ph = (clock * .22 + o.id * .71) % 5;
            if (ph < 1.6 && !u.h && !o.mk.wolf) { nkT = -.95; hdT = .5 + Math.sin(clock * 3 + o.id) * .08; }
            else if (ph > 2 && ph < 2.6) nkT = .3 * Math.sin((ph - 2) * 6.283 * 2) + .1;
            else if (ph > 3 && ph < 3.9 && !o.mk.wolf) { M.FR.rotation.z = .55 + Math.sin(clock * 11) * .35; M.FRk.rotation.z = -1.2; }
        }
        if (rear > 0) nkT = M.nk.rotation.z;
        o.nk = (o.nk ?? nkT) + (nkT - (o.nk ?? nkT)) * Math.min(1, .12 * dt); M.nk.rotation.z = o.nk;
        M.hd.rotation.z = hdT != null ? hdT : -M.nk.rotation.z * .6;
        M.tl.rotation.z = .25 + Math.min(.7, s * .2) + Math.sin(clock * 2.1 + o.id) * .08; M.tl.rotation.x = Math.sin(clock * 1.4 + o.id) * .2;
        // jazdec sa hojdá s koňom
        if (o.sm && !o.unh) o.sm.position.y = o.mk.seat - (o.H.hipY - .5) * o.H.scale + (M.mb.position.y - o.mk.h) * o.mk.k;
        if (o.sm && !o.unh) o.sm.rotation.z = M.mb.rotation.z * .6;
    }

    // ---------- prekryv na zemi ----------
    let ovN = 0;
    function ovTri(x1, y1, x2, y2, x3, y3, c, lift = .8) {
        if (ovN + 3 > 12000) return;
        const cc = C(c);
        for (const [x, y] of [[x1, y1], [x2, y2], [x3, y3]]) { ovPos[ovN * 3] = x; ovPos[ovN * 3 + 1] = heightAt(x, y) + lift; ovPos[ovN * 3 + 2] = y; ovCol[ovN * 3] = cc.r; ovCol[ovN * 3 + 1] = cc.g; ovCol[ovN * 3 + 2] = cc.b; ovN++; }
    }
    function ovSector(x, y, r0, r1, a0, a1, c, n = 14) { for (let i = 0; i < n; i++) { const p = a0 + (a1 - a0) * i / n, q = a0 + (a1 - a0) * (i + 1) / n; const A = [x + Math.cos(p) * r0, y + Math.sin(p) * r0], B = [x + Math.cos(p) * r1, y + Math.sin(p) * r1], Cc = [x + Math.cos(q) * r1, y + Math.sin(q) * r1], D = [x + Math.cos(q) * r0, y + Math.sin(q) * r0]; ovTri(...A, ...B, ...Cc, c); if (r0 > 0) ovTri(...A, ...Cc, ...D, c); } }
    function drawOverlay() {
        ovN = 0;
        const h = U[0], C2 = typeof CMB !== 'undefined' ? CMB : {};
        if (photo) { overlay.geometry.setDrawRange(0, 0); return; }
        for (const u of U) {
            if (u.hp <= 0) continue;
            if (u.wu > 0 && u.wu0 && (u.t || u.wt === h) && Math.hypot(u.x - h.x, u.y - h.y) < 260) { const p = 1 - u.wu / u.wu0; { const ro = u.r + 7 + p * 9; ovSector(u.x, u.y, ro - 1.3, ro, u.f - .7, u.f + .7, u.wt === h ? '#ffd040' : '#ffa878', 10); } }   // len tenký oblúk (bez vyplnenej plochy, ktorá pripomínala krv na zemi)
            if (u.cmd) ovSector(u.x, u.y, u.r * 1.2, u.r * 1.5, 0, 6.283, '#ffd24a', 16);
            if (u.boss && u.atk) { const A = u.atk, p = 1 - A.t / A.t0, col = A.fire ? '#ff5a10' : '#d02010';
                if (A.k === 'circle') { ovSector(A.x, A.y, 0, A.r, 0, 6.283, '#601008', 24); ovSector(A.x, A.y, 0, A.r * p, 0, 6.283, col, 24); }
                else if (A.k === 'cone') { ovSector(A.x, A.y, 0, A.len, A.a - A.w, A.a + A.w, '#601008', 16); ovSector(A.x, A.y, 0, A.len * p, A.a - A.w, A.a + A.w, col, 16); }
                else { const a = Math.atan2(A.y2 - A.y, A.x2 - A.x), nx = -Math.sin(a) * A.w, ny = Math.cos(a) * A.w, L = Math.hypot(A.x2 - A.x, A.y2 - A.y), seg = 10; for (let i = 0; i < seg; i++) { const x0 = A.x + Math.cos(a) * L * i / seg, y0 = A.y + Math.sin(a) * L * i / seg, x1 = A.x + Math.cos(a) * L * (i + 1) / seg, y1 = A.y + Math.sin(a) * L * (i + 1) / seg, cc = i / seg < p ? col : '#601008'; ovTri(x0 + nx, y0 + ny, x1 + nx, y1 + ny, x1 - nx, y1 - ny, cc); ovTri(x0 + nx, y0 + ny, x1 - nx, y1 - ny, x0 - nx, y0 - ny, cc); } } }
        }
        const showM = (C2.mkT || 0) > 0 || C2.place, gs = C2.sel === 'all' ? ['p', 'l', 'j'] : [C2.sel], GC = { p: '#80c0ff', l: '#a0e080', j: '#ffb060' };
        if (showM && typeof grpOf === 'function') for (const u of U) {   // vybraná skupina a jej miesta v útvare
            if (u.t || u.h || u.ally || u.hp <= 0 || u.rout || !gs.includes(grpOf(u))) continue;
            ovSector(u.x, u.y, u.r + 1, u.r + 2.2, 0, 6.283, GC[grpOf(u)], 10);
            if (u.hx != null && !C2.prev) { const x = u.hx, y = u.hy; ovTri(x - 2.5, y, x, y - 2.5, x + 2.5, y, GC[grpOf(u)]); ovTri(x - 2.5, y, x + 2.5, y, x, y + 2.5, GC[grpOf(u)]); }
        }
        if (C2.prev) for (const S of C2.prev) { const x = S.x, y = S.y; ovTri(x - 3, y, x, y - 3, x + 3, y, '#ffffff'); ovTri(x - 3, y, x + 3, y, x, y + 3, '#ffffff'); }
        if (h.hp > 0) {
            const sw = C2.swing;
            if (sw && sw.t > 0) { if (sw.k === 's') ovSector(h.x, h.y, 6, sw.r, sw.a - (sw.w || 1.05), sw.a + (sw.w || 1.05), '#fff0c0', 14); else if (sw.k === 't') ovSector(h.x, h.y, 6, sw.r, sw.a - .3, sw.a + .3, '#fff0c0', 4); else ovSector(h.x, h.y, 10, sw.r, 0, 6.283, '#ffd080', 16); }
            if (C2.blk) { const arc = C2.shp > 0 ? (typeof perk === 'function' && perk('stit') ? 1.7 : 1.4) : .85; ovSector(h.x, h.y, h.r + 6, h.r + 9, h.f - arc, h.f + arc, C2.shp > 0 ? '#c8d8ff' : '#ffffff', 12); }
            if (C2.charging) ovSector(h.x, h.y, 14, 22, (C2.lastA || h.f) - .4, (C2.lastA || h.f) + .4, '#ffe08a', 6);
            ovSector(h.x, h.y, h.r + 1, h.r + 2.4, 0, 6.283, '#ffd24a', 18);   // hrdina: zlatý krúžok
            if (C2.aim && !lookOn()) { const A = C2.aim; ovSector(A.x, A.y, A.r, A.r + 1.6, 0, 6.283, '#ffe8a0', 20); ovSector(A.x, A.y, 0, 1.4, 0, 6.283, '#ffffff', 8); }   // zameriavač: kruh sa zúži, keď je luk napnutý
            if (C2.rd) { const k = Math.min(1, C2.rd.t / Math.max(1, C2.rd.ready)); ovSector(h.x, h.y, h.r + 4, h.r + 4 + 4 * k, h.f - .5, h.f + .5, C2.rd.t >= C2.rd.ready ? '#ffd24a' : '#a08040', 6); }
        }
        const g = overlay.geometry; g.setDrawRange(0, ovN); g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = true;
    }
    function decal(x, y, c, r, grow) {
        const t = T(); if (decals.length > 260) { const d = decals.shift(); scene.remove(d); }
        const m = new t.Mesh(new t.CircleGeometry(r, 12), new t.MeshStandardMaterial({ color: C(c), transparent: true, opacity: .78, depthWrite: false, roughness: .35 }));
        m.rotation.x = -Math.PI / 2; m.rotation.z = Math.random() * 6; m.scale.y = .6 + Math.random() * .5; m.position.set(x + (Math.random() - .5) * 4, heightAt(x, y) + .5, y + (Math.random() - .5) * 4); m.renderOrder = 2; scene.add(m); decals.push(m);
        if (grow) { m.userData.age = 0; m.userData.sy = m.scale.y; m.userData.c0 = C(c); m.scale.set(.25, .25 * m.userData.sy, 1); }   // kaluž sa rozlieva a zasychá (stepDecals)
    }
    /** Kaluže krvi: za pár sekúnd sa rozlejú na plnú veľkosť a za pol minúty stmavnú a zaschnú. Volá sa raz za snímok. */
    const BLOOD_DRY = C => C.clone().multiplyScalar(.45);
    function stepDecals(dt) {
        for (const m of decals) {
            const d = m.userData; if (d.age == null || d.age > 2200) continue;
            d.age += dt;
            const g = Math.min(1, d.age / 240), e = 1 - (1 - g) * (1 - g);   // rozliatie ~4 s, spočiatku rýchlo
            m.scale.set(.25 + .75 * e, (.25 + .75 * e) * d.sy, 1);
            const k = Math.min(1, Math.max(0, (d.age - 300) / 1800));   // zasychanie: po 5 s do 35 s
            if (g >= 1 || k > 0) { m.material.color.copy(d.c0).lerp(BLOOD_DRY(d.c0), k); m.material.opacity = .78 - .2 * k; m.material.roughness = .35 + .5 * k; }
        }
    }

    // ---------- šípy a častice ----------
    let AGEO = null;
    function arrowMesh(jav, bolt) {
        if (!AGEO) AGEO = {
            a: Part().add('cyl6', '#d8c8a0', [0, 0, 0], [0, 0, Math.PI / 2], [.5, 14, .5]).add('cone', '#a8acb4', [7.6, 0, 0], [0, 0, -Math.PI / 2], [1, 2, 1]).add('box', '#e8e8e0', [-6.2, 0, 0], [0, 0, 0], [2.4, .2, 1.6]).add('box', '#c83a2a', [-6.2, 0, 0], [Math.PI / 2, 0, 0], [2.4, .2, 1.6]).build(),
            j: Part().add('cyl6', '#8a6238', [0, 0, 0], [0, 0, Math.PI / 2], [.9, 26, .9]).add('cone', '#a8acb4', [14, 0, 0], [0, 0, -Math.PI / 2], [1.8, 4, 1.8]).build(),
            b: Part().add('cyl6', '#5a4a3a', [0, 0, 0], [0, 0, Math.PI / 2], [.7, 9, .7]).add('cone', '#8a8e96', [5, 0, 0], [0, 0, -Math.PI / 2], [1.2, 2, 1.2]).build()
        };
        const m = mesh(jav ? AGEO.j : bolt ? AGEO.b : AGEO.a); m.castShadow = false; return m;
    }
    function syncArrows() {
        const seen = new Set(), t = T(), ev = (x, y) => typeof elevSim === 'function' ? elevSim(x, y) : 0;
        for (const a of AR) {
            if (!a.m3) { a.m3 = arrowMesh(a.jav, a.bolt); scene.add(a.m3); arrowPool.push(a); }
            seen.add(a);
            a.m3.position.set(a.x, Math.max(heightAt(a.x, a.y) + .5, (a.z ?? 15) - ev(a.x, a.y) + heightAt(a.x, a.y)), a.y);
            a.m3.rotation.set(0, -Math.atan2(a.vy, a.vx), Math.atan2(a.vz || 0, Math.hypot(a.vx, a.vy)));
        }
        for (let i = arrowPool.length - 1; i >= 0; i--) {
            const a = arrowPool[i]; if (seen.has(a)) continue; arrowPool.splice(i, 1); const m = a.m3;
            const fw = new t.Vector3(Math.cos(Math.atan2(a.vy, a.vx)), 0, Math.sin(Math.atan2(a.vy, a.vx)));
            const tu = a.hitU || a.shield, o = tu && units.get(tu);
            if (o && (o.arN || 0) < 6) {   // šíp sa zapichne do tela alebo do štítu a ostane v ňom
                o.arN = (o.arN || 0) + 1;
                m.position.y = heightAt(tu.x, tu.y) + (a.hz || 14) * (o.scaleH || 1); m.position.x = tu.x - fw.x * 3; m.position.z = tu.y - fw.z * 3;
                const par = a.shield && o.B && o.B.shd ? o.B.shd : o.root; par.updateWorldMatrix(true, false); m.updateMatrixWorld(); par.attach(m);
                if (FIELD && FIELD.river && Math.abs(tu.x - riverX()) < 44) splash(tu.x, tu.y, 2);
            } else if (a.land || a.wall) {   // do zeme alebo do múru: ostane zapichnutý, šípy zo zeme sa dajú zdvihnúť
                m.position.addScaledVector(fw, 3); if (a.land) m.position.y = heightAt(a.x, a.y) + 2.5;
                m.userData.ga = a.ga; stuck.push(m);
                if (stuck.length > 320) scene.remove(stuck.shift());
                if (FIELD && FIELD.river && Math.abs(a.x - riverX()) < 44) splash(a.x, a.y, 4);
            } else scene.remove(m);
        }
        if (frameN % 20 === 0) stuck = stuck.filter(m => { if (m.userData.ga && m.userData.ga.picked) { scene.remove(m); return false; } return true; });
    }
    function syncParticles() {
        let n = 0;
        for (const p of PT) {
            if (p.ring) { if (!p.s3 && DUST) { p.s3 = 1; const oa = p.att && units.get(p.att), od = p.def && units.get(p.def); let at = null;
                if (oa && oa.tip && oa.inS && od && od.inS) { const t = T(), a = new t.Vector3(), d = new t.Vector3(); oa.tip.getWorldPosition(a); (od.B && od.B.shd && p.c === '#c8d8ff' ? od.B.shd : od.root).getWorldPosition(d); if (!(od.B && p.c === '#c8d8ff')) d.y += 14 * (od.scaleH || 1); at = a.lerp(d, .55); }
                sparks(p.x, p.y, p.c, at); if (p.c === '#c8d8ff') { splinters(p.x, p.y, 7, at); if (od && od.B && od.inS && QN() >= 1 && (od.shN = (od.shN || 0) + 1) <= 6) { const t = T(), m = new t.Mesh(new t.CircleGeometry(.5 + Math.random() * .5, 6), MAT.notch || (MAT.notch = new t.MeshStandardMaterial({ color: C('#2a1a10'), roughness: .9, polygonOffset: true, polygonOffsetFactor: -3 }))); m.rotation.y = Math.PI / 2; const a = Math.random() * 6.283, rr = Math.random() * 3.2; m.position.set(2.32, Math.sin(a) * rr, -.3 + Math.cos(a) * rr); od.B.shd.add(m); } } } continue; }   // zárezy a diery v štíte   // kryt: iskry v mieste stretu zbraní   // kryt alebo pokrik: iskry a záblesk
            if (n >= 900) continue;
            if (p.y0 == null) { p.y0 = p.y; p.x0 = p.x; }
            const up = Math.max(0, (p.y0 - p.y)) + (p.bl ? 2 : 10), cc = CC(p.c || '#ffffff');
            ptsPos[n * 3] = p.x; ptsPos[n * 3 + 1] = heightAt(p.x, p.y0) + up; ptsPos[n * 3 + 2] = p.y0;
            ptsCol[n * 3] = cc.r; ptsCol[n * 3 + 1] = cc.g; ptsCol[n * 3 + 2] = cc.b; n++;
        }
        const g = pts.geometry; g.setDrawRange(0, n); g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = true;
    }

    // ---------- efekty: oheň, prach, trosky, kamene, olej, údery bossov, iskry, voda ----------
    /** Sústava častíc s vlastnou veľkosťou a priehľadnosťou (oheň sčítava svetlo, prach a dym normálne). */
    function Psys(max, additive) {
        const t = T(), pos = new Float32Array(max * 3), col = new Float32Array(max * 3), al = new Float32Array(max), sz = new Float32Array(max), P = [];
        const g = new t.BufferGeometry(); g.setAttribute('position', new t.BufferAttribute(pos, 3)); g.setAttribute('color', new t.BufferAttribute(col, 3)); g.setAttribute('a', new t.BufferAttribute(al, 1)); g.setAttribute('s', new t.BufferAttribute(sz, 1));
        const m = new t.ShaderMaterial({ transparent: true, depthWrite: false, blending: additive ? t.AdditiveBlending : t.NormalBlending, vertexColors: true,
            vertexShader: 'attribute float a; attribute float s; varying float vA; varying vec3 vC; void main(){ vA = a * smoothstep(6.0, 40.0, -(modelViewMatrix * vec4(position, 1.0)).z); vC = color; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = min(s * 320.0 / max(1.0, -mv.z), 150.0); gl_Position = projectionMatrix * mv; }',
            fragmentShader: additive
                ? 'varying float vA; varying vec3 vC; void main(){ vec2 q = gl_PointCoord - 0.5; q.x *= 1.0 + q.y * 1.3; float d = length(q * vec2(1.0, 0.85)); if (d > 0.5) discard; float core = smoothstep(0.5, 0.05, d); gl_FragColor = vec4(vC * 2.2 * (0.8 + 0.6 * core), vA * core); }'   // plameň ako jazyk (užší hore)
                : 'varying float vA; varying vec3 vC; void main(){ vec2 q = gl_PointCoord - 0.5; float d = length(q); if (d > 0.5) discard; float lit = 0.82 + 0.36 * (0.5 - q.y); gl_FragColor = vec4(vC * lit, vA * smoothstep(0.5, 0.1, d)); }' });   // dym osvetlený zhora
        const pts3 = new t.Points(g, m); pts3.frustumCulled = false; pts3.renderOrder = 6; scene.add(pts3); const TC = new t.Color();
        return {
            add(o) { if (P.length < max) P.push({ vx: 0, vy: 0, vz: 0, g: 0, s0: 8, s1: 8, a0: 1, ...o, l0: o.l, c: CC(o.c || '#ffffff'), c1: o.c1 ? CC(o.c1) : null }); },
            get n() { return P.length; },
            step(dt) {
                let n = 0;
                for (let i = P.length - 1; i >= 0; i--) { const q = P[i]; q.l -= dt; if (q.l <= 0) { P.splice(i, 1); continue; } q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.vy -= q.g * dt; const fl = heightAt(q.x, q.z) + .5; if (q.y < fl) { q.y = fl; q.vy = 0; q.vx *= .8; q.vz *= .8; } }
                for (const q of P) { const k = q.l / q.l0, c = q.c1 ? TC.copy(q.c).lerp(q.c1, 1 - k) : q.c; pos[n * 3] = q.x; pos[n * 3 + 1] = q.y; pos[n * 3 + 2] = q.z; col[n * 3] = c.r; col[n * 3 + 1] = c.g; col[n * 3 + 2] = c.b; al[n] = q.a0 * Math.min(1, k * 2.2); sz[n] = q.s0 + (q.s1 - q.s0) * (1 - k); n++; }
                g.setDrawRange(0, n); for (const k of ['position', 'color', 'a', 's']) g.attributes[k].needsUpdate = true;
            }
        };
    }
    let FIRE = null, DUST = null, debris = [], rocks = [], fxState = {};
    const CCM = new Map(), CC = c => { let v = CCM.get(c); if (!v) { v = C(c); CCM.set(c, v); } return v; };   // farby častíc sa parsujú raz (žiadne smetisko v boji)
    const flame = (x, y, z, k = 1) => FIRE.add({ x, y, z, vx: (Math.random() - .5) * .5, vy: .5 + Math.random() * .9, vz: (Math.random() - .5) * .5, l: 26 + Math.random() * 22, c: '#ffe08a', c1: '#a01a04', s0: 6 * k, s1: 15 * k, a0: .85 });
    const smoke = (x, y, z, k = 1, c = '#3a3430') => DUST.add({ x, y, z, vx: (Math.random() - .5) * .4, vy: .25 + Math.random() * .4, vz: (Math.random() - .5) * .4, l: 60 + Math.random() * 40, c, s0: 12 * k, s1: 34 * k, a0: .45 });
    const dust = (x, y, n, r = 10, c) => { const cc = c || (BI === 's' ? '#e8eef2' : BI === 'a' ? '#6a5a52' : BI === 'd' ? '#e0c890' : '#b8a888'); for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = .6 + Math.random() * 1.6; DUST.add({ x: x + Math.cos(a) * r * Math.random(), y: heightAt(x, y) + 2, z: y + Math.sin(a) * r * Math.random(), vx: Math.cos(a) * v, vy: .2 + Math.random() * .5, vz: Math.sin(a) * v, l: 40 + Math.random() * 30, c: cc, s0: 7, s1: 26, a0: .32 }); } };
    /** Iskry a krátky záblesk svetla (kryt štítom alebo zbraňou). */
    function sparks(x, y, c, at) {
        const h = at ? at.y : heightAt(x, y) + 15; if (at) { x = at.x; y = at.z; }
        for (let i = 0; i < 14; i++) { const a = Math.random() * 6.283, v = .8 + Math.random() * 2; FIRE.add({ x, y: h, z: y, vx: Math.cos(a) * v, vy: .5 + Math.random() * 2, vz: Math.sin(a) * v, g: .12, l: 10 + Math.random() * 10, c: '#fff4c0', c1: '#ff8020', s0: 1.6, s1: .6, a0: 1 }); }
        const L = flashL.find(l => l.intensity < .3) || flashL[0]; L.position.set(x, h + 4, y); L.color.set(c && c !== '#ffffff' ? c : '#ffd890'); L.intensity = 160; L.distance = 120;
    }
    /** Triesky zo štítu (drevo). */
    function splinters(x, y, n, at) { const h = at ? at.y : heightAt(x, y) + 14; if (at) { x = at.x; y = at.z; } for (let i = 0; i < n; i++) { const a = Math.random() * 6.283; DUST.add({ x, y: h, z: y, vx: Math.cos(a) * 1.2, vy: .8 + Math.random() * 1.4, vz: Math.sin(a) * 1.2, g: .12, l: 26 + Math.random() * 14, c: '#8a6038', s0: 1.8, s1: 1.2, a0: 1 }); } }
    /** Špliechanie vody (brodenie, šíp do rieky). */
    function splash(x, y, n) { const wy = creekD(x, y) < 12 ? -6.4 : -4.3; for (let i = 0; i < n; i++) { const a = Math.random() * 6.283; DUST.add({ x, y: wy, z: y, vx: Math.cos(a) * .6, vy: .8 + Math.random() * 1.1, vz: Math.sin(a) * .6, g: .1, l: 22 + Math.random() * 10, c: '#dbe8f0', s0: 3, s1: 5, a0: .8 }); } }
    /** Cieľ pod zameriavačom: jemný červený krúžok pod nohami (ako zvýraznenie súpera vo Warbande). */
    let tgM = null;
    function stepTgMark() {
        const u = typeof CMB !== 'undefined' && OPT.tgMark !== false && U[0] && U[0].hp > 0 ? CMB.tgU : null;
        if (!u || u.hp <= 0 || photo) { if (tgM) tgM.visible = false; return; }
        if (!tgM) { const t = T(); tgM = new t.Mesh(new t.RingGeometry(.8, 1, 40), new t.MeshBasicMaterial({ color: C('#ff4a30'), transparent: true, opacity: .55, side: t.DoubleSide, depthWrite: false })); tgM.rotation.x = -Math.PI / 2; tgM.renderOrder = 3; }
        if (tgM.parent !== scene) scene.add(tgM);
        const r = (typeof onMount === 'function' && onMount(u) ? 15 : 8.5) * (u.boss ? 2.5 : 1);
        tgM.scale.setScalar(r * (1 + .05 * Math.sin(clock * 4))); tgM.position.set(u.x, heightAt(u.x, u.y) + 1.2, u.y); tgM.visible = true;
    }
    function ring(x, y, r, c = '#ffd0a0') {
        const t = T(), m = new t.Mesh(new t.RingGeometry(.8, 1, 40), new t.MeshBasicMaterial({ color: C(c), transparent: true, opacity: .8, side: t.DoubleSide, depthWrite: false, blending: t.AdditiveBlending }));
        m.rotation.x = -Math.PI / 2; m.position.set(x, heightAt(x, y) + 1.5, y); scene.add(m); debris.push({ ring: m, r, l: 24, l0: 24 });
    }
    function chunk(x, y, z, col, k = 1, v = 1) {
        const m = mesh(Part().add('box', col, [0, 0, 0], [0, 0, 0], [3 + Math.random() * 4 * k, 1.5 + Math.random() * 2, 2 + Math.random() * 5 * k]).build()); m.position.set(x, y, z); scene.add(m);
        const a = Math.random() * 6.283; debris.push({ m, vx: Math.cos(a) * v * (.5 + Math.random()), vy: v * (1 + Math.random() * 1.5), vz: Math.sin(a) * v * (.5 + Math.random()), wx: Math.random() * .3, wz: Math.random() * .3, rest: 0 });
    }
    /** Mapa blata a spáleniny: dupot vojakov a koní rozryje zem, oheň ju spáli. */
    function trample(x, y, r, a, ch = 0) {
        const cx = x / BW * 192, cy = y / BH * 128, rr = r / BW * 192;
        for (let j = Math.floor(cy - rr); j <= cy + rr; j++) for (let i = Math.floor(cx - rr); i <= cx + rr; i++) { if (i < 0 || j < 0 || i >= 192 || j >= 128) continue; const d = Math.hypot(i - cx, j - cy) / Math.max(.5, rr); if (d > 1) continue; const k = (j * 192 + i) * 4 + ch; trData[k] = Math.min(255, trData[k] + a * (1 - d)); }
        trDirty = 1;
    }
    function stepDebris(dt) {
        for (let i = debris.length - 1; i >= 0; i--) {
            const d = debris[i];
            if (d.ring) { d.l -= dt; const k = 1 - d.l / d.l0; d.ring.scale.setScalar(d.r * (.2 + k)); d.ring.material.opacity = .8 * (1 - k); if (d.l <= 0) { scene.remove(d.ring); d.ring.geometry.dispose(); debris.splice(i, 1); } continue; }
            if (d.rest) continue;
            const m = d.m; m.position.x += d.vx * dt; m.position.y += d.vy * dt; m.position.z += d.vz * dt; d.vy -= .12 * dt; m.rotation.x += d.wx * dt; m.rotation.z += d.wz * dt;
            const fl = heightAt(m.position.x, m.position.z) + (d.flat ? .5 : 1); if (m.position.y < fl) { m.position.y = fl; if (d.vy < -1.2) { d.vy *= -.3; d.vx *= .5; d.vz *= .5; } else { d.rest = 1; if (d.flat) m.rotation.set(d.flat === 'w' ? Math.PI / 2 : 0, Math.random() * 6.283, d.flat === 's' ? Math.PI / 2 : 0); } }
        }
        for (let i = rocks.length - 1; i >= 0; i--) {   // kamene z hradieb: letia oblúkom a dopadnú s prachom
            const r = rocks[i]; r.t += dt; const k = Math.min(1, r.t / 22);
            r.m.position.set(r.x0 + (r.x - r.x0) * k, 52 * (1 - k * k) + heightAt(r.x, r.y) * k + 4, r.y0 + (r.y - r.y0) * k); r.m.rotation.x += .2 * dt;
            if (k >= 1) { dust(r.x, r.y, 14, 16, '#a8a090'); ring(r.x, r.y, 30, '#d8d0c0'); rocks.splice(i, 1); r.m.position.y = heightAt(r.x, r.y) + 3; }
        }
        for (let i = fires.length - 1; i >= 0; i--) {   // horiaca zem po ohnivých útokoch
            const f = fires[i]; f.l -= dt * (WX.n === 'rain' || WX.n === 'storm' ? 3 : 1); if (f.l <= 0) { fires.splice(i, 1); continue; }
            if ((frameN + i) % 45 === 0 && (f.gen || 0) < 4 && fires.length < 40 && Math.random() < .35) { const a = Math.random() * 6.283, d = 16 + Math.random() * 12, x = f.x + Math.cos(a) * d, y = f.y + Math.sin(a) * d; if (canBurn(x, y)) { fires.push({ x, y, r: 16, l: f.l * .8 + 80, gen: (f.gen || 0) + 1 }); trample(x, y, 12, 170, 1); } }   // oheň sa šíri suchou trávou
            const k = Math.min(1, f.l / 200);
            if (Math.random() < .55 * k) flame(f.x + (Math.random() - .5) * f.r, heightAt(f.x, f.y) + 1, f.y + (Math.random() - .5) * f.r, .7 + k * .5);
            if (Math.random() < .12) smoke(f.x, heightAt(f.x, f.y) + 8, f.y, 1.2);
            if (Math.random() < .2) FIRE.add({ x: f.x + (Math.random() - .5) * f.r, y: heightAt(f.x, f.y) + 3, z: f.y + (Math.random() - .5) * f.r, vx: (Math.random() - .5) * .4, vy: 1.2 + Math.random(), vz: (Math.random() - .5) * .4, l: 50, c: '#ffd080', c1: '#601004', s0: 1.4, s1: .4, a0: 1 });   // iskry stúpajú
        }
        for (const L of flashL) L.intensity *= Math.pow(.8, dt);
        FIRE.step(dt); DUST.step(dt);
    }
    /** Ohnivý bič Balroga: reťaz bodov z ľavej ruky, ktorá sa vlní a pri útoku šľahne; z biča odletujú iskry. */
    function stepWhip(o, u) {
        const t = T(), N = 18;
        if (!o.whip) { const g = new t.BufferGeometry(); g.setAttribute('position', new t.BufferAttribute(new Float32Array(N * 3), 3)); o.whip = new t.Line(g, new t.LineBasicMaterial({ color: C('#ffb040').multiplyScalar(3), fog: false })); o.whip.frustumCulled = false; scene.add(o.whip); }
        const P = o.whip.geometry.attributes.position, a = -o.root.rotation.y, ca = Math.cos(a), sa = Math.sin(a), lash = u.atk ? Math.sin(Math.min(1, 1 - u.atk.t / u.atk.t0) * Math.PI) : 0;
        const hx = u.x + ca * 6 + sa * 22, hz = u.y + sa * 6 - ca * 22, hy = o.root.position.y + 46;
        for (let i = 0; i < N; i++) { const k = i / (N - 1), sw = Math.sin(clock * 3 - k * 5) * 10 * k, fw = k * (14 + lash * 60); P.setXYZ(i, hx + ca * fw + sa * sw, hy - k * (30 - lash * 24) + Math.sin(clock * 5 - k * 7) * 3 * k, hz + sa * fw - ca * sw); }
        P.needsUpdate = true;
        if (Math.random() < .6) { const i = 4 + Math.floor(Math.random() * (N - 4)); FIRE.add({ x: P.getX(i), y: P.getY(i), z: P.getZ(i), vx: (Math.random() - .5) * .6, vy: .6 + Math.random(), vz: (Math.random() - .5) * .6, l: 26, c: '#ffd060', c1: '#a02004', s0: 4, s1: 1, a0: 1 }); }
    }
    /** Spotrebuje udalosti zo simulácie (FX3) a sleduje zmeny stavu (brána, smrť bossa), prach za jazdou, para, voda, dupot. */
    function runFx(dt) {
        const Q = typeof FX3 !== 'undefined' ? FX3.splice(0) : [];
        for (const e of Q) {
            if (e.k === 'rock') { const m = mesh(Part().add('sph0', '#8a8478', [0, 0, 0], [0, 0, 0], [8, 7, 8]).build()); scene.add(m); rocks.push({ m, x0: e.x0, y0: e.y0, x: e.x, y: e.y, t: 0 }); }
            if (e.k === 'oil') for (let i = 0; i < 60; i++) { const y = 440 + Math.random() * 80; FIRE.add({ x: 1000 - Math.random() * 6, y: 44 - Math.random() * 6, z: y, vx: -.4 - Math.random() * .6, vy: 0, vz: 0, g: .06, l: 40 + Math.random() * 30, c: '#ffb040', c1: '#5a1a04', s0: 7, s1: 14, a0: .8 }); if (i % 3 === 0) smoke(960 + Math.random() * 30, 3, y, 1.2); }
            if (e.k === 'headshot' && !slow) slow = { t: 55, k: .35, u: e.u };   // zásah do hlavy: krátke spomalenie
            if (e.k === 'charge') {   // náraz jazdy: pešiak odletí, z kopije lietajú triesky, prach; pri kamere krátke spomalenie
                const o = units.get(e.u); if (o) { o.kbx = (o.kbx || 0) + Math.cos(e.a) * 9; o.kbz = (o.kbz || 0) + Math.sin(e.a) * 9; o.hit = 1; o.hz = 'torso'; }
                splinters(e.x, e.y, 12); dust(e.x, e.y, 6, 10);
                const ob = e.by && units.get(e.by); if (ob && ob.B && ob.H.spear && !ob.lance && Math.random() < .6) { ob.lance = 600; ob.B.wp.scale.setScalar(.001); for (let i = 0; i < 3; i++) chunk(e.x, heightAt(e.x, e.y) + 16, e.y, '#7a5a34', .5, 1.2); }   // kopija sa zlomí (nová o chvíľu)
                if (!slow && cam && Math.hypot(cam.position.x - e.x, cam.position.z - e.y) < 380 && (e.by && e.by.h || Math.random() < .35) && clock - (fxState.chT ?? -99) > 15) { fxState.chT = clock; slow = { t: 42, t0: 42, k: .4, u: e.u, by: e.by }; }
            }
            if (e.k === 'chamber') { sparks(e.x, e.y, '#fff4c0'); sparks(e.x, e.y, '#ffd080'); }
            if (e.k === 'bounce') sparks(e.x, e.y, '#ffffff');
            if (e.k === 'shieldBreak') { splinters(e.x, e.y, 18); for (let i = 0; i < 5; i++) chunk(e.x, heightAt(e.x, e.y) + 14, e.y, '#7a5030', .35, .9); }
            if (e.k === 'ladder') { const l = [250, 710][e.i]; dust(955, l, 20, 20); for (let i = 0; i < 4; i++) chunk(960, 10, l + (Math.random() - .5) * 20, '#7a5a30', .6, .8); }
            if (e.k === 'boss') {
                const A = e.A, pts = [];
                if (A.k === 'circle') for (let i = 0; i < 90; i++) { const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * A.r; pts.push([A.x + Math.cos(a) * r, A.y + Math.sin(a) * r]); }
                else if (A.k === 'cone') for (let i = 0; i < 110; i++) { const a = A.a + (Math.random() - .5) * 2 * A.w, r = Math.sqrt(Math.random()) * A.len; pts.push([A.x + Math.cos(a) * r, A.y + Math.sin(a) * r]); }
                else for (let i = 0; i < 60; i++) { const k = Math.random(), w = (Math.random() - .5) * 2 * A.w; const a = Math.atan2(A.y2 - A.y, A.x2 - A.x); pts.push([A.x + (A.x2 - A.x) * k - Math.sin(a) * w, A.y + (A.y2 - A.y) * k + Math.cos(a) * w]); }
                if (A.fire) {
                    for (const [x, y] of pts) { flame(x, heightAt(x, y) + 2 + Math.random() * 10, y, 1.2); flame(x + (Math.random() - .5) * 8, heightAt(x, y) + 6 + Math.random() * 14, y + (Math.random() - .5) * 8, .9); if (Math.random() < .25) smoke(x, heightAt(x, y) + 12, y, 1.4); }
                    for (let i = 0; i < 14; i++) { const [x, y] = pts[i * 7 % pts.length]; trample(x, y, 16 + Math.random() * 10, 220, 1); if (i < 5) fires.push({ x, y, r: 20, l: 260 + Math.random() * 200 }); }
                    const L = flashL[0]; L.position.set(A.x, heightAt(A.x, A.y) + 20, A.y); L.color.set('#ff7a20'); L.intensity = 700; L.distance = 320;
                }
                else { for (const [x, y] of pts.filter((p, i) => i % 3 === 0)) { dust(x, y, 1, 4); trample(x, y, 8, 60); } ring(A.x, A.y, (A.r || 60) * 1.3); for (let i = 0; i < 6; i++) chunk(A.x + (Math.random() - .5) * 30, heightAt(A.x, A.y) + 2, A.y + (Math.random() - .5) * 30, '#6a5a48', .6, 1.2); }
            }
        }
        if (SGB) {   // brána: pri zásahoch sa trasie a trieskami, keď padne, rozletí sa na trosky
            const gv = SGB.gate;
            if (fxState.gate != null && gv < fxState.gate - .5 && gv > 0) { fxState.gj = 6; if (Math.random() < .4) chunk(1000, 10 + Math.random() * 20, 450 + Math.random() * 60, '#5a3a1a', .4, .6); }
            if (fxState.gate > 0 && gv <= 0) { for (let i = 0; i < 26; i++) chunk(1002, 6 + Math.random() * 36, 445 + Math.random() * 70, i % 4 ? '#5a3a1a' : '#8a8a8a', 1, 1.6); dust(990, 480, 40, 40); ring(995, 480, 90); SHAKE = Math.max(SHAKE, 3); }
            fxState.gate = gv;
            if (fxState.gj > 0) { fxState.gj -= dt; siege.gate.position.x = Math.sin(clock * 60) * .8; siege.gate.rotation.z = Math.sin(clock * 47) * .01; } else { siege.gate.position.x = 0; siege.gate.rotation.z = 0; }
        }
        const cx = cam ? cam.position.x : U[0].x, cz = cam ? cam.position.z : U[0].y;
        for (const u of U) {
            const o = units.get(u); if (!o || u.fled) continue;
            if (u.boss) {   // boss: oheň v papuli pred ohnivým útokom, tieň pod letiacim, pád pri smrti
                if (u.atk && u.atk.fire && u.hp > 0) { const a = -o.root.rotation.y, d = u.boss === 'dragon' ? 56 : 14, hy = u.boss === 'dragon' ? 18 : 64, x0 = u.x + Math.cos(a) * d, y0 = o.root.position.y + hy, z0 = u.y + Math.sin(a) * d;
                    for (let i = 0; i < 4; i++) { const aa = a + (Math.random() - .5) * .5, v = 3.5 + Math.random() * 3; FIRE.add({ x: x0, y: y0, z: z0, vx: Math.cos(aa) * v, vy: -.6 - Math.random() * .6, vz: Math.sin(aa) * v, g: .02, l: 34 + Math.random() * 16, c: '#ffe08a', c1: '#a01a04', s0: 5, s1: 22, a0: .85 }); }   // prúd ohňa sa valí po zemi
                }
                if (u.boss === 'balrog' && u.hp > 0) stepWhip(o, u);
                if (u.hp <= 0 && !o.bossDead) { o.bossDead = 1; dust(u.x, u.y, 50, 40); ring(u.x, u.y, 120); SHAKE = Math.max(SHAKE, 4); if (o.light) o.light.intensity = 0; if (o.fire) o.fire.visible = false; for (let i = 0; i < 30; i++) smoke(u.x + (Math.random() - .5) * 40, heightAt(u.x, u.y) + 10, u.y + (Math.random() - .5) * 40, 1.5, u.boss === 'balrog' ? '#2a1a14' : '#6a6058'); }
                if (!o.shadow) { const t = T(); o.shadow = new t.Mesh(new t.CircleGeometry(1, 20), new t.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .35, depthWrite: false })); o.shadow.rotation.x = -Math.PI / 2; o.shadow.renderOrder = 3; scene.add(o.shadow); }
                const air = o.root.position.y - heightAt(u.x, u.y); o.shadow.visible = air > 8 && u.hp > 0; o.shadow.position.set(u.x, heightAt(u.x, u.y) + .6, u.y); o.shadow.scale.setScalar(u.boss === 'dragon' ? 50 : 34);
                continue;
            }
            if (u.hp <= 0) continue;
            const dc = Math.hypot(u.x - cx, u.y - cz), mov = o.sp > .4, inRiver = FIELD && FIELD.river && Math.abs(u.x - riverX()) < 44 || creekD(u.x, u.y) < 9;
            if (mov && (frameN + o.id) % 6 === 0) trample(u.x, u.y, o.mount ? 6 : 3.5, o.mount ? 16 : 6);
            else if (u.c > 0 && (frameN + o.id) % 20 === 0) trample(u.x, u.y, 4, 5);
            if (dc > 520) continue;
            if (inRiver && mov && Math.random() < .3) splash(u.x, u.y, o.mount ? 3 : 1);
            else if (o.mount && o.sp > 1.2 && Math.random() < .35 * QN()) { const a = -o.root.rotation.y; dust(u.x - Math.cos(a) * 10, u.y - Math.sin(a) * 10, 1, 6); }   // prach za jazdou
            if (o.mount && o.sp > 1.8 && QN() >= 1 && dc < 420 && Math.random() < (U.length > 150 ? .12 : .25)) {   // nápor jazdy: valiace sa mračno prachu, v daždi blato, v snehu prašan
                const a = -o.root.rotation.y, wet = WX.n === 'rain' || WX.n === 'storm', x = u.x - Math.cos(a) * 16 + (Math.random() - .5) * 8, z = u.y - Math.sin(a) * 16 + (Math.random() - .5) * 8;
                if (wet && BI !== 's') DUST.add({ x, y: heightAt(x, z) + 2, z, vx: -Math.cos(a) * .8 + (Math.random() - .5), vy: 1 + Math.random(), vz: -Math.sin(a) * .8 + (Math.random() - .5), g: .1, l: 26, c: '#3a2e20', s0: 2, s1: 1.4, a0: .9 });
                else DUST.add({ x, y: heightAt(x, z) + 4, z, vx: -Math.cos(a) * .3 + (Math.random() - .5) * .3, vy: .2 + Math.random() * .3, vz: -Math.sin(a) * .3 + (Math.random() - .5) * .3, l: 90 + Math.random() * 50, c: BI === 's' ? '#eef2f6' : BI === 'a' ? '#5a4a42' : BI === 'd' ? '#d8c08a' : '#b0a080', s0: 14, s1: 44, a0: .22 });
            }
            stepPrint(o, u, dt);
            if (o.mount && (BI === 's' || WX.night) && (frameN + o.id) % 45 === 0) { const a = -o.root.rotation.y; DUST.add({ x: u.x + Math.cos(a) * 15 * o.mk.k, y: heightAt(u.x, u.y) + 19 * o.mk.k, z: u.y + Math.sin(a) * 15 * o.mk.k, vx: Math.cos(a) * .3, vy: .15, vz: Math.sin(a) * .3, l: 40, c: '#f0f4f8', s0: 3, s1: 9, a0: .35 }); }   // para z nozdier
        }
        if (WX.n === 'ash' && Math.random() < .5) FIRE.add({ x: cx + (Math.random() - .5) * 300, y: heightAt(cx, cz) + 2, z: cz + (Math.random() - .5) * 300, vx: (Math.random() - .5) * .3, vy: .3 + Math.random() * .5, vz: (Math.random() - .5) * .3, l: 120, c: '#ff8a30', c1: '#401004', s0: 1.2, s1: .4, a0: .9 });   // žeravý popol Mordoru
        if (SGB && WX.night) for (const a of AR) if (a.m3 && Math.random() < .5) FIRE.add({ x: a.m3.position.x, y: a.m3.position.y, z: a.m3.position.z, l: 10, c: '#ffc060', c1: '#801804', s0: 5, s1: 2, a0: .9 });   // horiace šípy pri nočnom obliehaní
        if (trDirty && frameN % 8 === 0) { trTex.needsUpdate = true; trDirty = 0; }
        stepDebris(dt);
        stepTrails();
    }
    /** Stopa čepele: pás medzi stredom a hrotom zbrane počas úderu (hrdina a útočníci pri kamere). */
    function stepTrails() {
        if (QN() < 1) return;
        const t = T(), h = U[0], C2 = typeof CMB !== 'undefined' ? CMB : {};
        for (const u of U) {
            const o = units.get(u); if (!o || !o.B || u.hp <= 0 || o.H.bow) continue;
            const act = u.h ? (C2.swing && C2.swing.t > 0 && C2.swing.k !== 'c') : (o.atk > .3 && Math.hypot(u.x - h.x, u.y - h.y) < 200);
            if (!o.trail && !act) continue;
            if (!o.trail) { const g = new t.BufferGeometry(); g.setAttribute('position', new t.BufferAttribute(new Float32Array(16 * 2 * 3), 3)); g.setAttribute('color', new t.BufferAttribute(new Float32Array(16 * 2 * 3), 3)); const ix = []; for (let i = 0; i < 15; i++) ix.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); g.setIndex(ix); const m = new t.Mesh(g, MAT.trail || (MAT.trail = new t.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: t.AdditiveBlending, depthWrite: false, side: t.DoubleSide }))); m.frustumCulled = false; m.renderOrder = 7; scene.add(m); o.trail = { m, P: [] }; }
            const Tr = o.trail;
            if (act) { const a = new t.Vector3(), b = new t.Vector3(); o.tip.getWorldPosition(a); o.mid.getWorldPosition(b); Tr.P.unshift([a, b]); if (Tr.P.length > 16) Tr.P.pop(); }
            else if (Tr.P.length) Tr.P.pop();
            const pa = Tr.m.geometry.attributes.position, ca = Tr.m.geometry.attributes.color, n = Tr.P.length, k0 = u.h ? .9 : .5;
            for (let i = 0; i < 16; i++) { const e = Tr.P[Math.min(i, n - 1)]; if (!e) { pa.setXYZ(i * 2, 0, -999, 0); pa.setXYZ(i * 2 + 1, 0, -999, 0); continue; } const f = (1 - i / 16) * k0; pa.setXYZ(i * 2, e[0].x, e[0].y, e[0].z); pa.setXYZ(i * 2 + 1, e[1].x, e[1].y, e[1].z); ca.setXYZ(i * 2, f, f * .95, f * .8); ca.setXYZ(i * 2 + 1, 0, 0, 0); }
            pa.needsUpdate = ca.needsUpdate = true; Tr.m.visible = n > 1;
        }
    }
    /** Mäkké tiene pod vojakmi a tlačenie trávy (hrdina a vojaci pri kamere). */
    const BLM = {};
    function stepBlobs() {
        if (!blobs && !grassM) return;
        const t = T(), M = BLM.M || (BLM.M = new t.Matrix4()), Ry = BLM.R || (BLM.R = new t.Matrix4()); let n = 0; const cx = cam.position.x, cz = cam.position.z, near = [];
        for (const u of U) {
            if (u.fled) continue; const o = units.get(u); if (!o || o.tp.boss) continue;
            const r = (u.r || 6) * (o.mount ? 2.4 : 1.7) * (u.hp <= 0 ? 1.5 : 1);
            if (blobs && n < 700) { M.makeScale(r, 1, r * (o.mount && u.hp > 0 ? 1.6 : 1)); M.premultiply(Ry.makeRotationY(o.root.rotation.y)); M.setPosition(u.x, heightAt(u.x, u.y) + .45, u.y); blobs.setMatrixAt(n++, M); }
            if (u.hp > 0) near.push([Math.hypot(u.x - cx, u.y - cz), u, o.mount ? 9 : 5]);
        }
        if (blobs) { blobs.count = n; blobs.instanceMatrix.needsUpdate = true; }
        if (grassM) { near.sort((a, b) => a[0] - b[0]); const P = grassM.material.uniforms.uPush.value; for (let i = 0; i < 12; i++) { const e = near[i]; if (e) P[i].set(e[1].x, e[1].y, e[2]); else P[i].set(-999, -999, 0); } const fw = new t.Vector3(); cam.getWorldDirection(fw); fw.y = 0; fw.normalize(); grassM.material.uniforms.uCam.value.set(cx + fw.x * 120, cz + fw.z * 120); }
    }

    // ---------- kamera a vstup ----------
    function camUpdate(dt) {
        const h = typeof camUnit === 'function' ? camUnit() : U[0], t = T(), hm = h.h ? G.eq.m && !h.dis : typeof mounted === 'function' && mounted(h);   // po páde hrdinu kamera sleduje tvojich vojakov
        if (photo) return photoCam(dt);
        if (lookOn() && !intro) return lookCam(dt);
        if (keys.z) yaw -= .03 * dt; if (keys.c) yaw += .03 * dt;
        const fx = Math.cos(yaw), fz = Math.sin(yaw), hy = heightAt(h.x, h.y) + (hm ? 28 : 19);
        const want = new t.Vector3(h.x - fx * zoom * Math.cos(pitch), hy + zoom * Math.sin(pitch) + 6, h.y - fz * zoom * Math.cos(pitch));
        const gy = heightAt(want.x, want.z) + 8; if (want.y < gy) want.y = gy;
        let look = new t.Vector3(h.x + fx * 40, hy, h.y + fz * 40);
        if (slow && slow.u) { const v = slow.u, k = Math.min(1, (100 - slow.t) / 20) * Math.min(1, slow.t / 20); look.lerp(new t.Vector3(v.x, heightAt(v.x, v.y) + 20, v.y), k * .7); }   // spomalenie: pohľad na padlého
        if (!tgt) { tgt = look.clone(); cam.position.copy(want); }
        if (intro) {   // nástup do bitky: kamera prejde popred tvoje šíky, preletí nad bojiskom k nepriateľovi a vráti sa za hrdinu; potom roh a útok
            intro.t += dt; const I = intro, k = Math.min(1, I.t / I.T), sm = x => x * x * (3 - 2 * x); let P, L;
            if (!I.pc) { const mine = U.filter(u => !u.t && u.hp > 0), foes = U.filter(u => u.t && u.hp > 0), cen = A => A.reduce((a, u) => a.add(new t.Vector3(u.x, 0, u.y)), new t.Vector3()).multiplyScalar(1 / Math.max(1, A.length));
                I.pc = cen(mine); I.ec = cen(foes); I.pc.y = heightAt(I.pc.x, I.pc.z) + 14; I.ec.y = heightAt(I.ec.x, I.ec.z) + 16;
                const d = I.ec.clone().sub(I.pc); d.y = 0; d.normalize(); I.d = d; I.side = new t.Vector3(-d.z, 0, d.x);
                const at = (v, up) => { v.y = Math.max(v.y, heightAt(v.x, v.z) + up); return v; };
                I.a0 = at(I.pc.clone().addScaledVector(d, 46).addScaledVector(I.side, -150), 12); I.a1 = at(I.pc.clone().addScaledVector(d, 46).addScaledVector(I.side, 150), 12); I.b1 = at(I.ec.clone().addScaledVector(d, -110), 46); }
            if (k < .36) { const e = sm(k / .36); P = I.a0.clone().lerp(I.a1, e); L = I.pc.clone().addScaledVector(I.side, (e - .5) * 160); }
            else if (k < .66) { const e = sm((k - .36) / .3); P = I.a1.clone().lerp(I.b1, e); P.y += Math.sin(e * Math.PI) * 70; L = I.pc.clone().lerp(I.ec, Math.min(1, e * 1.3)); }
            else { const e = sm((k - .66) / .34); P = I.b1.clone().lerp(want, e); L = I.ec.clone().lerp(look, e); }
            cam.position.copy(P); tgt.copy(L); cam.lookAt(tgt);
            if (k >= 1) { intro = null; try { if (typeof snd === 'function') snd('horn'); if (typeof roar === 'function') roar(1); } catch (e) { } }   // roh a bojový pokrik: útok
        } else { cam.position.lerp(want, Math.min(1, .18 * dt)); tgt.lerp(look, Math.min(1, .25 * dt)); cam.lookAt(tgt); }
        if (SHAKE > 0) { cam.position.x += (Math.random() - .5) * SHAKE * 1.2; cam.position.y += (Math.random() - .5) * SHAKE * 1.2; }
        const C2 = typeof CMB !== 'undefined' ? CMB : {}, fov = 52 + (C2.charging || C2.couch ? 9 : 0) + Math.min(5, Math.max(0, (Math.hypot(C2.vx || 0, C2.vy || 0) - 2.5) * 3)) - (C2.draw > 20 ? 5 : 0);   // rozšírenie záberu v cvale a pri nápore
        if (Math.abs(cam.fov - fov) > .05) { cam.fov += (fov - cam.fov) * Math.min(1, .08 * dt); cam.updateProjectionMatrix(); }
        lightsFollow(h.x, h.y, dt);
    }
    /** Kamera ako vo Warbande: myš otáča (yaw, lp), tretia osoba za plecom alebo prvá osoba z hlavy hrdinu. */
    function lookCam(dt) {
        const h = typeof camUnit === 'function' ? camUnit() : U[0], t = T(), o = units.get(h), F = new t.Vector3(Math.cos(lp) * Math.cos(yaw), Math.sin(lp), Math.cos(lp) * Math.sin(yaw)), Rt = new t.Vector3(-Math.sin(yaw), 0, Math.cos(yaw));
        const head = new t.Vector3(); if (o && o.B) o.B.hd.getWorldPosition(head); else head.set(h.x, heightAt(h.x, h.y) + ((h.h ? G.eq.m && !h.dis : typeof mounted === 'function' && mounted(h)) ? 40 : 22), h.y);
        let pos;
        if (fpv && h.h && h.hp > 0) {
            pos = head.clone().addScaledVector(F, FPC.f).addScaledVector(Rt, FPC.side); pos.y += FPC.up;
            if (o && !o.mount) pos.y += Math.sin(o.ph * 2) * .35 * Math.min(1, o.sp);
            else if (o && o.mount) pos.y += Math.sin((o.ph || 0) * 2.2) * .3 * Math.min(1, o.sp || 0);   // krok
            if (cam.near !== .4) { cam.near = .4; cam.updateProjectionMatrix(); }
            cam.position.copy(pos);
        } else {
            if (cam.near !== 2) { cam.near = 2; cam.updateProjectionMatrix(); }
            const z = Math.max(30, Math.min(200, zoom * .7)); pos = head.clone(); pos.y += 3; pos.addScaledVector(F, -z).addScaledVector(Rt, 7.5);
            const gy = heightAt(pos.x, pos.z) + 4; if (pos.y < gy) pos.y = gy;
            cam.position.lerp(pos, Math.min(1, .55 * dt));
        }
        const look = cam.position.clone().addScaledVector(F, 200); cam.lookAt(look); tgt = look;
        if (SHAKE > 0) { cam.position.x += (Math.random() - .5) * SHAKE * .8; cam.position.y += (Math.random() - .5) * SHAKE * .8; }
        const C2 = typeof CMB !== 'undefined' ? CMB : {}, fov = (fpv ? FPC.fov : 54) + (C2.charging || C2.couch ? 8 : 0) + Math.min(5, Math.max(0, (Math.hypot(C2.vx || 0, C2.vy || 0) - 2.5) * 3)) - (C2.draw > 20 ? (fpv ? 8 : 5) : 0);   // pri napnutom luku sa záber priblíži (aj v tretej osobe)
        if (Math.abs(cam.fov - fov) > .05) { cam.fov += (fov - cam.fov) * Math.min(1, .1 * dt); cam.updateProjectionMatrix(); }
        lightsFollow(h.x, h.y, dt);
    }
    /** Mierenie: bod pod zameriavačom (stred obrazovky) → smer a náklon výstrelu z ramena hrdinu, bod na zemi pre simuláciu. */
    /** Lúč proti terénu: kroky po výškovej funkcii a spresnenie polením (rýchle aj pri 500 vojakoch, bez prechádzania trojuholníkov). */
    const RG = { p: null };
    function rayGround(o, d, max) {
        const t = T(); if (!RG.p) RG.p = new t.Vector3();
        let prev = 0, step = 6;
        for (let s = step; s <= max; s += step) {
            const x = o.x + d.x * s, y = o.y + d.y * s, z = o.z + d.z * s;
            if (x >= -50 && z >= -50 && x <= BW + 50 && z <= BH + 50 && y <= heightAt(x, z)) {
                let a = prev, b = s; for (let i = 0; i < 10; i++) { const m = (a + b) / 2; if (o.y + d.y * m <= heightAt(o.x + d.x * m, o.z + d.z * m)) b = m; else a = m; }
                return new t.Vector3(o.x + d.x * b, o.y + d.y * b, o.z + d.z * b);
            }
            prev = s; if (s > 300) step = 12;
        }
        return null;
    }
    function computeAim() {
        if (typeof CMB === 'undefined') return;
        if (!lookOn() || photo) { CMB.aim3 = null; return; }
        const t = T(), h = U[0], dir = new t.Vector3(); cam.getWorldDirection(dir);
        const hitT = rayGround(cam.position, dir, 1800);
        const P = hitT || cam.position.clone().addScaledVector(dir, 1800);
        const sY = heightAt(h.x, h.y) + (typeof seatH === 'function' ? seatH(h) + bodyH(h) * .72 : 19);
        CMB.aim3 = { yaw: Math.atan2(P.z - h.y, P.x - h.x), pitch: Math.atan2(P.y - sY, Math.max(1, Math.hypot(P.x - h.x, P.z - h.y))) };
        if (hitT) { ptr.x = P.x - bc.x; ptr.y = P.z - bc.y; } else { ptr.x = h.x + Math.cos(yaw) * 200 - bc.x; ptr.y = h.y + Math.sin(yaw) * 200 - bc.y; }
    }
    function lookMove(dx, dy) { if (!on || photo) return; yaw += dx * .0026; lp = Math.max(-1.15, Math.min(.95, lp - dy * .0026)); }
    function toggleFP() { if (!on) return; fpv = !fpv; if (typeof OPT !== 'undefined') { OPT.view = fpv ? 'fp' : 'tp'; if (typeof saveOpt === 'function') saveOpt(); } if (typeof wbMsg === 'function') wbMsg(fpv ? 'Pohľad z prvej osoby' : 'Pohľad z tretej osoby', '#e8d8a8'); }
    function lightsFollow(x, y, dt) {
        const h = typeof camUnit === 'function' ? camUnit() : U[0];
        sun.position.set(x + sunDir.x * 500, sunDir.y * 500, y + sunDir.z * 500); sun.target.position.set(x, 0, y);
        if (skyM) skyM.position.copy(cam.position);
        stepAtmo(dt);
        if (wx && wx.visible) { wx.position.set(cam.position.x, 0, cam.position.z); const p = wx.geometry.attributes.position, rain = wx.userData.rain, sp = WX.n === 'snow' ? .7 : WX.n === 'ash' ? .5 : 5.5; for (let i = 0; i < p.count; i += rain ? 2 : 1) { let y = p.getY(i) - sp * dt; if (y < 0) y += 260; p.setY(i, y); if (rain) p.setY(i + 1, y + 7); } p.needsUpdate = true; }
        if (torches.length) { const tb = []; units.forEach((o, u) => { if (o.torch && u.hp > 0) tb.push([Math.hypot(u.x - h.x, u.y - h.y), u]); }); tb.sort((a, b) => a[0] - b[0]); torches.forEach((l, i) => { const e = tb[i]; if (!e) { l.intensity = 0; return; } const u = e[1]; l.position.set(u.x, heightAt(u.x, u.y) + 34, u.y); l.intensity = 13 + Math.sin(clock * 9 + i) * 2; }); }
    }
    /** Fotorežim: hra stojí, kamera voľne lieta (WASD, ťahanie myšou, koliesko výška), rozhranie je skryté. */
    function photoCam(dt) {
        const t = T(), P = photo, f = new t.Vector3(Math.cos(P.yaw) * Math.cos(P.pitch), Math.sin(P.pitch), Math.sin(P.yaw) * Math.cos(P.pitch)), r = new t.Vector3(-Math.sin(P.yaw), 0, Math.cos(P.yaw)), sp = 2.4 * dt * (keys.Shift ? 3 : 1);
        if (keys.w || keys.ArrowUp) P.pos.addScaledVector(f, sp); if (keys.s || keys.ArrowDown) P.pos.addScaledVector(f, -sp);
        if (keys.d || keys.ArrowRight) P.pos.addScaledVector(r, sp); if (keys.a || keys.ArrowLeft) P.pos.addScaledVector(r, -sp);
        if (keys.q) P.pos.y += sp; if (keys.e) P.pos.y -= sp;
        P.pos.y = Math.max(heightAt(P.pos.x, P.pos.z) + 3, P.pos.y);
        cam.position.copy(P.pos); cam.lookAt(P.pos.clone().add(f));
        lightsFollow(P.pos.x + f.x * 100, P.pos.z + f.z * 100, dt);
    }
    function photoToggle() {
        if (!on) return;
        const ui = typeof game !== 'undefined' && game.scene.getScene('UI');
        if (photo) { photo = null; if (ui) ui.scene.setVisible(true); const el = document.getElementById('b3dPhoto'); if (el) el.remove(); return; }
        const f = new (T().Vector3)(); cam.getWorldDirection(f);
        photo = { pos: cam.position.clone(), yaw: Math.atan2(f.z, f.x), pitch: Math.asin(Math.max(-.9, Math.min(.9, f.y))) };
        if (ui) ui.scene.setVisible(false);
        const el = document.createElement('div'); el.id = 'b3dPhoto'; el.textContent = 'Fotorežim – WASD pohyb, Q/E hore a dole, Shift rýchlo, ťahaj myšou otáčanie · P alebo Esc koniec';
        el.style.cssText = 'position:absolute;left:50%;bottom:10px;transform:translateX(-50%);z-index:5;color:#ecdfc6;background:rgba(18,14,12,.6);padding:.3rem .8rem;border-radius:4px;font:14px Georgia,serif;pointer-events:none';
        canvas.parentNode.appendChild(el);
    }
    /** Pohyb WASD vzhľadom na kameru: [mx, my] v smere obrazovky → smer na bojisku. */
    function rel(mx, my) { const fx = Math.cos(yaw), fz = Math.sin(yaw), rx = -fz, rz = fx; return [fx * -my + rx * mx, fz * -my + rz * mx]; }
    /** Bod na zemi pod kurzorom (súradnice plátna Phaseru). */
    function pick(px, py) {
        if (!cam || !terrain) return null;
        const t = T(), rc = new t.Raycaster(), v = new t.Vector2(px / (W * RES) * 2 - 1, -(py / (H * RES)) * 2 + 1);
        rc.setFromCamera(v, cam);
        const hit = rayGround(rc.ray.origin, rc.ray.direction, 2600);
        if (hit) return { x: hit.x, y: hit.z };
        const o = rc.ray.origin, d = rc.ray.direction; if (d.y >= 0) return null; const k = -o.y / d.y; return { x: o.x + d.x * k, y: o.z + d.z * k };
    }
    function wheel(dy) { if (photo) { photo.pos.y += dy * .05; return; } zoom = Math.max(55, Math.min(320, zoom + dy * .12)); }
    function dragStart(x, y) { drag = [x, y || 0]; }
    function dragMove(x, y) { if (drag == null) return; if (photo) { photo.yaw += (x - drag[0]) * .005; photo.pitch = Math.max(-1.2, Math.min(1.2, photo.pitch - ((y || 0) - drag[1]) * .005)); } else yaw += (x - drag[0]) * .005; drag = [x, y || 0]; }
    function dragEnd() { drag = null; }
    function skipIntro() { if (intro) intro.T = Math.min(intro.T, intro.t + 12); }
    /** Násobok rýchlosti simulácie (spomalenie pri páde bossa alebo veliteľa, zastavenie vo fotorežime). */
    function timeK() { if (photo || intro) return 0; return slow ? slow.k : 1; }   // počas nástupu do bitky vojská stoja v šíkoch

    // ---------- okolie bojiska: vzdialené hory, sopka, hrad na kopci, lesy, dym z dedín ----------
    let pano = null, panoSmoke = [], volcano = null;
    function buildPanorama(B, fogC, night) {
        panoSmoke = []; volcano = null;
        if (WX.n === 'fog') return;
        const t = T(), P = Part(), cx = BW / 2, cz = BH / 2; let sd = 7 + Math.floor(((G && G.x) || 0) * 3 + ((G && G.y) || 0)); const rr = () => (sd = sd * 16807 % 2147483647) / 2147483647; rr(); rr();
        const mord = BI === 'a', des = BI === 'd', snowy = BI === 's';
        const rock = mord ? '#2e2624' : des ? '#a8865e' : snowy ? '#8a929c' : '#66707c';
        for (let i = 0; i < 36; i++) {   // pohorie dookola
            const a = i / 36 * 6.283 + rr() * .14, R0 = 1950 + rr() * 450, hh = (des ? 110 : 200) + rr() * (des ? 150 : 430), ww = hh * (des ? 2.4 : 1.25 + rr() * .9), rot = [0, rr() * 3, 0];
            const x = cx + Math.cos(a) * R0, z = cz + Math.sin(a) * R0;
            if (des) { P.add('cyl6', rock, [x, hh / 2 - 30, z], rot, [ww, hh, ww * .8]); continue; }
            P.add('cone6', rock, [x, hh / 2 - 30, z], rot, [ww, hh, ww * (.7 + rr() * .4)]);
            for (const sd2 of [-1, 1]) if (rr() < .7) { const h2 = hh * (.45 + rr() * .25), ox = -Math.sin(a) * ww * .38 * sd2, oz = Math.cos(a) * ww * .38 * sd2; P.add('cone6', rock, [x + ox, h2 / 2 - 30, z + oz], [0, rr() * 3, 0], [ww * .6, h2, ww * .55]); }   // vedľajšie štíty
            if (snowy || (!mord && hh > 330)) P.add('cone6', '#f2f5f8', [x, hh - 30 - hh * .17, z], rot, [ww * .35, hh * .35, ww * .35 * (.75 + .3 * rr())]);
        }
        if (mord) {   // sopka s červenou žiarou a dymom
            const a = 1.1 + rr(), x = cx + Math.cos(a) * 2150, z = cz + Math.sin(a) * 2150;
            P.add('cone', '#221a18', [x, 300, z], [0, 0, 0], [1100, 680, 1000]).add('cyl12', '#ff5a18', [x, 642, z], [0, 0, 0], [120, 6, 110]);
            volcano = { x, y: 650, z };
        }
        if (!mord && !des) {   // hrad na kopci
            const a = rr() * 6.283, x = cx + Math.cos(a) * 1500, z = cz + Math.sin(a) * 1500, st = '#9a958a';
            P.add('sph2', BI === 's' ? '#d8dfe4' : '#4e6236', [x, -30, z], [0, 0, 0], [520, 190, 460]).add('box', st, [x, 80, z], [0, a, 0], [190, 46, 150]);
            for (const [dx, dz] of [[-95, -75], [95, -75], [-95, 75], [95, 75]]) P.add('cyl12', st, [x + dx, 92, z + dz], [0, 0, 0], [30, 72, 30]).add('cone', '#5a3a2a', [x + dx, 140, z + dz], [0, 0, 0], [36, 26, 36]);
            P.add('cyl12', '#a8a296', [x, 140, z], [0, 0, 0], [48, 150, 48]).add('cone', '#5a3a2a', [x, 228, z], [0, 0, 0], [56, 34, 56]);
            panoSmoke.push({ x: x + 60, z: z + 30, y: 110, k: .6 });
        }
        if (!des) for (let i = 0; i < 150; i++) {   // lesy na obzore
            const a = rr() * 6.283, R0 = 1250 + rr() * 420, x = cx + Math.cos(a) * R0, z = cz + Math.sin(a) * R0, hh = 50 + rr() * 60;
            if (mord) { P.add('cone6', '#1c1614', [x, hh * .3, z], [0, 0, 0], [6, hh * .6, 6]); continue; }
            P.add('cone6', snowy ? '#33453a' : i % 3 ? '#2a4024' : '#34502c', [x, hh / 2 - 6, z], [0, rr() * 3, 0], [hh * .55, hh, hh * .55]);
            if (snowy) P.add('cone6', '#e8eef2', [x, hh * .75, z], [0, 0, 0], [hh * .3, hh * .35, hh * .3]);
        }
        if (!mord) for (let i = 0; i < 2; i++) { const a = rr() * 6.283, R0 = 1350 + rr() * 300; panoSmoke.push({ x: cx + Math.cos(a) * R0, z: cz + Math.sin(a) * R0, y: 20, k: 1 }); }   // dym z dedín
        const geo = P.build(), pa = geo.attributes.position, na = geo.attributes.normal, ca = geo.attributes.color, fc = fogC.clone(), c = C('#000'), sd2 = sunDir.clone();
        for (let i = 0; i < pa.count; i++) {   // svetlo slnka a opar vzdušnej perspektívy sú zapečené do farieb
            const lam = Math.max(0, na.getX(i) * sd2.x + na.getY(i) * sd2.y + na.getZ(i) * sd2.z), d = Math.hypot(pa.getX(i) - cx, pa.getZ(i) - cz);
            c.setRGB(ca.getX(i), ca.getY(i), ca.getZ(i)).multiplyScalar((night ? .25 : .55) + lam * (night ? .25 : .65));
            if (ca.getX(i) > .9 && ca.getY(i) < .5 && mord) c.setRGB(2.2, .6, .15);   // žeravý kráter
            else c.lerp(fc, Math.min(.9, .28 + (d - 1100) / 2600 + (night ? .25 : 0) + (WX.n === 'rain' || WX.n === 'storm' ? .2 : 0) + (ca.getX(i) > .85 && ca.getZ(i) > .85 ? .15 : 0)));
            ca.setXYZ(i, c.r, c.g, c.b);
        }
        pano = new t.Mesh(geo, new t.MeshBasicMaterial({ vertexColors: true, fog: false })); pano.renderOrder = -4; scene.add(pano);
    }
    function stepPanorama(dt) {
        if (!DUST) return;
        for (const p of panoSmoke) if (Math.random() < .12 * dt) DUST.add({ x: p.x + (Math.random() - .5) * 10, y: p.y, z: p.z, vx: .12 + Math.random() * .08, vy: .3 + Math.random() * .15, vz: .04, l: 420, c: WX.night ? '#3a3a40' : '#9a948c', s0: 30 * p.k, s1: 150 * p.k, a0: .22 });
        if (volcano && Math.random() < .2 * dt) { DUST.add({ x: volcano.x + (Math.random() - .5) * 60, y: volcano.y, z: volcano.z + (Math.random() - .5) * 60, vx: .3, vy: .6 + Math.random() * .3, vz: .1, l: 700, c: '#2a2220', s0: 140, s1: 520, a0: .4 }); if (Math.random() < .4) FIRE.add({ x: volcano.x, y: volcano.y, z: volcano.z, vx: (Math.random() - .5) * 2, vy: 2 + Math.random() * 2, vz: (Math.random() - .5) * 2, g: .03, l: 90, c: '#ffb050', c1: '#801804', s0: 22, s1: 8, a0: 1 }); }
    }

    // ---------- stopy v blate a snehu, vtáky, lístie ----------
    let prints = null, birds = null, birdP = [];
    function printTex(hoof) {
        const c = document.createElement('canvas'); c.width = 64; c.height = 32; const x = c.getContext('2d'); x.fillStyle = '#fff';
        if (hoof) { x.lineWidth = 6; x.strokeStyle = '#fff'; x.beginPath(); x.arc(32, 16, 10, Math.PI * .25, Math.PI * 1.75); x.stroke(); }
        else { x.beginPath(); x.ellipse(24, 16, 15, 9, 0, 0, 6.283); x.fill(); x.beginPath(); x.ellipse(48, 16, 9, 7, 0, 0, 6.283); x.fill(); }
        const tx = new (T().CanvasTexture)(c); return tx;
    }
    function buildPrints(B) {
        if (QN() < 1) { prints = null; return; }
        const t = T(), mk = hoof => { const im = new t.InstancedMesh(new t.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new t.MeshBasicMaterial({ map: printTex(hoof), color: C(BI === 's' ? '#8a96a4' : B.mud).multiplyScalar(BI === 's' ? 1 : .6), transparent: true, opacity: BI === 's' ? .75 : .5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }), 700); im.count = 0; im.renderOrder = 2; im.frustumCulled = false; scene.add(im); return { im, i: 0, n: 0 }; };
        prints = { f: mk(0), h: mk(1), M: new t.Matrix4(), q: new t.Quaternion(), e: new t.Euler(), v: new t.Vector3(), s: new t.Vector3() };
    }
    function addPrint(x, y, a, hoof, k) {
        const P = prints, S = hoof ? P.h : P.f; if (SGB && x > 990) return; if (FIELD && FIELD.river && Math.abs(x - riverX()) < 46) return;
        P.M.compose(P.v.set(x, heightAt(x, y) + .3, y), P.q.setFromEuler(P.e.set(0, a, 0)), P.s.set(hoof ? 2.6 * k : 3.6 * k, 1, hoof ? 2.6 * k : 1.9 * k));
        S.im.setMatrixAt(S.i, P.M); S.i = (S.i + 1) % 700; S.n = Math.min(700, S.n + 1); S.im.count = S.n; S.im.instanceMatrix.needsUpdate = true;
    }
    function stepPrint(o, u, dt) {
        if (!prints || o.sp < .3) return;
        o.stepD = (o.stepD || 0) + o.sp * dt;
        const ry = o.root.rotation.y, sx = Math.sin(ry), sz = Math.cos(ry), k = o.scaleH || 1;
        if (o.mount) { if (o.stepD < 13 * o.mk.k) return; o.stepD = 0; for (const s2 of [-1, 1]) addPrint(u.x + sx * s2 * 2.6 * o.mk.k, u.y + sz * s2 * 2.6 * o.mk.k, ry, 1, o.mk.k); if (QN() >= 1 && o.sp > 1.1 && DUST) dust(u.x, u.y, 2, 5 * o.mk.k); }
        else { if (o.stepD < 7 * k) return; o.stepD = 0; o.stepS = -(o.stepS || 1); addPrint(u.x + sx * o.stepS * 1.5 * k, u.y + sz * o.stepS * 1.5 * k, ry, 0, k); if (QN() >= 1 && o.sp > 1.0 && DUST && Math.random() < .6) dust(u.x + sx * o.stepS * 1.5 * k, u.y + sz * o.stepS * 1.5 * k, 1, 2.5 * k); }
    }
    function buildBirds() {
        birds = null; birdP = [];
        if (QN() < 1 || WX.night || WX.n === 'storm' || WX.n === 'fog') return;
        const t = T(), g = new t.BufferGeometry(); g.setAttribute('position', new t.Float32BufferAttribute([0, 0, 0, -1.2, 0, 0, -.4, 1, 3.4, 0, 0, 0, -1.2, 0, 0, -.4, 1, -3.4], 3)); g.computeVertexNormals();
        birds = new t.InstancedMesh(g, new t.MeshBasicMaterial({ color: C('#16120f'), side: t.DoubleSide }), 26); birds.frustumCulled = false; scene.add(birds);
        for (let f = 0; f < 2; f++) { const cx = 200 + Math.random() * 1000, cz = 150 + Math.random() * 650, r = 120 + Math.random() * 160, h = 150 + Math.random() * 70, sp = (.18 + Math.random() * .1) * (f ? -1 : 1); for (let i = 0; i < 13; i++) birdP.push({ cx, cz, r: r + (Math.random() - .5) * 40, h: h + (Math.random() - .5) * 26, sp, ph: Math.random() * 6.283, fl: Math.random() * 6 }); }
    }
    function stepBirds() {
        if (!birds) return;
        const t = T(), M = new t.Matrix4(), q = new t.Quaternion(), e = new t.Euler(), v = new t.Vector3(), sc = new t.Vector3();
        birdP.forEach((b, i) => { const a = b.ph + clock * b.sp, fl = Math.sin(clock * 11 + b.fl); M.compose(v.set(b.cx + Math.cos(a) * b.r, b.h + Math.sin(clock * .7 + b.ph) * 8, b.cz + Math.sin(a) * b.r), q.setFromEuler(e.set(0, -a - (b.sp > 0 ? Math.PI / 2 : -Math.PI / 2), 0)), sc.set(1.6, fl * 1.4, 1.6)); birds.setMatrixAt(i, M); });
        birds.instanceMatrix.needsUpdate = true;
    }
    function stepLeaves(dt) {
        if (!DUST || QN() < 1 || !cam) return;
        const rain = WX.n === 'rain' || WX.n === 'storm';
        if (BI === 'g' && !rain && Math.random() < .35 * dt) { const x = cam.position.x + (Math.random() - .5) * 420, z = cam.position.z + (Math.random() - .5) * 420; DUST.add({ x, y: heightAt(x, z) + 40 + Math.random() * 60, z, vx: .35 + Math.random() * .25, vy: -.18, vz: (Math.random() - .5) * .15, l: 300, c: ['#8a9a3a', '#b8902a', '#a85a22', '#6a8a30'][Math.random() * 4 | 0], s0: 1.3, s1: 1.3, a0: .95 }); }   // lístie vo vetre
        if (BI === 'd' && Math.random() < .12 * dt) { const x = cam.position.x + (Math.random() - .5) * 400, z = cam.position.z + (Math.random() - .5) * 400; DUST.add({ x, y: heightAt(x, z) + 3, z, vx: 1.2 + Math.random() * .5, vy: .05, vz: (Math.random() - .5) * .2, l: 160, c: '#d8c090', s0: 14, s1: 40, a0: .18 }); }   // piesok vo vetre
    }

    // ---------- meniace sa počasie, blesky ----------
    let puddleM = null, wxB = null, wxS = null, rainN = 0, bolt = null, boltT = 0, nextBolt = 300;
    const wxTarget = n => ({ clear: { cloud: wxB.cloud, rain: 0, dark: 0, fog: 0 }, rain: { cloud: .85, rain: .6, dark: .5, fog: 0 }, storm: { cloud: .85, rain: 1, dark: .88, fog: 0 }, fog: { cloud: .9, rain: 0, dark: 0, fog: 1 }, snow: { cloud: wxB.cloud, rain: 0, dark: .1, fog: 0 }, ash: { cloud: wxB.cloud, rain: 0, dark: .15, fog: 0 } })[n] || { cloud: wxB.cloud, rain: 0, dark: 0, fog: 0 };
    function stepWeather(dt) {
        if (!wxB || !skyM) return;
        const T0 = wxTarget(WX.n), k = Math.min(1, .004 * dt);
        if (!wxS) wxS = { ...T0 };
        for (const key of ['cloud', 'rain', 'dark', 'fog']) wxS[key] += (T0[key] - wxS[key]) * k;
        const U2 = skyM.material.uniforms; U2.uCloud.value = wxS.cloud; U2.uZen.value.copy(wxB.zen).lerp(wxB.sZen, wxS.dark * .85).lerp(wxB.fZen, wxS.fog * .7); U2.uHor.value.copy(wxB.hor).lerp(wxB.sHor, wxS.dark * .8).lerp(wxB.fHor, wxS.fog * .8); U2.uCloudC.value.copy(wxB.cloudC).lerp(wxB.sCloud, wxS.dark);
        if (puddleM) { puddleM.uniforms.uSky.value.copy(U2.uHor.value).multiplyScalar(WX.night ? .5 : .8); puddleM.uniforms.uZen.value.copy(U2.uZen.value).multiplyScalar(WX.night ? .5 : .8); }
        sun.intensity = wxB.sunI * (1 - wxS.dark * .65) * (1 - wxS.fog * .55); hemi.intensity = wxB.hemiI * (1 + wxS.dark * .25);
        if (WX.n !== 'snow' && WX.n !== 'ash') B3G.U_WET.value += ((wxS.rain > .3 ? 1 : wxB.wet) - B3G.U_WET.value) * Math.min(1, .003 * dt);
        if (scene.fog) { scene.fog.far = (wxB.fogF + (430 - wxB.fogF) * wxS.fog) * (1 - wxS.dark * .45); scene.fog.near = (wxB.fogN + (50 - wxB.fogN) * wxS.fog) * (1 - wxS.dark * .4); scene.fog.color.copy(wxB.fogC).lerp(wxB.sHor, wxS.dark * .6).lerp(wxB.fHor, wxS.fog * .8); }
        if (wx && wx.userData.rain) { const n = Math.round(rainN * Math.min(1, wxS.rain * 1.1)); wx.geometry.setDrawRange(0, n * 2); wx.visible = n > 0; }
        // blesky v búrke: záblesk oblohy a krajiny, klikatý blesk, hrom o chvíľu neskôr
        if (bolt) { boltT -= dt; bolt.visible = boltT > 0 && (boltT % 4 > 1.2); const fl = Math.max(0, boltT) / 14; hemi.intensity += fl * 6; sun.intensity += fl * 3; U2.uZen.value.lerp(C('#c8d0e8'), fl * .5); }
        if (WX.n === 'storm' && wxS.rain > .7 && (nextBolt -= dt) <= 0 && cam) {
            nextBolt = 240 + Math.random() * 480;
            const t = T(), a = Math.random() * 6.283, d = 500 + Math.random() * 700, x = cam.position.x + Math.cos(a) * d, z = cam.position.z + Math.sin(a) * d, pts = [];
            let px = x, py = 900, pz = z; while (py > heightAt(x, z)) { const ny = Math.max(heightAt(x, z), py - 40 - Math.random() * 60); const nx = px + (Math.random() - .5) * 60, nz = pz + (Math.random() - .5) * 60; pts.push(px, py, pz, nx, ny, nz); if (Math.random() < .3) pts.push(nx, ny, nz, nx + (Math.random() - .5) * 90, ny - 50, nz + (Math.random() - .5) * 90); px = nx; py = ny; pz = nz; }
            if (bolt) { scene.remove(bolt); bolt.geometry.dispose(); }
            const g = new t.BufferGeometry(); g.setAttribute('position', new t.Float32BufferAttribute(pts, 3));
            bolt = new t.LineSegments(g, new t.LineBasicMaterial({ color: C('#f0f4ff').multiplyScalar(4), fog: false })); bolt.frustumCulled = false; scene.add(bolt); boltT = 14;
            const L = flashL[0]; L.position.set(x, 200, z); L.color.set('#c8d8ff'); L.intensity = 3000; L.distance = 1600;
            if (typeof thunder === 'function') setTimeout(() => { try { if (on) thunder(); } catch (e) { } }, 400 + d * 2.2);
            if (typeof thunderAt !== 'undefined') try { thunderAt = (typeof AMB !== 'undefined' && AMB && AMB.c ? AMB.c.currentTime : 0) + 6; } catch (e) { }
        }
        // deň plynie aj počas bitky: slnko pomaly klesá a teplie (dlhé tiene ku koncu bitky)
        if (!WX.night && sunDir && (U[0].tt || 0) > 0) { const k = Math.min(1, (U[0].tt || 0) / 36000); if (!wxB.sd0) wxB.sd0 = sunDir.clone(); const el = Math.max(.12, wxB.sd0.y - .14 * k), hz = Math.sqrt(Math.max(0, 1 - wxB.sd0.y * wxB.sd0.y)), az = Math.atan2(wxB.sd0.z, wxB.sd0.x) + .25 * k, he = Math.sqrt(1 - el * el); sunDir.set(Math.cos(az) * he, el, Math.sin(az) * he); if (hz >= 0) { U2.uSunDir.value.copy(sunDir); if (waterM) waterM.material.uniforms.uSunDir.value.copy(sunDir); } sun.color.copy(wxB.sunC0 || (wxB.sunC0 = sun.color.clone())).lerp(C('#ff9a50'), k * .35); }
        B3G.U_SNOW.value = WX.n === 'snow' ? Math.min(.8, B3G.U_SNOW.value + .00025 * dt) : Math.max(0, B3G.U_SNOW.value - .002 * dt);   // sneh sa ukladá na plecia a prilby
        if (WX.chg) { WX.chg = 0; if (!wx && (WX.n === 'rain' || WX.n === 'storm')) makeRain(); }
    }
    function makeRain() {
        if (QN() < 1 || ['snow', 'ash'].includes(WX.n) || BI === 'd') return;
        const t = T(), n = 2600, p = new Float32Array(n * 6);
        for (let i = 0; i < n; i++) { const x = (Math.random() - .5) * 600, y = Math.random() * 260, z = (Math.random() - .5) * 600; p.set([x, y, z, x - 1.2, y + 7, z - .4], i * 6); }
        const gg = new t.BufferGeometry(); gg.setAttribute('position', new t.BufferAttribute(p, 3));
        wx = new t.LineSegments(gg, new t.LineBasicMaterial({ color: C('#b4c4dc'), transparent: true, opacity: .45 })); wx.userData.rain = true; wx.frustumCulled = false; scene.add(wx); rainN = n;
        gg.setDrawRange(0, 0);
    }

    // ---------- horiace strechy pri obliehaní, šírenie ohňa po tráve ----------
    let roofs = [], hdData = null;
    function stepRoofs(dt) {
        if (!SGB || !roofs.length) return;
        const tt = U[0].tt || 0;
        for (const r of roofs) {
            if (!r.on && tt > r.at) { r.on = 1; const L = roofL.find(l => !l.userData.r); if (L) { L.userData.r = r; L.position.set(r.x, r.y + 14, r.z); } }
            if (!r.on) continue;
            r.k = Math.min(1, (r.k || 0) + dt * .002);
            const n = r.k * 2.4 * dt; for (let i = 0; i < n; i++) flame(r.x + (Math.random() - .5) * r.w * .8, r.y + Math.random() * 4, r.z + (Math.random() - .5) * r.d * .8, .9 + r.k * .6);
            if (Math.random() < .25 * r.k * dt) smoke(r.x + (Math.random() - .5) * r.w * .5, r.y + 16, r.z + (Math.random() - .5) * r.d * .5, 2.4, '#2a2420');
            if (Math.random() < .3 * dt) FIRE.add({ x: r.x + (Math.random() - .5) * r.w, y: r.y + 6, z: r.z + (Math.random() - .5) * r.d, vx: (Math.random() - .5) * .5, vy: 1.4 + Math.random(), vz: (Math.random() - .5) * .5, l: 70, c: '#ffd080', c1: '#601004', s0: 1.6, s1: .4, a0: 1 });
        }
        for (const L of roofL) if (L.userData.r) L.intensity = (220 + Math.sin(clock * 13 + L.id) * 50) * L.userData.r.k;
    }
    let roofL = [];
    const canBurn = (x, y) => { if (!hdData || BI === 's' || WX.n === 'rain' || WX.n === 'storm' || x < 0 || y < 0 || x > BW || y > BH) return false; const i = Math.round(x / 5), j = Math.round(y / 5); return (hdData[(j * 289 + i) * 4 + 1] || 0) > .22; };

    // ---------- stopy šípov, vzdialené zástupy v jednej sieti, automatická kvalita ----------
    let arTr = null;
    function stepArrowTrails() {
        if (QN() < 1) return;
        const t = T();
        if (!arTr) { const g = new t.BufferGeometry(); g.setAttribute('position', new t.BufferAttribute(new Float32Array(600 * 6), 3)); g.setAttribute('color', new t.BufferAttribute(new Float32Array(600 * 6), 3)); arTr = new t.LineSegments(g, new t.LineBasicMaterial({ vertexColors: true, transparent: true, blending: t.AdditiveBlending, depthWrite: false })); arTr.frustumCulled = false; arTr.renderOrder = 7; scene.add(arTr); }
        const P = arTr.geometry.attributes.position, Cc = arTr.geometry.attributes.color; let n = 0; const k = WX.night ? .7 : .42;
        for (const a of AR) {
            if (!a.m3 || n >= 600 || a.l <= 0) continue;
            const p = a.m3.position, vl = Math.hypot(a.vx, a.vy, a.vz || 0) || 1, L = 24 + vl * 1.5;
            P.setXYZ(n * 2, p.x, p.y, p.z); P.setXYZ(n * 2 + 1, p.x - a.vx / vl * L, p.y - (a.vz || 0) / vl * L, p.z - a.vy / vl * L);
            Cc.setXYZ(n * 2, k, k * .96, k * .86); Cc.setXYZ(n * 2 + 1, 0, 0, 0); n++;
        }
        arTr.geometry.setDrawRange(0, n * 2); P.needsUpdate = Cc.needsUpdate = true;
    }
    let FAR = new Map(), FRX = { win0: 0, win1: 0 }, DIRT_K = 1;
    const AQ = { lvl: 0, t0: 0, n: 0, fps: 60, cool: 0, pr: 1 };
    function farPut(geo, mats, M, a0 = 0, a1 = 0, a2 = 0, a3 = 0) {
        let b = FAR.get(geo);
        if (!b || b.n >= b.cap) {
            const t = T(), cap = b ? b.cap * 2 : 64, im = new t.InstancedMesh(geo, mats, cap); im.castShadow = QN() >= 2; im.receiveShadow = true; im.frustumCulled = false; im.count = 0; scene.add(im);
            const an = new t.InstancedBufferAttribute(new Float32Array(cap * 4), 4); an.setUsage(t.DynamicDrawUsage);
            if (b) { for (let i = 0; i < b.n; i++) { b.im.getMatrixAt(i, M0); im.setMatrixAt(i, M0); an.array.set(b.an.array.subarray(i * 4, i * 4 + 4), i * 4); } scene.remove(b.im); b.im.dispose(); }
            geo.setAttribute('aAnim', an);
            b = { im, cap, n: b ? b.n : 0, an }; FAR.set(geo, b);
        }
        b.an.array[b.n * 4] = a0; b.an.array[b.n * 4 + 1] = a1; b.an.array[b.n * 4 + 2] = a2; b.an.array[b.n * 4 + 3] = a3;
        b.im.setMatrixAt(b.n++, M);
    }
    let M0 = null, M1 = null, frameDt = 1, TV2 = null, CINE = 0, ORDK = null;
    /** Rozkazy viditeľné v boji: pri zmene rozkazu zatrúbi trúbka, zástavy plukov zamávajú a velitelia ukážu mečom smer. */
    function stepOrders() {
        if (typeof CMB === 'undefined' || !CMB.og) return;
        const k = JSON.stringify([CMB.og, CMB.fm]); if (ORDK === null) { ORDK = k; return; } if (k === ORDK) return; ORDK = k;
        if (typeof trumpetCall === 'function') trumpetCall(); else if (typeof snd === 'function') snd('horn');
        for (const [key, r] of REG) if (key[0] === '0') r.wave = 70;
        for (const u of U) if (!u.t && (u.cmd || u.h || u.bn) && u.hp > 0) { const o = units.get(u); if (o) o.point = 80; }
    }
    /** Tiene dymu: tmavé mäkké škvrny na zemi pod dymom z požiarov (po vetre). */
    let smokeSh = null;
    function stepSmokeShade() {
        if (QN() < 2) return; const t = T();
        if (!smokeSh) { smokeSh = new t.InstancedMesh(new t.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new t.MeshBasicMaterial({ color: 0x000000, alphaMap: B3G.softTex(), transparent: true, opacity: .22, depthWrite: false }), 24); smokeSh.renderOrder = 3; smokeSh.frustumCulled = false; scene.add(smokeSh); }
        const src = []; for (const f of fires) src.push([f.x, f.y, 1]); for (const r of roofs) if (r.on) src.push([r.x, r.z, 1.6 * r.k]); if (siege.burn) src.push([siege.tower.position.x, siege.tower.position.z, 1.5]); for (const c of campF) src.push([c.x, c.y, .5]);
        const M = new t.Matrix4(); let n = 0; for (const [x, y, k] of src) { if (n >= 24) break; for (const d of [26, 52]) { if (n >= 24) break; const px = x + d * .8, pz = y + d * .3; M.makeScale(34 * k + d * .5, 1, 26 * k + d * .4); M.setPosition(px, heightAt(px, pz) + .5, pz); smokeSh.setMatrixAt(n++, M); } }
        smokeSh.count = n; smokeSh.instanceMatrix.needsUpdate = true;
    }
    /** Odrazy okolia v brnení (ultra): malá kocková kamera pri hrdinovi raz za chvíľu nasníma okolie (oheň, vojaci, obloha). */
    let cubeRT = null, cubeCam = null;
    function stepEnv(force) {
        if (QN() < 3 || !force && (AQ.lvl >= 1 || photo || frameN % 45 !== 7)) return;
        const t = T(); if (!cubeRT) { cubeRT = new t.WebGLCubeRenderTarget(64, { type: t.HalfFloatType }); cubeCam = new t.CubeCamera(4, 1200, cubeRT); }
        const h = U[0]; cubeCam.position.set(h.x, heightAt(h.x, h.y) + 22, h.y);
        const hide = [grassM, overlay, wx, arTr, blobs].filter(Boolean), was = hide.map(m => m.visible); hide.forEach(m => m.visible = false);
        const o = units.get(h); if (o) o.root.visible = false;
        const au = R.shadowMap.autoUpdate; R.shadowMap.autoUpdate = false; cubeCam.update(R, scene); R.shadowMap.autoUpdate = au; cubeRT.texture.needsPMREMUpdate = true; scene.environment = cubeRT.texture;
        hide.forEach((m, i) => m.visible = was[i]); if (o) o.root.visible = true;
    }
    /** Ohne vrhajú tiene (ultra): jedno bodové svetlo s tieňom pri najbližšom ohni. */
    let fireL = null;
    function stepFireLight() {
        if (QN() < 3) return; const t = T();
        const src = []; for (const f of fires) src.push([f.x, heightAt(f.x, f.y) + 10, f.y, 1]); for (const r of roofs) if (r.on) src.push([r.x, r.y + 12, r.z, r.k]); for (const c of campF) src.push([c.x, heightAt(c.x, c.y) + 8, c.y, .6]);
        if (!src.length || !cam) { if (fireL) fireL.intensity = 0; return; }
        src.sort((a, b) => Math.hypot(a[0] - cam.position.x, a[2] - cam.position.z) - Math.hypot(b[0] - cam.position.x, b[2] - cam.position.z));
        if (!fireL) return;
        const [x, y, z, k] = src[0]; fireL.position.set(x, y, z); fireL.intensity = (WX.night ? 260 : 120) * k * (.85 + Math.sin(clock * 13) * .15); if (frameN % 4 === 0) fireL.shadow.needsUpdate = true;
    }
    const HALTON = [[.5, .333], [.25, .667], [.75, .111], [.125, .444], [.625, .778], [.375, .222], [.875, .556], [.0625, .889]];
    /** Ohne pri kamere pre chvenie horúceho vzduchu: [x, y obrazovky, polomer, sila]. */
    function hazeSpots() {
        const out = [], t = T(), v = HZV || (HZV = new t.Vector3()), list = [];
        for (const f of fires) list.push([f.x, heightAt(f.x, f.y) + 8, f.y, .8]);
        for (const r of roofs) if (r.on) list.push([r.x, r.y + 10, r.z, r.k]);
        for (const c of campF) list.push([c.x, heightAt(c.x, c.y) + 6, c.y, .5]);
        if (siege.burn) list.push([siege.tower.position.x, 50, siege.tower.position.z, siege.burn]);
        list.sort((a, b) => Math.hypot(a[0] - cam.position.x, a[2] - cam.position.z) - Math.hypot(b[0] - cam.position.x, b[2] - cam.position.z));
        for (const [x, y, z, k] of list) { if (out.length >= 4) break; v.set(x, y, z).project(cam); if (v.z > 1 || Math.abs(v.x) > 1.2 || Math.abs(v.y) > 1.2) continue; const dist = Math.hypot(x - cam.position.x, y - cam.position.y, z - cam.position.z); out.push(new t.Vector4(v.x * .5 + .5, v.y * .5 + .5, Math.min(.25, 22 / Math.max(20, dist)), k)); }
        return out;
    }
    let HZV = null;
    /** Zástavy plukov: nad každou skupinou (pechota, lukostrelci, jazda každej strany) sa vznáša veľká zástava frakcie, aby bolo vidieť šíky aj z diaľky. */
    let REG = new Map();
    function stepRegiments() {
        if (frameN % 10 !== 0 && REG.size) { for (const r of REG.values()) if (r.g.visible) { if (r.wave > 0) r.g.rotation.z = Math.sin(clock * 9) * .35 * Math.min(1, r.wave / 30); r.g.position.x += (r.x - r.g.position.x) * .25; r.g.position.z += (r.y - r.g.position.z) * .25; r.g.position.y += (heightAt(r.g.position.x, r.g.position.z) + r.h - r.g.position.y) * .25; } return; }
        const acc = new Map();
        for (const u of U) { if (u.hp <= 0 || u.fled || u.h || u.boss) continue; const o = units.get(u); if (!o || !o.tp.humanoid) continue;
            const k = (u.t ? 1 : 0) + (o.mount ? 'j' : o.tp.humanoid.bow ? 'l' : 'p'), a = acc.get(k) || acc.set(k, { x: 0, y: 0, n: 0, f: u.t ? (u.fc ?? 9) : G.fac, big: 0 }).get(k); a.x += u.x; a.y += u.y; a.n++; a.big = Math.max(a.big, o.mount ? 1 : 0); }
        for (const [k, a] of acc) {
            let r = REG.get(k);
            if (!r) { const t = T(), g = new t.Group(), pole = mesh(Part().add('cyl6', '#3a2a1a', [0, -6, 0], [0, 0, 0], [.9, 30, .9]).add('cone6', '#c8a040', [0, 10, 0], [0, 0, 0], [1.6, 3, 1.6], { m: 1 }).build()); pole.castShadow = false; g.add(pole); const f = bannerMesh(a.f, 16, 12); f.position.set(0, 3, 0); g.add(f); scene.add(g); r = { g, x: a.x / a.n, y: a.y / a.n, h: 58 }; r.g.position.set(r.x, heightAt(r.x, r.y) + r.h, r.y); REG.set(k, r); }
            r.x = a.x / a.n; r.y = a.y / a.n; r.h = a.big ? 72 : 58; r.g.visible = a.n >= 6 && (!cam || Math.hypot(cam.position.x - r.x, cam.position.z - r.y) > 170);   // pri kamere by zakrývala výhľad
            if (cam) r.g.rotation.y = Math.atan2(cam.position.x - r.x, cam.position.z - r.y) + Math.PI / 2;   // zástava natočená ku kamere
            if (r.wave > 0) { r.wave -= 10; r.g.rotation.z = Math.sin(clock * 9) * .35 * Math.min(1, r.wave / 30); } else r.g.rotation.z = 0;   // signál zástavou
        }
        for (const [k, r] of REG) if (!acc.has(k)) r.g.visible = false;
    }
    function farUnit(o) {
        o.root.updateMatrix(); const tp = o.tp;
        const dead = !!o.dead, amt = dead ? 0 : Math.min(1, o.sp / 1.0) * (o.rout ? 1.3 : 1);
        if (o.sm && o.sm.visible) { o.sm.updateMatrix(); M1.multiplyMatrices(o.root.matrix, o.sm.matrix); farPut(tp.humanoid.geoLow || tp.humanoid.geo, chrMats(), M1, o.ph, o.mount && !dead ? -1 : amt, dead ? 0 : o.atk || 0, 0); }
        if (o.mount) { const s = o.sp, gait = gaitOf(s); o.mount.updateMatrix(); M1.multiplyMatrices(o.root.matrix, o.mount.matrix); farPut(tp.mount.geo, chrMats(), M1, 0, dead ? 0 : [.32, .5, .78][gait] * Math.min(1, s / .6), 0, o.mph); }
    }
    function stepAQ() {
        const now = performance.now(); AQ.n++;
        if (!AQ.t0) { AQ.t0 = now; return; }
        if (now - AQ.t0 < 1500) return;
        AQ.fps = AQ.n * 1000 / (now - AQ.t0); AQ.t0 = now; AQ.n = 0; AQ.cool--;
        if (typeof OPT !== 'undefined' && OPT.autoQ === false) { if (AQ.lvl) { AQ.lvl = 0; applyAQ(); } return; }
        if (AQ.fps < 28 && AQ.lvl < 4 && AQ.cool <= 2) { AQ.lvl++; AQ.cool = 6; applyAQ(); }
        else if (AQ.fps > 56 && AQ.lvl > 0 && AQ.cool <= 0) { AQ.lvl--; AQ.cool = 10; applyAQ(); }
    }
    function applyAQ() {
        const q = QN(), base = Math.min(window.devicePixelRatio || 1, [1, 1.25, 1.5, 2][q]);
        R.setPixelRatio(base * [1, .85, .75, .65, .5][AQ.lvl]); fit.w = 0;
        if (grassM) grassM.geometry.instanceCount = Math.round(grassM.userData.n0 * (AQ.lvl >= 4 ? .5 : 1));
    }
    const lodD = () => { const n = U.length; return [220, 320, 430, 560][QN()] * (n > 350 ? .7 : n > 200 ? .82 : 1) * [1, .9, .75, .65, .55][AQ.lvl]; };

    // ---------- odraz v rieke ----------
    let reflRT = null, reflCam = null;
    function renderRefl() {
        if (!waterM || !comp || QN() < 2 || AQ.lvl >= 2) { if (waterM) waterM.material.uniforms.uUseR.value = 0; return; }
        const t = T(), L = -4.5;
        if (!reflRT) { reflRT = new t.WebGLRenderTarget(256, 256, { type: t.HalfFloatType }); reflCam = new t.PerspectiveCamera(); }
        const s = R.getDrawingBufferSize(new t.Vector2()), w = Math.max(64, s.x >> 2), h = Math.max(64, s.y >> 2); if (reflRT.width !== w || reflRT.height !== h) reflRT.setSize(w, h);
        if (frameN % 2 === 0) {
            const n = new t.Vector3(0, 1, 0), pp = new t.Vector3(0, L, 0), cp = cam.position.clone(), view = pp.clone().sub(cp);
            if (view.dot(n) > 0) return;
            const rot = new t.Matrix4().extractRotation(cam.matrixWorld), look = new t.Vector3(0, 0, -1).applyMatrix4(rot).add(cp);
            view.set(cp.x, 2 * L - cp.y, cp.z); const tg = new t.Vector3(look.x, 2 * L - look.y, look.z);
            reflCam.position.copy(view); reflCam.up.set(0, 1, 0).applyMatrix4(rot).reflect(n); reflCam.lookAt(tg);
            reflCam.far = cam.far; reflCam.near = cam.near; reflCam.fov = cam.fov; reflCam.aspect = cam.aspect; reflCam.updateMatrixWorld(); reflCam.projectionMatrix.copy(cam.projectionMatrix);
            const TM = waterM.material.uniforms.uTM.value; TM.set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1); TM.multiply(reflCam.projectionMatrix).multiply(reflCam.matrixWorldInverse);
            const hide = [waterM, grassM, overlay, wx, arTr].filter(Boolean), was = hide.map(m => m.visible); hide.forEach(m => m.visible = false);
            R.clippingPlanes = [new t.Plane(new t.Vector3(0, 1, 0), -L + .5)];
            R.setRenderTarget(reflRT); R.clear(); R.render(scene, reflCam); R.setRenderTarget(null); R.clippingPlanes = [];
            hide.forEach((m, i) => m.visible = was[i]);
        }
        waterM.material.uniforms.uRefl.value = reflRT.texture; waterM.material.uniforms.uUseR.value = .75;
    }

    // ---------- životný cyklus ----------
    function ensureRenderer() {
        if (R) return;
        const t = T();
        R = new t.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        R.shadowMap.enabled = true; R.shadowMap.type = t.PCFSoftShadowMap;
        canvas = R.domElement; canvas.id = 'b3d';
        canvas.style.cssText = 'position:absolute;left:0;top:0;display:none;pointer-events:none;z-index:0';
        const host = document.getElementById('game'); if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
        host.insertBefore(canvas, host.firstChild);
        if (game.canvas) { game.canvas.style.position = 'relative'; game.canvas.style.zIndex = '1'; }   // Phaser (priehľadný) leží nad 3D
    }
    function fit() {
        const pc = game.canvas; if (!pc) return;
        const r = pc.getBoundingClientRect(), hr = canvas.parentNode.getBoundingClientRect(), w = Math.round(r.width) || 720, h = Math.round(r.height) || 480;
        canvas.style.left = (r.left - hr.left) + 'px'; canvas.style.top = (r.top - hr.top) + 'px'; canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
        if (fit.w !== w || fit.h !== h) { fit.w = w; fit.h = h; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    }
    /** Začiatok 3D bitky (volá BattleScene.build). */
    function start() {
        try {
            fpv = typeof OPT === 'undefined' || OPT.view !== 'tp';
            ensureRenderer();
            const t = T(), q = QN();
            R.setPixelRatio(Math.min(window.devicePixelRatio || 1, [1, 1.25, 1.5, 2][q]));
            R.toneMapping = q === 0 ? t.NoToneMapping : t.NoToneMapping; R.shadowMap.enabled = q >= 1;
            TPL.clear();
            buildWorld();
            cam = new t.PerspectiveCamera(52, W / H, 2, 3200);
            units = new Map(); arrowPool = []; stuck = []; decals = []; tgt = null; fit.w = 0; slow = null; photo = null; frameN = 0;
            comp = q >= 1 ? B3G.Composer(R) : null;
            const foes = U.filter(u => u.t), ex = foes.reduce((s, u) => s + u.x, 0) / Math.max(1, foes.length), ey = foes.reduce((s, u) => s + u.y, 0) / Math.max(1, foes.length);
            yaw = foes.length ? Math.atan2(ey - U[0].y, ex - U[0].x) : 0; zoom = G.eq.m ? 125 : 100; lp = -.12;
            intro = typeof OPT !== 'undefined' && OPT.intro3d === false || !foes.length ? null : { t: 0, T: 330, p0: new t.Vector3(ex - Math.cos(yaw) * 60, heightAt(ex, ey) + 150, ey - Math.sin(yaw) * 60 + 80), l0: new t.Vector3(U[0].x, heightAt(U[0].x, U[0].y) + 10, U[0].y) };
            canvas.style.display = 'block'; on = true;
            return true;
        } catch (e) { console.warn('3D bitka sa nedá spustiť', e); stop(); want.ok = false; return false; }
    }
    function frame(dt) {
        if (!on) return;
        frameN++; frameDt = dt;
        const sdt = intro ? dt : dt * timeK() || dt * .0001;
        clock += (photo ? 0 : dt * (slow ? slow.k : 1)) / 60; B3G.U_TIME.value = clock;
        if (slow && (slow.t -= dt) <= 0) slow = null;
        fit(); stepAQ();
        if (sun && sun.castShadow) { const ev = AQ.lvl >= 3 ? 3 : U.length > 120 ? 2 : 1; sun.shadow.autoUpdate = ev === 1; if (ev > 1 && frameN % ev === 0) sun.shadow.needsUpdate = true; }   // veľká bitka: tiene sa prepočítajú každú druhú snímku
        // stav bitky pre zástup: víťazný jasot, šípy vo vzduchu (štíty nad hlavu)
        FRX.win0 = !U.some(v => v.t && v.hp > 0 && !v.rout && !v.fled);
        if (FRX.win0 && FRX.winCam !== LB && !slow && !photo && !intro) {   // posledný nepriateľ padol: záber na neho v spomalení
            FRX.winCam = LB; let near = null, nd = 1e9; for (const v of U) if (v.t && !v.fled) { const d = Math.hypot(v.x - U[0].x, v.y - U[0].y); if (d < nd) { nd = d; near = v; } }
            if (near) slow = { t: 100, t0: 100, k: .4, u: near };
        } FRX.win1 = (U[0].hp <= 0 && !(typeof CMB !== 'undefined' && CMB.down)) || !U.some(v => !v.t && v.hp > 0 && !v.fled);
        const fly = AR.filter(a => a.l > 0 && !a.land);
        const cx = cam ? cam.position.x : U[0].x, cz = cam ? cam.position.z : U[0].y, LD = lodD(); let dSum = 0, dN = 0;
        for (const b of FAR.values()) b.n = 0;
        for (const u of U) {
            let o = units.get(u);
            if (!o) { if (u.fled) continue; o = rig(u); scene.add(o.root); o.inS = 1; units.set(u, o); }
            if (u.fled) { if (o.inS) { scene.remove(o.root); o.inS = 0; } continue; }
            if (u.h && heroKey(u) !== o.hk) { const ph = o.ph; scene.remove(o.root); o = rig(u); o.ph = ph; scene.add(o.root); o.inS = 1; units.set(u, o); }   // hrdina zosadol, zmenil zbraň alebo prišiel o štít
            // vzdialený vojak: bez kostí, v hromadnej sieti so zástupom rovnakého vzhľadu
            const far = !photo && LD > 0 && !o.rag && !u.h && !u.boss && o.B && !o.tp.boss && !o.tp.beast && !o.unh && Math.hypot(u.x - cx, u.y - cz) > LD && !(u.hp <= 0 && !o.dead);
            if (far !== !!o.far) { o.far = far; if (far && o.inS) { scene.remove(o.root); o.inS = 0; } else if (!far && !o.inS) { scene.add(o.root); o.inS = 1; } }
            if (o.B && u.hp > 0 && o.H.shield && (frameN + o.id) % 6 === 0) { let th = 0; for (const a of fly) if (a.t !== u.t && Math.abs(a.x - u.x) < 130 && Math.abs(a.y - u.y) < 130 && (u.x - a.x) * a.vx + (u.y - a.y) * a.vy > 0) { th = 1; break; } o.raise = th ? 40 : Math.max(0, (o.raise || 0) - 6); }
            else if (o.raise > 0) o.raise -= sdt;
            if (!photo) pose(o, u, sdt);
            if (o.far) farUnit(o);
            dSum += o.dirt || 0; dN++;
        }
        for (const b of FAR.values()) { b.im.count = b.n; b.im.instanceMatrix.needsUpdate = true; if (b.an) b.an.needsUpdate = true; }
        B3G.U_DIRT.value = dN ? dSum / dN * DIRT_K : 0;
        if (waterM || creekM) { let n = 0; const F = (waterM || creekM).material.uniforms.uFoam.value; for (const u of U) { if (n >= 8 || u.hp <= 0 || u.fled) continue; const o = units.get(u); if (!o || !o.inS) continue; if (!(FIELD && FIELD.river && Math.abs(u.x - riverX()) < 44) && creekD(u.x, u.y) > 9) continue; F[n++].set(u.x, u.y, (o.mount ? 6 : 3.4) * (o.sp > .3 ? 1.3 : .8)); } for (let i = n; i < 8; i++) F[i].set(-999, -999, 0); if (waterM && creekM) creekM.material.uniforms.uFoam.value = F; }   // pena okolo brodiacich sa
        updSiege(); stepRegiments(); if (!photo) stepProps(sdt); syncArrows(); stepDecals(sdt); syncParticles(); if (!photo) { runFx(sdt); stepWeather(sdt); stepPanorama(sdt); stepLeaves(sdt); stepRoofs(sdt); stepOrders(); } stepBirds(); stepArrowTrails(); stepTgMark(); drawOverlay(); camUpdate(dt); computeAim(); stepBlobs(); stepSmokeShade(); stepEnv(); stepFireLight();
        // filmová kamera: v spomalení a pri nástupe jemné chvenie z ruky a širokouhlé pásy
        const cine = !photo && (intro || (slow && slow.u)) ? 1 : 0; CINE += (cine - CINE) * Math.min(1, .08 * dt);
        if (CINE > .01 && cam) { const hh = CINE * (intro ? .5 : 1); cam.position.x += Math.sin(clock * 1.7) * .5 * hh + Math.sin(clock * 4.3) * .15 * hh; cam.position.y += Math.sin(clock * 2.3 + 1) * .35 * hh; cam.rotation.z += Math.sin(clock * 1.1) * .006 * hh; }
        if (comp) {
            const F = comp.fin, Gd = grade, q = QN(), O = comp.opt, opt = typeof OPT !== 'undefined' ? OPT : {};
            F.bloom.value = Gd.bloom; F.sat.value = Gd.sat * (1 - (wxS ? wxS.dark * .12 : 0)); F.con.value = Gd.con; F.lift.value.set(...Gd.lift); F.gain.value.set(...Gd.gain); F.vig.value = photo ? .6 : .95; F.expo.value = WX.night ? 1.9 : WX.n === 'storm' || WX.n === 'rain' ? 1.25 : 1.12;
            const sp = cam.position.clone().addScaledVector(sunDir, 1500).project(cam), vis = sp.z < 1 && Math.abs(sp.x) < 1.3 && Math.abs(sp.y) < 1.3 && !WX.night && WX.n !== 'storm' && WX.n !== 'fog';
            F.sunUv.value.set(sp.x * .5 + .5, sp.y * .5 + .5); F.rays.value = vis && q >= 2 ? (q === 3 ? 1.4 : 1) * (1 - Math.min(1, Math.max(Math.abs(sp.x), Math.abs(sp.y)) - .3)) * (1 - (wxS ? wxS.dark : 0)) : 0;
            // zatienenie v kútoch, prízemná hmla presvetlená slnkom, rozmazanie pohybu, hĺbka ostrosti (foto režim a spomalenie), zrno
            O.ao = q >= 2 && AQ.lvl < 2 ? (q === 3 ? 1 : .8) : 0;
            const wS = wxS || { dark: 0, fog: 0, rain: 0 };
            O.fogA = (WX.night ? .0016 : .0007 + (dayLight().low) * .0016) + wS.rain * .0022 + wS.fog * .006; O.fogB = .028;
            const CU = comp.comb; CU.uFogC.value.copy(scene.fog ? scene.fog.color : C('#888')); CU.uSunDir.value.copy(sunDir); CU.uSunC.value.copy(sun.color).multiplyScalar(WX.night ? .15 : .9 * (1 - wS.dark));
            O.mb = opt.mblur ? .9 : 0;
            const ft = photo ? null : slow ? (slow.by && slow.t0 && slow.t > slow.t0 * .55 ? slow.by : slow.u) : null;   // presun ostrenia z útočníka na zasiahnutého
            O.dof = opt.dof !== false && (photo || slow) && AQ.lvl < 3 ? 1 : 0; O.focus = ft ? cam.position.distanceTo(new (T().Vector3)(ft.x, heightAt(ft.x, ft.y) + 14, ft.y)) : -1;
            O.grain = opt.grain ? .045 : 0; O.adapt = 1;
            // tiene mrakov putujú po krajine, odraz na mokrej zemi, horúci vzduch nad ohňom, ladenie podľa dennej doby, časové vyhladenie
            O.cs = WX.night || WX.n === 'fog' ? 0 : (wxS ? Math.min(.32, .1 + wxS.cloud * .25) * (1 - wS.dark * .6) : .18); O.co = O.co || new (T().Vector2)(); O.co.set(clock * .012, clock * .005);
            O.ssr = q >= 2 && AQ.lvl < 2 && B3G.U_WET.value > .3 ? B3G.U_WET.value * .7 : 0;
            O.hz = hazeSpots(); const lo = dayLight().low;
            O.shT = O.shT || new (T().Vector3)(); O.hiT = O.hiT || new (T().Vector3)();
            if (WX.night) { O.shT.set(-.01, 0, .025); O.hiT.set(0, 0, .01); } else { O.shT.set(-.012 * lo, 0, .02 * lo); O.hiT.set(.03 * lo, .012 * lo, -.02 * lo); }
            O.bars = CINE;
            O.taa = (opt.taa === true || (opt.taa == null && q === 3)) && q >= 2 && AQ.lvl < 2 && !photo;
            renderRefl();
            if (O.taa) { const j = HALTON[frameN % 8], e = cam.projectionMatrix.elements, s0 = R.getDrawingBufferSize(TV2 || (TV2 = new (T().Vector2)())); e[8] += (j[0] - .5) * 2 / s0.x; e[9] += (j[1] - .5) * 2 / s0.y; cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert(); }
            comp.render(scene, cam);
            if (O.taa) cam.updateProjectionMatrix();
        } else { R.setRenderTarget(null); R.render(scene, cam); }
    }
    /** Príprava počas načítavacej obrazovky: modely všetkých vojakov a šablóny pre výmenu zbrane hrdinu (aby sa nestavali uprostred boja). */
    function prep() {
        if (!on) return;
        for (const u of U) { if (u.fled || units.get(u)) continue; const o = rig(u); scene.add(o.root); o.inS = 1; units.set(u, o); pose(o, u, 1); }
        try { const C2 = CMB, w0 = C2.wpn; for (const w of ['m', 'r']) { C2.wpn = w; template(specOf(U[0])); } C2.wpn = w0; } catch (e) { }
        if (QN() >= 1) stepArrowTrails();
    }
    /** Predkompilácia shaderov: na chvíľu pridá do scény po jednom z efektov, ktoré sa inak objavia až v boji (vzdialený zástup, padnutá zbraň,
     *  stopa čepele, kruh nárazu, blesk, šíp), skompiluje všetko (paralelne, ak to prehliadač vie) a raz vykreslí aj s tieňmi a odrazom. */
    async function warm() {
        if (!on) return;
        const t = T(), h = U[0], o0 = units.get(h), tmp = [], at = (m, dx = 30) => { m.position.set(h.x + dx, heightAt(h.x, h.y) + 5, h.y); scene.add(m); tmp.push(m); };
        try {
            const H = o0 && o0.H; if (H) { const im = new t.InstancedMesh(H.geo, chrMats(), 1); im.castShadow = QN() >= 2; im.setMatrixAt(0, new t.Matrix4().makeTranslation(h.x + 30, heightAt(h.x, h.y), h.y)); scene.add(im); tmp.push(im); if (H.wGeo) at(new t.Mesh(H.wGeo, chrMats())); }
            const tg = new t.BufferGeometry(); tg.setAttribute('position', new t.BufferAttribute(new Float32Array(9), 3)); tg.setAttribute('color', new t.BufferAttribute(new Float32Array(9), 3));
            at(new t.Mesh(tg, MAT.trail || (MAT.trail = new t.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: t.AdditiveBlending, depthWrite: false, side: t.DoubleSide }))));
            at(new t.Mesh(new t.RingGeometry(.8, 1, 8), new t.MeshBasicMaterial({ color: C('#ffd0a0'), transparent: true, opacity: .8, side: t.DoubleSide, depthWrite: false, blending: t.AdditiveBlending })));
            at(new t.LineSegments(tg, new t.LineBasicMaterial({ color: C('#f0f4ff'), fog: false })));
            at(new t.Mesh(new t.CircleGeometry(1, 8), new t.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .35, depthWrite: false })));
            at(arrowMesh(0, 0)); at(arrowMesh(1, 0));
            stepEnv(true);
            try {   // predvýpočet variantov tvárí (SDF hlavy): ďalší bojovníci toho istého druhu sa potom objavia bez zaseknutia
                const seen = new Set(), t0 = performance.now(), cap = window.__FVCAP != null ? window.__FVCAP : 4; let made = 0;
                for (const u of U) {
                    if (u.fled || u.hero || made >= cap || performance.now() - t0 > 400) continue;
                    const sp = specOf(u), kk = keyOf({ ...sp, fv: 0 }); if (seen.has(kk) || sp.boss || sp.beast || sp.mdl) continue; seen.add(kk);
                    for (let fv = 0; fv < 4 && made < cap; fv++) { if (fv === sp.fv) continue; const sv = { ...sp, fv }; if (!TPL.has(keyOf(sv))) { template(sv); made++; await new Promise(r => setTimeout(r, 0)); } }
                }
            } catch (e) { }
            try { await atlas().ready; } catch (e) { }   // textúry modelov do atlasu
            if (R.compileAsync) await R.compileAsync(scene, cam); else R.compile(scene, cam);
        } catch (e) { try { R.compile(scene, cam); } catch (e2) { } }
        if (!on) return;
        const fN = frameN; frameN = 0; frame(0); frameN = fN;   // prvé vykreslenie (tiene, odraz, skladač) ešte pod načítavacou obrazovkou
        for (const m of tmp) scene.remove(m);
        if (comp) comp.render(scene, cam);
    }
    function stop() {
        on = false; intro = null; slow = null;
        if (photo) photoToggle();
        if (canvas) canvas.style.display = 'none';
        if (scene) scene.traverse(o => { if (o.geometry && !TPLgeo(o.geometry)) o.geometry.dispose(); });
        if (comp) { comp.dispose(); comp = null; }
        if (reflRT) { reflRT.dispose(); reflRT = null; } if (cubeRT) { cubeRT.dispose(); cubeRT = null; } creekM = null; FAR = new Map(); pano = null; birds = null; prints = null; arTr = null; bolt = null; wxS = null; roofs = []; roofL = []; loose = []; panoSmoke = []; volcano = null;
        FIRE = DUST = null; debris = []; rocks = []; fires = []; trails = []; braziers = []; scene = null; units = new Map(); arrowPool = []; stuck = []; decals = []; terrain = null; wx = null; torches = []; grassM = waterM = blobs = null;
        if (hTex) { hTex.dispose(); hTex = null; } if (trTex) { trTex.dispose(); trTex = null; }
        if (R) R.renderLists.dispose();
    }
    const TPLgeo = g => { for (const tp of TPL.values()) for (const v of Object.values(tp)) { if (v === g) return true; if (v && typeof v === 'object') { if (v.geo === g) return true; for (const w of Object.values(v)) if (w === g) return true; } } return (PR && Object.values(PR).includes(g)) || (AGEO && Object.values(AGEO).includes(g)); };
    /** Kontrola nasadenia brnenia (testy): pozície odevu a tela v pokojovej póze pre jednotku u. */
    function garmentDebug(k, u) { const sp = specOf(u), H = template(sp).humanoid, rc = modelRace(sp.race), g = garmentGeos(k, H.BN, rc), B = modelBody(H.BN, rc, false); return { g: Array.from((g[0] || g[1]).attributes.position.array), b: Array.from(B.P), main: B.main }; }
    /** Rozhranie pre 3D mapu (js/engine/m3d.js): postavy z bitky (rig), renderer a pomôcky. */
    const kit = { rig, specOf, gaitOf, STRIDE, ensure: () => { ensureRenderer(); return { R, canvas }; }, shadowsOn, setClock: c => { clock = c; B3G.U_TIME.value = c; } };
    return { kit, FPP, FPC, SWP, SWPF, garmentDebug, specOf, rigOf: u => units.get(u), want, start, prep, warm, frame, stop, pick, rel, wheel, dragStart, dragMove, dragEnd, isOn, heightAt, skipIntro, timeK, photoToggle, get photo() { return !!photo; }, get scene() { return scene; }, photoAt(x, y, z, yw, pt) { if (!photo) photoToggle(); photo.pos.set(x, y, z); photo.yaw = yw; photo.pitch = pt; }, get renderer() { return R; },
        /** Poloha zvuku voči 3D kamere (uši): vzdialenosť a stereo (−1 vľavo, +1 vpravo) podľa smeru pohľadu, nie podľa svetových osí. */
        earPan(x, y) { if (!on || !cam) return null; const f = new (T().Vector3)(); cam.getWorldDirection(f); const l = Math.hypot(f.x, f.z) || 1, fx = f.x / l, fz = f.z / l, dx = x - cam.position.x, dz = y - cam.position.z, d = Math.hypot(dx, dz); return { d, pan: Math.max(-1, Math.min(1, (dx * -fz + dz * fx) / 360)) }; }, get intro() { return !!intro; }, get yaw() { return yaw; }, get look() { return lookOn(); }, get fp() { return fpv; }, lookMove, toggleFP, get pitch() { return lp; }, get aq() { return AQ.lvl; }, get fps() { return AQ.fps; } };
})();
