/*
 * ENGINE: mapa sveta.
 * Logika (pohyb, AI, diplomacia, dni) beží v js/sim cez updMap(dt).
 * Scéna ju iba zobrazuje: dlaždice mapy, hrady a dediny, armády s viajúcimi
 * zástavami, kameru so zoomom a minimapu ako druhú kameru.
 * Súradnice obrazovky sú logické (720×480), plátno má rozlíšenie RES-krát väčšie.
 */
const MM = { x: W - 218, y: H - 152, w: 210, h: 140 };
const FONT = '"IM Fell English", Georgia, serif';
const txtStyle = (size, color, extra) => Object.assign({ fontFamily: FONT, fontSize: size + 'px', color, resolution: RES }, extra);

class MapScene extends Phaser.Scene {
    constructor() { super('Map'); }

    create() {
        this.armies = new Map();
        this.hover = null;
        // scéna sa po bitke spúšťa znova: objekty z minulého spustenia sú zničené, preto sa vytvoria nanovo
        this.sgTxt = new Map(); this.musterTxt = null; this.spaceKey = null;
        const worldObjs = this.buildTerrain();
        this.vill = VL.map(v => ({
            v, key: '',
            spr: this.add.image(v.x, v.y, 'map_village_g1').setOrigin(.5, .8).setScale(.36).setDepth(v.y - 1),
            txt: this.add.text(v.x, v.y + 14, v.n, txtStyle(12, '#d8ccb4', { backgroundColor: 'rgba(18,14,12,.6)', padding: { x: 4, y: 1 } })).setOrigin(.5, 0).setDepth(9000)
        }));

        this.towns = TW.map(t => ({
            t, f: -1,
            spr: this.add.sprite(t.x, t.y, 'map_castle_' + t.f).setOrigin(.5, .82).setScale(.32).setDepth(t.y),
            txt: this.add.text(t.x, t.y + 18, '', txtStyle(15, '#ecdfc6', { backgroundColor: 'rgba(18,14,12,.82)', padding: { x: 7, y: 2 } })).setOrigin(.5, 0).setDepth(9001),
            stars: this.add.text(t.x - 24, t.y - 60, '', { fontFamily: 'sans-serif', fontSize: '11px', color: '#ffd24a', fontStyle: 'bold', resolution: RES }).setOrigin(.5).setDepth(9001)
        }));

        this.hero = Art.image(this, G.x, G.y, Art.heroFigure(this), 0, true); this.hero.setScale(this.hero.scaleX * 1.2);
        this.heroTxt = this.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#ffd24a', backgroundColor: 'rgba(18,14,12,.85)', padding: { x: 5, y: 1 }, resolution: RES }).setOrigin(.5, 0).setDepth(9002);
        this.heroCrown = Art.image(this, 0, 0, Art.crown(this)).setDepth(9002);
        this.fx = this.add.graphics().setDepth(8999);

        this.cameras.main.setBounds(0, 0, WW, WH).setBackgroundColor('#1e2a16');
        this.mmCam = { ignore() { } };                       // minimapu kreslí UIScene z textúry 'minimap'
        this.minimapTexture();
        this.mmCam.ignore([this.fx, this.heroTxt, this.heroCrown, this.hero, ...this.vill.flatMap(o => [o.spr, o.txt]), ...this.towns.flatMap(o => [o.spr, o.txt, o.stars])]);

        this.input.on('pointerdown', p => this.click(p));
        this.input.on('pointermove', p => { this.hover = this.cameras.main.getWorldPoint(p.x, p.y); this.hoverScreen = { x: p.x / RES, y: p.y / RES }; });
        this.input.on('gameout', () => this.hover = null);
        this.input.on('wheel', (p, o, dx, dy) => { if (mode === 'map') Z = Math.max(.45, Math.min(1.5, Z - Math.sign(dy) * .1)); });
        this.events.once('shutdown', () => this.input.removeAllListeners());
    }

    /** Je bod blízko cesty? (cesty sú prepočítané body kriviek) */
    nearRoad(x, y, d) { const P = this.roadPts || []; for (let i = 0; i < P.length; i++) { const dx = P[i].x - x; if (dx > d || dx < -d) continue; const dy = P[i].y - y; if (dx * dx + dy * dy < d * d) return true; } return false; }
    /** Voľný priestor okolo hradov, dedín a ciest – nech obraz nie je nahádzaný na kope. */
    clearZone(x, y) { return TW.some(t => Math.hypot(t.x - x, t.y - y) < 36 * K) || VL.some(v => Math.hypot(v.x - x, v.y - y) < 21 * K) || this.nearRoad(x, y, 7 * K); }

    /** Zaujímavé miesta (PLACES): kresba podľa druhu a popisok. */
    buildPlaces() {
        const out = [], g = this.add.graphics().setDepth(-7.5);
        const P = (pts) => { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fillPath(); };
        for (const p of PLACES) {
            const x = p.x * K, y = p.y * K;
            g.fillStyle(0x000000, .22).fillEllipse(x, y + 10, 70, 22);
            if (p.kind === 'tower') { g.fillStyle(0x6a7a4a, 1).fillEllipse(x, y + 2, 76, 30); g.fillStyle(0x8a8a86, 1); P([[x - 16, y + 4], [x - 13, y - 44], [x + 13, y - 44], [x + 16, y + 4]]); g.fillStyle(0x6a6a66, 1); for (let k = 0; k < 4; k++) g.fillRect(x - 14 + k * 8, y - 50, 5, 7); g.fillStyle(0x9a9a96, 1); P([[x - 22, y + 6], [x - 20, y - 20], [x - 14, y - 22], [x - 12, y + 6]]); g.fillStyle(0x15100c, 1).fillRect(x - 3, y - 20, 6, 10); g.fillStyle(0x5a6a3a, 1); for (let k = 0; k < 6; k++) g.fillRect(x - 30 + k * 11, y - 2 + (k % 2) * 3, 4, 2); }
            if (p.kind === 'statues') { for (const s of [-1, 1]) { const sx = x + s * 26; g.fillStyle(0x7a8a8a, 1).fillRect(sx - 10, y - 10, 20, 16); g.fillStyle(0x9aa8a8, 1); P([[sx - 7, y - 10], [sx - 6, y - 50], [sx + 6, y - 50], [sx + 7, y - 10]]); g.fillStyle(0xb0bcbc, 1).fillCircle(sx, y - 54, 5.5); g.fillStyle(0x9aa8a8, 1).fillRect(sx - 4, y - 62, 8, 5); g.fillRect(sx - 13 * s, y - 42, 6, 20); } g.fillStyle(0x24526a, .8).fillRect(x - 10, y - 20, 20, 36); }
            if (p.kind === 'cave') { g.fillStyle(0x6a6a62, 1).fillEllipse(x, y, 80, 40); g.fillStyle(0x7a7a72, 1).fillEllipse(x - 20, y - 16, 36, 26).fillEllipse(x + 22, y - 12, 30, 22); g.fillStyle(0x15100c, 1); P([[x - 14, y + 6], [x - 10, y - 16], [x + 10, y - 16], [x + 14, y + 6]]); g.fillStyle(0x4a5a3a, 1).fillCircle(x - 34, y + 8, 7).fillCircle(x + 36, y + 4, 6); g.fillStyle(0xe8e4d8, 1).fillCircle(x + 22, y + 10, 3); }
            if (p.kind === 'house') { g.fillStyle(0x3a4a2a, 1); for (let k = 0; k < 5; k++) g.fillCircle(x - 50 + k * 25, y - 10 - (k % 2) * 8, 14); g.fillStyle(0xd9c050, 1).fillRect(x - 16, y - 18, 32, 22); g.fillStyle(0x8a5a30, 1); P([[x - 20, y - 18], [x, y - 36], [x + 20, y - 18]]); g.fillStyle(0x3a6a9a, 1).fillCircle(x, y - 6, 4); g.fillStyle(0xffd27a, 1).fillRect(x - 11, y - 12, 5, 5).fillRect(x + 7, y - 12, 5, 5); g.fillStyle(0x6a4a2a, 1).fillRect(x + 8, y - 34, 4, 10); }
            if (p.kind === 'swamp') { g.fillStyle(0x3a4a3a, 1).fillEllipse(x, y, 110, 50); g.fillStyle(0x24363a, .9).fillEllipse(x - 24, y - 4, 40, 18).fillEllipse(x + 22, y + 8, 46, 20).fillEllipse(x + 6, y - 16, 30, 12); g.fillStyle(0x5a6a3a, 1); for (let k = 0; k < 9; k++) g.fillRect(x - 48 + k * 12, y - 14 + (k % 3) * 9, 1.5, 10); g.fillStyle(0xbfe8ff, .7); for (let k = 0; k < 4; k++) g.fillCircle(x - 30 + k * 20, y - 20 + (k % 2) * 6, 2); }
            if (p.kind === 'web') { g.fillStyle(0x1e2a1a, 1); for (let k = 0; k < 5; k++) g.fillCircle(x - 44 + k * 22, y - 14 - (k % 2) * 10, 16); g.lineStyle(1, 0xe8e8e8, .8); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; g.lineBetween(x, y - 18, x + Math.cos(a) * 34, y - 18 + Math.sin(a) * 22); } for (let r = 8; r < 32; r += 8) g.strokeEllipse(x, y - 18, r * 2, r * 1.3); g.fillStyle(0xd8d8c8, 1).fillEllipse(x + 14, y - 10, 8, 12).fillEllipse(x - 18, y - 24, 7, 10); g.fillStyle(0x1a1410, 1).fillEllipse(x + 2, y - 30, 10, 6); }
            if (p.kind === 'ents') { g.fillStyle(0x2a4a24, 1); for (let k = 0; k < 7; k++) g.fillCircle(x - 54 + k * 18, y - 8 - (k % 3) * 9, 15); g.fillStyle(0x5a4028, 1); P([[x - 8, y + 6], [x - 6, y - 36], [x + 6, y - 36], [x + 8, y + 6]]); g.fillRect(x - 20, y - 30, 14, 4).fillRect(x + 6, y - 24, 16, 4); g.fillStyle(0x4a7a3a, 1).fillCircle(x, y - 44, 13).fillCircle(x - 20, y - 36, 7).fillCircle(x + 22, y - 30, 7); g.fillStyle(0xe8e0a0, 1).fillRect(x - 4, y - 24, 2, 2).fillRect(x + 2, y - 24, 2, 2); }
            if (p.kind === 'door') { g.fillStyle(0x3a3a42, 1); P([[x - 50, y + 10], [x - 30, y - 50], [x, y - 70], [x + 30, y - 50], [x + 50, y + 10]]); g.fillStyle(0x0a0a0e, 1); P([[x - 12, y + 8], [x - 10, y - 22], [x, y - 30], [x + 10, y - 22], [x + 12, y + 8]]); g.fillStyle(0x6a6a72, 1); for (let k = 0; k < 3; k++) g.fillRect(x - 22 + k * 16, y - 40, 4, 10); g.fillStyle(0xbfe8ff, .4).fillEllipse(x, y - 8, 14, 20); }
            if (p.kind === 'homestead') { g.fillStyle(0x6a4a2a, 1).fillRect(x - 24, y - 20, 48, 24); g.fillStyle(0x3a2a1a, 1); P([[x - 28, y - 20], [x, y - 40], [x + 28, y - 20]]); g.fillStyle(0xd9a441, 1); for (let k = 0; k < 4; k++) g.fillRect(x - 46 + k * 9, y + 2, 6, 8); g.fillStyle(0x8a8a86, 1).fillEllipse(x + 46, y - 6, 22, 30); g.fillStyle(0x4a4a46, 1).fillEllipse(x + 46, y - 16, 14, 10); }
            if (p.kind === 'ford') { g.fillStyle(0x7a8a90, 1); for (let k = 0; k < 7; k++) g.fillEllipse(x - 36 + k * 12, y + Math.sin(k) * 6, 10, 6); g.fillStyle(0xbfd0d8, .5).fillEllipse(x, y, 100, 22); g.fillStyle(0x8a8a86, 1).fillRect(x - 40, y - 30, 3, 14).fillRect(x + 36, y - 26, 3, 12); g.fillStyle(0xd9a441, 1).fillRect(x - 38, y - 30, 10, 6); }
            if (p.kind === 'tree') { g.fillStyle(0x5a6a3a, 1).fillEllipse(x, y + 2, 80, 30); g.fillStyle(0xd8d8d0, 1); P([[x - 4, y + 4], [x - 3, y - 30], [x + 3, y - 30], [x + 4, y + 4]]); g.fillRect(x - 18, y - 24, 14, 3).fillRect(x + 4, y - 18, 16, 3).fillRect(x - 12, y - 38, 3, 14); g.fillStyle(0x8a8a86, 1); for (let k = 0; k < 5; k++) g.fillRect(x - 30 + k * 14, y - 4 + (k % 2) * 6, 10, 2); }
            const t = this.add.text(x, y + 18, p.n.split(' (')[0], { fontFamily: 'sans-serif', fontSize: '10px', color: '#f0e6c8', backgroundColor: 'rgba(18,14,12,.6)', padding: { x: 3, y: 1 }, resolution: RES }).setOrigin(.5, 0).setDepth(-7.4);
            out.push(t);
        }
        out.push(g);
        return out;
    }

    /** Reliéf krajiny: výškové pole zo šumu, hôr a lesov, tieňované svetlom zo severozápadu (svetlé hrebene, tmavšie údolia),
     *  tmavšia vlhká zem pri rieke. Jedna textúra 720 × 480 položená pod stromy – mapa prestane byť plochá. */
    buildRelief(T) {
        if (this.textures.exists('relief')) return this.add.image(0, 0, 'relief').setOrigin(0).setScale(WW / 720).setDepth(-9.3).setAlpha(.85);
        const Wc = 720, Hc = 480, cv = document.createElement('canvas'); cv.width = Wc; cv.height = Hc;
        const c = cv.getContext('2d'), img = c.createImageData(Wc, Hc), d = img.data;
        const hash = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
        const noise = (x, y) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); return (hash(ix, iy) * (1 - u) + hash(ix + 1, iy) * u) * (1 - v) + (hash(ix, iy + 1) * (1 - u) + hash(ix + 1, iy + 1) * u) * v; };
        const M = T.mountains.map(([mx, my, sz]) => [mx / 1800 * Wc, my / 1200 * Hc, sz / 1800 * Wc]);
        const rp = riverPoints().map(([x, y]) => [x / WW * Wc, y / WH * Hc]);
        const H = new Float32Array((Wc + 1) * (Hc + 1));
        for (let y = 0; y <= Hc; y++) for (let x = 0; x <= Wc; x++) {
            let h = noise(x / 38, y / 38) * .6 + noise(x / 13, y / 13) * .3 + noise(x / 5, y / 5) * .1;
            for (const [mx, my, r] of M) { const dd = Math.hypot(x - mx, y - my); if (dd < r * 1.6) h += (1 - dd / (r * 1.6)) * 1.2; }
            const fi = Math.floor(x / Wc * T.cols), fj = Math.floor(y / Hc * T.rows);
            if (T.forest[fj * T.cols + fi] >= 33) h += .08;
            H[y * (Wc + 1) + x] = h;
        }
        for (let y = 0; y < Hc; y++) for (let x = 0; x < Wc; x++) {
            const h = H[y * (Wc + 1) + x], dx = H[y * (Wc + 1) + x + 1] - h, dy = H[(y + 1) * (Wc + 1) + x] - h;
            const sh = (-dx - dy) * 38;   // svetlo zo severozápadu
            let a = Math.min(.45, Math.abs(sh)) * (sh > 0 ? .55 : 1), col = sh > 0 ? 255 : 0;
            let wet = 0; if (rp.length && (x % 2 === 0) && (y % 2 === 0)) { let bd = 1e9; for (let i = 0; i < rp.length; i += 3) { const q = rp[i], dd = (q[0] - x) * (q[0] - x) + (q[1] - y) * (q[1] - y); if (dd < bd) bd = dd; } wet = bd < 100 ? .18 * (1 - bd / 100) : 0; }
            const i = (y * Wc + x) * 4;
            d[i] = col; d[i + 1] = col; d[i + 2] = col; d[i + 3] = Math.round(a * 255 * .55);
            if (wet) { d[i] = 20; d[i + 1] = 30; d[i + 2] = 20; d[i + 3] = Math.max(d[i + 3], Math.round(wet * 255)); }
        }
        c.putImageData(img, 0, 0);
        c.filter = 'blur(1px)'; c.drawImage(cv, 0, 0); c.filter = 'none';
        this.textures.addCanvas('relief', cv);
        return this.add.image(0, 0, 'relief').setOrigin(0).setScale(WW / 720).setDepth(-9.3).setAlpha(.85);
    }

    /** Les ako jednotlivé stromy: hustý vnútri, pri okraji redší a s náhodne vysunutými stromami, aby hranica nebola kockatá. */
    buildForest(T) {
        const ts = WW / T.cols, rnd = n => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
        const isF = (i, j) => i >= 0 && j >= 0 && i < T.cols && j < T.rows && T.forest[j * T.cols + i] >= 33;
        const layer = this.add.layer().setDepth(-8);
        // všetky stromy v jednej textúre (jedna dávka pre grafickú kartu namiesto tisícov prepnutí)
        const KEYS = ['tree_0', 'tree_1', 'tree_2', 'deadtree'];
        if (!this.textures.exists('map_trees')) {
            const srcs = KEYS.map(k => this.textures.get(k).getSourceImage()), fw = Math.max(...srcs.map(i => i.width)), fh = Math.max(...srcs.map(i => i.height));
            const cv = document.createElement('canvas'); cv.width = fw * KEYS.length; cv.height = fh; const c2 = cv.getContext('2d');
            srcs.forEach((im, i) => c2.drawImage(im, i * fw + (fw - im.width) / 2, fh - im.height));
            const tex = this.textures.addCanvas('map_trees', cv);
            KEYS.forEach((k, i) => tex.add(i, 0, i * fw, 0, fw, fh));
        }
        const trees = [];
        for (let j = 0; j < T.rows; j++) for (let i = 0; i < T.cols; i++) {
            const f = T.forest[j * T.cols + i]; if (f < 33) continue;
            const dead = f >= 37;
            let nb = 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) if ((di || dj) && isF(i + di, j + dj)) nb++;
            const edge = nb < 8, seed = j * T.cols + i;
            const n = dead ? 4 + (nb > 5 ? 1 : 0) : (edge ? 5 + Math.round(rnd(seed) * 4) : 10 + Math.round(rnd(seed) * 4));
            for (let k = 0; k < n; k++) {
                let x = (i + rnd(seed * 7 + k * 3 + 1)) * ts, y = (j + rnd(seed * 7 + k * 3 + 2)) * ts;
                // pri okraji sa strom občas vysunie von z lesa – rozstrapkaná hranica
                if (edge && rnd(seed * 13 + k) < .45) { const a = rnd(seed * 17 + k) * 6.283, d = rnd(seed * 19 + k) * ts * .9; x += Math.cos(a) * d; y += Math.sin(a) * d; }
                const sc = dead ? .34 + rnd(seed + k * 5) * .12 : .32 + rnd(seed * 3 + k) * .18;
                trees.push([x, y, sc, dead ? 'deadtree' : (rnd(seed * 5 + k) < .3 ? 'tree_2' : rnd(seed * 11 + k) < .5 ? 'tree_0' : 'tree_1')]);
            }
            // samostatné stromy kúsok za okrajom lesa (riedky lem)
            if (edge && !dead && rnd(seed * 23) < .35) { const a = rnd(seed * 29) * 6.283, d = ts * (1 + rnd(seed * 31) * .8); trees.push([(i + .5) * ts + Math.cos(a) * d, (j + .5) * ts + Math.sin(a) * d, .22 + rnd(seed * 37) * .1, rnd(seed * 41) < .5 ? 'tree_1' : 'tree_2']); }
        }
        const kept = trees.filter(([x, y]) => !this.clearZone(x, y));
        kept.sort((a, b) => a[1] - b[1]);
        // stromy podľa kraja: mallorny so zlatými korunami okolo Lothlórienu, modrasté borovice na severe, popolavé kmene v Mordore
        const lor = TW.find(t => t.n === 'Lothlórien');
        for (const [x, y, sc, key] of kept) {
            const im = this.add.image(x, y, 'map_trees', KEYS.indexOf(key)).setOrigin(.5, .89).setScale(sc);
            const reg = regionAt(x, y);
            if (lor && Math.hypot(x - lor.x, y - lor.y) < 150 * K) im.setTint(0xffc830).setScale(sc * 1.3);
            else if (reg === 's') { im.setTint(0xa8c8d0); if (key !== 'deadtree') im.setFrame(KEYS.indexOf('tree_2')); }
            else if (reg === 'a') im.setTint(0x7a6a62);
            else if (reg === 'd') im.setTint(0xc8c070);
            layer.add(im);
        }
        return [layer];
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
        this.roadPts = roads.flat();                                   // body ciest pre „voľný priestor“ (stromy a skaly sa cestám vyhýbajú)
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
            VL.forEach((v, i) => { for (let f = 0; f < 1; f++) { const a = rnd(i * 3 + f) * 6.283, d = 48 + rnd(i * 7 + f) * 20; out.push(this.add.image(v.x + Math.cos(a) * d, v.y + Math.sin(a) * d * .7, 'map_field_' + regionAt(v.x, v.y) + ((i + f) % 2)).setScale(.4).setAlpha(.9).setRotation((rnd(i + f * 5) - .5) * .6).setDepth(-8.6)); } });
            for (let i = 0; i < 120; i++) { const x = rnd(i * 11 + 1) * WW, y = rnd(i * 13 + 2) * WH; if (!TW.some(t => Math.hypot(t.x - x, t.y - y) < 44 * K) && !VL.some(v => Math.hypot(v.x - x, v.y - y) < 26 * K) && !this.nearRoad(x, y, 13 * K)) out.push(this.add.image(x, y, 'map_rocks_' + (i % 3)).setScale(.4).setDepth(-8.4)); }
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
        out.push(this.buildRelief(T));
        // lesy: namiesto štvorcových dlaždíc jednotlivé stromy s rozhádzanými okrajmi (prirodzená hranica lesa)
        out.push(...this.buildForest(T));
        out.push(...this.buildPlaces());
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
    /** Minimapa vo vysokom rozlíšení (1440 × 960): tieňovaný terén, lesy, hory so snehom a tieňom, rieka s brehmi, jazero, cesty. */
    minimapTexture() {
        if (this.textures.exists('minimap')) return 'minimap';
        const T = MAPDATA.terrain, MW2 = 1440, MH2 = 960, c = document.createElement('canvas'); c.width = MW2; c.height = MH2;
        const x = c.getContext('2d'), sx = MW2 / T.cols, sy = MH2 / T.rows, s = MW2 / 1800;
        const col = ['#4f7238', '#5e6e3a', '#716c42', '#7a6442', '#3c2c28', '#bf9c60', '#dde3ea', '#26546c'];
        const rnd = n => { const v = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v); };
        for (let j = 0; j < T.rows; j++) for (let i = 0; i < T.cols; i++) {
            const n = j * T.cols + i, base = col[Math.floor((T.ground[n] - 1) / 4)] || col[0];
            x.fillStyle = base; x.fillRect(i * sx, j * sy, sx + .5, sy + .5);
            x.fillStyle = 'rgba(' + (rnd(n) < .5 ? '255,255,255' : '0,0,0') + ',' + (rnd(n * 3) * .07).toFixed(3) + ')'; x.fillRect(i * sx, j * sy, sx + .5, sy + .5);   // zrno
        }
        // lesy: mäkké tmavozelené škvrny so svetlejšími korunami
        for (let j = 0; j < T.rows; j++) for (let i = 0; i < T.cols; i++) {
            const n = j * T.cols + i, f = T.forest[n]; if (!(f >= 33)) continue;
            const dead = f >= 37, cx = (i + .5) * sx, cy = (j + .5) * sy;
            x.fillStyle = dead ? 'rgba(60,40,30,.75)' : 'rgba(22,54,24,.8)'; x.beginPath(); x.arc(cx + (rnd(n * 7) - .5) * 2, cy + (rnd(n * 11) - .5) * 2, sx * .62, 0, 7); x.fill();
            if (!dead) { x.fillStyle = 'rgba(70,120,50,.55)'; x.beginPath(); x.arc(cx - 1, cy - 1.5, sx * .3, 0, 7); x.fill(); }
        }
        // rieka Anduin s brehmi a jazero
        const river = () => { x.beginPath(); x.moveTo(640 * s, 0); x.bezierCurveTo(600 * s, 300 * s, 820 * s, 420 * s, 780 * s, 640 * s); x.bezierCurveTo(760 * s, 800 * s, 900 * s, 880 * s, 860 * s, 1200 * s); };
        x.lineCap = 'round'; river(); x.strokeStyle = 'rgba(160,150,110,.7)'; x.lineWidth = 14 * s; x.stroke(); river(); x.strokeStyle = '#2e6a8c'; x.lineWidth = 9 * s; x.stroke(); river(); x.strokeStyle = '#5a9ab8'; x.lineWidth = 3 * s; x.stroke();
        x.fillStyle = 'rgba(160,150,110,.7)'; x.beginPath(); x.ellipse(1195 * s, 326 * s, 118 * s, 66 * s, .2, 0, 7); x.fill();
        x.fillStyle = '#2e6a8c'; x.beginPath(); x.ellipse(1195 * s, 326 * s, 110 * s, 60 * s, .2, 0, 7); x.fill();
        x.fillStyle = 'rgba(120,180,210,.5)'; x.beginPath(); x.ellipse(1180 * s, 316 * s, 60 * s, 24 * s, .2, 0, 7); x.fill();
        // cesty
        x.strokeStyle = 'rgba(214,190,130,.75)'; x.lineWidth = 1.6; for (const [a2, b2] of MAPDATA.roads) { const A = MAPDATA.castles[a2], B = MAPDATA.castles[b2]; if (A && B) { x.beginPath(); x.moveTo(A[1] * s, A[2] * s); x.quadraticCurveTo((A[1] + B[1]) / 2 * s + 30 * s, (A[2] + B[2]) / 2 * s - 25 * s, B[1] * s, B[2] * s); x.stroke(); } }
        // hory: tieň, telo, svetlá strana, snehová čiapka
        for (const [mx, my, size, kind] of T.mountains) {
            const r = Math.max(10, (size || 60) * .33) * s, px = mx * s, py = my * s;
            x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.moveTo(px + 2, py - r); x.lineTo(px - r * .9 + 3, py + r * .55 + 2); x.lineTo(px + r * .9 + 4, py + r * .55 + 2); x.fill();
            x.fillStyle = kind === 'doom' ? '#4a2622' : kind === 'snow' ? '#7a7a80' : '#4a403c'; x.beginPath(); x.moveTo(px, py - r); x.lineTo(px - r * .9, py + r * .55); x.lineTo(px + r * .9, py + r * .55); x.fill();
            x.fillStyle = kind === 'doom' ? '#6a3a30' : kind === 'snow' ? '#a8a8b0' : '#6a5e58'; x.beginPath(); x.moveTo(px, py - r); x.lineTo(px - r * .9, py + r * .55); x.lineTo(px - r * .15, py + r * .55); x.fill();
            if (kind === 'snow') { x.fillStyle = '#f2f4f8'; x.beginPath(); x.moveTo(px, py - r); x.lineTo(px - r * .32, py - r * .35); x.lineTo(px - r * .1, py - r * .25); x.lineTo(px + r * .1, py - r * .4); x.lineTo(px + r * .32, py - r * .35); x.fill(); }
            if (kind === 'doom') { x.fillStyle = '#ff7a20'; x.beginPath(); x.arc(px, py - r + 2, 2.2, 0, 7); x.fill(); x.fillStyle = 'rgba(255,100,20,.25)'; x.beginPath(); x.arc(px, py - r, 10, 0, 7); x.fill(); }
        }
        // vinetácia okrajov
        const vg = x.createRadialGradient(MW2 / 2, MH2 / 2, MH2 * .45, MW2 / 2, MH2 / 2, MW2 * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.35)'); x.fillStyle = vg; x.fillRect(0, 0, MW2, MH2);
        this.textures.addCanvas('minimap', c);
        return 'minimap';
    }

    click(p) {
        if (mode !== 'map' || !G) return;
        const ui = this.scene.get('UI'); if (ui && (ui.big || ui.menu)) { if (ui.menu) ui.menu = null; return; }   // otvorená veľká mapa alebo ponuka
        if (G.camp) { G.camp = 0; G.stay = null; const b = [...tb.children].find(x => /tábor|pobyt/i.test(x.textContent)); if (b) b.textContent = 'Tábor'; upd(); }
        G.dest = -1; G.vd = -1; G.pd = -1; G.chase = null; G.talk = null;
        const sx = p.x / RES, sy = p.y / RES;
        if (sx > MM.x && sy > MM.y) { G.tx = (sx - MM.x) / MM.w * WW; G.ty = (sy - MM.y) / MM.h * WH; return; }
        const w = this.cameras.main.getWorldPoint(p.x, p.y);
        G.tx = w.x; G.ty = w.y;
        E.forEach(e => { if (Math.hypot(e.x - w.x, e.y - w.y) < 34) { if (hos(e.f, G.fac)) G.chase = e; else G.talk = e; } });
        VL.forEach((v, i) => { if (Math.hypot(v.x - w.x, v.y - w.y) < 26) { G.tx = v.x; G.ty = v.y; G.vd = i; } });
        TW.forEach((t, i) => { if (Math.hypot(t.x - w.x, t.y - w.y) < 30) { G.tx = t.x; G.ty = t.y; G.dest = i; } });
        G.pd = -1; PLACES.forEach((p, i) => { if (Math.hypot(p.x * K - w.x, p.y * K - w.y) < 36) { G.tx = p.x * K; G.ty = p.y * K + 10; G.pd = i; G.dest = -1; G.vd = -1; } });
        if (G.chase || G.talk) { G.vd = -1; G.dest = -1; }
    }

    update(time, delta) {
        if (!G) return;
        if (mode === 'map') {
            // čakanie (tábor, obliehanie, obrana): čas sa dá zrýchliť – svet sa v jednom snímku prepočíta viackrát
            if (!this.spaceKey) this.spaceKey = this.input.keyboard.addKey('SPACE', false);
            HOLD_FAST = this.spaceKey.isDown && ov.classList.contains('hide');
            const n = timeMul(), dt = Math.min(2, delta / 16.67);
            for (let k = 0; k < n && mode === 'map'; k++) updMap(dt);
        }
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
    }

    syncTowns() {
        for (const o of this.towns) {
            const t = o.t, L = lvl(t);
            if (o.f !== t.f) { o.f = t.f; o.spr.setTexture('map_castle_' + t.f); }
            o.spr.setScale(.32 * (.85 + L * .08));
            o.txt.setText(t.n + '  ⚔' + t.g);
            o.stars.setText('★'.repeat(L));
        }
        for (const o of this.vill) {
            const f = TW[o.v.t].f, b = o.v.st > 0, L = lvl(o.v), key = f + (b ? 'b' : '') + L;
            if (o.key !== key) {
                o.key = key;
                // dediny zla majú tmavé mordorské chatrče, dediny dobra kraj podľa polohy
                const evil = bloc(f) === 1 && f !== 4, reg = evil ? 'a' : regionAt(o.v.x, o.v.y);
                o.spr.setTexture(b ? 'map_village_burn' : 'map_village_' + reg + L).setScale(.36).setTint(evil && !b ? 0xb8a8a0 : 0xffffff);
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
                    spr: Art.image(this, e.x, e.y, Art.figure(this, ...Figures.lordEq(e)), 0, true),
                    txt: this.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#ecdfc6', backgroundColor: 'rgba(18,14,12,.78)', padding: { x: 5, y: 1 }, resolution: RES }).setOrigin(.5, 0).setDepth(9002),
                    crown: Art.image(this, 0, 0, Art.crown(this)).setDepth(9002),
                    flag: Art.image(this, 0, 0, Art.banner(this, e.f)).setScale(1.9 / RES).setDepth(9002).setVisible(false)   // veľká zástava maršala
                };
                this.mmCam.ignore([o.spr, o.txt, o.crown, o.flag]);
                this.armies.set(e.id, o);
            }
            const fk = Figures.key(...Figures.lordEq(e));
            if (o.f !== fk) { o.f = fk; const k = Art.figure(this, ...Figures.lordEq(e)); o.spr.setTexture(k, 0).setScale((Art.scale[k] || 1 / RES) * 1.2).play({ key: k + ':wave', startFrame: e.id % 4 }); }
            o.spr.setPosition(e.x, e.y).setDepth(e.y);
            if (e.vx) o.spr.setFlipX(e.vx < 0);
            o.txt.setPosition(e.x, e.y + 19).setText(e.nm + ' ' + Math.ceil(e.n))
                .setColor(hos(e.f, G.fac) ? '#ff8a70' : (AL[G.fac][e.f] || e.f === G.fac) ? '#9fe08a' : '#ecdfc6');
            o.crown.setVisible(!!e.kr).setPosition(e.x + 17, e.y - 46);
            // kolóna: za veliteľom veľkého vojska kráčajú ďalšie postavičky (1 za každých 10 mužov, najviac 3)
            const nf = Math.min(3, Math.floor(e.n / 10));
            if (!o.fol) o.fol = [];
            while (o.fol.length < nf) { const im = Art.image(this, e.x, e.y, o.spr.texture.key, 0, true).setScale(o.spr.scaleX * .85).setAlpha(.9); this.mmCam.ignore([im]); o.fol.push(im); }
            while (o.fol.length > nf) o.fol.pop().destroy();
            if (o.fol.length) { const dir = Math.atan2(e.vy || 0, e.vx || 1), flip = e.vx < 0; o.fol.forEach((im, k) => { if (im.texture.key !== o.spr.texture.key) im.setTexture(o.spr.texture.key, 0).setScale(o.spr.scaleX * .85); const dd = (k + 1) * 26; im.setPosition(e.x - Math.cos(dir) * dd + ((k % 2) ? 6 : -6), e.y - Math.sin(dir) * dd * .5 + (k % 2 ? 4 : -3)).setDepth(e.y - .1 * (k + 1)).setFlipX(flip); if (!im.anims.isPlaying) im.play({ key: o.spr.texture.key + ':wave', startFrame: (e.id + k) % 4 }); }); }
            const isM = typeof MAR !== 'undefined' && MAR[e.f] === e.id;
            o.flag.setVisible(isM).setPosition(e.x + 22, e.y - 92);
            if (isM && o.flag.texture.key !== 'banner_' + e.f) o.flag.setTexture(Art.banner(this, e.f));
        }
        for (const [id, o] of this.armies)
            if (!seen.has(id)) { o.spr.destroy(); o.txt.destroy(); o.crown.destroy(); o.flag.destroy(); (o.fol || []).forEach(im => im.destroy()); this.armies.delete(id); }
    }

    syncHero() {
        const key = Art.heroFigure(this);
        if (this.hero.texture.key !== key) this.hero.setTexture(key, 0).setScale((Art.scale[key] || 1 / RES) * 1.2).play(key + ':wave');
        if (!this.hero.anims.isPlaying) this.hero.play(key + ':wave');
        const moving = Math.hypot(G.tx - G.x, G.ty - G.y) > 3;
        if (moving) this.hero.setFlipX(G.tx < G.x);
        this.hero.setPosition(G.x, G.y + (moving ? Math.sin(tm * .4) * 1.2 : 0)).setDepth(G.y + 1);
        this.heroTxt.setPosition(G.x, G.y + 38).setText(G.name + ' ' + ar());
        this.heroCrown.setVisible(!!G.king).setPosition(G.x + 17, G.y - 46);
    }

    /** Obliehací tábor: stany a ohne okolo hradu, rebríky, baranidlo a veža podľa postupu, popis s dňom a zásobami. */
    drawSieges(g) {
        if (!this.sgTxt) this.sgTxt = new Map();
        TW.forEach((t, i) => {
            const s = t.sg; let tx = this.sgTxt.get(i);
            if (!s) { if (tx) { tx.destroy(); this.sgTxt.delete(i); } return; }
            if (!tx) { tx = this.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '11px', fontStyle: 'bold', color: '#ffd27a', backgroundColor: 'rgba(40,12,8,.82)', padding: { x: 5, y: 1 }, resolution: RES }).setOrigin(.5, 0).setDepth(9003); this.mmCam.ignore(tx); this.sgTxt.set(i, tx); }
            const parts = ['lad', 'ram', 'tow'].filter(k => s[k]).map(k => SIEGE_NAME[k]);
            const k = s.lead === 'G' ? s.build : aiBuild(t);
            tx.setPosition(t.x, t.y + 44).setText('Obliehanie ' + (G.day - s.d0 + 1) + '. deň · ' + (parts.length ? parts.join(', ') : 'stavia ' + (k ? SIEGE_NAME[k] + ' ' + pct(siegeProg(s, k)) : '')) + ' · zásoby ' + Math.max(0, s.food) + ' d.');
            const col = BF[s.f] ? Phaser.Display.Color.HexStringToColor(BF[s.f]).color : 0xc8a870;
            for (let a = 0; a < 7; a++) {   // stany v kruhu pred hradbami
                const an = a / 7 * 6.283 + .4, x = t.x + Math.cos(an) * 30 * K * .55, y = t.y + Math.sin(an) * 18 * K * .55 + 10;
                g.fillStyle(0x000000, .25).fillEllipse(x, y + 7, 26, 8);
                g.fillStyle(0xd8c8a0, 1).fillTriangle(x - 12, y + 6, x, y - 12, x + 12, y + 6); g.fillStyle(0xa8946a, 1).fillTriangle(x, y - 12, x + 12, y + 6, x, y + 6);
                g.fillStyle(col, 1).fillRect(x - 1, y - 20, 2, 9).fillRect(x + 1, y - 20, 6, 4);
                if (a % 2 === 0) { const fx = x + 16, fl = 3 + Math.sin(tm / 2 + a) * 1.5; g.fillStyle(0xff7a20, .9).fillTriangle(fx - 3, y + 6, fx, y - fl * 2, fx + 3, y + 6); g.fillStyle(0xffd060, .25).fillCircle(fx, y + 3, 10); }
            }
            const bx = t.x - 52, by = t.y + 20;
            if (s.lad) { g.lineStyle(2, 0x8a6a3a, 1); for (const o of [0, 10]) { g.lineBetween(bx + o, by, bx + o + 14, by - 30); g.lineBetween(bx + o + 6, by, bx + o + 20, by - 30); } }
            if (s.ram) { g.fillStyle(0x6b4a2e, 1).fillRect(t.x + 20, t.y + 22, 26, 8); g.fillStyle(0x3a2a1a, 1).fillTriangle(t.x + 16, t.y + 22, t.x + 33, t.y + 12, t.x + 50, t.y + 22); }
            if (s.tow) { g.fillStyle(0x6b4a2e, 1).fillRect(t.x + 46, t.y - 26, 16, 40); g.lineStyle(1.5, 0x3a2a1a, 1).strokeRect(t.x + 46, t.y - 26, 16, 40); g.lineBetween(t.x + 46, t.y - 26, t.x + 62, t.y + 14); }
        });
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
        // zraz vojska vlastnej frakcie: pulzujúci zlatý kruh a zástava pri hrade zrazu
        if (!this.musterTxt) { this.musterTxt = this.add.text(0, 0, 'Zraz vojska', { fontFamily: 'sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#ffd24a', backgroundColor: 'rgba(18,14,12,.8)', padding: { x: 5, y: 1 }, resolution: RES }).setOrigin(.5, 1).setDepth(9003).setVisible(false); this.mmCam.ignore(this.musterTxt); }
        const mm = G.fac !== 9 ? marshal(G.fac) : null;
        if (mm && mm.mu && TW[mm.mu.t] && !mm.dead) {
            const mp = musterPoint(mm, TW[mm.mu.t]), r = 70 + Math.sin(tm / 8) * 10;
            g.lineStyle(4, 0xffd24a, .8).strokeCircle(mp.x, mp.y + 10, r); g.lineStyle(2, 0xffd24a, .35).strokeCircle(mp.x, mp.y + 10, r + 14);
            g.lineStyle(3, 0xffd24a, .9).lineBetween(mm.x, mm.y - 10, mp.x, mp.y + 10);
            this.musterTxt.setVisible(true).setPosition(mp.x, mp.y - r - 4).setText('Zraz vojska: ' + mm.nm + ' → ' + TW[mm.mu.t].n);
        } else this.musterTxt.setVisible(false);
        for (const v of VL) if (v.st > 0) {
            // horiaca dedina: plamene pri domoch a stúpajúci dym
            for (let k = 0; k < 5; k++) { const fx = v.x - 18 + k * 9, fl = 3 + Math.sin(tm / 2 + k * 1.3) * 1.5; g.fillStyle(0xff7a20, .8).fillTriangle(fx - 3, v.y - 6, fx, v.y - 10 - fl * 2, fx + 3, v.y - 6); g.fillStyle(0xffd060, .9).fillTriangle(fx - 1.5, v.y - 6, fx, v.y - 8 - fl, fx + 1.5, v.y - 6); }
            for (let k = 0; k < 6; k++) { const s = (tm * .5 + k * 14) % 84; g.fillStyle(0x3c322d, .45 - s / 200).fillCircle(v.x - 10 + k * 4 + Math.sin(s * .15 + k) * 6, v.y - 14 - s * .7, 4 + s * .13); }
            g.fillStyle(0xff6a20, .08 + .04 * Math.sin(tm / 3)).fillCircle(v.x, v.y - 6, 40);
        }
        // Oko Mordoru nad Barad-dûrom: plamenné oko hľadí za hrdinom; po zničení Prsteňa ostane rozpadnutá veža a dym
        const bd = this.baradDur || (this.baradDur = TW.find(t => t.n === 'Barad-dûr'));
        if (bd) {
            const ex = bd.x + 10, ey = bd.y - 150;
            if (G.ring !== 2) {
                const a = Math.atan2(G.y - ey, G.x - ex), pulse = 1 + Math.sin(tm / 6) * .06;
                for (let k = 5; k >= 1; k--) g.fillStyle(0xff5a10, .035 * (6 - k) / 2).fillEllipse(ex, ey, 190 * pulse + k * 36, 100 * pulse + k * 22);
                for (let i = 0; i < 16; i++) { const an = i * Math.PI / 8 + tm / 90, r1 = 92 * pulse, r2 = r1 + 28 + Math.sin(tm / 5 + i) * 10; g.fillStyle(i % 2 ? 0xff3a10 : 0xff9a20, .8).fillTriangle(ex + Math.cos(an - .1) * r1, ey + Math.sin(an - .1) * r1 * .55, ex + Math.cos(an) * r2, ey + Math.sin(an) * r2 * .62, ex + Math.cos(an + .1) * r1, ey + Math.sin(an + .1) * r1 * .55); }
                g.fillStyle(0xff7a10, 1).fillEllipse(ex, ey, 180 * pulse, 90 * pulse);
                g.fillStyle(0xffd060, .9).fillEllipse(ex, ey, 120 * pulse, 60 * pulse);
                const px = ex + Math.cos(a) * 30, py = ey + Math.sin(a) * 12;
                g.fillStyle(0x100404, 1).fillEllipse(px, py, 22, 72 * pulse);
                g.lineStyle(3, 0x3a0a04, .8).strokeEllipse(ex, ey, 180 * pulse, 90 * pulse);
                // kužeľ pohľadu smerom k hrdinovi, keď je blízko
                const dh = Math.hypot(G.x - ex, G.y - ey);
                if (dh < 1400) { g.fillStyle(0xff6a10, .07 + .03 * Math.sin(tm / 4)); g.fillTriangle(ex, ey, ex + Math.cos(a - .12) * dh, ey + Math.sin(a - .12) * dh, ex + Math.cos(a + .12) * dh, ey + Math.sin(a + .12) * dh); }
            } else {
                g.fillStyle(0x2a1a1a, 1); for (let k = 0; k < 7; k++) { const sx = ex - 70 + k * 24, h = 20 + ((k * 37) % 40); g.fillTriangle(sx - 8, ey + 60, sx + 8, ey + 60, sx + (k % 2 ? 4 : -4), ey + 60 - h); }
                for (let k = 0; k < 6; k++) { const s = (tm * .3 + k * 25) % 150; g.fillStyle(0x3a3030, .3 - s / 600).fillCircle(ex + Math.sin(s * .05 + k) * 30 - 20 + k * 10, ey + 20 - s, 14 + s * .2); }
            }
        }
        // Hora osudu: dym a pulz žiary
        if (this.doom) { for (let k = 0; k < 5; k++) { const s = (tm * .3 + k * 30) % 150; g.fillStyle(0x2a1a18, .35 - s / 500).fillCircle(this.doom.x + Math.sin(s * .05 + k) * 20 - 10, this.doom.y - this.doom.displayHeight * .9 - s * 1.2, 14 + s * .25); } }
        // život v dedinách: dym z komínov cez deň, svietiace okná v noci (len pri kamere)
        { const nn = nightness(), cx = cam.x + W / Z / 2, cy = cam.y + H / Z / 2, rr = Math.max(W, H) / Z;
          for (let i = 0; i < VL.length; i++) { const v = VL[i]; if (v.st > 0 || Math.abs(v.x - cx) > rr || Math.abs(v.y - cy) > rr) continue;
            if (nn > .35) { g.fillStyle(0xffd080, .5 + .3 * Math.sin(tm / 7 + i)); for (let k = 0; k < 1 + lvl(v) / 2; k++) g.fillRect(v.x - 10 + ((k * 13 + i * 5) % 24), v.y - 6 + ((k * 7) % 8), 2.5, 2); g.fillStyle(0xffc060, .08).fillCircle(v.x, v.y, 26); }
            else if (lvl(v) >= 2) { for (let k = 0; k < 3; k++) { const sm = (tm * .35 + k * 20 + i * 7) % 60; g.fillStyle(0xd8d0c8, .22 - sm / 300).fillCircle(v.x + 6 + Math.sin(sm * .12 + k + i) * 4, v.y - 12 - sm * .55, 2.2 + sm * .08); } } } }
        // prach pod armádami na pochode
        for (const e of E) if ((e.vx || e.vy) && Math.hypot(e.x - G.x, e.y - G.y) < 900) for (let k = 1; k < 3 + Math.min(3, e.n / 10); k++) g.fillStyle(regionAt(e.x, e.y) === 's' ? 0xffffff : 0xc8b48c, .16 - k * .03).fillCircle(e.x - e.vx * k * 9 + Math.sin(tm / 3 + k) * 2, e.y - e.vy * k * 9 + 8, 4 + k * .4);
        this.drawSieges(g);
        if (G.camp || G.besiege >= 0) {
            g.fillStyle(0xc8a870, 1).fillTriangle(G.x - 30, G.y + 6, G.x - 18, G.y - 12, G.x - 6, G.y + 6);
            g.fillStyle(0xff9a3a, 1).fillCircle(G.x + 26, G.y + 4, 3 + Math.random() * 1.5);
        }
    }

}
