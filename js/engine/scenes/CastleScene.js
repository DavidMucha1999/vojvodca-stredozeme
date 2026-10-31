/*
 * ENGINE: nádvorie a sieň hradu – miestnosti, po ktorých chodí hráč (základ RoomScene).
 * init({ i, room }): i = hrad, room = 'yard' (nádvorie) alebo 'hall' (sieň). mode = 'castle'.
 * Vzhľad podľa frakcie hradu (biely kameň Gondoru, drevo Rohanu, čierne železo Mordoru, Sarumanova veža,
 * pieskovec Haradu, tesaný kameň Ereboru, červený kameň Rhûnu, mallorny Lothlórienu, palisáda banditov)
 * a podľa čísla hradu (poloha studne, stánkov, počet debien). Postavené budovy (stajňa, chrám, trhovisko) vidno na nádvorí.
 * Postavy: kováč, kupec, veliteľ posádky, stráže; v sieni správca hradu alebo pán, ak je práve doma (js/ui/castle.js).
 */
const BFhex = f => Phaser.Display.Color.HexStringToColor(BF[f] || '#4a3a2a').color;
class CastleScene extends RoomScene {
    constructor() { super('Castle'); }
    init(d) { this.ti = d.i; this.roomKind = d.room || 'yard'; }

    /** Téma hradu podľa frakcie. */
    theme() {
        const t = TW[this.ti]; let f = t.f;
        if (f === 6) f = heroSide() === 1 ? 2 : 0;
        return ['gondor', 'rohan', 'mordor', 'isengard', 'harad', 'erebor', 'gondor', 'rhun', 'lorien', 'bandit'][f] || 'gondor';
    }
    palette(th) {
        return {
            gondor: { wall: 0xcfd3d8, wall2: 0xb4b9c0, trim: 0x8a9098, ground: 0xb9b5aa, ground2: 0xa8a49a, roof: 0x4a6a9a, light: 0xfff0d0, hall: 0xe8e8ec, hall2: 0xcfd3d8, floor: 0xb0b4ba, carpet: 0x2a3a6a },
            rohan: { wall: 0x8a6a3a, wall2: 0x6a4e2a, trim: 0xd9a441, ground: 0x7a6a40, ground2: 0x6a5a34, roof: 0x5a3a1a, light: 0xffd080, hall: 0x7a5a30, hall2: 0x5a4020, floor: 0x6a4a28, carpet: 0x3a6a2a },
            mordor: { wall: 0x2a2628, wall2: 0x1a1618, trim: 0x5a2a1a, ground: 0x2e2a2a, ground2: 0x242020, roof: 0x141214, light: 0xff6a30, hall: 0x1e1a1c, hall2: 0x141012, floor: 0x262224, carpet: 0x5a1010 },
            isengard: { wall: 0x3a3a40, wall2: 0x2a2a30, trim: 0x8a8a90, ground: 0x3e3a38, ground2: 0x343030, roof: 0x1a1a1e, light: 0xfff0d0, hall: 0x2e2e34, hall2: 0x222226, floor: 0x343438, carpet: 0x1a1a1a },
            harad: { wall: 0xc8a06a, wall2: 0xb08850, trim: 0xd9a441, ground: 0xc8b080, ground2: 0xb8a070, roof: 0x8a2a1a, light: 0xffd080, hall: 0xb89060, hall2: 0xa07a48, floor: 0xa89068, carpet: 0xa02a1a },
            erebor: { wall: 0x6a6a72, wall2: 0x52525a, trim: 0xd9a441, ground: 0x5a5a60, ground2: 0x4a4a50, roof: 0x3a3a42, light: 0xffb060, hall: 0x4a4a52, hall2: 0x3a3a42, floor: 0x44444c, carpet: 0x3a4a7a },
            rhun: { wall: 0x8a3a30, wall2: 0x6a2a22, trim: 0xd9a441, ground: 0x9a7a58, ground2: 0x8a6a48, roof: 0x5a1f4a, light: 0xffd080, hall: 0x6a2a22, hall2: 0x4a1a14, floor: 0x7a5a40, carpet: 0x5a1f4a },
            lorien: { wall: 0x9aa890, wall2: 0x7a8a70, trim: 0xd8d0a0, ground: 0x5a7a4a, ground2: 0x4a6a3a, roof: 0x3a5a3a, light: 0xc8e8ff, hall: 0x7a8a70, hall2: 0x5a6a50, floor: 0x6a7a5a, carpet: 0x9ab07a },
            bandit: { wall: 0x6a4a2a, wall2: 0x4a3018, trim: 0x3a2a1a, ground: 0x5a4a30, ground2: 0x4a3a24, roof: 0x3a2a1a, light: 0xffb060, hall: 0x5a3a1a, hall2: 0x3a2810, floor: 0x4a3a20, carpet: 0x4a3a2a }
        }[th];
    }

    create() {
        this.cameras.main.setZoom(RES).setOrigin(0, 0);
        const t = TW[this.ti], th = this.theme(), C = this.palette(th), seed = this.ti * 11 + 5, R = n => { const x = Math.sin((seed + n) * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
        this.th = th; this.C = C; this.R = R; this.t = t;
        this.sky = this.add.graphics().setDepth(this.roomKind === 'hall' ? 1.2 : 0);
        this.fx = this.add.graphics().setDepth(2);
        if (this.roomKind === 'hall') this.buildHall(t, th, C, R); else this.buildYard(t, th, C, R);
    }

    /* ---------- nádvorie ---------- */
    buildYard(t, th, C, R) {
        const g = this.add.graphics().setDepth(1), HZ = 236, bd = t.bd || {};
        this.HZ = HZ; this.skyRect = [0, 0, W, 112];
        // hradby a palác v pozadí
        const wallTop = 96;
        const hx6 = v => '#' + v.toString(16).padStart(6, '0');
        const wallKind = th === 'lorien' ? 'bark' : th === 'rohan' || th === 'bandit' ? 'planksV' : th === 'mordor' ? 'dark' : 'bricks';
        this.add.tileSprite(0, wallTop, W, HZ - wallTop, Tex.pattern(this, wallKind, hx6(C.wall), this.ti + 3)).setOrigin(0).setDepth(-1).setTileScale(.4);
        if (th === 'lorien') { for (let x = 30; x < W; x += 120) { g.fillStyle(0x6a5a40, 1).fillRect(x, wallTop - 30, 22, HZ - wallTop + 30); g.fillStyle(0xd8c870, .9).fillCircle(x + 11, wallTop - 40, 46); g.fillStyle(0xe8dc90, .8).fillCircle(x + 2, wallTop - 52, 30); } }
        g.fillStyle(0x000000, .2).fillRect(0, wallTop, W, 10);                                       // tieň pod cimburím
        // cimburie a veže
        g.fillStyle(C.wall2, 1); for (let x = 0; x < W; x += 28) g.fillRect(x, wallTop - 12, 16, 14);
        for (const tx of [60, W - 60]) { g.fillStyle(C.wall2, 1).fillRect(tx - 34, wallTop - 60, 68, HZ - wallTop + 60); g.fillStyle(C.wall, 1).fillRect(tx - 30, wallTop - 56, 60, HZ - wallTop + 56); g.fillStyle(C.roof, 1); if (th === 'mordor' || th === 'isengard') g.fillTriangle(tx - 38, wallTop - 58, tx + 38, wallTop - 58, tx, wallTop - 120); else g.fillTriangle(tx - 38, wallTop - 58, tx + 38, wallTop - 58, tx, wallTop - 100); for (let y = wallTop - 40; y < HZ; y += 40) { g.fillStyle(0x100c0a, 1).fillRoundedRect(tx - 5, y, 10, 16, 3); } }
        // brána do siene
        const gx = W / 2;
        g.fillStyle(C.trim, 1).fillRect(gx - 54, wallTop + 10, 108, HZ - wallTop - 10);
        g.fillStyle(0x15100c, 1).fillRoundedRect(gx - 40, wallTop + 40, 80, HZ - wallTop - 40, { tl: 36, tr: 36, bl: 0, br: 0 });
        g.fillStyle(th === 'mordor' ? 0x1a1414 : 0x6a4a2a, 1).fillRoundedRect(gx - 34, wallTop + 48, 68, HZ - wallTop - 48, { tl: 30, tr: 30, bl: 0, br: 0 });
        g.fillStyle(0x2a1a10, 1).fillRect(gx - 1.5, wallTop + 60, 3, HZ - wallTop - 60);
        for (let y = wallTop + 70; y < HZ; y += 26) { g.fillStyle(0x8a8a90, 1).fillRect(gx - 30, y, 60, 3); }
        if (th === 'mordor') { g.fillStyle(0x3a3a40, 1); for (let k = 0; k < 5; k++) g.fillTriangle(gx - 30 + k * 15, wallTop + 44, gx - 22 + k * 15, wallTop + 44, gx - 26 + k * 15, wallTop + 30); }
        if (th === 'gondor') { g.fillStyle(0xffffff, 1); const ty = wallTop + 26; g.fillRect(gx - 1, ty - 12, 2, 14); for (const [dx, dy] of [[-8, -4], [8, -4], [-5, -9], [5, -9]]) g.fillCircle(gx + dx, ty + dy, 3); }
        if (th === 'rohan') { g.fillStyle(0xd9a441, 1); g.fillTriangle(gx - 40, wallTop + 12, gx + 40, wallTop + 12, gx, wallTop - 30); g.fillStyle(0xf4f0e4, 1).fillEllipse(gx, wallTop + 2, 16, 8); }
        if (th === 'isengard') { g.fillStyle(0xeeeeee, 1).fillEllipse(gx, wallTop + 24, 8, 10); for (let k = -2; k <= 2; k++) g.fillRect(gx + k * 3.5 - 1.2, wallTop + 8, 2.4, 10); }
        if (th === 'harad') { g.fillStyle(0xd9a441, 1); for (let k = 0; k < 7; k++) g.fillTriangle(gx - 48 + k * 16, wallTop + 10, gx - 36 + k * 16, wallTop + 10, gx - 42 + k * 16, wallTop + 24); }
        if (th === 'erebor') { g.fillStyle(0xd9a441, 1).fillRect(gx - 50, wallTop + 12, 100, 4); g.fillStyle(0x3a8ae0, 1).fillRect(gx - 4, wallTop + 22, 8, 8); }
        // zástavy po bokoch brány
        const bk = Art.banner(this, t.f);
        this.add.image(gx - 80, wallTop + 20, bk).setOrigin(.5, 0).setScale(2).setDepth(1.5);
        this.add.image(gx + 80, wallTop + 20, bk).setOrigin(.5, 0).setScale(2).setDepth(1.5);
        // zem
        const groundKind = th === 'rohan' || th === 'bandit' ? 'planks' : th === 'lorien' ? 'grass' : th === 'harad' ? 'sand' : th === 'gondor' ? 'flags' : 'cobbles';
        this.add.tileSprite(0, HZ, W, H - HZ, Tex.pattern(this, groundKind, hx6(C.ground), this.ti + 4)).setOrigin(0).setDepth(-1).setTileScale(.32);
        if (th === 'rohan' || th === 'bandit') for (let k = 0; k < 40; k++) { g.fillStyle(0xc8b060, .5).fillRect(R(60 + k) * W, HZ + 10 + R(100 + k) * (H - HZ - 20), 6, 1.5); }
        g.fillStyle(0x000000, .3).fillRect(0, HZ, W, 10); g.fillStyle(0x000000, .12).fillRect(0, HZ + 10, W, 14);   // tieň pod hradbou
        // studňa
        const wx = 300 + Math.floor(R(1) * 3) * 60, wy = HZ + 90 + Math.floor(R(2) * 2) * 50;
        g.fillStyle(0x000000, .25).fillEllipse(wx, wy + 14, 60, 18);
        g.fillStyle(0x7a7a80, 1).fillEllipse(wx, wy, 52, 22); g.fillStyle(0x15100c, 1).fillEllipse(wx, wy - 2, 36, 13);
        g.fillStyle(0x5a3a1a, 1).fillRect(wx - 24, wy - 50, 5, 50).fillRect(wx + 19, wy - 50, 5, 50); g.fillStyle(0x6a3a1a, 1).fillTriangle(wx - 32, wy - 48, wx + 32, wy - 48, wx, wy - 66);
        g.fillStyle(0x3a2a1a, 1).fillRect(wx - 20, wy - 30, 40, 3); g.fillStyle(0x8a8a90, 1).fillRect(wx - 3, wy - 30, 6, 12);
        this.well = [wx, wy];
        // kováčňa vľavo
        const sx = 110, sy = HZ + 60;
        g.fillStyle(0x3a2a1a, 1).fillRect(sx - 60, sy - 70, 120, 8); for (const px of [sx - 56, sx + 50]) g.fillRect(px, sy - 70, 6, 80);           // prístrešok
        g.fillStyle(0x4a3a30, 1).fillRect(sx - 30, sy - 40, 36, 40); g.fillStyle(0x15100c, 1).fillRect(sx - 24, sy - 30, 24, 20);                    // vyhňa
        g.fillStyle(0x3a3a40, 1).fillRect(sx + 14, sy - 14, 30, 10).fillRect(sx + 22, sy - 4, 14, 12); g.fillStyle(0x8a8a90, 1).fillRect(sx + 12, sy - 17, 34, 5);  // nákova
        g.fillStyle(0x6a4a2a, 1).fillRect(sx + 48, sy - 16, 12, 24);                                                                              // sud s vodou
        this.forge = [sx - 12, sy - 20];
        // stánok kupca vpravo
        const mx = W - 120, my = HZ + 70;
        g.fillStyle(0x5a3a1a, 1).fillRect(mx - 52, my - 60, 5, 62).fillRect(mx + 47, my - 60, 5, 62);
        g.fillStyle(C.roof === 0x141214 ? 0x4a2a2a : [0x4a6a9a, 0x3a6a2a, 0x5a1010, 0x2a2a2a, 0xa02a1a, 0x3a4a7a, 0x6a2a2a, 0x5a1f4a, 0x9ab07a, 0x4a3a2a][t.f] || 0x8a2a1a, 1);
        for (let k = 0; k < 6; k++) g.fillRect(mx - 56 + k * 19, my - 72, 19, 14 + (k % 2) * 6);
        g.fillStyle(0x8a6a3a, 1).fillRect(mx - 50, my - 10, 100, 16); g.fillStyle(0x6a4a2a, 1).fillRect(mx - 50, my + 6, 100, 4);
        for (let k = 0; k < 4; k++) { g.fillStyle([0xc8a040, 0x7a3a2a, 0x4a7a3a, 0xd8d0c0][k], 1).fillRect(mx - 44 + k * 24, my - 22, 18, 12); }
        for (let k = 0; k < 2 + Math.floor(R(3) * 3); k++) { g.fillStyle(0x8a6a3a, 1).fillRect(mx - 70 - k * 22, my + 10, 20, 18); g.fillStyle(0x3a2a1a, 1).fillRect(mx - 70 - k * 22, my + 18, 20, 2); }
        // dvere do krčmy (vpravo dole pri veži)
        const tx = W - 70, ty = HZ - 2;
        g.fillStyle(0x15100c, 1).fillRoundedRect(tx - 16, ty - 44, 32, 44, { tl: 14, tr: 14, bl: 0, br: 0 });
        g.fillStyle(0x6a4a2a, 1).fillRoundedRect(tx - 12, ty - 40, 24, 40, { tl: 10, tr: 10, bl: 0, br: 0 });
        g.fillStyle(0x8a6a3a, 1).fillRect(tx - 18, ty - 62, 36, 14); g.fillStyle(0xc8903a, 1).fillRect(tx - 5, ty - 60, 7, 10); g.fillStyle(0xfff4dc, 1).fillRect(tx - 5, ty - 61, 7, 3);   // vývesný štít s korbeľom
        // budovy podľa správy hradu
        if (bd.j) { const hx = 40, hy = HZ + 170; g.fillStyle(0x5a3a1a, 1).fillRect(hx - 30, hy - 40, 90, 44); g.fillStyle(0x3a2a1a, 1).fillRect(hx - 30, hy - 48, 90, 10); for (let k = 0; k < 3; k++) g.fillStyle(0x15100c, 1).fillRect(hx - 22 + k * 28, hy - 30, 20, 30); this.add.image(hx + 20, hy + 2, Art.figure(this, { w: null, a: 0, s: 0, h: null, m: 2 }, { cape: '#3a2a1a' })).setScale(1.3).setDepth(hy); }
        if (bd.c) { const cx = gx + 170, cy = HZ + 12; g.fillStyle(C.wall2, 1).fillRect(cx - 24, cy - 70, 48, 70); g.fillStyle(C.roof, 1).fillTriangle(cx - 30, cy - 70, cx + 30, cy - 70, cx, cy - 100); g.fillStyle(0xffd24a, 1).fillRect(cx - 1.5, cy - 112, 3, 14).fillRect(cx - 5, cy - 108, 10, 2.5); g.fillStyle(0x15100c, 1).fillRoundedRect(cx - 8, cy - 30, 16, 30, { tl: 8, tr: 8, bl: 0, br: 0 }); }
        if (bd.t) { for (let k = 0; k < 2; k++) { const bx = mx - 170 - k * 60, by = my + 40; g.fillStyle(0x5a3a1a, 1).fillRect(bx - 20, by - 40, 4, 44).fillRect(bx + 16, by - 40, 4, 44); g.fillStyle(k ? 0x3a6a2a : 0xa02a1a, 1).fillRect(bx - 24, by - 48, 48, 10); g.fillStyle(0x8a6a3a, 1).fillRect(bx - 20, by - 6, 40, 10); } }
        this.detailYard(g, t, th, C, R, HZ);
        // cvičný panák
        const dx = 220 + Math.floor(R(4) * 2) * 300, dy = HZ + 150 + R(5) * 40;
        g.fillStyle(0x5a3a1a, 1).fillRect(dx - 2, dy - 40, 4, 40).fillRect(dx - 14, dy - 32, 28, 3); g.fillStyle(0xc8a870, 1).fillRect(dx - 7, dy - 36, 14, 18); g.fillStyle(0xe8c39e, 1).fillCircle(dx, dy - 42, 5);
        // postavy
        this.people = [];
        this.spawnYard(t, th, HZ);
        this.setupRoom({ mode: 'castle', floorY: HZ - 10, title: t.n + ' – nádvorie', amb: th === 'lorien' ? 'elf' : th === 'mordor' || th === 'isengard' || th === 'bandit' ? 'yardEvil' : 'yard', floorSnd: th === 'rohan' || th === 'bandit' ? 'wood' : th === 'lorien' ? 'grass' : th === 'harad' ? 'sand' : 'stone', leave: 'Opustiť hrad', spawn: [W / 2, H - 36], block: [[wx - 28, wy - 14, 56, 26], [sx - 32, sy - 42, 60, 44], [mx - 52, my - 12, 104, 22]] });
        // miesta
        this.spot(gx, HZ - 40, 70, 80, 'Sieň hradu', () => enterCastle(this.ti, 'hall'), HZ + 14);
        this.spot(tx, ty - 22, 36, 44, 'Krčma', () => enterTavern(this.ti), HZ + 14);
        this.spot(wx, wy - 20, 56, 40, 'Studňa', () => castleWell(this.ti), wy + 24);
        if (bd.c) this.spot(gx + 170, HZ - 30, 48, 60, 'Chrám', () => castleTemple(this.ti), HZ + 14);
        this.spot(dx, dy - 24, 30, 48, 'Cvičisko', () => castleTraining(this.ti), dy + 10);
    }
    spawnYard(t, th, HZ) {
        const race = Portraits.forLord({ nm: 'x', f: t.f === 6 ? (heroSide() === 1 ? 2 : 0) : t.f }).race, evil = race === 'orc' || race === 'uruk';
        const L = (name) => { const l = Portraits.forLord({ nm: name + t.n, f: t.f === 6 ? (heroSide() === 1 ? 2 : 0) : t.f }); delete l.crown; delete l.helm; return l; };
        const smithL = L('kovac'), mercL = L('kupec'), capL = L('velitel');
        this.looks = { smith: smithL, merc: mercL, cap: capL };
        this.person(this.forge[0] + 30, this.HZ + 70, [{ w: null, a: evil ? 11 : 0, s: 0, h: null, m: 0 }, { apron: 1, ...Figures.lookOpts(smithL) }], evil ? 'Orkský kováč' : 'Kováč', () => castleSmith(this.ti), 1);
        this.person(W - 120, this.HZ + 98, [{ w: null, a: evil ? 11 : 0, s: 0, h: null, m: 0 }, { ...Figures.lookOpts(mercL) }], evil ? 'Kupec z východu' : 'Kupec', () => castleMerchant(this.ti), 1);
        const [ceq, co] = Figures.lordEq({ f: t.f === 6 ? (heroSide() === 1 ? 2 : 0) : t.f, id: this.ti, nm: 'velitel' });
        this.person(W / 2 + 150, this.HZ + 64, [{ ...ceq, m: 0 }, { ...co, flag: null, king: 0, ...Figures.lookOpts(capL) }], 'Veliteľ posádky', () => castleCaptain(this.ti), 1);
        for (const gx of [W / 2 - 92, W / 2 + 92]) this.add.image(gx, this.HZ + 6, Art.bigFigure(this, { ...ceq, m: 0 }, { ...co, flag: null, king: 0, ...Figures.lookOpts(L('straz' + gx)) })).setScale(.5 * .8).setDepth(this.HZ + 6).setFlipX(gx > W / 2);
    }

    /** Drobnosti nádvoria: textúra kameňa, tiene, fakle, debny, seno, kvety alebo klietky podľa strany, mláky. */
    detailYard(g, t, th, C, R, HZ) {
        const evil = th === 'mordor' || th === 'isengard' || th === 'bandit';
        // zrno kameňa a stopy na zemi
        for (let k = 0; k < 220; k++) { const x = R(300 + k) * W, y = HZ + R(600 + k) * (H - HZ); g.fillStyle(k % 2 ? 0xffffff : 0x000000, .05 + R(900 + k) * .05).fillRect(x, y, 2 + R(1200 + k) * 5, 1.5); }
        for (let k = 0; k < 3; k++) { const x = 120 + R(40 + k) * (W - 240), y = HZ + 60 + R(50 + k) * (H - HZ - 90); g.fillStyle(0x000000, .1).fillEllipse(x, y, 40 + R(60 + k) * 30, 10); if (MW.n === 'rain' || MW.n === 'storm') g.fillStyle(0x5a7a9a, .4).fillEllipse(x, y, 34 + R(60 + k) * 30, 8); }   // mláky
        // fakle na hradbách
        this.torches = [];
        for (const tx of [W / 2 - 140, W / 2 + 140, 160, W - 160]) { g.fillStyle(0x3a2a1a, 1).fillRect(tx - 2, HZ - 60, 4, 26); g.fillStyle(0x2a2a2e, 1).fillRect(tx - 4, HZ - 64, 8, 6); this.torches.push([tx, HZ - 66]); }
        // okná v paláci
        for (const wx of [W / 2 - 180, W / 2 + 180, W / 2 - 230, W / 2 + 230]) { g.fillStyle(0x15100c, 1).fillRoundedRect(wx - 7, HZ - 110, 14, 26, { tl: 7, tr: 7, bl: 0, br: 0 }); g.fillStyle(0x6a7a9a, .55).fillRoundedRect(wx - 5, HZ - 108, 10, 22, { tl: 5, tr: 5, bl: 0, br: 0 }); g.fillStyle(C.trim, 1).fillRect(wx - 8, HZ - 84, 16, 3); }
        // seno a debny
        const hx = 60 + R(7) * 40, hy = HZ + 120 + R(8) * 60;
        g.fillStyle(0x000000, .2).fillEllipse(hx, hy + 10, 50, 12); g.fillStyle(0xc8a860, 1).fillEllipse(hx, hy, 44, 20); g.fillStyle(0xd8b870, 1).fillEllipse(hx - 6, hy - 4, 24, 10); for (let k = 0; k < 10; k++) g.fillStyle(0xa88840, 1).fillRect(hx - 20 + k * 4, hy - 6 + (k % 3) * 5, 5, 1.2);
        for (let k = 0; k < 2 + Math.floor(R(9) * 2); k++) { const bx = W - 60 - k * 26, by = HZ + 150 + (k % 2) * 14; g.fillStyle(0x000000, .2).fillRect(bx - 11, by + 10, 26, 4); g.fillStyle(0x8a6a3a, 1).fillRect(bx - 11, by - 12, 22, 22); g.fillStyle(0x5a3a1a, 1).fillRect(bx - 11, by - 2, 22, 2).fillRect(bx - 1, by - 12, 2, 22); }
        if (!evil) { for (let k = 0; k < 4; k++) { const fx = 150 + k * 30, fy = HZ + 24; g.fillStyle(0x5a3a1a, 1).fillRect(fx - 8, fy, 16, 8); g.fillStyle([0xd8402a, 0xe8c040, 0xf0f0f0, 0xa040c0][k], 1).fillCircle(fx - 4, fy - 3, 3).fillCircle(fx + 4, fy - 2, 3); g.fillStyle(0x4a8a3a, 1).fillRect(fx - 1, fy - 2, 2, 4); } }   // kvetináče
        else { const cx = 140 + R(11) * 40, cy = HZ + 40; g.fillStyle(0x2a2a2e, 1).fillRect(cx - 1.5, cy - 70, 3, 30); g.lineStyle(2, 0x3a3a40, 1).strokeRect(cx - 14, cy - 40, 28, 40); for (let k = -1; k <= 1; k++) g.lineBetween(cx + k * 9, cy - 40, cx + k * 9, cy); g.fillStyle(0xe8e4d8, 1).fillCircle(cx, cy - 26, 5); g.fillRect(cx - 3, cy - 22, 6, 4); for (const sx of [W / 2 - 120, W / 2 + 120]) { g.fillStyle(0x3a2a1a, 1).fillRect(sx - 1.5, HZ - 40, 3, 40); g.fillStyle(0xe8e4d8, 1).fillCircle(sx, HZ - 44, 5); g.fillStyle(0x1a1210, 1).fillCircle(sx - 2, HZ - 45, 1.3).fillCircle(sx + 2, HZ - 45, 1.3); } }   // klietka a lebky na koloch
        // kura / vrany
        if (!evil) for (let k = 0; k < 3; k++) { const kx = 300 + R(20 + k) * 200, ky = HZ + 200 + R(30 + k) * 40; g.fillStyle(0xf0e8d8, 1).fillEllipse(kx, ky, 7, 5); g.fillCircle(kx + 4, ky - 3, 2.5); g.fillStyle(0xd8402a, 1).fillRect(kx + 3, ky - 6, 2, 2); g.fillStyle(0xe8a030, 1).fillTriangle(kx + 6, ky - 3, kx + 9, ky - 2.5, kx + 6, ky - 2); }
        else for (let k = 0; k < 3; k++) { const kx = 200 + R(20 + k) * 320; g.fillStyle(0x1a1a1e, 1).fillEllipse(kx, HZ - 128, 6, 4); g.fillCircle(kx + 4, HZ - 131, 2.2); }
    }
    /** Drobnosti siene: gobelíny, luster, hlavice stĺpov, vzor koberca, štíty na stenách, hostina na stoloch. */
    detailHall(g, t, th, C, R, HZ, dx, dy) {
        const evil = th === 'mordor' || th === 'isengard' || th === 'bandit';
        // hlavice stĺpov a pätky
        for (const px of [90, W - 90]) { g.fillStyle(C.trim, 1).fillRect(px - 22, 8, 44, 10); g.fillStyle(0x000000, .25).fillRect(px + 2, 0, 8, HZ + 20); }
        // luster
        g.fillStyle(0x3a3a40, 1).fillRect(dx - 1.5, 0, 3, 90); g.fillStyle(0x5a5a60, 1).fillEllipse(dx, 94, 90, 10); g.fillStyle(0x3a3a40, 1).fillEllipse(dx, 96, 84, 6);
        this.candles = []; for (let k = 0; k < 7; k++) { const cxk = dx - 36 + k * 12; g.fillStyle(0xf0e0c0, 1).fillRect(cxk - 1.2, 84, 2.4, 8); this.candles.push([cxk, 83]); }
        // gobelíny po bokoch (veľké zástavy s textúrou)
        for (const gx of [40, W - 40]) { g.fillStyle(0x000000, .3).fillRect(gx - 18, 64, 36, 120); g.fillStyle(BFhex(t.f), 1).fillRect(gx - 16, 62, 32, 116); for (let k = 0; k < 5; k++) g.fillStyle(k % 2 ? 0xffffff : 0x000000, .07).fillRect(gx - 16 + k * 6.4, 62, 6.4, 116); g.fillStyle(0xd9a441, 1).fillRect(gx - 16, 62, 32, 3).fillRect(gx - 16, 175, 32, 3); for (let k = 0; k < 4; k++) g.fillRect(gx - 14 + k * 9, 178, 3, 6); }
        // štíty a zbrane na stenách
        for (const sx of [W / 2 - 250, W / 2 + 250]) { g.fillStyle(0x3a2a1a, 1).fillRect(sx - 1.5, 90, 3, 60); g.fillStyle(0x3a2a1a, 1).fillRect(sx - 30, 118, 60, 3); g.fillStyle(evil ? 0x2a2a30 : 0x8a8c92, 1).fillTriangle(sx - 14, 90, sx + 14, 90, sx, 130); g.fillStyle(evil ? 0x8a1a10 : 0xd9a441, 1).fillTriangle(sx - 10, 94, sx + 10, 94, sx, 124); }
        // vzor koberca
        for (let y = dy + 16; y < H; y += 24) { g.fillStyle(0xffffff, .1).fillRect(dx - 30, y, 60, 2); g.fillStyle(0x000000, .15).fillRect(dx - 3, y + 8, 6, 6); }
        // hostina: taniere a poháre
        for (const side of [-1, 1]) { const tx = dx + side * 190, ty = dy + 90; for (let k = 0; k < 3; k++) { g.fillStyle(0xd8d0c0, 1).fillEllipse(tx - 45 + k * 40, ty + 4, 10, 4); g.fillStyle(0xa86a3a, 1).fillEllipse(tx - 45 + k * 40, ty + 3, 5, 2); } g.fillStyle(0xd9a441, 1).fillRect(tx + 50, ty - 6, 4, 8).fillRect(tx + 48, ty - 8, 8, 2); }
        // zrno kameňa na podlahe
        for (let k = 0; k < 160; k++) { const x = R(400 + k) * W, y = HZ + R(700 + k) * (H - HZ); g.fillStyle(k % 2 ? 0xffffff : 0x000000, .05).fillRect(x, y, 2 + R(1000 + k) * 4, 1.2); }
        if (evil) { for (const sx of [dx - 60, dx + 60]) { g.fillStyle(0x3a3a40, 1); for (let k = 0; k < 3; k++) g.fillTriangle(sx - 8 + k * 8, dy - 30, sx - 2 + k * 8, dy - 30, sx - 5 + k * 8, dy - 46); g.fillStyle(0xe8e4d8, 1).fillCircle(sx, dy - 50, 4); } }
        else { for (const sx of [dx - 60, dx + 60]) { g.fillStyle(C.trim, 1).fillRect(sx - 4, dy - 60, 8, 32); g.fillStyle(0xf0e0c0, 1).fillRect(sx - 1.5, dy - 70, 3, 10); this.candles.push([sx, dy - 71]); } }
    }

    /* ---------- sieň ---------- */
    buildHall(t, th, C, R) {
        const g = this.add.graphics().setDepth(1), HZ = 210;
        this.HZ = HZ; this.skyRect = null;
        // steny a stĺpy
        const hx6 = v => '#' + v.toString(16).padStart(6, '0');
        const hallKind = th === 'rohan' || th === 'bandit' ? 'planksV' : th === 'lorien' ? 'bark' : th === 'mordor' ? 'dark' : 'bricks';
        this.add.tileSprite(0, 0, W, HZ, Tex.pattern(this, hallKind, hx6(C.hall), this.ti + 5)).setOrigin(0).setDepth(-1).setTileScale(.4);
        if (th === 'lorien') { for (let x = 0; x < W; x += 80) { g.lineStyle(2, 0xd8d0a0, .6); for (const d of [-1, 1]) { g.beginPath(); for (let k = 0; k <= 10; k++) { const u = k / 10; const px = x + 40 + d * 50 * u * u, py = HZ - HZ * u; k ? g.lineTo(px, py) : g.moveTo(px, py); } g.strokePath(); } } }
        g.fillStyle(0x000000, .22).fillRect(0, 0, W, HZ * .3);                                        // tmavší strop
        for (const px of [90, W - 90]) { g.fillStyle(C.hall2, 1).fillRect(px - 16, 0, 32, HZ + 20); g.fillStyle(C.hall, 1).fillRect(px - 10, 0, 12, HZ + 20); g.fillStyle(C.trim, 1).fillRect(px - 20, HZ + 14, 40, 8).fillRect(px - 20, 0, 40, 8); }
        // okná
        this.windows = [[200, 66], [W - 200, 66]];
        for (const [wx, wy] of this.windows) { g.fillStyle(C.trim, 1).fillRect(wx - 24, wy - 6, 48, 92); }
        // dais a trón
        const dx = W / 2, dy = HZ + 40;
        g.fillStyle(C.hall2, 1).fillRect(dx - 150, dy - 30, 300, 36); g.fillStyle(C.trim, 1).fillRect(dx - 150, dy - 30, 300, 4);
        g.fillStyle(0x000000, .25).fillRect(dx - 150, dy + 6, 300, 6);
        const thr = th === 'mordor' || th === 'isengard' ? 0x1a1414 : th === 'rohan' ? 0x8a5a2a : th === 'lorien' ? 0xd8d0a0 : 0x6a4a2a;
        g.fillStyle(thr, 1).fillRect(dx - 22, dy - 110, 44, 84); g.fillStyle(C.trim, 1).fillRect(dx - 26, dy - 114, 52, 6);
        if (th === 'mordor') { g.fillStyle(0x3a3a40, 1); for (let k = 0; k < 5; k++) g.fillTriangle(dx - 22 + k * 11, dy - 110, dx - 14 + k * 11, dy - 110, dx - 18 + k * 11, dy - 128); }
        if (th === 'gondor') { g.fillStyle(0xffffff, 1).fillRect(dx - 1, dy - 150, 2, 36); for (const [ox, oy] of [[-10, -6], [10, -6], [-6, -14], [6, -14]]) g.fillCircle(dx + ox, dy - 146 + oy, 4); }
        if (th === 'rohan') { g.fillStyle(0xd9a441, 1).fillEllipse(dx, dy - 130, 40, 14); g.fillStyle(0xf4f0e4, 1).fillEllipse(dx, dy - 130, 16, 7); }
        g.fillStyle(0xd8402a, .9).fillRect(dx - 18, dy - 100, 36, 70);                           // vankúš
        // koberec, stoly, ohne
        this.add.tileSprite(0, HZ, W, H - HZ, Tex.pattern(this, th === 'rohan' || th === 'bandit' ? 'planks' : 'flags', hx6(C.floor), this.ti + 6)).setOrigin(0).setDepth(-1).setTileScale(.32);
        g.fillStyle(0x000000, .3).fillRect(0, HZ, W, 10); g.fillStyle(0x000000, .12).fillRect(0, HZ + 10, W, 14);
        g.fillStyle(C.carpet, 1).fillRect(dx - 40, dy + 8, 80, H - dy - 8); g.fillStyle(C.trim, .6).fillRect(dx - 40, dy + 8, 3, H - dy - 8).fillRect(dx + 37, dy + 8, 3, H - dy - 8);
        for (const side of [-1, 1]) {
            const tx = dx + side * 190, ty = dy + 90;
            g.fillStyle(0x000000, .22).fillEllipse(tx, ty + 24, 150, 20);
            g.fillStyle(0x5a3a1a, 1).fillRect(tx - 70, ty, 140, 10).fillRect(tx - 62, ty + 10, 8, 22).fillRect(tx + 54, ty + 10, 8, 22);
            for (let k = 0; k < 4; k++) { g.fillStyle(0xf0e0c0, 1).fillRect(tx - 50 + k * 30, ty - 12, 3, 12); g.fillStyle(0xc8903a, 1).fillRect(tx - 40 + k * 30, ty - 8, 7, 8); }
            const bx = dx + side * 110, by = dy + 30;                                                // ohnisko
            g.fillStyle(0x3a3a40, 1).fillRect(bx - 14, by - 6, 28, 10).fillRect(bx - 3, by + 4, 6, 20); this.braziers = this.braziers || []; this.braziers.push([bx, by - 8]);
        }
        // zástavy
        const bk = Art.banner(this, t.f);
        for (const bx of [dx - 70, dx + 70, 150, W - 150]) this.add.image(bx, 58, bk).setOrigin(.5, 0).setScale(2.2).setDepth(1.5);
        this.detailHall(g, t, th, C, R, HZ, dx, dy);
        this.people = [];
        this.spawnHall(t, th);
        this.setupRoom({ mode: 'castle', floorY: HZ + 12, title: t.n + ' – sieň', amb: th === 'lorien' ? 'elf' : 'hall', floorSnd: th === 'rohan' || th === 'bandit' ? 'wood' : 'stone', leave: 'Späť na nádvorie', spawn: [W / 2, H - 36], block: [[dx - 150, dy - 30, 300, 40], [dx - 260, dy + 86, 140, 36], [dx + 120, dy + 86, 140, 36]] });
    }
    spawnHall(t, th) {
        const f = t.f === 6 ? (heroSide() === 1 ? 2 : 0) : t.f;
        const lord = E.find(e => e.f === t.f && !hos(e.f, G.fac) && Math.hypot(e.x - t.x, e.y - t.y) < 15 * K);
        this.lord = lord;
        if (lord) {
            const [eq, o] = Figures.lordEq(lord);
            this.person(W / 2, this.HZ + 36, [{ ...eq, m: 0 }, { ...o, flag: null }], lord.nm + (lord.kr ? ' (panovník)' : ' (pán hradu)'), () => castleLord(this.ti, lord), 1.05);
        }
        const stL = Portraits.forLord({ nm: 'spravca' + t.n, f }); delete stL.crown; delete stL.helm; stL.age = .7; this.stewardLook = stL;
        this.person(W / 2 + (lord ? 120 : 0), this.HZ + (lord ? 70 : 36), [{ w: null, a: Portraits.forLord({ nm: 'x', f }).race === 'orc' ? 11 : 0, s: 0, h: null, m: 0 }, { ...Figures.lookOpts(stL) }], 'Správca hradu', () => castleSteward(this.ti), 1);
        const [geq, go] = Figures.lordEq({ f, id: this.ti + 3, nm: 'straz' });
        for (const gx of [W / 2 - 200, W / 2 + 200]) this.add.image(gx, this.HZ + 30, Art.bigFigure(this, { ...geq, m: 0 }, { ...go, flag: null, king: 0 })).setScale(.5 * .85).setDepth(this.HZ + 30).setFlipX(gx > W / 2);
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
        if (this.skyRect) { this.drawSky(s, ...this.skyRect); }
        else for (const [wx, wy] of this.windows) { this.drawSky(s, wx - 20, wy, 40, 80); s.fillStyle(C.trim, 1).fillRect(wx - 2, wy, 4, 80).fillRect(wx - 20, wy + 38, 40, 4); }
        // vyhňa a ohniská
        if (this.forge) { const [fx, fy] = this.forge; for (let k = 0; k < 5; k++) { const ph = t / 3 + k * 1.9, h = 10 + Math.sin(ph) * 4; f.fillStyle(0xff7a20, .9).fillTriangle(fx - 8 + k * 4 - 3, fy, fx - 8 + k * 4 + 3, fy, fx - 8 + k * 4 + Math.sin(ph) * 2, fy - h); } f.fillStyle(0xffd060, .9).fillTriangle(fx - 4, fy, fx + 4, fy, fx, fy - 6 - Math.sin(t / 2) * 2); for (let k = 0; k < 4; k++) { const a = (t * .9 + k * 17) % 50; f.fillStyle(0xffc040, .9 - a / 60).fillRect(fx - 6 + ((k * 5 + a * .4) % 12), fy - 12 - a, 1.5, 1.5); } }
        if (this.torches) for (const [tx, ty] of this.torches) { const ph = t / 2.5 + tx; f.fillStyle(0xff8a30, .95).fillTriangle(tx - 3, ty, tx + 3, ty, tx + Math.sin(ph) * 1.5, ty - 9 - Math.sin(ph * 1.7) * 2); f.fillStyle(0xffe080, .95).fillTriangle(tx - 1.5, ty, tx + 1.5, ty, tx + Math.sin(ph) * .8, ty - 4); }
        if (this.candles) for (const [cx2, cy2] of this.candles) { const ph = t / 2 + cx2; f.fillStyle(0xffd060, .95).fillEllipse(cx2 + Math.sin(ph) * .4, cy2 - 2, 1.6, 3.2); }
        if (this.braziers) for (const [bx, by] of this.braziers) { for (let k = 0; k < 4; k++) { const ph = t / 3 + k * 1.7, h = 12 + Math.sin(ph) * 4; f.fillStyle(this.th === 'mordor' ? 0xff3a10 : 0xff7a20, .9).fillTriangle(bx - 8 + k * 5 - 3, by, bx - 8 + k * 5 + 3, by, bx - 8 + k * 5 + Math.sin(ph) * 2, by - h); } }
        // svetlo
        const L = this.light; L.clear();
        const dark = this.roomKind === 'hall' ? .2 + nn * .25 : nn * .45;
        L.fillStyle(this.roomKind === 'hall' ? 0x000000 : 0x080e28, dark).fillRect(0, 0, W, H);
        if (!this.glows) {
            this.glows = [];
            if (this.roomKind === 'hall') { for (const [bx, by] of this.braziers || []) this.glows.push(Tex.light(this, bx, by, 190, C.light, .5)); this.glows.push(Tex.light(this, W / 2, 92, 160, 0xffe0a0, .35)); for (const [cx2, cy2] of this.candles || []) if (cy2 > 100) this.glows.push(Tex.light(this, cx2, cy2, 70, 0xffe0a0, .3)); }
            else { if (this.forge) this.glows.push(Tex.light(this, this.forge[0], this.forge[1], 130, 0xff9a40, .45)); for (const [tx, ty] of this.torches || []) this.glows.push(Tex.light(this, tx, ty, 90, 0xffb060, .0)); }
        }
        if (this.roomKind === 'hall') this.glows.forEach((l, i) => l.setAlpha(.42 + Math.sin(t / 2 + i) * .06));
        else { this.glows.forEach((l, i) => l.setAlpha(i === 0 && this.forge ? .4 + Math.sin(t / 2) * .08 : (.25 + Math.sin(t / 2.3 + i) * .06) * Math.min(1, nn * 1.6 + .15))); }
        this.people.forEach(p => { if (!p.spot) p.spr.y = p.y + Math.sin(t / 9 + p.t0) * .8; });
        this.movePlayer(dt);
    }
}
