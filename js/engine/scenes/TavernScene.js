/*
 * ENGINE: krčma v izometrii (základ IsoRoom). init({ i }): i = hrad. mode = 'tavern'.
 * Téma podľa hradu (ľudia, hobiti, elfovia, trpaslíci, brloh zla, juh): textúry stien a podlahy, krb v ľavej stene,
 * výčap pri pravej stene s policami fliaš, okná s dennou dobou, zástava frakcie, stoly so stoličkami a sviečkami, sudy.
 * Postavy: krčmár za výčapom, spoločníci pri stoloch (js/ui/tavern.js). Hudba krčmy je v js/audio/sound.js.
 */
class TavernScene extends IsoRoom {
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
        this.setIso(320, 230, 120);
        this.candles = [];
        const wallKind = th === 'dwarf' ? 'bricks' : th === 'evil' ? 'dark' : th === 'elf' ? 'bark' : 'planksV', floorKind = th === 'dwarf' || th === 'evil' || th === 'elf' ? 'flags' : 'planks';
        this.floor(floorKind, C.floor, this.ti + 2);
        this.wallL(wallKind, C.wall, this.ti + 1); this.wallR(wallKind, C.wall, this.ti + 1);
        const FW = this.FW, FD = this.FD, WH = this.WH, beam = '#' + C.beam.toString(16).padStart(6, '0');
        // trámy pod stropom a pri soklu
        this.onWallL(c => { c.fillStyle = beam; c.fillRect(0, WH - 10, FD, 10); c.fillRect(0, 0, FD, 7); for (let u = 40; u < FD; u += 70) c.fillRect(u, 0, 8, WH); });
        this.onWallR(c => { c.fillStyle = beam; c.fillRect(0, WH - 10, FW, 10); c.fillRect(0, 0, FW, 7); for (let u = 40; u < FW; u += 70) c.fillRect(u, 0, 8, WH); });
        // krb v ľavej stene
        const fu = FD - 110;
        this.onWallL(c => { c.fillStyle = th === 'evil' ? '#1a1414' : '#6a6660'; c.fillRect(fu - 44, 0, 88, 92); for (let v = 0; v < 92; v += 12) for (let u = fu - 44 + ((v / 12) % 2) * 11; u < fu + 44; u += 22) { c.fillStyle = th === 'evil' ? '#241c1c' : (u + v) % 44 < 22 ? '#7a766e' : '#8a8680'; c.fillRect(u, v, 20, 10); } c.fillStyle = th === 'evil' ? '#3a2a24' : '#9a9690'; c.fillRect(fu - 50, 90, 100, 8); c.fillStyle = '#0a0806'; c.fillRect(fu - 28, 0, 56, 50); });
        this.fire = [4, fu];
        // výčap pri pravej stene, police s fľašami, sudy
        const bx = FW - 150, by = 26;
        this.box(bx, by, 120, 26, 30, C.bar, { top: this.shade(C.bar, 1.35) });
        this.onWallR(c => { for (const v of [60, 84]) { c.fillStyle = '#3a2a1a'; c.fillRect(bx - 10, v, 140, 5); for (let k = 0; k < 9; k++) { c.fillStyle = ['#3a6a2a', '#a02a1a', '#2a4a8a', '#d8c060', '#6a2a6a', '#c8c0b0', '#2a6a6a', '#8a4a2a', '#4a7a3a'][(k + v) % 9]; c.fillRect(bx - 4 + k * 15, v + 5, 6, 14); c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(bx - 3 + k * 15, v + 7, 1.5, 9); } } });
        this.cyl(bx - 24, 16, 11, 24, '#5a3a1e', { hoops: 1 }); this.cyl(bx - 24, 40, 11, 24, '#5a3a1e', { hoops: 1 }); this.cyl(bx + 100, by + 40, 10, 20, '#5a3a1e', { hoops: 1 });
        this.barX = bx; this.barY = by;
        for (let k = 0; k < 3; k++) this.cyl(22, 30 + k * 28, 11, 26, '#5a3a1e', { hoops: 1 });
        // okná na pravej stene (obloha sa kreslí každý snímok)
        this.windows = [60, bx - 70].map(u => ({ u, v: 56, w: 34, h: 30 }));
        this.onWallR(c => { for (const w of this.windows) { c.fillStyle = beam; c.fillRect(w.u - 5, w.v - 5, w.w + 10, w.h + 10); } });
        this.sky = this.add.graphics().setDepth(.5);
        // zástava frakcie na ľavej stene
        this.sprite(2, 50, Art.banner(this, t.f), 1.7).setDepth(.6);
        // dlhé stoly s lavicami a sviečkami (ako v sieni hradu); this.tables = stredy stolov
        const spots = [[50, 92], [160, 124], [44, 164]].slice(0, 2 + Math.floor(R(1) * 2));
        this.tables = spots.map(([x, y]) => [x + 45, y + 13]);
        spots.forEach(([x, y]) => {
            this.box(x, y, 90, 26, 17, C.table, { top: this.shade(C.table, 1.2) });
            this.box(x + 4, y - 12, 82, 9, 9, this.shade(C.table, .78)); this.box(x + 4, y + 29, 82, 9, 9, this.shade(C.table, .78));
            for (let k = 0; k < 3; k++) { this.candles.push([x + 16 + k * 29, y + 13, 17]); this.prop(x + 16 + k * 29, y + 13, (g, sx, sy) => { g.fillStyle(0xf0e0c0, 1).fillRect(sx - 1.2, sy - 25, 2.4, 8); g.fillStyle(0xd9b060, 1).fillRect(sx + 6, sy - 22, 5, 6); g.fillStyle(0xfff4dc, 1).fillRect(sx + 6, sy - 23, 5, 2); }, 1); }
        });
        this.decor(th);
        this.fx = this.add.graphics().setDepth(1700);
        this.spawn(t, th);
        this.setupRoom({ mode: 'tavern', title: (th === 'evil' ? 'Brloh v ' : th === 'elf' ? 'Sieň v ' : 'Krčma v ') + t.n, leave: 'Odísť z krčmy', spawn: [FW - 60, FD - 40], amb: th === 'evil' ? 'tavernEvil' : th === 'elf' ? 'elf' : 'tavern', floorSnd: floorKind === 'planks' ? 'wood' : 'stone' });
        this.commitBg();
    }

    /** Tematická výzdoba stien. */
    decor(th) {
        const FD = this.FD, FW = this.FW;
        if (th === 'evil') this.onWallL(c => { for (let k = 0; k < 3; k++) { const u = 30 + k * 40, v = 70; c.fillStyle = '#e8e4d8'; c.beginPath(); c.arc(u, v, 6, 0, 7); c.fill(); c.fillRect(u - 4, v - 8, 8, 5); c.fillStyle = '#1a1210'; c.fillRect(u - 3, v + 1, 2, 2); c.fillRect(u + 1, v + 1, 2, 2); } });
        if (th === 'elf') this.onWallR(c => { c.strokeStyle = 'rgba(200,230,200,.6)'; c.lineWidth = 1.5; for (let u = 20; u < FW; u += 60) { c.beginPath(); c.moveTo(u, 0); c.bezierCurveTo(u - 12, 40, u + 12, 80, u, 118); c.stroke(); } });
        if (th === 'dwarf') this.onWallR(c => { for (let k = 0; k < 4; k++) { c.fillStyle = ['#3a8ae0', '#d8402a', '#7ab84a', '#e8b84a'][k]; c.fillRect(30 + k * 24, 96, 10, 12); } c.fillStyle = '#8a8a90'; c.fillRect(20, 92, 110, 4); });
        if (th === 'hobbit') this.onWallL(c => { for (let k = 0; k < 3; k++) { c.fillStyle = '#c8a060'; c.beginPath(); c.ellipse(FD - 40 - k * 26, 70 + (k % 2) * 14, 11, 6, 0, 0, 7); c.fill(); c.fillStyle = '#8a5a30'; c.beginPath(); c.ellipse(FD - 40 - k * 26, 68 + (k % 2) * 14, 8, 3, 0, 0, 7); c.fill(); } });
        if (th === 'harad') this.onWallR(c => { c.fillStyle = '#d9a441'; for (let k = 0; k < 7; k++) { c.beginPath(); c.moveTo(60 + k * 30, 110); c.lineTo(78 + k * 30, 110); c.lineTo(69 + k * 30, 92); c.fill(); } });
    }

    /** Postavy: krčmár za výčapom, spoločníci pri stoloch. */
    spawn(t, th) {
        const keeperEq = { evil: [{ w: null, a: 11, s: 0, h: 5, m: 0 }, { orc: 1, mug: 1 }], harad: [{ w: null, a: 8, s: 0, h: 7, m: 0 }, { dark: 1, mug: 1 }], elf: [{ w: null, a: 3, s: 0, h: null, m: 0 }, { hair: 'long', mug: 1 }],
            dwarf: [{ w: null, a: 4, s: 0, h: null, m: 0 }, { beard: '#c8a060', apron: 1, mug: 1 }], hobbit: [{ w: null, a: 0, s: 0, h: null, m: 0 }, { hair: '#b08a50', apron: 1, mug: 1 }], human: [{ w: null, a: 0, s: 0, h: null, m: 0 }, { apron: 1, mug: 1 }] }[th];
        const kn = { evil: 'Shagrat, správca brlohu', harad: 'Hostinský z juhu', elf: 'Hostiteľ siene', dwarf: 'Krčmár Bofur', hobbit: 'Hostinský Jačmienko', human: 'Krčmár' }[th];
        keeperEq[1] = { ...keeperEq[1], ...Figures.lookOpts(KEEPER_LOOK[th] || KEEPER_LOOK.human) };
        this.person(this.barX + 60, this.barY - 8, keeperEq, kn, () => tavKeeper(this.ti), .85);
        const list = compsAt(t);
        list.forEach((c, k) => {
            const tb = this.tables[k % this.tables.length], side = k % 2 ? 1 : -1;
            this.person(tb[0] + (Math.floor(k / 2) % 2 ? 22 : -22), tb[1] + side * 33, Figures.compEq(c, true), c.n, () => tavTalk(this.ti, c), .95);
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
        const C = this.C, th = this.th, t = tm, nn = nightness();
        // okná: obloha premietnutá na pravú stenu
        const s = this.sky; s.clear();
        for (const w of this.windows) {
            const [ax, ay] = this.P(w.u, 0, w.v + w.h), [bx, by] = this.P(w.u + w.w, 0, w.v + w.h), [cx, cy] = this.P(w.u + w.w, 0, w.v), [dx, dy] = this.P(w.u, 0, w.v);
            const day = 1 - nn; s.fillStyle(Phaser.Display.Color.GetColor(40 + 120 * day, 60 + 120 * day, 90 + 140 * day), 1); s.fillPoints([{ x: ax, y: ay }, { x: bx, y: by }, { x: cx, y: cy }, { x: dx, y: dy }], true);
            if (nn > .4) { s.fillStyle(0xfff4d0, 1).fillCircle(ax + 24, ay + 12, 4); s.fillStyle(0xffffff, 1); for (let k = 0; k < 5; k++) s.fillRect(ax + 4 + (k * 7) % (w.w - 6), ay + 6 + (k * 11) % 14, 1.5, 1.5); }
            s.lineStyle(2, C.beam, 1).lineBetween((ax + bx) / 2, (ay + by) / 2, (dx + cx) / 2, (dy + cy) / 2).lineBetween((ax + dx) / 2, (ay + dy) / 2, (bx + cx) / 2, (by + cy) / 2);
        }
        // oheň v krbe
        const f = this.fx; f.clear();
        const [fx, fy] = this.P(this.fire[0], this.fire[1], 4), evil = th === 'evil', col1 = evil ? 0xff3a10 : 0xff7a20, col2 = evil ? 0xff8a40 : 0xffd060;
        for (let k = 0; k < 6; k++) { const ph = t / 3 + k * 1.7, h = 18 + Math.sin(ph) * 6 + Math.sin(ph * 2.3) * 3, x = fx - 12 + k * 5 + Math.sin(ph * 1.3) * 2; f.fillStyle(col1, .85).fillTriangle(x - 4, fy, x + 4, fy, x + Math.sin(ph) * 2, fy - h); }
        for (let k = 0; k < 4; k++) { const ph = t / 2.6 + k * 2.1, h = 10 + Math.sin(ph) * 4, x = fx - 8 + k * 5; f.fillStyle(col2, .9).fillTriangle(x - 2.5, fy, x + 2.5, fy, x + Math.sin(ph) * 1.5, fy - h); }
        for (let k = 0; k < 5; k++) { const a = (t * .8 + k * 23) % 60; f.fillStyle(col2, .8 - a / 80).fillRect(fx - 6 + ((k * 7 + a * .3) % 14), fy - 20 - a, 1.5, 1.5); }
        // svetlo: tmavé rohy, žiara krbu a sviečok
        const L = this.light; L.clear();
        L.fillStyle(0x000000, .2 + nn * .25).fillRect(0, 0, W, H);
        if (!this.glows) {
            this.glows = [this.glow(this.fire[0] + 20, this.fire[1], 30, 260, C.light, .55), this.glow(this.fire[0] + 10, this.fire[1], 20, 110, 0xffe0a0, .5), this.glow(this.barX + 60, this.barY + 10, 30, 140, 0xffe0a0, .22)];
            for (const [tx, ty] of this.tables) this.glows.push(this.glow(tx, ty, 26, 90, 0xffe0a0, .3));
        }
        const flick = .08 + Math.sin(t / 2.2) * .02 + Math.sin(t / 1.3) * .015;
        this.glows[0].setAlpha(.42 + flick * 1.2); this.glows[1].setAlpha(.38 + Math.sin(t / 1.3) * .06);
        for (let k = 3; k < this.glows.length; k++) this.glows[k].setAlpha(.28 + Math.sin(t / 1.7 + k) * .05);
        for (const [cx, cy, cz] of this.candles) { const [sx, sy] = this.P(cx, cy, cz), ph = t / 2 + cx; f.fillStyle(0xffd060, .95).fillEllipse(sx + Math.sin(ph) * .4, sy - 10, 1.6, 3.2); }
        this.people.forEach(p => { if (!p.spot) p.spr.y = p.sy + Math.sin(t / 9 + p.t0) * .8; });
        this.movePlayer(dt);
    }
}
