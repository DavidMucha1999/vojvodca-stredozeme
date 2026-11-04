/*
 * ENGINE: pamätihodnosti s vlastnou scénou v izometrii (PLACES v js/data/places.js, základ IsoRoom). init({ p }): p = číslo miesta. mode = 'room'.
 * Každý druh (kind) má vlastnú kulisu: zrúcanina Amon Sûl, Argonath nad Anduinou, dom Toma Bombadila, Mŕtve močiare,
 * pavúčie húštiny, Fangorn, brána Ciest mŕtvych, Beornov dvor, Brody na Isene, trollie jaskyne, Pelennor.
 * Postavy a miesta spúšťajú voľby z js/ui/places.js (placeAct) – hráč k nim dôjde alebo stlačí medzerník.
 */
class PlaceScene extends IsoRoom {
    constructor() { super('Place'); }
    init(d) { this.pi = d.p; }

    create() {
        this.cameras.main.setZoom(RES).setOrigin(0, 0);
        const P = PLACES[this.pi], k = P.kind, seed = this.pi * 13 + 7, R = n => { const x = Math.sin((seed + n) * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
        this.pl = P; this.R = R;
        const walled = k === 'door' || k === 'web' || k === 'ents' || k === 'cave';
        this.setIso(360, 240, walled ? 130 : 0, undefined, walled ? 214 : k === 'statues' ? 132 : 112);
        const FW = this.FW, FD = this.FD;
        const ground = { tower: ['grass', '#4a5a3a', 0x3a4a3a], statues: ['grass', '#5a7a4a', 0x4a6a44], cave: ['cobbles', '#5a5a56', 0x4a4a46], house: ['grass', '#5a8a3a', 0x4a7a3a], swamp: ['mud', '#3a3a2a', 0x2a2e24], web: ['mud', '#2a2a24', 0x1a1a16], ents: ['grass', '#3a5a2a', 0x1a2a18], door: ['flags', '#3a3a40', 0x2a2a30], homestead: ['grass', '#5a7a3a', 0x4a6a3a], ford: ['sand', '#9a8a60', 0x4a5a4a], tree: ['grass', '#6a7a3a', 0x5a6a3a] }[k] || ['grass', '#5a7a3a', 0x4a6a34];
        this.torches = []; this.fires = []; this.ent = this.hives = this.wisps = this.mist = this.doorAt = this.smoke = null; this.fx = this.add.graphics().setDepth(1700); this.fxLow = this.add.graphics().setDepth(1);
        let spots = [], noSky = false;
        const hills = { tower: [[0x3a4a5a, 6, -10, 60], [0x4a5a4a, 7, 16, 44]], statues: [[0x3a4a6a, 5, -20, 70], [0x4a5a6a, 6, 10, 40]], house: [[0x4a7a3a, 6, 0, 50]], swamp: [[0x2a3a2a, 6, 0, 36]], homestead: [[0x4a6a3a, 6, 0, 50]], ford: [[0x4a5a4a, 6, 0, 46]], tree: [[0xcfd3d8, 7, -30, 50]] }[k] || [];
        if (walled) { noSky = k !== 'cave'; this.sky = this.add.graphics().setDepth(-1); this.skyRect = [0, 0, W, this.OY - this.WH + 70]; if (k === 'cave') { const g = this.add.graphics().setDepth(-.5); g.fillStyle(0x4a4a46, 1); for (let i = 0; i < 5; i++) g.fillTriangle(i * 180 - 80, this.OY - this.WH + 70, i * 180 + 120, this.OY - this.WH + 70, i * 180 + 20 + R(i) * 40, this.OY - this.WH - 30 - R(i + 9) * 40); } this.floor(ground[0], ground[1], seed, true); this.wallL(k === 'ents' || k === 'web' ? 'bark' : 'dark', k === 'ents' ? '#3a2e1a' : k === 'web' ? '#1a1c16' : '#2a2a30', seed); this.wallR(k === 'ents' || k === 'web' ? 'bark' : 'dark', k === 'ents' ? '#3a2e1a' : k === 'web' ? '#1a1c16' : '#2a2a30', seed + 1); }
        else { this.outdoor(ground[2], hills, this.OY - 34); this.floor(ground[0], ground[1], seed, false); }
        if (k === 'tower') {   // zrúcanina Amon Sûl: kruh zborených múrov okolo pahorku, zvyšok veže
            this.onFloor(c => { c.fillStyle = 'rgba(90,100,70,.8)'; c.beginPath(); c.ellipse(FW / 2, 90, 110, 80, 0, 0, 7); c.fill(); });
            const tx = FW / 2, ty = 90;
            for (let a = 0; a < 9; a++) { const ang = a / 9 * 6.283, px = tx + Math.cos(ang) * 84, py = ty + Math.sin(ang) * 60, h = 10 + R(a) * 30; if (a % 3) this.box(px - 7, py - 7, 14, 14, h, '#6a6a66', { line: false }); }
            this.cyl(tx, ty, 26, 70, '#7a7a74'); this.prop(tx, ty, (g, sx, sy) => { g.fillStyle(0x5a5a56, 1); for (let a = 0; a < 6; a++) g.fillRect(sx - 26 + a * 9, sy - 70 - 6 - R(a + 3) * 16, 7, 8 + R(a + 3) * 16); g.fillStyle(0x15100c, 1).fillRect(sx - 7, sy - 26, 14, 20); g.fillStyle(0x000000, .35).fillRect(sx - 4, sy - 56, 8, 12); }, 1);
            this.fires.push([tx + 70, ty + 90]);
            spots.push([tx, ty + 30, 70, 110, 'Vrchol veže', 0, [tx, ty + 46]]);
        } else if (k === 'statues') {   // Argonath: rieka vzadu, dvaja kamenní králi
            this.water(0, 0, FW, 70);
            for (const sx of [70, FW - 70]) { this.box(sx - 20, 76, 40, 24, 16, '#7a8a8a'); this.cyl(sx, 88, 16, 90, '#7a8a8a', { z: 16, block: false }); this.prop(sx, 88, (g, px, py) => { const flip = sx > FW / 2 ? -1 : 1, top = py - 106; g.fillStyle(0x8a9a9a, 1).fillCircle(px, top - 12, 14).fillRect(px - 18, top - 30, 36, 8); g.fillStyle(0x7a8a8a, 1).fillRect(px + flip * 16, top + 20, flip * 18, 10).fillRect(px + flip * 28, top - 24, flip * 8, 54); g.fillStyle(0x6a7a7a, 1).fillRect(px - 16, top + 40, 32, 5).fillRect(px - 16, top + 70, 32, 5); g.fillStyle(0x000000, .25).fillRect(px - 4, top + 50, 8, 10); }, 1); }
            spots.push([FW / 2, 84, 120, 50, 'Prejsť popod Kráľov', 0, [FW / 2, 104]]);
        } else if (k === 'cave') {   // trollie jaskyne: tmavý vchod v stene, kosti, skamenení trollovia
            this.onWallL(c => { c.fillStyle = '#0c0a08'; c.beginPath(); c.moveTo(FD / 2 - 46, 0); c.lineTo(FD / 2 - 46, 50); c.quadraticCurveTo(FD / 2, 110, FD / 2 + 46, 50); c.lineTo(FD / 2 + 46, 0); c.fill(); });
            for (const [bx, by] of [[80, 160], [FW - 90, 120], [200, 200]]) this.prop(bx, by, (g, sx, sy) => { g.fillStyle(0xe8e4d8, 1).fillRect(sx, sy, 14, 4).fillRect(sx + 20, sy - 6, 4, 14); g.fillCircle(sx + 30, sy + 4, 5); });
            for (const [sx, sy] of [[FW - 60, 40], [FW - 110, 70], [60, FD - 60]]) { this.prop(sx, sy, (g, px, py) => { g.fillStyle(0x000000, .25).fillEllipse(px, py + 2, 44, 16); g.fillStyle(0x6a6a66, 1).fillEllipse(px, py - 34, 44, 70); g.fillStyle(0x4a4a46, 1).fillEllipse(px + 6, py - 50, 12, 9).fillEllipse(px - 10, py - 52, 10, 8); }); this.blocks.push([sx - 16, sy - 12, 32, 24]); }
            this.fires.push([FW / 2 + 60, FD / 2 + 40]);
            spots.push([10, FD / 2, 80, 110, 'Jaskyne', 0, [40, FD / 2]]);
            if (P.id === 'trolls') spots.push([FW - 60, 40, 80, 80, 'Trón trollieho kráľa', 1, [FW - 60, 90]]);
        } else if (k === 'house') {   // dom Toma Bombadila: žltý dom so zelenou strechou, vŕby, kvety, Vrbovka vpredu
            this.water(0, FD - 36, FW, 36, '#2c5b73');
            this.doorAt = this.house(190, 30, 90, 56, 40, 0xe8d070, 0x7a9a3a, { rh: 30, ov: 8, doorCol: 0x3a6ad0, chimneyCol: 0x8a8a90 });
            for (const [tx, ty] of [[40, 20], [120, 10], [330, 100], [20, 120], [340, 180]]) this.tree(tx, ty, 'willow', .9 + R(tx) * .4);
            this.onFloor(c => { for (let i = 0; i < 16; i++) { c.fillStyle = ['#e84a4a', '#f0d040', '#4a8ae8', '#f0f0f0'][i % 4]; c.beginPath(); c.arc(150 + R(i) * 140, 100 + R(i + 9) * 90, 3, 0, 7); c.fill(); } });
            spots.push([this.doorAt[0], this.doorAt[1] - 12, 70, 60, 'Dom Toma Bombadila', 0, this.doorAt]);
        } else if (k === 'swamp') {   // Mŕtve močiare: mláky, trstina, bludičky
            this.onFloor(c => { for (let i = 0; i < 9; i++) { c.fillStyle = 'rgba(26,42,36,.95)'; c.beginPath(); c.ellipse(40 + R(i) * (FW - 80), 30 + R(i + 9) * (FD - 60), 36 + R(i + 20) * 30, 22 + R(i + 30) * 14, 0, 0, 7); c.fill(); } c.fillStyle = 'rgba(80,90,70,.5)'; for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse(60 + i * 50, 70 + R(i + 40) * 110, 7, 4, 0, 0, 7); c.fill(); } });
            for (let i = 0; i < 14; i++) this.prop(20 + R(i) * (FW - 40), 20 + R(i + 5) * (FD - 40), (g, sx, sy) => { g.fillStyle(0x4a4a3a, 1).fillRect(sx - 1, sy - 26, 2.5, 26).fillRect(sx + 4, sy - 20, 2, 20); g.fillStyle(0x6a5a3a, 1).fillRect(sx - 2, sy - 30, 4, 6); });
            for (let i = 0; i < 3; i++) this.tree(60 + i * 120, 20 + R(i + 60) * 40, 'dead', .7);
            this.wisps = Array.from({ length: 6 }, (_, i) => [40 + i * 55, 40 + R(i + 60) * 160]);
            spots.push([FW / 2, FD / 2, 120, 60, 'Brod cez močiar', 0, [FW / 2, FD / 2 + 20]], [FW - 70, FD - 50, 90, 50, 'Hľadať v bahne', 1, [FW - 70, FD - 30]]);
        } else if (k === 'web') {   // pavúčie húštiny: temné kmene, pavučiny medzi nimi, zámotky
            const trunks = [[40, 40], [120, 20], [220, 30], [310, 60], [30, 150], [330, 160], [160, 110], [250, 150]];
            trunks.forEach(([tx, ty], i) => this.cyl(tx, ty, 9 + R(i) * 6, 150, '#1a1c16'));
            const g = this.add.graphics().setDepth(1500);
            g.lineStyle(1.2, 0xd8d8d0, .5); for (let i = 0; i < trunks.length - 1; i++) { const [a, b] = trunks[i], [c, d] = trunks[(i + 3) % trunks.length]; const [x1, y1] = this.P(a, b, 60 + R(i) * 60), [x2, y2] = this.P(c, d, 50 + R(i + 9) * 60); g.lineBetween(x1, y1, x2, y2); const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + 10; for (let r = 6; r < 26; r += 7) g.strokeCircle(mx, my, r); for (let a2 = 0; a2 < 6; a2++) g.lineBetween(mx, my, mx + Math.cos(a2) * 26, my + Math.sin(a2) * 26); }
            for (let i = 0; i < 4; i++) { const [tx, ty] = trunks[i * 2]; this.prop(tx + 10, ty + 10, (g2, sx, sy) => { g2.fillStyle(0xd0d0c8, .9).fillEllipse(sx + 6, sy - 60 - R(i + 7) * 30, 18, 32); }, 1); }
            spots.push([FW / 2, 40, 140, 100, 'Húštiny', 0, [FW / 2, 90]]);
        } else if (k === 'ents') {   // Fangorn: obrie kmene, Stromobrad
            for (const [tx, ty, r] of [[40, 30, 18], [150, 16, 22], [300, 40, 20], [30, 170, 16], [330, 190, 18]]) { this.cyl(tx, ty, r, 160, '#3a2e1a'); this.prop(tx, ty, (g, sx, sy) => { g.fillStyle(0x2a4a24, .95).fillEllipse(sx, sy - 165, r * 5, 50); }, 1); }
            const ex = FW / 2 + 50, ey = FD / 2 - 20; this.cyl(ex, ey, 18, 120, '#5a4a2a'); this.prop(ex, ey, (g, sx, sy) => { g.fillStyle(0x5a4a2a, 1).fillRect(sx - 56, sy - 100, 40, 10).fillRect(sx + 16, sy - 90, 46, 10); g.fillStyle(0x3a6a2a, 1).fillEllipse(sx, sy - 130, 90, 50).fillEllipse(sx - 40, sy - 104, 30, 18).fillEllipse(sx + 50, sy - 94, 30, 18); g.fillStyle(0x3a2a14, 1).fillRect(sx - 12, sy - 74, 24, 10); }, 1);
            this.ent = [ex, ey, 86];
            spots.push([ex, ey + 20, 90, 150, 'Stromobrad', 0, [ex - 10, ey + 44]]);
        } else if (k === 'door') {   // brána Ciest mŕtvych: čierny oblúk v skalnej stene, lebky, hmla
            this.onWallR(c => { c.fillStyle = '#3a3a44'; for (let i = 0; i < 7; i++) c.fillRect(FW / 2 - 90 + i * 30, 96, 8, 20); c.fillStyle = '#0a0a0e'; c.beginPath(); c.moveTo(FW / 2 - 40, 0); c.lineTo(FW / 2 - 40, 60); c.arc(FW / 2, 60, 40, Math.PI, 0); c.lineTo(FW / 2 + 40, 0); c.fill(); c.fillStyle = '#5a5a66'; for (let i = 0; i < 5; i++) c.fillRect(FW / 2 - 60 + i * 30, 0, 6, 100); });
            for (let i = 0; i < 8; i++) this.prop(40 + R(i) * (FW - 80), 60 + R(i + 9) * (FD - 80), (g, sx, sy) => { g.fillStyle(0xe8e4d8, .85).fillCircle(sx, sy - 3, 4); g.fillStyle(0x1a1210, 1).fillRect(sx - 2.5, sy - 4, 1.5, 1.5).fillRect(sx + 1, sy - 4, 1.5, 1.5); });
            this.mist = 1;
            spots.push([FW / 2, 4, 100, 110, 'Brána mŕtvych', 0, [FW / 2, 40]]);
        } else if (k === 'homestead') {   // Beornov dvor: veľký zrub, úle, ovce
            this.doorAt = this.house(120, 20, 150, 80, 56, 0x6a4a2a, 0x8a6a3a, { rh: 46, ov: 10, logs: true, doorW: 18, doorH: 30, doorCol: 0x3a2a14, chimneyCol: 0x6a6a70 });
            for (let i = 0; i < 5; i++) this.box(FW - 50, 100 + i * 24, 16, 14, 16, '#d8c070', { top: 0xb09040 });
            this.hives = [FW - 42, 130, 20];
            for (let i = 0; i < 5; i++) this.prop(40 + i * 26, 170 + (i % 2) * 20, (g, sx, sy) => { g.fillStyle(0x000000, .2).fillEllipse(sx, sy + 1, 16, 6); g.fillStyle(0xf0f0f0, 1).fillEllipse(sx, sy - 5, 14, 9); g.fillStyle(0x2a2a2a, 1).fillCircle(sx + 7, sy - 7, 3); });
            for (const [tx, ty] of [[-30, 40], [FW + 24, 30], [40, -30]]) this.tree(tx, ty, 'round', 1.3, 0x4a7a3a);
            spots.push([this.doorAt[0], this.doorAt[1] - 14, 90, 80, 'Beornov dom', 0, this.doorAt]);
        } else if (k === 'ford') {   // Brody na Isene: rieka cez stred, plytčina, staré prilby
            this.water(0, 80, FW, 80, '#2c5b73');
            this.onFloor(c => { c.fillStyle = 'rgba(154,138,96,.9)'; for (let i = 0; i < 9; i++) { c.beginPath(); c.ellipse(FW / 2 - 90 + i * 22, 90 + R(i) * 60, 18, 9, 0, 0, 7); c.fill(); } });
            for (let i = 0; i < 6; i++) this.prop(30 + R(i + 3) * (FW - 60), 180 + R(i + 9) * 50, (g, sx, sy) => { g.fillStyle(0x5a5a56, 1).fillRect(sx, sy, 10, 3); g.fillStyle(0x8a8a90, 1).fillEllipse(sx + 18, sy - 2, 10, 6); });
            for (const [tx, ty] of [[-30, 30], [FW + 30, 40]]) this.tree(tx, ty, 'round', 1.1, 0x3a5a2a);
            spots.push([FW / 2, 120, 160, 60, 'Brod', 0, [FW / 2, 175]]);
        } else if (k === 'tree') {   // Pelennor: mŕtvy strom, zlomené kopije, hradby Minas Tirith na obzore
            const g = this.add.graphics().setDepth(-.3); g.fillStyle(0x8a9098, 1).fillRect(W / 2 - 300, this.OY - 74, 600, 40); for (let i = 0; i < 12; i++) g.fillRect(W / 2 - 300 + i * 52, this.OY - 84, 24, 12); g.fillStyle(0xd8dce0, 1).fillRect(W / 2 - 20, this.OY - 120, 40, 50);
            this.tree(FW / 2, FD / 2 - 20, 'dead', 1.2); this.blocks.push([FW / 2 - 8, FD / 2 - 28, 16, 16]);
            for (let i = 0; i < 10; i++) this.prop(20 + R(i) * (FW - 40), 20 + R(i + 9) * (FD - 40), (g2, sx, sy) => { g2.fillStyle(0x5a5a56, 1).fillRect(sx - 7, sy - 1, 14, 2.5); g2.fillStyle(0x8a8a90, 1).fillRect(sx + 5, sy - 3, 4, 2); });
            spots.push([FW / 2, FD / 2 - 20, 80, 120, 'Mŕtvy strom', 0, [FW / 2, FD / 2 + 10]]);
        }
        for (const [fx, fy] of this.fires) { this.prop(fx, fy, (g, sx, sy) => { g.fillStyle(0x3a2a1a, 1).fillRect(sx - 12, sy - 2, 24, 3).fillRect(sx - 8, sy - 5, 16, 3); g.fillStyle(0x6a6a66, 1); for (let a = 0; a < 6; a++) g.fillCircle(sx + Math.cos(a) * 16, sy + Math.sin(a) * 6, 3); }); }
        this.commitBg();
        this.noSky = noSky;
        this.npc(k);
        this.setupRoom({ mode: 'room', title: P.n, leave: 'Odísť', spawn: [FW / 2 - 40, FD - 24], amb: k === 'cave' || k === 'door' ? 'cave' : k === 'web' || k === 'swamp' ? 'cave' : k === 'ents' || k === 'house' ? 'elf' : 'yard', floorSnd: k === 'cave' || k === 'door' ? 'stone' : k === 'ford' ? 'sand' : 'grass' });
        spots.forEach(([x, y, w, h, n, a, st]) => this.spot(x, y, w, h, n, () => placeAct(this.pi, a), st));
    }

    /** Postavy miest: Tom Bombadil, Beorn, strážca prístavu… */
    npc(k) {
        const FW = this.FW, FD = this.FD;
        if (k === 'house') this.person(this.doorAt[0] - 50, this.doorAt[1] + 20, [{ w: null, a: 0, s: 0, h: null, m: 0 }, { cape: '#3a6ad0', hcol: '#6a4a2a', beard: '#6a4a2a', hat: 1 }], 'Tom Bombadil', () => placeTalk(this.pi, 'tom'), .9);
        if (k === 'homestead') this.person(this.doorAt[0] + 60, this.doorAt[1] + 10, [{ w: 5, a: 0, s: 0, h: null, m: 0 }, { cape: '#2a2a2a', hcol: '#1a1a1a', beard: '#1a1a1a' }], 'Beorn', () => placeTalk(this.pi, 'beorn'), 1.2);
        if (k === 'tower') this.person(80, FD - 70, [{ w: 3, a: 0, s: 0, h: null, m: 0 }, { cape: '#3a4a3a', hcol: '#2a1a10' }], 'Hraničiar', () => placeTalk(this.pi, 'ranger'), .9);
        if (k === 'ford') this.person(70, FD - 50, [{ w: 2, a: 1, s: 1, h: 1, m: 0 }, { cape: '#3a6a2a' }], 'Rohanský zved', () => placeTalk(this.pi, 'rider'), .9);
        if (k === 'tree') this.person(FW / 2 + 90, FD / 2 + 40, [{ w: 1, a: 2, s: 2, h: 4, m: 0 }, { cape: '#2a3a6a' }], 'Strážca Pelennoru', () => placeTalk(this.pi, 'guard'), .9);
        if (k === 'statues') this.person(FW - 110, 110, [{ w: null, a: 0, s: 0, h: null, m: 0 }, { cape: '#4a3a2a', beard: '#c8c0b0', hcol: '#c8c0b0' }], 'Prievozník', () => placeTalk(this.pi, 'ferry'), .9);
        if (k === 'ents') this.person(this.ent[0] - 70, this.ent[1] + 50, [{ w: null, a: 0, s: 0, h: null, m: 0 }, { cape: '#4a6a3a', hcol: '#8a6a3a' }], 'Hobit Smiešok', () => placeTalk(this.pi, 'hobbit'), .8);
    }

    leave() { if (mode !== 'room') return; leaveRoomScene(); }

    update(time, delta) {
        const dt = Math.min(3, (delta || 16.7) / 16.67);
        if (mode !== 'room') { if (mode !== 'town') { if (mode === 'battle' || mode === 'map') ROOM = null; this.closeRoom(); } return; }
        const t = tm, nn = nightness(), s = this.sky, f = this.fx, k = this.pl.kind;
        if (s) { s.clear(); if (!this.noSky) this.drawSky(s, ...(this.skyRect || [0, 0, W, this.OY - this.WH + 10])); }
        f.clear(); this.fxLow.clear();
        this.waterFx(this.fxLow);
        for (const [fx, fy] of this.fires) this.flame(f, fx, fy, 2);
        if (this.wisps) for (const [wx, wy] of this.wisps) { const a = .3 + .3 * Math.sin(t / 7 + wx), [sx, sy] = this.P(wx + Math.sin(t / 20 + wy) * 6, wy + Math.cos(t / 17 + wx) * 4, 10); f.fillStyle(0x9ad0ff, a).fillCircle(sx, sy, 3); f.fillStyle(0x9ad0ff, a * .3).fillCircle(sx, sy, 9); }
        if (this.mist) { f.fillStyle(0xbec8d2, .18 + .06 * Math.sin(t / 30)); for (let i = 0; i < 5; i++) f.fillEllipse((i * 190 + t * .4) % (W + 200) - 100, this.OY + 20 + i * 30, 260, 40); }
        if (this.hives) { const [hx, hy, hz] = this.hives, [sx, sy] = this.P(hx, hy, hz); f.fillStyle(0xf0c030, 1); for (let i = 0; i < 8; i++) f.fillRect(sx + Math.sin(t / 9 + i) * 40, sy + Math.cos(t / 7 + i * 2) * 30 + i * 4, 2, 2); }
        if (this.ent) { const [ex, ey, ez] = this.ent, [sx, sy] = this.P(ex, ey, ez); f.fillStyle(0xe8e060, .6 + .4 * Math.sin(t / 15)).fillCircle(sx - 7, sy, 3).fillCircle(sx + 7, sy, 3); }
        if (nn > .3) { f.fillStyle(0xffd080, .5 * nn); for (const [wx, wy] of this.winPts || []) f.fillRect(wx - 5, wy - 4, 10, 8); }
        const L = this.light; L.clear();
        const base = k === 'web' ? .35 : k === 'door' ? .3 : k === 'cave' ? .15 : k === 'ents' ? .15 : 0;
        L.fillStyle(0x080e28, Math.min(.75, base + nn * .5)).fillRect(0, 0, W, H);
        if (!this.glows) { this.glows = this.fires.map(([x, y]) => this.glow(x, y, 8, 150, 0xff9a40, .4)); (this.winPts || []).forEach(([x, y]) => this.glows.push(Tex.light(this, x, y, 70, 0xffd080, 0, 1600))); }
        this.glows.forEach((l, i) => l.setAlpha(i < this.fires.length ? .35 + Math.sin(t / 2 + i) * .08 : (.3 + Math.sin(t / 2.3 + i) * .05) * Math.min(1, nn * 1.6)));
        this.people.forEach(p => { if (!p.spot) p.spr.y = p.sy + Math.sin(t / 9 + p.t0) * .8; });
        this.movePlayer(dt);
    }
}
