/*
 * ENGINE: vnútro dediny – náves, po ktorej chodí hráč (základ RoomScene). init({ v }): v = číslo dediny vo VL. mode = 'room'.
 * Vzhľad podľa kraja (regionAt: zelené kraje = slamené chalupy a polia, sever = zruby so snehom, Mordor = čierne chatrče
 * s kolmi, juh = hlinené domy s plachtami) a podľa strany pána dediny (zlo: orkský dozorca, lebky, klietka).
 * Postavy: starosta/náčelník (klebety, ochrana, prosba o pomoc), kupec (trh), dobrovoľníci; miesta: studňa, kaplnka/oltár, krčmička.
 * Rozhovory v js/ui/village.js. Vypálená dedina: ruiny a dym, len starosta.
 */
class VillageScene extends RoomScene {
    constructor() { super('Village'); }
    init(d) { this.vi = d.v; }

    theme() {
        const v = VL[this.vi], f = TW[v.t].f, evil = bloc(f) === 1 && f !== 6 || (f === 6 && heroSide() === 1);
        const reg = typeof regionAt === 'function' ? regionAt(v.x, v.y) : 'g';
        return { reg, evil, burned: v.st > 0, kind: reg === 'a' ? 'ash' : reg === 'd' ? 'desert' : reg === 's' ? 'north' : 'green' };
    }

    create() {
        this.cameras.main.setZoom(RES).setOrigin(0, 0);
        const v = VL[this.vi], t = TW[v.t], T = this.theme(), seed = this.vi * 7 + 3, R = n => { const x = Math.sin((seed + n) * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
        this.T = T; this.R = R; this.v = v;
        const HZ = 230; this.HZ = HZ;
        const hx6 = c => '#' + c.toString(16).padStart(6, '0');
        const P = { green: { ground: 0x5a7a3a, hill: 0x4a6a34, hill2: 0x3a5a2c, wall: 0xc8b890, roof: 0xa08848, roof2: 0x806a38, beam: 0x5a3a1a, groundKind: 'grass' },
            north: { ground: 0xe6ecf4, hill: 0xbcc8d8, hill2: 0x8a9ab0, wall: 0x6a4a2a, roof: 0xe8eef8, roof2: 0xc8d0dc, beam: 0x3a2a1a, groundKind: 'snow' },
            ash: { ground: 0x3a3230, hill: 0x2a2424, hill2: 0x1a1616, wall: 0x2a2224, roof: 0x1a1416, roof2: 0x100c0e, beam: 0x3a1a14, groundKind: 'mud' },
            desert: { ground: 0xc8b080, hill: 0xb89a60, hill2: 0x9a7e48, wall: 0xd8b888, roof: 0xb89a68, roof2: 0x9a7e50, beam: 0x6a4a2a, groundKind: 'sand' } }[T.kind];
        this.P = P;
        this.sky = this.add.graphics().setDepth(0); this.skyRect = [0, 0, W, 120];
        const g = this.add.graphics().setDepth(1);
        // kopce / hory na obzore
        g.fillStyle(P.hill2, 1); for (let k = 0; k < 6; k++) g.fillEllipse(k * 150 - 20, 128 + R(k) * 10, 260, 70 + R(k + 9) * 30);
        g.fillStyle(P.hill, 1); for (let k = 0; k < 7; k++) g.fillEllipse(k * 130 + 10, 150 + R(k + 20) * 8, 220, 50 + R(k + 30) * 20);
        if (T.kind === 'ash') { g.fillStyle(0xff4a10, .25); for (let k = 0; k < 4; k++) g.fillEllipse(140 + k * 160, 118, 60, 10); }   // žiara Hory osudu
        // zem
        this.add.tileSprite(0, HZ - 60, W, H - HZ + 60, Tex.pattern(this, P.groundKind, hx6(P.ground), seed)).setOrigin(0).setDepth(-1).setTileScale(.35);
        g.fillStyle(P.hill, 1).fillRect(0, HZ - 64, W, 8);
        // polia / záhony za dedinou
        if (T.kind === 'green' || T.kind === 'desert') for (let k = 0; k < 14; k++) { g.fillStyle(T.kind === 'green' ? (k % 2 ? 0xc8a040 : 0x7a9a3a) : 0x9a8a40, .8).fillRect(20 + k * 50, HZ - 56, 40, 4); g.fillStyle(0x000000, .15).fillRect(20 + k * 50, HZ - 52, 40, 1.5); }
        // cesta cez náves
        g.fillStyle(T.kind === 'north' ? 0xc8ccd4 : T.kind === 'ash' ? 0x2a2626 : 0x9a8a5a, .8); g.fillEllipse(W / 2, H - 40, W * 1.3, 90); g.fillRect(W / 2 - 40, HZ - 20, 80, H - HZ);
        // domy
        const houses = T.kind === 'ash' ? [[90, HZ + 10, 1], [W - 110, HZ + 16, 1], [W / 2 + 150, HZ - 10, .8]] : [[90, HZ + 10, 1], [W - 110, HZ + 16, 1.05], [W / 2 - 160, HZ - 14, .85], [W / 2 + 170, HZ - 12, .85]];
        houses.forEach(([hx, hy, sc], i) => this.house(g, hx, hy, sc, P, T, R, i));
        // studňa v strede, kaplnka/oltár, klietka pri zle
        const wx = W / 2 + 70, wy = HZ + 110;
        g.fillStyle(0x000000, .2).fillEllipse(wx, wy + 8, 56, 16);
        g.fillStyle(T.kind === 'ash' ? 0x2a2224 : 0x8a8a84, 1).fillEllipse(wx, wy, 44, 18); g.fillStyle(0x15100c, 1).fillEllipse(wx, wy - 2, 30, 11);
        g.fillStyle(P.beam, 1).fillRect(wx - 20, wy - 40, 4, 40).fillRect(wx + 16, wy - 40, 4, 40); g.fillStyle(P.roof2, 1).fillTriangle(wx - 28, wy - 38, wx + 28, wy - 38, wx, wy - 56); g.fillStyle(0x3a2a1a, 1).fillRect(wx - 2, wy - 36, 4, 20); g.fillStyle(0x8a8a90, 1).fillRect(wx - 5, wy - 20, 10, 8);
        this.well = [wx, wy];
        const cx = 300, cy = HZ + 40;
        if (T.evil) { // oltár s lebkami a klietka
            g.fillStyle(0x2a2224, 1).fillRect(cx - 18, cy - 20, 36, 22); g.fillStyle(0x1a1416, 1).fillRect(cx - 22, cy - 24, 44, 6); g.fillStyle(0xe8e4d8, 1); for (let k = 0; k < 3; k++) g.fillCircle(cx - 10 + k * 10, cy - 28, 4); g.fillStyle(0x1a1210, 1); for (let k = 0; k < 3; k++) g.fillRect(cx - 12 + k * 10, cy - 29, 1.5, 1.5).fillRect(cx - 8 + k * 10, cy - 29, 1.5, 1.5);
            g.lineStyle(2, 0x3a3a40, 1); const kx = W - 240, ky = HZ + 20; g.strokeRect(kx - 14, ky - 40, 28, 40); for (let k = 1; k < 4; k++) g.lineBetween(kx - 14 + k * 7, ky - 40, kx - 14 + k * 7, ky); g.fillStyle(0xe2bf96, 1).fillCircle(kx, ky - 26, 4); g.fillStyle(0x8a6a4a, 1).fillRect(kx - 4, ky - 22, 8, 14);
            this.altar = [cx, cy];
        } else { // kaplnka / svätyňa
            g.fillStyle(P.wall, 1).fillRect(cx - 20, cy - 44, 40, 44); g.fillStyle(P.roof, 1).fillTriangle(cx - 26, cy - 44, cx + 26, cy - 44, cx, cy - 70); g.fillStyle(0x15100c, 1).fillRoundedRect(cx - 7, cy - 24, 14, 24, { tl: 7, tr: 7, bl: 0, br: 0 });
            g.fillStyle(T.kind === 'green' ? 0xe8e8e8 : 0xd9a441, 1).fillRect(cx - 1.5, cy - 82, 3, 14).fillRect(cx - 5, cy - 78, 10, 2.5);
            if (T.reg === 's' || T.reg === 'g') { g.fillStyle(0xf0f0f0, .9).fillRect(cx - 40, cy - 6, 6, 10); g.fillStyle(0x4a7a4a, .9).fillCircle(cx - 37, cy - 10, 5); }   // hrob s kvetom
            this.chapel = [cx, cy];
        }
        // ploty, zvieratá, vozy
        g.fillStyle(P.beam, 1); for (let k = 0; k < 8; k++) g.fillRect(20 + k * 14, HZ + 150, 3, 16); g.fillRect(20, HZ + 154, 112, 2.5).fillRect(20, HZ + 161, 112, 2.5);
        if (!T.evil) { for (let k = 0; k < 3; k++) { const ax = 36 + k * 30, ay = HZ + 176; g.fillStyle(T.kind === 'desert' ? 0xd8c8a0 : 0xf0f0f0, 1).fillEllipse(ax, ay, 16, 10); g.fillStyle(0x2a2a2a, 1).fillCircle(ax + 8, ay - 3, 3); } }   // ovce / kozy
        else { g.fillStyle(0x3a3030, 1).fillEllipse(60, HZ + 176, 22, 12); g.fillStyle(0x6a3a2a, 1).fillCircle(72, HZ + 171, 4); }   // varg na reťazi
        const cx2 = W - 60, cy2 = HZ + 160; g.fillStyle(P.beam, 1).fillRect(cx2 - 24, cy2 - 14, 48, 12); g.fillStyle(0x3a2a1a, 1).fillCircle(cx2 - 14, cy2 + 2, 7).fillCircle(cx2 + 14, cy2 + 2, 7); g.fillStyle(0xc8a040, 1).fillRect(cx2 - 20, cy2 - 22, 40, 8);   // voz so senom
        if (T.burned) { g.fillStyle(0x000000, .35).fillRect(0, HZ - 60, W, H); this.smoke = houses.map(h => [h[0], h[1] - 50]); }
        // nočné okná a fakle
        this.windows = houses.map(([hx, hy, sc]) => [hx + 14 * sc, hy - 26 * sc]);
        this.torches = T.evil ? [[cx - 30, cy - 30], [cx + 30, cy - 30]] : [];
        this.fx = this.add.graphics().setDepth(2);
        this.people = [];
        this.spawn(v, t, T, HZ);
        const name = v.n + (T.burned ? ' – spálenisko' : T.evil ? ' – osada' : ' – náves');
        this.setupRoom({ mode: 'room', floorY: HZ - 10, title: name, leave: 'Odísť z dediny', spawn: [W / 2, H - 40], amb: T.evil ? 'villageEvil' : T.kind === 'green' || T.kind === 'desert' ? 'village' : 'yard', floorSnd: T.kind === 'north' ? 'grass' : T.kind === 'desert' ? 'sand' : T.kind === 'ash' ? 'stone' : 'grass', block: [[wx - 26, wy - 12, 52, 22]] });
        this.spot(wx, wy - 20, 56, 40, 'Studňa', () => villageWell(this.vi), wy + 16);
        if (this.chapel) this.spot(cx, cy - 30, 50, 60, 'Kaplnka', () => villageChapel(this.vi), cy + 16);
        if (this.altar) this.spot(cx, cy - 14, 50, 40, 'Oltár', () => villageChapel(this.vi), cy + 16);
        if (!T.burned) this.spot(houses[1][0] - 10, houses[1][1] - 30, 70, 60, T.evil ? 'Brloh' : 'Krčmička', () => villageInn(this.vi), houses[1][1] + 16);
    }

    /** Dom podľa kraja: zelený kraj slamená chalupa, sever zrub, Mordor čierna chatrč, juh hlinený dom. */
    house(g, hx, hy, sc, P, T, R, i) {
        const w = 90 * sc, h = 54 * sc;
        g.fillStyle(0x000000, .2).fillEllipse(hx + w / 2, hy + 4, w * 1.1, 12);
        if (T.burned) { g.fillStyle(0x1a1412, 1).fillRect(hx, hy - h * .5, w, h * .5); g.fillStyle(0x2a2220, 1).fillRect(hx + 8, hy - h * .8, 10, h * .8).fillRect(hx + w - 20, hy - h * .7, 10, h * .7); g.fillStyle(0x3a3230, 1).fillTriangle(hx - 6, hy - h * .5, hx + w * .4, hy - h * .5, hx + w * .2, hy - h * .9); return; }
        if (T.kind === 'green') {
            g.fillStyle(P.wall, 1).fillRect(hx, hy - h, w, h); g.lineStyle(2.5, P.beam, 1); g.strokeRect(hx, hy - h, w, h); g.lineBetween(hx + w / 2, hy - h, hx + w / 2, hy); g.lineBetween(hx, hy - h / 2, hx + w, hy - h / 2); g.lineBetween(hx, hy - h, hx + w / 2, hy - h / 2); g.lineBetween(hx + w, hy - h, hx + w / 2, hy - h / 2);
            g.fillStyle(P.roof, 1).fillTriangle(hx - 10, hy - h + 4, hx + w + 10, hy - h + 4, hx + w / 2, hy - h - 30 * sc); g.fillStyle(P.roof2, 1); for (let k = 0; k < 5; k++) g.fillRect(hx - 6 + k * (w + 12) / 5, hy - h + 2 - k * 0, (w + 12) / 5 - 3, 3);
            g.fillStyle(0x8a8a90, 1).fillRect(hx + w * .7, hy - h - 20 * sc, 8, 20 * sc);   // komín
        } else if (T.kind === 'north') {
            g.fillStyle(P.wall, 1).fillRect(hx, hy - h, w, h); g.fillStyle(0x000000, .25); for (let y = hy - h + 6; y < hy; y += 8) g.fillRect(hx, y, w, 1.5);
            g.fillStyle(P.roof, 1).fillTriangle(hx - 12, hy - h + 2, hx + w + 12, hy - h + 2, hx + w / 2, hy - h - 34 * sc); g.fillStyle(P.roof2, 1).fillTriangle(hx - 12, hy - h + 2, hx + w + 12, hy - h + 2, hx + w / 2, hy - h - 6);
            g.fillStyle(0x6a6a70, 1).fillRect(hx + w * .65, hy - h - 22 * sc, 9, 22 * sc);
        } else if (T.kind === 'ash') {
            g.fillStyle(P.wall, 1).fillRect(hx, hy - h * .8, w, h * .8); g.fillStyle(P.roof, 1).fillTriangle(hx - 8, hy - h * .8, hx + w + 8, hy - h * .8, hx + w / 2, hy - h - 10 * sc);
            g.fillStyle(0x3a3a40, 1); for (let k = 0; k < 4; k++) g.fillRect(hx + 10 + k * 22, hy - h - 6, 3, 14);   // koly
            g.fillStyle(0xe8e4d8, 1).fillCircle(hx + 12, hy - h - 8, 4); g.fillStyle(0x1a1210, 1).fillRect(hx + 10, hy - h - 9, 1.5, 1.5).fillRect(hx + 13, hy - h - 9, 1.5, 1.5);
        } else {
            g.fillStyle(P.wall, 1).fillRoundedRect(hx, hy - h, w, h, 4); g.fillStyle(P.roof2, 1).fillRect(hx - 4, hy - h - 4, w + 8, 8);
            g.fillStyle([0xa02a1a, 0x2a4a7a, 0xd9a441][i % 3], .9).fillRect(hx - 8, hy - h * .55, w * .5, 5); g.fillStyle(0x5a3a1a, 1).fillRect(hx - 8, hy - h * .55, 3, h * .55).fillRect(hx + w * .5 - 11, hy - h * .55, 3, h * .55);   // plachta nad vchodom
        }
        g.fillStyle(0x15100c, 1).fillRoundedRect(hx + 10 * sc, hy - 26 * sc, 16 * sc, 26 * sc, { tl: 6, tr: 6, bl: 0, br: 0 });
        g.fillStyle(0x2a3a4a, 1).fillRect(hx + w - 28 * sc, hy - 36 * sc, 16 * sc, 14 * sc); g.lineStyle(1.5, P.beam, 1).strokeRect(hx + w - 28 * sc, hy - 36 * sc, 16 * sc, 14 * sc);
        this.windows = this.windows || []; this.windows.push([hx + w - 20 * sc, hy - 29 * sc]);
    }

    spawn(v, t, T, HZ) {
        const f = t.f, evil = T.evil;
        const elderEq = evil ? [{ w: 9, a: 6, s: 0, h: 5, m: 0 }, { orc: 1, cape: '#2a1010' }] : [{ w: null, a: 0, s: 0, h: null, m: 0 }, { cape: '#4a3a2a', beard: '#c8c0b0', hcol: '#c8c0b0' }];
        this.person(W / 2 - 60, HZ + 70, elderEq, evil ? 'Orkský dozorca' : 'Starosta', () => villageElder(this.vi), .9);
        if (!T.burned) {
            this.person(W / 2 + 190, HZ + 150, [{ w: null, a: T.kind === 'desert' ? 8 : 0, s: 0, h: null, m: 0 }, { cape: '#3a5a2a', apron: 1 }], 'Kupec', () => villageMarket(this.vi), .9);
            this.person(170, HZ + 120, [{ w: 0, a: 0, s: 0, h: null, m: 0 }, { cape: '#5a4a3a' }], evil ? 'Zverbovaní sedliaci' : 'Dobrovoľníci', () => villageRecruit(this.vi), .9);
            if (!evil) this.person(W / 2 + 40, HZ + 40, [{ w: null, a: 0, s: 0, h: null, m: 0 }, { cape: '#8a3a4a', hstyle: 'long', hcol: '#6a4a2a' }], 'Dedinčanka', () => villageTalk(this.vi, 0), .85);
            else this.person(W / 2 + 40, HZ + 40, [{ w: null, a: 0, s: 0, h: null, m: 0 }, { cape: '#3a3a3a' }], 'Zlomený sedliak', () => villageTalk(this.vi, 1), .85);
        }
    }

    leave() { if (mode !== 'room') return; leaveRoomScene(); }

    update(time, delta) {
        const dt = Math.min(3, (delta || 16.7) / 16.67);
        if (mode !== 'room') { if (mode !== 'town') { if (mode === 'battle' || mode === 'map') ROOM = null; this.closeRoom(); } return; }
        const t = tm, nn = nightness(), s = this.sky, f = this.fx;
        s.clear(); f.clear();
        this.drawSky(s, ...this.skyRect);
        if (this.smoke) for (const [sx, sy] of this.smoke) for (let k = 0; k < 4; k++) { const a = (t * .4 + k * 20) % 80; f.fillStyle(0x4a403a, .3 - a / 320).fillCircle(sx + Math.sin(a * .1 + k) * 8, sy - a * .8, 6 + a * .14); }
        for (const [tx, ty] of this.torches) { const ph = t / 2.5 + tx; f.fillStyle(0xff8a30, .95).fillTriangle(tx - 3, ty, tx + 3, ty, tx + Math.sin(ph) * 1.5, ty - 9); }
        if (nn > .3) { f.fillStyle(0xffd080, .5 * nn); for (const [wx, wy] of this.windows || []) f.fillRect(wx - 6, wy - 6, 12, 10); }
        const L = this.light; L.clear();
        L.fillStyle(0x080e28, nn * .5).fillRect(0, 0, W, H);
        if (!this.glows) { this.glows = (this.windows || []).map(([wx, wy]) => Tex.light(this, wx, wy, 60, 0xffd080, 0)); for (const [tx, ty] of this.torches) this.glows.push(Tex.light(this, tx, ty, 90, 0xffb060, 0)); }
        this.glows.forEach((l, i) => l.setAlpha((.25 + Math.sin(t / 2.3 + i) * .06) * Math.min(1, nn * 1.6)));
        this.people.forEach(p => { if (!p.spot) p.spr.y = p.y + Math.sin(t / 9 + p.t0) * .8; });
        this.movePlayer(dt);
    }
}
