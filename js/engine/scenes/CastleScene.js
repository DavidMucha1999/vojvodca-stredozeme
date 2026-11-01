/*
 * ENGINE: nádvorie a sieň hradu v izometrii (základ IsoRoom). init({ i, room }): i = hrad, room = 'yard' | 'hall'. mode = 'castle'.
 * Vzhľad podľa frakcie (biely kameň Gondoru, drevo Rohanu, čierne železo Mordoru, Sarumanov kameň, pieskovec Haradu, tesaný kameň
 * Ereboru, červený kameň Rhûnu, mallorny Lothlórienu, palisáda banditov) a podľa čísla hradu (poloha studne, debien, cvičiska).
 * Nádvorie: hradby s cimburím a vežou, brána do siene, dvere do krčmy, vyhňa s nákovou, stánok kupca, studňa, cvičný panák,
 * postavené budovy (stajňa, chrám, trhovisko). Sieň: stĺpy, trón na pódiu, koberec, stoly, koše s ohňom, zástavy, okná.
 * Postavy a rozhovory: js/ui/castle.js (kováč, kupec, veliteľ, správca, pán hradu).
 */
const BFhex = f => Phaser.Display.Color.HexStringToColor(BF[f] || '#4a3a2a').color;
class CastleScene extends IsoRoom {
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
            mordor: { wall: '#2a2628', trim: 0x5a2a1a, ground: '#2e2a2a', roof: 0x141214, light: 0xff6a30, hall: '#1e1a1c', floor: '#262224', carpet: 0x5a1010, wood: '#2a1a14' },
            isengard: { wall: '#3a3a40', trim: 0x8a8a90, ground: '#3e3a38', roof: 0x1a1a1e, light: 0xfff0d0, hall: '#2e2e34', floor: '#343438', carpet: 0x1a1a1a, wood: '#3a2a1a' },
            harad: { wall: '#c8a06a', trim: 0xd9a441, ground: '#c8b080', roof: 0x8a2a1a, light: 0xffd080, hall: '#b89060', floor: '#a89068', carpet: 0xa02a1a, wood: '#6a4a2a' },
            erebor: { wall: '#6a6a72', trim: 0xd9a441, ground: '#5a5a60', roof: 0x3a3a42, light: 0xffb060, hall: '#4a4a52', floor: '#44444c', carpet: 0x3a4a7a, wood: '#4a3a2a' },
            rhun: { wall: '#8a3a30', trim: 0xd9a441, ground: '#9a7a58', roof: 0x5a1f4a, light: 0xffd080, hall: '#6a2a22', floor: '#7a5a40', carpet: 0x5a1f4a, wood: '#5a3a1a' },
            lorien: { wall: '#9aa890', trim: 0xd8d0a0, ground: '#5a7a4a', roof: 0x3a5a3a, light: 0xc8e8ff, hall: '#7a8a70', floor: '#6a7a5a', carpet: 0x9ab07a, wood: '#6a5a40' },
            bandit: { wall: '#6a4a2a', trim: 0x3a2a1a, ground: '#5a4a30', roof: 0x3a2a1a, light: 0xffb060, hall: '#5a3a1a', floor: '#4a3a20', carpet: 0x4a3a2a, wood: '#4a3018' }
        }[th];
    }

    create() {
        this.cameras.main.setZoom(RES).setOrigin(0, 0);
        const t = TW[this.ti], th = this.theme(), C = this.palette(th), seed = this.ti * 11 + 5, R = n => { const x = Math.sin((seed + n) * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
        this.th = th; this.C = C; this.R = R; this.t = t;
        this.sky = this.add.graphics().setDepth(-1);
        this.fx = this.add.graphics().setDepth(1700);
        this.torches = []; this.braziers = []; this.candles = []; this.forge = null; this.chapel = this.well = null; this.windows = [];
        if (this.roomKind === 'hall') this.buildHall(t, th, C, R); else this.buildYard(t, th, C, R);
        this.commitBg();
    }
    wallKind(th) { return th === 'lorien' ? 'bark' : th === 'rohan' || th === 'bandit' ? 'planksV' : th === 'mordor' ? 'dark' : 'bricks'; }

    /* ---------- nádvorie ---------- */
    buildYard(t, th, C, R) {
        const bd = t.bd || {};
        this.setIso(340, 220, 100, undefined, 184);
        const FW = this.FW, FD = this.FD, WH = this.WH;
        const groundKind = th === 'rohan' || th === 'bandit' ? 'planks' : th === 'lorien' ? 'grass' : th === 'harad' ? 'sand' : th === 'gondor' ? 'flags' : 'cobbles';
        this.floor(groundKind, C.ground, this.ti + 4);
        this.wallL(this.wallKind(th), C.wall, this.ti + 3); this.wallR(this.wallKind(th), C.wall, this.ti + 3);
        const trim = '#' + C.trim.toString(16).padStart(6, '0');
        // cimburie na oboch hradbách a ochodza
        const merl = (c, len) => { c.fillStyle = C.wall; for (let u = 6; u < len; u += 24) c.fillRect(u, WH, 12, 12); c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(0, WH - 4, len, 4); };
        this.onWallL(c => merl(c, FD)); this.onWallR(c => merl(c, FW));
        // brána do siene v pravej stene, dvere do krčmy v ľavej stene
        const gu = FW / 2 - 10, tu = FD - 70;
        this.onWallR(c => { c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(gu - 36, 0, 72, 70); c.fillStyle = '#15100c'; c.beginPath(); c.moveTo(gu - 26, 0); c.lineTo(gu - 26, 44); c.arc(gu, 44, 26, Math.PI, 0); c.lineTo(gu + 26, 0); c.fill(); c.fillStyle = '#5a3a1a'; c.beginPath(); c.moveTo(gu - 20, 0); c.lineTo(gu - 20, 42); c.arc(gu, 42, 20, Math.PI, 0); c.lineTo(gu + 20, 0); c.fill(); c.fillStyle = '#2a1a10'; for (let v = 8; v < 60; v += 14) c.fillRect(gu - 20, v, 40, 2); c.fillStyle = '#d9a441'; c.fillRect(gu - 2, 20, 4, 12); });
        this.onWallL(c => { c.fillStyle = '#15100c'; c.beginPath(); c.moveTo(tu - 14, 0); c.lineTo(tu - 14, 34); c.arc(tu, 34, 14, Math.PI, 0); c.lineTo(tu + 14, 0); c.fill(); c.fillStyle = '#6a4a2a'; c.beginPath(); c.moveTo(tu - 10, 0); c.lineTo(tu - 10, 32); c.arc(tu, 32, 10, Math.PI, 0); c.lineTo(tu + 10, 0); c.fill(); c.fillStyle = '#8a6a3a'; c.fillRect(tu - 16, 56, 32, 12); c.fillStyle = '#c8903a'; c.fillRect(tu - 4, 58, 7, 9); c.fillStyle = '#fff4dc'; c.fillRect(tu - 4, 65, 7, 2); });
        // zástavy frakcie pri bráne a fakle na stenách
        this.sprite(FW / 2 - 50, 1, Art.banner(this, t.f), 1.6).setDepth(.6); this.sprite(FW / 2 + 36, 1, Art.banner(this, t.f), 1.6).setDepth(.6);
        for (const u of [60, FW - 60]) { this.onWallR(c => { c.fillStyle = '#3a2a1a'; c.fillRect(u - 2, 52, 4, 24); }); this.torches.push([u, 0, 80]); }
        for (const u of [40, 110]) { this.onWallL(c => { c.fillStyle = '#3a2a1a'; c.fillRect(u - 2, 52, 4, 24); }); this.torches.push([0, u, 80]); }
        // veža v zadnom rohu
        this.prop(0, 0, (g, sx, sy) => { g.fillStyle(this.shade(C.wall, .8), 1).fillRect(sx - 26, sy - WH - 70, 52, WH + 70); g.fillStyle(this.shade(C.wall, 1.05), 1).fillRect(sx - 26, sy - WH - 70, 20, WH + 70); g.fillStyle(this.shade(C.wall, .9), 1); for (let k = 0; k < 5; k++) g.fillRect(sx - 26 + k * 11, sy - WH - 82, 7, 12); g.fillStyle(0x000000, .5).fillRect(sx - 4, sy - WH - 40, 8, 14).fillRect(sx - 4, sy - WH + 10, 8, 14); }, -8);
        // vyhňa (vľavo vpredu): prístrešok, pec, nákova, sud
        const fx = 60, fy = FD - 90;
        this.box(fx, fy, 40, 30, 30, '#4a3a30', { top: this.shade('#4a3a30', .8) });                                   // pec
        this.prop(fx + 20, fy + 15, (g, sx, sy) => { g.fillStyle(0x15100c, 1).fillRect(sx - 10, sy - 30, 20, 16); }, 1);
        this.forge = [fx + 20, fy + 14, 18];
        this.box(fx + 56, fy + 4, 22, 12, 14, '#3a3a40'); this.prop(fx + 67, fy + 10, (g, sx, sy) => { g.fillStyle(0x8a8a90, 1).fillRect(sx - 14, sy - 16, 28, 5); }, 1);   // nákova
        this.cyl(fx - 18, fy + 22, 9, 18, '#5a3a1e', { hoops: 1 });
        this.prop(fx + 40, fy - 20, (g, sx, sy) => { g.fillStyle(0x3a2a1a, 1); for (const [px, py] of [[-48, 0], [38, 0], [-48, 30], [38, 30]]) g.fillRect(sx + px, sy + py - 70, 5, 70); g.fillStyle(0x5a4a3a, 1).fillRect(sx - 56, sy - 78, 100, 10); g.fillStyle(0x4a3a2a, 1).fillRect(sx - 56, sy - 70, 100, 3); }, -3);   // prístrešok
        // stánok kupca (vpravo vpredu)
        const mx = FW - 120, my = FD - 70, rc = [0x4a6a9a, 0x3a6a2a, 0x5a1010, 0x2a2a2a, 0xa02a1a, 0x3a4a7a, 0x6a2a2a, 0x5a1f4a, 0x9ab07a, 0x4a3a2a][t.f] || 0x8a2a1a;
        this.box(mx, my, 70, 20, 16, '#8a6a3a');
        this.prop(mx + 35, my + 10, (g, sx, sy) => { for (let k = 0; k < 4; k++) g.fillStyle([0xc8a040, 0x7a3a2a, 0x4a7a3a, 0xd8d0c0][k], 1).fillRect(sx - 30 + k * 16, sy - 30, 12, 8); }, 1);
        this.prop(mx + 35, my + 10, (g, sx, sy) => { g.fillStyle(0x5a3a1a, 1).fillRect(sx - 44, sy - 66, 4, 56).fillRect(sx + 40, sy - 66, 4, 56); g.fillStyle(rc, 1); for (let k = 0; k < 6; k++) g.fillRect(sx - 48 + k * 16, sy - 76, 16, 12 + (k % 2) * 5); }, 2);
        for (let k = 0; k < 2 + Math.floor(R(3) * 3); k++) this.box(mx - 30 - k * 18, my + 8, 14, 14, 12, '#8a6a3a');
        // studňa
        const wx = FW / 2 + 20 + Math.floor(R(1) * 3) * 20, wy = 120 + Math.floor(R(2) * 2) * 30;
        this.cyl(wx, wy, 16, 14, '#8a8a84'); this.prop(wx, wy, (g, sx, sy) => { g.fillStyle(0x15100c, 1).fillEllipse(sx, sy - 14, 22, 11); g.fillStyle(0x3a2a1a, 1).fillRect(sx - 18, sy - 50, 4, 38).fillRect(sx + 14, sy - 50, 4, 38); g.fillStyle(0x5a3a1a, 1).fillTriangle(sx - 26, sy - 48, sx + 26, sy - 48, sx, sy - 66); g.fillStyle(0x8a8a90, 1).fillRect(sx - 4, sy - 30, 8, 7); }, 1);
        this.well = [wx, wy];
        // cvičný panák, debny, seno
        const dx = 150 + Math.floor(R(4) * 2) * 90, dy = FD - 50;
        this.prop(dx, dy, (g, sx, sy) => { g.fillStyle(0x000000, .25).fillEllipse(sx, sy + 2, 20, 9); g.fillStyle(0x5a3a1a, 1).fillRect(sx - 2, sy - 40, 4, 40).fillRect(sx - 14, sy - 32, 28, 3); g.fillStyle(0xc8a870, 1).fillRect(sx - 7, sy - 36, 14, 18); g.fillStyle(0xe8c39e, 1).fillCircle(sx, sy - 42, 5); });
        this.blocks.push([dx - 8, dy - 8, 16, 16]);
        for (let k = 0; k < 3; k++) this.box(FW - 40 - (k % 2) * 20, 70 + k * 18, 16, 16, 14, '#8a6a3a');
        if (th !== 'mordor' && th !== 'isengard') this.prop(30, 85, (g, sx, sy) => { g.fillStyle(0xc8a040, 1).fillEllipse(sx, sy - 6, 40, 20); g.fillStyle(0xb08830, 1).fillEllipse(sx + 6, sy - 10, 24, 12); });
        // budovy podľa správy hradu: stajňa, chrám, trhovisko
        if (bd.j) { this.box(190, 6, 64, 34, 34, C.wood, { top: this.shade(C.wood, .7) }); this.prop(222, 23, (g, sx, sy) => { g.fillStyle(0x15100c, 1).fillRect(sx - 30, sy - 26, 14, 20).fillRect(sx + 8, sy - 26, 14, 20); }, 1); this.sprite(236, 52, Art.figure(this, { w: null, a: 0, s: 0, h: null, m: 2 }, { cape: '#3a2a1a' }), 1.3); }
        if (bd.c) { const cx = FW - 32, cy = 30; this.box(cx - 22, cy - 22, 44, 44, 50, C.wall, { top: this.shade(C.wall, .9) }); this.prop(cx, cy, (g, sx, sy) => { g.fillStyle(C.roof, 1).fillTriangle(sx - 46, sy - 50, sx + 46, sy - 50, sx, sy - 84); g.fillStyle(0xffd24a, 1).fillRect(sx - 1.5, sy - 98, 3, 14).fillRect(sx - 5, sy - 94, 10, 2.5); g.fillStyle(0x15100c, 1).fillRect(sx - 8, sy - 28, 16, 28); }, 1); this.chapel = [cx, cy]; }
        if (bd.t) for (let k = 0; k < 2; k++) { const bx = 40 + k * 55, by = 14; this.box(bx, by, 40, 14, 12, '#8a6a3a'); this.prop(bx + 20, by + 7, (g, sx, sy) => { g.fillStyle(0x5a3a1a, 1).fillRect(sx - 22, sy - 50, 4, 40).fillRect(sx + 18, sy - 50, 4, 40); g.fillStyle(k ? 0x3a6a2a : 0xa02a1a, 1).fillRect(sx - 26, sy - 58, 52, 10); }, 1); }
        this.detailYard(th, C, R);
        this.spawnYard(t, th);
        this.setupRoom({ mode: 'castle', title: t.n + ' – nádvorie', leave: 'Opustiť hrad', spawn: [FW / 2, FD - 24], amb: th === 'lorien' ? 'elf' : th === 'mordor' || th === 'isengard' || th === 'bandit' ? 'yardEvil' : 'yard', floorSnd: th === 'rohan' || th === 'bandit' ? 'wood' : th === 'lorien' ? 'grass' : th === 'harad' ? 'sand' : 'stone' });
        this.spot(gu, 0, 80, 90, 'Sieň hradu', () => enterCastle(this.ti, 'hall'), [gu, 40]);
        this.spot(0, tu, 50, 70, 'Krčma', () => enterTavern(this.ti), [34, tu]);
        this.spot(wx, wy, 50, 60, 'Studňa', () => castleWell(this.ti), [wx, wy + 30]);
        if (bd.c) this.spot(this.chapel[0], this.chapel[1], 60, 90, 'Chrám', () => castleTemple(this.ti), [this.chapel[0] - 10, this.chapel[1] + 40]);
        this.spot(dx, dy, 34, 50, 'Cvičisko', () => castleTraining(this.ti), [dx, dy + 24]);
    }
    /** Drobnosti podľa témy: kvety, lebky, klietky, sochy. */
    detailYard(th, C, R) {
        if (th === 'gondor') this.prop(this.FW - 30, this.FD - 120, (g, sx, sy) => { g.fillStyle(0xe8e8ec, 1).fillRect(sx - 8, sy - 10, 16, 10).fillRect(sx - 5, sy - 46, 10, 36); g.fillCircle(sx, sy - 50, 6); g.fillStyle(0xd8d8dc, 1).fillRect(sx - 14, sy - 34, 6, 4).fillRect(sx + 8, sy - 34, 6, 4); });   // socha
        if (th === 'mordor' || th === 'isengard') { this.prop(this.FW - 40, this.FD - 130, (g, sx, sy) => { g.lineStyle(2, 0x3a3a40, 1).strokeRect(sx - 12, sy - 44, 24, 40); for (let k = 1; k < 4; k++) g.lineBetween(sx - 12 + k * 6, sy - 44, sx - 12 + k * 6, sy - 4); g.fillStyle(0xe2bf96, 1).fillCircle(sx, sy - 30, 4); }); this.blocks.push([this.FW - 52, this.FD - 142, 24, 24]); for (let k = 0; k < 3; k++) this.prop(120 + k * 30, 20, (g, sx, sy) => { g.fillStyle(0x3a3a40, 1).fillRect(sx - 1.5, sy - 40, 3, 40); g.fillStyle(0xe8e4d8, 1).fillCircle(sx, sy - 44, 5); g.fillStyle(0x1a1210, 1).fillRect(sx - 3, sy - 45, 1.5, 1.5).fillRect(sx + 1, sy - 45, 1.5, 1.5); }); }
        if (th === 'rohan' || th === 'lorien' || th === 'gondor') for (let k = 0; k < 5; k++) this.prop(30 + k * 14, this.FD - 30 - (k % 2) * 10, (g, sx, sy) => { g.fillStyle([0xe84a4a, 0xf0d040, 0xffffff, 0xd080e0, 0xf0a040][k], 1).fillCircle(sx, sy - 6, 3); g.fillStyle(0x4a7a3a, 1).fillRect(sx - 1, sy - 6, 2, 7); });
        if (th === 'lorien') for (let k = 0; k < 3; k++) this.prop(60 + k * 110, 24, (g, sx, sy) => { g.fillStyle(0x6a5a40, 1).fillRect(sx - 6, sy - 110, 12, 110); g.fillStyle(0xd8c870, .9).fillCircle(sx, sy - 120, 34); g.fillStyle(0xe8dc90, .8).fillCircle(sx - 10, sy - 132, 22); }, -2);
    }
    spawnYard(t, th) {
        const race = Portraits.forLord({ nm: 'x', f: t.f === 6 ? (heroSide() === 1 ? 2 : 0) : t.f }).race, evil = race === 'orc' || race === 'uruk';
        const L = (name) => { const l = Portraits.forLord({ nm: name + t.n, f: t.f === 6 ? (heroSide() === 1 ? 2 : 0) : t.f }); delete l.crown; delete l.helm; return l; };
        const smithL = L('kovac'), mercL = L('kupec'), capL = L('velitel');
        this.looks = { smith: smithL, merc: mercL, cap: capL };
        this.person(this.forge[0] + 40, this.forge[1] + 30, [{ w: null, a: evil ? 11 : 0, s: 0, h: null, m: 0 }, { apron: 1, ...Figures.lookOpts(smithL) }], evil ? 'Orkský kováč' : 'Kováč', () => castleSmith(this.ti), 1);
        this.person(this.FW - 85, this.FD - 44, [{ w: null, a: evil ? 11 : 0, s: 0, h: null, m: 0 }, { ...Figures.lookOpts(mercL) }], evil ? 'Kupec z východu' : 'Kupec', () => castleMerchant(this.ti), 1);
        const [ceq, co] = Figures.lordEq({ f: t.f === 6 ? (heroSide() === 1 ? 2 : 0) : t.f, id: this.ti, nm: 'velitel' });
        this.person(this.FW / 2 + 50, 64, [{ ...ceq, m: 0 }, { ...co, flag: null, king: 0, ...Figures.lookOpts(capL) }], 'Veliteľ posádky', () => castleCaptain(this.ti), 1);
        for (const gx of [this.FW / 2 - 60, this.FW / 2 + 40]) { const k = Art.bigFigure(this, { ...ceq, m: 0 }, { ...co, flag: null, king: 0, ...Figures.lookOpts(L('straz' + gx)) }); this.sprite(gx, 18, k, .8).setFlipX(gx > this.FW / 2); }
    }

    /* ---------- sieň ---------- */
    buildHall(t, th, C, R) {
        this.setIso(320, 200, 120, undefined, 206);
        const FW = this.FW, FD = this.FD, WH = this.WH, hallKind = th === 'rohan' || th === 'bandit' ? 'planksV' : th === 'lorien' ? 'bark' : th === 'mordor' ? 'dark' : 'bricks';
        this.floor(th === 'rohan' || th === 'bandit' ? 'planks' : 'flags', C.floor, this.ti + 6);
        this.wallL(hallKind, C.hall, this.ti + 5); this.wallR(hallKind, C.hall, this.ti + 5);
        const trim = '#' + C.trim.toString(16).padStart(6, '0'), carpet = '#' + C.carpet.toString(16).padStart(6, '0');
        // koberec od vchodu k trónu, pódium
        const dx = FW / 2, dy = 40;
        this.onFloor(c => { c.fillStyle = carpet; c.fillRect(dx - 26, 0, 52, FD); c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(dx - 26, 0, 4, FD); c.fillRect(dx + 22, 0, 4, FD); c.fillStyle = trim; for (let v = 20; v < FD; v += 40) { c.fillRect(dx - 20, v, 40, 2); } });
        this.box(dx - 60, 10, 120, 50, 10, C.hall, { top: this.shade(C.hall, .85), block: false });
        // trón
        this.box(dx - 16, 14, 32, 22, 18, C.wood, { z: 10 }); this.prop(dx, 24, (g, sx, sy) => { g.fillStyle(this.hexc(C.wood), 1).fillRect(sx - 18, sy - 70, 36, 44); g.fillStyle(C.trim, 1).fillRect(sx - 20, sy - 74, 40, 5); g.fillStyle(C.carpet, 1).fillRect(sx - 12, sy - 62, 24, 30); }, 1);
        this.blocks.push([dx - 60, 0, 120, 60]);
        // okná v ľavej stene so svetlom, zástavy na oboch stenách, stĺpy
        this.windows = [40, 100, 160].map(u => ({ u, v: 60, w: 24, h: 46 }));
        this.onWallL(c => { for (const w of this.windows) { c.fillStyle = trim; c.fillRect(w.u - 4, w.v - 4, w.w + 8, w.h + 8); c.clearRect(w.u, w.v, w.w, w.h); } });
        for (let k = 0; k < 4; k++) this.sprite(40 + k * 80, 1, Art.banner(this, t.f), 1.7).setDepth(.6);
        for (let k = 0; k < 2; k++) this.sprite(1, 70 + k * 80, Art.banner(this, t.f), 1.7).setDepth(.6);
        for (const [cx, cy] of [[60, 60], [60, 160], [FW - 60, 60], [FW - 60, 160]]) { this.cyl(cx, cy, 11, WH + 10, this.shade(C.hall, .9)); this.braziers.push([cx + 24, cy + 14]); }
        for (const [bx, by] of this.braziers) { this.cyl(bx, by, 8, 16, '#3a3a40'); }
        // dlhé stoly so sviečkami
        for (const [tx, ty] of [[70, 110], [FW - 130, 110]]) { this.box(tx, ty, 60, 20, 18, C.wood); for (let k = 0; k < 3; k++) { this.candles.push([tx + 10 + k * 20, ty + 10, 18]); this.prop(tx + 10 + k * 20, ty + 10, (g, sx, sy) => { g.fillStyle(0xf0e0c0, 1).fillRect(sx - 1.2, sy - 26, 2.4, 8); g.fillStyle(0xd9b060, 1).fillRect(sx + 6, sy - 22, 5, 6); }, 1); } for (const ox of [-10, 70]) this.box(tx + ox, ty + 4, 8, 12, 10, this.shade(C.wood, .8)); }
        this.decorHall(th, C, R);
        this.spawnHall(t, th);
        this.setupRoom({ mode: 'castle', title: t.n + ' – sieň', leave: 'Späť na nádvorie', spawn: [FW / 2, FD - 30], amb: th === 'lorien' ? 'elf' : 'hall', floorSnd: th === 'rohan' || th === 'bandit' ? 'wood' : 'stone' });
    }
    decorHall(th, C, R) {
        if (th === 'rohan') this.onWallR(c => { c.fillStyle = '#d9a441'; for (let u = 20; u < this.FW; u += 60) { c.beginPath(); c.moveTo(u, 100); c.quadraticCurveTo(u + 15, 118, u + 30, 100); c.quadraticCurveTo(u + 15, 110, u, 100); c.fill(); } });
        if (th === 'mordor') this.onWallR(c => { c.fillStyle = '#ff5a10'; c.beginPath(); c.ellipse(this.FW / 2, 95, 30, 14, 0, 0, 7); c.fill(); c.fillStyle = '#100404'; c.beginPath(); c.ellipse(this.FW / 2, 95, 5, 13, 0, 0, 7); c.fill(); });
        if (th === 'gondor') this.onWallR(c => { c.fillStyle = '#f0f0f0'; c.fillRect(this.FW / 2 - 2, 70, 4, 40); for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(this.FW / 2, 80 + k * 10); c.lineTo(this.FW / 2 - 14 + k * 3, 90 + k * 10); c.lineTo(this.FW / 2, 86 + k * 10); c.lineTo(this.FW / 2 + 14 - k * 3, 90 + k * 10); c.fill(); } });
        if (th === 'erebor') this.onWallR(c => { c.fillStyle = '#d9a441'; for (let k = 0; k < 7; k++) c.fillRect(30 + k * 40, 96, 12, 14); c.fillStyle = '#4a8ad0'; c.fillRect(this.FW / 2 - 6, 70, 12, 12); });
        if (th === 'lorien') this.onWallL(c => { c.strokeStyle = 'rgba(220,230,200,.5)'; c.lineWidth = 1.5; for (let u = 20; u < this.FD; u += 50) { c.beginPath(); c.moveTo(u, 0); c.bezierCurveTo(u - 12, 40, u + 12, 90, u, this.WH); c.stroke(); } });
    }
    spawnHall(t, th) {
        const f = t.f === 6 ? (heroSide() === 1 ? 2 : 0) : t.f;
        const lord = E.find(e => e.f === t.f && !hos(e.f, G.fac) && Math.hypot(e.x - t.x, e.y - t.y) < 15 * K);
        this.lord = lord;
        const dx = this.FW / 2;
        if (lord) {
            const [eq, o] = Figures.lordEq(lord);
            this.person(dx, 62, [{ ...eq, m: 0 }, { ...o, flag: null }], lord.nm + (lord.kr ? ' (panovník)' : ' (pán hradu)'), () => castleLord(this.ti, lord), 1.05);
        }
        const stL = Portraits.forLord({ nm: 'spravca' + t.n, f }); delete stL.crown; delete stL.helm; stL.age = .7; this.stewardLook = stL;
        this.person(dx + (lord ? 70 : 0), lord ? 90 : 66, [{ w: null, a: Portraits.forLord({ nm: 'x', f }).race === 'orc' ? 11 : 0, s: 0, h: null, m: 0 }, { ...Figures.lookOpts(stL) }], 'Správca hradu', () => castleSteward(this.ti), 1);
        const [geq, go] = Figures.lordEq({ f, id: this.ti + 3, nm: 'straz' });
        for (const gx of [dx - 80, dx + 80]) { const k = Art.bigFigure(this, { ...geq, m: 0 }, { ...go, flag: null, king: 0 }); this.sprite(gx, 40, k, .85).setFlipX(gx > dx); }
    }

    leave() {
        if (mode !== 'castle') return;
        if (this.roomKind === 'hall') { this.scene.stop(); enterCastle(this.ti, 'yard'); return; }
        leaveCastle();
    }

    update(time, delta) {
        const dt = Math.min(3, (delta || 16.7) / 16.67);
        if (mode !== 'castle') { if (mode !== 'town' && mode !== 'tavern') this.closeRoom(); return; }
        const t = tm, nn = nightness(), C = this.C, s = this.sky, f = this.fx;
        s.clear(); f.clear();
        if (this.roomKind === 'yard') { s.fillStyle(Phaser.Display.Color.GetColor(40 + 120 * (1 - nn), 60 + 120 * (1 - nn), 90 + 140 * (1 - nn)), 1).fillRect(0, 0, W, this.OY + this.FW / 2 - this.WH + 4); this.drawSky(s, 0, 0, W, this.OY + this.FW / 2 - this.WH + 4); }
        else for (const w of this.windows) {
            const [ax, ay] = this.P(0, w.u + w.w, w.v + w.h), [bx, by] = this.P(0, w.u, w.v + w.h), [cx, cy] = this.P(0, w.u, w.v), [dx, dy] = this.P(0, w.u + w.w, w.v);
            s.fillStyle(Phaser.Display.Color.GetColor(40 + 120 * (1 - nn), 60 + 120 * (1 - nn), 90 + 140 * (1 - nn)), 1).fillPoints([{ x: ax, y: ay }, { x: bx, y: by }, { x: cx, y: cy }, { x: dx, y: dy }], true);
            s.lineStyle(2, C.trim, 1).lineBetween((ax + bx) / 2, (ay + by) / 2, (dx + cx) / 2, (dy + cy) / 2);
        }
        // vyhňa, fakle, koše s ohňom, sviečky
        if (this.forge) { const [fx, fy] = this.P(this.forge[0], this.forge[1], this.forge[2]); for (let k = 0; k < 5; k++) { const ph = t / 3 + k * 1.9, h = 10 + Math.sin(ph) * 4; f.fillStyle(0xff7a20, .9).fillTriangle(fx - 8 + k * 4 - 3, fy, fx - 8 + k * 4 + 3, fy, fx - 8 + k * 4 + Math.sin(ph) * 2, fy - h); } f.fillStyle(0xffd060, .9).fillTriangle(fx - 4, fy, fx + 4, fy, fx, fy - 6 - Math.sin(t / 2) * 2); for (let k = 0; k < 4; k++) { const a = (t * .9 + k * 17) % 50; f.fillStyle(0xffc040, .9 - a / 60).fillRect(fx - 6 + ((k * 5 + a * .4) % 12), fy - 12 - a, 1.5, 1.5); } }
        for (const [tx, ty, tz] of this.torches) { const [sx, sy] = this.P(tx, ty, tz), ph = t / 2.5 + tx + ty; f.fillStyle(0xff8a30, .95).fillTriangle(sx - 3, sy, sx + 3, sy, sx + Math.sin(ph) * 1.5, sy - 9 - Math.sin(ph * 1.7) * 2); f.fillStyle(0xffe080, .95).fillTriangle(sx - 1.5, sy, sx + 1.5, sy, sx + Math.sin(ph) * .8, sy - 4); }
        for (const [bx, by] of this.braziers) { const [sx, sy] = this.P(bx, by, 16); for (let k = 0; k < 4; k++) { const ph = t / 3 + k * 1.7, h = 12 + Math.sin(ph) * 4; f.fillStyle(this.th === 'mordor' ? 0xff3a10 : 0xff7a20, .9).fillTriangle(sx - 6 + k * 4 - 3, sy, sx - 6 + k * 4 + 3, sy, sx - 6 + k * 4 + Math.sin(ph) * 2, sy - h); } }
        for (const [cx, cy, cz] of this.candles) { const [sx, sy] = this.P(cx, cy, cz), ph = t / 2 + cx; f.fillStyle(0xffd060, .95).fillEllipse(sx + Math.sin(ph) * .4, sy - 10, 1.6, 3.2); }
        // svetlo
        const L = this.light; L.clear();
        const dark = this.roomKind === 'hall' ? .2 + nn * .25 : nn * .45;
        L.fillStyle(this.roomKind === 'hall' ? 0x000000 : 0x080e28, dark).fillRect(0, 0, W, H);
        if (!this.glows) {
            this.glows = [];
            if (this.roomKind === 'hall') { for (const [bx, by] of this.braziers) this.glows.push(this.glow(bx, by, 20, 180, C.light, .5)); for (const [cx, cy, cz] of this.candles) this.glows.push(this.glow(cx, cy, cz, 60, 0xffe0a0, .3)); this.glows.push(this.glow(this.FW / 2, 30, 30, 150, 0xffe0a0, .3)); }
            else { if (this.forge) this.glows.push(this.glow(this.forge[0], this.forge[1], 18, 130, 0xff9a40, .45)); for (const [tx, ty, tz] of this.torches) this.glows.push(this.glow(tx, ty, tz, 90, 0xffb060, 0)); }
        }
        if (this.roomKind === 'hall') this.glows.forEach((l, i) => l.setAlpha(.42 + Math.sin(t / 2 + i) * .06));
        else this.glows.forEach((l, i) => l.setAlpha(i === 0 && this.forge ? .4 + Math.sin(t / 2) * .08 : (.25 + Math.sin(t / 2.3 + i) * .06) * Math.min(1, nn * 1.6 + .15)));
        this.people.forEach(p => { if (!p.spot) p.spr.y = p.sy + Math.sin(t / 9 + p.t0) * .8; });
        this.movePlayer(dt);
    }
}
