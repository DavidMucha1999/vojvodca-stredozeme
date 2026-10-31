/*
 * ENGINE: pamätihodnosti s vlastnou scénou (PLACES v js/data/places.js). init({ p }): p = číslo miesta. mode = 'room'.
 * Každý druh (kind) má vlastnú kulisu: zrúcanina Amon Sûl, Argonath nad Anduinou, dom Toma Bombadila, Mŕtve močiare,
 * pavúčie húštiny, Fangorn, brána Ciest mŕtvych, Beornov dvor, Brody na Isene, trollie jaskyne, Pelennor.
 * Postavy a miesta spúšťajú voľby z js/ui/places.js (placeAct) – hráč k nim dôjde alebo stlačí medzerník.
 */
class PlaceScene extends RoomScene {
    constructor() { super('Place'); }
    init(d) { this.pi = d.p; }

    create() {
        this.cameras.main.setZoom(RES).setOrigin(0, 0);
        const P = PLACES[this.pi], k = P.kind, seed = this.pi * 13 + 7, R = n => { const x = Math.sin((seed + n) * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
        this.P = P; this.R = R;
        const HZ = 240; this.HZ = HZ;
        const hx6 = c => '#' + c.toString(16).padStart(6, '0');
        const g = this.add.graphics().setDepth(1);
        this.sky = this.add.graphics().setDepth(0); this.skyRect = [0, 0, W, 150];
        this.fx = this.add.graphics().setDepth(2);
        this.torches = []; this.windows = []; this.fires = [];
        const ground = { tower: ['grass', 0x4a5a3a], statues: ['grass', 0x5a7a4a], cave: ['cobbles', 0x5a5a56], house: ['grass', 0x5a8a3a], swamp: ['mud', 0x3a3a2a], web: ['mud', 0x2a2a24], ents: ['grass', 0x3a5a2a], door: ['flags', 0x3a3a40], homestead: ['grass', 0x5a7a3a], ford: ['sand', 0x9a8a60], tree: ['grass', 0x6a7a3a] }[k] || ['grass', 0x5a7a3a];
        this.add.tileSprite(0, HZ - 50, W, H - HZ + 50, Tex.pattern(this, ground[0], hx6(ground[1]), seed)).setOrigin(0).setDepth(-1).setTileScale(.35);
        const hill = (col, n, y0, h) => { g.fillStyle(col, 1); for (let i = 0; i < n; i++) g.fillEllipse(i * (W / (n - 1)), y0 + R(i + 40) * 10, W / n * 2.2, h + R(i + 50) * 20); };
        let title = P.n, spots = [];
        if (k === 'tower') {
            hill(0x3a4a5a, 6, 150, 60); hill(0x4a5a4a, 7, 180, 50);
            const tx = W / 2, ty = HZ - 30;   // zrúcanina veže na kopci
            g.fillStyle(0x4a5a3a, 1).fillEllipse(tx, ty + 20, 420, 90);
            g.fillStyle(0x6a6a66, 1); for (let a = 0; a < 7; a++) { const ang = a / 7 * 6.283, px = tx + Math.cos(ang) * 70, py = ty - 10 + Math.sin(ang) * 22, h = 20 + R(a) * 60; if (Math.sin(ang) > -.3) g.fillRect(px - 8, py - h, 16, h); }
            g.fillStyle(0x7a7a74, 1).fillRect(tx - 30, ty - 120, 60, 110); g.fillStyle(0x5a5a56, 1).fillRect(tx - 34, ty - 124, 68, 8).fillRect(tx + 10, ty - 150, 20, 30); g.fillStyle(0x000000, .35).fillRect(tx - 8, ty - 60, 16, 24);
            g.fillStyle(0x15100c, 1).fillRoundedRect(tx - 10, ty - 36, 20, 26, { tl: 10, tr: 10, bl: 0, br: 0 });
            this.fires.push([tx + 90, HZ + 90]);
            spots.push([tx, ty - 60, 70, 110, 'Vrchol veže', 0, ty + 14]);
        } else if (k === 'statues') {
            hill(0x3a4a6a, 5, 140, 70);
            g.fillStyle(0x2c5b73, 1).fillRect(0, HZ - 40, W, 60); g.fillStyle(0x4a86a0, .8).fillRect(0, HZ - 30, W, 40); this.water = [0, HZ - 40, W, 60];
            for (const sx of [120, W - 120]) { const flip = sx > W / 2 ? -1 : 1;   // dvaja kamenní králi
                g.fillStyle(0x7a8a8a, 1).fillRect(sx - 40, HZ - 60, 80, 24); g.fillRect(sx - 22, HZ - 200, 44, 140); g.fillStyle(0x8a9a9a, 1).fillCircle(sx, HZ - 212, 18); g.fillRect(sx - 26, HZ - 232, 52, 14);
                g.fillStyle(0x7a8a8a, 1).fillRect(sx + flip * 22, HZ - 190, flip * 30, 14).fillRect(sx + flip * 40, HZ - 230, flip * 12, 54);   // vztýčená ruka
                g.fillStyle(0x6a7a7a, 1).fillRect(sx - 22, HZ - 120, 44, 6).fillRect(sx - 22, HZ - 90, 44, 6); }
            spots.push([W / 2, HZ - 20, 120, 40, 'Prejsť popod Kráľov', 0, HZ + 30]);
        } else if (k === 'cave') {
            hill(0x4a4a46, 5, 130, 90); hill(0x5a5a56, 6, 170, 60);
            g.fillStyle(0x3a3a36, 1).fillEllipse(W / 2, HZ - 30, 300, 180); g.fillStyle(0x0c0a08, 1).fillEllipse(W / 2, HZ - 10, 120, 110); g.fillStyle(0x000000, 1).fillRect(W / 2 - 60, HZ - 10, 120, 40);
            for (const [bx, by] of [[140, HZ + 60], [W - 160, HZ + 90], [220, HZ + 150]]) { g.fillStyle(0xe8e4d8, 1).fillRect(bx, by, 14, 4).fillRect(bx + 20, by - 6, 4, 14); g.fillCircle(bx + 30, by + 8, 5); }   // kosti
            for (const [sx, sy] of [[90, HZ - 20], [W - 90, HZ - 10], [W - 200, HZ - 40]]) { g.fillStyle(0x6a6a66, 1).fillEllipse(sx, sy, 60, 80); g.fillStyle(0x3a3a36, 1).fillEllipse(sx + 8, sy - 10, 14, 10).fillEllipse(sx - 14, sy - 12, 12, 9); }   // skamenení trollovia
            this.fires.push([W / 2 + 160, HZ + 120]);
            spots.push([W / 2, HZ - 30, 120, 100, 'Jaskyne', 0, HZ + 40]);
        } else if (k === 'house') {
            hill(0x4a7a3a, 6, 160, 60);
            for (let i = 0; i < 9; i++) { const wx = 40 + i * 85, wh = 60 + R(i) * 40; g.fillStyle(0x4a3a2a, 1).fillRect(wx - 5, HZ - 20 - wh, 10, wh); g.fillStyle(0x6a9a4a, .9); for (let b = 0; b < 6; b++) { g.lineStyle(2, 0x7aa050, .9); g.lineBetween(wx, HZ - 20 - wh + 6, wx - 20 + b * 8, HZ - 10); } }   // vŕby
            const hx = W / 2 + 40, hy = HZ - 10; g.fillStyle(0xe8d070, 1).fillRect(hx - 60, hy - 60, 120, 60); g.fillStyle(0x7a9a3a, 1).fillTriangle(hx - 70, hy - 60, hx + 70, hy - 60, hx, hy - 100); g.fillStyle(0x4a7a3a, 1).fillRect(hx - 70, hy - 62, 140, 5);
            g.fillStyle(0x3a6ad0, 1).fillRoundedRect(hx - 10, hy - 32, 20, 32, { tl: 10, tr: 10, bl: 0, br: 0 }); g.fillStyle(0xfff0a0, 1).fillRect(hx - 44, hy - 44, 16, 14).fillRect(hx + 28, hy - 44, 16, 14); this.windows.push([hx - 36, hy - 37], [hx + 36, hy - 37]);
            for (let i = 0; i < 12; i++) { g.fillStyle([0xe84a4a, 0xf0d040, 0x4a8ae8, 0xf0f0f0][i % 4], 1).fillCircle(hx - 90 + i * 16, hy + 20 + (i % 3) * 8, 4); }   // kvety
            g.fillStyle(0x2c5b73, 1).fillRect(0, H - 50, W, 50); g.fillStyle(0x4a86a0, .8).fillRect(0, H - 44, W, 44); this.water = [0, H - 50, W, 50];
            spots.push([hx, hy - 30, 120, 60, 'Dom Toma Bombadila', 0, hy + 16]);
        } else if (k === 'swamp') {
            hill(0x2a3a2a, 6, 150, 40);
            g.fillStyle(0x1a2a24, 1); for (let i = 0; i < 9; i++) g.fillEllipse(60 + i * 80 + R(i) * 30, HZ + 20 + R(i + 9) * 150, 90 + R(i + 20) * 60, 30 + R(i + 30) * 20);
            g.fillStyle(0x3a4a3a, .6); for (let i = 0; i < 6; i++) g.fillEllipse(100 + i * 110, HZ + 60 + R(i + 40) * 120, 20, 6);   // tváre pod hladinou (náznak)
            g.fillStyle(0x4a4a3a, 1); for (let i = 0; i < 14; i++) g.fillRect(20 + i * 50 + R(i) * 20, HZ - 30 + R(i + 5) * 40, 3, 30);   // trstina a suché kmene
            this.wisps = Array.from({ length: 6 }, (_, i) => [80 + i * 110, HZ + 40 + R(i + 60) * 140]);
            spots.push([W / 2, HZ + 60, 160, 60, 'Brod cez močiar', 0, HZ + 100], [W - 140, HZ + 150, 100, 50, 'Hľadať v bahne', 1, HZ + 185]);
        } else if (k === 'web') {
            g.fillStyle(0x0a0c0a, 1).fillRect(0, 0, W, HZ); for (let i = 0; i < 10; i++) { g.fillStyle(0x1a1c16, 1).fillRect(i * 76 + 10, 0, 22 + R(i) * 14, HZ); }
            g.lineStyle(1.2, 0xd8d8d0, .55); for (let i = 0; i < 14; i++) { const wx = 30 + i * 52, wy = 30 + R(i) * 140; for (let a = 0; a < 6; a++) g.lineBetween(wx, wy, wx + Math.cos(a) * 40, wy + Math.sin(a) * 40); for (let r = 8; r < 40; r += 8) g.strokeCircle(wx, wy, r); }
            for (let i = 0; i < 4; i++) { g.fillStyle(0xd0d0c8, .9).fillEllipse(120 + i * 160, 90 + R(i + 7) * 60, 26, 44); }   // zámotky
            spots.push([W / 2, HZ - 60, 160, 100, 'Húštiny', 0, HZ + 20]);
        } else if (k === 'ents') {
            g.fillStyle(0x1a2a18, 1).fillRect(0, 0, W, HZ); for (let i = 0; i < 8; i++) { const tx = 40 + i * 92, tw = 30 + R(i) * 30; g.fillStyle(0x3a2e1a, 1).fillRect(tx - tw / 2, 20, tw, HZ - 20); g.fillStyle(0x2a4a24, 1).fillEllipse(tx, 40 + R(i + 3) * 30, tw * 3, 70); }
            const ex = W / 2 + 120, ey = HZ + 20;   // Stromobrad
            g.fillStyle(0x5a4a2a, 1).fillRect(ex - 22, ey - 160, 44, 160); g.fillRect(ex - 60, ey - 130, 40, 12).fillRect(ex + 20, ey - 120, 46, 12); g.fillStyle(0x3a6a2a, 1).fillEllipse(ex, ey - 170, 90, 50); g.fillStyle(0xe8e060, 1).fillCircle(ex - 8, ey - 120, 3).fillCircle(ex + 8, ey - 120, 3);
            this.ent = [ex, ey];
            spots.push([ex, ey - 80, 90, 160, 'Stromobrad', 0, ey + 24]);
        } else if (k === 'door') {
            hill(0x2a2a30, 5, 120, 110);
            g.fillStyle(0x1a1a20, 1).fillRect(W / 2 - 120, 0, 240, HZ); g.fillStyle(0x0a0a0e, 1).fillRoundedRect(W / 2 - 50, HZ - 130, 100, 130, { tl: 50, tr: 50, bl: 0, br: 0 });
            g.fillStyle(0x3a3a44, 1); for (let i = 0; i < 6; i++) g.fillRect(W / 2 - 90 + i * 32, HZ - 150, 8, 20);
            g.fillStyle(0xe8e4d8, .8); for (let i = 0; i < 8; i++) g.fillCircle(80 + i * 80 + R(i) * 30, HZ + 60 + R(i + 9) * 120, 4);
            this.mist = 1;
            spots.push([W / 2, HZ - 60, 110, 120, 'Brána mŕtvych', 0, HZ + 30]);
        } else if (k === 'homestead') {
            hill(0x4a6a3a, 6, 160, 60);
            const hx = W / 2 - 40, hy = HZ; g.fillStyle(0x6a4a2a, 1).fillRect(hx - 110, hy - 80, 220, 80); g.fillStyle(0x000000, .25); for (let y = hy - 74; y < hy; y += 9) g.fillRect(hx - 110, y, 220, 1.5); g.fillStyle(0x8a6a3a, 1).fillTriangle(hx - 124, hy - 80, hx + 124, hy - 80, hx, hy - 140);
            g.fillStyle(0x15100c, 1).fillRect(hx - 18, hy - 50, 36, 50); g.fillStyle(0xffe8a0, 1).fillRect(hx - 80, hy - 60, 20, 16).fillRect(hx + 60, hy - 60, 20, 16); this.windows.push([hx - 70, hy - 52], [hx + 70, hy - 52]);
            for (let i = 0; i < 5; i++) { const bx = W - 60, by = HZ + 40 + i * 30; g.fillStyle(0xd8c070, 1).fillRect(bx - 16, by, 32, 24); g.fillStyle(0xb09040, 1).fillRect(bx - 18, by - 4, 36, 6); }   // úle
            g.fillStyle(0xf0f0f0, 1); for (let i = 0; i < 5; i++) g.fillEllipse(80 + i * 40, HZ + 150 + (i % 2) * 20, 16, 10);   // ovce
            this.bees = 1;
            spots.push([hx, hy - 40, 160, 80, 'Beornov dom', 0, hy + 16]);
        } else if (k === 'ford') {
            hill(0x4a5a4a, 6, 160, 50);
            g.fillStyle(0x2c5b73, 1).fillRect(0, HZ - 20, W, 110); g.fillStyle(0x4a86a0, .8).fillRect(0, HZ - 10, W, 90); this.water = [0, HZ - 20, W, 110];
            g.fillStyle(0x9a8a60, 1); for (let i = 0; i < 9; i++) g.fillEllipse(W / 2 - 160 + i * 40, HZ + 10 + R(i) * 60, 36, 16);   // brod – plytčina
            g.fillStyle(0x5a5a56, 1); for (let i = 0; i < 6; i++) { const px = 60 + R(i + 3) * (W - 120), py = HZ + 100 + R(i + 9) * 60; g.fillRect(px, py, 10, 4); g.fillStyle(0x8a8a90, 1).fillEllipse(px + 20, py, 10, 6); g.fillStyle(0x5a5a56, 1); }   // staré prilby a kopije
            spots.push([W / 2, HZ + 30, 200, 60, 'Brod', 0, HZ + 120]);
        } else if (k === 'tree') {
            hill(0xcfd3d8, 7, 140, 50); g.fillStyle(0x8a9098, 1).fillRect(W / 2 - 300, 110, 600, 40); for (let i = 0; i < 12; i++) g.fillRect(W / 2 - 300 + i * 52, 100, 24, 12);   // hradby Minas Tirith v diaľke
            const tx = W / 2, ty = HZ + 10; g.fillStyle(0x4a4a44, 1).fillRect(tx - 10, ty - 110, 20, 110); g.lineStyle(6, 0x4a4a44, 1); for (const [dx, dy] of [[-50, -150], [40, -160], [-20, -175], [60, -120]]) g.lineBetween(tx, ty - 90, tx + dx, ty + dy);
            g.fillStyle(0x5a5a56, 1); for (let i = 0; i < 10; i++) g.fillRect(60 + R(i) * (W - 120), HZ + 40 + R(i + 9) * 150, 14, 3);   // zlomené kopije
            spots.push([tx, ty - 60, 80, 120, 'Mŕtvy strom', 0, ty + 20]);
        }
        this.people = [];
        this.npc(k, HZ);
        const spotsD = spots;
        this.setupRoom({ mode: 'room', floorY: HZ - 10, title, leave: 'Odísť', spawn: [W / 2 - 100, H - 40], amb: k === 'cave' || k === 'door' ? 'cave' : k === 'web' || k === 'swamp' ? 'cave' : k === 'ents' || k === 'house' ? 'elf' : 'yard', floorSnd: k === 'cave' || k === 'door' ? 'stone' : k === 'ford' ? 'sand' : 'grass' });
        spotsD.forEach(([x, y, w, h, n, a, sy]) => this.spot(x, y, w, h, n, () => placeAct(this.pi, a), sy));
    }

    /** Postavy miest: Tom Bombadil, Beorn, strážca prístavu… */
    npc(k, HZ) {
        if (k === 'house') this.person(W / 2 - 40, HZ + 60, [{ w: null, a: 0, s: 0, h: null, m: 0 }, { cape: '#3a6ad0', hcol: '#6a4a2a', beard: '#6a4a2a', hat: 1 }], 'Tom Bombadil', () => placeTalk(this.pi, 'tom'), .9);
        if (k === 'homestead') this.person(W / 2 + 60, HZ + 50, [{ w: 5, a: 0, s: 0, h: null, m: 0 }, { cape: '#2a2a2a', hcol: '#1a1a1a', beard: '#1a1a1a' }], 'Beorn', () => placeTalk(this.pi, 'beorn'), 1.15);
        if (k === 'tower') this.person(W / 2 - 150, HZ + 70, [{ w: 3, a: 0, s: 0, h: null, m: 0 }, { cape: '#3a4a3a', hcol: '#2a1a10' }], 'Hraničiar', () => placeTalk(this.pi, 'ranger'), .9);
        if (k === 'ford') this.person(120, HZ + 140, [{ w: 2, a: 1, s: 1, h: 1, m: 0 }, { cape: '#3a6a2a' }], 'Rohanský zved', () => placeTalk(this.pi, 'rider'), .9);
        if (k === 'tree') this.person(W / 2 + 120, HZ + 90, [{ w: 1, a: 2, s: 2, h: 4, m: 0 }, { cape: '#2a3a6a' }], 'Strážca Pelennoru', () => placeTalk(this.pi, 'guard'), .9);
        if (k === 'statues') this.person(W - 200, HZ + 120, [{ w: null, a: 0, s: 0, h: null, m: 0 }, { cape: '#4a3a2a', beard: '#c8c0b0', hcol: '#c8c0b0' }], 'Prievozník', () => placeTalk(this.pi, 'ferry'), .9);
        if (k === 'ents') this.person(this.ent[0] - 60, this.ent[1] + 40, [{ w: null, a: 0, s: 0, h: null, m: 0 }, { cape: '#4a6a3a', hcol: '#8a6a3a' }], 'Hobit Smiešok', () => placeTalk(this.pi, 'hobbit'), .8);
    }

    leave() { if (mode !== 'room') return; leaveRoomScene(); }

    update(time, delta) {
        const dt = Math.min(3, (delta || 16.7) / 16.67);
        if (mode !== 'room') { if (mode !== 'town') { if (mode === 'battle' || mode === 'map') ROOM = null; this.closeRoom(); } return; }
        const t = tm, nn = nightness(), s = this.sky, f = this.fx, k = this.P.kind;
        s.clear(); f.clear();
        if (k !== 'web' && k !== 'ents') this.drawSky(s, ...this.skyRect);
        if (this.water) { const [x, y, w, h] = this.water; f.fillStyle(0xffffff, .18); for (let i = 0; i < 12; i++) f.fillRect(x + (i * 67 + t * 1.5) % w, y + 8 + (i * 29) % (h - 10), 18, 1.5); }
        for (const [fx, fy] of this.fires) { for (let i = 0; i < 5; i++) { const ph = t / 3 + i * 1.9, h = 10 + Math.sin(ph) * 4; f.fillStyle(0xff7a20, .9).fillTriangle(fx - 8 + i * 4 - 3, fy, fx - 8 + i * 4 + 3, fy, fx - 8 + i * 4 + Math.sin(ph) * 2, fy - h); } f.fillStyle(0x3a2a1a, 1).fillRect(fx - 12, fy - 1, 24, 3); }
        if (this.wisps) for (const [wx, wy] of this.wisps) { const a = .3 + .3 * Math.sin(t / 7 + wx); f.fillStyle(0x9ad0ff, a).fillCircle(wx + Math.sin(t / 20 + wy) * 6, wy + Math.cos(t / 17 + wx) * 4, 3); f.fillStyle(0x9ad0ff, a * .3).fillCircle(wx + Math.sin(t / 20 + wy) * 6, wy + Math.cos(t / 17 + wx) * 4, 9); }
        if (this.mist) { f.fillStyle(0xbec8d2, .18 + .06 * Math.sin(t / 30)); for (let i = 0; i < 5; i++) f.fillEllipse((i * 190 + t * .4) % (W + 200) - 100, this.HZ + 20 + i * 30, 260, 40); }
        if (this.bees) { f.fillStyle(0xf0c030, 1); for (let i = 0; i < 8; i++) f.fillRect(W - 60 + Math.sin(t / 9 + i) * 40, this.HZ + 20 + Math.cos(t / 7 + i * 2) * 30 + i * 6, 2, 2); }
        if (this.ent) { const [ex, ey] = this.ent; f.fillStyle(0xe8e060, .6 + .4 * Math.sin(t / 15)).fillCircle(ex - 8, ey - 120, 3).fillCircle(ex + 8, ey - 120, 3); }
        if (nn > .3) { f.fillStyle(0xffd080, .5 * nn); for (const [wx, wy] of this.windows) f.fillRect(wx - 8, wy - 6, 16, 12); }
        const L = this.light; L.clear();
        const base = k === 'web' ? .35 : k === 'door' ? .3 : k === 'cave' ? .15 : 0;
        L.fillStyle(0x080e28, Math.min(.75, base + nn * .5)).fillRect(0, 0, W, H);
        if (!this.glows) { this.glows = this.fires.map(([x, y]) => Tex.light(this, x, y, 150, 0xff9a40, .4)); this.windows.forEach(([x, y]) => this.glows.push(Tex.light(this, x, y, 70, 0xffd080, 0))); }
        this.glows.forEach((l, i) => l.setAlpha(i < this.fires.length ? .35 + Math.sin(t / 2 + i) * .08 : (.3 + Math.sin(t / 2.3 + i) * .05) * Math.min(1, nn * 1.6)));
        this.people.forEach(p => { if (!p.spot) p.spr.y = p.y + Math.sin(t / 9 + p.t0) * .8; });
        this.movePlayer(dt);
    }
}
