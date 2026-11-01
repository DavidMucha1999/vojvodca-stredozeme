/*
 * ENGINE: vnútro dediny – náves v izometrii (základ IsoRoom). init({ v }): v = číslo dediny vo VL. mode = 'room'.
 * Vzhľad podľa kraja (regionAt: zelené kraje = hrazdené chalupy so slamou a poľami, sever = zruby so snehom, Mordor = čierne
 * chatrče s kolmi a lebkami, juh = hlinené domy s plochou strechou a plachtami) a podľa strany pána dediny (zlo: orkský dozorca,
 * oltár s lebkami, klietka, varg). Domy, studňa, kaplnka, ploty, zvieratá a voz sú kvádre a kresby zoradené podľa hĺbky.
 * Postavy: starosta/náčelník (klebety, ochrana, prosba o pomoc), kupec (trh), dobrovoľníci; miesta: studňa, kaplnka/oltár, krčmička.
 * Rozhovory v js/ui/village.js. Vypálená dedina: ruiny a dym, len starosta.
 */
class VillageScene extends IsoRoom {
    constructor() { super('Village'); }
    init(d) { this.vi = d.v; }

    theme() {
        const v = VL[this.vi], f = TW[v.t].f, evil = bloc(f) === 1 && f !== 6 || (f === 6 && heroSide() === 1);
        const reg = regionAt(v.x, v.y);
        return { reg, evil, burned: v.st > 0, kind: reg === 'a' ? 'ash' : reg === 'd' ? 'desert' : reg === 's' ? 'north' : 'green' };
    }

    create() {
        this.cameras.main.setZoom(RES).setOrigin(0, 0);
        const v = VL[this.vi], t = TW[v.t], T = this.theme(), seed = this.vi * 7 + 3, R = n => { const x = Math.sin((seed + n) * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
        this.T = T; this.R = R; this.v = v;
        const P = { green: { ground: '#5a7a3a', far: 0x4a6a34, hill: 0x4a6a34, hill2: 0x3a5a2c, wall: 0xc8b890, roof: 0xa08848, beam: 0x5a3a1a, groundKind: 'grass', path: 'rgba(150,130,80,.75)', tree: 'round' },
            north: { ground: '#e6ecf4', far: 0xc8d2de, hill: 0xbcc8d8, hill2: 0x8a9ab0, wall: 0x6a4a2a, roof: 0xe8eef8, beam: 0x3a2a1a, groundKind: 'snow', path: 'rgba(170,175,185,.7)', tree: 'pine' },
            ash: { ground: '#3a3230', far: 0x2a2424, hill: 0x2a2424, hill2: 0x1a1616, wall: 0x2a2224, roof: 0x1a1416, beam: 0x3a1a14, groundKind: 'mud', path: 'rgba(30,26,26,.7)', tree: 'dead' },
            desert: { ground: '#c8b080', far: 0xb89a60, hill: 0xb89a60, hill2: 0x9a7e48, wall: 0xd8b888, roof: 0xb89a68, beam: 0x6a4a2a, groundKind: 'sand', path: 'rgba(150,130,90,.7)', tree: 'palm' } }[T.kind];
        this.pal = P;
        this.setIso(360, 240, 0, undefined, 112); this.smoke = null; this.chapel = this.altar = null;
        const FW = this.FW, FD = this.FD;
        this.outdoor(P.far, [[P.hill2, 6, 0, 60], [P.hill, 7, 22, 44]], this.OY - 34);
        if (T.kind === 'ash') { const g = this.add.graphics().setDepth(-.4); g.fillStyle(0xff4a10, .25); for (let k = 0; k < 4; k++) g.fillEllipse(140 + k * 160, this.OY - 40, 60, 10); }   // žiara Hory osudu
        this.floor(P.groundKind, P.ground, seed, false);
        // cesta cez náves a polia
        this.onFloor(c => {
            c.fillStyle = P.path; c.fillRect(FW / 2 - 22, 0, 44, FD); c.fillRect(0, FD / 2 - 16, FW, 32); c.beginPath(); c.ellipse(FW / 2, FD / 2, 60, 50, 0, 0, 7); c.fill();
            if ((T.kind === 'green' || T.kind === 'desert') && !T.burned) { for (let k = 0; k < 5; k++) { c.fillStyle = T.kind === 'green' ? (k % 2 ? 'rgba(200,160,64,.8)' : 'rgba(122,154,58,.85)') : 'rgba(154,138,64,.8)'; c.fillRect(FW - 70, 10 + k * 9, 60, 6); } for (let k = 0; k < 4; k++) { c.fillStyle = T.kind === 'green' ? 'rgba(122,154,58,.85)' : 'rgba(154,138,64,.8)'; c.fillRect(8 + k * 9, FD - 70, 6, 60); } }
        });
        // domy: dve vzadu, krčmička vpravo, chalupa vľavo
        const hs = T.kind === 'ash' ? [[30, 16, 66, 46, 30], [210, 10, 80, 54, 34], [250, 150, 60, 44, 28]] : [[26, 16, 66, 48, 34], [200, 8, 86, 56, 38], [16, 130, 60, 46, 32], [252, 150, 64, 48, 34]];
        this.doors = hs.map(([x, y, w, d, h], i) => this.villageHouse(x, y, w, d, h, i, T, P, R));
        // studňa v strede
        const wx = FW / 2 + 36, wy = FD / 2 + 30;
        if (!T.burned || 1) { this.cyl(wx, wy, 14, 12, T.kind === 'ash' ? '#2a2224' : '#8a8a84'); this.prop(wx, wy, (g, sx, sy) => { g.fillStyle(0x15100c, 1).fillEllipse(sx, sy - 12, 20, 10); g.fillStyle(P.beam, 1).fillRect(sx - 16, sy - 46, 4, 36).fillRect(sx + 12, sy - 46, 4, 36); g.fillStyle(this.shade(P.roof, .8), 1).fillTriangle(sx - 24, sy - 44, sx + 24, sy - 44, sx, sy - 60); g.fillStyle(0x8a8a90, 1).fillRect(sx - 4, sy - 28, 8, 7); }, 1); }
        this.well = [wx, wy];
        // kaplnka alebo oltár
        const cx = 130, cy = 36;
        if (T.evil) {
            this.box(cx - 16, cy - 10, 32, 20, 16, '#2a2224'); this.prop(cx, cy, (g, sx, sy) => { g.fillStyle(0xe8e4d8, 1); for (let k = 0; k < 3; k++) g.fillCircle(sx - 10 + k * 10, sy - 22, 4); g.fillStyle(0x1a1210, 1); for (let k = 0; k < 3; k++) g.fillRect(sx - 12 + k * 10, sy - 23, 1.5, 1.5).fillRect(sx - 8 + k * 10, sy - 23, 1.5, 1.5); }, 1);
            this.torches = [[cx - 26, cy + 14, 26], [cx + 26, cy + 14, 26]]; for (const [tx, ty] of this.torches) this.prop(tx, ty, (g, sx, sy) => { g.fillStyle(0x3a2a1a, 1).fillRect(sx - 2, sy - 26, 4, 26); });
            const kx = FW - 50, ky = 40; this.prop(kx, ky, (g, sx, sy) => { g.lineStyle(2, 0x3a3a40, 1).strokeRect(sx - 12, sy - 44, 24, 42); for (let k = 1; k < 4; k++) g.lineBetween(sx - 12 + k * 6, sy - 44, sx - 12 + k * 6, sy - 2); g.fillStyle(0xe2bf96, 1).fillCircle(sx, sy - 28, 4); g.fillStyle(0x8a6a4a, 1).fillRect(sx - 4, sy - 24, 8, 14); }); this.blocks.push([kx - 10, ky - 10, 20, 20]);
            this.prop(50, FD - 40, (g, sx, sy) => { g.fillStyle(0x000000, .2).fillEllipse(sx, sy + 2, 30, 10); g.fillStyle(0x3a3030, 1).fillEllipse(sx, sy - 6, 24, 12); g.fillStyle(0x6a3a2a, 1).fillCircle(sx + 12, sy - 11, 4); g.lineStyle(1.5, 0x5a5a60, 1).lineBetween(sx - 8, sy - 6, sx - 30, sy - 2); });   // varg na reťazi
            this.altar = [cx, cy];
        } else {
            this.house(cx - 18, cy - 14, 36, 30, 30, P.wall, P.roof, { rh: 22, ov: 4, door: true, doorAt: .35, win: false, chimney: false, logs: T.kind === 'north', beam: T.kind === 'green' ? P.beam : null });
            this.prop(cx + 18, cy + 1, (g, sx, sy) => { g.fillStyle(T.kind === 'green' ? 0xe8e8e8 : 0xd9a441, 1).fillRect(sx - 1.5, sy - 76, 3, 14).fillRect(sx - 5, sy - 72, 10, 2.5); }, 1);
            if (T.reg === 's' || T.reg === 'g') this.prop(cx - 34, cy + 24, (g, sx, sy) => { g.fillStyle(0xf0f0f0, .9).fillRect(sx - 3, sy - 10, 6, 10); g.fillStyle(0x4a7a4a, .9).fillCircle(sx + 5, sy - 4, 4); });   // hrob s kvetom
            this.torches = [];
            this.chapel = [cx, cy];
        }
        // plot s ovcami, voz so senom, stromy okolo
        this.prop(40, FD - 60, (g, sx, sy) => { g.fillStyle(this.hexc(P.beam), 1); for (let k = 0; k < 6; k++) { const [px, py] = this.P(20 + k * 12, FD - 60); g.fillRect(px - 1.5, py - 14, 3, 14); } g.lineStyle(2, this.hexc(P.beam), 1); const [a1, b1] = this.P(20, FD - 60), [a2, b2] = this.P(80, FD - 60); g.lineBetween(a1, b1 - 11, a2, b2 - 11); g.lineBetween(a1, b1 - 5, a2, b2 - 5); });
        if (!T.evil && !T.burned) for (let k = 0; k < 3; k++) this.prop(30 + k * 18, FD - 40 + (k % 2) * 10, (g, sx, sy) => { g.fillStyle(0x000000, .2).fillEllipse(sx, sy + 1, 16, 6); g.fillStyle(T.kind === 'desert' ? 0xd8c8a0 : 0xf0f0f0, 1).fillEllipse(sx, sy - 5, 14, 9); g.fillStyle(0x2a2a2a, 1).fillCircle(sx + 7, sy - 7, 3); });
        const vx = FW - 60, vy = FD - 36; this.box(vx, vy, 30, 14, 8, P.beam, { top: 0xc8a040 }); this.prop(vx + 15, vy + 7, (g, sx, sy) => { g.fillStyle(0x3a2a1a, 1).fillCircle(sx - 12, sy - 2, 6).fillCircle(sx + 10, sy + 4, 6); g.fillStyle(0xc8a040, 1).fillEllipse(sx, sy - 14, 30, 12); }, 1);
        for (const [tx, ty] of [[-30, 40], [-24, 160], [FW + 24, 60], [FW + 30, 180], [60, -26], [300, -30]]) this.tree(tx, ty, P.tree, .9 + R(tx + ty) * .4, T.kind === 'north' ? 0x3a5a40 : T.kind === 'green' ? [0x3a6a2a, 0x4a7a30, 0x2a5a24][Math.floor(R(tx) * 3)] : undefined);
        if (T.burned) { this.smoke = hs.map(([x, y, w, d, h]) => [x + w / 2, y + d / 2, h * .6]); const g = this.add.graphics().setDepth(1400); g.fillStyle(0x000000, .3).fillRect(0, 0, W, H); }
        this.commitBg();
        this.fx = this.add.graphics().setDepth(1700);
        this.spawn(v, t, T);
        const name = v.n + (T.burned ? ' – spálenisko' : T.evil ? ' – osada' : ' – náves');
        this.setupRoom({ mode: 'room', title: name, leave: 'Odísť z dediny', spawn: [FW / 2, FD - 24], amb: T.evil ? 'villageEvil' : T.kind === 'green' || T.kind === 'desert' ? 'village' : 'yard', floorSnd: T.kind === 'north' ? 'grass' : T.kind === 'desert' ? 'sand' : T.kind === 'ash' ? 'stone' : 'grass' });
        this.spot(wx, wy, 44, 60, 'Studňa', () => villageWell(this.vi), [wx, wy + 28]);
        if (this.chapel) this.spot(cx, cy + 16, 56, 70, 'Kaplnka', () => villageChapel(this.vi), [cx - 4, cy + 30]);
        if (this.altar) this.spot(cx, cy + 10, 50, 50, 'Oltár', () => villageChapel(this.vi), [cx, cy + 30]);
        if (!T.burned) { const d = this.doors[1]; this.spot(d[0], d[1] - 10, 70, 70, T.evil ? 'Brloh' : 'Krčmička', () => villageInn(this.vi), [d[0], d[1] + 4]); }
    }

    /** Dom podľa kraja: zelený kraj hrazdená chalupa so slamou, sever zrub so snehom, Mordor čierna chatrč s kolmi, juh hlinený dom s plochou strechou. */
    villageHouse(x, y, w, d, h, i, T, P, R) {
        if (T.burned) {   // ruina: nízke obhorené múry, ohorené trámy
            this.box(x, y, w, d, h * .45, '#1a1412', { top: 0x2a2220 });
            this.prop(x + w * .5, y + d * .5, (g, sx, sy) => { g.fillStyle(0x2a2220, 1).fillRect(sx - w * .3, sy - h * .9, 6, h * .7).fillRect(sx + w * .2, sy - h * .8, 6, h * .6); g.lineStyle(3, 0x1a1412, 1).lineBetween(sx - w * .3, sy - h * .9, sx + w * .1, sy - h * .4); }, 1);
            return [x + w * .3, y + d + 14];
        }
        if (T.kind === 'green') return this.house(x, y, w, d, h, P.wall, P.roof, { rh: h * .8, ov: 7, thatch: true, beam: P.beam, doorCol: 0x5a3a1a });
        if (T.kind === 'north') { const door = this.house(x, y, w, d, h, P.wall, P.roof, { rh: h * .9, ov: 9, logs: true, chimneyCol: 0x6a6a70, doorCol: 0x4a3018 }); return door; }
        if (T.kind === 'ash') {
            const door = this.house(x, y, w, d, h, P.wall, P.roof, { rh: h * .4, ov: 6, chimney: false, win: false });
            for (let k = 0; k < 3; k++) this.prop(x - 6, y + d + 6 + k * 14, (g, sx, sy) => { g.fillStyle(0x3a3a40, 1).fillRect(sx - 1.5, sy - 26, 3, 26); if (k === 1) { g.fillStyle(0xe8e4d8, 1).fillCircle(sx, sy - 29, 4); g.fillStyle(0x1a1210, 1).fillRect(sx - 2.5, sy - 30, 1.5, 1.5).fillRect(sx + 1, sy - 30, 1.5, 1.5); } });   // koly s lebkou
            return door;
        }
        const door = this.house(x, y, w, d, h, P.wall, P.roof, { rh: 0, doorCol: 0x6a4a2a });
        const col = [0xa02a1a, 0x2a4a7a, 0xd9a441][i % 3];
        this.prop(x + w * .3 + 6, y + d + 12, (g, sx, sy) => { const [a1, b1] = this.P(x + w * .1, y + d + 14, 0), [a2, b2] = this.P(x + w * .6, y + d + 14, 0); g.fillStyle(0x5a3a1a, 1).fillRect(a1 - 1.5, b1 - 24, 3, 24).fillRect(a2 - 1.5, b2 - 24, 3, 24); const [c1, d1] = this.P(x + w * .1, y + d, 24), [c2, d2] = this.P(x + w * .6, y + d, 24); g.fillStyle(col, .9); g.beginPath(); g.moveTo(a1, b1 - 24); g.lineTo(a2, b2 - 24); g.lineTo(c2, d2); g.lineTo(c1, d1); g.closePath(); g.fillPath(); }, 1);   // plachta nad vchodom
        return door;
    }

    spawn(v, t, T) {
        const evil = T.evil, FW = this.FW, FD = this.FD;
        const elderEq = evil ? [{ w: 9, a: 6, s: 0, h: 5, m: 0 }, { orc: 1, cape: '#2a1010' }] : [{ w: null, a: 0, s: 0, h: null, m: 0 }, { cape: '#4a3a2a', beard: '#c8c0b0', hcol: '#c8c0b0' }];
        this.person(FW / 2 - 40, FD / 2 + 10, elderEq, evil ? 'Orkský dozorca' : 'Starosta', () => villageElder(this.vi), .95);
        if (!T.burned) {
            this.person(FW - 80, FD / 2 + 50, [{ w: null, a: T.kind === 'desert' ? 8 : 0, s: 0, h: null, m: 0 }, { cape: '#3a5a2a', apron: 1 }], 'Kupec', () => villageMarket(this.vi), .95);
            this.person(110, FD / 2 + 40, [{ w: 0, a: 0, s: 0, h: null, m: 0 }, { cape: '#5a4a3a' }], evil ? 'Zverbovaní sedliaci' : 'Dobrovoľníci', () => villageRecruit(this.vi), .95);
            if (!evil) this.person(FW / 2 + 60, 80, [{ w: null, a: 0, s: 0, h: null, m: 0 }, { cape: '#8a3a4a', hstyle: 'long', hcol: '#6a4a2a' }], 'Dedinčanka', () => villageTalk(this.vi, 0), .9);
            else this.person(FW / 2 + 60, 80, [{ w: null, a: 0, s: 0, h: null, m: 0 }, { cape: '#3a3a3a' }], 'Zlomený sedliak', () => villageTalk(this.vi, 1), .9);
        }
    }

    leave() { if (mode !== 'room') return; leaveRoomScene(); }

    update(time, delta) {
        const dt = Math.min(3, (delta || 16.7) / 16.67);
        if (mode !== 'room') { if (mode !== 'town') { if (mode === 'battle' || mode === 'map') ROOM = null; this.closeRoom(); } return; }
        const t = tm, nn = nightness(), s = this.sky, f = this.fx;
        s.clear(); f.clear();
        this.drawSky(s, ...this.skyRect);
        if (this.smoke) for (const [x, y, z] of this.smoke) this.smokeFx(f, x, y, z, 0x4a403a, .35);
        else if (nn > .2 || this.T.kind === 'north') for (const [x, y, z] of this.chimneys || []) this.smokeFx(f, x, y, z, 0xb0b0b8, .22);
        for (const [tx, ty, tz] of this.torches) this.flame(f, tx, ty, tz, 3, 0xff8a30);
        if (nn > .3) { f.fillStyle(0xffd080, .5 * nn); for (const [wx, wy] of this.winPts || []) f.fillRect(wx - 5, wy - 4, 10, 8); }
        const L = this.light; L.clear();
        L.fillStyle(0x080e28, nn * .5).fillRect(0, 0, W, H);
        if (!this.glows) { this.glows = (this.winPts || []).map(([wx, wy]) => Tex.light(this, wx, wy, 60, 0xffd080, 0, 1600)); for (const [tx, ty, tz] of this.torches) this.glows.push(this.glow(tx, ty, tz, 90, 0xffb060, 0)); }
        this.glows.forEach((l, i) => l.setAlpha((.25 + Math.sin(t / 2.3 + i) * .06) * Math.min(1, nn * 1.6 + (i >= (this.winPts || []).length ? .2 : 0))));
        this.people.forEach(p => { if (!p.spot) p.spr.y = p.sy + Math.sin(t / 9 + p.t0) * .8; });
        this.movePlayer(dt);
    }
}
