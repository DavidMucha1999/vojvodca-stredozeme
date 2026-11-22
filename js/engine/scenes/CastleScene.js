/*
 * ENGINE: nádvorie a sieň hradu v 3D (základ Room3Scene). init({ i, room }): i = hrad, room = 'yard' | 'hall'. mode = 'castle'.
 * Vzhľad podľa frakcie (biely kameň Gondoru, drevo Rohanu, čierne železo Mordoru, Sarumanov kameň, pieskovec Haradu, tesaný kameň
 * Ereboru, červený kameň Rhûnu, mallorny Lothlórienu, palisáda banditov) a podľa čísla hradu (poloha studne, debien, cvičiska).
 * Nádvorie: hradby s cimburím a vežou, brána do siene, dvere do krčmy, vyhňa s nákovou, stánok kupca, studňa, cvičný panák,
 * postavené budovy (stajňa, chrám, trhovisko). Sieň: stĺpy, trón na pódiu, koberec, stoly, koše s ohňom, zástavy, okná.
 * Postavy a rozhovory: js/ui/castle.js (kováč, kupec, veliteľ, správca, pán hradu). Rozloženie je rovnaké ako v pôvodnej izometrii.
 */
const BFhex = f => Phaser.Display.Color.HexStringToColor(BF[f] || '#4a3a2a').color;
class CastleScene extends Room3Scene {
    constructor() { super('Castle'); }
    init(d) { this.ti = d.i; this.roomKind = d.room || 'yard'; }

    theme() {
        const t = TW[this.ti]; let f = t.f;
        if (f === 6) f = heroSide() === 1 ? 2 : 0;
        return ['gondor', 'rohan', 'mordor', 'isengard', 'harad', 'erebor', 'gondor', 'rhun', 'lorien', 'bandit'][f] || 'gondor';
    }
    palette(th) {
        return {
            gondor: { wall: '#cfd3d8', trim: 0x8a9098, ground: '#b9b5aa', roof: 0x4a6a9a, light: 0xfff0d0, hall: '#e8e8ec', floor: '#b0b4ba', carpet: 0x2a3a6a, wood: '#6a4a2a' },
            rohan: { wall: '#8a6a3a', trim: 0xd9a441, ground: '#7a6a40', roof: 0x5a3a1a, light: 0xffd080, hall: '#7a5a30', floor: '#6a4a28', carpet: 0x3a6a2a, wood: '#5a3a1a' },
            mordor: { wall: '#3c3638', trim: 0x7a3a1a, ground: '#3e3a3a', roof: 0x1c1a1c, light: 0xff6a30, hall: '#2e282a', floor: '#363234', carpet: 0x7a1010, wood: '#3a2418' },
            isengard: { wall: '#4a4a52', trim: 0x9a9aa0, ground: '#4e4a48', roof: 0x24242a, light: 0xfff0d0, hall: '#3c3c44', floor: '#444448', carpet: 0x2a2a2a, wood: '#4a3a2a' },
            harad: { wall: '#c8a06a', trim: 0xd9a441, ground: '#c8b080', roof: 0x8a2a1a, light: 0xffd080, hall: '#b89060', floor: '#a89068', carpet: 0xa02a1a, wood: '#6a4a2a' },
            erebor: { wall: '#6e6e78', trim: 0xd9a441, ground: '#62626a', roof: 0x3a3a42, light: 0xffb060, hall: '#56565e', floor: '#50505a', carpet: 0x3a4a7a, wood: '#4a3a2a' },
            rhun: { wall: '#8a3a30', trim: 0xd9a441, ground: '#9a7a58', roof: 0x5a1f4a, light: 0xffd080, hall: '#7a3028', floor: '#7a5a40', carpet: 0x5a1f4a, wood: '#5a3a1a' },
            lorien: { wall: '#9aa890', trim: 0xd8d0a0, ground: '#5a7a4a', roof: 0x3a5a3a, light: 0xc8e8ff, hall: '#7a8a70', floor: '#6a7a5a', carpet: 0x9ab07a, wood: '#6a5a40' },
            bandit: { wall: '#6a4a2a', trim: 0x3a2a1a, ground: '#5a4a30', roof: 0x3a2a1a, light: 0xffb060, hall: '#5a3a1a', floor: '#4a3a20', carpet: 0x4a3a2a, wood: '#4a3018' }
        }[th];
    }

    create() {
        this.cameras.main.setZoom(RES).setOrigin(0, 0);
        const t = TW[this.ti], th = this.theme(), C = this.palette(th), seed = this.ti * 11 + 5, R = n => { const x = Math.sin((seed + n) * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
        this.th = th; this.C = C; this.R = R; this.t = t;
        this.forge = this.chapel = this.well = null;
        if (this.roomKind === 'hall') this.buildHall(t, th, C, R); else this.buildYard(t, th, C, R);
    }
    wallKind(th) { return th === 'lorien' ? 'bark' : th === 'rohan' || th === 'bandit' ? 'planksV' : th === 'mordor' ? 'dark' : 'bricks'; }
    hx(c) { return '#' + c.toString(16).padStart(6, '0'); }
    /** Plochá farebná plocha na podlahe (koberec, nápis): x, y, w, d, výška z. */
    flat(x, y, w, d, z, col) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), this.mat(col, { r: 1 })); m.rotation.x = -Math.PI / 2; m.position.set(x + w / 2, z, y + d / 2); m.receiveShadow = true; this.world.add(m); return m; }
    /** Ihlanová strecha nad pôdorysom x, y, w, d od výšky z. */
    roof(x, y, w, d, h, z, col) { const m = new THREE.Mesh(new THREE.ConeGeometry(.5, h, 4), this.mat(col, { r: .8 })); m.rotation.y = Math.PI / 4; m.scale.set(w * 1.45, 1, d * 1.45); m.position.set(x + w / 2, z + h / 2, y + d / 2); this.add3(m); return m; }
    /** Stĺp s nízkou podstavou a hlavicou. */
    column(cx, cy, r, h, col) { this.cyl(cx, cy, r, h, col); this.box(cx - r - 3, cy - r - 3, r * 2 + 6, r * 2 + 6, 5, this.shade(col, .85), { block: false }); this.box(cx - r - 3, cy - r - 3, r * 2 + 6, r * 2 + 6, 6, this.shade(col, 1.05), { z: h - 6, block: false }); }
    /** Strážca stojí ako socha pri stene (bez štítku a bez akcie). */
    guard(x, y, eq, look, cape, face) { const p = this.person(x, y, { eq, look, cape }, '', null, 1, face); p.lbl.destroy(); this.people.pop(); return p; }

    /* ---------- nádvorie ---------- */
    buildYard(t, th, C, R) {
        const bd = t.bd || {};
        this.setRoom3(340, 220, 100, { bg: '#9cc4ec', sky: th === 'mordor' ? 0xd8a890 : 0xffffff, ground: 0x6a6258, hemi: th === 'mordor' || th === 'isengard' ? 1.4 : 1.7 });
        this.camPad = 70; this.camUp = 80; this.dist = 78; this.pitch = .42;   // nádvorie je pod holým nebom: kamera smie byť aj nad a za hradbami (steny sú zvonku priehľadné)
        const FW = this.FW, FD = this.FD, WH = this.WH, trim = this.hx(C.trim);
        const groundKind = th === 'rohan' || th === 'bandit' ? 'planks' : th === 'lorien' ? 'grass' : th === 'harad' ? 'sand' : th === 'gondor' ? 'flags' : 'cobbles';
        this.floor(groundKind, C.ground, this.ti + 4);
        this.walls(this.wallKind(th), C.wall, this.ti + 3);
        // cimburie a ochodza na vrchu všetkých štyroch hradieb
        for (let u = 6; u < FW; u += 24) { this.box(u, 0, 12, 7, 12, C.wall, { z: WH, block: false, shadow: false }); this.box(u, FD - 7, 12, 7, 12, C.wall, { z: WH, block: false, shadow: false }); }
        for (let u = 6; u < FD; u += 24) { this.box(0, u, 7, 12, 12, C.wall, { z: WH, block: false, shadow: false }); this.box(FW - 7, u, 7, 12, 12, C.wall, { z: WH, block: false, shadow: false }); }
        this.box(0, 0, FW, 4, 4, trim, { z: WH - 4, block: false, shadow: false }); this.box(0, 0, 4, FD, 4, trim, { z: WH - 4, block: false, shadow: false });
        // brána do siene v zadnej stene, dvere do krčmy v ľavej stene
        const gu = FW / 2 - 10, tu = FD - 70, wood = '#5a3a1a';
        this.box(gu - 36, 0, 72, 6, 74, this.shade(C.wall, .8), { block: false }); this.box(gu - 28, 0, 56, 7, 52, '#15100c', { block: false, top: '#15100c' });
        this.cyl(gu, 3, 28, 7, '#15100c', { z: 52, block: false }); this.box(gu - 22, 0, 44, 8, 44, wood, { block: false, top: wood });
        for (let v = 8; v < 44; v += 14) this.box(gu - 22, 0, 44, 9, 2, '#2a1a10', { z: v, block: false, shadow: false });
        this.box(gu - 2, 0, 4, 10, 12, '#d9a441', { z: 20, block: false, shadow: false });
        this.box(0, tu - 18, 6, 36, 40, this.shade(C.wall, .8), { block: false }); this.box(0, tu - 12, 8, 24, 36, '#6a4a2a', { block: false, top: '#6a4a2a' });
        this.box(0, tu - 16, 12, 32, 10, '#8a6a3a', { z: 52, block: false }); this.box(0, tu - 3, 14, 7, 7, '#c8903a', { z: 54, block: false });
        // zástavy frakcie pri bráne
        try { for (const bx of [FW / 2 - 50, FW / 2 + 36]) this.quad(bx + 8, 1.2, 62, 20, 34, 0, this.keyMat(Art.banner(this, t.f))); } catch (e) { }
        // fakle na stenách (niektoré so svetlom)
        [[60, 1.5], [FW - 60, 1.5]].forEach(([u, v], n) => { this.box(u - 2, 0, 4, 4, 24, '#3a2a1a', { z: 52, block: false, shadow: false }); this.flame(u, 5, 76, 0xff8a30, 0xffe080, .5, n ? 0 : .9); });
        for (const u of [40, 110]) { this.box(0, u - 2, 4, 4, 24, '#3a2a1a', { z: 52, block: false, shadow: false }); this.flame(5, u, 76, 0xff8a30, 0xffe080, .5, 0); }
        // veža v zadnom rohu
        this.box(0, 0, 52, 52, WH + 70, this.shade(C.wall, .9), { top: this.shade(C.wall, 1.1) });
        for (const [qx, qy] of [[0, 0], [40, 0], [0, 40], [40, 40]]) this.box(qx, qy, 12, 12, 14, C.wall, { z: WH + 70, block: false });
        for (const [qx, qy, w, d] of [[44, 24, 9, 6], [24, 44, 6, 9]]) this.box(qx, qy, w, d, 14, '#050404', { z: WH + 24, block: false, shadow: false });
        // vyhňa (vľavo vpredu): prístrešok, pec, nákova, sud
        const fx = 60, fy = FD - 90;
        this.box(fx, fy, 40, 30, 30, '#4a3a30', { top: this.shade('#4a3a30', .7) });
        this.box(fx + 10, fy + 28, 20, 3, 16, '#15100c', { block: false, shadow: false });
        this.forge = [fx + 20, fy + 14, 30];
        this.flame(fx + 20, fy + 15, 31, 0xff7a20, 0xffd060, .85, 2);
        this.box(fx + 56, fy + 4, 22, 12, 14, '#3a3a40'); this.box(fx + 54, fy + 3, 28, 14, 5, '#8a8a90', { z: 14, block: false });
        this.cyl(fx - 18, fy + 22, 9, 18, '#5a3a1e', { hoops: 1 });
        for (const [px, py] of [[fx - 8, fy - 20], [fx + 78, fy - 20], [fx - 8, fy + 40], [fx + 78, fy + 40]]) this.box(px, py, 5, 5, 62, '#3a2a1a', { block: false });
        this.box(fx - 12, fy - 24, 100, 70, 8, '#5a4a3a', { z: 62, block: false });
        // stánok kupca (vpravo vpredu)
        const mx = FW - 120, my = FD - 70, rc = [0x4a6a9a, 0x3a6a2a, 0x5a1010, 0x2a2a2a, 0xa02a1a, 0x3a4a7a, 0x6a2a2a, 0x5a1f4a, 0x9ab07a, 0x4a3a2a][t.f] || 0x8a2a1a;
        this.box(mx, my, 70, 20, 16, '#8a6a3a');
        [0xc8a040, 0x7a3a2a, 0x4a7a3a, 0xd8d0c0].forEach((c, k) => this.box(mx + 6 + k * 16, my + 6, 12, 8, 7, this.hx(c), { z: 16, block: false }));
        for (const px of [mx - 4, mx + 68]) this.box(px, my - 2, 4, 4, 70, '#5a3a1a', { block: false });
        for (let k = 0; k < 6; k++) this.box(mx - 6 + k * 14, my - 4, 14, 26, 3 + (k % 2) * 3, this.hx(k % 2 ? rc : 0xe8e0d0), { z: 68, block: false, shadow: true });
        for (let k = 0; k < 2 + Math.floor(R(3) * 3); k++) this.box(mx - 30 - k * 18, my + 8, 14, 14, 12, '#8a6a3a');
        // studňa
        const wx = FW / 2 + 20 + Math.floor(R(1) * 3) * 20, wy = 120 + Math.floor(R(2) * 2) * 30;
        this.cyl(wx, wy, 16, 14, '#8a8a84'); const wm = new THREE.Mesh(new THREE.CircleGeometry(12, 18), this.mat('#0a0806', { r: 1 })); wm.rotation.x = -Math.PI / 2; wm.position.set(wx, 14.2, wy); this.world.add(wm);
        for (const sx of [-17, 17]) this.box(wx + sx - 2, wy - 2, 4, 4, 40, '#3a2a1a', { block: false });
        this.roof(wx - 24, wy - 14, 48, 28, 20, 40, this.hx(C.roof)); this.cyl(wx, wy, 1.4, 4, '#8a8a90', { z: 26, block: false });
        this.well = [wx, wy];
        // cvičný panák, debny, seno
        const dx = 150 + Math.floor(R(4) * 2) * 90, dy = FD - 50;
        this.box(dx - 2, dy - 2, 4, 4, 40, '#5a3a1a', { block: false }); this.box(dx - 14, dy - 2, 28, 3, 3, '#5a3a1a', { z: 30, block: false });
        this.cyl(dx, dy, 7, 18, '#c8a870', { z: 18, block: false }); const hd = new THREE.Mesh(new THREE.SphereGeometry(5, 10, 8), this.mat('#e8c39e')); hd.position.set(dx, 42, dy); this.add3(hd);
        this.blocks.push([dx - 8, dy - 8, 16, 16]);
        for (let k = 0; k < 3; k++) this.box(FW - 40 - (k % 2) * 20, 70 + k * 18, 16, 16, 14, '#8a6a3a');
        if (th !== 'mordor' && th !== 'isengard') { const h1 = new THREE.Mesh(new THREE.SphereGeometry(18, 12, 8), this.mat('#c8a040')); h1.scale.set(1.3, .7, 1); h1.position.set(30, 8, 85); this.add3(h1); }
        // budovy podľa správy hradu: stajňa, chrám, trhovisko
        if (bd.j) { this.box(190, 6, 64, 34, 34, C.wood, { top: this.shade(C.wood, .7) }); this.roof(188, 4, 68, 38, 18, 34, this.hx(C.roof)); this.box(204, 38, 14, 3, 20, '#15100c', { block: false, shadow: false }); this.box(236, 38, 14, 3, 20, '#15100c', { block: false, shadow: false }); this.guard(236, 58, { w: null, a: 0, s: 0, h: null, m: 2 }, null, '#3a2a1a', Math.PI / 2); }
        if (bd.c) { const cx = FW - 32, cy = 30; this.box(cx - 22, cy - 22, 44, 44, 50, C.wall, { top: this.shade(C.wall, .9) }); this.roof(cx - 24, cy - 24, 48, 48, 36, 50, this.hx(C.roof)); this.box(cx - 1.5, cy - 1.5, 3, 3, 16, '#ffd24a', { z: 86, block: false, shadow: false }); this.box(cx - 5, cy - 1, 10, 2.5, 2.5, '#ffd24a', { z: 96, block: false, shadow: false }); this.box(cx - 8, cy + 21, 16, 3, 28, '#15100c', { block: false, shadow: false }); this.chapel = [cx, cy]; }
        if (bd.t) for (let k = 0; k < 2; k++) { const bx = 40 + k * 55 + 40, by = 14; this.box(bx, by, 40, 14, 12, '#8a6a3a'); for (const px of [bx - 2, bx + 38]) this.box(px, by - 2, 4, 4, 50, '#5a3a1a', { block: false }); this.box(bx - 6, by - 4, 52, 22, 4, this.hx(k ? 0x3a6a2a : 0xa02a1a), { z: 50, block: false }); }
        this.detailYard(th, C, R);
        this.spawnYard(t, th);
        this.spot(gu, 0, 80, 90, 'Sieň hradu', () => enterCastle(this.ti, 'hall'), [gu, 40], 50);
        this.spot(0, tu, 50, 70, 'Krčma', () => enterTavern(this.ti), [34, tu], 50);
        this.spot(wx, wy, 50, 60, 'Studňa', () => castleWell(this.ti), [wx, wy + 30], 24);
        if (bd.c) this.spot(this.chapel[0], this.chapel[1], 60, 90, 'Chrám', () => castleTemple(this.ti), [this.chapel[0] - 10, this.chapel[1] + 40], 60);
        this.spot(dx, dy, 34, 50, 'Cvičisko', () => castleTraining(this.ti), [dx, dy + 24], 46);
        this.sun3(0xfff0d8, 1.2, .5, .35);
        this.setupRoom3({ mode: 'castle', title: t.n + ' – nádvorie', leave: 'Opustiť hrad', spawn: [FW / 2, FD - 24], amb: th === 'lorien' ? 'elf' : th === 'mordor' || th === 'isengard' || th === 'bandit' ? 'yardEvil' : 'yard', floorSnd: th === 'rohan' || th === 'bandit' ? 'wood' : th === 'lorien' ? 'grass' : th === 'harad' ? 'sand' : 'stone' });
    }
    /** Drobnosti podľa témy: kvety, lebky, klietky, sochy. */
    detailYard(th, C, R) {
        const FW = this.FW, FD = this.FD;
        if (th === 'gondor') { this.box(FW - 38, FD - 128, 16, 16, 10, '#e8e8ec'); this.cyl(FW - 30, FD - 120, 5, 36, '#e8e8ec', { z: 10, block: false }); const s = new THREE.Mesh(new THREE.SphereGeometry(6, 10, 8), this.mat('#e8e8ec')); s.position.set(FW - 30, 54, FD - 120); this.add3(s); }
        if (th === 'mordor' || th === 'isengard') {
            this.box(FW - 52, FD - 142, 24, 24, 4, '#3a3a40', { block: true }); for (const [kx, ky] of [[0, 0], [22, 0], [0, 22], [22, 22]]) this.box(FW - 52 + kx, FD - 142 + ky, 2, 2, 40, '#3a3a40', { block: false });
            for (let k = 0; k < 3; k++) { this.box(120 + k * 30 - 1.5, 20, 3, 3, 40, '#3a3a40', { block: false }); const sk = new THREE.Mesh(new THREE.SphereGeometry(5, 10, 8), this.mat('#e8e4d8')); sk.position.set(120 + k * 30, 45, 21); this.add3(sk); }
        }
        if (th === 'rohan' || th === 'lorien' || th === 'gondor') for (let k = 0; k < 5; k++) { const x = 30 + k * 14, y = FD - 30 - (k % 2) * 10; this.cyl(x, y, .7, 7, '#4a7a3a', { block: false }); const f = new THREE.Mesh(new THREE.SphereGeometry(3, 8, 6), this.mat(['#e84a4a', '#f0d040', '#ffffff', '#d080e0', '#f0a040'][k])); f.position.set(x, 8, y); this.world.add(f); }
        if (th === 'lorien') for (let k = 0; k < 3; k++) { const x = 60 + k * 110; this.cyl(x, 70, 6, 90, '#6a5a40', { block: true }); for (const [ox, oy, s] of [[0, 0, 34], [-10, 6, 24], [10, -4, 26]]) { const c = new THREE.Mesh(new THREE.SphereGeometry(s * .8, 12, 9), this.mat('#d8c870', { e: '#3a3418' })); c.position.set(x + ox, 100 + oy, 70); this.add3(c); } }
    }
    spawnYard(t, th) {
        const f = t.f === 6 ? (heroSide() === 1 ? 2 : 0) : t.f, race = Portraits.forLord({ nm: 'x', f }).race, evil = race === 'orc' || race === 'uruk';
        const L = (name) => { const l = Portraits.forLord({ nm: name + t.n, f }); delete l.crown; delete l.helm; return l; };
        const smithL = L('kovac'), mercL = L('kupec'), capL = L('velitel');
        this.looks = { smith: smithL, merc: mercL, cap: capL };
        const plain = { w: null, a: evil ? 11 : 0, s: 0, h: null, m: 0 };
        this.person(this.forge[0] + 40, this.forge[1] + 30, { eq: plain, look: smithL, cape: '#3a2a1a' }, evil ? 'Orkský kováč' : 'Kováč', () => castleSmith(this.ti), 1);
        this.person(this.FW - 85, this.FD - 44, { eq: plain, look: mercL, cape: '#5a3a2a' }, evil ? 'Kupec z východu' : 'Kupec', () => castleMerchant(this.ti), 1);
        const [ceq, co] = Figures.lordEq({ f, id: this.ti, nm: 'velitel' });
        this.person(this.FW / 2 + 50, 64, { eq: { ...ceq, m: 0 }, look: capL, cape: co.cape }, 'Veliteľ posádky', () => castleCaptain(this.ti), 1);
        for (const gx of [this.FW / 2 - 60, this.FW / 2 + 40]) this.guard(gx, 24, { ...ceq, m: 0 }, L('straz' + gx), co.cape, Math.PI / 2);
    }

    /* ---------- sieň ---------- */
    buildHall(t, th, C, R) {
        this.setRoom3(320, 200, 120, { bg: '#1a1412', sky: C.light, ground: 0x3a2e28, hemi: th === 'mordor' ? .9 : 1.25 });
        const FW = this.FW, FD = this.FD, WH = this.WH, hallKind = th === 'rohan' || th === 'bandit' ? 'planksV' : th === 'lorien' ? 'bark' : th === 'mordor' ? 'dark' : 'bricks';
        const trim = this.hx(C.trim), carpet = this.hx(C.carpet);
        this.floor(th === 'rohan' || th === 'bandit' ? 'planks' : 'flags', C.floor, this.ti + 6);
        this.walls(hallKind, C.hall, this.ti + 5);
        this.ceiling(this.shade(C.hall, .55), this.hx(this.shade(C.wood, .9)));
        // koberec od vchodu k trónu, pódium
        const dx = FW / 2;
        this.flat(dx - 26, 0, 52, FD, .3, carpet); this.flat(dx - 26, 0, 4, FD, .4, this.hx(this.shade(carpet, 1.5))); this.flat(dx + 22, 0, 4, FD, .4, this.hx(this.shade(carpet, 1.5)));
        for (let v = 20; v < FD; v += 40) this.flat(dx - 20, v, 40, 2, .5, trim);
        this.box(dx - 60, 4, 120, 56, 10, C.hall, { top: this.shade(C.hall, .85), block: false });
        this.box(dx - 22, 4, 44, 4, 3, trim, { z: 10, block: false });
        // trón
        this.box(dx - 16, 14, 32, 22, 18, C.wood, { z: 10 }); this.box(dx - 18, 8, 36, 6, 44, C.wood, { z: 10, block: false }); this.box(dx - 20, 8, 40, 7, 5, trim, { z: 54, block: false }); this.box(dx - 12, 14, 24, 2, 30, carpet, { z: 14, block: false, shadow: false });
        this.blocks.push([dx - 60, 0, 120, 60]);
        // okná v ľavej stene so svetlom, zástavy na zadnej a ľavej stene, stĺpy
        for (const u of [40, 100, 160]) this.windowAt(1, u + 12, 83, 24, 46, Math.PI / 2, trim);
        try { const bm = this.keyMat(Art.banner(this, t.f)); for (let k = 0; k < 4; k++) this.quad(48 + k * 80, 1.2, 88, 22, 40, 0, bm); for (let k = 0; k < 2; k++) this.quad(1.2, 78 + k * 80, 88, 22, 40, Math.PI / 2, bm); } catch (e) { }
        this.braz = [];
        for (const [cx, cy] of [[60, 60], [60, 160], [FW - 60, 60], [FW - 60, 160]]) { this.column(cx, cy, 11, WH + 10, this.shade(C.hall, .9)); const bx = cx + 24, by = cy + 14; this.cyl(bx, by, 8, 16, '#3a3a40'); this.flame(bx, by, 17, th === 'mordor' ? 0xff3a10 : 0xff7a20, 0xffd060, 1.1, 1.8); }
        // dlhé stoly so sviečkami
        for (const [tx, ty] of [[70, 110], [FW - 130, 110]]) { this.box(tx, ty, 60, 20, 18, C.wood); for (let k = 0; k < 3; k++) { this.cyl(tx + 10 + k * 20, ty + 10, 1.2, 8, '#f0e0c0', { z: 18, block: false }); this.flame(tx + 10 + k * 20, ty + 10, 26, 0xffb040, 0xfff0b0, .2, 0); } for (const ox of [-10, 70]) this.box(tx + ox, ty + 4, 8, 12, 10, this.shade(C.wood, .8)); this.glow3(tx + 30, ty + 10, 40, 0xffe0a0, .5, 90); }
        this.glow3(dx, 30, 60, 0xffe0a0, .7, 170);
        this.decorHall(th, C, R);
        this.spawnHall(t, th);
        this.sun3(C.light, .5, -.3, .5);
        this.setupRoom3({ mode: 'castle', title: t.n + ' – sieň', leave: 'Späť na nádvorie', spawn: [FW / 2, FD - 30], amb: th === 'lorien' ? 'elf' : 'hall', floorSnd: th === 'rohan' || th === 'bandit' ? 'wood' : 'stone' });
    }
    decorHall(th, C, R) {
        const FW = this.FW, FD = this.FD, g = '#d9a441';
        if (th === 'rohan') for (let u = 20; u < FW; u += 60) this.box(u, 1, 30, 2, 5, g, { z: 100, block: false, shadow: false });
        if (th === 'mordor') { const e = new THREE.Mesh(new THREE.SphereGeometry(18, 14, 10), new THREE.MeshBasicMaterial({ color: 0xff5a10 })); e.scale.set(1.7, 1, .12); e.position.set(FW / 2, 90, 2); this.world.add(e); const p = new THREE.Mesh(new THREE.BoxGeometry(6, 28, 2), new THREE.MeshBasicMaterial({ color: 0x100404 })); p.position.set(FW / 2, 90, 3.5); this.world.add(p); }
        if (th === 'gondor') { this.box(FW / 2 - 2, 1, 4, 3, 44, '#f0f0f0', { z: 70, block: false, shadow: false }); for (let k = 0; k < 3; k++) this.box(FW / 2 - 14 + k * 3, 1, 28 - k * 6, 3, 3, '#f0f0f0', { z: 95 - k * 10, block: false, shadow: false }); }
        if (th === 'erebor') { for (let k = 0; k < 7; k++) this.box(30 + k * 40, 1, 12, 3, 14, g, { z: 96, block: false, shadow: false }); this.box(FW / 2 - 6, 1, 12, 3, 12, '#4a8ad0', { z: 120 - 50, block: false, shadow: false }); }
        if (th === 'lorien') for (let u = 20; u < FD; u += 50) this.box(.5, u, 2, 2, 118, '#c8d8b0', { block: false, shadow: false });
    }
    spawnHall(t, th) {
        const f = t.f === 6 ? (heroSide() === 1 ? 2 : 0) : t.f;
        const lord = E.find(e => e.f === t.f && !hos(e.f, G.fac) && Math.hypot(e.x - t.x, e.y - t.y) < 15 * K);
        this.lord = lord;
        const dx = this.FW / 2, evil = Portraits.forLord({ nm: 'x', f }).race === 'orc';
        if (lord) {
            const [eq, o] = Figures.lordEq(lord);
            this.person(dx, 62, { eq: { ...eq, m: 0 }, look: Portraits.forLord(lord), cape: o.cape }, lord.nm + (lord.kr ? ' (panovník)' : ' (pán hradu)'), () => castleLord(this.ti, lord), 1.05, Math.PI / 2);
        }
        const stL = Portraits.forLord({ nm: 'spravca' + t.n, f }); delete stL.crown; delete stL.helm; stL.age = .7; this.stewardLook = stL;
        this.person(dx + (lord ? 70 : 0), lord ? 90 : 66, { eq: { w: null, a: evil ? 11 : 0, s: 0, h: null, m: 0 }, look: stL, cape: '#4a3a2a' }, 'Správca hradu', () => castleSteward(this.ti), 1, Math.PI / 2);
        const [geq, go] = Figures.lordEq({ f, id: this.ti + 3, nm: 'straz' });
        for (const gx of [dx - 80, dx + 80]) this.guard(gx, 40, { ...geq, m: 0 }, Portraits.forLord({ nm: 'straz' + gx, f }), go.cape, Math.PI / 2);
    }

    leave() {
        if (mode !== 'castle') return;
        if (this.roomKind === 'hall') { this.scene.stop(); enterCastle(this.ti, 'yard'); return; }
        leaveCastle();
    }

    update(time, delta) {
        const dt = Math.min(3, (delta || 16.7) / 16.67);
        if (mode !== 'castle') { if (mode !== 'town' && mode !== 'tavern') this.closeRoom(); return; }
        this.step3(dt);
    }
}
