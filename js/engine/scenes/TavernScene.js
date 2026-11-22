/*
 * ENGINE: krčma v 3D (základ Room3Scene). init({ i }): i = hrad. mode = 'tavern'.
 * Téma podľa hradu (ľudia, hobiti, elfovia, trpaslíci, brloh zla, juh): textúry stien a podlahy, krb v ľavej stene,
 * výčap pri pravej stene s policami fliaš, okná s dennou dobou, zástava frakcie, stoly s lavicami a sviečkami, sudy, dvere.
 * Rozloženie (polohy v podlahových jednotkách) je rovnaké ako v pôvodnej izometrickej krčme.
 * Postavy: krčmár za výčapom, spoločníci pri stoloch (js/ui/tavern.js). Hudba krčmy je v js/audio/sound.js.
 */
class TavernScene extends Room3Scene {
    constructor() { super('Tavern'); }
    init(d) { this.ti = d.i; }

    theme() {
        const t = TW[this.ti], evil = heroSide() === 1;
        if (evil) return t.f === 4 ? 'harad' : 'evil';
        if (t.f === 8 || /Rivendell|Lórien|Lindon|prístavy|Lesné/.test(t.n)) return 'elf';
        if (t.f === 5) return 'dwarf';
        if (/Hobitov|Bree/.test(t.n)) return 'hobbit';
        return 'human';
    }

    create() {
        this.cameras.main.setZoom(RES).setOrigin(0, 0);
        const t = TW[this.ti], th = this.theme(), seed = this.ti * 7 + 3, R = n => { const x = Math.sin((seed + n) * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
        this.th = th; this.R = R;
        const C = {   // jasná paleta ako v sieni a na nádvorí hradu: čisté plochy, výrazný lem (trim), mäkké svetlo
            human: { wall: '#b49468', floor: '#94724a', beam: 0x5a3a1c, light: 0xffd090, bar: '#6e4a28', table: '#8e6638' },
            hobbit: { wall: '#c4a470', floor: '#a08050', beam: 0x6a4824, light: 0xffd898, bar: '#7a5230', table: '#9a6e3c' },
            elf: { wall: '#a8b8a4', floor: '#8a9a84', beam: 0xd8d0a0, light: 0xdff0ff, bar: '#8a9a80', table: '#b4ac8c' },
            dwarf: { wall: '#80808a', floor: '#625e60', beam: 0xd9a441, light: 0xffb868, bar: '#7a6e68', table: '#8e7c70' },
            evil: { wall: '#4e4244', floor: '#3c3436', beam: 0x6a2a1a, light: 0xff7a40, bar: '#4a3a34', table: '#54423a' },
            harad: { wall: '#cca472', floor: '#bc9c6c', beam: 0xd9a441, light: 0xffd080, bar: '#8a5a30', table: '#a8703c' }
        }[th];
        this.C = C;
        this.setRoom3(320, 230, 120, { bg: '#120e0c', sky: th === 'evil' ? 0xffb090 : 0xfff0d8, ground: th === 'evil' ? 0x3a2220 : 0x6a5236, hemi: th === 'evil' ? 1.2 : 1.45 });
        const wallKind = th === 'dwarf' ? 'bricks' : th === 'evil' ? 'dark' : th === 'elf' ? 'bark' : 'planksV', floorKind = th === 'dwarf' || th === 'evil' || th === 'elf' ? 'flags' : 'planks';
        const FW = this.FW, FD = this.FD, WH = this.WH, beam = '#' + C.beam.toString(16).padStart(6, '0'), evil = th === 'evil';
        this.floor(floorKind, C.floor, this.ti + 2);
        this.walls(wallKind, C.wall, this.ti + 1);
        this.ceiling(this.shade(C.wall, .62), beam);
        // zvislé trámy pri stenách
        for (let u = 40; u < FD; u += 70) this.box(0, u, 3, 8, WH, beam, { block: false, shadow: false });
        for (let u = 40; u < FW; u += 70) this.box(u, 0, 8, 3, WH, beam, { block: false, shadow: false });
        // krb v ľavej stene: kamenné ostenie, tmavý otvor, plameň a žiara
        const fu = FD - 110, stone = evil ? '#241c1c' : '#7a766e';
        this.box(0, fu - 44, 18, 88, 92, stone, { top: this.shade(stone, 1.1) });
        this.quad(18.1, fu, 28, 56, 50, Math.PI / 2, this.mat('#0a0806', { r: 1 }));
        this.box(0, fu - 50, 22, 100, 8, evil ? '#3a2a24' : '#9a9690', { z: 90, block: false });
        this.fire = [18, fu];
        this.flame(14, fu, 4, evil ? 0xff3a10 : 0xff7a20, evil ? 0xff8a40 : 0xffd060, 1.4, 2.6);
        // výčap pri pravej stene, police s fľašami, sudy
        const bx = FW - 150, by = 26;
        this.box(bx, by, 120, 26, 30, C.bar, { top: this.shade(C.bar, 1.35) });
        for (const v of [60, 84]) { this.box(bx - 10, 1, 140, 8, 3, '#3a2a1a', { z: v, block: false }); for (let k = 0; k < 9; k++) this.cyl(bx - 4 + k * 15 + 3, 5, 3, 14, ['#3a6a2a', '#a02a1a', '#2a4a8a', '#d8c060', '#6a2a6a', '#c8c0b0', '#2a6a6a', '#8a4a2a', '#4a7a3a'][(k + v) % 9], { z: v + 3, block: false, taper: .75 }); }
        this.cyl(bx - 24, 16, 11, 24, '#5a3a1e', { hoops: 1 }); this.cyl(bx - 24, 40, 11, 24, '#5a3a1e', { hoops: 1 }); this.cyl(bx + 100, by + 40, 10, 20, '#5a3a1e', { hoops: 1 });
        this.barX = bx; this.barY = by;
        for (let k = 0; k < 3; k++) this.cyl(22, 30 + k * 28, 11, 26, '#5a3a1e', { hoops: 1 });
        this.glow3(bx + 60, by + 10, 50, 0xffe0a0, .9, 140);
        // okná na pravej stene (obloha sa mení podľa dennej doby)
        for (const u of [60, bx - 70]) this.windowAt(u + 17, .6, 56 + 15, 34, 30, 0, beam);
        this.sun3(0xfff0d0, 1.0, -.15, .55);
        // zástava frakcie na ľavej stene
        try { this.quad(.8, 50, 68, 28, 46, Math.PI / 2, this.keyMat(Art.banner(this, t.f))); } catch (e) { }
        // dlhé stoly s lavicami a sviečkami (ako v sieni hradu); this.tables = stredy stolov
        const spots = [[50, 92], [160, 124], [44, 164]].slice(0, 2 + Math.floor(R(1) * 2));
        this.tables = spots.map(([x, y]) => [x + 45, y + 13]);
        spots.forEach(([x, y], n) => {
            this.box(x, y, 90, 26, 17, C.table, { top: this.shade(C.table, 1.2) });
            this.box(x + 4, y - 12, 82, 9, 9, this.shade(C.table, .78)); this.box(x + 4, y + 29, 82, 9, 9, this.shade(C.table, .78));
            for (let k = 0; k < 3; k++) { this.cyl(x + 16 + k * 29, y + 13, 1.4, 8, '#f0e0c0', { z: 17, block: false }); this.flame(x + 16 + k * 29, y + 13, 25, 0xffb040, 0xfff0b0, .22, 0); }
            this.glow3(x + 45, y + 13, 42, 0xffe0a0, .55, 90);
        });
        this.decor(th);
        // dvere na prednej stene pri mieste vstupu
        const dx = FW - 60;
        this.box(dx - 20, FD - 5, 40, 5, 76, this.shade(C.beam, 1.0), { block: false });
        this.box(dx - 17, FD - 7, 34, 3, 70, '#4a2e18', { block: false, top: '#4a2e18' });
        this.cyl(dx + 11, FD - 9, 1.6, 2, '#c8a040', { z: 36, block: false });
        this.spawn(t, th);
        this.spot(dx, FD - 8, 40, 76, 'Dvere', () => this.leave(), [dx, FD - 34], 46);
        this.setupRoom3({ mode: 'tavern', title: (th === 'evil' ? 'Brloh v ' : th === 'elf' ? 'Sieň v ' : 'Krčma v ') + t.n, leave: 'Odísť z krčmy', spawn: [FW - 60, FD - 60], amb: th === 'evil' ? 'tavernEvil' : th === 'elf' ? 'elf' : 'tavern', floorSnd: floorKind === 'planks' ? 'wood' : 'stone' });
    }

    /** Tematická výzdoba stien. */
    decor(th) {
        const FD = this.FD, FW = this.FW;
        if (th === 'evil') for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(new THREE.SphereGeometry(6, 10, 8), this.mat('#e8e4d8')); m.position.set(7, 70, 30 + k * 40); this.add3(m); const j = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 7), this.mat('#d8d4c8')); j.position.set(8, 63, 30 + k * 40); this.add3(j); for (const z of [-2, 2]) { const e = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), this.mat('#1a1210')); e.position.set(12, 71, 30 + k * 40 + z); this.world.add(e); } }
        if (th === 'elf') for (let u = 20; u < FW; u += 60) { this.box(u, 1, 2, 2, 118, '#7ab07a', { block: false, shadow: false }); const l = new THREE.Mesh(new THREE.SphereGeometry(4, 8, 6), this.mat('#8ac88a')); l.position.set(u + 1, 60 + (u % 3) * 10, 3); this.world.add(l); }
        if (th === 'dwarf') { this.box(20, 1, 110, 4, 3, '#8a8a90', { z: 92, block: false }); for (let k = 0; k < 4; k++) this.cyl(35 + k * 24, 5, 5, 12, ['#3a8ae0', '#d8402a', '#7ab84a', '#e8b84a'][k], { z: 95, block: false }); }
        if (th === 'hobbit') for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(new THREE.SphereGeometry(11, 14, 8), this.mat('#c8a060')); m.scale.set(.25, .6, 1); m.position.set(3, 70 + (k % 2) * 14, FD - 40 - k * 26); this.world.add(m); }
        if (th === 'harad') for (let k = 0; k < 7; k++) { const m = new THREE.Mesh(new THREE.ConeGeometry(9, 18, 3), this.mat('#d9a441', { r: .5, m: .5 })); m.position.set(69 + k * 30, 100, 2); this.world.add(m); }
    }

    /** Postavy: krčmár za výčapom, spoločníci pri stoloch. */
    spawn(t, th) {
        const keeperEq = { evil: { w: null, a: 11, s: 0, h: 5, m: 0 }, harad: { w: null, a: 8, s: 0, h: 7, m: 0 }, elf: { w: null, a: 3, s: 0, h: null, m: 0 },
            dwarf: { w: null, a: 4, s: 0, h: null, m: 0 }, hobbit: { w: null, a: 0, s: 0, h: null, m: 0 }, human: { w: null, a: 0, s: 0, h: null, m: 0 } }[th];
        const kn = { evil: 'Shagrat, správca brlohu', harad: 'Hostinský z juhu', elf: 'Hostiteľ siene', dwarf: 'Krčmár Bofur', hobbit: 'Hostinský Jačmienko', human: 'Krčmár' }[th];
        this.person(this.barX + 60, this.barY - 8, { eq: keeperEq, look: KEEPER_LOOK[th] || KEEPER_LOOK.human, cape: '#4a3a2a' }, kn, () => tavKeeper(this.ti), .85, Math.PI / 2);
        const list = compsAt(t);
        list.forEach((c, k) => {
            const tb = this.tables[k % this.tables.length], side = k % 2 ? 1 : -1, ce = Figures.compEq(c, true);
            this.person(tb[0] + (Math.floor(k / 2) % 2 ? 22 : -22), tb[1] + side * 33, { eq: ce[0], look: c.look, cape: ce[1].cape }, c.n, () => tavTalk(this.ti, c), .95, side > 0 ? -Math.PI / 2 : Math.PI / 2);
        });
        this.comps = list;
    }
    refresh() { this.clearPeople(); this.spawn(TW[this.ti], this.th); }

    leave() {
        if (mode !== 'tavern') return;
        if (ROOM && ROOM.from === 'yard') { this.scene.stop(); enterCastle(this.ti, 'yard'); return; }
        ROOM = null;
        mode = 'town';
        this.closeRoom();
        town(this.ti);
    }

    update(time, delta) {
        const dt = Math.min(3, (delta || 16.7) / 16.67);
        if (mode !== 'tavern') { if (mode !== 'town' && mode !== 'castle') this.closeRoom(); return; }
        this.step3(dt);
    }
}
