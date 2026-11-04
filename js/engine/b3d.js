/*
 * ENGINE: 3D bitka (Three.js, vendor/three.min.js) – etapa 1 prechodu na 3D boj v štýle Mount & Blade.
 * Herná logika ostáva v js/sim (battle.js, combat.js, bosses.js); tu sa bitka len zobrazuje v 3D:
 *   – terén s výškou podľa miesta na mape (kopec, rieka s brodom, les, sneh, popol Mordoru), obloha, slnko a tiene, hmla, dážď, sneh, noc s fakľami,
 *   – hradby s cimburím, vežami, bránou, rebríkmi a obliehacou vežou (obrancovia stoja na hradbách vo výške),
 *   – vojaci, jazdci, vargovia, trollovia, olifanty, enti a Nazgûli z nízkopolygónových dielov kreslených kódom podľa Soldiers.UNITS
 *     a výbavy hrdinu (Soldiers.heroSpec), vo farbách frakcie; animácie chôdze, behu, nápriahu, úderu, krytu, streľby, pádu a jazdy,
 *   – bossovia (Balrog, drak, okrídlená šelma, Kráľ trollov), šípy v oblúku, iskry a krv, ohlásené útoky a oblúky úderov na zemi.
 * Kamera je za hrdinom (koliesko približuje, Z a C alebo stredné tlačidlo myši otáčajú), WASD je vzhľadom na kameru, myš mieri na zem.
 * Plátno Three.js leží pod plátnom Phaseru (ten je priehľadný), takže lišty, rozkazy a okná ostávajú z UIScene.
 * Súradnice: x simulácie = X, y simulácie = Z, výška = Y (1 jednotka ≈ 7 cm, človek ≈ 24 jednotiek).
 */
const B3 = (() => {
    let R = null, canvas = null, scene = null, cam = null, sun = null, hemi = null, on = false, built = false;
    let units = new Map(), yaw = 0, pitch = .36, zoom = 110, tgt = null, terrain = null, overlay = null, ovPos = null, ovCol = null;
    let arrowPool = [], stuck = [], pts = null, ptsPos = null, ptsCol = null, decals = [], torches = [], wx = null, siege = {}, clock = 0, lastT = 0, drag = null;
    const MAT = {};
    const T = () => window.THREE;
    const C = c => new (T().Color)(c);
    const isOn = () => on;

    /** Dá sa 3D použiť? (Three.js + WebGL, voľba v Nastaveniach) */
    function want() {
        if (typeof OPT !== 'undefined' && OPT.b3d === false) return false;
        if (!window.THREE) return false;
        if (want.ok == null) { try { const c = document.createElement('canvas'); want.ok = !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { want.ok = false; } }
        return want.ok;
    }

    // ---------- geometria: zlučovanie dielov s farbami vrcholov ----------
    let PR = null;
    function prims() {
        if (PR) return PR;
        const t = T();
        PR = { box: new t.BoxGeometry(1, 1, 1), cyl: new t.CylinderGeometry(.5, .5, 1, 8), cyl6: new t.CylinderGeometry(.5, .5, 1, 6), cone: new t.ConeGeometry(.5, 1, 8), sph: new t.IcosahedronGeometry(.5, 1), sph0: new t.IcosahedronGeometry(.5, 0), disc: new t.CylinderGeometry(.5, .5, 1, 12), tri: (() => { const g = new t.BufferGeometry(); g.setAttribute('position', new t.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0], 3)); g.computeVertexNormals(); return g; })() };
        return PR;
    }
    /** Diel z primitív: add(tvar, farba, [x,y,z], [rx,ry,rz], [sx,sy,sz]). build() zlúči do jednej geometrie. */
    function Part() {
        const t = T(), items = [];
        return {
            add(shape, color, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) {
                const m = new t.Matrix4().compose(new t.Vector3(...p), new t.Quaternion().setFromEuler(new t.Euler(...r)), new t.Vector3(...s));
                items.push([prims()[shape], C(color), m]); return this;
            },
            build() {
                let n = 0; const gs = items.map(([g, c, m]) => { const ng = (g.index ? g.toNonIndexed() : g.clone()); ng.applyMatrix4(m); n += ng.attributes.position.count; return [ng, c]; });
                const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
                for (const [g, c] of gs) { const P = g.attributes.position.array, N = g.attributes.normal.array; pos.set(P, o * 3); nor.set(N, o * 3); for (let i = 0; i < g.attributes.position.count; i++) { col[(o + i) * 3] = c.r; col[(o + i) * 3 + 1] = c.g; col[(o + i) * 3 + 2] = c.b; } o += g.attributes.position.count; g.dispose(); }
                const out = new t.BufferGeometry(); out.setAttribute('position', new t.BufferAttribute(pos, 3)); out.setAttribute('normal', new t.BufferAttribute(nor, 3)); out.setAttribute('color', new t.BufferAttribute(col, 3));
                return out;
            }
        };
    }
    const mat = k => MAT[k] || (MAT[k] = k === 'v' ? new (T().MeshLambertMaterial)({ vertexColors: true, flatShading: true })
        : k === 'vs' ? new (T().MeshLambertMaterial)({ vertexColors: true, flatShading: true, side: T().DoubleSide })
        : k === 'glow' ? new (T().MeshBasicMaterial)({ vertexColors: true }) : null);
    /** Stromy a skaly: blízko kamery sa rozplynú (mriežkové vypúšťanie pixelov), aby nezakryli hrdinu. */
    function fadeMat() {
        if (MAT.fade) return MAT.fade;
        const m = new (T().MeshLambertMaterial)({ vertexColors: true, flatShading: true });
        m.onBeforeCompile = sh0 => { sh0.fragmentShader = sh0.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n float dC = length(vViewPosition); if (dC < 45.0) discard; if (dC < 95.0 && mod(floor(gl_FragCoord.x) + floor(gl_FragCoord.y), 2.0) < 1.0) discard;'); };
        return (MAT.fade = m);
    }
    /** Krídlo: koreň v počiatku, rozpätie do +Z (druhé krídlo sa zrkadlí scale.z = -1). */
    function wingGeo(len, c1, c2) {
        const t = T(), a = C(c1), b = C(c2), P = [], Cl = [];
        const tri = (p, q, r, c) => { P.push(...p, ...q, ...r); for (let i = 0; i < 3; i++) Cl.push(c.r, c.g, c.b); };
        const root = [0, 0, 0], el = [-2, len * .22, len * .45], tip = [-len * .18, len * .32, len], tr = [-len * .5, -len * .05, len * .72], back = [-len * .45, 0, len * .18];
        tri(root, el, tip, a); tri(root, tip, tr, b); tri(root, tr, back, a);
        const g = new t.BufferGeometry(); g.setAttribute('position', new t.Float32BufferAttribute(P, 3)); g.setAttribute('color', new t.Float32BufferAttribute(Cl, 3)); g.computeVertexNormals();
        return g;
    }
    const mesh = (geo, m = 'v') => { const x = new (T().Mesh)(geo, mat(m)); x.castShadow = x.receiveShadow = shadowsOn(); return x; };
    const shadowsOn = () => typeof OPT === 'undefined' || OPT.fx !== 'low';
    const sh = (hex, k) => { const c = C(hex); c.multiplyScalar(k); return '#' + c.getHexString(); };

    // ---------- výška terénu (hradby a rebríky sú tiež „terén“, aby obrancovia stáli hore) ----------
    function heightAt(x, y, mesh) {
        const F = FIELD || {};
        let h = Math.sin(x * .011) * 2.2 + Math.cos(y * .013 + x * .004) * 2 + Math.sin((x + y) * .027) * .8;
        if (F.hill) h += 46 * Math.exp(-Math.pow((x - BW * .62) / 170, 2) - Math.pow((y - BH * .5) / 120, 2)) * (F.mountain ? 1.3 : 1);
        if (F.river) { const d = Math.abs(x - 720); if (d < 46) h -= (y > 440 && y < 520 ? 4 : 11) * Math.cos(d / 46 * Math.PI / 2); }
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

    // ---------- svet: terén, stromy, skaly, voda, obloha, svetlo, hradby ----------
    function biome() {
        const b = { g: 'g', a: 'a', d: 'd', s: 's' }[BI] || 'g';
        return {
            g: { g1: '#4f6a32', g2: '#6a7f3e', sky: '#9cc0dc', fog: '#b8c8c8', dirt: '#6a5a3e' },
            a: { g1: '#3a3230', g2: '#4e4038', sky: '#5a3a30', fog: '#4a3530', dirt: '#2a2220' },
            d: { g1: '#b8a070', g2: '#cdb684', sky: '#d8c8a0', fog: '#d8c8a8', dirt: '#9a8058' },
            s: { g1: '#dfe6ec', g2: '#c8d2da', sky: '#c8d4e0', fog: '#dde4ea', dirt: '#8a8a8a' }
        }[b];
    }
    function buildWorld() {
        const t = T(), B = biome(), night = !!WX.night;
        scene = new t.Scene();
        const skyCol = night ? '#0b1020' : WX.n === 'storm' ? '#4a5260' : B.sky;
        scene.background = C(skyCol);
        const fogNear = WX.n === 'fog' ? 60 : night ? 120 : 380, fogFar = WX.n === 'fog' ? 420 : night ? 620 : 1500;
        scene.fog = new t.Fog(C(night ? '#0a0e18' : WX.n === 'fog' ? '#c8ccd0' : B.fog), fogNear, fogFar);
        hemi = new t.HemisphereLight(C(night ? '#3a4a7a' : '#dfeaff'), C(night ? '#101018' : B.dirt), night ? .45 : .75); scene.add(hemi);
        sun = new t.DirectionalLight(C(night ? '#8a9ad0' : BI === 'a' ? '#ffb080' : '#fff2d8'), night ? .45 : 1.15);
        sun.castShadow = shadowsOn();
        if (sun.castShadow) { const s = sun.shadow; s.mapSize.set(OPT && OPT.fx === 'high' ? 2048 : 1536, OPT && OPT.fx === 'high' ? 2048 : 1536); s.camera.left = -260; s.camera.right = 260; s.camera.top = 260; s.camera.bottom = -260; s.camera.near = 10; s.camera.far = 900; s.bias = -.0008; }
        scene.add(sun); scene.add(sun.target);
        // terén: mriežka s výškou a farbami vrcholov
        const NX = 144, NY = 96, pos = [], col = [], idx = [];
        let seed = 11 + Math.floor((FIELD && FIELD.forest || 0) * 97); const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
        for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) {
            const x = i / NX * BW, y = j / NY * BH, h = heightAt(x, y, 1);
            pos.push(x, h, y);
            let c = C(B.g1).lerp(C(B.g2), .5 + .5 * Math.sin(x * .02 + y * .031) * Math.cos(y * .017));
            c.multiplyScalar(.9 + rnd() * .16);
            if (SGB && x > 1000) c = C('#8a8478').multiplyScalar(.85 + rnd() * .2);
            if (FIELD && FIELD.river && Math.abs(x - 720) < 50) c.lerp(C(B.dirt), .6);
            col.push(c.r, c.g, c.b);
        }
        for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + 1, c2 = a + NX + 1, d = c2 + 1; idx.push(a, c2, b, b, c2, d); }
        const g = new t.BufferGeometry(); g.setAttribute('position', new t.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new t.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
        terrain = new t.Mesh(g, new t.MeshLambertMaterial({ vertexColors: true })); terrain.receiveShadow = true; scene.add(terrain);
        // okraj sveta: veľká rovina do hmly
        const far = new t.Mesh(new t.PlaneGeometry(6000, 6000), new t.MeshLambertMaterial({ color: C(B.g1) })); far.rotation.x = -Math.PI / 2; far.position.set(BW / 2, -3, BH / 2); scene.add(far);
        if (FIELD && FIELD.river) { const w = new t.Mesh(new t.PlaneGeometry(92, BH), new t.MeshLambertMaterial({ color: C('#3a6a8a'), transparent: true, opacity: .78 })); w.rotation.x = -Math.PI / 2; w.position.set(720, -4.5, BH / 2); scene.add(w); }
        buildFlora(rnd, B);
        if (SGB) buildSiege();
        // počasie: dážď, sneh, popol okolo kamery
        if (['rain', 'storm', 'snow', 'ash'].includes(WX.n) && shadowsOn()) {
            const n = WX.n === 'storm' ? 1800 : 1100, p = new Float32Array(n * 3);
            for (let i = 0; i < n; i++) { p[i * 3] = (Math.random() - .5) * 600; p[i * 3 + 1] = Math.random() * 260; p[i * 3 + 2] = (Math.random() - .5) * 600; }
            const gg = new t.BufferGeometry(); gg.setAttribute('position', new t.BufferAttribute(p, 3));
            wx = new t.Points(gg, new t.PointsMaterial({ color: C(WX.n === 'snow' ? '#ffffff' : WX.n === 'ash' ? '#5a4a42' : '#a8bcd8'), size: WX.n === 'snow' ? 1.3 : 1.1, transparent: true, opacity: .8 }));
            scene.add(wx);
        }
        // iskry, krv, prach (častice zo simulácie PT)
        ptsPos = new Float32Array(900 * 3); ptsCol = new Float32Array(900 * 3);
        const pg = new t.BufferGeometry(); pg.setAttribute('position', new t.BufferAttribute(ptsPos, 3)); pg.setAttribute('color', new t.BufferAttribute(ptsCol, 3));
        pts = new t.Points(pg, new t.PointsMaterial({ size: 2.4, vertexColors: true })); pts.frustumCulled = false; scene.add(pts);
        // prekryv na zemi: oblúky úderov, nápriahy, ohlásené útoky bossov, kryt, veliteľ
        ovPos = new Float32Array(12000 * 3); ovCol = new Float32Array(12000 * 3);
        const og = new t.BufferGeometry(); og.setAttribute('position', new t.BufferAttribute(ovPos, 3)); og.setAttribute('color', new t.BufferAttribute(ovCol, 3));
        overlay = new t.Mesh(og, new t.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .5, depthWrite: false, side: t.DoubleSide })); overlay.frustumCulled = false; overlay.renderOrder = 5; scene.add(overlay);
        FIRE = Psys(1400, true); DUST = Psys(900, false); debris = []; rocks = []; fxState = {};
        // fakle v noci: pár svetiel, ktoré sa presúvajú k nosičom fakieľ pri kamere
        torches = [];
        if (night) for (let i = 0; i < 5; i++) { const l = new t.PointLight(C('#ffa040'), 1.6, 170, 1.6); scene.add(l); torches.push(l); }
    }
    function buildFlora(rnd, B) {
        const t = T(), F = FIELD || { trees: [] }, kind = BI === 'a' ? 'dead' : BI === 'd' ? null : BI === 's' ? 'pine' : 'mix';
        const spots = [], rocks = [];
        const place = (x, y) => { if (F.river && x > 670 && x < 770) return; if (SGB && x > 800) return; if (x < 0 || x > BW || y < 0 || y > BH) return; spots.push([x, y, .75 + rnd() * .6]); };
        const dens = .6 + (F.forest || 0) * 1.4;
        for (const tr of F.trees || []) { const n = Math.round(tr.r * tr.r / 420 * dens); for (let j = 0; j < n; j++) { const a = rnd() * 6.283, d = Math.sqrt(rnd()) * tr.r; place(tr.x + Math.cos(a) * d, tr.y + Math.sin(a) * d * .8); } }
        for (let i = 0; i < 40; i++) { place(rnd() * BW, 20 + rnd() * 50); place(rnd() * BW, BH - 6 - rnd() * 40); }
        for (let i = 0; i < 24; i++) { place(10 + rnd() * 50, rnd() * BH); if (!SGB) place(BW - 10 - rnd() * 50, rnd() * BH); }
        for (let i = 0; i < 30 + (F.hill ? 16 : 0); i++) { const x = rnd() * BW, y = rnd() * BH; if ((!F.river || x < 660 || x > 780) && !(SGB && x > 960)) rocks.push([x, y, .6 + rnd() * 1.2]); }
        const M = new t.Matrix4(), q = new t.Quaternion(), e = new t.Euler(), v = new t.Vector3(), s = new t.Vector3();
        const inst = (geo, list, fn) => { if (!list.length) return; const im = new t.InstancedMesh(geo, fadeMat(), list.length); list.forEach((p, i) => { fn(p, i); im.setMatrixAt(i, M); }); im.castShadow = shadowsOn(); im.receiveShadow = true; scene.add(im); };
        if (kind && spots.length) {
            const trunk = Part().add('cyl6', kind === 'dead' ? '#2a2422' : '#5a3e24', [0, 9, 0], [0, 0, 0], [2.4, 18, 2.4]);
            if (kind === 'dead') trunk.add('cyl6', '#2a2422', [2.5, 15, 0], [0, 0, -.8], [1, 9, 1]).add('cyl6', '#2a2422', [-2, 13, 1], [0, 0, .9], [.9, 8, .9]);
            const pine = Part().add('cone', '#2e4a2a', [0, 20, 0], [0, 0, 0], [16, 22, 16]).add('cone', '#3a5a32', [0, 30, 0], [0, 0, 0], [12, 18, 12]).add('cone', BI === 's' ? '#e8eef2' : '#46683a', [0, 39, 0], [0, 0, 0], [7, 12, 7]);
            const leaf = Part().add('sph', '#3e6230', [0, 24, 0], [0, 0, 0], [20, 16, 20]).add('sph', '#4e7238', [4, 28, 3], [0, 0, 0], [13, 11, 13]).add('sph', '#365a2a', [-4, 22, -3], [0, 0, 0], [14, 11, 14]);
            const tg = trunk.build(), pg = pine.build(), lg = leaf.build();
            inst(tg, spots, ([x, y, k]) => { M.compose(v.set(x, heightAt(x, y) - 1, y), q.setFromEuler(e.set(0, rnd() * 6, 0)), s.set(k, k, k)); });
            if (kind !== 'dead') {
                const pl = spots.filter((p, i) => kind === 'pine' || i % 2), ll = spots.filter((p, i) => kind !== 'pine' && !(i % 2));
                inst(pg, pl, ([x, y, k]) => { M.compose(v.set(x, heightAt(x, y) - 1, y), q.setFromEuler(e.set(0, rnd() * 6, 0)), s.set(k, k, k)); });
                inst(lg, ll, ([x, y, k]) => { M.compose(v.set(x, heightAt(x, y) - 1, y), q.setFromEuler(e.set(0, rnd() * 6, 0)), s.set(k, k * (.9 + rnd() * .3), k)); });
            }
        }
        const rg = Part().add('sph0', BI === 's' ? '#b8c0c8' : BI === 'd' ? '#a89070' : '#7a7a74', [0, 1, 0], [0, 0, 0], [7, 5, 6]).build();
        inst(rg, rocks, ([x, y, k]) => { M.compose(v.set(x, heightAt(x, y), y), q.setFromEuler(e.set(rnd(), rnd() * 6, rnd() * .4)), s.set(k, k, k)); });
    }
    /** Hradby s cimburím, veže, brána, hradný palác; rebríky, obliehacia veža a baranidlo sa hýbu v snímke. */
    function buildSiege() {
        const t = T(), W = Part(), stone = '#8a857a', dark = '#6e6a62';
        for (let y = 0; y < BH; y += 40) { if (y + 40 > 440 && y < 520) { if (y < 440) W.add('box', stone, [1024, 20, (y + 440) / 2], [0, 0, 0], [48, 40, 440 - y]); if (y + 40 > 520) W.add('box', stone, [1024, 20, (520 + y + 40) / 2], [0, 0, 0], [48, 40, y + 40 - 520]); continue; } W.add('box', ((y / 40) % 2 ? stone : dark), [1024, 20, y + 20], [0, 0, 0], [48, 40, 40]); }
        for (let y = 4; y < BH; y += 20) if (!(y > 436 && y < 524)) W.add('box', dark, [1002, 44, y + 5], [0, 0, 0], [6, 8, 10]);   // cimburie na vonkajšom okraji
        W.add('box', '#5a5048', [1024, 46, 480], [0, 0, 0], [52, 12, 92]);   // preklad nad bránou
        for (const y of [150, 390, 570, 810]) { W.add('cyl', stone, [1024, 34, y], [0, 0, 0], [36, 68, 36]); W.add('cone', '#5a4a3a', [1024, 78, y], [0, 0, 0], [42, 22, 42]); }
        W.add('box', '#9a958a', [1290, 40, 330], [0, 0, 0], [140, 80, 120]).add('box', dark, [1290, 84, 330], [0, 0, 0], [150, 8, 130]).add('cyl', stone, [1350, 70, 380], [0, 0, 0], [40, 140, 40]).add('cone', '#5a3a2a', [1350, 150, 380], [0, 0, 0], [48, 30, 48]);
        scene.add(mesh(W.build()));
        siege.gate = mesh(Part().add('box', '#5a3a1a', [1004, 22, 480], [0, 0, 0], [8, 44, 84]).add('box', '#9a9a9a', [1001, 14, 480], [0, 0, 0], [3, 4, 84]).add('box', '#9a9a9a', [1001, 32, 480], [0, 0, 0], [3, 4, 84]).build()); scene.add(siege.gate);
        const lad = Part(); for (const z of [-9, 9]) lad.add('box', '#7a5a30', [0, 0, z], [0, 0, 0], [62, 2, 2]); for (let k = -26; k <= 26; k += 7) lad.add('box', '#8a6a3a', [k, 0, 0], [0, 0, 0], [1.6, 1.6, 18]);
        const lg = lad.build(); siege.lad = [250, 710].map(l => { const m = mesh(lg); m.position.set(982, 20, l); m.rotation.z = Math.atan2(40, 36); scene.add(m); return m; });
        siege.tower = mesh(Part().add('box', '#6b4a2e', [0, 34, 0], [0, 0, 0], [60, 68, 60]).add('box', '#4a3220', [0, 70, 0], [0, 0, 0], [64, 6, 64]).add('cyl', '#3a2a1a', [-22, 6, 32], [Math.PI / 2, 0, 0], [12, 4, 12]).add('cyl', '#3a2a1a', [22, 6, 32], [Math.PI / 2, 0, 0], [12, 4, 12]).add('cyl', '#3a2a1a', [-22, 6, -32], [Math.PI / 2, 0, 0], [12, 4, 12]).add('cyl', '#3a2a1a', [22, 6, -32], [Math.PI / 2, 0, 0], [12, 4, 12]).build());
        siege.tower.visible = !!SGB.tow; scene.add(siege.tower);
        siege.bridge = mesh(Part().add('box', '#8a6a3a', [28, 0, 0], [0, 0, 0], [56, 2, 40]).add('box', '#4a3220', [28, 1.2, 0], [0, 0, 0], [56, .6, 2]).build()); siege.bridge.position.set(30, 42, 0); siege.bridge.rotation.z = Math.PI / 2; siege.tower.add(siege.bridge);   // mostík padne na hradby
        const dc = (U.find(u => u.t !== (SGB.att ?? 0) && !u.h && u.fc != null) || {}).fc, bcol = FC[dc != null ? dc : (SGB.att ?? 0) ? G.fac : 2] || '#8a2a2a';
        const flag = Part().add('cyl', '#3a2a1a', [0, 16, 0], [0, 0, 0], [.8, 32, .8]).add('box', bcol, [-6, 26, 0], [0, 0, 0], [12, 10, .5]).add('box', '#d9a441', [-6, 31.4, 0], [0, 0, 0], [12.4, .8, .7]).build();
        siege.flags = [150, 390, 570, 810, 380].map((y, i) => { const m = mesh(flag); m.position.set(i === 4 ? 1350 : 1024, i === 4 ? 165 : 88, y); scene.add(m); return m; });
        siege.ram = mesh(Part().add('cyl', '#6b4a2e', [0, 9, 0], [0, 0, Math.PI / 2], [10, 60, 10]).add('cone', '#4a4a4a', [33, 9, 0], [0, 0, -Math.PI / 2], [11, 8, 11]).add('box', '#3a2a1a', [0, 20, 0], [0, 0, 0], [50, 3, 26]).build());
        siege.ram.visible = !!SGB.ram; scene.add(siege.ram);
    }
    function updSiege() {
        if (!SGB) return;
        const tt = U[0].tt || 0, pl = Math.min(1, tt / 160), pt = Math.min(1, tt / 320), off = SGB.ladOff || [0, 0], def = (SGB.att ?? 0) === 1;
        siege.gate.visible = SGB.gate > 0;
        siege.lad.forEach((m, i) => { m.visible = !!SGB.lad; if ((off[i] || 0) > 0) { m.rotation.z = .08; m.position.x = 950; m.position.y = 2; } else { m.rotation.z = Math.atan2(40, 36) * pl; m.position.x = 982 - (1 - pl) * 12; m.position.y = 2 + 18 * pl; } });
        siege.tower.position.set(960 - (1 - pt) * 150, 0, 610);
        const br = siege.bridge; if (pt < 1) br.rotation.z = Math.PI / 2; else if (br.rotation.z > 0) { br.rotation.z = Math.max(0, br.rotation.z - .05); if (br.rotation.z === 0) { dust(1010, 610, 16, 20, '#8a8478'); SHAKE = Math.max(SHAKE, 1.5); } }   // mostík padne na hradby
        if (siege.flags) siege.flags.forEach((f, i) => { f.rotation.y = Math.sin(clock * 1.7 + i) * .25; });
        siege.ram.position.set(965 + Math.sin(clock * 3) * 5, 0, 480); siege.ram.visible = !!SGB.ram && SGB.gate > 0 && !def || (!!SGB.ram && SGB.gate > 0);
    }

    // ---------- postavy ----------
    const SKIN = { human: '#e2bf96', orc: '#5f7a4a', uruk: '#3e4a34', troll: '#7a8670', dwarf: '#dcb48c', elf: '#efd6b4', dark: '#8a5a3a', none: '#141414' };
    const TPL = new Map();
    /** Popis postavy jednotky u pre 3D: telo, výbava, farby, zviera. */
    function specOf(u) {
        if (u.boss) return { boss: u.boss };
        const team = u.t ? (FC[u.fc] || '#8a7a6a') : FC[G.fac] || '#d9a441';
        if (u.h) { const S = Soldiers.heroSpec(typeof twoHand === 'function' && twoHand() ? { ...G.eq, s: 0 } : G.eq), L = Portraits.hero(); return { hero: 1, skin: Figures.lookOpts(L).skin || SKIN.human, hair: L.hcol, armor: S.armorG.col, rim: S.armorG.rim, helmG: S.helmG, shieldG: S.shieldG, weaponG: S.weaponG, weapon: S.weaponG.t === 'spear' ? 'spear' : S.weaponG.t === 'axe' ? 'axe' : 'sword', horse: G.eq.m && !(u.dis) ? S.horse : null, team, cape: heroSide() ? '#2a1414' : '#6a2a2a', scale: Figures.lookOpts(L).rscale || 1 }; }
        const kind = Art.unitArt(u), sp = (Soldiers.UNITS[kind] || Soldiers.UNITS.i);
        if (u.cp) { const c = compDef(u.cp); if (c && c.eq) { const S = Soldiers.heroSpec(c.eq), L = c.look || {}; return { skin: Figures.lookOpts(L).skin || SKIN.human, hair: L.hcol, armor: S.armorG.col, rim: S.armorG.rim, helmG: L.helm || c.eq.h ? S.helmG : null, shieldG: S.shieldG, weaponG: S.weaponG, weapon: S.weaponG.t === 'spear' ? 'spear' : 'sword', horse: u.mnt ? Soldiers.GEAR.m[u.mnt] : null, team, cape: '#4a3a2a', scale: Figures.lookOpts(L).rscale || 1, hero: 1 }; } }
        const fu = u.uk && FU[u.uk];
        return { skin: SKIN[sp.skin] || SKIN.human, armor: (fu && fu.col) || sp.armor, helm: sp.helm, helmCol: fu && fu.hel, weapon: sp.weapon || 'sword', shield: sp.shield, mount: sp.mount, beast: sp.beast, big: sp.big, beard: sp.beard, team, scale: sp.big ? 2.1 : sp.skin === 'dwarf' ? .82 : sp.skin === 'uruk' ? 1.08 : 1, orc: sp.skin === 'orc' || sp.skin === 'uruk', torch: 0 };
    }
    const keyOf = s => JSON.stringify(s);
    /** Šablóna (geometrie dielov) pre popis s; zdieľajú ju všetky rovnaké jednotky. */
    function template(s) {
        const k = keyOf(s); if (TPL.has(k)) return TPL.get(k);
        let tp;
        if (s.boss) tp = bossTemplate(s.boss);
        else if (s.beast === 'oliphant') tp = beastOliphant(s);
        else if (s.beast === 'ent') tp = beastEnt(s);
        else if (s.beast === 'wolf') tp = { humanoid: humanoid({ ...s, orc: 1, armor: '#2a2420', weapon: 'scimitar' }), mount: mountParts('wolf', s) };
        else tp = { humanoid: humanoid(s), mount: s.mount || s.horse ? mountParts(s.mount === 'wolf' ? 'wolf' : s.mount === 'darkhorse' ? 'dark' : 'horse', s) : null };
        TPL.set(k, tp); return tp;
    }
    /** Humanoid: trup, hlava s prilbou, ruky so zbraňou a štítom, nohy (pivoty v boku a v ramenách). */
    function humanoid(s) {
        const armor = s.armor || '#7d7f80', team = s.team || '#d9a441', skin = s.skin || SKIN.human, rim = s.rim || sh(armor, 1.3);
        const torso = Part().add('box', armor, [0, 4.6, 0], [0, 0, 0], [4.4, 9.2, 7.2]).add('box', team, [2.25, 4, 0], [0, 0, 0], [.4, 7.6, 3]).add('box', sh(armor, .7), [0, .4, 0], [0, 0, 0], [4.8, 1.4, 7.6]);
        if (s.orc) torso.add('box', armor, [-.6, 8.4, 0], [0, 0, .25], [4.2, 2, 7]);
        torso.add('box', rim, [0, 9, 3.6], [0, 0, 0], [3.6, 1.6, 2.4]).add('box', rim, [0, 9, -3.6], [0, 0, 0], [3.6, 1.6, 2.4]);   // náplecníky
        // hlava a prilba
        const hy = 12.2;
        torso.add('sph', skin, [0, hy, 0], [0, 0, 0], [4.8, 5.4, 4.8]);
        if (s.beard || (s.hero && s.beardOn)) torso.add('box', s.hair || '#6a3a1a', [1.6, hy - 2.2, 0], [0, 0, .3], [2, 3.6, 3.6]);
        const hk = s.helmG ? s.helmG.kind : s.helm, hc = s.helmG ? s.helmG.col : s.helmCol || (hk === 'hood' ? sh(armor, .9) : '#8a8c90');
        if (hk === 'hood' || hk === 'nazgul') torso.add('cone', hk === 'nazgul' ? '#0a0a0c' : hc, [-.3, hy + 1.6, 0], [0, 0, 0], [6, 6, 6]);
        else if (hk === 'turban') torso.add('sph', hc || '#c84a2a', [0, hy + 1.6, 0], [0, 0, 0], [5.4, 3.8, 5.4]);
        else if (hk && hk !== 'none' && hk !== 'cap') {
            torso.add('sph', hc, [0, hy + 1, 0], [0, 0, 0], [5.4, 4.6, 5.4]).add('box', sh(hc, .8), [0, hy - .3, 0], [0, 0, 0], [5.6, .8, 5.6]);
            if (hk === 'gondor' || hk === 'winged' || hk === 'citadel') for (const z of [-1, 1]) torso.add('box', (s.helmG && s.helmG.wings) || '#f2f4f6', [-.6, hy + 2.4, z * 2.8], [z * .5, 0, -.5], [.6, 3.6, 1.6]);
            if (hk === 'rohan' || hk === 'plume') torso.add('box', (s.helmG && s.helmG.tail) || '#c83a2a', [-2.6, hy + 1.6, 0], [0, 0, .6], [1, 5, 1]);
            if (hk === 'orc' || hk === 'uruk' || hk === 'troll') torso.add('cone', sh(hc, .7), [0, hy + 3.4, 0], [0, 0, 0], [1.6, 2.4, 1.6]);
            if (hk === 'dwarf') torso.add('cone', hc, [0, hy + 3, 0], [0, 0, 0], [5, 3.4, 5]);
            if (hk === 'elf') torso.add('box', '#f4e2a0', [-.4, hy + 3, 0], [0, 0, 0], [5, 1.2, .8]);
            if (hk === 'mask' || hk === 'easterling') torso.add('box', '#c09030', [2.4, hy, 0], [0, 0, 0], [.6, 3.4, 3.8]);
        } else if (hk === 'cap') torso.add('sph', hc || '#6a4a2e', [0, hy + 1.6, 0], [0, 0, 0], [5, 2.6, 5]);
        else if (!s.orc && s.hair) torso.add('sph', s.hair, [-.4, hy + 1.2, 0], [0, 0, 0], [5.2, 3.6, 5.2]);
        if (s.orc) torso.add('box', '#e8e0c8', [2.3, hy - 1.6, .8], [0, 0, 0], [.6, 1, .5]).add('box', '#e8e0c8', [2.3, hy - 1.6, -.8], [0, 0, 0], [.6, 1, .5]);
        torso.add('box', '#0a0806', [2.3, hy + .3, 1], [0, 0, 0], [.3, .6, .7]).add('box', '#0a0806', [2.3, hy + .3, -1], [0, 0, 0], [.3, .6, .7]);   // oči
        // plášť
        let cape = null;
        if (s.cape || s.hero) cape = Part().add('box', s.cape || team, [-.3, -4.6, 0], [0, 0, 0], [.5, 9.6, 7.4]).build();
        // pravá ruka so zbraňou
        const armR = Part().add('box', armor, [0, -3.8, 0], [0, 0, 0], [2.2, 7.6, 2.2]).add('sph', skin, [0, -8, 0], [0, 0, 0], [2.2, 2.2, 2.2]);
        const W = s.weaponG, wb = (W && (W.blade || (W.grad && W.grad[0]) || W.head)) || '#b8bec6', wt = s.weapon;
        if (wt === 'spear') armR.add('cyl', (W && W.shaft) || '#7a5a34', [0, -8, 0], [0, 0, 0], [.7, 36, .7]).add('cone', wb, [0, -27.5, 0], [Math.PI, 0, 0], [1.6, 4, 1.6]);
        else if (wt === 'axe') armR.add('cyl', (W && W.haft) || '#5a3a1a', [0, -12, 0], [0, 0, 0], [.8, 14, .8]).add('box', wb, [1.6, -17, 0], [0, 0, 0], [3.6, 4.4, .6]);
        else if (wt === 'club') armR.add('cyl', '#5a4030', [0, -14, 0], [0, 0, 0], [2.2, 16, 2.2]).add('sph', '#4a3424', [0, -22, 0], [0, 0, 0], [4.2, 5, 4.2]);
        else if (wt === 'bow' || wt === 'xbow') { }
        else { const L = W ? 6 + W.L * 3.2 : 11; armR.add('box', (W && W.guard) || '#5a5048', [0, -9, 0], [0, 0, 0], [.9, .8, 4]).add('box', wb, [0, -9.4 - L / 2, 0], [0, 0, 0], [.5, L, W && W.t === 'broad' ? 2 : 1.4]); }
        // ľavá ruka so štítom alebo lukom
        const armL = Part().add('box', armor, [0, -3.8, 0], [0, 0, 0], [2.2, 7.6, 2.2]).add('sph', skin, [0, -8, 0], [0, 0, 0], [2.2, 2.2, 2.2]);
        const SG = s.shieldG, shape = SG ? SG.shape : s.shield;
        let shield = null;   // štít je samostatný diel na predlaktí: ostáva zvislo čelom vpred, nech je ruka hocikde
        if (shape) {
            const scol = SG ? SG.col : team, srim = SG ? SG.rim : sh(team, .6), S2 = Part();
            if (shape === 'kite') S2.add('box', srim, [1.6, 0, -.3], [0, 0, 0], [.8, 12.6, 7.6]).add('box', scol, [1.9, 0, -.3], [0, 0, 0], [.6, 11.4, 6.6]);
            else S2.add('disc', srim, [1.6, 0, -.3], [0, 0, Math.PI / 2], [9.6, .8, 9.6]).add('disc', scol, [1.9, 0, -.3], [0, 0, Math.PI / 2], [8.6, .6, 8.6]).add('sph', '#c8b060', [2.4, 0, -.3], [0, 0, 0], [1.4, 1.4, 1.4]);
            shield = S2.build();
        }
        if (wt === 'bow') for (let k = 0; k < 5; k++) { const a = -.9 + k * .45; armL.add('box', '#6a4a2a', [Math.cos(a) * 6 - 4, -8 + Math.sin(a) * 7, 0], [0, 0, a + Math.PI / 2], [.7, 3.4, .7]); }
        if (wt === 'xbow') armL.add('box', '#5a3a1a', [2, -8, 0], [0, 0, 0], [8, 1.2, 1.2]).add('box', '#7a7e86', [5, -8, 0], [0, 0, 0], [1, 1, 9]);
        const leg = c => Part().add('box', c, [0, -4.6, 0], [0, 0, 0], [2.6, 9.2, 2.6]).add('box', '#2a2018', [.6, -9, 0], [0, 0, 0], [3.6, 1.2, 2.8]).build();
        return { torso: torso.build(), cape, armR: armR.build(), armL: armL.build(), shield, leg: leg(sh(armor, .75)), bow: wt === 'bow' || wt === 'xbow', spear: wt === 'spear', scale: s.scale || 1, orc: s.orc };
    }
    /** Kôň, varg alebo čierny kôň: telo, krk s hlavou, štyri nohy, chvost. */
    function mountParts(kind, s) {
        const H = s.horse || {}, wolf = kind === 'wolf', c = wolf ? (H.col || '#45403a') : kind === 'dark' ? '#121014' : H.col || '#7a5638', mane = H.mane || (wolf ? '#1e1a18' : '#2a1a10'), k = wolf ? .8 : (H.s || 1);
        const body = Part().add('box', c, [0, 0, 0], [0, 0, 0], [20, 8.4, 7]).add('box', s.team || '#6a2a2a', [-1, 3.6, 0], [0, 0, 0], [10, 1, 7.6]);
        if (H.barding || H.caparison) body.add('box', H.barding || s.team, [0, -1, 0], [0, 0, 0], [21, 7, 7.6]);
        const neck = Part().add('box', c, [3, 3, 0], [0, 0, -.9], [5, 10, 4.2]).add('box', c, [8.4, 6.6, 0], [0, 0, wolf ? 0 : -.35], [7.6, 3.6, 3.6]).add('box', mane, [1.6, 4, 0], [0, 0, -.9], [1.6, 9, 1.4]).add('box', '#0a0806', [10.4, 7.4, 1.4], [0, 0, 0], [.6, .6, .5]).add('box', '#0a0806', [10.4, 7.4, -1.4], [0, 0, 0], [.6, .6, .5]);
        if (wolf) neck.add('cone', c, [6, 9, 1.2], [0, 0, 0], [1.4, 2.4, 1.4]).add('cone', c, [6, 9, -1.2], [0, 0, 0], [1.4, 2.4, 1.4]);
        if (kind === 'dark') neck.add('box', '#ff3010', [10.4, 7.4, 1.4], [0, 0, 0], [.7, .7, .6]);
        const leg = Part().add('box', c, [0, -5, 0], [0, 0, 0], [2.2, 10, 2.2]).add('box', H.hoof || '#1a1410', [0, -10.2, 0], [0, 0, 0], [2.6, 1.4, 2.6]).build();
        const tail = Part().add('box', mane, [-2, -4, 0], [0, 0, .5], [1.6, 9, 1.6]).build();
        return { body: body.build(), neck: neck.build(), leg, tail, k, h: wolf ? 10 : 15, wolf };
    }
    function beastOliphant(s) {
        const c = '#6a6460', b = Part().add('sph', c, [0, 34, 0], [0, 0, 0], [52, 34, 32]).add('sph', c, [28, 36, 0], [0, 0, 0], [20, 20, 18]).add('cyl', c, [36, 22, 0], [0, 0, -.4], [4, 26, 4]).add('cone', '#e8e0c8', [36, 30, 5], [0, 0, -1.9], [2, 16, 2]).add('cone', '#e8e0c8', [36, 30, -5], [0, 0, -1.9], [2, 16, 2])
            .add('box', '#6b4a2e', [-2, 56, 0], [0, 0, 0], [26, 14, 20]).add('box', s.team, [-2, 64, 0], [0, 0, 0], [28, 3, 22]).add('box', '#a03020', [0, 50, 0], [0, 0, 0], [40, 3, 34]);
        const leg = Part().add('cyl', c, [0, -10, 0], [0, 0, 0], [8, 20, 8]).build();
        return { beast: 'oliphant', body: b.build(), leg };
    }
    function beastEnt(s) {
        const b = Part().add('cyl', '#5a4a32', [0, 30, 0], [0, 0, 0], [10, 40, 10]).add('sph', '#3e6a30', [0, 56, 0], [0, 0, 0], [26, 18, 26]).add('sph', '#4e7a38', [4, 64, 3], [0, 0, 0], [16, 12, 16]).add('box', '#c8b060', [5, 44, 2], [0, 0, 0], [1, 1.4, 1]).add('box', '#c8b060', [5, 44, -2], [0, 0, 0], [1, 1.4, 1]);
        const arm = Part().add('cyl', '#5a4a32', [0, -10, 0], [0, 0, 0], [3, 20, 3]).add('cone', '#4a3a26', [0, -22, 0], [Math.PI, 0, 0], [5, 6, 5]).build();
        const leg = Part().add('cyl', '#4a3a26', [0, -6, 0], [0, 0, 0], [5, 12, 5]).build();
        return { beast: 'ent', body: b.build(), arm, leg };
    }
    function bossTemplate(k) {
        if (k === 'trollking') return { humanoid: humanoid({ skin: SKIN.troll, armor: '#4e5446', helm: 'none', weapon: 'club', team: '#4e5446', scale: 2.7 }), crown: Part().add('box', '#d9a441', [0, 16, 0], [0, 0, 0], [5, 1.2, 5]).add('cone', '#ffd24a', [0, 17.5, 2], [0, 0, 0], [1, 2.4, 1]).add('cone', '#ffd24a', [0, 18, 0], [0, 0, 0], [1, 3, 1]).add('cone', '#ffd24a', [0, 17.5, -2], [0, 0, 0], [1, 2.4, 1]).build() };
        if (k === 'balrog') {
            const b = Part().add('box', '#24120a', [0, 40, 0], [0, 0, 0], [22, 40, 30]).add('sph', '#2e160c', [4, 66, 0], [0, 0, 0], [16, 16, 16]).add('cone', '#0a0604', [2, 76, 7], [.6, 0, .3], [3, 14, 3]).add('cone', '#0a0604', [2, 76, -7], [-.6, 0, .3], [3, 14, 3])
                .add('box', '#ffd040', [11, 68, 3], [0, 0, 0], [1, 1.6, 2]).add('box', '#ffd040', [11, 68, -3], [0, 0, 0], [1, 1.6, 2]).add('cyl', '#24120a', [0, 12, 7], [0, 0, 0], [8, 26, 8]).add('cyl', '#24120a', [0, 12, -7], [0, 0, 0], [8, 26, 8]);
            const glow = Part().add('box', '#ffcc30', [11.2, 68, 3], [0, 0, 0], [1, 1.8, 2.4]).add('box', '#ffcc30', [11.2, 68, -3], [0, 0, 0], [1, 1.8, 2.4]).add('box', '#ff6a10', [11.2, 62, 0], [0, 0, 0], [1, 1.4, 6])
                .add('box', '#ff5a10', [11.1, 44, 0], [0, 0, .2], [.6, 22, 1.4]).add('box', '#ff7a20', [11.1, 40, 6], [0, 0, -.5], [.6, 14, 1]).add('box', '#ff7a20', [11.1, 40, -6], [0, 0, .6], [.6, 14, 1])
                .add('box', '#ffb040', [26, 58, 22], [0, 0, -.5], [2.4, 40, 1.6]).add('box', '#ff5a10', [26, 58, 22], [0, 0, -.5], [4, 34, 3]).build();   // oči, žeravé pukliny a plamenný meč
            const fire = Part().add('sph', '#ff6a10', [0, 42, 0], [0, 0, 0], [40, 66, 46]).add('sph', '#ff9a30', [0, 74, 0], [0, 0, 0], [26, 30, 30]).build();
            b.add('box', '#24120a', [6, 56, 18], [0, 0, -.5], [8, 26, 8]).add('box', '#24120a', [4, 56, -18], [0, 0, .3], [8, 26, 8]);
            return { boss: 'balrog', body: b.build(), wing: wingGeo(70, '#1a0c08', '#2a120a'), fire, glow };
        }
        if (k === 'dragon') {
            const col = '#5a1e14', bel = '#9a5a2a', b = Part().add('sph', col, [0, 0, 0], [0, 0, 0], [52, 26, 28]).add('sph', bel, [0, -6, 0], [0, 0, 0], [40, 14, 20]).add('cyl', col, [30, 10, 0], [0, 0, -1.1], [10, 26, 10]).add('box', col, [46, 18, 0], [0, 0, 0], [20, 10, 12]).add('cone', '#3a120c', [57, 18, 0], [0, 0, -Math.PI / 2], [8, 8, 10]).add('box', '#ffe040', [52, 22, 4], [0, 0, 0], [1.4, 1.4, 1.4]).add('box', '#ffe040', [52, 22, -4], [0, 0, 0], [1.4, 1.4, 1.4]).add('cone', '#2a0c08', [42, 26, 4], [0, 0, .5], [2, 9, 2]).add('cone', '#2a0c08', [42, 26, -4], [0, 0, .5], [2, 9, 2]);
            for (let i = 0; i < 6; i++) b.add('sph', col, [-30 - i * 9, -2 + i * .6, 0], [0, 0, 0], [16 - i * 2, 12 - i * 1.4, 12 - i * 1.4]);
            for (const [x, z] of [[14, 10], [14, -10], [-14, 10], [-14, -10]]) b.add('cyl', col, [x, -16, z], [0, 0, 0], [6, 18, 6]);
            return { boss: 'dragon', body: b.build(), wing: wingGeo(90, '#4a160e', '#2a0c08'), glow: Part().add('box', '#ffe040', [52.4, 22, 4], [0, 0, 0], [1.6, 1.6, 1.6]).add('box', '#ffe040', [52.4, 22, -4], [0, 0, 0], [1.6, 1.6, 1.6]).build() };
        }
        const b = Part().add('sph', '#1a1a20', [0, 0, 0], [0, 0, 0], [36, 16, 16]).add('cyl', '#1a1a20', [20, 8, 0], [0, 0, -1], [6, 18, 6]).add('box', '#24242a', [30, 14, 0], [0, 0, 0], [14, 7, 7]).add('cone', '#0a0a10', [-4, 18, 0], [0, 0, 0], [7, 14, 7]).add('sph', '#050508', [-4, 26, 0], [0, 0, 0], [5, 5, 5]).add('box', '#ff3020', [-1.6, 26, 0], [0, 0, 0], [.8, .8, 2]);
        for (let i = 0; i < 4; i++) b.add('sph', '#1a1a20', [-20 - i * 8, -1, 0], [0, 0, 0], [10 - i * 2, 7 - i, 7 - i]);
        return { boss: 'fell', body: b.build(), wing: wingGeo(80, '#1a1a22', '#0e0e14'), glow: Part().add('box', '#ff3020', [-1.4, 26, 0], [0, 0, 0], [1, 1, 2.2]).build() };
    }
    /** Model jednotky zo šablóny: skupina s pivotmi (ruky, nohy, zviera). */
    function rig(u) {
        const t = T(), s = specOf(u), tp = template(s), root = new t.Group(), o = { root, s, tp, ph: Math.random() * 6, atk: 0, lc: u.c, px: u.x, py: u.y, dead: 0, sp: 0 };
        if (tp.boss || tp.beast) {
            o.body = mesh(tp.body); root.add(o.body);
            if (tp.wing) { o.wings = [1, -1].map(sd => { const w = mesh(tp.wing, 'vs'); w.scale.z = sd; w.position.set(tp.boss === 'balrog' ? -6 : 0, tp.boss === 'balrog' ? 62 : 6, sd * (tp.boss === 'balrog' ? 10 : 8)); w.userData.sd = sd; root.add(w); return w; }); }
            if (tp.glow) root.add(new t.Mesh(tp.glow, mat('glow')));
            if (tp.fire) { o.fire = new t.Mesh(tp.fire, new t.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .22, depthWrite: false, blending: t.AdditiveBlending })); root.add(o.fire); o.light = new t.PointLight(C('#ff7a20'), 2.2, 260, 1.2); o.light.position.y = 50; root.add(o.light); }
            if (tp.beast === 'oliphant') o.legs = [[18, 12], [18, -12], [-18, 12], [-18, -12]].map(([x, z]) => { const l = mesh(tp.leg); l.position.set(x, 22, z); root.add(l); return l; });
            if (tp.beast === 'ent') { o.legs = [7, -7].map(z => { const l = mesh(tp.leg); l.position.set(0, 12, z); root.add(l); return l; }); o.arms = [9, -9].map(z => { const a = mesh(tp.arm); a.position.set(0, 44, z); root.add(a); return a; }); }
            if (tp.humanoid) Object.assign(o, humanoidRig(tp.humanoid, root, 0));
            if (tp.crown) { const c = mesh(tp.crown); o.head && o.head.add(c); o.torso.add(c); c.position.y = 0; }
            return o;
        }
        let seat = 0;
        if (tp.mount) {
            const M = tp.mount, g = new t.Group(); g.scale.setScalar(M.k); root.add(g);
            const body = mesh(M.body); body.position.y = M.h; g.add(body);
            const neck = mesh(M.neck); neck.position.set(9, M.h + 2, 0); g.add(neck);
            const tail = mesh(M.tail); tail.position.set(-10, M.h + 3, 0); g.add(tail);
            o.mLegs = [[7.6, 2.6], [7.6, -2.6], [-7.6, 2.6], [-7.6, -2.6]].map(([x, z]) => { const l = mesh(M.leg); l.position.set(x, M.h - 3, z); g.add(l); return l; });
            o.mount = g; o.neck = neck; seat = (M.h + 4.2) * M.k;
        }
        Object.assign(o, humanoidRig(tp.humanoid, root, seat));
        if (u.bn || u.cmd) {   // zástava
            const pole = mesh(Part().add('cyl', '#3a2a1a', [0, 20, 0], [0, 0, 0], [.7, 40, .7]).add('box', s.team || '#d9a441', [-4.4, 34, 0], [0, 0, 0], [8, 9, .4]).add('box', '#d9a441', [-4.4, 38.8, 0], [0, 0, 0], [8.4, .8, .6]).build());
            pole.position.set(-3, seat, -5); root.add(pole); o.flag = pole;
        }
        if (WX.night && (units.size % 5 === 0 || u.h)) { const f = new t.Mesh(prims().cone, new t.MeshBasicMaterial({ color: C('#ffb040') })); f.scale.set(1.6, 3, 1.6); f.position.set(0, -10.5, 0); o.armL.add(f); o.torch = f; }
        return o;
    }
    function humanoidRig(H, root, seat) {
        const t = T(), body = new t.Group(); body.scale.setScalar(H.scale); body.position.y = seat ? seat - 1 : 9.2 * H.scale; root.add(body);
        const torso = mesh(H.torso); body.add(torso);
        let cape = null; if (H.cape) { cape = mesh(H.cape); cape.position.set(-2.4, 9, 0); body.add(cape); }
        const armR = new t.Group(); armR.rotation.order = 'YZX'; armR.position.set(0, 8.6, 4.6); armR.add(mesh(H.armR)); body.add(armR);
        const armL = new t.Group(); armL.position.set(0, 8.6, -4.6); armL.add(mesh(H.armL)); body.add(armL);
        let shield = null; if (H.shield) { shield = new t.Group(); shield.position.set(0, -6.2, 0); shield.add(mesh(H.shield)); armL.add(shield); }
        const legs = [1.8, -1.8].map(z => { const g = new t.Group(); g.position.set(0, .2, z); g.add(mesh(H.leg)); body.add(g); return g; });
        return { body, torso, cape, armR, armL, shield, legs, bow: H.bow, spear: H.spear, orc: H.orc, scaleH: H.scale };
    }
    /** Póza jednotky podľa simulácie: chôdza/beh, nápriah, úder, kryt, streľba, zapotácanie, útek, pád; jazda. */
    function pose(o, u, dt) {
        const r = o.root, moved = Math.hypot(u.x - o.px, u.y - o.py); o.px = u.x; o.py = u.y;
        o.sp += (Math.min(3, moved / Math.max(.3, dt)) - o.sp) * .25;
        if (u.c > o.lc + 5) o.atk = 1; o.lc = u.c;
        if (o.atk > 0) o.atk = Math.max(0, o.atk - dt * .07);
        const fly = u.fly > 0 ? 70 + Math.sin(clock * 4) * 6 : u.boss === 'fell' ? 34 + Math.sin(clock * 2) * 4 : 0;
        r.position.set(u.x, heightAt(u.x, u.y) + fly, u.y);
        const yawT = -u.f; let d = yawT - r.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); r.rotation.y += d * Math.min(1, .35 * dt);
        if (u.hp <= 0) {   // pád
            if (!o.dead) { o.dead = 1; o.fall = 0; if (typeof OPT === 'undefined' || OPT.blood) decal(u.x, u.y, u.t && bloc(u.fc) ? '#2a1a14' : '#6a1410', 7 + Math.random() * 4); }
            o.fall = Math.min(1, o.fall + dt * .06);
            r.rotation.z = -o.fall * 1.45; r.position.y -= o.fall * 2;
            if (o.mount) { o.mount.rotation.x = o.fall * 1.3; }
            return;
        }
        r.rotation.z = u.stun > 0 ? Math.sin(clock * 9) * .12 : 0;
        const climb = SGB && SGB.lad && u.x > 962 && u.x < 1000 && [250, 710].some((l, i) => Math.abs(u.y - l) < 18 && !((SGB.ladOff || [])[i] > 0)) && !o.mount && !o.tp.boss;
        if (climb && o.armR) {   // lezenie po rebríku: telom k hradbám, ruky striedavo hore
            r.rotation.y = 0; const c = Math.sin(clock * 9 + o.ph);
            o.armR.rotation.z = 2.6 + c * .4; o.armR.rotation.y = 0; o.armL.rotation.z = 2.6 - c * .4; o.armL.rotation.x = 0;
            if (o.legs) o.legs.forEach((l, i) => { l.rotation.z = (i ? c : -c) * .5 + .3; });
            return;
        }
        o.ph += o.sp * dt * .18;
        const sw = Math.sin(o.ph) * Math.min(1, o.sp / 1.4), run = u.rout ? 1.4 : 1;
        if (o.legs && !o.mount) o.legs.forEach((l, i) => { if (o.tp && o.tp.beast === 'ent') l.rotation.z = (i ? -sw : sw) * .35; else l.rotation.z = (i ? -sw : sw) * .7 * run; });
        if (o.mLegs) o.mLegs.forEach((l, i) => { l.rotation.z = Math.sin(o.ph * 1.2 + [0, Math.PI, Math.PI * .5, Math.PI * 1.5][i]) * .6 * Math.min(1, o.sp / 1.2); });
        if (o.mount && o.legs) o.legs.forEach((l, i) => { l.rotation.x = (i ? -1 : 1) * .85; l.rotation.z = -.5; });
        if (o.mount) { o.mount.position.y = Math.abs(Math.sin(o.ph * 1.2)) * 1.4 * Math.min(1, o.sp / 1.2); if (o.neck) o.neck.rotation.z = Math.sin(o.ph * 1.2) * .08; }
        if (o.body && !o.tp.boss && !o.tp.beast) o.body.position.y = (o.mount ? o.body.position.y : 9.2 * o.scaleH + Math.abs(sw) * .5);
        if (o.torso) o.torso.rotation.z = o.orc ? -.25 : u.rout ? -.15 : 0;
        if (o.cape) o.cape.rotation.z = -.1 - Math.min(.5, o.sp * .2) - Math.sin(clock * 3 + o.ph) * .05;
        if (o.armR) {
            const C2 = typeof CMB !== 'undefined' ? CMB : {};
            let aR = (o.spear ? 1.2 : .35) - sw * .5, aRx = 0, aL = o.bow ? 1.45 : .5 + sw * .4;
            const lerp = (a, b, k) => a + (b - a) * k;
            const wind = (d, p) => { const P = DPOSE[d] || DPOSE.u; aR = lerp(.4, P[0], p); aRx = lerp(0, P[1], p); };
            const strike = (d, p) => { const P = DPOSE[d] || DPOSE.u; aR = lerp(P[0], P[2], p); aRx = lerp(P[1], P[3], p); };
            if (u.wu > 0 && u.wu0) wind(u.wd ? AI_D[u.wd] : 'u', Math.min(1, (1 - u.wu / u.wu0) * 1.4));   // nápriah – smer čitateľný z pózy
            if (o.atk > 0) { const p = 1 - o.atk; if (o.bow) { aR = 1.45 - (1 - p) * .6; aL = 1.45; } else if (o.spear && !u.lwd) aR = 1.3 + Math.sin(p * Math.PI) * .5; else strike(u.lwd ? AI_D[u.lwd] : 'u', Math.min(1, p * 2)); }
            if (u.h) {
                const swg = C2.swing;
                o.atk = 0;
                if (C2.rd) wind(C2.rd.d, Math.min(1, C2.rd.t / Math.max(1, C2.rd.ready)));
                else if (swg && swg.t > 0) { const p = 1 - swg.t / 10; if (swg.k === 'c') aR = 1.4; else strike(swg.d || (swg.k === 't' ? 't' : 'r'), Math.min(1, p * 1.6)); }
                if (C2.couch) { aR = 1.57; aRx = .12; }
                if (C2.blk) { aL = 1.4; if (OPT.blkDir === 'manual' && !(C2.shp > 0)) { const B = { u: [2.7, .2], l: [1.9, .9], r: [1.9, -.9], t: [1.1, .3] }[C2.bd] || [1.9, 0]; aR = B[0]; aRx = B[1]; } else aR = Math.max(aR, 1.9); }
                if (C2.draw > 0) { aL = 1.55; aR = 1.5 - Math.min(1, C2.draw / 26) * .5; aRx = .3; }
                else if (C2.bowC > 30 && o.bow) { aL = 1.5; aR = 1.4; }
            }
            if (!u.t && !u.h && u.hx != null && typeof fmOf === 'function' && fmOf(u) === 'wall' && !(o.atk > 0) && !(u.wu > 0)) aL = 1.45;   // štítový val: štíty vpred
            if (u.boss && u.atk) { const p = 1 - u.atk.t / u.atk.t0; wind('u', Math.min(1, p * 1.3)); }   // Kráľ trollov dvíha kyjak
            if (u.rout) { aR = -.4 + sw; aL = -.4 - sw; }
            o.armR.rotation.z = aR; o.armR.rotation.y = aRx;   // poradie YZX: najprv zdvih ruky, potom vodorovný švih
            o.armL.rotation.z = aL; o.armL.rotation.x = o.bow ? .2 : 0;
            if (o.shield) o.shield.rotation.z = -aL * .85;
        }
        if (o.wings) { const lift = (fly || u.boss === 'fell' ? .1 : .45) + Math.sin(clock * (u.boss === 'fell' || fly ? 5 : 1.6)) * (fly || u.boss === 'fell' ? .6 : .15); o.wings.forEach(w => { w.rotation.x = -w.userData.sd * lift; }); }
        if (o.fire) { const s = 1 + Math.sin(clock * 7) * .06; o.fire.scale.set(s, s * (1 + Math.sin(clock * 5) * .05), s); o.light.intensity = 2 + Math.sin(clock * 11) * .5; }
        if (o.legs && o.tp && o.tp.beast === 'oliphant') o.legs.forEach((l, i) => { l.rotation.z = Math.sin(o.ph * .6 + i * 1.6) * .25 * Math.min(1, o.sp); });
        if (o.arms) o.arms.forEach((a, i) => { a.rotation.z = (o.atk > 0 ? 1.8 - (1 - o.atk) * 1.6 : .2) + (i ? .1 : 0); });
        if (o.flag) o.flag.rotation.x = Math.sin(clock * 2 + o.ph) * .05;
    }

    /** Pózy pravej ruky pre smer úderu z pohľadu útočníka: [nápriah rotZ, rotX, koniec úderu rotZ, rotX]. AI_D prevádza smer z pohľadu obrancu. */
    const DPOSE = { u: [2.95, 0, .7, 0], r: [1.9, -1.45, 1.45, 1.1], l: [1.8, 1.25, 1.45, -1.1], t: [.8, -1, 1.6, 0] }, AI_D = { l: 'r', r: 'l', u: 'u', t: 't' };

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
        for (const u of U) {
            if (u.hp <= 0) continue;
            if (u.wu > 0 && u.wu0 && (u.t || u.wt === h) && Math.hypot(u.x - h.x, u.y - h.y) < 260) { const p = 1 - u.wu / u.wu0; ovSector(u.x, u.y, u.r + 4, u.r + 8 + p * 8, u.f - .7, u.f + .7, u.wt === h ? '#ff2010' : '#ff7050', 8); }
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
            if (C2.aim) { const A = C2.aim; ovSector(A.x, A.y, A.r, A.r + 1.6, 0, 6.283, '#ffe8a0', 20); ovSector(A.x, A.y, 0, 1.4, 0, 6.283, '#ffffff', 8); }   // zameriavač: kruh sa zúži, keď je luk napnutý
            if (C2.rd) { const k = Math.min(1, C2.rd.t / Math.max(1, C2.rd.ready)); ovSector(h.x, h.y, h.r + 4, h.r + 4 + 4 * k, h.f - .5, h.f + .5, C2.rd.t >= C2.rd.ready ? '#ffd24a' : '#a08040', 6); }
        }
        const g = overlay.geometry; g.setDrawRange(0, ovN); g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = true;
    }
    function decal(x, y, c, r) {
        const t = T(); if (decals.length > 260) { const d = decals.shift(); scene.remove(d); }
        const m = new t.Mesh(new t.CircleGeometry(r, 10), new t.MeshBasicMaterial({ color: C(c), transparent: true, opacity: .7, depthWrite: false }));
        m.rotation.x = -Math.PI / 2; m.position.set(x + (Math.random() - .5) * 4, heightAt(x, y) + .5, y + (Math.random() - .5) * 4); m.renderOrder = 2; scene.add(m); decals.push(m);
    }

    // ---------- šípy a častice ----------
    let AGEO = null;
    function arrowMesh(jav, bolt) {
        if (!AGEO) AGEO = {
            a: Part().add('cyl6', '#d8c8a0', [0, 0, 0], [0, 0, Math.PI / 2], [.5, 14, .5]).add('cone', '#a8acb4', [7.6, 0, 0], [0, 0, -Math.PI / 2], [1, 2, 1]).add('box', '#e8e8e0', [-6.2, 0, 0], [0, 0, 0], [2.4, .2, 1.6]).build(),
            j: Part().add('cyl6', '#8a6238', [0, 0, 0], [0, 0, Math.PI / 2], [.9, 26, .9]).add('cone', '#a8acb4', [14, 0, 0], [0, 0, -Math.PI / 2], [1.8, 4, 1.8]).build(),
            b: Part().add('cyl6', '#5a4a3a', [0, 0, 0], [0, 0, Math.PI / 2], [.7, 9, .7]).add('cone', '#8a8e96', [5, 0, 0], [0, 0, -Math.PI / 2], [1.2, 2, 1.2]).build()
        };
        return mesh(jav ? AGEO.j : bolt ? AGEO.b : AGEO.a);
    }
    function syncArrows() {
        const seen = new Set();
        for (const a of AR) {
            if (!a.m3) { a.m3 = arrowMesh(a.jav, a.bolt); a.l0 = a.l; a.h0 = heightAt(a.x, a.y) + 15; scene.add(a.m3); arrowPool.push(a); }
            seen.add(a);
            const p = 1 - a.l / a.l0, arc = Math.min(46, a.l0 * 1.1) * (a.bolt ? .25 : 1), y = a.h0 + Math.sin(p * Math.PI) * arc - p * 6, vy = Math.cos(p * Math.PI) * Math.PI * arc / a.l0;
            a.m3.position.set(a.x, Math.max(heightAt(a.x, a.y) + 1, y), a.y);
            a.m3.rotation.set(0, -Math.atan2(a.vy, a.vx), Math.atan2(vy, Math.hypot(a.vx, a.vy)));
        }
        for (let i = arrowPool.length - 1; i >= 0; i--) { const a = arrowPool[i]; if (seen.has(a)) continue; arrowPool.splice(i, 1);
            if (a.l <= 1.2 && stuck.length < 220) { a.m3.position.y = heightAt(a.x, a.y) + 3; a.m3.rotation.z = -.7; stuck.push(a.m3); } else { scene.remove(a.m3); }
        }
    }
    function syncParticles() {
        let n = 0;
        for (const p of PT) {
            if (n >= 900 || p.ring) continue;
            if (p.y0 == null) { p.y0 = p.y; p.x0 = p.x; }
            const up = Math.max(0, (p.y0 - p.y)) + (p.bl ? 2 : 10), cc = C(p.c || '#ffffff');
            ptsPos[n * 3] = p.x; ptsPos[n * 3 + 1] = heightAt(p.x, p.y0) + up; ptsPos[n * 3 + 2] = p.y0 + (p.x - p.x0) * 0;
            ptsCol[n * 3] = cc.r; ptsCol[n * 3 + 1] = cc.g; ptsCol[n * 3 + 2] = cc.b; n++;
        }
        const g = pts.geometry; g.setDrawRange(0, n); g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = true;
    }

    // ---------- efekty etapy 3: oheň, prach, trosky, kamene, olej, údery bossov ----------
    /** Sústava častíc s vlastnou veľkosťou a priehľadnosťou (oheň sčítava svetlo, prach a dym normálne). */
    function Psys(max, additive) {
        const t = T(), pos = new Float32Array(max * 3), col = new Float32Array(max * 3), al = new Float32Array(max), sz = new Float32Array(max), P = [];
        const g = new t.BufferGeometry(); g.setAttribute('position', new t.BufferAttribute(pos, 3)); g.setAttribute('color', new t.BufferAttribute(col, 3)); g.setAttribute('a', new t.BufferAttribute(al, 1)); g.setAttribute('s', new t.BufferAttribute(sz, 1));
        const m = new t.ShaderMaterial({ transparent: true, depthWrite: false, blending: additive ? t.AdditiveBlending : t.NormalBlending, vertexColors: true,
            vertexShader: 'attribute float a; attribute float s; varying float vA; varying vec3 vC; void main(){ vA = a; vC = color; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = s * 320.0 / max(1.0, -mv.z); gl_Position = projectionMatrix * mv; }',
            fragmentShader: 'varying float vA; varying vec3 vC; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(vC, vA * smoothstep(0.5, 0.1, d)); }' });
        const pts3 = new t.Points(g, m); pts3.frustumCulled = false; pts3.renderOrder = 6; scene.add(pts3);
        return {
            add(o) { if (P.length < max) P.push({ vx: 0, vy: 0, vz: 0, g: 0, s0: 8, s1: 8, a0: 1, ...o, l0: o.l, c: C(o.c || '#ffffff'), c1: o.c1 ? C(o.c1) : null }); },
            step(dt) {
                let n = 0;
                for (let i = P.length - 1; i >= 0; i--) { const q = P[i]; q.l -= dt; if (q.l <= 0) { P.splice(i, 1); continue; } q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.vy -= q.g * dt; const fl = heightAt(q.x, q.z) + .5; if (q.y < fl) { q.y = fl; q.vy = 0; q.vx *= .8; q.vz *= .8; } }
                for (const q of P) { const k = q.l / q.l0, c = q.c1 ? q.c.clone().lerp(q.c1, 1 - k) : q.c; pos[n * 3] = q.x; pos[n * 3 + 1] = q.y; pos[n * 3 + 2] = q.z; col[n * 3] = c.r; col[n * 3 + 1] = c.g; col[n * 3 + 2] = c.b; al[n] = q.a0 * Math.min(1, k * 2.2); sz[n] = q.s0 + (q.s1 - q.s0) * (1 - k); n++; }
                g.setDrawRange(0, n); for (const k of ['position', 'color', 'a', 's']) g.attributes[k].needsUpdate = true;
            }
        };
    }
    let FIRE = null, DUST = null, debris = [], rocks = [], fxState = {};
    const flame = (x, y, z, k = 1) => FIRE.add({ x, y, z, vx: (Math.random() - .5) * .5, vy: .5 + Math.random() * .9, vz: (Math.random() - .5) * .5, l: 26 + Math.random() * 22, c: '#ffe08a', c1: '#a01a04', s0: 6 * k, s1: 15 * k, a0: .85 });
    const smoke = (x, y, z, k = 1, c = '#3a3430') => DUST.add({ x, y, z, vx: (Math.random() - .5) * .4, vy: .25 + Math.random() * .4, vz: (Math.random() - .5) * .4, l: 60 + Math.random() * 40, c, s0: 12 * k, s1: 34 * k, a0: .45 });
    const dust = (x, y, n, r = 10, c) => { const cc = c || (BI === 's' ? '#e8eef2' : BI === 'a' ? '#6a5a52' : BI === 'd' ? '#e0c890' : '#b8a888'); for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = .6 + Math.random() * 1.6; DUST.add({ x: x + Math.cos(a) * r * Math.random(), y: heightAt(x, y) + 2, z: y + Math.sin(a) * r * Math.random(), vx: Math.cos(a) * v, vy: .2 + Math.random() * .5, vz: Math.sin(a) * v, l: 40 + Math.random() * 30, c: cc, s0: 10, s1: 30, a0: .5 }); } };
    function ring(x, y, r, c = '#ffd0a0') {
        const t = T(), m = new t.Mesh(new t.RingGeometry(.8, 1, 40), new t.MeshBasicMaterial({ color: C(c), transparent: true, opacity: .8, side: t.DoubleSide, depthWrite: false, blending: t.AdditiveBlending }));
        m.rotation.x = -Math.PI / 2; m.position.set(x, heightAt(x, y) + 1.5, y); scene.add(m); debris.push({ ring: m, r, l: 24, l0: 24 });
    }
    function chunk(x, y, z, col, k = 1, v = 1) {
        const t = T(), m = mesh(Part().add('box', col, [0, 0, 0], [0, 0, 0], [3 + Math.random() * 4 * k, 1.5 + Math.random() * 2, 2 + Math.random() * 5 * k]).build()); m.position.set(x, y, z); scene.add(m);
        const a = Math.random() * 6.283; debris.push({ m, vx: Math.cos(a) * v * (.5 + Math.random()), vy: v * (1 + Math.random() * 1.5), vz: Math.sin(a) * v * (.5 + Math.random()), wx: Math.random() * .3, wz: Math.random() * .3, rest: 0 });
    }
    function stepDebris(dt) {
        for (let i = debris.length - 1; i >= 0; i--) {
            const d = debris[i];
            if (d.ring) { d.l -= dt; const k = 1 - d.l / d.l0; d.ring.scale.setScalar(d.r * (.2 + k)); d.ring.material.opacity = .8 * (1 - k); if (d.l <= 0) { scene.remove(d.ring); d.ring.geometry.dispose(); debris.splice(i, 1); } continue; }
            if (d.rest) continue;
            const m = d.m; m.position.x += d.vx * dt; m.position.y += d.vy * dt; m.position.z += d.vz * dt; d.vy -= .12 * dt; m.rotation.x += d.wx * dt; m.rotation.z += d.wz * dt;
            const fl = heightAt(m.position.x, m.position.z) + 1; if (m.position.y < fl) { m.position.y = fl; if (d.vy < -1.2) { d.vy *= -.3; d.vx *= .5; d.vz *= .5; } else d.rest = 1; }
        }
        for (let i = rocks.length - 1; i >= 0; i--) {   // kamene z hradieb: letia oblúkom a dopadnú s prachom
            const r = rocks[i]; r.t += dt; const k = Math.min(1, r.t / 22);
            r.m.position.set(r.x0 + (r.x - r.x0) * k, 52 * (1 - k * k) + heightAt(r.x, r.y) * k + 4, r.y0 + (r.y - r.y0) * k); r.m.rotation.x += .2 * dt;
            if (k >= 1) { dust(r.x, r.y, 14, 16, '#a8a090'); ring(r.x, r.y, 30, '#d8d0c0'); rocks.splice(i, 1); r.m.position.y = heightAt(r.x, r.y) + 3; }
        }
        FIRE.step(dt); DUST.step(dt);
    }
    /** Spotrebuje udalosti zo simulácie (FX3) a sleduje zmeny stavu (brána, smrť bossa). */
    function runFx(dt) {
        const Q = typeof FX3 !== 'undefined' ? FX3.splice(0) : [];
        for (const e of Q) {
            if (e.k === 'rock') { const m = mesh(Part().add('sph0', '#8a8478', [0, 0, 0], [0, 0, 0], [8, 7, 8]).build()); scene.add(m); rocks.push({ m, x0: e.x0, y0: e.y0, x: e.x, y: e.y, t: 0 }); }
            if (e.k === 'oil') for (let i = 0; i < 60; i++) { const y = 440 + Math.random() * 80; FIRE.add({ x: 1000 - Math.random() * 6, y: 44 - Math.random() * 6, z: y, vx: -.4 - Math.random() * .6, vy: 0, vz: 0, g: .06, l: 40 + Math.random() * 30, c: '#ffb040', c1: '#5a1a04', s0: 7, s1: 14, a0: .8 }); if (i % 3 === 0) smoke(960 + Math.random() * 30, 3, y, 1.2); }
            if (e.k === 'ladder') { const l = [250, 710][e.i]; dust(955, l, 20, 20); for (let i = 0; i < 4; i++) chunk(960, 10, l + (Math.random() - .5) * 20, '#7a5a30', .6, .8); }
            if (e.k === 'boss') {
                const A = e.A, pts = [];
                if (A.k === 'circle') for (let i = 0; i < 90; i++) { const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * A.r; pts.push([A.x + Math.cos(a) * r, A.y + Math.sin(a) * r]); }
                else if (A.k === 'cone') for (let i = 0; i < 110; i++) { const a = A.a + (Math.random() - .5) * 2 * A.w, r = Math.sqrt(Math.random()) * A.len; pts.push([A.x + Math.cos(a) * r, A.y + Math.sin(a) * r]); }
                else for (let i = 0; i < 60; i++) { const k = Math.random(), w = (Math.random() - .5) * 2 * A.w; const a = Math.atan2(A.y2 - A.y, A.x2 - A.x); pts.push([A.x + (A.x2 - A.x) * k - Math.sin(a) * w, A.y + (A.y2 - A.y) * k + Math.cos(a) * w]); }
                if (A.fire) { for (const [x, y] of pts) { flame(x, heightAt(x, y) + 2 + Math.random() * 10, y, 1.2); flame(x + (Math.random() - .5) * 8, heightAt(x, y) + 6 + Math.random() * 14, y + (Math.random() - .5) * 8, .9); if (Math.random() < .25) smoke(x, heightAt(x, y) + 12, y, 1.4); } for (let i = 0; i < 10; i++) { const [x, y] = pts[i * 7 % pts.length]; decal(x, y, '#1a1410', 10 + Math.random() * 8); } }
                else { for (const [x, y] of pts.filter((p, i) => i % 3 === 0)) dust(x, y, 1, 4); ring(A.x, A.y, (A.r || 60) * 1.3); for (let i = 0; i < 6; i++) chunk(A.x + (Math.random() - .5) * 30, heightAt(A.x, A.y) + 2, A.y + (Math.random() - .5) * 30, '#6a5a48', .6, 1.2); }
            }
        }
        if (SGB) {   // brána: pri zásahoch sa trasie a trieskami, keď padne, rozletí sa na trosky
            const gv = SGB.gate;
            if (fxState.gate != null && gv < fxState.gate - .5 && gv > 0) { fxState.gj = 6; if (Math.random() < .4) chunk(1000, 10 + Math.random() * 20, 450 + Math.random() * 60, '#5a3a1a', .4, .6); }
            if (fxState.gate > 0 && gv <= 0) { for (let i = 0; i < 26; i++) chunk(1002, 6 + Math.random() * 36, 445 + Math.random() * 70, i % 4 ? '#5a3a1a' : '#8a8a8a', 1, 1.6); dust(990, 480, 40, 40); ring(995, 480, 90); SHAKE = Math.max(SHAKE, 3); }
            fxState.gate = gv;
            if (fxState.gj > 0) { fxState.gj -= dt; siege.gate.position.x = Math.sin(clock * 60) * .8; siege.gate.rotation.z = Math.sin(clock * 47) * .01; } else { siege.gate.position.x = 0; siege.gate.rotation.z = 0; }
        }
        for (const u of U) if (u.boss) {   // boss: oheň v papuli pred ohnivým útokom, tieň pod letiacim, pád pri smrti
            const o = units.get(u); if (!o) continue;
            if (u.atk && u.atk.fire && u.hp > 0 && Math.random() < .7) { const a = -o.root.rotation.y, d = u.boss === 'dragon' ? 56 : 14, hy = u.boss === 'dragon' ? 18 : 64; flame(u.x + Math.cos(a) * d, o.root.position.y + hy, u.y + Math.sin(a) * d, .8); }
            if (u.hp <= 0 && !o.bossDead) { o.bossDead = 1; dust(u.x, u.y, 50, 40); ring(u.x, u.y, 120); SHAKE = Math.max(SHAKE, 4); if (o.light) o.light.intensity = 0; if (o.fire) o.fire.visible = false; for (let i = 0; i < 30; i++) smoke(u.x + (Math.random() - .5) * 40, heightAt(u.x, u.y) + 10, u.y + (Math.random() - .5) * 40, 1.5, u.boss === 'balrog' ? '#2a1a14' : '#6a6058'); }
            if (!o.shadow) { const t = T(); o.shadow = new t.Mesh(new t.CircleGeometry(1, 20), new t.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .35, depthWrite: false })); o.shadow.rotation.x = -Math.PI / 2; o.shadow.renderOrder = 3; scene.add(o.shadow); }
            const air = o.root.position.y - heightAt(u.x, u.y); o.shadow.visible = air > 8 && u.hp > 0; o.shadow.position.set(u.x, heightAt(u.x, u.y) + .6, u.y); o.shadow.scale.setScalar(u.boss === 'dragon' ? 50 : 34);
        }
        if (SGB && WX.night) for (const a of AR) if (a.m3 && Math.random() < .5) FIRE.add({ x: a.m3.position.x, y: a.m3.position.y, z: a.m3.position.z, l: 10, c: '#ffc060', c1: '#801804', s0: 5, s1: 2, a0: .9 });   // horiace šípy pri nočnom obliehaní
        stepDebris(dt);
    }

    // ---------- kamera a vstup ----------
    function camUpdate(dt) {
        const h = U[0], t = T();
        if (keys.z) yaw -= .03 * dt; if (keys.c) yaw += .03 * dt;
        const fx = Math.cos(yaw), fz = Math.sin(yaw), hy = heightAt(h.x, h.y) + (G.eq.m && !h.dis ? 26 : 18);
        const want = new t.Vector3(h.x - fx * zoom * Math.cos(pitch), hy + zoom * Math.sin(pitch) + 6, h.y - fz * zoom * Math.cos(pitch));
        const gy = heightAt(want.x, want.z) + 8; if (want.y < gy) want.y = gy;
        const look = new t.Vector3(h.x + fx * 40, hy, h.y + fz * 40);
        if (!tgt) { tgt = look.clone(); cam.position.copy(want); }
        cam.position.lerp(want, Math.min(1, .18 * dt)); tgt.lerp(look, Math.min(1, .25 * dt)); cam.lookAt(tgt);
        if (SHAKE > 0) { cam.position.x += (Math.random() - .5) * SHAKE * 1.2; cam.position.y += (Math.random() - .5) * SHAKE * 1.2; }
        sun.position.set(h.x - 220, 420, h.y - 160); sun.target.position.set(h.x, 0, h.y);
        if (wx) { wx.position.set(h.x, 0, h.y); const p = wx.geometry.attributes.position, sp = WX.n === 'snow' ? .7 : WX.n === 'ash' ? .5 : 4.5; for (let i = 0; i < p.count; i++) { let y = p.getY(i) - sp * dt; if (y < 0) y += 260; p.setY(i, y); } p.needsUpdate = true; }
        if (torches.length) { const tb = []; units.forEach((o, u) => { if (o.torch && u.hp > 0) tb.push([Math.hypot(u.x - h.x, u.y - h.y), u]); }); tb.sort((a, b) => a[0] - b[0]); torches.forEach((l, i) => { const e = tb[i]; if (!e) { l.intensity = 0; return; } const u = e[1]; l.position.set(u.x, heightAt(u.x, u.y) + 26, u.y); l.intensity = 1.5 + Math.sin(clock * 9 + i) * .25; }); }
    }
    /** Pohyb WASD vzhľadom na kameru: [mx, my] v smere obrazovky → smer na bojisku. */
    function rel(mx, my) { const fx = Math.cos(yaw), fz = Math.sin(yaw), rx = -fz, rz = fx; return [fx * -my + rx * mx, fz * -my + rz * mx]; }
    /** Bod na zemi pod kurzorom (súradnice plátna Phaseru). */
    function pick(px, py) {
        if (!cam || !terrain) return null;
        const t = T(), rc = new t.Raycaster(), v = new t.Vector2(px / (W * RES) * 2 - 1, -(py / (H * RES)) * 2 + 1);
        rc.setFromCamera(v, cam);
        const hit = rc.intersectObject(terrain, false)[0];
        if (hit) return { x: hit.point.x, y: hit.point.z };
        const o = rc.ray.origin, d = rc.ray.direction; if (d.y >= 0) return null; const k = -o.y / d.y; return { x: o.x + d.x * k, y: o.z + d.z * k };
    }
    function wheel(dy) { zoom = Math.max(55, Math.min(320, zoom + dy * .12)); }
    function dragStart(x) { drag = x; }
    function dragMove(x) { if (drag == null) return; yaw += (x - drag) * .005; drag = x; }
    function dragEnd() { drag = null; }

    // ---------- životný cyklus ----------
    function ensureRenderer() {
        if (R) return;
        const t = T();
        R = new t.WebGLRenderer({ antialias: !(OPT && OPT.fx === 'low'), powerPreference: 'high-performance' });
        R.setPixelRatio(Math.min(window.devicePixelRatio || 1, OPT && OPT.fx === 'low' ? 1 : 1.75));
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
            ensureRenderer();
            const t = T();
            buildWorld();
            cam = new t.PerspectiveCamera(52, W / H, 2, 3000);
            units = new Map(); arrowPool = []; stuck = []; decals = []; tgt = null; fit.w = 0;
            const foes = U.filter(u => u.t), ex = foes.reduce((s, u) => s + u.x, 0) / Math.max(1, foes.length), ey = foes.reduce((s, u) => s + u.y, 0) / Math.max(1, foes.length);
            yaw = foes.length ? Math.atan2(ey - U[0].y, ex - U[0].x) : 0; zoom = G.eq.m ? 125 : 100;
            canvas.style.display = 'block'; on = true; built = true; lastT = performance.now();
            return true;
        } catch (e) { console.warn('3D bitka sa nedá spustiť', e); stop(); want.ok = false; return false; }
    }
    function frame(dt) {
        if (!on) return;
        clock += dt / 60;
        fit();
        for (const u of U) {
            let o = units.get(u);
            if (!o) { if (u.fled) continue; o = rig(u); scene.add(o.root); units.set(u, o); }
            if (u.fled) { o.root.visible = false; continue; }
            if (u.h && u.dis && !o.disDone) { o.disDone = 1; scene.remove(o.root); o = rig(u); scene.add(o.root); units.set(u, o); }   // hrdina zosadol z padnutého koňa
            pose(o, u, dt);
        }
        updSiege(); syncArrows(); syncParticles(); runFx(dt); drawOverlay(); camUpdate(dt);
        R.render(scene, cam);
    }
    function stop() {
        on = false;
        if (canvas) canvas.style.display = 'none';
        if (scene) scene.traverse(o => { if (o.geometry && !TPLgeo(o.geometry)) o.geometry.dispose(); if (o.material && o.material.map) o.material.map.dispose(); });
        FIRE = DUST = null; debris = []; rocks = []; scene = null; units = new Map(); arrowPool = []; stuck = []; decals = []; terrain = null; wx = null; torches = [];
        if (R) R.renderLists.dispose();
    }
    const TPLgeo = g => { for (const tp of TPL.values()) for (const v of Object.values(tp)) { if (v === g) return true; if (v && typeof v === 'object') for (const w of Object.values(v)) if (w === g) return true; } return g === (PR && Object.values(PR).find(p => p === g)) || (AGEO && Object.values(AGEO).includes(g)); };
    return { specOf, rigOf: u => units.get(u), want, start, frame, stop, pick, rel, wheel, dragStart, dragMove, dragEnd, isOn, heightAt, get yaw() { return yaw; } };
})();
