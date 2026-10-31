/*
 * ENGINE: krčma – miestnosť, do ktorej hráč vstúpi z hradu. Beží nad mapou (mode = 'tavern', čas stojí).
 * Interiér sa kreslí kódom podľa témy hradu (ľudia, hobiti, elfovia, trpaslíci, zlo) a náhodného rozloženia
 * daného číslom hradu: krb, výčap s krčmárom, stoly so sviečkami, okno s dennou dobou a počasím, zástava frakcie.
 * Postavy: krčmár a spoločníci z filmu, ktorí tu čakajú (Figures vo veľkom). Klik na postavu otvorí rozhovor (js/ui/tavern.js).
 * Hudba krčmy je vlastná (sound.js, pásmo 't'/'tv'); hudba mapy ostáva nezmenená.
 */
class TavernScene extends RoomScene {
    constructor() { super('Tavern'); }
    init(d) { this.ti = d.i; }

    /** Téma krčmy podľa hradu a strany hráča. */
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
        const C = {
            human: { wall: 0x5a4432, wall2: 0x4a3626, floor: 0x6b4a2e, floor2: 0x5a3c24, beam: 0x3a2818, light: 0xffb060, bar: 0x4a3018 },
            hobbit: { wall: 0x8a6a48, wall2: 0x7a5a3c, floor: 0x7a5634, floor2: 0x6a4828, beam: 0x4a3018, light: 0xffc070, bar: 0x5a3a1a },
            elf: { wall: 0x3a4a44, wall2: 0x2e3c36, floor: 0x4a5a4e, floor2: 0x3e4e42, beam: 0x8a9a80, light: 0xc8e8ff, bar: 0x5a6a5a },
            dwarf: { wall: 0x4a4a52, wall2: 0x3a3a42, floor: 0x3e3a3a, floor2: 0x343030, beam: 0x8a7a50, light: 0xffa040, bar: 0x5a5250 },
            evil: { wall: 0x2a2224, wall2: 0x1e181a, floor: 0x2a2020, floor2: 0x221818, beam: 0x3a1a14, light: 0xff6030, bar: 0x3a2a24 },
            harad: { wall: 0x7a4a2a, wall2: 0x6a3e22, floor: 0x8a6a3a, floor2: 0x7a5a30, beam: 0x3a2010, light: 0xffc050, bar: 0x5a3a1a }
        }[th];
        this.C = C;
        const g = this.add.graphics().setDepth(0);
        const HZ = 290;                                             // horizont: hranica steny a podlahy
        // stena a podlaha z procedurálnych textúr (2× rozlíšenie), cez ne jemné tiene a trámy
        const hx6 = v => '#' + v.toString(16).padStart(6, '0');
        const wallKind = th === 'dwarf' ? 'bricks' : th === 'evil' ? 'dark' : th === 'elf' ? 'bark' : 'planks', floorKind = th === 'dwarf' || th === 'evil' ? 'flags' : th === 'elf' ? 'flags' : 'planks';
        this.add.tileSprite(0, 0, W, HZ, Tex.pattern(this, wallKind, hx6(C.wall), this.ti + 1)).setOrigin(0).setDepth(-1).setTileScale(.4);
        this.add.tileSprite(0, HZ, W, H - HZ, Tex.pattern(this, floorKind, hx6(C.floor), this.ti + 2)).setOrigin(0).setDepth(-1).setTileScale(.35);
        if (th === 'elf') { for (let x = 0; x < W; x += 90) { g.fillStyle(C.wall2, .8).fillRect(x + 40, 0, 10, HZ); g.lineStyle(2, 0x9ab8a0, .5); for (const d of [-1, 1]) { g.beginPath(); for (let k = 0; k <= 10; k++) { const u = k / 10, px = x + 45 + d * 60 * u * u, py = HZ - HZ * u; k ? g.lineTo(px, py) : g.moveTo(px, py); } g.strokePath(); } } }
        else if (th !== 'dwarf' && th !== 'evil') for (let x = 0; x < W; x += 120) { g.fillStyle(C.beam, 1).fillRect(x, 0, 8, HZ); g.fillStyle(0xffffff, .08).fillRect(x, 0, 2, HZ); }
        g.fillStyle(C.beam, 1).fillRect(0, 0, W, 14); g.fillStyle(0x000000, .25).fillRect(0, 14, W, 6);                 // trám pod stropom a jeho tieň
        g.fillStyle(C.beam, 1).fillRect(0, HZ - 6, W, 8); g.fillStyle(0x000000, .3).fillRect(0, HZ + 2, W, 10); g.fillStyle(0x000000, .12).fillRect(0, HZ + 12, W, 14);   // sokel a tieň steny na podlahe
        g.fillStyle(0x000000, .18).fillRect(0, 0, W, HZ * .25);                                                            // tmavší strop
        // okno
        this.winX = 90 + Math.floor(R(1) * 3) * 60; this.winY = 60;
        this.sky = this.add.graphics().setDepth(1);
        g.fillStyle(C.beam, 1).fillRect(this.winX - 6, this.winY - 6, 92, 72);
        if (th === 'hobbit') { g.fillStyle(C.beam, 1).fillCircle(this.winX + 40, this.winY + 30, 44); }
        // krb
        this.fireX = R(2) < .5 ? W - 130 : 250 + Math.floor(R(3) * 2) * 90;
        const fx = this.fireX;
        g.fillStyle(th === 'evil' ? 0x1a1414 : 0x6a6660, 1).fillRect(fx - 50, HZ - 140, 100, 140);
        for (let y = HZ - 140; y < HZ; y += 14) for (let x = fx - 50 + ((y / 14) % 2) * 12; x < fx + 50; x += 24) g.fillStyle(th === 'evil' ? 0x241c1c : (x + y) % 48 < 24 ? 0x7a766e : 0x8a8680, 1).fillRoundedRect(x, y, 22, 12, 2);
        g.fillStyle(0x100a08, 1).fillRoundedRect(fx - 34, HZ - 90, 68, 90, { tl: 20, tr: 20, bl: 0, br: 0 });
        g.fillStyle(th === 'evil' ? 0x3a2a24 : 0x9a9690, 1).fillRect(fx - 56, HZ - 146, 112, 8);
        g.fillStyle(0x3a2a1a, 1).fillRect(fx - 22, HZ - 14, 44, 6).fillRect(fx - 16, HZ - 20, 32, 6);  // polená
        this.fire = this.add.graphics().setDepth(2);
        // výčap na opačnej strane ako krb
        this.barX = fx > W / 2 ? 60 : W - 240;
        const bx = this.barX;
        g.fillStyle(C.bar, 1).fillRect(bx, HZ + 40, 180, 60);
        g.fillStyle(0x000000, .25).fillRect(bx, HZ + 96, 180, 6);
        g.fillStyle(th === 'elf' ? 0x9ab8a0 : 0x8a6a40, 1).fillRect(bx - 6, HZ + 34, 192, 8);          // pult
        // police s fľašami
        g.fillStyle(C.beam, 1).fillRect(bx + 10, 70, 160, 6).fillRect(bx + 10, 120, 160, 6);
        for (let k = 0; k < 9; k++) { const col = [0x4a7a3a, 0x7a3a2a, 0x3a4a7a, 0xc8a040, 0x6a2a5a][k % 5]; g.fillStyle(col, 1).fillRect(bx + 16 + k * 17, 70 - 16 - (k % 3) * 3, 9, 16 + (k % 3) * 3); g.fillStyle(0x2a1a10, 1).fillRect(bx + 19 + k * 17, 70 - 22 - (k % 3) * 3, 3, 6); }
        for (let k = 0; k < 4; k++) { g.fillStyle(0x7a5a30, 1).fillRoundedRect(bx + 14 + k * 40, 96, 26, 24, 4); g.fillStyle(0x3a2a1a, 1).fillRect(bx + 14 + k * 40, 102, 26, 2).fillRect(bx + 14 + k * 40, 114, 26, 2); } // sudy na polici
        // sudy pri výčape
        const sdx = bx < W / 2 ? bx + 190 : bx - 44;
        for (let k = 0; k < 2; k++) { const sx = sdx + k * 6, sy = HZ + 44 + k * 34; g.fillStyle(0x000000, .25).fillEllipse(sx + 17, sy + 46, 40, 10); g.fillStyle(0x8a6a3a, 1).fillRoundedRect(sx, sy, 34, 44, 6); g.fillStyle(0x5a3e22, 1).fillRect(sx + 24, sy + 2, 8, 40); g.fillStyle(0x3a2a1a, 1).fillRect(sx, sy + 10, 34, 3).fillRect(sx, sy + 32, 34, 3); }
        // stoly
        this.tables = [];
        const nt = 2 + Math.floor(R(4) * 2);
        for (let k = 0; k < nt; k++) {
            const tx = 150 + k * (W - 300) / Math.max(1, nt - 1) + (R(5 + k) - .5) * 40, ty = HZ + 70 + (k % 2) * 70 + R(9 + k) * 20;
            if (Math.abs(tx - (bx + 90)) < 130 && ty < HZ + 110) continue;
            this.tables.push([tx, ty]);
            g.fillStyle(0x000000, .25).fillEllipse(tx, ty + 14, 90, 22);
            g.fillStyle(th === 'elf' ? 0x8aa090 : 0x5a3a1c, 1).fillRect(tx - 36, ty - 2, 8, 30).fillRect(tx + 28, ty - 2, 8, 30);
            g.fillStyle(th === 'elf' ? 0xb8c8b0 : 0x8a5a2e, 1).fillEllipse(tx, ty, 90, 26);
            g.fillStyle(th === 'elf' ? 0x98a890 : 0x6a4420, 1).fillEllipse(tx, ty + 1, 84, 20);
            for (const [mx, my] of [[-18, -4], [16, 2]]) { g.fillStyle(0xc8903a, 1).fillRect(tx + mx, ty + my - 8, 8, 10); g.fillStyle(0xfff4dc, 1).fillRect(tx + mx, ty + my - 10, 8, 3); }
            g.fillStyle(0xf0e0c0, 1).fillRect(tx - 2, ty - 14, 4, 12);                             // sviečka
            for (const sx of [-50, 50]) { g.fillStyle(0x4a3018, 1).fillRect(tx + sx - 10, ty + 8, 20, 6).fillRect(tx + sx - 8, ty + 14, 4, 12).fillRect(tx + sx + 4, ty + 14, 4, 12); }   // stoličky
        }
        // zástava frakcie a výzdoba
        const bkey = Art.banner(this, t.f); this.add.image(this.winX + 150, 40, bkey).setOrigin(0, 0).setScale(2.4).setDepth(1);
        this.decor(g, th, HZ);
        // postavy
        this.people = [];
        this.spawn(t, th, HZ);
        this.setupRoom({ mode: 'tavern', floorY: 290, amb: th === 'evil' ? 'tavernEvil' : th === 'elf' ? 'elf' : 'tavern', floorSnd: th === 'dwarf' || th === 'evil' || th === 'elf' ? 'stone' : 'wood', title: (th === 'evil' ? 'Brloh v ' : th === 'elf' ? 'Sieň v ' : 'Krčma v ') + t.n, leave: 'Odísť z krčmy', spawn: [W / 2, H - 40],
            block: [[this.barX - 6, HZ + 34, 192, 66]] });
    }

    /** Tematická výzdoba steny. */
    decor(g, th, HZ) {
        if (th === 'evil') {
            for (let k = 0; k < 3; k++) { const x = 40 + k * 60, y = 40 + (k % 2) * 20; g.fillStyle(0xe8e4d8, 1).fillCircle(x, y, 7); g.fillRect(x - 5, y + 2, 10, 6); g.fillStyle(0x1a1210, 1).fillCircle(x - 2.5, y - 1, 1.8).fillCircle(x + 2.5, y - 1, 1.8); }   // lebky
            g.lineStyle(2, 0x5a5a60, 1); for (let k = 0; k < 6; k++) g.strokeEllipse(W - 60, 30 + k * 10, 8, 6);   // reťaz
            g.fillStyle(0x6a1a10, 1).fillTriangle(W / 2 - 30, 14, W / 2 + 30, 14, W / 2, 90); g.fillStyle(0xff6a20, 1).fillEllipse(W / 2, 44, 18, 9); g.fillStyle(0x000000, 1).fillEllipse(W / 2, 44, 4, 9);  // zástava s okom
        }
        if (th === 'elf') { for (let k = 0; k < 5; k++) { const x = 60 + k * 150; g.fillStyle(0xc8e8ff, .9).fillCircle(x, 50 + (k % 2) * 30, 5); g.lineStyle(1, 0x9ab8a0, .8).lineBetween(x, 14, x, 45 + (k % 2) * 30); } }
        if (th === 'dwarf') { g.fillStyle(0x8a8a90, 1).fillRect(W / 2 - 24, HZ - 40, 48, 10).fillRect(W / 2 - 10, HZ - 30, 20, 30); for (let k = 0; k < 4; k++) { g.fillStyle([0x3a8ae0, 0xd8402a, 0x7ab84a, 0xe8b84a][k], 1).fillRect(80 + k * 30, 60, 8, 10); } }
        if (th === 'hobbit') { for (let k = 0; k < 3; k++) { g.fillStyle(0xc8a060, 1).fillEllipse(W - 80 + (k % 2) * 30, 50 + k * 30, 26, 12); g.fillStyle(0x8a5a30, 1).fillEllipse(W - 80 + (k % 2) * 30, 48 + k * 30, 20, 7); } }
        if (th === 'harad') { g.fillStyle(0xd9a441, 1); for (let k = 0; k < 6; k++) g.fillTriangle(W / 2 - 90 + k * 36, 14, W / 2 - 72 + k * 36, 14, W / 2 - 81 + k * 36, 40); }
    }

    /** Postavy: krčmár za výčapom, spoločníci pri stoloch. */
    spawn(t, th, HZ) {
        const keeperEq = { evil: [{ w: null, a: 11, s: 0, h: 5, m: 0 }, { orc: 1, mug: 1 }], harad: [{ w: null, a: 8, s: 0, h: 7, m: 0 }, { dark: 1, mug: 1 }], elf: [{ w: null, a: 3, s: 0, h: null, m: 0 }, { hair: 'long', mug: 1 }],
            dwarf: [{ w: null, a: 4, s: 0, h: null, m: 0 }, { beard: '#c8a060', apron: 1, mug: 1 }], hobbit: [{ w: null, a: 0, s: 0, h: null, m: 0 }, { hair: '#b08a50', apron: 1, mug: 1 }], human: [{ w: null, a: 0, s: 0, h: null, m: 0 }, { apron: 1, mug: 1 }] }[th];
        const kn = { evil: 'Shagrat, správca brlohu', harad: 'Hostinský z juhu', elf: 'Hostiteľ siene', dwarf: 'Krčmár Bofur', hobbit: 'Hostinský Jačmienko', human: 'Krčmár' }[th];
        keeperEq[1] = { ...keeperEq[1], ...Figures.lookOpts(KEEPER_LOOK[th] || KEEPER_LOOK.human) };
        this.person(this.barX + 90, HZ + 44, keeperEq, kn, () => tavKeeper(this.ti), .85);
        const list = compsAt(t);
        list.forEach((c, k) => {
            const tb = this.tables[k % Math.max(1, this.tables.length)] || [W / 2, HZ + 100];
            const side = k % 2 ? 1 : -1;
            this.person(tb[0] + side * 66, tb[1] + 10, Figures.compEq(c, true), c.n, () => tavTalk(this.ti, c), 1);
        });
        this.comps = list;
    }

    /** Po pripojení spoločníka alebo zmene obnoví postavy. */
    refresh() { this.clearPeople(); this.spawn(TW[this.ti], this.th, 290); }

    leave() {
        if (mode !== 'tavern') return;
        if (ROOM && ROOM.from === 'yard') { this.scene.stop(); enterCastle(this.ti, 'yard'); return; }   // späť na nádvorie
        ROOM = null;
        mode = 'town';
        this.closeRoom();
        town(this.ti);
    }

    update(time, delta) {
        const dt = Math.min(3, (delta || 16.7) / 16.67);
        if (mode !== 'tavern') { if (mode !== 'town' && mode !== 'castle') this.closeRoom(); return; }
        const C = this.C, th = this.th, HZ = 290, t = tm;
        // obloha v okne podľa dennej doby a počasia
        const s = this.sky; s.clear();
        const nn = nightness(), wx = this.winX, wy = this.winY;
        this.drawSky(s, wx, wy, 80, 60, th === 'hobbit');
        s.fillStyle(C.beam, 1).fillRect(wx + 38, wy, 4, 60).fillRect(wx, wy + 28, 80, 4);     // kríž okna
        // oheň
        const f = this.fire; f.clear();
        const fx = this.fireX, base = HZ - 16, evil = th === 'evil', col1 = evil ? 0xff3a10 : 0xff7a20, col2 = evil ? 0xff8a40 : 0xffd060;
        for (let k = 0; k < 7; k++) { const ph = t / 3 + k * 1.7, h = 26 + Math.sin(ph) * 8 + Math.sin(ph * 2.3) * 4, x = fx - 18 + k * 6 + Math.sin(ph * 1.3) * 2; f.fillStyle(col1, .85).fillTriangle(x - 6, base, x + 6, base, x + Math.sin(ph) * 3, base - h); }
        for (let k = 0; k < 5; k++) { const ph = t / 2.6 + k * 2.1, h = 14 + Math.sin(ph) * 5, x = fx - 12 + k * 6; f.fillStyle(col2, .9).fillTriangle(x - 3.5, base, x + 3.5, base, x + Math.sin(ph) * 2, base - h); }
        for (let k = 0; k < 6; k++) { const a = (t * .8 + k * 23) % 70; f.fillStyle(col2, .8 - a / 90).fillRect(fx - 10 + ((k * 7 + a * .3) % 20), base - 30 - a, 1.5, 1.5); }   // iskry
        for (let k = 0; k < 4; k++) { const a = (t * .5 + k * 20) % 80; f.fillStyle(0x4a403a, .25 - a / 400).fillCircle(fx + Math.sin(a * .1 + k) * 6, HZ - 100 - a * .6, 6 + a * .12); }   // dym
        // svetlo: tmavé rohy, teplá žiara krbu a sviečok, mihotanie
        const L = this.light; L.clear();
        const dark = .25 + nn * .3;
        L.fillStyle(0x000000, dark).fillRect(0, 0, W, H);
        const flick = .08 + Math.sin(t / 2.2) * .02 + Math.sin(t / 1.3) * .015;
        if (!this.glows) {   // mäkké žiary: krb, sviečky na stoloch, výčap
            this.glows = [Tex.light(this, fx, HZ - 40, 300, C.light, .55), Tex.light(this, fx, HZ - 30, 120, 0xffe0a0, .5), Tex.light(this, this.barX + 90, HZ + 20, 150, 0xffe0a0, .22)];
            for (const [tx, ty] of this.tables) this.glows.push(Tex.light(this, tx, ty - 12, 90, 0xffd090, .35));
        }
        this.glows[0].setAlpha(.5 + flick * 1.5); this.glows[1].setAlpha(.45 + Math.sin(t / 1.3) * .08);
        for (let k = 3; k < this.glows.length; k++) this.glows[k].setAlpha(.3 + Math.sin(t / 1.7 + k) * .06);
        L.fillStyle(0x000000, .35).fillRect(0, 0, W, 14);
        // jemné pohupovanie postáv
        this.people.forEach(p => { p.spr.y = p.y + Math.sin(t / 9 + p.t0) * .8; });
        this.movePlayer(dt);
    }
}
