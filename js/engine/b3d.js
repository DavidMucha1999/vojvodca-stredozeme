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
    let intro = null, slow = null, photo = null, sunDir = null, braziers = [];
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
                items.push([typeof shape === 'string' ? prims()[shape] : shape, C(color), m, o || {}]); return this;
            },
            get n() { return items.length; },
            build(BN) {
                const metalLast = items.filter(i => !i[3].m).concat(items.filter(i => i[3].m));
                let n = 0; const gs = metalLast.map(([g, c, m, o]) => { const ng = (g.index ? g.toNonIndexed() : g.clone()); ng.applyMatrix4(m); n += ng.attributes.position.count; return [ng, c, o]; });
                const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), cl = new Float32Array(n), si = BN ? new Uint16Array(n * 4) : null, sw = BN ? new Float32Array(n * 4) : null;
                let o0 = 0, nm = 0; const V = new t.Vector3();
                for (const [g, c, o] of gs) {
                    const P = g.attributes.position, N = g.attributes.normal, cnt = P.count;
                    if (o.cl) for (let i = 0; i < cnt; i++) cl[o0 + i] = Math.max(0, Math.min(1, (o.cl[0] - P.getY(i)) / o.cl[1])) * (o.cl[2] ?? 1);
                    if (BN && o.b) { const M = BN.rest[o.b]; g.applyMatrix4(M); }
                    pos.set(g.attributes.position.array, o0 * 3); nor.set(g.attributes.normal.array, o0 * 3);
                    for (let i = 0; i < cnt; i++) { col[(o0 + i) * 3] = c.r; col[(o0 + i) * 3 + 1] = c.g; col[(o0 + i) * 3 + 2] = c.b; if (BN) { si[(o0 + i) * 4] = BN.idx[o.b || BN.root]; sw[(o0 + i) * 4] = 1; } }
                    if (o.m) nm += cnt;
                    o0 += cnt; g.dispose();
                }
                const out = new t.BufferGeometry(); out.setAttribute('position', new t.BufferAttribute(pos, 3)); out.setAttribute('normal', new t.BufferAttribute(nor, 3)); out.setAttribute('color', new t.BufferAttribute(col, 3)); out.setAttribute('aCloth', new t.BufferAttribute(cl, 1));
                if (BN) { out.setAttribute('skinIndex', new t.Uint16BufferAttribute(si, 4)); out.setAttribute('skinWeight', new t.BufferAttribute(sw, 4)); }
                out.addGroup(0, n - nm, 0); if (nm) out.addGroup(n - nm, nm, 1);
                out.computeBoundingSphere(); if (out.boundingSphere) out.boundingSphere.radius *= 1.6;
                return out;
            }
        };
    }
    /** Materiál prostredia (hradby, skaly, trosky): Standard s plochým tieňovaním, na nízkej kvalite Lambert. */
    const mat = k => MAT[k + QN()] || (MAT[k + QN()] = k === 'glow' ? new (T().MeshBasicMaterial)({ vertexColors: true })
        : QN() === 0 ? new (T().MeshLambertMaterial)({ vertexColors: true, flatShading: true, side: k === 'vs' ? T().DoubleSide : T().FrontSide })
        : new (T().MeshStandardMaterial)({ vertexColors: true, flatShading: true, roughness: .88, metalness: 0, envMapIntensity: .5, side: k === 'vs' ? T().DoubleSide : T().FrontSide }));
    const chrMats = () => [B3G.chrMat('c'), B3G.chrMat('m')];
    /** Krídlo: koreň v počiatku, rozpätie do +Z (druhé krídlo sa zrkadlí scale.z = -1). */
    function wingGeo(len, c1, c2) {
        const t = T(), a = C(c1), b = C(c2), P = [], Cl = [];
        const tri = (p, q, r, c) => { P.push(...p, ...q, ...r); for (let i = 0; i < 3; i++) Cl.push(c.r, c.g, c.b); };
        const root = [0, 0, 0], el = [-2, len * .22, len * .45], tip = [-len * .18, len * .32, len], tr = [-len * .5, -len * .05, len * .72], back = [-len * .45, 0, len * .18];
        tri(root, el, tip, a); tri(root, tip, tr, b); tri(root, tr, back, a);
        const g = new t.BufferGeometry(); g.setAttribute('position', new t.Float32BufferAttribute(P, 3)); g.setAttribute('color', new t.Float32BufferAttribute(Cl, 3)); g.computeVertexNormals();
        return g;
    }
    const shadowsOn = () => QN() >= 1;
    const mesh = (geo, m = 'v') => { const x = new (T().Mesh)(geo, mat(m)); x.castShadow = x.receiveShadow = shadowsOn(); return x; };
    const sh = (hex, k) => { const c = C(hex); c.multiplyScalar(k); return '#' + c.getHexString(); };
    /** Je farba kovová? (sivá, nie tmavá) – podľa nej dostane diel lesk a odraz. */
    const metalish = hex => { if (!hex) return false; const c = C(hex), hsl = {}; c.getHSL(hsl); return hsl.s < .2 && hsl.l > .2 && hsl.l < .85; };

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

    // ---------- kraj, denná doba, farby ----------
    function biome() {
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
        const t = T(), B = biome(), DL = dayLight(), night = DL.night, q = QN(), storm = WX.n === 'storm' || WX.n === 'rain', fog = WX.n === 'fog';
        scene = new t.Scene(); sunDir = DL.dir;
        // obloha: farby podľa kraja, dennej doby a počasia
        const zen = C(night ? '#050914' : B.sky.zen).lerp(C('#3a3040'), DL.low * .5), hor = C(night ? '#141c30' : B.sky.hor).lerp(C('#f0a060'), DL.low * .7);
        if (storm) { zen.lerp(C('#3a4048'), .75); hor.lerp(C('#6a7078'), .7); } if (fog) { zen.lerp(C('#a8b0b4'), .7); hor.lerp(C('#c8ccd0'), .8); }
        const sunC = night ? C('#9aaad8') : C('#fff2d8').lerp(C('#ff9a50'), DL.low);
        skyM = B3G.sky({ zen, hor, gnd: B.sky.gnd, sunDir: DL.dir, sunC, cloud: storm ? .85 : fog ? .9 : BI === 'a' ? .7 : .42, cloudC: night ? '#1a2030' : storm ? '#5a6068' : BI === 'a' ? '#4a2a22' : '#f4f2ee', night: night ? 1 : 0 });
        if (q >= 1) scene.add(skyM); else scene.background = hor.clone();
        const fogC = hor.clone().lerp(zen, .15);
        scene.fog = new t.Fog(fogC, fog ? 50 : night ? 130 : 420, fog ? 430 : night ? 700 : 1700);
        if (q >= 1) { try { scene.environment = B3G.envFrom(R, skyM); } catch (e) { } }
        hemi = new t.HemisphereLight(night ? C('#5a6aa0') : hor.clone().lerp(C('#ffffff'), .5), C(night ? '#202030' : B.dirt).lerp(C('#808080'), .3), night ? 2.4 : storm ? 1.1 : .85); scene.add(hemi);
        sun = new t.DirectionalLight(sunC, night ? 1.5 : storm ? .6 : fog ? .65 : 1.35 + (1 - DL.low) * .4);
        sun.castShadow = shadowsOn();
        if (sun.castShadow) { const s = sun.shadow, ms = [1024, 1024, 2048, 4096][q]; s.mapSize.set(ms, ms); s.camera.left = -280; s.camera.right = 280; s.camera.top = 280; s.camera.bottom = -280; s.camera.near = 10; s.camera.far = 1200; s.bias = -.0012; s.normalBias = 1.1; }
        scene.add(sun); scene.add(sun.target);
        B3G.U_WET.value = storm ? 1 : 0;
        grade = gradeFor();
        // cesta: krivka cez bojisko (pri obliehaní k bráne)
        const road = []; for (let i = 0; i <= 40; i++) { const x = i / 40 * (SGB ? 1000 : BW); road.push([x, SGB ? 480 + Math.sin(x * .006) * 30 * (1 - x / 1000) : BH * .8 + Math.sin(x * .005 + 1) * 40]); }
        const roadD = (x, y) => { let m = 1e9; for (let i = 0; i < road.length - 1; i++) { const [ax, ay] = road[i], [bx, by] = road[i + 1], dx = bx - ax, dy = by - ay, k = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy))); m = Math.min(m, Math.hypot(x - ax - dx * k, y - ay - dy * k)); } return m; };
        // stromy (najprv miesta, aby terén pod nimi stmavol)
        let seed = 11 + Math.floor((FIELD && FIELD.forest || 0) * 97); const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
        const spots = treeSpots(rnd, roadD);
        // terén: mriežka s výškou a farbami vrcholov (kraj, škvrny, cesta, breh, zatienenie pod stromami)
        const NX = 144, NY = 96, pos = [], col = [], idx = [];
        const cell = new Map(); for (const s of spots) { const k = Math.floor(s[0] / 40) + ',' + Math.floor(s[1] / 40); (cell.get(k) || cell.set(k, []).get(k)).push(s); }
        const near = (x, y) => { let o = 0; const cx = Math.floor(x / 40), cy = Math.floor(y / 40); for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const s of cell.get((cx + i) + ',' + (cy + j)) || []) o += Math.max(0, 1 - Math.hypot(s[0] - x, s[1] - y) / (18 * s[2])); return Math.min(1, o); };
        for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) {
            const x = i / NX * BW, y = j / NY * BH, h = heightAt(x, y, 1);
            pos.push(x, h, y);
            let c = C(B.g1).lerp(C(B.g2), .5 + .5 * Math.sin(x * .02 + y * .031) * Math.cos(y * .017));
            c.multiplyScalar(.9 + rnd() * .14);
            const rd = roadD(x, y); if (rd < 16) c.lerp(C(B.dirt), (1 - rd / 16) * .85);
            if (SGB && x > 1000) c = C('#8a8478').multiplyScalar(.85 + rnd() * .2);
            if (FIELD && FIELD.river && Math.abs(x - 720) < 54) c.lerp(C(B.dirt).multiplyScalar(.8), Math.min(1, (54 - Math.abs(x - 720)) / 14) * .7);
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
            if (FIELD && FIELD.river && Math.abs(x - 720) < 60) gd = 0;
            if (SGB && x > 940) gd = 0;
            if (HD[k] > 25) gd *= .3;
            HD[k + 1] = gd * (.75 + .5 * Math.sin(x * .03 + y * .021) * Math.cos(y * .04));
        }
        hTex = new t.DataTexture(HD, 289, 193, t.RGBAFormat, t.FloatType); hTex.magFilter = hTex.minFilter = t.NearestFilter; hTex.needsUpdate = true;
        terrain = new t.Mesh(g, B3G.terrainMat(trTex, B)); terrain.receiveShadow = true; scene.add(terrain);
        const fs = new t.Shape([new t.Vector2(-2500, -2500), new t.Vector2(BW + 2500, -2500), new t.Vector2(BW + 2500, BH + 2500), new t.Vector2(-2500, BH + 2500)]); fs.holes.push(new t.Path([new t.Vector2(4, 4), new t.Vector2(4, BH - 4), new t.Vector2(BW - 4, BH - 4), new t.Vector2(BW - 4, 4)]));
        const far = new t.Mesh(new t.ShapeGeometry(fs).rotateX(Math.PI / 2), new t.MeshLambertMaterial({ color: C(B.g1).multiplyScalar(.85), side: t.DoubleSide })); far.position.y = -1; scene.add(far);   // okolie bojiska až po hmlu (s otvorom pre terén)
        if (FIELD && FIELD.river) { waterM = B3G.water(hTex, 660, 780, -4.5, { hor: hor.getStyle(), zen: zen.getStyle() }); waterM.material.uniforms.uSunDir.value.copy(DL.dir); waterM.material.uniforms.uSunC.value.copy(sunC); scene.add(waterM); }
        if (q >= 1 && B.gd > 0) { grassM = B3G.grass(hTex, B, [0, 9000, 20000, 42000][q]); grassM.material.uniforms.uSunC.value.copy(sunC).multiplyScalar(night ? .35 : .9); grassM.material.uniforms.uAmb.value.copy(hemi.color).multiplyScalar(night ? .3 : .55); scene.add(grassM); }
        buildFlora(rnd, B, spots, road, roadD);
        if (SGB) buildSiege();
        // kaluže v daždi (lesklé, odrážajú oblohu)
        if (storm && q >= 1) for (let i = 0; i < 26; i++) { const x = rnd() * (SGB ? 960 : BW), y = rnd() * BH; if (FIELD && FIELD.river && Math.abs(x - 720) < 70) continue; const p = new t.Mesh(new t.CircleGeometry(6 + rnd() * 10, 16), new t.MeshStandardMaterial({ color: C('#7a868c'), roughness: .05, metalness: .5, transparent: true, opacity: .42, depthWrite: false })); p.rotation.x = -Math.PI / 2; p.scale.y = .5 + rnd() * .6; p.position.set(x, heightAt(x, y) + .35, y); p.renderOrder = 2; scene.add(p); }
        // počasie: dážď (čiarky), sneh, popol okolo kamery
        if (['rain', 'storm', 'snow', 'ash'].includes(WX.n) && q >= 1) {
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
        flashL = [0, 1, 2].map(() => { const l = new t.PointLight(C('#ffd080'), 0, 120, 1); scene.add(l); return l; });
        torches = [];
        if (night) for (let i = 0; i < 5; i++) { const l = new t.PointLight(C('#ffa040'), 14, 220, 1); scene.add(l); torches.push(l); }
    }
    /** Miesta stromov a kríkov (zhluky lesa z FIELD.trees, okraje bojiska). */
    function treeSpots(rnd, roadD) {
        const F = FIELD || { trees: [] }, spots = [];
        const place = (x, y, k) => { if (F.river && x > 660 && x < 780) return; if (SGB && x > 800) return; if (x < 0 || x > BW || y < 0 || y > BH) return; if (roadD(x, y) < 20) return; spots.push([x, y, k || .75 + rnd() * .6, rnd()]); };
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
            const leaf = ['#3e6a2a', '#4a7a30', '#36602a', '#56823a'];
            for (let i = 0; i < 7; i++) { const a = rr() * 6.28, d = rr() * 7; P.add('sph2', snow ? '#e8eef2' : leaf[i % 4], [Math.cos(a) * d, 22 + rr() * 9, Math.sin(a) * d], [0, 0, 0], [11 + rr() * 7, 9 + rr() * 5, 11 + rr() * 7]); }
            return P.build(); };
        const birch = (sd) => { const P = Part(); let r = sd; const rr = () => (r = r * 16807 % 2147483647) / 2147483647;
            P.add('cyl6', '#e8e4dc', [0, 12, 0], [0, 0, 0], [1.8, 24, 1.8]); for (let i = 0; i < 6; i++) P.add('box', '#2a2622', [.9, 4 + i * 3.6, 0], [0, rr() * 3, 0], [.3, .5, 1.4]);
            for (let i = 0; i < 5; i++) { const a = rr() * 6.28; P.add('sph', snow ? '#eef2f4' : i % 2 ? '#8aa848' : '#7a9a3a', [Math.cos(a) * 3, 24 + rr() * 8, Math.sin(a) * 3], [0, 0, 0], [7, 8 + rr() * 4, 7]); }
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
        // kríky navyše po bojisku
        const extra = []; if (BI !== 'a') for (let i = 0; i < 40; i++) { const x = rnd() * BW, y = rnd() * BH; if (Math.abs(x - BW * .5) < 300 && Math.abs(y - BH * .5) < 260) continue; if ((F.river && Math.abs(x - 720) < 70) || (SGB && x > 800) || roadD(x, y) < 20) continue; extra.push([x, y, .6 + rnd() * .5]); }
        inst(bush(), extra, ([x, y, sc]) => at(x, y, sc));
        // balvany: mach alebo sneh navrchu
        const rocksL = []; for (let i = 0; i < 34 + (F.hill ? 18 : 0); i++) { const x = rnd() * BW, y = rnd() * BH; if ((!F.river || x < 660 || x > 780) && !(SGB && x > 960)) rocksL.push([x, y, .6 + rnd() * 1.3]); }
        const rg = Part().add('sph', B.rock, [0, 1.2, 0], [0, 0, 0], [8, 5.6, 7]).add('sph0', sh(B.rock, .9), [2.6, .6, 1.8], [.4, .3, 0], [4.6, 3.6, 4]).build();
        const top = C(snow ? '#eef2f4' : BI === 'g' ? '#5a7a30' : BI === 'd' ? '#c0a878' : B.rock), cA = rg.attributes.color, nA = rg.attributes.normal;
        for (let i = 0; i < cA.count; i++) { const k = Math.max(0, (nA.getY(i) - .45) / .55); if (k > 0) { const c = C('#000').setRGB(cA.getX(i), cA.getY(i), cA.getZ(i)).lerp(top, k * .85); cA.setXYZ(i, c.r, c.g, c.b); } }
        inst(rg, rocksL, ([x, y, k]) => { M.compose(v.set(x, heightAt(x, y) - .5, y), q.setFromEuler(e.set(rnd() * .4, rnd() * 6, rnd() * .3)), s.set(k, k, k)); }, mat('v'));
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
        for (const y of [150, 390, 570, 810]) { W.add('cyl12', stone, [1024, 34, y], [0, 0, 0], [36, 68, 36]); W.add('cone', '#5a4a3a', [1024, 78, y], [0, 0, 0], [42, 22, 42]); for (let k = 0; k < 4; k++) W.add('box', '#1a1614', [1024 + Math.cos(k * 1.57) * 18, 52, y + Math.sin(k * 1.57) * 18], [0, -k * 1.57, 0], [1, 6, 2.4]); }
        W.add('box', '#9a958a', [1290, 40, 330], [0, 0, 0], [140, 80, 120]).add('box', dark, [1290, 84, 330], [0, 0, 0], [150, 8, 130]).add('cyl12', stone, [1350, 70, 380], [0, 0, 0], [40, 140, 40]).add('cone', '#5a3a2a', [1350, 150, 380], [0, 0, 0], [48, 30, 48]);
        for (let k = 0; k < 6; k++) W.add('box', '#1a1614', [1219.5, 30 + (k % 2) * 26, 290 + (k >> 1) * 30], [0, 0, 0], [1, 8, 4]);   // okná paláca
        for (const [x, z, w, d] of [[1120, 200, 50, 40], [1150, 760, 60, 44], [1240, 640, 46, 50]]) W.add('box', '#a89a84', [x, 12, z], [0, 0, 0], [w, 24, d]).add('box', '#6a3a2a', [x, 28, z], [0, 0, .5], [w * .75, 4, d + 4]).add('box', '#6a3a2a', [x, 28, z], [0, 0, -.5], [w * .75, 4, d + 4]);   // domy na nádvorí
        scene.add(mesh(W.build()));
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
    }
    function updSiege() {
        if (!SGB) return;
        const tt = U[0].tt || 0, pl = Math.min(1, tt / 160), pt = Math.min(1, tt / 320), off = SGB.ladOff || [0, 0];
        siege.gate.visible = SGB.gate > 0;
        siege.lad.forEach((m, i) => { m.visible = !!SGB.lad; if ((off[i] || 0) > 0) { m.rotation.z = .08; m.position.x = 950; m.position.y = 2; } else { m.rotation.z = Math.atan2(40, 36) * pl; m.position.x = 982 - (1 - pl) * 12; m.position.y = 2 + 18 * pl; } });
        siege.tower.position.set(960 - (1 - pt) * 150, 0, 610);
        const br = siege.bridge; if (pt < 1) br.rotation.z = Math.PI / 2; else if (br.rotation.z > 0) { br.rotation.z = Math.max(0, br.rotation.z - .05); if (br.rotation.z === 0) { dust(1010, 610, 16, 20, '#8a8478'); SHAKE = Math.max(SHAKE, 1.5); } }
        siege.ram.position.set(965 + Math.sin(clock * 3) * 5, 0, 480); siege.ram.visible = !!SGB.ram && SGB.gate > 0;
        for (const b of braziers) { if (Math.random() < .5) flame(b.x - 20 + (Math.random() - .5) * 3, 47, b.y + (Math.random() - .5) * 3, .8); if (Math.random() < .08) FIRE.add({ x: b.x - 20, y: 50, z: b.y, vx: (Math.random() - .5) * .3, vy: 1 + Math.random(), vz: (Math.random() - .5) * .3, l: 50, c: '#ffd080', c1: '#802004', s0: 1.5, s1: .5, a0: 1 }); }
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
    const TPL = new Map();
    /** Popis postavy jednotky u pre 3D: rasa, telo, výbava, farby, zviera, frakcia (erb). */
    function specOf(u) {
        if (u.boss) return { boss: u.boss };
        const fac = u.t ? (u.fc ?? 9) : (G.fac ?? 6), team = u.t ? (FC[u.fc] || '#8a7a6a') : FC[G.fac] || '#d9a441';
        const raceOf = L => L && ({ elf: 'elf', dwarf: 'dwarf', orc: 'orc', uruk: 'uruk', hobbit: 'hobbit', wraith: 'wraith' }[L.race]) || 'human';
        if (u.h) { const S = Soldiers.heroSpec(typeof twoHand === 'function' && twoHand() ? { ...G.eq, s: 0 } : G.eq), L = Portraits.hero(), lo = Figures.lookOpts(L); return { hero: 1, race: raceOf(L), fac, skin: lo.skin || SKIN.human, hair: lo.hcol || '#4a3020', beard: lo.beard ? 1 : 0, longHair: lo.hstyle === 'long', armor: S.armorG.col, rim: S.armorG.rim, helmG: S.helmG, shieldG: S.shieldG, weaponG: S.weaponG, weapon: S.weaponG.t, horse: G.eq.m && !(u.dis) ? S.horse : null, team, cape: heroSide() ? '#2a1414' : '#6a2a2a' }; }
        const kind = Art.unitArt(u), sp = (Soldiers.UNITS[kind] || Soldiers.UNITS.i);
        if (u.cp) { const c = compDef(u.cp); if (c && c.eq) { const S = Soldiers.heroSpec(c.eq), L = c.look || {}, lo = Figures.lookOpts(L); return { hero: 1, race: raceOf(L), fac, skin: lo.skin || SKIN.human, hair: lo.hcol || '#4a3020', beard: lo.beard ? 1 : 0, longHair: lo.hstyle === 'long', armor: S.armorG.col, rim: S.armorG.rim, helmG: L.helm || c.eq.h ? S.helmG : null, shieldG: S.shieldG, weaponG: S.weaponG, weapon: S.weaponG.t, horse: u.mnt ? Soldiers.GEAR.m[u.mnt] : null, team, cape: '#4a3a2a' }; } }
        const fu = u.uk && FU[u.uk], race = { orc: 'orc', uruk: 'uruk', troll: 'troll', dwarf: 'dwarf', elf: 'elf', none: 'wraith' }[sp.skin] || 'human';
        return { race, fac, skin: SKIN[sp.skin] || SKIN.human, hair: race === 'elf' ? '#e8d8a0' : ['#3a2a1a', '#6a4a2a', '#2a1a10', '#8a6a3a'][(u.x * 7 | 0) % 4], beard: sp.beard || (race === 'human' && (u.y * 3 | 0) % 3 === 0) ? 1 : 0, armor: (fu && fu.col) || sp.armor, helm: sp.helm, helmCol: fu && fu.hel, weapon: sp.weapon || 'sword', shield: sp.shield, mount: sp.mount, beast: sp.beast, big: sp.big, team, quiver: sp.weapon === 'bow' || sp.weapon === 'xbow', scale: race === 'troll' ? 1.55 : sp.big ? 1.6 : 1 };
    }
    const keyOf = s => JSON.stringify(s);
    /** Šablóna (geometrie a kostra) pre popis s; zdieľajú ju všetky rovnaké jednotky. */
    function template(s) {
        const k = keyOf(s); if (TPL.has(k)) return TPL.get(k);
        let tp;
        if (s.boss) tp = bossTemplate(s.boss);
        else if (s.beast === 'oliphant') tp = beastOliphant(s);
        else if (s.beast === 'ent') tp = beastEnt(s);
        else if (s.beast === 'wolf') tp = { humanoid: humanoid({ ...s, race: 'orc', skin: SKIN.orc, armor: '#2a2420', weapon: 'scimitar' }), mount: mountParts('wolf', s) };
        else tp = { humanoid: humanoid(s), mount: s.mount || s.horse ? mountParts(s.mount === 'wolf' || (s.horse && s.horse.wolf) ? 'wolf' : s.mount === 'darkhorse' ? 'dark' : 'horse', s) : null };
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
        const rc = RACE[s.race] || RACE.human, { W, D, H, lt, ls, a1, a2, hs } = rc, foot = 1.1, hipY = lt + ls + foot;
        const armor = s.armor || '#7d7f80', team = s.team || '#d9a441', skin = s.skin || SKIN.human, rim = s.rim || sh(armor, 1.25), pants = sh(armor, .55), boots = '#3a2a1c', leather = '#5a3e26';
        const mA = metalish(armor), mR = metalish(rim), hair = s.hair || '#4a3020';
        const BN = skel([['hip', null, [0, hipY, 0]], ['ch', 'hip', [0, .8, 0]], ['det', 'ch', [0, 0, 0]], ['shR', 'ch', [0, H - 1.9, W / 2 + .7]], ['elR', 'shR', [0, -a1, 0]], ['hR', 'elR', [0, -a2, 0]],
            ['shL', 'ch', [0, H - 1.9, -W / 2 - .7]], ['elL', 'shL', [0, -a1, 0]], ['hL', 'elL', [0, -a2, 0]], ['shd', 'elL', [0, -a2 * .5, 0]],
            ['lgR', 'hip', [0, -.3, W * .2]], ['knR', 'lgR', [0, -lt, 0]], ['lgL', 'hip', [0, -.3, -W * .2]], ['knL', 'lgL', [0, -lt, 0]], ['cape', 'ch', [-D / 2 - .35, H - .9, 0]]]);
        const P = Part(), b = n => ({ b: n }), bm = (n, m) => ({ b: n, m });
        const hc = [.15, H + 2.3 * hs, 0], HX = hc[0], HY = hc[1];
        // trup, pás, kabátec vo farbe frakcie, náplecníky, krk, hlava
        P.add('taperU', armor, [0, (H - .8) / 2 + .1, 0], [0, 0, 0], [D, H - .6, W], bm('ch', mA))
            .add('box', team, [D * .47, H * .44, 0], [0, 0, 0], [.4, H * .82, W * .44], b('ch')).add('box', team, [-D * .47, H * .44, 0], [0, 0, 0], [.4, H * .82, W * .44], b('ch'))
            .add('cyl12', leather, [0, .35, 0], [0, 0, 0], [D * .98, 1.2, W * .8], b('ch')).add('box', '#c8a040', [D * .49, .35, 0], [0, 0, 0], [.35, 1, 1], bm('ch', 1))
            .add('sph2', rim, [-.1, H - 1.6, W / 2 - .2], [0, 0, -.1], [D * .95, 2.8, 3.4], bm('ch', mR)).add('sph2', rim, [-.1, H - 1.6, -W / 2 + .2], [0, 0, -.1], [D * .95, 2.8, 3.4], bm('ch', mR))
            .add('cyl12', skin, [0, H - .2, 0], [0, 0, 0], [1.9, 2, 1.9], b('ch'))
            .add('sph2', skin, hc, [0, 0, 0], [4.1 * hs, 4.9 * hs, 3.9 * hs], b('ch'));
        P.add('taper', mA ? sh(armor, .85) : sh(armor, .8), [0, -1.4, 0], [0, 0, 0], [D * 1.12, 3.4, W * .9], bm('hip', mA));   // sukňa krúžkovej košele / šosy
        if (rc.tusks || s.race === 'orc' || s.race === 'troll') P.add('box', skin, [HX + 1.1 * hs, HY - 1.5 * hs, 0], [0, 0, 0], [2.4 * hs, 1.7 * hs, 3.4 * hs], b('ch'));   // čeľusť
        // tvár (detail: pri vzdialenej kamere sa skryje)
        if (!rc.noFace) {
            const eye = s.race === 'orc' || s.race === 'uruk' || s.race === 'troll' ? '#d8a020' : '#1a1410';
            P.add('box', sh(skin, .9), [HX + 2.0 * hs, HY - .15 * hs, 0], [0, 0, -.15], [.9 * hs, 1.4 * hs, s.race === 'orc' || s.race === 'troll' ? 1.3 * hs : .8 * hs], b('det'));
            for (const z of [-1, 1]) {
                if (eye === '#1a1410') P.add('box', '#ece6dc', [HX + 1.86 * hs, HY + .38 * hs, z * .85 * hs], [0, 0, 0], [.2, .5 * hs, .95 * hs], b('det'));
                P.add('box', eye, [HX + 1.93 * hs, HY + .38 * hs, z * .85 * hs], [0, 0, 0], [.2, .45 * hs, .45 * hs], b('det'));
                P.add('box', s.race === 'elf' ? sh(hair, .8) : '#2a1c12', [HX + 1.95 * hs, HY + 1.0 * hs, z * .85 * hs], [z * .12, 0, 0], [.35, .32, 1.35 * hs], b('det'));
                const ear = rc.ears === 'elf' ? ['cone', [HX - .3, HY + .7 * hs, z * 2.0 * hs], [z * 1.15, 0, .45], [.55, 2.6, .55]] : rc.ears === 'orc' ? ['cone', [HX - .2, HY + .2 * hs, z * 2.1 * hs], [z * 1.45, 0, .2], [1, 3, .6]] : ['sph2', [HX - .1, HY, z * 2.0 * hs], [0, 0, 0], [.9, 1.3 * hs, .5]];
                P.add(ear[0], skin, ear[1], ear[2], ear[3], b('det'));
                if (rc.tusks) P.add('cone', '#e8e0c8', [HX + 2.0 * hs, HY - 1.45 * hs, z * .85 * hs], [0, 0, 0], [.4, 1, .4], b('det'));
            }
            P.add('box', '#5a2a20', [HX + 1.98 * hs, HY - 1.3 * hs, 0], [0, 0, 0], [.22, .22, 1.2 * hs], b('det'));
            if (s.beard || rc.beard) {   // brada a fúzy
                const long = s.race === 'dwarf' ? 7.4 : 4;
                P.add('cone', hair, [HX + 1.5 * hs, HY - 1.6 * hs - long / 2, 0], [0, 0, Math.PI - .2], [3.2 * hs, long, 3.6 * hs], b('det')).add('box', hair, [HX + 2.05 * hs, HY - .85 * hs, 0], [0, 0, 0], [.5, .6, 2.4 * hs], b('det'));
                if (s.race === 'dwarf') for (const z of [-1, 1]) P.add('cyl6', hair, [HX + 1.6, HY - 4.4, z * 1.2], [0, 0, .15], [.7, 4, .7], b('det')).add('sph', '#c8a040', [HX + 1.8, HY - 6.4, z * 1.2], [0, 0, 0], [.8, .8, .8], bm('det', 1));
            }
        } else P.add('box', '#050505', [HX + 1.7, HY - .3, 0], [0, 0, 0], [1, 3.4, 3], b('ch'));   // prázdna tvár pod kapucňou
        // prilba alebo vlasy
        const hk = s.helmG ? s.helmG.kind : s.helm, hcol = s.helmG ? s.helmG.col : s.helmCol || (hk === 'hood' ? sh(armor, .9) : '#8a8c90'), hm = metalish(hcol);
        const hairOn = () => { P.add('hemi', hair, [HX - .3, HY + .3 * hs, 0], [0, 0, .25], [4.6 * hs, 4.6 * hs, 4.3 * hs], b('ch')); if (s.longHair || s.race === 'elf') P.add('box', hair, [HX - 1.8 * hs, HY - 2.4 * hs, 0], [0, 0, .1], [1.3, 5.4 * hs, 3.8 * hs], b('ch')); };
        const helmBase = (sc = 1) => P.add('hemi', hcol, [HX - .1, HY + .15 * hs, 0], [0, 0, .08], [4.8 * hs * sc, 5.4 * hs * sc, 4.6 * hs * sc], bm('ch', hm)).add('torus', sh(hcol, .78), [HX - .1, HY + .2 * hs, 0], [0, 0, .08], [4.9 * hs, 2.2, 4.7 * hs], bm('ch', hm));
        if (hk === 'hood' || hk === 'nazgul') { const hcc = hk === 'nazgul' ? '#0c0c0e' : hcol; P.add('sph2', hcc, [HX - .5, HY + .5, 0], [0, 0, .15], [5.4 * hs, 6 * hs, 5.2 * hs], b('ch')).add('cone', hcc, [HX - 1.4, HY + 3, 0], [0, 0, .5], [3, 3.4, 3], b('ch')).add('box', hcc, [HX - 2.2, HY - 2.6, 0], [0, 0, .15], [1, 4.6, 5], b('ch')); }
        else if (hk === 'turban') { P.add('torus', hcol || '#c84a2a', [HX - .1, HY + .9, 0], [0, 0, .1], [4.8 * hs, 5, 4.6 * hs], b('ch')).add('torus', sh(hcol || '#c84a2a', .85), [HX - .2, HY + 1.9, 0], [0, 0, .1], [4.2 * hs, 5, 4 * hs], b('ch')).add('sph', hcol || '#c84a2a', [HX - .3, HY + 2.2, 0], [0, 0, 0], [3.6, 2.6, 3.6], b('ch')); }
        else if (hk === 'cap') P.add('hemi', hcol || '#6a4a2e', [HX - .2, HY + .6, 0], [0, 0, .15], [4.6 * hs, 3.6 * hs, 4.4 * hs], b('ch'));
        else if (hk && hk !== 'none') {
            helmBase(hk === 'elf' ? .98 : 1);
            if (hk === 'gondor' || hk === 'winged' || hk === 'citadel') {   // vysoká prilba s chráničmi líc a krídlami morských vtákov
                P.add('taper', hcol, [HX - .2, HY + 2.9 * hs, 0], [0, 0, .05], [3.6, 2.6, 3.4], bm('ch', hm));
                for (const z of [-1, 1]) {
                    P.add('box', hcol, [HX + 1.2, HY - 1.1, z * 1.95 * hs], [z * .08, 0, 0], [2.2, 2.8, .35], bm('ch', hm));
                    const wc = (s.helmG && s.helmG.wings) || '#f2f4f6';
                    P.add('box', wc, [HX - .7, HY + 2.3, z * 2.5 * hs], [z * .35, 0, -.45], [.4, 4, 1.5], b('det')).add('box', wc, [HX - 1.4, HY + 2.9, z * 2.6 * hs], [z * .4, 0, -.7], [.35, 3, 1.2], b('det'));
                }
            }
            if (hk === 'rohan' || hk === 'plume') {   // nánosník, lícnice, zlatý pás a konský chvost
                P.add('box', hcol, [HX + 2.35 * hs, HY - .2, 0], [0, 0, 0], [.35, 2.4, .55], bm('ch', hm)).add('torus', '#c8a040', [HX - .1, HY + 1.2, 0], [0, 0, .08], [4.7 * hs, 1.2, 4.5 * hs], bm('ch', 1));
                for (const z of [-1, 1]) P.add('box', hcol, [HX + 1.1, HY - 1.2, z * 1.95 * hs], [0, 0, 0], [2, 2.6, .35], bm('ch', hm));
                const tc = (s.helmG && s.helmG.tail) || (hk === 'plume' ? '#c83a2a' : '#ece0c4');
                for (let i = 0; i < 4; i++) P.add('box', tc, [HX - 2.1 - i * .5, HY + 1.4 - i * 1.6, (i % 2 - .5) * .6], [0, 0, .5 + i * .12], [.7, 4, .7], b('det'));
            }
            if (hk === 'orc' || hk === 'troll') { for (let i = -1; i <= 1; i++) P.add('cone', sh(hcol, .7), [HX - .2 - Math.abs(i) * .5, HY + 2.6, i * 1.4], [i * .3, 0, 0], [.9, 2.4, .9], bm('det', hm)); P.add('box', sh(hcol, .8), [HX + 2.2, HY - .3, 0], [0, 0, .1], [.4, 2.6, .9], bm('ch', hm)); }
            if (hk === 'uruk') P.add('box', sh(hcol, .7), [HX - .2, HY + 2.6, 0], [0, 0, 0], [5, 1, .6], bm('ch', hm)).add('box', '#e8e4dc', [HX + 2.25, HY + .9, 0], [0, 0, 0], [.2, 1.4, 1.5], b('det'));
            if (hk === 'dwarf') P.add('cone', hcol, [HX - .2, HY + 3, 0], [0, 0, 0], [4.6, 3, 4.6], bm('ch', hm)).add('box', hcol, [HX + 2.15 * hs, HY - .8, 0], [0, 0, 0], [.35, 2.4, 3.2], bm('ch', hm)).add('box', '#1a1410', [HX + 2.35 * hs, HY - .2, 0], [0, 0, 0], [.1, .35, 2.6], b('det'));
            if (hk === 'elf') P.add('cone', '#d8b850', [HX - .4, HY + 2.6, 0], [0, 0, .25], [4.4, 6.4, 4.2], bm('ch', 1)).add('box', '#f4e2a0', [HX - .6, HY + 4.4, 0], [0, 0, .3], [3.6, 1.4, .5], bm('det', 1));
            if (hk === 'mask' || hk === 'easterling') P.add('box', '#c09030', [HX + 2.15 * hs, HY - .4, 0], [0, 0, 0], [.4, 3.4, 3.8], bm('ch', 1)).add('box', '#1a1410', [HX + 2.4 * hs, HY + .4, 0], [0, 0, 0], [.1, .35, 3], b('det'));
            if (!['gondor', 'winged', 'citadel', 'rohan', 'plume', 'orc', 'troll', 'uruk', 'dwarf', 'elf', 'mask', 'easterling'].includes(hk)) P.add('box', hcol, [HX + 2.3 * hs, HY - .2, 0], [0, 0, 0], [.35, 2.2, .55], bm('ch', hm));
        } else hairOn();
        // tulec na chrbte (lukostrelci)
        if (s.quiver) { P.add('cyl12', leather, [-D / 2 - .8, H * .55, 1.4], [.35, 0, 0], [1.8, 7.4, 1.8], b('ch')); for (let i = 0; i < 4; i++) P.add('box', '#e8e4dc', [-D / 2 - .8 + (i % 2) * .5, H * .55 + 4.2, 1.4 + (i - 1.5) * .35 + 1.3], [.35, 0, 0], [.3, 1.4, .25], b('det')); }
        // plášť (látka, ktorá sa vlní)
        if (s.cape || s.hero) P.add('capeBox', s.cape || team, [0, 0, 0], [0, 0, 0], [.5, H + 3.5, W * .95], { b: 'cape', cl: [0, H + 3.5, 1] });
        // pravá ruka so zbraňou
        const sleeve = mA ? armor : sh(armor, .9), fore = mA ? armor : s.race === 'orc' || s.race === 'troll' ? skin : sh(armor, .85);
        P.add('taperU', sleeve, [0, -a1 / 2 + .2, 0], [0, 0, 0], [2.5, a1 + .5, 2.5], bm('shR', mA)).add('sph2', sleeve, [0, 0, 0], [0, 0, 0], [1.9, 1.9, 1.9], bm('elR', mA))
            .add('taperU', fore, [0, -a2 / 2, 0], [0, 0, 0], [2.1, a2, 2.1], bm('elR', mA)).add('cyl12', leather, [0, -a2 + 1.3, 0], [0, 0, 0], [2.4, 2, 2.4], b('elR'))
            .add('sph2', skin, [.1, -.7, 0], [0, 0, 0], [1.7, 1.9, 1.5], b('hR'));
        const Wg = s.weaponG, wb = (Wg && (Wg.blade || (Wg.grad && Wg.grad[0]) || Wg.head)) || '#b8bec6', wt = s.weapon, guard = (Wg && Wg.guard) || '#6a6058';
        let tipY = -14;
        if (wt === 'spear') { P.add('cyl6', (Wg && Wg.shaft) || '#7a5a34', [0, -6, 0], [0, 0, 0], [.75, 38, .75], b('hR')).add('sph2', wb, [0, -27.5, 0], [0, 0, 0], [1.1, 5.6, .3], bm('hR', 1)).add('cone6', '#6a6a6a', [0, -24.6, 0], [Math.PI, 0, 0], [1, 1.6, 1], bm('hR', 1)); tipY = -30; }
        else if (wt === 'axe') { P.add('cyl6', (Wg && Wg.haft) || '#5a3a1a', [0, -5.5, 0], [0, 0, 0], [.85, 16, .85], b('hR')).add('box', wb, [1.7, -12, 0], [0, 0, 0], [3, 3.6, .4], bm('hR', 1)).add('box', wb, [2.6, -13.4, 0], [0, 0, .55], [1.6, 2.4, .35], bm('hR', 1)).add('cone6', wb, [-1, -12, 0], [0, 0, Math.PI / 2], [.7, 1.8, .4], bm('hR', 1)); tipY = -14; }
        else if (wt === 'club' || wt === 'mace') { P.add('taperU', '#5a4030', [0, -6.5, 0], [0, 0, 0], [2, 15, 2], b('hR')).add('sph2', wt === 'mace' ? '#7a7c80' : '#4a3424', [0, -14.5, 0], [0, 0, 0], [4.4, 5.2, 4.4], bm('hR', wt === 'mace')); for (let i = 0; i < 5; i++) P.add('cone6', '#8a8a8a', [Math.cos(i * 1.26) * 2.2, -14.5 + (i % 2) * 1.5, Math.sin(i * 1.26) * 2.2], [Math.sin(i * 1.26) * 1.57, 0, -Math.cos(i * 1.26) * 1.57], [.6, 1.6, .6], bm('hR', 1)); tipY = -16; }
        else if (wt === 'bow' || wt === 'xbow') { }
        else {   // meče: rovný, široký obojručný, zakrivená šabľa, štíhla elfská čepeľ
            const L = Wg ? 6 + Wg.L * 3.4 : 11, wide = Wg && Wg.t === 'broad' ? 1.7 : 1.25, curve = wt === 'scimitar' || wt === 'curve' || (Wg && Wg.t === 'curve') ? .13 : wt === 'elfblade' ? .07 : 0;
            P.add('cyl6', leather, [0, -.6, 0], [0, 0, 0], [.6, 2.4, .6], b('hR')).add('sph', guard, [0, 1, 0], [0, 0, 0], [.8, .8, .8], bm('hR', 1)).add('box', guard, [0, -2, 0], [0, 0, 0], [.75, .6, 3.8], bm('hR', 1));
            let px = 0, py = -2.3, an = 0; const seg = curve ? 4 : 1, sl = L / seg;
            for (let i = 0; i < seg; i++) { an += curve; const dx = Math.sin(an) * sl, dy = -Math.cos(an) * sl; P.add('box', wb, [px + dx / 2, py + dy / 2, 0], [0, 0, an], [.3, sl + .1, wide], bm('hR', 1)); px += dx; py += dy; }
            P.add('cone6', wb, [px + Math.sin(an) * .7, py - Math.cos(an) * .7, 0], [0, 0, Math.PI + an], [.3, 1.4, wide], bm('hR', 1));
            tipY = py;
        }
        // ľavá ruka so štítom alebo lukom
        P.add('taperU', sleeve, [0, -a1 / 2 + .2, 0], [0, 0, 0], [2.5, a1 + .5, 2.5], bm('shL', mA)).add('sph2', sleeve, [0, 0, 0], [0, 0, 0], [1.9, 1.9, 1.9], bm('elL', mA))
            .add('taperU', fore, [0, -a2 / 2, 0], [0, 0, 0], [2.1, a2, 2.1], bm('elL', mA)).add('cyl12', leather, [0, -a2 + 1.3, 0], [0, 0, 0], [2.4, 2, 2.4], b('elL'))
            .add('sph2', skin, [.1, -.7, 0], [0, 0, 0], [1.7, 1.9, 1.5], b('hL'));
        const SG = s.shieldG, shape = SG ? SG.shape : s.shield;
        if (shape) {
            const scol = SG ? SG.col : team, srim = SG ? SG.rim : sh(team, .55);
            if (shape === 'kite') P.add('box', srim, [1.6, 0, -.3], [0, 0, 0], [.8, 12, 7.6], bm('shd', metalish(srim))).add('box', srim, [1.6, -6.4, -.3], [Math.PI / 4, 0, 0], [.8, 5.4, 5.4], bm('shd', metalish(srim))).add('box', scol, [1.95, 0, -.3], [0, 0, 0], [.6, 11, 6.6], b('shd')).add('box', scol, [1.95, -6.2, -.3], [Math.PI / 4, 0, 0], [.6, 4.7, 4.7], b('shd'));
            else P.add('disc', srim, [1.6, 0, -.3], [0, 0, Math.PI / 2], [9.6, .8, 9.6], bm('shd', metalish(srim))).add('disc', scol, [1.95, 0, -.3], [0, 0, Math.PI / 2], [8.6, .6, 8.6], b('shd')).add('sph2', '#c8b060', [2.4, 0, -.3], [0, 0, 0], [1.6, 1.6, 1.6], bm('shd', 1));
        }
        if (wt === 'bow') { const Rb = 8.5; for (let i = 0; i < 9; i++) { const th = -1.05 + i * .2625, x = Rb * Math.sin(th), y = Rb * (1 - Math.cos(th)) * .55; P.add('cyl6', '#6a4a2a', [x, y - .6, 0], [0, 0, -th * .55 + Math.PI / 2], [.65, 2.4, .65], b('hL')); } P.add('box', '#e8e4d0', [0, Rb * (1 - Math.cos(1.05)) * .55 - .6, 0], [0, 0, 0], [Rb * 2 * Math.sin(1.05), .12, .12], b('hL')); }
        if (wt === 'xbow') P.add('box', '#5a3a1a', [0, -3.5, 0], [0, 0, 0], [1, 9, 1.2], b('hL')).add('box', '#7a7e86', [0, -7.4, 0], [0, 0, 0], [11, .6, .6], bm('hL', 1));
        // nohy s kolenami a čižmami
        const greave = mA ? armor : null;
        for (const [lg, kn] of [['lgR', 'knR'], ['lgL', 'knL']]) {
            P.add('taperU', pants, [0, -lt / 2, 0], [0, 0, 0], [2.9, lt + .3, 2.9], b(lg)).add('taperU', pants, [0, -ls / 2, 0], [0, 0, 0], [2.3, ls, 2.3], b(kn))
                .add('cyl12', boots, [0, -ls * .68, 0], [0, 0, 0], [2.6, ls * .64, 2.6], b(kn)).add('box', boots, [.9, -ls - .45, 0], [0, 0, 0], [3.8, 1.1, 2.3], b(kn));
            if (greave) P.add('sph2', greave, [.7, 0, 0], [0, 0, 0], [1.6, 1.6, 1.6], bm(kn, 1)).add('box', greave, [.85, -ls * .4, 0], [0, 0, 0], [.4, ls * .55, 1.8], bm(kn, 1));
        }
        const geo = P.build(BN);
        return { geo, BN, hipY, scale: s.scale || 1, race: s.race, bow: wt === 'bow' || wt === 'xbow', spear: wt === 'spear', hunch: rc.hunch, shield: shape, tipY, fac: s.fac, emblem: !!shape && !(SG && SG.plain) };
    }
    /** Kôň, varg alebo čierny kôň ako kostrová sieť: telo, krk, hlava, chvost, nohy s kĺbmi (koleno vpredu, hlezno vzadu). */
    function mountParts(kind, s) {
        const H = s.horse || {}, wolf = kind === 'wolf', c = wolf ? (H.col || '#45403a') : kind === 'dark' ? '#121014' : H.col || '#7a5638', mane = H.mane || (wolf ? '#1e1a18' : '#2a1a10'), k = wolf ? .82 : (H.s || 1);
        const up = wolf ? 4 : 5.6, lo = wolf ? 4.2 : 6, h = up + lo + (wolf ? 4.2 : 4.6);
        const BN = skel([['mb', null, [0, h, 0]], ['nk', 'mb', [wolf ? 9 : 9.5, 2, 0]], ['hd', 'nk', wolf ? [3.5, 2.5, 0] : [5.2, 7.4, 0]], ['tl', 'mb', [wolf ? -9.5 : -11, 2.5, 0]],
            ['FR', 'mb', [7, -3, 2.9]], ['FRk', 'FR', [0, -up, 0]], ['FL', 'mb', [7, -3, -2.9]], ['FLk', 'FL', [0, -up, 0]], ['BR', 'mb', [-7.6, -2.4, 2.9]], ['BRk', 'BR', [0, -up, 0]], ['BL', 'mb', [-7.6, -2.4, -2.9]], ['BLk', 'BL', [0, -up, 0]]]);
        const P = Part(), b = n => ({ b: n });
        const back = H.back || sh(c, .8);
        P.add('sph2', c, [0, 0, 0], [0, 0, 0], wolf ? [20, 8.4, 7.4] : [22, 9.6, 8.2], b('mb')).add('sph2', c, [6.6, .5, 0], [0, 0, 0], wolf ? [9, 9.4, 7.8] : [9.4, 9.8, 8.2], b('mb')).add('sph2', wolf ? back : c, [-7, .7, 0], [0, 0, 0], wolf ? [8.6, 8.4, 7.4] : [9.8, 10, 8.6], b('mb')).add('sph2', sh(c, .82), [0, -2.4, 0], [0, 0, 0], [16, 5, 6.6], b('mb'));
        if (wolf) for (let i = 0; i < 6; i++) P.add('cone6', back, [5 - i * 2.6, 3.8, 0], [0, 0, -.6], [1.6, 3.4, 2.4], b('mb'));
        if (!wolf) {
            P.add('box', '#5a3a1e', [-.8, 4.8, 0], [0, 0, 0], [6.4, 1.4, 6.8], b('mb')).add('box', '#4a2e18', [2.2, 6, 0], [0, 0, .3], [1.2, 2, 2.6], b('mb')).add('box', s.team || '#6a2a2a', [-.8, 4, 0], [0, 0, 0], [10, .6, 9.4], b('mb'));
            for (const z of [-1, 1]) P.add('box', '#3a2a1a', [-.4, 0, z * 4.3], [0, 0, 0], [.4, 8, .5], b('mb')).add('box', '#8a8a8a', [-.4, -4.4, z * 4.4], [0, 0, 0], [1.2, .5, .8], { b: 'mb', m: 1 });
            if (H.barding || H.caparison) {   // brnenie koňa a čaprak vo farbe frakcie
                if (H.barding) P.add('sph2', H.barding, [.4, .3, 0], [0, 0, 0], [23.6, 10.4, 8.9], { b: 'mb', m: metalish(H.barding) }).add('taperU', H.barding, [2.4, 3.6, 0], [0, 0, -.62], [4.9, 8.4, 4.1], { b: 'nk', m: metalish(H.barding) }).add('box', H.barding, [2.4, -1.2, 0], [0, 0, 1.0], [3.1, 4.2, 2.7], { b: 'hd', m: metalish(H.barding) });
                P.add('taper', s.team || '#6a2a2a', [0, -3.6, 0], [0, 0, 0], [24, 6, 9.6], { b: 'mb', cl: [-1, 6, .25] });
            }
            P.add('taperU', c, [2.4, 3.6, 0], [0, 0, -.62], [4.6, 9.6, 3.8], b('nk'));
            for (let i = 0; i < 6; i++) P.add('box', mane, [.6 + i * 1.05, 4.2 + i * 1.25, 0], [0, 0, -.62], [1.4, 2.8, .9], b('nk'));
            P.add('box', c, [.6, .4, 0], [0, 0, -.25], [4.4, 3.8, 3.2], b('hd')).add('taperU', c, [3.2, -1.4, 0], [0, 0, 1.0], [2.8, 4.6, 2.4], b('hd')).add('sph2', sh(c, .7), [4.9, -2.6, 0], [0, 0, 0], [2.2, 1.8, 2.2], b('hd'));
            for (const z of [-1, 1]) P.add('cone', c, [-.6, 2.6, z * 1], [z * .2, 0, -.2], [.7, 2, .7], b('hd')).add('box', kind === 'dark' || H.redEye ? '#ff3010' : '#0a0806', [1.9, .9, z * 1.62], [0, 0, 0], [.7, .6, .2], b('hd')).add('box', '#2a1a10', [2.6, -.4, z * 1.25], [0, 0, 1], [.25, 4.6, .25], b('hd'));
            P.add('box', mane, [-.8, 2.4, 0], [0, 0, .5], [1.2, 2.2, 1.6], b('hd'));
            if (H.plume) P.add('cone', H.plume, [-.6, 4.4, 0], [0, 0, .3], [1.2, 3.6, 1.2], b('hd'));
            P.add('taper', mane, [-1.6, -3.4, 0], [0, 0, .45], [1.8, 8, 1.6], b('tl'));
        } else {
            P.add('taperU', c, [1.2, .6, 0], [0, 0, -.9], [4.4, 5, 4.2], b('nk')).add('box', c, [.6, .2, 0], [0, 0, 0], [4, 3.6, 3.6], b('hd')).add('taperU', sh(c, .85), [3.4, -.6, 0], [0, 0, -Math.PI / 2], [2, 3.8, 2], b('hd'));
            for (const z of [-1, 1]) P.add('cone', c, [-.4, 2.4, z * 1.2], [z * .2, 0, -.2], [1, 2.2, .8], b('hd')).add('box', H.eye || '#e8c040', [1.9, .9, z * 1.25], [0, 0, 0], [.3, .45, .4], b('hd')).add('cone6', '#e8e0c8', [4.4, -1.4, z * .5], [Math.PI, 0, 0], [.35, .9, .35], b('hd'));
            P.add('sph2', back, [-3, -1, 0], [0, 0, .9], [3.2, 9, 3.2], b('tl'));
        }
        for (const L of ['FR', 'FL', 'BR', 'BL']) P.add('taperU', c, [0, -up / 2 + .4, 0], [0, 0, 0], [wolf ? 2.4 : 3.2, up + 1.2, wolf ? 2.2 : 3], b(L)).add('cyl12', c, [0, -lo / 2, 0], [0, 0, 0], [wolf ? 1.3 : 1.6, lo, wolf ? 1.3 : 1.6], b(L + 'k'))
            .add('box', wolf ? sh(c, .7) : H.hoof || '#1a1410', [wolf ? .6 : .2, -lo - .5, 0], [0, 0, 0], wolf ? [2.2, 1, 1.6] : [2, 1.2, 2], b(L + 'k'));
        return { geo: P.build(BN), BN, k, h, wolf, seat: (h + (wolf ? 3.6 : 5.2)) * k };
    }
    function beastOliphant(s) {
        const c = '#6a6460', b = Part().add('sph2', c, [0, 34, 0], [0, 0, 0], [52, 34, 32]).add('sph2', c, [28, 36, 0], [0, 0, 0], [20, 20, 18]).add('cyl12', c, [36, 22, 0], [0, 0, -.4], [4, 26, 4]).add('cone', '#e8e0c8', [36, 30, 5], [0, 0, -1.9], [2, 16, 2]).add('cone', '#e8e0c8', [36, 30, -5], [0, 0, -1.9], [2, 16, 2])
            .add('box', '#6b4a2e', [-2, 56, 0], [0, 0, 0], [26, 14, 20]).add('box', s.team, [-2, 64, 0], [0, 0, 0], [28, 3, 22]).add('box', '#a03020', [0, 50, 0], [0, 0, 0], [40, 3, 34]).add('sph2', sh(c, .9), [30, 40, 10], [0, 0, 0], [3, 12, 10]).add('sph2', sh(c, .9), [30, 40, -10], [0, 0, 0], [3, 12, 10]);
        const leg = Part().add('cyl12', c, [0, -10, 0], [0, 0, 0], [8, 20, 8]).add('cyl12', '#4a4440', [0, -20, 0], [0, 0, 0], [8.6, 1.4, 8.6]).build();
        return { beast: 'oliphant', body: b.build(), leg };
    }
    function beastEnt(s) {
        const b = Part().add('taperU', '#5a4a32', [0, 30, 0], [0, 0, 0], [11, 40, 11]).add('sph2', '#3e6a30', [0, 56, 0], [0, 0, 0], [26, 18, 26]).add('sph2', '#4e7a38', [4, 64, 3], [0, 0, 0], [16, 12, 16]).add('box', '#c8b060', [5.6, 44, 2], [0, 0, 0], [1, 1.4, 1]).add('box', '#c8b060', [5.6, 44, -2], [0, 0, 0], [1, 1.4, 1]).add('box', '#3a2a1a', [5.6, 40, 0], [0, 0, 0], [.6, .5, 3]);
        const arm = Part().add('cyl12', '#5a4a32', [0, -10, 0], [0, 0, 0], [3, 20, 3]).add('cone', '#4a3a26', [0, -22, 0], [Math.PI, 0, 0], [5, 6, 5]).build();
        const leg = Part().add('cyl12', '#4a3a26', [0, -6, 0], [0, 0, 0], [5, 12, 5]).build();
        return { beast: 'ent', body: b.build(), arm, leg };
    }
    function bossTemplate(k) {
        if (k === 'trollking') return { humanoid: humanoid({ race: 'troll', skin: SKIN.troll, armor: '#4e5446', helm: 'none', hair: '#2a2a20', weapon: 'club', team: '#4e5446', scale: 2.1, fac: 2 }), crown: Part().add('torus', '#d9a441', [0, 0, 0], [0, 0, 0], [5, 3, 5], { m: 1 }).add('cone', '#ffd24a', [0, 1.6, 2], [0, 0, 0], [1, 2.4, 1], { m: 1 }).add('cone', '#ffd24a', [0, 2, 0], [0, 0, 0], [1, 3, 1], { m: 1 }).add('cone', '#ffd24a', [0, 1.6, -2], [0, 0, 0], [1, 2.4, 1], { m: 1 }).build() };
        if (k === 'balrog') {
            const b = Part().add('taperU', '#24120a', [0, 44, 0], [0, 0, 0], [24, 34, 32]).add('sph2', '#2e160c', [4, 66, 0], [0, 0, 0], [16, 16, 16]).add('cone', '#0a0604', [2, 76, 7], [.6, 0, .3], [3, 14, 3]).add('cone', '#0a0604', [2, 76, -7], [-.6, 0, .3], [3, 14, 3])
                .add('taperU', '#24120a', [0, 14, 8], [0, 0, 0], [9, 28, 9]).add('taperU', '#24120a', [0, 14, -8], [0, 0, 0], [9, 28, 9]).add('box', '#1a0c06', [3, 1, 8], [0, 0, 0], [12, 2.4, 6]).add('box', '#1a0c06', [3, 1, -8], [0, 0, 0], [12, 2.4, 6]);
            const glow = Part().add('box', '#ffcc30', [11.2, 68, 3], [0, 0, 0], [1, 1.8, 2.4]).add('box', '#ffcc30', [11.2, 68, -3], [0, 0, 0], [1, 1.8, 2.4]).add('box', '#ff6a10', [11.2, 62, 0], [0, 0, 0], [1, 1.4, 6])
                .add('box', '#ff5a10', [11.6, 44, 0], [0, 0, .2], [.6, 22, 1.4]).add('box', '#ff7a20', [11.6, 40, 6], [0, 0, -.5], [.6, 14, 1]).add('box', '#ff7a20', [11.6, 40, -6], [0, 0, .6], [.6, 14, 1])
                .add('box', '#ffb040', [26, 58, 22], [0, 0, -.5], [2.4, 40, 1.6]).add('box', '#ff5a10', [26, 58, 22], [0, 0, -.5], [4, 34, 3]).build();   // oči, žeravé pukliny a plamenný meč
            const fire = Part().add('sph2', '#ff6a10', [0, 42, 0], [0, 0, 0], [40, 66, 46]).add('sph2', '#ff9a30', [0, 74, 0], [0, 0, 0], [26, 30, 30]).build();
            b.add('taperU', '#24120a', [6, 56, 18], [0, 0, -.5], [8, 26, 8]).add('taperU', '#24120a', [4, 56, -18], [0, 0, .3], [8, 26, 8]);
            return { boss: 'balrog', body: b.build(), wing: wingGeo(70, '#1a0c08', '#2a120a'), fire, glow };
        }
        if (k === 'dragon') {
            const col = '#5a1e14', bel = '#9a5a2a', b = Part().add('sph2', col, [0, 0, 0], [0, 0, 0], [52, 26, 28]).add('sph2', bel, [0, -6, 0], [0, 0, 0], [40, 14, 20]).add('taperU', col, [30, 10, 0], [0, 0, -1.1], [10, 26, 10]).add('box', col, [46, 18, 0], [0, 0, 0], [20, 10, 12]).add('cone', '#3a120c', [57, 18, 0], [0, 0, -Math.PI / 2], [8, 8, 10]).add('box', '#ffe040', [52, 22, 4], [0, 0, 0], [1.4, 1.4, 1.4]).add('box', '#ffe040', [52, 22, -4], [0, 0, 0], [1.4, 1.4, 1.4]).add('cone', '#2a0c08', [42, 26, 4], [0, 0, .5], [2, 9, 2]).add('cone', '#2a0c08', [42, 26, -4], [0, 0, .5], [2, 9, 2]);
            for (let i = 0; i < 6; i++) b.add('sph2', col, [-30 - i * 9, -2 + i * .6, 0], [0, 0, 0], [16 - i * 2, 12 - i * 1.4, 12 - i * 1.4]);
            for (let i = 0; i < 8; i++) b.add('cone6', '#2a0c08', [24 - i * 7, 13 - Math.abs(i - 3) * .6, 0], [0, 0, -.3], [2, 5, 1], {});
            for (const [x, z] of [[14, 10], [14, -10], [-14, 10], [-14, -10]]) b.add('cyl12', col, [x, -16, z], [0, 0, 0], [6, 18, 6]);
            return { boss: 'dragon', body: b.build(), wing: wingGeo(90, '#4a160e', '#2a0c08'), glow: Part().add('box', '#ffe040', [52.4, 22, 4], [0, 0, 0], [1.6, 1.6, 1.6]).add('box', '#ffe040', [52.4, 22, -4], [0, 0, 0], [1.6, 1.6, 1.6]).build() };
        }
        const b = Part().add('sph2', '#1a1a20', [0, 0, 0], [0, 0, 0], [36, 16, 16]).add('taperU', '#1a1a20', [20, 8, 0], [0, 0, -1], [6, 18, 6]).add('box', '#24242a', [30, 14, 0], [0, 0, 0], [14, 7, 7]).add('cone', '#0a0a10', [-4, 18, 0], [0, 0, 0], [7, 14, 7]).add('sph2', '#050508', [-4, 26, 0], [0, 0, 0], [5, 5, 5]).add('box', '#ff3020', [-1.6, 26, 0], [0, 0, 0], [.8, .8, 2]);
        for (let i = 0; i < 4; i++) b.add('sph2', '#1a1a20', [-20 - i * 8, -1, 0], [0, 0, 0], [10 - i * 2, 7 - i, 7 - i]);
        return { boss: 'fell', body: b.build(), wing: wingGeo(80, '#1a1a22', '#0e0e14'), glow: Part().add('box', '#ff3020', [-1.4, 26, 0], [0, 0, 0], [1, 1, 2.2]).build() };
    }
    /** Kostrová sieť zo šablóny (H = humanoid alebo kôň): vlastné kosti pre každú jednotku, zdieľaná geometria. */
    function skinned(H) {
        const t = T(), bones = {}, list = H.BN.list.map(([n, p, o]) => { const bn = new t.Bone(); bn.name = n; bn.position.set(...o); bones[n] = bn; return bn; });
        H.BN.list.forEach(([n, p]) => { if (p) bones[p].add(bones[n]); });
        if (bones.shR) { bones.shR.rotation.order = 'YZX'; bones.shL.rotation.order = 'YZX'; }
        const sm = new t.SkinnedMesh(H.geo, chrMats()); sm.add(bones[H.BN.root]); sm.updateMatrixWorld(true); sm.bind(new t.Skeleton(list));
        sm.castShadow = sm.receiveShadow = shadowsOn();
        return { sm, B: bones };
    }
    /** Model jednotky zo šablóny: kostrová sieť jazdca a koňa, alebo skupina dielov (bossovia, olifanty, enti). */
    function rig(u) {
        const t = T(), s = specOf(u), tp = template(s), root = new t.Group(), o = { root, s, tp, ph: Math.random() * 6, mph: Math.random(), atk: 0, lc: u.c, px: u.x, py: u.y, dead: 0, sp: 0, hit: 0, hp0: u.hp, bl: 0, id: units.size };
        root.rotation.order = 'YXZ';
        if (tp.boss || tp.beast) {
            if (tp.body) { o.body = mesh(tp.body); root.add(o.body); }
            if (tp.wing) { o.wings = [1, -1].map(sd => { const w = mesh(tp.wing, 'vs'); w.scale.z = sd; w.position.set(tp.boss === 'balrog' ? -6 : 0, tp.boss === 'balrog' ? 62 : 6, sd * (tp.boss === 'balrog' ? 10 : 8)); w.userData.sd = sd; root.add(w); return w; }); }
            if (tp.glow) root.add(new t.Mesh(tp.glow, mat('glow')));
            if (tp.fire) { o.fire = new t.Mesh(tp.fire, new t.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .22, depthWrite: false, blending: t.AdditiveBlending })); root.add(o.fire); o.light = new t.PointLight(C('#ff7a20'), 120, 300, 1); o.light.position.y = 50; root.add(o.light); }
            if (tp.beast === 'oliphant') o.legs = [[18, 12], [18, -12], [-18, 12], [-18, -12]].map(([x, z]) => { const l = mesh(tp.leg); l.position.set(x, 22, z); root.add(l); return l; });
            if (tp.beast === 'ent') { o.legs = [7, -7].map(z => { const l = mesh(tp.leg); l.position.set(0, 12, z); root.add(l); return l; }); o.arms = [9, -9].map(z => { const a = mesh(tp.arm); a.position.set(0, 44, z); root.add(a); return a; }); }
            if (tp.humanoid) { Object.assign(o, humanRig(tp.humanoid, root, 0, o)); if (tp.crown) { const c = mesh(tp.crown); c.position.set(.2, (RACE.troll.H + 5) , 0); o.B.ch.add(c); } }
            return o;
        }
        let seat = 0;
        if (tp.mount) {
            const M = tp.mount, k = skinned(M); k.sm.scale.setScalar(M.k); root.add(k.sm);
            o.mount = k.sm; o.MB = k.B; o.mk = M; seat = M.seat;
        }
        Object.assign(o, humanRig(tp.humanoid, root, seat, o));
        if (u.bn || u.cmd) {   // zástava s erbom na chrbte
            const pole = mesh(Part().add('cyl6', '#3a2a1a', [0, 12, 0], [0, 0, 0], [.7, 34, .7]).add('sph', '#c8a040', [0, 29.4, 0], [0, 0, 0], [1.2, 1.2, 1.2], { m: 1 }).build());
            const f = bannerMesh(s.fac, 9, 8); f.position.set(0, 24.5, 0); pole.add(f);
            pole.position.set(-tp.humanoid.BN.list[0][2][1] * 0 - 3.2, 0, -2.4); o.B.ch.add(pole); o.flag = pole;
        }
        if (WX.night && (units.size % 5 === 0 || u.h) && !tp.humanoid.shield && !tp.humanoid.bow) { const f = new t.Mesh(prims().cone, new t.MeshBasicMaterial({ color: C('#ffb040') })); f.scale.set(1.6, 3, 1.6); f.position.set(0, 4.6, 0); const st = mesh(Part().add('cyl6', '#4a3020', [0, 1, 0], [0, 0, 0], [.6, 6, .6]).build()); st.add(f); st.position.set(.2, -.8, 0); st.rotation.z = Math.PI; o.B.hL.add(st); o.torch = f; }
        return o;
    }
    function humanRig(H, root, seat, o) {
        const t = T(), k = skinned(H); k.sm.scale.setScalar(H.scale); root.add(k.sm);
        if (seat) k.sm.position.y = seat - (H.hipY - .5) * H.scale;
        if (H.emblem && QN() >= 1) { const e = new t.Mesh(H.shield === 'kite' ? new t.PlaneGeometry(5.6, 8) : new t.CircleGeometry(3.6, 20), B3G.emblemMat(H.fac ?? 9)); e.rotation.y = Math.PI / 2; e.position.set(2.32, H.shield === 'kite' ? -.6 : 0, -.3); k.B.shd.add(e); }
        const tip = new t.Object3D(); tip.position.set(0, H.tipY, 0); k.B.hR.add(tip); const mid = new t.Object3D(); mid.position.set(0, -2.6, 0); k.B.hR.add(mid);
        return { sm: k.sm, B: k.B, H, tip, mid, scaleH: H.scale };
    }

    /** Pózy pravej ruky pre smer úderu z pohľadu útočníka: [nápriah zdvih, švih, koniec zdvih, švih, lakeť pri nápriahu, lakeť na konci]. AI_D prevádza smer z pohľadu obrancu. */
    const DPOSE = { u: [2.95, 0, .7, 0, 1.25, .1], r: [1.9, -1.45, 1.45, 1.1, .75, .2], l: [1.8, 1.25, 1.45, -1.1, 1.3, .35], t: [.8, -1, 1.6, 0, 1.9, 0] }, AI_D = { l: 'r', r: 'l', u: 'u', t: 't' };
    /** Póza jednotky podľa simulácie: chôdza/beh s kolenami, dýchanie, nápriah, úder, kryt, streľba, zásah, zapotácanie, útek, pád podľa smeru; jazda. */
    function pose(o, u, dt) {
        const r = o.root, moved = Math.hypot(u.x - o.px, u.y - o.py); o.px = u.x; o.py = u.y;
        o.sp += (Math.min(3.4, moved / Math.max(.3, dt)) - o.sp) * .25;
        if (u.c > o.lc + 5) o.atk = 1; o.lc = u.c;
        if (o.atk > 0) o.atk = Math.max(0, o.atk - dt * .07);
        const fly = u.fly > 0 ? 70 + Math.sin(clock * 4) * 6 : u.boss === 'fell' ? 34 + Math.sin(clock * 2) * 4 : 0;
        r.position.set(u.x, heightAt(u.x, u.y) + fly, u.y);
        if (u.hp < o.hp0 - .5) onHit(o, u, o.hp0 - u.hp);
        o.hp0 = u.hp;
        if (o.hit > 0) o.hit = Math.max(0, o.hit - dt * .08);
        if (u.hp <= 0) return poseDead(o, u, dt);
        const yawT = -u.f; let d = yawT - r.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); r.rotation.y += d * Math.min(1, .35 * dt);
        r.rotation.z = u.stun > 0 ? Math.sin(clock * 9) * .12 : 0; r.rotation.x = 0;
        if (o.B) return poseHuman(o, u, dt);
        // bossovia a zvieratá z dielov
        o.ph += o.sp * dt * .18;
        const sw = Math.sin(o.ph) * Math.min(1, o.sp / 1.4);
        if (o.legs && o.tp.beast === 'ent') o.legs.forEach((l, i) => { l.rotation.z = (i ? -sw : sw) * .35; });
        if (o.wings) { const lift = (fly || u.boss === 'fell' ? .1 : .45) + Math.sin(clock * (u.boss === 'fell' || fly ? 5 : 1.6)) * (fly || u.boss === 'fell' ? .6 : .15); o.wings.forEach(w => { w.rotation.x = -w.userData.sd * lift; }); }
        if (o.fire) { const s = 1 + Math.sin(clock * 7) * .06; o.fire.scale.set(s, s * (1 + Math.sin(clock * 5) * .05), s); o.light.intensity = 110 + Math.sin(clock * 11) * 25; }
        if (o.legs && o.tp.beast === 'oliphant') o.legs.forEach((l, i) => { l.rotation.z = Math.sin(o.ph * .6 + i * 1.6) * .25 * Math.min(1, o.sp); });
        if (o.arms) o.arms.forEach((a, i) => { a.rotation.z = (o.atk > 0 ? 1.8 - (1 - o.atk) * 1.6 : .2) + (i ? .1 : 0); });
    }
    /** Zásah: trhnutie trupom, krv (sprej, kvapky na brnení). */
    function onHit(o, u, dmg) {
        o.hit = Math.min(1, .5 + dmg / 20);
        if (typeof OPT !== 'undefined' && OPT.blood === false || !DUST) return;
        const orc = u.t && typeof bloc === 'function' && bloc(u.fc), col = orc ? '#1e1410' : '#7a0e0a', y = heightAt(u.x, u.y) + 16 * (o.scaleH || 1) + (o.mount ? 14 : 0);
        for (let i = 0; i < 8; i++) { const a = Math.random() * 6.283; DUST.add({ x: u.x, y, z: u.y, vx: Math.cos(a) * (.4 + Math.random()), vy: .6 + Math.random() * 1.2, vz: Math.sin(a) * (.4 + Math.random()), g: .09, l: 22 + Math.random() * 12, c: col, s0: 2.4, s1: 1.4, a0: .9 }); }
        if (o.B && o.bl < 4 && QN() >= 1) { o.bl++; const t = T(), m = new t.Mesh(prims().sph, MAT.blood || (MAT.blood = new t.MeshStandardMaterial({ color: C('#4a0806'), roughness: .3 }))); const sd = Math.random() < .5 ? 1 : -1; m.position.set(sd * ((o.H.hipY ? 2.3 : 2.3)), 2 + Math.random() * 6, (Math.random() - .5) * 5); m.scale.set(.4, 1.6 + Math.random() * 1.6, 1.4 + Math.random()); o.B.ch.add(m); }
    }
    /** Pád: kolená sa podlomia, telo padne od útočníka (najbližší nepriateľ); kôň padne na bok. */
    function poseDead(o, u, dt) {
        const r = o.root;
        if (!o.dead) {
            o.dead = 1; o.fall = 0;
            let best = null, bd = 60; for (const v of U) if (v.t !== u.t && v.hp > 0) { const dd = Math.hypot(v.x - u.x, v.y - u.y); if (dd < bd) { bd = dd; best = v; } }
            const away = best ? Math.atan2(u.y - best.y, u.x - best.x) : u.f + Math.PI;
            o.rel = away - u.f;
            if (typeof OPT === 'undefined' || OPT.blood) decal(u.x, u.y, u.t && bloc(u.fc) ? '#2a1a14' : '#5a100c', 7 + Math.random() * 4);
            if ((u.boss || u.cmd) && !slow) { slow = { t: 100, k: .3, u }; }
        }
        o.fall = Math.min(1, o.fall + dt * .05);
        const f = o.fall, tilt = Math.max(0, (f - .2) / .8);
        if (o.B) { o.B.knR.rotation.z = o.B.knL.rotation.z = -1.3 * Math.min(1, f * 3) * (1 - tilt * .6); o.B.lgR.rotation.z = o.B.lgL.rotation.z = .7 * Math.min(1, f * 3) * (1 - tilt * .7); o.B.shR.rotation.z = .4 + tilt * 1.6; o.B.shL.rotation.z = .3 + tilt * 1.9; o.B.ch.rotation.z = -.2 * (1 - tilt); }
        const ang = tilt * 1.45 * (o.mount ? .95 : 1);
        r.rotation.z = -Math.cos(o.rel) * ang; r.rotation.x = Math.sin(o.rel) * ang;
        r.position.y -= Math.min(1, f * 3) * (o.B && !o.mount ? 4 * (o.scaleH || 1) * (1 - tilt * .6) : 1) + tilt * 1.5;
        if (o.MB) { for (const L of ['FR', 'FL', 'BR', 'BL']) { o.MB[L].rotation.z = (L[0] === 'F' ? .6 : -.5) * tilt; o.MB[L + 'k'].rotation.z = (L[0] === 'F' ? -1 : .8) * tilt; } o.MB.nk.rotation.z = -.4 * tilt; }
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
        o.ph += o.sp * dt * .2;
        const amt = Math.min(1, o.sp / 1.2), run = u.rout ? 1.3 : 1, breath = Math.sin(clock * 2.2 + o.id) * .5 + .5;
        if (!o.mount) {
            [[B.lgR, B.knR, 0], [B.lgL, B.knL, Math.PI]].forEach(([lg, kn, off]) => { const p = o.ph + off; lg.rotation.set(0, 0, Math.sin(p) * .62 * amt * run + (1 - amt) * .04); kn.rotation.z = -(Math.max(0, Math.cos(p)) * 1.15 * amt * run + .06 + (1 - amt) * .05); });
            B.hip.position.y = H.hipY + Math.abs(Math.sin(o.ph)) * .55 * amt - (1 - amt) * .12 - breath * .05;
        } else {
            B.lgR.rotation.set(-.42, 0, 1.15); B.lgL.rotation.set(.42, 0, 1.15); B.knR.rotation.z = B.knL.rotation.z = -1.45; B.hip.position.y = H.hipY;
        }
        // trup: zhrbenie (orkovia, trollovia), predklon v behu, trhnutie pri zásahu, dýchanie
        const lean = (H.hunch || 0) + Math.min(.32, o.sp * .1) * (o.mount ? .4 : 1) + (u.rout ? .2 : 0);
        B.ch.rotation.set(0, 0, -lean + o.hit * .38); B.ch.scale.set(1, 1 + breath * .012, 1 + breath * .008);
        // ruky
        const sw = Math.sin(o.ph) * amt;
        let aR = (H.spear ? .9 : .2) - sw * .45, aRy = 0, eR = H.spear ? 1.1 : .5 + breath * .05, aL = H.bow ? .35 : .3 + sw * .4, eL = H.shield ? .9 : .45;
        const wind = (d, p) => { const P = DPOSE[d] || DPOSE.u; aR = lerp(.3, P[0], p); aRy = lerp(0, P[1], p); eR = lerp(.5, P[4], p); };
        const strike = (d, p) => { const P = DPOSE[d] || DPOSE.u; aR = lerp(P[0], P[2], p); aRy = lerp(P[1], P[3], p); eR = lerp(P[4], P[5], p); };
        if (u.wu > 0 && u.wu0) wind(u.wd ? AI_D[u.wd] : 'u', Math.min(1, (1 - u.wu / u.wu0) * 1.4));   // nápriah – smer čitateľný z pózy
        if (o.atk > 0) { const p = 1 - o.atk; if (H.bow) { aL = 1.5; eL = 0; aR = 1.45; eR = 2.2 * (1 - Math.min(1, p * 3)); aRy = .3; } else if (H.spear && !u.lwd) { aR = 1.2 + Math.sin(p * Math.PI) * .45; eR = 1.6 - Math.sin(p * Math.PI) * 1.4; } else strike(u.lwd ? AI_D[u.lwd] : 'u', Math.min(1, p * 2)); }
        if (u.h) {
            const swg = C2.swing; o.atk = 0;
            if (C2.rd) wind(C2.rd.d, Math.min(1, C2.rd.t / Math.max(1, C2.rd.ready)));
            else if (swg && swg.t > 0) { const p = 1 - swg.t / 10; if (swg.k === 'c') { aR = 1.4; eR = .2; } else strike(swg.d || (swg.k === 't' ? 't' : 'r'), Math.min(1, p * 1.6)); }
            if (C2.couch) { aR = 1.5; aRy = .1; eR = .25; }
            if (C2.blk) { aL = 1.25; eL = .95; if (OPT.blkDir === 'manual' && !(C2.shp > 0)) { const Bk = { u: [2.6, .2, .9], l: [1.8, .9, 1], r: [1.8, -.9, 1], t: [1.1, .3, 1.2] }[C2.bd] || [1.9, 0, .9]; aR = Bk[0]; aRy = Bk[1]; eR = Bk[2]; } else if (!C2.shp) { aR = Math.max(aR, 1.7); eR = 1.1; } }
            if (C2.draw > 0 && H.bow) { aL = 1.55; eL = 0; aR = 1.5; eR = 2.3 * Math.min(1, C2.draw / 20); aRy = .32; }
        }
        if (H.bow && !(o.atk > 0) && !(u.h && C2.draw > 0)) { aL = .5 + sw * .3; eL = .4; }
        if (!u.t && !u.h && u.hx != null && typeof fmOf === 'function' && fmOf(u) === 'wall' && !(o.atk > 0) && !(u.wu > 0)) { aL = 1.2; eL = 1; }   // štítový val: štíty vpred
        if (u.boss && u.atk) { const p = 1 - u.atk.t / u.atk.t0; wind('u', Math.min(1, p * 1.3)); }   // Kráľ trollov dvíha kyjak
        if (u.rout) { aR = 2.4 + sw * .4; eR = 1.2; aL = 2.4 - sw * .4; eL = 1.2; }
        if (o.torch && !(u.h && (C2.blk || C2.draw))) { aL = Math.max(aL, 1.2); eL = 1.1; }
        B.shR.rotation.set(0, aRy, aR); B.elR.rotation.z = Math.max(0, eR);
        B.shL.rotation.set(0, 0, aL); B.elL.rotation.z = Math.max(0, eL);
        B.shL.rotation.x = H.bow ? .15 : -.12; B.shR.rotation.x = .12;
        B.shd.rotation.z = -(aL + eL) * .92;   // štít ostáva zvislo čelom vpred
        B.ch.rotation.y = aRy * .3;   // trup sa otáča so švihom
        B.cape.rotation.z = -.12 - Math.min(.7, o.sp * .25) - o.hit * .2;
        if (o.flag) o.flag.rotation.x = Math.sin(clock * 2 + o.ph) * .04;
        // detail tváre a prilby sa na diaľku skryje
        const far = cam && Math.hypot(cam.position.x - u.x, cam.position.z - u.y) > [0, 300, 420, 650][QN()];
        B.det.scale.setScalar(far ? .001 : 1);
    }
    /** Kôň a varg: krok (štvortakt), klus (diagonálne páry), cval (s hojdaním tela); hlava, krk a chvost. */
    function poseMount(o, u, dt) {
        const M = o.MB, s = o.sp, gait = s < 1.1 ? 0 : s < 2.1 ? 1 : 2, offs = [[0, .5, .75, .25], [0, .5, .5, 0], [.1, 0, .6, .5]][gait], A = [.32, .5, .78][gait] * Math.min(1, s / .6);
        o.mph += s * dt * (gait === 2 ? .085 : .11);
        const P = o.mph * 6.283;
        ['FR', 'FL', 'BR', 'BL'].forEach((L, i) => { const p = P + offs[i] * 6.283, front = L[0] === 'F'; M[L].rotation.z = Math.sin(p) * A * (front ? 1 : .85); M[L + 'k'].rotation.z = front ? -Math.max(0, Math.cos(p)) * (1.1 * A + .05) : Math.max(0, Math.cos(p)) * (.9 * A + .05); });
        M.mb.position.y = o.mk.h + Math.abs(Math.sin(P * (gait === 2 ? 1 : 2))) * (gait === 2 ? 1.6 : .7) * Math.min(1, s);
        M.mb.rotation.z = gait === 2 ? Math.sin(P) * .09 : 0;
        M.nk.rotation.z = Math.sin(P * (gait === 2 ? 1 : 2)) * .07 * Math.min(1, s) + (s < .2 ? Math.sin(clock * .7 + o.id) * .05 - .04 : 0);
        M.hd.rotation.z = -M.nk.rotation.z * .6;
        M.tl.rotation.z = .25 + Math.min(.7, s * .2) + Math.sin(clock * 2.1 + o.id) * .08; M.tl.rotation.x = Math.sin(clock * 1.4 + o.id) * .2;
        // jazdec sa hojdá s koňom
        if (o.sm) o.sm.position.y = o.mk.seat - (o.H.hipY - .5) * o.H.scale + (M.mb.position.y - o.mk.h) * o.mk.k;
        if (o.sm) o.sm.rotation.z = M.mb.rotation.z * .6;
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
        const m = new t.Mesh(new t.CircleGeometry(r, 12), new t.MeshStandardMaterial({ color: C(c), transparent: true, opacity: .78, depthWrite: false, roughness: .35 }));
        m.rotation.x = -Math.PI / 2; m.rotation.z = Math.random() * 6; m.scale.y = .6 + Math.random() * .5; m.position.set(x + (Math.random() - .5) * 4, heightAt(x, y) + .5, y + (Math.random() - .5) * 4); m.renderOrder = 2; scene.add(m); decals.push(m);
    }

    // ---------- šípy a častice ----------
    let AGEO = null;
    function arrowMesh(jav, bolt) {
        if (!AGEO) AGEO = {
            a: Part().add('cyl6', '#d8c8a0', [0, 0, 0], [0, 0, Math.PI / 2], [.5, 14, .5]).add('cone', '#a8acb4', [7.6, 0, 0], [0, 0, -Math.PI / 2], [1, 2, 1]).add('box', '#e8e8e0', [-6.2, 0, 0], [0, 0, 0], [2.4, .2, 1.6]).add('box', '#c83a2a', [-6.2, 0, 0], [Math.PI / 2, 0, 0], [2.4, .2, 1.6]).build(),
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
            if (a.l <= 1.2 && stuck.length < 220) { a.m3.position.y = heightAt(a.x, a.y) + 3; a.m3.rotation.z = -.7; stuck.push(a.m3); if (FIELD && FIELD.river && Math.abs(a.x - 720) < 44) splash(a.x, a.y, 4); } else { scene.remove(a.m3); }
        }
    }
    function syncParticles() {
        let n = 0;
        for (const p of PT) {
            if (p.ring) { if (!p.s3 && DUST) { p.s3 = 1; sparks(p.x, p.y, p.c); } continue; }   // kryt alebo pokrik: iskry a záblesk
            if (n >= 900) continue;
            if (p.y0 == null) { p.y0 = p.y; p.x0 = p.x; }
            const up = Math.max(0, (p.y0 - p.y)) + (p.bl ? 2 : 10), cc = C(p.c || '#ffffff');
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
            vertexShader: 'attribute float a; attribute float s; varying float vA; varying vec3 vC; void main(){ vA = a; vC = color; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = s * 320.0 / max(1.0, -mv.z); gl_Position = projectionMatrix * mv; }',
            fragmentShader: 'varying float vA; varying vec3 vC; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(vC * ' + (additive ? '2.2' : '1.0') + ', vA * smoothstep(0.5, 0.1, d)); }' });
        const pts3 = new t.Points(g, m); pts3.frustumCulled = false; pts3.renderOrder = 6; scene.add(pts3);
        return {
            add(o) { if (P.length < max) P.push({ vx: 0, vy: 0, vz: 0, g: 0, s0: 8, s1: 8, a0: 1, ...o, l0: o.l, c: C(o.c || '#ffffff'), c1: o.c1 ? C(o.c1) : null }); },
            get n() { return P.length; },
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
    const dust = (x, y, n, r = 10, c) => { const cc = c || (BI === 's' ? '#e8eef2' : BI === 'a' ? '#6a5a52' : BI === 'd' ? '#e0c890' : '#b8a888'); for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = .6 + Math.random() * 1.6; DUST.add({ x: x + Math.cos(a) * r * Math.random(), y: heightAt(x, y) + 2, z: y + Math.sin(a) * r * Math.random(), vx: Math.cos(a) * v, vy: .2 + Math.random() * .5, vz: Math.sin(a) * v, l: 40 + Math.random() * 30, c: cc, s0: 7, s1: 26, a0: .32 }); } };
    /** Iskry a krátky záblesk svetla (kryt štítom alebo zbraňou). */
    function sparks(x, y, c) {
        const h = heightAt(x, y) + 15;
        for (let i = 0; i < 14; i++) { const a = Math.random() * 6.283, v = .8 + Math.random() * 2; FIRE.add({ x, y: h, z: y, vx: Math.cos(a) * v, vy: .5 + Math.random() * 2, vz: Math.sin(a) * v, g: .12, l: 10 + Math.random() * 10, c: '#fff4c0', c1: '#ff8020', s0: 1.6, s1: .6, a0: 1 }); }
        const L = flashL.find(l => l.intensity < .3) || flashL[0]; L.position.set(x, h + 4, y); L.color.set(c && c !== '#ffffff' ? c : '#ffd890'); L.intensity = 160; L.distance = 120;
    }
    /** Špliechanie vody (brodenie, šíp do rieky). */
    function splash(x, y, n) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283; DUST.add({ x, y: -4.3, z: y, vx: Math.cos(a) * .6, vy: .8 + Math.random() * 1.1, vz: Math.sin(a) * .6, g: .1, l: 22 + Math.random() * 10, c: '#dbe8f0', s0: 3, s1: 5, a0: .8 }); } }
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
            const fl = heightAt(m.position.x, m.position.z) + 1; if (m.position.y < fl) { m.position.y = fl; if (d.vy < -1.2) { d.vy *= -.3; d.vx *= .5; d.vz *= .5; } else d.rest = 1; }
        }
        for (let i = rocks.length - 1; i >= 0; i--) {   // kamene z hradieb: letia oblúkom a dopadnú s prachom
            const r = rocks[i]; r.t += dt; const k = Math.min(1, r.t / 22);
            r.m.position.set(r.x0 + (r.x - r.x0) * k, 52 * (1 - k * k) + heightAt(r.x, r.y) * k + 4, r.y0 + (r.y - r.y0) * k); r.m.rotation.x += .2 * dt;
            if (k >= 1) { dust(r.x, r.y, 14, 16, '#a8a090'); ring(r.x, r.y, 30, '#d8d0c0'); rocks.splice(i, 1); r.m.position.y = heightAt(r.x, r.y) + 3; }
        }
        for (let i = fires.length - 1; i >= 0; i--) {   // horiaca zem po ohnivých útokoch
            const f = fires[i]; f.l -= dt; if (f.l <= 0) { fires.splice(i, 1); continue; }
            const k = Math.min(1, f.l / 200);
            if (Math.random() < .55 * k) flame(f.x + (Math.random() - .5) * f.r, heightAt(f.x, f.y) + 1, f.y + (Math.random() - .5) * f.r, .7 + k * .5);
            if (Math.random() < .12) smoke(f.x, heightAt(f.x, f.y) + 8, f.y, 1.2);
            if (Math.random() < .2) FIRE.add({ x: f.x + (Math.random() - .5) * f.r, y: heightAt(f.x, f.y) + 3, z: f.y + (Math.random() - .5) * f.r, vx: (Math.random() - .5) * .4, vy: 1.2 + Math.random(), vz: (Math.random() - .5) * .4, l: 50, c: '#ffd080', c1: '#601004', s0: 1.4, s1: .4, a0: 1 });   // iskry stúpajú
        }
        for (const L of flashL) L.intensity *= Math.pow(.8, dt);
        FIRE.step(dt); DUST.step(dt);
    }
    /** Spotrebuje udalosti zo simulácie (FX3) a sleduje zmeny stavu (brána, smrť bossa), prach za jazdou, para, voda, dupot. */
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
                if (u.atk && u.atk.fire && u.hp > 0 && Math.random() < .7) { const a = -o.root.rotation.y, d = u.boss === 'dragon' ? 56 : 14, hy = u.boss === 'dragon' ? 18 : 64; flame(u.x + Math.cos(a) * d, o.root.position.y + hy, u.y + Math.sin(a) * d, .8); }
                if (u.hp <= 0 && !o.bossDead) { o.bossDead = 1; dust(u.x, u.y, 50, 40); ring(u.x, u.y, 120); SHAKE = Math.max(SHAKE, 4); if (o.light) o.light.intensity = 0; if (o.fire) o.fire.visible = false; for (let i = 0; i < 30; i++) smoke(u.x + (Math.random() - .5) * 40, heightAt(u.x, u.y) + 10, u.y + (Math.random() - .5) * 40, 1.5, u.boss === 'balrog' ? '#2a1a14' : '#6a6058'); }
                if (!o.shadow) { const t = T(); o.shadow = new t.Mesh(new t.CircleGeometry(1, 20), new t.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .35, depthWrite: false })); o.shadow.rotation.x = -Math.PI / 2; o.shadow.renderOrder = 3; scene.add(o.shadow); }
                const air = o.root.position.y - heightAt(u.x, u.y); o.shadow.visible = air > 8 && u.hp > 0; o.shadow.position.set(u.x, heightAt(u.x, u.y) + .6, u.y); o.shadow.scale.setScalar(u.boss === 'dragon' ? 50 : 34);
                continue;
            }
            if (u.hp <= 0) continue;
            const dc = Math.hypot(u.x - cx, u.y - cz), mov = o.sp > .4, inRiver = FIELD && FIELD.river && Math.abs(u.x - 720) < 44;
            if (mov && (frameN + o.id) % 6 === 0) trample(u.x, u.y, o.mount ? 6 : 3.5, o.mount ? 16 : 6);
            else if (u.c > 0 && (frameN + o.id) % 20 === 0) trample(u.x, u.y, 4, 5);
            if (dc > 520) continue;
            if (inRiver && mov && Math.random() < .3) splash(u.x, u.y, o.mount ? 3 : 1);
            else if (o.mount && o.sp > 1.6 && Math.random() < .35 * QN()) { const a = -o.root.rotation.y; dust(u.x - Math.cos(a) * 10, u.y - Math.sin(a) * 10, 1, 6); }   // prach za jazdou
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
    function stepBlobs() {
        if (!blobs && !grassM) return;
        const t = T(), M = new t.Matrix4(); let n = 0; const cx = cam.position.x, cz = cam.position.z, near = [];
        for (const u of U) {
            if (u.fled) continue; const o = units.get(u); if (!o || o.tp.boss) continue;
            const r = (u.r || 6) * (o.mount ? 2.4 : 1.7) * (u.hp <= 0 ? 1.5 : 1);
            if (blobs && n < 700) { M.makeScale(r, 1, r * (o.mount && u.hp > 0 ? 1.6 : 1)); M.premultiply(new t.Matrix4().makeRotationY(o.root.rotation.y)); M.setPosition(u.x, heightAt(u.x, u.y) + .45, u.y); blobs.setMatrixAt(n++, M); }
            if (u.hp > 0) near.push([Math.hypot(u.x - cx, u.y - cz), u, o.mount ? 9 : 5]);
        }
        if (blobs) { blobs.count = n; blobs.instanceMatrix.needsUpdate = true; }
        if (grassM) { near.sort((a, b) => a[0] - b[0]); const P = grassM.material.uniforms.uPush.value; for (let i = 0; i < 12; i++) { const e = near[i]; if (e) P[i].set(e[1].x, e[1].y, e[2]); else P[i].set(-999, -999, 0); } const fw = new t.Vector3(); cam.getWorldDirection(fw); fw.y = 0; fw.normalize(); grassM.material.uniforms.uCam.value.set(cx + fw.x * 120, cz + fw.z * 120); }
    }

    // ---------- kamera a vstup ----------
    function camUpdate(dt) {
        const h = U[0], t = T();
        if (photo) return photoCam(dt);
        if (keys.z) yaw -= .03 * dt; if (keys.c) yaw += .03 * dt;
        const fx = Math.cos(yaw), fz = Math.sin(yaw), hy = heightAt(h.x, h.y) + (G.eq.m && !h.dis ? 28 : 19);
        const want = new t.Vector3(h.x - fx * zoom * Math.cos(pitch), hy + zoom * Math.sin(pitch) + 6, h.y - fz * zoom * Math.cos(pitch));
        const gy = heightAt(want.x, want.z) + 8; if (want.y < gy) want.y = gy;
        let look = new t.Vector3(h.x + fx * 40, hy, h.y + fz * 40);
        if (slow && slow.u) { const v = slow.u, k = Math.min(1, (100 - slow.t) / 20) * Math.min(1, slow.t / 20); look.lerp(new t.Vector3(v.x, heightAt(v.x, v.y) + 20, v.y), k * .7); }   // spomalenie: pohľad na padlého
        if (!tgt) { tgt = look.clone(); cam.position.copy(want); }
        if (intro) {   // nálet nad bojiskom: od nepriateľského vojska nad hlavami až za hrdinu
            intro.t += dt; const k = Math.min(1, intro.t / intro.T), e = k * k * (3 - 2 * k);
            const p0 = intro.p0, p1 = new t.Vector3((p0.x + want.x) / 2, Math.max(p0.y, want.y) + 90, (p0.z + want.z) / 2);
            const a = p0.clone().lerp(p1, e), b = p1.clone().lerp(want, e); cam.position.copy(a.lerp(b, e));
            tgt.copy(intro.l0.clone().lerp(look, e)); cam.lookAt(tgt);
            if (k >= 1) intro = null;
        } else { cam.position.lerp(want, Math.min(1, .18 * dt)); tgt.lerp(look, Math.min(1, .25 * dt)); cam.lookAt(tgt); }
        if (SHAKE > 0) { cam.position.x += (Math.random() - .5) * SHAKE * 1.2; cam.position.y += (Math.random() - .5) * SHAKE * 1.2; }
        const C2 = typeof CMB !== 'undefined' ? CMB : {}, fov = 52 + (C2.charging || C2.couch ? 9 : 0) + Math.min(5, Math.max(0, (Math.hypot(C2.vx || 0, C2.vy || 0) - 2.5) * 3));   // rozšírenie záberu v cvale a pri nápore
        if (Math.abs(cam.fov - fov) > .05) { cam.fov += (fov - cam.fov) * Math.min(1, .08 * dt); cam.updateProjectionMatrix(); }
        lightsFollow(h.x, h.y, dt);
    }
    function lightsFollow(x, y, dt) {
        const h = U[0];
        sun.position.set(x + sunDir.x * 500, sunDir.y * 500, y + sunDir.z * 500); sun.target.position.set(x, 0, y);
        if (skyM) skyM.position.copy(cam.position);
        if (wx) { wx.position.set(cam.position.x, 0, cam.position.z); const p = wx.geometry.attributes.position, rain = wx.userData.rain, sp = WX.n === 'snow' ? .7 : WX.n === 'ash' ? .5 : 5.5; for (let i = 0; i < p.count; i += rain ? 2 : 1) { let y = p.getY(i) - sp * dt; if (y < 0) y += 260; p.setY(i, y); if (rain) p.setY(i + 1, y + 7); } p.needsUpdate = true; }
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
        const hit = rc.intersectObject(terrain, false)[0];
        if (hit) return { x: hit.point.x, y: hit.point.z };
        const o = rc.ray.origin, d = rc.ray.direction; if (d.y >= 0) return null; const k = -o.y / d.y; return { x: o.x + d.x * k, y: o.z + d.z * k };
    }
    function wheel(dy) { if (photo) { photo.pos.y += dy * .05; return; } zoom = Math.max(55, Math.min(320, zoom + dy * .12)); }
    function dragStart(x, y) { drag = [x, y || 0]; }
    function dragMove(x, y) { if (drag == null) return; if (photo) { photo.yaw += (x - drag[0]) * .005; photo.pitch = Math.max(-1.2, Math.min(1.2, photo.pitch - ((y || 0) - drag[1]) * .005)); } else yaw += (x - drag[0]) * .005; drag = [x, y || 0]; }
    function dragEnd() { drag = null; }
    function skipIntro() { if (intro) intro.T = Math.min(intro.T, intro.t + 12); }
    /** Násobok rýchlosti simulácie (spomalenie pri páde bossa alebo veliteľa, zastavenie vo fotorežime). */
    function timeK() { if (photo) return 0; return slow ? slow.k : 1; }

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
            yaw = foes.length ? Math.atan2(ey - U[0].y, ex - U[0].x) : 0; zoom = G.eq.m ? 125 : 100;
            intro = typeof OPT !== 'undefined' && OPT.intro3d === false || !foes.length ? null : { t: 0, T: 230, p0: new t.Vector3(ex - Math.cos(yaw) * 60, heightAt(ex, ey) + 150, ey - Math.sin(yaw) * 60 + 80), l0: new t.Vector3(U[0].x, heightAt(U[0].x, U[0].y) + 10, U[0].y) };
            canvas.style.display = 'block'; on = true;
            return true;
        } catch (e) { console.warn('3D bitka sa nedá spustiť', e); stop(); want.ok = false; return false; }
    }
    function frame(dt) {
        if (!on) return;
        frameN++;
        const sdt = dt * timeK() || dt * .0001;
        clock += (photo ? 0 : dt * (slow ? slow.k : 1)) / 60; B3G.U_TIME.value = clock;
        if (slow && (slow.t -= dt) <= 0) slow = null;
        fit();
        for (const u of U) {
            let o = units.get(u);
            if (!o) { if (u.fled) continue; o = rig(u); scene.add(o.root); units.set(u, o); }
            if (u.fled) { o.root.visible = false; continue; }
            if (u.h && u.dis && !o.disDone) { o.disDone = 1; scene.remove(o.root); o = rig(u); o.disDone = 1; scene.add(o.root); units.set(u, o); }   // hrdina zosadol z padnutého koňa
            if (!photo) pose(o, u, sdt);
        }
        updSiege(); syncArrows(); syncParticles(); if (!photo) runFx(sdt); drawOverlay(); camUpdate(dt); stepBlobs();
        if (comp) {
            const F = comp.fin, Gd = grade;
            F.bloom.value = Gd.bloom; F.sat.value = Gd.sat; F.con.value = Gd.con; F.lift.value.set(...Gd.lift); F.gain.value.set(...Gd.gain); F.vig.value = photo ? .6 : .95; F.expo.value = WX.night ? 1.9 : WX.n === 'storm' || WX.n === 'rain' ? 1.25 : 1.12;
            const sp = cam.position.clone().addScaledVector(sunDir, 1500).project(cam), vis = sp.z < 1 && Math.abs(sp.x) < 1.3 && Math.abs(sp.y) < 1.3 && !WX.night && WX.n !== 'storm' && WX.n !== 'fog';
            F.sunUv.value.set(sp.x * .5 + .5, sp.y * .5 + .5); F.rays.value = vis && QN() >= 2 ? (QN() === 3 ? 1.4 : 1) * (1 - Math.min(1, Math.max(Math.abs(sp.x), Math.abs(sp.y)) - .3)) : 0;
            comp.render(scene, cam);
        } else { R.setRenderTarget(null); R.render(scene, cam); }
    }
    function stop() {
        on = false; intro = null; slow = null;
        if (photo) photoToggle();
        if (canvas) canvas.style.display = 'none';
        if (scene) scene.traverse(o => { if (o.geometry && !TPLgeo(o.geometry)) o.geometry.dispose(); });
        if (comp) { comp.dispose(); comp = null; }
        FIRE = DUST = null; debris = []; rocks = []; fires = []; trails = []; braziers = []; scene = null; units = new Map(); arrowPool = []; stuck = []; decals = []; terrain = null; wx = null; torches = []; grassM = waterM = blobs = null;
        if (hTex) { hTex.dispose(); hTex = null; } if (trTex) { trTex.dispose(); trTex = null; }
        if (R) R.renderLists.dispose();
    }
    const TPLgeo = g => { for (const tp of TPL.values()) for (const v of Object.values(tp)) { if (v === g) return true; if (v && typeof v === 'object') { if (v.geo === g) return true; for (const w of Object.values(v)) if (w === g) return true; } } return (PR && Object.values(PR).includes(g)) || (AGEO && Object.values(AGEO).includes(g)); };
    return { specOf, rigOf: u => units.get(u), want, start, frame, stop, pick, rel, wheel, dragStart, dragMove, dragEnd, isOn, heightAt, skipIntro, timeK, photoToggle, get photo() { return !!photo; }, get scene() { return scene; }, photoAt(x, y, z, yw, pt) { if (!photo) photoToggle(); photo.pos.set(x, y, z); photo.yaw = yw; photo.pitch = pt; }, get renderer() { return R; }, get intro() { return !!intro; }, get yaw() { return yaw; } };
})();
