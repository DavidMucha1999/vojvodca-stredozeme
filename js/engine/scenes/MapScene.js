/*
 * ENGINE: mapa sveta.
 * Logika (pohyb, AI, diplomacia, dni) beží v js/sim cez updMap(dt).
 * Scéna ju iba zobrazuje: dlaždice mapy, hrady a dediny, armády s viajúcimi
 * zástavami, kameru so zoomom a minimapu ako druhú kameru.
 * Súradnice obrazovky sú logické (720×480), plátno má rozlíšenie RES-krát väčšie.
 */
const MM = { x: W - 186, y: H - 126, w: 180, h: 120 };
const FONT = '"IM Fell English", Georgia, serif';
const txtStyle = (size, color, extra) => Object.assign({ fontFamily: FONT, fontSize: size + 'px', color, resolution: RES }, extra);

class MapScene extends Phaser.Scene {
    constructor() { super('Map'); }

    create() {
        this.armies = new Map();
        this.hover = null;
        const tiled = typeof MAPDATA !== 'undefined' && MAPDATA.terrain && this.textures.exists('terrain');
        const worldObjs = tiled ? this.buildTerrain() : Art.worldTiles(this).map(t => this.add.image(t.x, t.y, t.key).setOrigin(0).setScale(t.s).setDepth(-10));

        const newArt = this.textures.exists('map_castle_0');
        this.newArt = newArt;
        this.vill = VL.map(v => ({
            v, key: '',
            spr: newArt ? this.add.image(v.x, v.y, 'map_village_g1').setOrigin(.5, .8).setScale(.36).setDepth(v.y - 1) : Art.image(this, v.x, v.y, Art.village(this, 0)).setDepth(v.y - 1),
            txt: this.add.text(v.x, v.y + 14, v.n, txtStyle(12, '#d8ccb4', { backgroundColor: 'rgba(18,14,12,.6)', padding: { x: 4, y: 1 } })).setOrigin(.5, 0).setDepth(9000)
        }));

        this.towns = TW.map(t => ({
            t, f: -1,
            spr: newArt ? this.add.sprite(t.x, t.y, 'map_castle_' + t.f).setOrigin(.5, .82).setScale(.32).setDepth(t.y) : Art.image(this, t.x, t.y, Art.castle(this, t.f), 0, true).setDepth(t.y),
            txt: this.add.text(t.x, t.y + 18, '', txtStyle(15, '#ecdfc6', { backgroundColor: 'rgba(18,14,12,.82)', padding: { x: 7, y: 2 } })).setOrigin(.5, 0).setDepth(9001),
            stars: this.add.text(t.x - 24, t.y - (newArt ? 60 : 46), '', { fontFamily: 'sans-serif', fontSize: '11px', color: '#ffd24a', fontStyle: 'bold', resolution: RES }).setOrigin(.5).setDepth(9001)
        }));

        this.hero = Art.image(this, G.x, G.y, Art.rider(this, G.fac, 1), 0, true);
        this.heroTxt = this.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#ffd24a', backgroundColor: 'rgba(18,14,12,.85)', padding: { x: 5, y: 1 }, resolution: RES }).setOrigin(.5, 0).setDepth(9002);
        this.heroCrown = Art.image(this, 0, 0, Art.crown(this)).setDepth(9002);
        this.fx = this.add.graphics().setDepth(8999);

        this.cameras.main.setBounds(0, 0, WW, WH).setBackgroundColor('#1e2a16');
        this.mini = this.add.graphics().setDepth(9500);
        this.mmCam = this.cameras.add(MM.x * RES, MM.y * RES, MM.w * RES, MM.h * RES).setZoom(MM.w * RES / WW).setBounds(0, 0, WW, WH).setBackgroundColor('#120e0c');
        this.mmCam.centerOn(WW / 2, WH / 2);
        this.cameras.main.ignore(this.mini);
        if (tiled) {
            const mm = this.add.image(0, 0, this.minimapTexture()).setOrigin(0).setScale(WW / 360).setDepth(-20);
            this.cameras.main.ignore(mm);
            this.mmCam.ignore(worldObjs);
        }
        this.mmCam.ignore([this.fx, this.heroTxt, this.heroCrown, this.hero, ...this.vill.flatMap(o => [o.spr, o.txt]), ...this.towns.flatMap(o => [o.spr, o.txt, o.stars])]);

        this.input.on('pointerdown', p => this.click(p));
        this.input.on('pointermove', p => { this.hover = this.cameras.main.getWorldPoint(p.x, p.y); this.hoverScreen = { x: p.x / RES, y: p.y / RES }; });
        this.input.on('gameout', () => this.hover = null);
        this.input.on('wheel', (p, o, dx, dy) => { if (mode === 'map') Z = Math.max(.45, Math.min(1.5, Z - Math.sign(dy) * .1)); });
        this.events.once('shutdown', () => this.input.removeAllListeners());
    }

    /** Terén z editora Tiled: dlaždice zeme a lesov, voda, cesty a hory. Vráti objekty sveta. */
    buildTerrain() {
        const T = MAPDATA.terrain, tw = this.textures.get('terrain').getSourceImage().width / 8, sc = WW / (T.cols * tw), out = [];
        const rows = (data, empty) => Array.from({ length: T.rows }, (_, j) => Array.from({ length: T.cols }, (_, i) => { const g = data[j * T.cols + i]; return g ? g - 1 : empty; }));
        const layer = (data, depth, tint) => {
            const map = this.make.tilemap({ data: rows(data, -1), tileWidth: tw, tileHeight: tw });
            const ly = map.createLayer(0, map.addTilesetImage('terrain', 'terrain', tw, tw, 0, 0), 0, 0).setScale(sc).setDepth(depth);
            if (tint) ly.forEachTile(t => { if (t.index >= 0) { const b = .9 + .1 * Math.sin(t.x * .31 + Math.cos(t.y * .27) * 2) * Math.cos(t.y * .19 - t.x * .07), c = Math.round(255 * Math.min(1, b)); t.tint = (c << 16) | (c << 8) | c; } });
            out.push(ly);
        };
        layer(T.ground, -10, false);
        // jemný farebný závoj: rozmaže hranice krajín, aby nebolo vidno mriežku dlaždíc
        const wc = document.createElement('canvas'); wc.width = T.cols; wc.height = T.rows;
        const wx = wc.getContext('2d'), wcol = ['#4a6d33', '#5a6a36', '#6e6a3e', '#76603e', '#3a2a26', '#b8955a', '#d8dee6', '#24526a'];
        for (let j = 0; j < T.rows; j++) for (let i = 0; i < T.cols; i++) { wx.fillStyle = wcol[Math.floor((T.ground[j * T.cols + i] - 1) / 4)] || wcol[0]; wx.fillRect(i, j, 1, 1); }
        if (this.textures.exists('wash')) this.textures.remove('wash');
        this.textures.addCanvas('wash', wc);
        out.push(this.add.image(0, 0, 'wash').setOrigin(0).setScale(WW / T.cols).setAlpha(.42).setDepth(-9.5));
        // voda a cesty (vektorovo, ostré pri každom priblížení)
        const g = this.add.graphics().setDepth(-9), k = K;
        g.fillStyle(0x24526a, 1).fillRect(0, 0, 30 * k, WH);
        g.fillStyle(0xffffff, .35).fillRect(30 * k, 0, 3 * k, WH);
        const L = { x: 1195, y: 326, rx: 110, ry: 60, rot: .2 };
        const lake = (rx, ry, col) => { const pts = []; for (let a = 0; a < 6.3; a += .1) { const x = Math.cos(a) * rx, y = Math.sin(a) * ry; pts.push({ x: (L.x + x * Math.cos(L.rot) - y * Math.sin(L.rot)) * k, y: (L.y + x * Math.sin(L.rot) + y * Math.cos(L.rot)) * k }); } g.fillStyle(col, 1).fillPoints(pts, true); };
        lake(L.rx + 10, L.ry + 10, 0x2c5b73); lake(L.rx - 5, L.ry - 8, 0x4a86a0);
        const R = [[640, 0], [600, 300], [820, 420], [780, 640], [760, 800], [900, 880], [860, 1200]].map(([x, y]) => new Phaser.Math.Vector2(x * k, y * k));
        const river = new Phaser.Curves.Path(R[0].x, R[0].y).cubicBezierTo(R[3], R[1], R[2]).cubicBezierTo(R[6], R[4], R[5]).getPoints(160);
        // rieka: piesočné brehy, tmavý stred, svetlý prúd
        g.lineStyle(22 * k * .75, 0x9a8a5a, .55).strokePoints(river);
        g.lineStyle(14 * k * .75, 0x2c5b73, 1).strokePoints(river); g.lineStyle(7 * k * .75, 0x4a86a0, 1).strokePoints(river); g.lineStyle(2 * k * .75, 0x8ac0d8, .5).strokePoints(river);
        // cesty: tmavší okraj, svetlý stred, vyjazdené koľaje
        const roads = MAPDATA.roads.map(([a, b]) => { const A = TW[a], B = TW[b]; return new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(A.x, A.y), new Phaser.Math.Vector2((A.x + B.x) / 2 + 30 * k, (A.y + B.y) / 2 - 25 * k), new Phaser.Math.Vector2(B.x, B.y)).getPoints(28); });
        g.lineStyle(5.5 * k * .75, 0x7a6a44, .55); roads.forEach(r => g.strokePoints(r));
        g.lineStyle(3.6 * k * .75, 0xc4ad78, .85); roads.forEach(r => g.strokePoints(r));
        g.lineStyle(.5 * k * .75, 0x8a7a50, .6); roads.forEach(r => { g.strokePoints(r.map(p => ({ x: p.x, y: p.y - 1.1 * k * .75 }))); g.strokePoints(r.map(p => ({ x: p.x, y: p.y + 1.1 * k * .75 }))); });
        out.push(g);
        if (this.textures.exists('map_field_g0')) {
            // mosty tam, kde cesta pretína rieku
            for (const r of roads) for (let i = 1; i < r.length; i++) {
                const p = r[i], near = river.find(q => Math.hypot(q.x - p.x, q.y - p.y) < 6 * k);
                if (near) { const a = Math.atan2(r[i].y - r[i - 1].y, r[i].x - r[i - 1].x); out.push(this.add.image(near.x, near.y, 'map_bridge').setScale(.5).setRotation(a).setDepth(-8.5)); break; }
            }
            // polia okolo dedín a skalky po krajine
            const rnd = (n) => ((n * 9301 + 49297) % 233280) / 233280;
            VL.forEach((v, i) => { for (let f = 0; f < 2; f++) { const a = rnd(i * 3 + f) * 6.283, d = 48 + rnd(i * 7 + f) * 20; out.push(this.add.image(v.x + Math.cos(a) * d, v.y + Math.sin(a) * d * .7, 'map_field_' + regionAt(v.x, v.y) + ((i + f) % 2)).setScale(.4).setAlpha(.9).setRotation((rnd(i + f * 5) - .5) * .6).setDepth(-8.6)); } });
            for (let i = 0; i < 160; i++) { const x = rnd(i * 11 + 1) * WW, y = rnd(i * 13 + 2) * WH; if (!TW.some(t => Math.hypot(t.x - x, t.y - y) < 150) && !VL.some(v => Math.hypot(v.x - x, v.y - y) < 90)) out.push(this.add.image(x, y, 'map_rocks_' + (i % 3)).setScale(.4).setDepth(-8.4)); }
        }
        // mäkký tmavý podklad pod lesmi: zjemní hranice dlaždíc a dá lesu hĺbku
        const fc = document.createElement('canvas'); fc.width = T.cols; fc.height = T.rows;
        const fx = fc.getContext('2d');
        for (let j = 0; j < T.rows; j++) for (let i = 0; i < T.cols; i++) { const f = T.forest[j * T.cols + i]; if (f >= 33 && f <= 36) { fx.fillStyle = 'rgba(10,30,12,.5)'; fx.fillRect(i, j, 1, 1); } }
        // rozmazanie: susedné dlaždice dostanú slabší odtieň, aby okraj lesa splýval s lúkou
        const fc2 = document.createElement('canvas'); fc2.width = T.cols; fc2.height = T.rows; const fx2 = fc2.getContext('2d');
        fx2.filter = 'blur(1px)'; fx2.drawImage(fc, 0, 0); fx2.filter = 'none'; fx2.drawImage(fc, 0, 0);
        if (this.textures.exists('forestwash')) this.textures.remove('forestwash');
        this.textures.addCanvas('forestwash', fc2);
        out.push(this.add.image(-WW / T.cols * .5, -WH / T.rows * .5, 'forestwash').setOrigin(0).setScale(WW / T.cols).setAlpha(.9).setDepth(-8.7));
        layer(T.forest, -8, false);
        // hory
        for (const [x, y, size, kind, v] of T.mountains) {
            const key = 'mtn_' + kind + '_' + (kind === 'doom' ? 0 : v % 3);
            if (!this.textures.exists(key)) continue;
            const img = this.add.image(x * k, y * k, key).setOrigin(.5, .92), w = img.width;
            img.setScale(2 * size * k / .96 / w).setDepth(-7 + y / 1e4);      // pod hradmi a armádami, ako na pôvodnej mape
            out.push(img);
            if (kind === 'doom') this.doom = img;
        }
        return out;
    }

    /** Minimapa ako jeden obrázok (360 × 240) z dát terénu. */
    minimapTexture() {
        const T = MAPDATA.terrain, c = document.createElement('canvas'); c.width = 360; c.height = 240;
        const x = c.getContext('2d'), sx = 360 / T.cols, sy = 240 / T.rows;
        const col = ['#4a6d33', '#5a6a36', '#6e6a3e', '#76603e', '#3a2a26', '#b8955a', '#d8dee6', '#24526a'];
        for (let j = 0; j < T.rows; j++) for (let i = 0; i < T.cols; i++) {
            const n = j * T.cols + i; x.fillStyle = col[Math.floor((T.ground[n] - 1) / 4)] || '#4a6d33'; x.fillRect(i * sx, j * sy, sx + .5, sy + .5);
            const f = T.forest[n]; if (f >= 33 && f <= 38) { x.fillStyle = f >= 37 ? 'rgba(40,30,20,.5)' : 'rgba(20,50,20,.55)'; x.fillRect(i * sx, j * sy, sx + .5, sy + .5); }
        }
        const s = 360 / 1800;
        x.strokeStyle = '#3a7a96'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(640 * s, 0); x.bezierCurveTo(600 * s, 300 * s, 820 * s, 420 * s, 780 * s, 640 * s); x.bezierCurveTo(760 * s, 800 * s, 900 * s, 880 * s, 860 * s, 1200 * s); x.stroke();
        x.fillStyle = '#3a7a96'; x.beginPath(); x.ellipse(1195 * s, 326 * s, 110 * s, 60 * s, .2, 0, 7); x.fill();
        for (const [mx, my, , kind] of T.mountains) { x.fillStyle = kind === 'snow' ? '#e8ecf2' : kind === 'doom' ? '#ff6a1a' : '#1a1210'; x.beginPath(); x.moveTo(mx * s, my * s - 4); x.lineTo(mx * s - 4, my * s + 3); x.lineTo(mx * s + 4, my * s + 3); x.fill(); }
        if (this.textures.exists('minimap')) this.textures.remove('minimap');
        this.textures.addCanvas('minimap', c);
        return 'minimap';
    }

    click(p) {
        if (mode !== 'map' || !G) return;
        if (G.camp) { G.camp = 0; const b = [...tb.children].find(x => /tábor/i.test(x.textContent)); if (b) b.textContent = 'Tábor'; upd(); }
        G.dest = -1; G.vd = -1; G.chase = null; G.talk = null;
        const sx = p.x / RES, sy = p.y / RES;
        if (sx > MM.x && sy > MM.y) { G.tx = (sx - MM.x) / MM.w * WW; G.ty = (sy - MM.y) / MM.h * WH; return; }
        const w = this.cameras.main.getWorldPoint(p.x, p.y);
        G.tx = w.x; G.ty = w.y;
        E.forEach(e => { if (Math.hypot(e.x - w.x, e.y - w.y) < 34) { if (hos(e.f, G.fac)) G.chase = e; else G.talk = e; } });
        VL.forEach((v, i) => { if (Math.hypot(v.x - w.x, v.y - w.y) < 26) { G.tx = v.x; G.ty = v.y; G.vd = i; } });
        TW.forEach((t, i) => { if (Math.hypot(t.x - w.x, t.y - w.y) < 30) { G.tx = t.x; G.ty = t.y; G.dest = i; } });
        if (G.chase || G.talk) { G.vd = -1; G.dest = -1; }
    }

    update(time, delta) {
        if (!G) return;
        if (mode === 'map') updMap(Math.min(2, delta / 16.67));
        if (mode === 'battle') { this.scene.start('Battle'); return; }

        const c = this.cameras.main;
        c.setZoom(Z * RES);
        cam.x = Math.max(0, Math.min(WW - W / Z, G.x - W / Z / 2));
        cam.y = Math.max(0, Math.min(WH - H / Z, G.y - H / Z / 2));
        c.centerOn(cam.x + W / Z / 2, cam.y + H / Z / 2);

        this.syncTowns();
        this.syncArmies();
        this.syncHero();
        this.drawFx();
        this.drawMini();
    }

    syncTowns() {
        for (const o of this.towns) {
            const t = o.t, L = lvl(t);
            if (o.f !== t.f) { o.f = t.f; if (this.newArt) o.spr.setTexture('map_castle_' + t.f); else { const k = Art.castle(this, t.f); o.spr.setTexture(k, 0).play({ key: k + ':wave', startFrame: TW.indexOf(t) % 4 }); } }
            o.spr.setScale((this.newArt ? .32 : (Art.scale[o.spr.texture.key] || 1 / RES)) * (.85 + L * .08));
            o.txt.setText(t.n + '  ⚔' + t.g);
            o.stars.setText('★'.repeat(L));
        }
        for (const o of this.vill) {
            const f = TW[o.v.t].f, b = o.v.st > 0, L = lvl(o.v), key = f + (b ? 'b' : '') + (this.newArt ? L : '');
            if (o.key !== key) {
                o.key = key;
                if (this.newArt) o.spr.setTexture(b ? 'map_village_burn' : 'map_village_' + regionAt(o.v.x, o.v.y) + L).setScale(.36);
                else { const k = Art.village(this, f, b); o.spr.setTexture(k).setScale(Art.scale[k] || 1 / RES); }
                o.txt.setColor(b ? '#c08070' : FC[f]);
            }
        }
    }

    syncArmies() {
        const seen = new Set();
        for (const e of E) {
            seen.add(e.id);
            let o = this.armies.get(e.id);
            if (!o) {
                o = {
                    f: -1,
                    spr: Art.image(this, e.x, e.y, Art.rider(this, e.f), 0, true),
                    txt: this.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#ecdfc6', backgroundColor: 'rgba(18,14,12,.78)', padding: { x: 5, y: 1 }, resolution: RES }).setOrigin(.5, 0).setDepth(9002),
                    crown: Art.image(this, 0, 0, Art.crown(this)).setDepth(9002)
                };
                this.mmCam.ignore([o.spr, o.txt, o.crown]);
                this.armies.set(e.id, o);
            }
            if (o.f !== e.f) { o.f = e.f; const k = Art.rider(this, e.f); o.spr.setTexture(k, 0).play({ key: k + ':wave', startFrame: e.id % 4 }); }
            o.spr.setPosition(e.x, e.y).setDepth(e.y);
            o.txt.setPosition(e.x, e.y + 19).setText(e.nm + ' ' + Math.ceil(e.n))
                .setColor(hos(e.f, G.fac) ? '#ff8a70' : (AL[G.fac][e.f] || e.f === G.fac) ? '#9fe08a' : '#ecdfc6');
            o.crown.setVisible(!!e.kr).setPosition(e.x + 17, e.y - 46);
        }
        for (const [id, o] of this.armies)
            if (!seen.has(id)) { o.spr.destroy(); o.txt.destroy(); o.crown.destroy(); this.armies.delete(id); }
    }

    syncHero() {
        const key = Art.rider(this, G.fac, 1);
        if (this.hero.texture.key !== key) this.hero.setTexture(key, 0).setScale(Art.scale[key] || 1 / RES).play(key + ':wave');
        if (!this.hero.anims.isPlaying) this.hero.play(key + ':wave');
        const moving = Math.hypot(G.tx - G.x, G.ty - G.y) > 3;
        this.hero.setPosition(G.x, G.y + (moving ? Math.sin(tm * .4) * 1.2 : 0)).setDepth(G.y + 1);
        this.heroTxt.setPosition(G.x, G.y + 38).setText(G.name + ' ' + ar());
        this.heroCrown.setVisible(!!G.king).setPosition(G.x + 17, G.y - 46);
    }

    drawFx() {
        const g = this.fx; g.clear();
        const moving = Math.hypot(G.tx - G.x, G.ty - G.y) > 3;
        if (moving) for (let k = 1; k < 5; k++) g.fillStyle(0xc8b48c, .22 - k * .04).fillCircle(G.x - Math.cos(G.f || 0) * k * 7, G.y - Math.sin(G.f || 0) * k * 7 + 8, 5 - k * .6);
        g.lineStyle(2, 0xd9a441, .7).strokeEllipse(G.x, G.y + 8, 38, 16);
        if (moving) g.lineStyle(1.5, 0xecdfc6, .6).strokeRect(G.tx - 5, G.ty - 5, 10, 10);
        for (const e of E) {
            if (e.nz) g.fillStyle(0x780000, .28).fillCircle(e.x, e.y, 26 + Math.sin(tm / 6) * 3);
            if (hos(e.f, G.fac)) g.lineStyle(2, e.n > pw() ? 0xe0442a : 0x6fbf5a, 1).strokeEllipse(e.x, e.y + 8, 34, 14);
            if (e.fo) { g.lineStyle(3, 0xffd27a, 1); g.lineBetween(e.x - 9, e.y - 36, e.x + 9, e.y - 20); g.lineBetween(e.x + 9, e.y - 36, e.x - 9, e.y - 20); }
        }
        for (const v of VL) if (v.st > 0) {
            // horiaca dedina: plamene pri domoch a stúpajúci dym
            for (let k = 0; k < 5; k++) { const fx = v.x - 18 + k * 9, fl = 3 + Math.sin(tm / 2 + k * 1.3) * 1.5; g.fillStyle(0xff7a20, .8).fillTriangle(fx - 3, v.y - 6, fx, v.y - 10 - fl * 2, fx + 3, v.y - 6); g.fillStyle(0xffd060, .9).fillTriangle(fx - 1.5, v.y - 6, fx, v.y - 8 - fl, fx + 1.5, v.y - 6); }
            for (let k = 0; k < 6; k++) { const s = (tm * .5 + k * 14) % 84; g.fillStyle(0x3c322d, .45 - s / 200).fillCircle(v.x - 10 + k * 4 + Math.sin(s * .15 + k) * 6, v.y - 14 - s * .7, 4 + s * .13); }
            g.fillStyle(0xff6a20, .08 + .04 * Math.sin(tm / 3)).fillCircle(v.x, v.y - 6, 40);
        }
        // Hora osudu: dym a pulz žiary
        if (this.doom) { for (let k = 0; k < 5; k++) { const s = (tm * .3 + k * 30) % 150; g.fillStyle(0x2a1a18, .35 - s / 500).fillCircle(this.doom.x + Math.sin(s * .05 + k) * 20 - 10, this.doom.y - this.doom.displayHeight * .9 - s * 1.2, 14 + s * .25); } }
        // prach pod armádami na pochode
        for (const e of E) if ((e.vx || e.vy) && Math.hypot(e.x - G.x, e.y - G.y) < 900) for (let k = 1; k < 3; k++) g.fillStyle(0xc8b48c, .14 - k * .04).fillCircle(e.x - e.vx * k * 9, e.y - e.vy * k * 9 + 8, 4 - k * .5);
        if (G.camp) {
            g.fillStyle(0xc8a870, 1).fillTriangle(G.x - 30, G.y + 6, G.x - 18, G.y - 12, G.x - 6, G.y + 6);
            g.fillStyle(0xff9a3a, 1).fillCircle(G.x + 26, G.y + 4, 3 + Math.random() * 1.5);
        }
    }

    drawMini() {
        const g = this.mini; g.clear();
        if (MF.t) for (const t of TW) { g.fillStyle(hex(FC[t.f]), .28).fillCircle(t.x, t.y, 220); g.fillStyle(hex(FC[t.f]), 1).fillRect(t.x - 55, t.y - 55, 110, 110); }
        if (MF.e) for (const e of E) g.fillStyle(hos(e.f, G.fac) ? 0xff4030 : hex(FC[e.f]), 1).fillCircle(e.x, e.y, 45);
        g.fillStyle(0xffffff, 1).fillCircle(G.x, G.y, 70 + Math.sin(tm / 10) * 20);
        g.lineStyle(40, 0xffffff, .7).strokeRect(cam.x, cam.y, W / Z, H / Z);
    }
}
