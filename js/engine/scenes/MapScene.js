/*
 * ENGINE: mapa sveta.
 * Logika (pohyb, AI, diplomacia, dni) beží v js/sim cez updMap(dt).
 * Scéna ju iba zobrazuje: dlaždice mapy, hrady a dediny, armády s viajúcimi
 * zástavami, kameru so zoomom a minimapu ako druhú kameru.
 * Súradnice obrazovky sú logické (720×480), plátno má rozlíšenie RES-krát väčšie.
 */
const MM = { x: W - 168, y: 52, w: 156, h: 104 };   // minimapa vpravo hore pod dňom (rozhranie „filmové minimum“)
const FONT = '"IM Fell English", Georgia, serif';
const txtStyle = (size, color, extra) => Object.assign({ fontFamily: FONT, fontSize: size + 'px', color, resolution: RES }, extra);

class MapScene extends Phaser.Scene {
    constructor() { super('Map'); }

    create() {
        this.booting = typeof BootLoad !== 'undefined' && BootLoad.on;
        if (this.booting) {
            BootLoad.set(.36, 'Kreslím mapu Stredozeme…');
            setTimeout(() => { if (this.scene.isActive()) this.buildWorld(); else this.finishBoot(); }, 40);
            return;
        }
        this.buildWorld();
    }

    /** Načítavacia obrazovka sa zatvorí a mapa sa rozbehne, aj keď niektorý krok kresby spadol. */
    finishBoot() {
        this.booting = false;
        this.ready = true;
        if (typeof BootLoad !== 'undefined' && BootLoad.on) { BootLoad.set(1, 'Brána sa otvára…'); BootLoad.hide(); }
    }

    /** Svet mapy. Pri pokračovaní v uloženej hre sa stavia po častiach, aby lišta išla ďalej od 24 %. */
    buildWorld() {
        this.armies = new Map();
        this.hover = null;
        // scéna sa po bitke spúšťa znova: objekty z minulého spustenia sú zničené, preto sa vytvoria nanovo
        this.sgTxt = new Map(); this.musterTxt = null; this.spaceKey = null; this._ht = null; this._mt = null; this.placeTxt = []; this._pls = null;   // texty sú nové: zabudni naposledy nastavené (inak štítok družiny po bitke ostane prázdny)
        this.lineChunks = new Map();   // štvorce statického kreslenia (chunkG)
        try { this.buildTerrain(); }
        catch (e) { console.error('Mapa', e); }
        const places = () => {
        try {
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
        this.ready = true;
        const chart = () => {
        try {
        if (typeof BootLoad !== 'undefined' && BootLoad.on) BootLoad.set(.9, 'Kreslím minimapu…');
        this.minimapTexture();
        this.mmCam.ignore([this.fx, this.heroTxt, this.heroCrown, this.hero, ...this.vill.flatMap(o => [o.spr, o.txt]), ...this.towns.flatMap(o => [o.spr, o.txt, o.stars])]);

        this.input.on('pointerdown', p => this.click(p));
        this.input.on('pointermove', p => { this.hover = this.cameras.main.getWorldPoint(p.x, p.y); this.hoverScreen = { x: p.x / RES, y: p.y / RES }; });
        this.input.on('gameout', () => this.hover = null);
        this.input.on('wheel', (p, o, dx, dy) => { if (mode === 'map') Z = Math.max(.45, Math.min(1.5, Z - Math.sign(dy) * .1)); });
        this.events.once('shutdown', () => this.input.removeAllListeners());
        } catch (e) { console.error('Mapa', e); }
        this.finishBoot();
        };
        if (this.booting) setTimeout(() => { if (this.scene.isActive()) chart(); else this.finishBoot(); }, 30); else chart();
        } catch (e) { console.error('Mapa', e); this.finishBoot(); }
        };
        if (this.booting) { BootLoad.set(.68, 'Staviam dediny a hrady…'); setTimeout(() => { if (this.scene.isActive()) places(); else this.finishBoot(); }, 30); } else places();
    }

    /** Štvorce sveta pre statické kreslenie (cesty, rieka, tiene hôr): zobrazia sa len tie pri kamere. */
    chunkKey(x, y) { const C = 1600; return Math.max(0, Math.min(8, x / C | 0)) + ',' + Math.max(0, Math.min(5, y / C | 0)); }
    chunkG(x, y, depth, key) {
        key = key || this.chunkKey(x, y);
        const id = key + '|' + depth; let c = this.lineChunks.get(id);
        if (!c) { const [cx, cy] = key.split(',').map(Number); c = { g: this.add.graphics().setDepth(depth), x: cx * 1600, y: cy * 1600 }; this.lineChunks.set(id, c); }
        return c.g;
    }
    cullChunks() {
        if (!this.lineChunks) return;
        const m = 260, x0 = cam.x - m, y0 = cam.y - m, x1 = cam.x + W / Z + m, y1 = cam.y + H / Z + m;   // okraj: hrubé čiary presahujú štvorec
        for (const c of this.lineChunks.values()) { const on = c.x < x1 && c.x + 1600 > x0 && c.y < y1 && c.y + 1600 > y0; if (c.g.visible !== on) c.g.setVisible(on); }
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
            out.push(t); (this.placeTxt || (this.placeTxt = [])).push(t);
        }
        out.push(g);
        return out;
    }

    /** Reliéf krajiny: výškové pole zo šumu, hôr a lesov, tieňované svetlom zo severozápadu (svetlé hrebene, tmavšie údolia),
     *  tmavšia vlhká zem pri rieke. Jedna textúra 720 × 480 položená pod stromy – mapa prestane byť plochá. */
    buildRelief(T) {
        const place = () => { const im = this.textures.get('relief').getSourceImage(); return this.add.image(0, 0, 'relief').setOrigin(0).setScale(WW / im.width).setDepth(-9.3).setAlpha(.85); };
        if (this.textures.exists('relief')) return place();
        // polovičné rozlíšenie stačí: vrstva je rozmazaná a len tónuje svetlom. Hory a rieka sa kreslia len do svojho okolia, nie cez každý bod.
        const Wc = 360, Hc = 240, ns = 720 / Wc, cv = document.createElement('canvas'); cv.width = Wc; cv.height = Hc;
        const c = cv.getContext('2d'), img = c.createImageData(Wc, Hc), d = img.data;
        const hash = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
        const noise = (x, y) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); return (hash(ix, iy) * (1 - u) + hash(ix + 1, iy) * u) * (1 - v) + (hash(ix, iy + 1) * (1 - u) + hash(ix + 1, iy + 1) * u) * v; };
        const M = T.mountains.map(([mx, my, sz]) => [mx / 1800 * Wc, my / 1200 * Hc, sz / 1800 * Wc]);
        const H = new Float32Array((Wc + 1) * (Hc + 1));
        for (let y = 0; y <= Hc; y++) for (let x = 0; x <= Wc; x++) {
            const h = noise(x / 38 * ns, y / 38 * ns) * .6 + noise(x / 13 * ns, y / 13 * ns) * .3 + noise(x / 5 * ns, y / 5 * ns) * .1;
            const fi = Math.min(T.cols - 1, Math.floor(x / Wc * T.cols)), fj = Math.min(T.rows - 1, Math.floor(y / Hc * T.rows));
            H[y * (Wc + 1) + x] = h + (T.forest[fj * T.cols + fi] >= 33 ? .08 : 0);
        }
        for (const [mx, my, r] of M) {
            const R = r * 1.6, x0 = Math.max(0, mx - R | 0), x1 = Math.min(Wc, mx + R + 1 | 0), y0 = Math.max(0, my - R | 0), y1 = Math.min(Hc, my + R + 1 | 0);
            for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const dd = Math.hypot(x - mx, y - my); if (dd < R) H[y * (Wc + 1) + x] += (1 - dd / R) * 1.2; }
        }
        const wet = new Float32Array(Wc * Hc), rad = 10 * Wc / 720, rad2 = rad * rad;
        for (const [qx, qy] of riverPoints().map(([x, y]) => [x / WW * Wc, y / WH * Hc])) {
            const x0 = Math.max(0, qx - rad | 0), x1 = Math.min(Wc - 1, qx + rad | 0), y0 = Math.max(0, qy - rad | 0), y1 = Math.min(Hc - 1, qy + rad | 0);
            for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const dd = (qx - x) * (qx - x) + (qy - y) * (qy - y); if (dd < rad2) { const w = .18 * (1 - dd / rad2), i = y * Wc + x; if (w > wet[i]) wet[i] = w; } }
        }
        for (let y = 0; y < Hc; y++) for (let x = 0; x < Wc; x++) {
            const h = H[y * (Wc + 1) + x], dx = H[y * (Wc + 1) + x + 1] - h, dy = H[(y + 1) * (Wc + 1) + x] - h;
            const sh = (-dx - dy) * 38;   // svetlo zo severozápadu
            const a = Math.min(.45, Math.abs(sh)) * (sh > 0 ? .55 : 1), col = sh > 0 ? 255 : 0, i = (y * Wc + x) * 4, w = wet[y * Wc + x];
            d[i] = col; d[i + 1] = col; d[i + 2] = col; d[i + 3] = Math.round(a * 255 * .55);
            if (w) { d[i] = 20; d[i + 1] = 30; d[i + 2] = 20; d[i + 3] = Math.max(d[i + 3], Math.round(w * 255)); }
        }
        c.putImageData(img, 0, 0);
        c.filter = 'blur(1px)'; c.drawImage(cv, 0, 0); c.filter = 'none';
        this.textures.addCanvas('relief', cv);
        return place();
    }

    /** Les ako jednotlivé stromy: hustý vnútri, pri okraji redší a s náhodne vysunutými stromami, aby hranica nebola kockatá. */
    buildForest(T) {
        const ts = WW / T.cols, rnd = n => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
        const isF = (i, j) => i >= 0 && j >= 0 && i < T.cols && j < T.rows && T.forest[j * T.cols + i] >= 33;
        // všetky stromy v jednej textúre, potom zložené do štvorcov mapy (nie jeden objekt na strom)
        const KEYS = ['tree_0', 'tree_1', 'tree_2', 'deadtree'];
        if (!this.textures.exists('map_trees')) {
            const srcs = KEYS.map(k => this.textures.get(k).getSourceImage()), fw = Math.max(...srcs.map(i => i.width)), fh = Math.max(...srcs.map(i => i.height));
            const cv = document.createElement('canvas'); cv.width = fw * KEYS.length; cv.height = fh; const c2 = cv.getContext('2d');
            srcs.forEach((im, i) => c2.drawImage(im, i * fw + (fw - im.width) / 2, fh - im.height));
            const tex = this.textures.addCanvas('map_trees', cv);
            KEYS.forEach((k, i) => tex.add(i, 0, i * fw, 0, fw, fh));
        }
        // mriežka prekážok: pri desaťtisícoch stromov sa cesty a hrady neprezerajú po jednom
        const CELL = 36 * K, box = new Map();
        const put = (x, y, r) => { const k = (x / CELL | 0) + (y / CELL | 0) * 4096; let a = box.get(k); if (!a) box.set(k, a = []); a.push(x, y, r * r); };
        TW.forEach(t => put(t.x, t.y, 36 * K)); VL.forEach(v => put(v.x, v.y, 21 * K));
        for (const p of this.roadPts || []) put(p.x, p.y, 7 * K);
        const blocked = (x, y) => {
            const gx = x / CELL | 0, gy = y / CELL | 0;
            for (let j = gy - 1; j <= gy + 1; j++) for (let i = gx - 1; i <= gx + 1; i++) {
                const a = box.get(i + j * 4096); if (!a) continue;
                for (let k = 0; k < a.length; k += 3) { const dx = a[k] - x, dy = a[k + 1] - y; if (dx * dx + dy * dy < a[k + 2]) return true; }
            }
            return false;
        };
        const trees = [];
        for (let j = 0; j < T.rows; j++) for (let i = 0; i < T.cols; i++) {
            const f = T.forest[j * T.cols + i]; if (f < 33) continue;
            const dead = f >= 37;
            let nb = 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) if ((di || dj) && isF(i + di, j + dj)) nb++;
            const edge = nb < 8, seed = j * T.cols + i;
            const n = dead ? 3 : (edge ? 4 + Math.round(rnd(seed) * 3) : 8 + Math.round(rnd(seed) * 4));
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
        const kept = [];
        for (const t of trees) if (!blocked(t[0], t[1])) kept.push(t);
        const CHUNK = 720, lor = TW.find(t => t.n === 'Lothlórien'), chunks = new Map();
        for (const [x, y, sc0, key] of kept) {
            let sc = sc0, frame = KEYS.indexOf(key), tint = 0;
            const reg = regionAt(x, y);
            if (lor && (x - lor.x) * (x - lor.x) + (y - lor.y) * (y - lor.y) < (150 * K) * (150 * K)) { tint = 0xffc830; sc *= 1.3; }
            else if (reg === 's') { tint = 0xa8c8d0; if (key !== 'deadtree') frame = KEYS.indexOf('tree_2'); }
            else if (reg === 'a') tint = 0x7a6a62;
            else if (reg === 'd') tint = 0xc8c070;
            const id = Math.floor(x / CHUNK) + ',' + Math.floor(y / CHUNK);
            let list = chunks.get(id); if (!list) chunks.set(id, list = []);
            list.push(x, y, sc, frame, tint);
        }
        // stromy ostanú ostré, ale na scéne je len okolie kamery. Vzdialený les sa doplní, až keď sa k nemu pochod priblíži.
        this.forestChunk = CHUNK;
        this.forestData = chunks;
        this.forestBoxes = new Map();
        this.syncForest(1);
        return [];
    }

    /** Doplní alebo skryje štvorce lesa podľa toho, kde je družina. Najviac `budget` nových štvorcov za snímok, aby pochod nesekol. */
    syncForest(budget) {
        if (!this.forestData || !G) return;
        const CHUNK = this.forestChunk, hx = G.x, hy = G.y, hw = W / Z / 2 + CHUNK, hh = H / Z / 2 + CHUNK;
        const vx0 = cam.x - 30, vy0 = cam.y - 40, vx1 = cam.x + W / Z + 30, vy1 = cam.y + H / Z + 50;
        let built = 0, cap = budget == null ? 1 : budget;
        for (const [id, list] of this.forestData) {
            const [cx, cy] = id.split(',').map(Number), x = cx * CHUNK, y = cy * CHUNK;
            const near = Math.abs(x + CHUNK / 2 - hx) < hw && Math.abs(y + CHUNK / 2 - hy) < hh;
            let box = this.forestBoxes.get(id);
            if (!near) { if (box && box.visible) box.setVisible(false); continue; }
            if (!box) {
                if (built >= cap) continue;
                built++;
                box = this.add.container(0, 0).setDepth(-8);
                for (let i = 0; i < list.length; i += 5) {
                    const im = this.make.image({ x: list[i], y: list[i + 1], key: 'map_trees', frame: list[i + 3], add: false }).setOrigin(.5, .89).setScale(list[i + 2]);
                    if (list[i + 4]) im.setTint(list[i + 4]);
                    box.add(im);
                }
                this.forestBoxes.set(id, box);
            } else if (!box.visible) box.setVisible(true);
            const kids = box.list;
            for (let i = 0; i < kids.length; i++) { const im = kids[i], on = im.x > vx0 && im.x < vx1 && im.y > vy0 && im.y < vy1; if (im.visible !== on) im.setVisible(on); }
        }
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
        out.push(...this.buildGround());   // zrno trávy a farebné plochy podľa krajiny
        // voda (js/data/geo.js): more s plytčinou a piesočným pobrežím, jazerá, veľké rieky so šírkou podľa toku; mosty a brody
        const g = this.add.graphics().setDepth(-9.05), k = K;
        out.push(g, ...this.buildWater(g));
        // cesty: trasa po súši z hľadania cesty (js/sim/nav.js) – rieky prekračujú len na mostoch a brodoch; rohy sa zaoblia (Chaikin)
        const roads = MAPDATA.roads.map(([a, b]) => {
            const A = TW[a], B = TW[b]; if (!A || !B) return [];
            let P = [[A.x, A.y], ...(NAV.path(A.x, A.y, B.x, B.y) || [[B.x, B.y]])];
            for (let it = 0; it < 3; it++) { const Q = [P[0]]; for (let i = 0; i < P.length - 1; i++) { const [x0, y0] = P[i], [x1, y1] = P[i + 1]; Q.push([x0 * .75 + x1 * .25, y0 * .75 + y1 * .25], [x0 * .25 + x1 * .75, y0 * .25 + y1 * .75]); } Q.push(P[P.length - 1]); P = Q; }
            const D = [P[0]]; for (let i = 1; i < P.length; i++) { const [x0, y0] = P[i - 1], [x1, y1] = P[i], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (5 * k))); for (let q = 1; q <= n; q++) D.push([x0 + (x1 - x0) * q / n, y0 + (y1 - y0) * q / n]); }
            return D.map(([x, y]) => new Phaser.Math.Vector2(x, y));
        }).filter(r => r.length > 1);
        this.roadLines = roads;                                        // tvar ciest aj pre pergamenovú veľkú mapu (UIMaps.js)
        this.roadPts = roads.flat();                                   // body ciest pre „voľný priestor“ (stromy a skaly sa cestám vyhýbajú)
        const runs = [];   // [štvorec, body] – súvislé kusy cesty v jednom štvorci (bez prekrytia, priesvitný lem sa nezdvojí)
        for (const r of roads) { let cur = null, ck = null; for (let i = 1; i < r.length; i++) { const key = this.chunkKey((r[i - 1].x + r[i].x) / 2, (r[i - 1].y + r[i].y) / 2); if (key !== ck) { cur = [r[i - 1]]; ck = key; runs.push([key, cur]); } cur.push(r[i]); } }
        const lay = (w, col, a, dy = 0) => { for (const [key, pts] of runs) { const gg = this.chunkG(0, 0, -8.95, key); gg.lineStyle(w, col, a).strokePoints(dy ? pts.map(p => ({ x: p.x, y: p.y + dy })) : pts); } };
        lay(9 * k * .75, 0x2a2414, .14);   // vyšliapaný lem okolo cesty
        lay(5.5 * k * .75, 0x7a6a44, .55); lay(3.6 * k * .75, 0xc4ad78, .85);
        lay(.5 * k * .75, 0x8a7a50, .6, -1.1 * k * .75); lay(.5 * k * .75, 0x8a7a50, .6, 1.1 * k * .75);   // koľaje
        const wet = (x, y) => GEO.still(x / k, y / k) || !!GEO.riverAt(x / k, y / k, 6);
        if (this.textures.exists('map_field_g0')) {
            // polia okolo dedín a skalky po krajine
            const rnd = (n) => ((n * 9301 + 49297) % 233280) / 233280;
            VL.forEach((v, i) => { for (let f = 0; f < 1; f++) { const a = rnd(i * 3 + f) * 6.283, d = 48 + rnd(i * 7 + f) * 20; if (wet(v.x + Math.cos(a) * d, v.y + Math.sin(a) * d * .7)) continue; out.push(this.add.image(v.x + Math.cos(a) * d, v.y + Math.sin(a) * d * .7, 'map_field_' + regionAt(v.x, v.y) + ((i + f) % 2)).setScale(.4).setAlpha(.9).setRotation((rnd(i + f * 5) - .5) * .6).setDepth(-8.6)); } });
            for (let i = 0; i < 120; i++) { const x = rnd(i * 11 + 1) * WW, y = rnd(i * 13 + 2) * WH; if (!wet(x, y) && !TW.some(t => Math.hypot(t.x - x, t.y - y) < 44 * K) && !VL.some(v => Math.hypot(v.x - x, v.y - y) < 26 * K) && !this.nearRoad(x, y, 13 * K)) out.push(this.add.image(x, y, 'map_rocks_' + (i % 3)).setScale(.4).setDepth(-8.4)); }
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
        // hory: tieň na zemi na juhovýchod (svetlo zo severozápadu ako pri reliéfe), potom kresba
        for (const [x, y, size] of T.mountains) { const mg = this.chunkG(x * k, y * k, -7.05); mg.fillStyle(0x0a0c06, .16).fillEllipse(x * k + size * k * .45, y * k + size * k * .04, size * k * 2.5, size * k * .7); mg.fillStyle(0x0a0c06, .12).fillEllipse(x * k + size * k * .2, y * k, size * k * 1.9, size * k * .45); }
        for (const [x, y, size, kind, v] of T.mountains) {
            const key = 'mtn_' + kind + '_' + (kind === 'doom' ? 0 : v % 3);
            if (!this.textures.exists(key)) continue;
            const img = this.add.image(x * k, y * k, key).setOrigin(.5, .92), w = img.width;
            img.setScale(2 * size * k / .96 / w).setDepth(-7 + y / 1e4);      // pod hradmi a armádami, ako na pôvodnej mape
            out.push(img);
            if (kind === 'doom') this.doom = img;
        }
        out.push(...this.buildAtmos());
        return out;
    }


    /** Voda z geografie (js/data/geo.js). More a jazerá sú pár veľkých mnohouholníkov v jednom Graphics (g), rieky sa kreslia
     *  ťahmi štetca do štvorcov sveta (chunkG, len pri kamere). Mosty a brody s menami. Vráti ďalšie objekty sveta. */
    buildWater(g) {
        const k = K, out = [], W2 = P => P.map(([x, y]) => ({ x: x * k, y: y * k }));
        // posun čiary pobrežia do mora o d jednotiek (normála, strana podľa toho, kde je more)
        const off = (P, d) => P.map((p, i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], nx = -(b[1] - a[1]), ny = b[0] - a[0], l = Math.hypot(nx, ny) || 1; let ux = nx / l, uy = ny / l; if (!GEO.isSea(p[0] + ux * 3, p[1] + uy * 3)) { ux = -ux; uy = -uy; } return [p[0] + ux * d, p[1] + uy * d]; });
        const C = GEO.COAST, tail = [[1800, 1200], [0, 1200], [0, 0]];
        g.lineStyle(16 * k, 0x8a8456, 1).strokePoints(W2(C)); g.lineStyle(9 * k, 0xc8b882, 1).strokePoints(W2(C));          // breh: tráva do piesku
        g.fillStyle(0x4a86a0, 1).fillPoints(W2([...C, ...tail]), true);                                                       // plytčina
        g.fillStyle(0x3a7290, 1).fillPoints(W2([...off(C, 9), ...tail]), true);
        g.fillStyle(0x24526a, 1).fillPoints(W2([...off(C, 26), ...tail]), true);                                               // hlbina
        g.lineStyle(1.6 * k, 0xffffff, .35).strokePoints(W2(off(C, 3))); g.lineStyle(1 * k, 0xffffff, .18).strokePoints(W2(off(C, 7)));   // príboj
        for (const L of GEO.LAKES) {
            const sc = f => L.poly.map(([x, y]) => [L.x + (x - L.x) * f, L.y + (y - L.y) * f]);
            g.fillStyle(0x6a7448, 1).fillPoints(W2(sc(1 + 9 / Math.min(L.rx, L.ry))), true); g.fillStyle(0xc8b882, 1).fillPoints(W2(sc(1 + 4 / Math.min(L.rx, L.ry))), true);
            g.fillStyle(0x4a86a0, 1).fillPoints(W2(L.poly), true); g.fillStyle(0x2c5b73, 1).fillPoints(W2(sc(.72)), true); if (L.rx > 40) g.fillStyle(0x24526a, 1).fillPoints(W2(sc(.45)), true);
            g.lineStyle(1.2 * k, 0xffffff, .3).strokePoints(W2(sc(.94)), true);
        }
        // rieky: ťahy štetca (úsečka + kruh v kĺbe) – breh, piesok, hlbina, prúd, odlesk; šírka rastie k ústiu
        for (const R of GEO.RIVERS) {
            const P = R.pts, n = P.length - 1;
            const dry = []; for (let i = 1; i <= n; i++) dry[i] = !GEO.still((P[i - 1][0] + P[i][0]) / 2, (P[i - 1][1] + P[i][1]) / 2);   // úsek v mori či jazere sa nekreslí (breh by trčal do vody)
            const brush = (add, mul, col, a, joints) => { for (let i = 1; i <= n; i++) { if (!dry[i]) continue; const w = ((R.wd[i - 1] + R.wd[i]) / 2 * mul + add) * k, x0 = P[i - 1][0] * k, y0 = P[i - 1][1] * k, x1 = P[i][0] * k, y1 = P[i][1] * k, gg = this.chunkG((x0 + x1) / 2, (y0 + y1) / 2, -9); gg.lineStyle(w, col, a).lineBetween(x0, y0, x1, y1); if (joints) gg.fillStyle(col, a).fillCircle(x1, y1, w / 2); } };
            brush(9, 1, 0x6a7448, 1, 1); brush(4.5, 1, 0x8a8456, 1, 1); brush(0, 1, 0x2c5b73, 1, 1); brush(0, .55, 0x3f7892, 1, 1); brush(0, .14, 0x8ac0d8, .45, 0);
            for (let i = 3; i < n; i += 3) { const p = P[i], q = P[i - 1], a = Math.atan2(p[1] - q[1], p[0] - q[0]), o = (i % 6 ? 1 : -1) * R.wd[i] * .22; this.chunkG(p[0] * k, p[1] * k, -9).lineStyle(.9 * k, 0xbfe0ee, .35).lineBetween((p[0] - Math.sin(a) * o) * k, (p[1] + Math.cos(a) * o) * k, (p[0] - Math.sin(a) * o + Math.cos(a) * 5) * k, (p[1] + Math.cos(a) * o + Math.sin(a) * 5) * k); }   // vlnky
        }
        // mosty a brody: most cez rieku (kolmo na tok), brod ako rad kameňov a svetlá plytčina; meno pod nimi
        const tang = (x, y) => { const R = GEO.riverAt(x, y, 12); if (!R) return [0, 8]; let bi = 1, bd = 1e9; for (let i = 1; i < R.pts.length; i++) { const d = Math.hypot(R.pts[i][0] - x, R.pts[i][1] - y); if (d < bd) { bd = d; bi = i; } } const a = R.pts[bi - 1], b = R.pts[bi]; return [Math.atan2(b[1] - a[1], b[0] - a[0]), R.wd[bi]]; };
        for (const c of GEO.CROSS) {
            const [a, w] = tang(c.x, c.y), x = c.x * k, y = c.y * k, cg = this.chunkG(x, y, -8.9), nx = -Math.sin(a), ny = Math.cos(a), L = (w / 2 + 6) * k;
            if (c.k === 'most') {
                const pts = (s1, s2) => [[x - nx * L + Math.cos(a) * s1, y - ny * L + Math.sin(a) * s1], [x + nx * L + Math.cos(a) * s1, y + ny * L + Math.sin(a) * s1], [x + nx * L + Math.cos(a) * s2, y + ny * L + Math.sin(a) * s2], [x - nx * L + Math.cos(a) * s2, y - ny * L + Math.sin(a) * s2]].map(([px, py]) => ({ x: px, y: py }));
                cg.fillStyle(0x000000, .3).fillPoints(pts(-3.2 * k + 6, 3.2 * k + 6), true);
                cg.fillStyle(0x9a9286, 1).fillPoints(pts(-3.2 * k, 3.2 * k), true); cg.fillStyle(0xb8b0a2, 1).fillPoints(pts(-2.2 * k, 2.2 * k), true);
                cg.lineStyle(.8 * k, 0x6a645a, 1); for (let t = -1; t <= 1; t += .25) cg.lineBetween(x + nx * L * t - Math.cos(a) * 2.2 * k, y + ny * L * t - Math.sin(a) * 2.2 * k, x + nx * L * t + Math.cos(a) * 2.2 * k, y + ny * L * t + Math.sin(a) * 2.2 * k);
            } else {
                cg.fillStyle(0x8ac0d8, .45).fillEllipse(x, y, (w + 8) * k * 1.1, (w + 8) * k * .6);
                for (let t = -1; t <= 1.01; t += .34) { const px = x + nx * (w / 2 + 2) * k * t + Math.cos(a) * ((t * 7) % 2) * k, py = y + ny * (w / 2 + 2) * k * t + Math.sin(a) * ((t * 7) % 2) * k; cg.fillStyle(0x6a6a62, 1).fillEllipse(px, py + 1.2 * k, 3.6 * k, 2.4 * k); cg.fillStyle(0xa8a69a, 1).fillEllipse(px, py, 3.2 * k, 2 * k); }
            }
            const t = this.add.text(x + nx * (L + 4 * k) * Math.sign(ny || 1), y + Math.abs(ny) * (L + 4 * k) + 6 * k, c.n, { fontFamily: 'serif', fontSize: '10px', fontStyle: 'italic', color: '#f0e6c8', backgroundColor: 'rgba(18,14,12,.45)', padding: { x: 3, y: 1 }, resolution: RES }).setOrigin(.5, 0).setDepth(-7.4);
            out.push(t); (this.placeTxt || (this.placeTxt = [])).push(t);
        }
        return out;
    }

    /** Zrno krajiny: dlaždica so steblami trávy a zrnkami (opakuje sa po celom svete) a veľké farebné plochy podľa oblasti
     *  (sviežejšia a vyschnutá lúka, popol Mordoru, piesočné duny, sneh), aby zem nebola jednoliata zelená. */
    buildGround() {
        let sd = 7; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
        if (!this.textures.exists('grain')) {
            const N = 512, cv = document.createElement('canvas'); cv.width = cv.height = N; const c = cv.getContext('2d');
            const at = (x, y, f) => { for (const ox of [0, -N]) for (const oy of [0, -N]) f(x + ox, y + oy); };   // kreslí aj cez okraj, dlaždica nadväzuje
            for (let i = 0; i < 2600; i++) { const x = rnd() * N, y = rnd() * N, l = 3 + rnd() * 5, a = -1.2 - rnd() * .7, dk = rnd() < .62; c.strokeStyle = dk ? 'rgba(16,36,10,' + (.14 + rnd() * .12) + ')' : 'rgba(190,200,120,' + (.08 + rnd() * .08) + ')'; c.lineWidth = .9;
                at(x, y, (X, Y) => { c.beginPath(); c.moveTo(X, Y); c.lineTo(X + Math.cos(a) * l, Y + Math.sin(a) * l); c.stroke(); }); }   // steblá
            for (let i = 0; i < 5000; i++) { const x = rnd() * N, y = rnd() * N, r = .5 + rnd() * 1.1; c.fillStyle = rnd() < .55 ? 'rgba(0,0,0,' + (.06 + rnd() * .08) + ')' : 'rgba(240,230,190,' + (.04 + rnd() * .06) + ')'; at(x, y, (X, Y) => c.fillRect(X, Y, r, r)); }   // zrnká
            for (let i = 0; i < 26; i++) { const x = rnd() * N, y = rnd() * N, r = 14 + rnd() * 30, dk = rnd() < .5; at(x, y, (X, Y) => { const gr = c.createRadialGradient(X, Y, 0, X, Y, r); gr.addColorStop(0, dk ? 'rgba(10,30,6,.10)' : 'rgba(220,210,140,.07)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(X - r, Y - r, r * 2, r * 2); }); }   // trsy
            this.textures.addCanvas('grain', cv);
        }
        if (!this.textures.exists('patches')) {
            const Wc = 360, Hc = 240, cv = document.createElement('canvas'); cv.width = Wc; cv.height = Hc; const c = cv.getContext('2d'), img = c.createImageData(Wc, Hc), d = img.data;
            const hash = (x, y) => { const n = Math.sin(x * 157.1 + y * 113.7) * 43758.5453; return n - Math.floor(n); };
            const noise = (x, y) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); return (hash(ix, iy) * (1 - u) + hash(ix + 1, iy) * u) * (1 - v) + (hash(ix, iy + 1) * (1 - u) + hash(ix + 1, iy + 1) * u) * v; };
            for (let y = 0; y < Hc; y++) for (let x = 0; x < Wc; x++) {
                const wx = x / Wc * WW, wy = y / Hc * WH, n = noise(x / 22, y / 22) * .65 + noise(x / 7, y / 7) * .35, rg = regionAt(wx, wy), i = (y * Wc + x) * 4;
                const sm = v => Math.max(0, Math.min(1, v / (70 * K))), fade = rg === 'a' ? sm(wx - 1433 * K) : rg === 'd' ? Math.min(sm(wy - 967 * K), sm(wx - 1133 * K)) : rg === 's' ? sm(233 * K - wy) : 1;   // plochy na hranici oblasti slabnú (bez ostrého švu)
                let col = null, a = 0;
                if (rg === 'g') { if (n < .42) { col = [24, 58, 18]; a = (.42 - n) * 1.4; } else if (n > .6) { col = [168, 150, 72]; a = (n - .6) * 1.3; } }
                else if (rg === 'a') { col = n > .5 ? [70, 22, 10] : [20, 14, 12]; a = Math.abs(n - .5) * 1.2; }
                else if (rg === 'd') { const dn = Math.sin(x * .55 + noise(x / 9, y / 9) * 5) * .5 + .5; col = dn > .5 ? [230, 200, 140] : [140, 100, 60]; a = Math.abs(dn - .5) * .5; }
                else if (rg === 's') { col = n > .55 ? [255, 255, 255] : [120, 140, 150]; a = Math.abs(n - .55) * .9; }
                if (col) { d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = Math.min(255, a * fade * 255); }
            }
            c.putImageData(img, 0, 0); c.filter = 'blur(2px)'; c.drawImage(cv, 0, 0); c.filter = 'none';
            this.textures.addCanvas('patches', cv);
        }
        return [this.add.image(0, 0, 'patches').setOrigin(0).setScale(WW / 360).setAlpha(.55).setDepth(-9.48),
                this.add.tileSprite(0, 0, WW, WH, 'grain').setOrigin(0).setTileScale(1.6).setAlpha(.85).setDepth(-9.46)];
    }

    /** Ovzdušie mapy: tiene oblakov plávajúce cez krajinu a tmavý opar nad Mordorom (hmla nad močiarmi a sneh na severe sa kreslia v drawFx). */
    buildAtmos() {
        if (!this.textures.exists('cloudsh')) {
            const N = 512, cv = document.createElement('canvas'); cv.width = cv.height = N; const c = cv.getContext('2d');
            let sd = 11; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
            for (let b = 0; b < 6; b++) { const bx = rnd() * N, by = rnd() * N; for (let i = 0; i < 14; i++) { const x = bx + (rnd() - .5) * 150, y = by + (rnd() - .5) * 70, r = 24 + rnd() * 44;
                for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) { const gr = c.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); gr.addColorStop(0, 'rgba(8,12,20,.16)'); gr.addColorStop(1, 'rgba(8,12,20,0)'); c.fillStyle = gr; c.fillRect(x + ox - r, y + oy - r, r * 2, r * 2); } } }
            this.textures.addCanvas('cloudsh', cv);
        }
        if (!this.textures.exists('mordorhaze')) {
            const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64; const c = cv.getContext('2d'), img = c.createImageData(64, 64), d = img.data;
            for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const fx = Math.min(1, Math.max(0, (x - 6) / 18)), fy = Math.min(1, Math.max(0, (60 - y) / 14)), a = fx * fx * (3 - 2 * fx) * fy, i = (y * 64 + x) * 4; d[i] = 40; d[i + 1] = 10; d[i + 2] = 6; d[i + 3] = a * 120; }
            c.putImageData(img, 0, 0); this.textures.addCanvas('mordorhaze', cv);
        }
        // opar: od západného úpätia Mordoru (x 1360) po okraj, na juhu slabne pred púšťou
        this.haze = this.add.image(1360 * K, 0, 'mordorhaze').setOrigin(0).setDisplaySize(WW - 1360 * K, 1000 * K).setDepth(-5.95);
        this.clouds = this.add.tileSprite(0, 0, WW, WH, 'cloudsh').setOrigin(0).setTileScale(7).setDepth(-5.9);
        return [this.haze, this.clouds];
    }

    /** Minimapa 720 × 480: terén, lesy, hory, rieka a cesty. Na obrazovke je menšia, väčšie plátno by štart len spomaľovalo. */
    minimapTexture() {
        if (this.textures.exists('minimap')) return 'minimap';
        const T = MAPDATA.terrain, MW2 = 720, MH2 = 480, c = document.createElement('canvas'); c.width = MW2; c.height = MH2;
        const x = c.getContext('2d'), sx = MW2 / T.cols, sy = MH2 / T.rows, s = MW2 / 1800;
        const col = [[0x4f, 0x72, 0x38], [0x5e, 0x6e, 0x3a], [0x71, 0x6c, 0x42], [0x7a, 0x64, 0x42], [0x3c, 0x2c, 0x28], [0xbf, 0x9c, 0x60], [0xdd, 0xe3, 0xea], [0x26, 0x54, 0x6c]];
        const rnd = n => { const v = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v); };
        const img = x.createImageData(MW2, MH2), px = img.data;
        for (let j = 0; j < T.rows; j++) for (let i = 0; i < T.cols; i++) {
            const n = j * T.cols + i, base = col[Math.floor((T.ground[n] - 1) / 4)] || col[0], g = (rnd(n) < .5 ? 16 : -12);
            const r = Math.max(0, Math.min(255, base[0] + g)), gg = Math.max(0, Math.min(255, base[1] + g)), b = Math.max(0, Math.min(255, base[2] + g));
            const x0 = i * sx | 0, y0 = j * sy | 0, x1 = Math.min(MW2, (i + 1) * sx + .5 | 0), y1 = Math.min(MH2, (j + 1) * sy + .5 | 0);
            for (let yy = y0; yy < y1; yy++) { let p = (yy * MW2 + x0) * 4; for (let xx = x0; xx < x1; xx++) { px[p] = r; px[p + 1] = gg; px[p + 2] = b; px[p + 3] = 255; p += 4; } }
        }
        x.putImageData(img, 0, 0);
        // lesy: mäkké tmavozelené škvrny so svetlejšími korunami
        for (let j = 0; j < T.rows; j++) for (let i = 0; i < T.cols; i++) {
            const n = j * T.cols + i, f = T.forest[n]; if (!(f >= 33)) continue;
            const dead = f >= 37, cx = (i + .5) * sx, cy = (j + .5) * sy;
            x.fillStyle = dead ? 'rgba(60,40,30,.75)' : 'rgba(22,54,24,.8)'; x.beginPath(); x.arc(cx + (rnd(n * 7) - .5) * 2, cy + (rnd(n * 11) - .5) * 2, sx * .62, 0, 7); x.fill();
            if (!dead) { x.fillStyle = 'rgba(70,120,50,.55)'; x.beginPath(); x.arc(cx - 1, cy - 1.5, sx * .3, 0, 7); x.fill(); }
        }
        // more, jazerá a rieky z geografie (js/data/geo.js)
        const poly = (P, close) => { x.beginPath(); P.forEach(([px2, py2], i) => i ? x.lineTo(px2 * s, py2 * s) : x.moveTo(px2 * s, py2 * s)); if (close) x.closePath(); };
        x.fillStyle = '#26546c'; poly(GEO.SEA, true); x.fill(); x.strokeStyle = 'rgba(200,184,130,.8)'; x.lineWidth = 2; poly(GEO.COAST); x.stroke();
        for (const L of GEO.LAKES) { x.fillStyle = '#2e6a8c'; poly(L.poly, true); x.fill(); x.strokeStyle = 'rgba(200,184,130,.7)'; x.lineWidth = 1.2; x.stroke(); }
        x.lineCap = 'round'; for (const R of GEO.RIVERS) for (let i = 1; i < R.pts.length; i++) { x.strokeStyle = '#2e6a8c'; x.lineWidth = Math.max(1.2, R.wd[i] * s * 1.2); x.beginPath(); x.moveTo(R.pts[i - 1][0] * s, R.pts[i - 1][1] * s); x.lineTo(R.pts[i][0] * s, R.pts[i][1] * s); x.stroke(); }
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
        if (sx > MM.x && sy > MM.y && sx < MM.x + MM.w && sy < MM.y + MM.h) { G.tx = (sx - MM.x) / MM.w * WW; G.ty = (sy - MM.y) / MM.h * WH; return; }
        const w = this.cameras.main.getWorldPoint(p.x, p.y);
        G.tx = w.x; G.ty = w.y;
        E.forEach(e => { if (Math.hypot(e.x - w.x, e.y - w.y) < 34) { if (hos(e.f, G.fac)) G.chase = e; else G.talk = e; } });
        VL.forEach((v, i) => { if (Math.hypot(v.x - w.x, v.y - w.y) < 26) { G.tx = v.x; G.ty = v.y; G.vd = i; } });
        TW.forEach((t, i) => { if (Math.hypot(t.x - w.x, t.y - w.y) < 30) { G.tx = t.x; G.ty = t.y; G.dest = i; } });
        G.pd = -1; PLACES.forEach((p, i) => { if (Math.hypot(p.x * K - w.x, p.y * K - w.y) < 36) { G.tx = p.x * K; G.ty = p.y * K + 10; G.pd = i; G.dest = -1; G.vd = -1; } });
        if (G.chase || G.talk) { G.vd = -1; G.dest = -1; }
    }

    update(time, delta) {
        if (!G || !this.ready) return;
        if (mode === 'map') {
            // čakanie (tábor, obliehanie, obrana): čas sa dá zrýchliť – svet sa v jednom snímku prepočíta viackrát
            if (!this.spaceKey && this.input.keyboard) this.spaceKey = this.input.keyboard.addKey('SPACE', false);
            HOLD_FAST = !!(this.spaceKey && this.spaceKey.isDown && ov.classList.contains('hide'));
            const n = timeMul(), dt = Math.min(2, delta / 16.67);
            try { for (let k = 0; k < n && mode === 'map'; k++) updMap(dt); this.errN = 0; }
            catch (e) {   // chyba v simulácii nesmie zmraziť mapu: zalogujeme ju a hra ide ďalej
                this.errN = (this.errN || 0) + 1;
                if (this.errN === 1) console.error('updMap', e);
                if (this.errN > 120) { G.dest = -1; G.vd = -1; G.chase = 0; G.tx = G.x; G.ty = G.y; this.errN = 0; }
            }
        } else if (mode === 'town' && ov.classList.contains('hide')) {
            // poistka: režim „mesto“ bez zobrazeného okna = zaseknutá mapa → návrat na mapu
            this.stuckN = (this.stuckN || 0) + 1;
            if (this.stuckN > 90) { mode = 'map'; this.stuckN = 0; }
        }
        if (mode !== 'town') this.stuckN = 0;
        if (mode === 'battle') { this.scene.start('Battle'); return; }

        const c = this.cameras.main;
        c.setZoom(Z * RES);
        cam.x = Math.max(0, Math.min(WW - W / Z, G.x - W / Z / 2));
        cam.y = Math.max(0, Math.min(WH - H / Z, G.y - H / Z / 2));
        c.centerOn(cam.x + W / Z / 2, cam.y + H / Z / 2);
        this.ls = Math.max(1, Math.round(.9 / Z * 20) / 20);   // popisky pri oddialení rastú, aby ostali čitateľné (na obrazovke stála veľkosť)
        this.cullChunks();   // cesty, rieka a tiene hôr len pri kamere

        try {
            this.syncForest(1);
            if (this.towns) this.syncTowns();
            this.syncArmies();
            if (this.hero) this.syncHero();
            this.drawFx();
            if (this.clouds) { const on = !lowFx(); this.clouds.setVisible(on); if (on) { this.clouds.tilePositionX -= delta * .0022 * timeMul(); this.clouds.tilePositionY -= delta * .0009 * timeMul(); this.clouds.setAlpha(1 - nightness() * .8); } }   // oblaky plávajú od západu, v noci ich tieň zmizne
            if (this.haze) this.haze.setAlpha(.85 + .15 * Math.sin(time / 1400));
        } catch (e) {
            if (!this.drawErr) { this.drawErr = 1; console.error('Mapa', e); }
        }
    }

    syncTowns() {
        for (const o of this.towns) {
            const t = o.t, L = lvl(t);
            if (o.f !== t.f) { o.f = t.f; o.spr.setTexture('map_castle_' + t.f); }
            if (o.lv !== L) { o.lv = L; o.spr.setScale(.32 * (.85 + L * .08)); o.stars.setText('★'.repeat(L)); }
            const lab = t.n + '  ⚔' + t.g;
            if (o.lab !== lab) { o.lab = lab; o.txt.setText(lab); }
            const col = t.f === G.fac ? '#ffd24a' : hos(t.f, G.fac) ? '#ffa890' : AL[G.fac] && AL[G.fac][t.f] ? '#b0e898' : '#ecdfc6';   // tvoj hrad zlatý, nepriateľský červenkastý, spojenecký zelený
            if (o.col !== col) { o.col = col; o.txt.setColor(col); }
            const ls = this.ls || 1;
            if (o.ls !== ls) { o.ls = ls; o.txt.setScale(ls); o.stars.setScale(ls); }
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
            const ls = Math.max(1, (this.ls || 1) * .8);
            if (o.ls !== ls) { o.ls = ls; o.txt.setScale(ls); o.txt.setVisible(Z > .5); }   // pri veľkom oddialení mená dedín zmiznú (neprekrývajú hrady)
        }
        if (this.placeTxt && this._pls !== this.ls) { this._pls = this.ls; const ps = Math.max(1, (this.ls || 1) * .9); this.placeTxt.forEach(t => t.setScale(ps)); }   // mená zaujímavých miest
    }

    syncArmies() {
        const seen = this._seen || (this._seen = new Set());
        seen.clear();
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
            const sig = e.f + '|' + (e.kind || '') + '|' + (e.nz ? 1 : 0) + '|' + (e.kr ? 1 : 0) + '|' + (e.cp || '') + '|' + (e.nm || '');
            if (o.sig !== sig) { o.sig = sig; const eq = Figures.lordEq(e); o.fk = Figures.key(eq[0], eq[1]); }
            if (o.f !== o.fk) { o.f = o.fk; const k = Art.figure(this, ...Figures.lordEq(e)); o.spr.setTexture(k, 0).setScale((Art.scale[k] || 1 / RES) * 1.2).play({ key: k + ':wave', startFrame: e.id % 4 }); }
            o.spr.setPosition(e.x, e.y);
            if (o._y !== (e.y | 0)) { o._y = e.y | 0; o.spr.setDepth(e.y); }
            if (e.vx) o.spr.setFlipX(e.vx < 0);
            const lab = e.nm + ' ' + Math.ceil(e.n), col = hos(e.f, G.fac) ? '#ff8a70' : (AL[G.fac][e.f] || e.f === G.fac) ? '#9fe08a' : '#ecdfc6';
            o.txt.setPosition(e.x, e.y + 19);
            if (o.ls !== this.ls) { o.ls = this.ls; o.txt.setScale(this.ls || 1); }
            if (o.lab !== lab) { o.lab = lab; o.txt.setText(lab); }
            if (o.col !== col) { o.col = col; o.txt.setColor(col); }
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
        const ht = G.name + ' ' + ar();
        const atT = this.towns && this.towns.find(o => Math.abs(o.t.x - G.x) < 40 && Math.abs(o.t.y - G.y) < 40);   // v hrade: popisok družiny pod menom hradu, nie cez neho
        this.heroTxt.setPosition(G.x, atT ? atT.txt.y + atT.txt.displayHeight + 3 * (this.ls || 1) : G.y + 38).setScale(this.ls || 1);
        if (this._ht !== ht) { this._ht = ht; this.heroTxt.setText(ht); }
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
            const line = 'Obliehanie ' + (G.day - s.d0 + 1) + '. deň · ' + (parts.length ? parts.join(', ') : 'stavia ' + (k ? SIEGE_NAME[k] + ' ' + pct(siegeProg(s, k)) : '')) + ' · zásoby ' + Math.max(0, s.food) + ' d.';
            tx.setPosition(t.x, t.y + 44);
            if (tx._l !== line) { tx._l = line; tx.setText(line); }
            const on = t.x > cam.x - 80 && t.x < cam.x + W / Z + 80 && t.y > cam.y - 80 && t.y < cam.y + H / Z + 80;
            tx.setVisible(on);
            if (!on) return;
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

    /** Farba frakcie ako číslo pre Graphics (FC sú reťazce '#rrggbb'). */
    fcol(f) { const c = this._fc || (this._fc = {}); return c[f] ?? (c[f] = parseInt((FC[f] || '#888888').slice(1), 16)); }

    drawFx() {
        const g = this.fx; g.clear();
        const x0 = cam.x - 220, y0 = cam.y - 220, x1 = cam.x + W / Z + 220, y1 = cam.y + H / Z + 220;
        const see = (x, y) => x > x0 && x < x1 && y > y0 && y < y1;
        const moving = Math.hypot(G.tx - G.x, G.ty - G.y) > 3;
        if (moving) for (let k = 1; k < 5; k++) g.fillStyle(0xc8b48c, .22 - k * .04).fillCircle(G.x - Math.cos(G.f || 0) * k * 7, G.y - Math.sin(G.f || 0) * k * 7 + 8, 5 - k * .6);
        g.lineStyle(2, 0xd9a441, .7).strokeEllipse(G.x, G.y + 8, 38, 16);
        if (moving) {   // trasa družiny: bodky k cieľu (posúvajú sa smerom pochodu) a značka cieľa
            const dx = G.tx - G.x, dy = G.ty - G.y, dl = Math.hypot(dx, dy), st = 16 / Z, ph = (tm * .8 / Z) % st;
            g.fillStyle(0xecdfc6, .55); for (let d = 14 / Z + ph; d < dl - 8; d += st) g.fillCircle(G.x + dx / dl * d, G.y + 8 + dy / dl * d, 1.8 / Z);
            const pr = 1 + .15 * Math.sin(tm / 5); g.lineStyle(2 / Z, 0xffd24a, .8).strokeEllipse(G.tx, G.ty, 22 * pr / Z, 10 * pr / Z); g.lineStyle(1.5 / Z, 0xecdfc6, .6).strokeRect(G.tx - 3 / Z, G.ty - 3 / Z, 6 / Z, 6 / Z);
        }
        for (const e of E) {
            if (!see(e.x, e.y)) continue;
            if (e.nz) g.fillStyle(0x780000, .28).fillCircle(e.x, e.y, 26 + Math.sin(tm / 6) * 3);
            if (hos(e.f, G.fac)) { const strong = e.n > pw(); g.fillStyle(strong ? 0xe0442a : 0xe0a030, .14).fillEllipse(e.x, e.y + 8, 34, 14); g.lineStyle(2, strong ? 0xe0442a : 0xe0a030, 1).strokeEllipse(e.x, e.y + 8, 34, 14); }   // nepriateľ: červený = silnejší ako ty, oranžový = slabší
            else g.lineStyle(1.5, e.f === G.fac || (AL[G.fac] && AL[G.fac][e.f]) ? 0x5aa0e8 : 0xa8a49a, .75).strokeEllipse(e.x, e.y + 8, 34, 14);   // tvoji a spojenci modrý krúžok, neutrálni sivý
            if (e.fo) { g.lineStyle(3, 0xffd27a, 1); g.lineBetween(e.x - 9, e.y - 36, e.x + 9, e.y - 20); g.lineBetween(e.x + 9, e.y - 36, e.x - 9, e.y - 20); }
        }
        // pod menom hradu pásik vo farbe frakcie (ako erb na štítku)
        if (this.towns) for (const o of this.towns) { const t = o.t; if (!see(t.x, t.y)) continue; const tw = o.txt.displayWidth, th = o.txt.displayHeight; g.fillStyle(this.fcol(t.f), 1).fillRect(t.x - tw / 2, o.txt.y + th, tw, 3 * (this.ls || 1)); }
        // zraz vojska vlastnej frakcie: pulzujúci zlatý kruh a zástava pri hrade zrazu
        if (!this.musterTxt) { this.musterTxt = this.add.text(0, 0, 'Zraz vojska', { fontFamily: 'sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#ffd24a', backgroundColor: 'rgba(18,14,12,.8)', padding: { x: 5, y: 1 }, resolution: RES }).setOrigin(.5, 1).setDepth(9003).setVisible(false); this.mmCam.ignore(this.musterTxt); }
        const mm = G.fac !== 9 ? marshal(G.fac) : null;
        if (mm && mm.mu && TW[mm.mu.t] && !mm.dead) {
            const mp = musterPoint(mm, TW[mm.mu.t]), r = 70 + Math.sin(tm / 8) * 10;
            g.lineStyle(4, 0xffd24a, .8).strokeCircle(mp.x, mp.y + 10, r); g.lineStyle(2, 0xffd24a, .35).strokeCircle(mp.x, mp.y + 10, r + 14);
            g.lineStyle(3, 0xffd24a, .9).lineBetween(mm.x, mm.y - 10, mp.x, mp.y + 10);
            const mt = 'Zraz vojska: ' + mm.nm + ' → ' + TW[mm.mu.t].n;
            this.musterTxt.setVisible(true).setPosition(mp.x, mp.y - r - 4);
            if (this._mt !== mt) { this._mt = mt; this.musterTxt.setText(mt); }
        } else this.musterTxt.setVisible(false);
        for (const v of VL) if (v.st > 0 && see(v.x, v.y)) {
            // horiaca dedina: plamene pri domoch a stúpajúci dym
            for (let k = 0; k < 5; k++) { const fx = v.x - 18 + k * 9, fl = 3 + Math.sin(tm / 2 + k * 1.3) * 1.5; g.fillStyle(0xff7a20, .8).fillTriangle(fx - 3, v.y - 6, fx, v.y - 10 - fl * 2, fx + 3, v.y - 6); g.fillStyle(0xffd060, .9).fillTriangle(fx - 1.5, v.y - 6, fx, v.y - 8 - fl, fx + 1.5, v.y - 6); }
            for (let k = 0; k < 6; k++) { const s = (tm * .5 + k * 14) % 84; g.fillStyle(0x3c322d, .45 - s / 200).fillCircle(v.x - 10 + k * 4 + Math.sin(s * .15 + k) * 6, v.y - 14 - s * .7, 4 + s * .13); }
            g.fillStyle(0xff6a20, .08 + .04 * Math.sin(tm / 3)).fillCircle(v.x, v.y - 6, 40);
        }
        // Oko Mordoru nad Barad-dûrom: plamenné oko hľadí za hrdinom; po zničení Prsteňa ostane rozpadnutá veža a dym
        const bd = this.baradDur || (this.baradDur = TW.find(t => t.n === 'Barad-dûr'));
        if (bd && see(bd.x, bd.y - 80)) {
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
        // Hora osudu: červená žiara na zemi okolo úpätia
        if (this.doom && see(this.doom.x, this.doom.y)) { const pu = .05 + .025 * Math.sin(tm / 9); g.fillStyle(0xff4a10, pu).fillEllipse(this.doom.x, this.doom.y - 20, 1100, 460); g.fillStyle(0xff7a20, pu * 1.2).fillEllipse(this.doom.x, this.doom.y - 30, 520, 200); }
        // hmla nad močiarmi: pomaly plávajúce chuchvalce
        if (!lowFx()) for (const pl of PLACES) if (pl.kind === 'swamp' && see(pl.x * K, pl.y * K)) for (let k = 0; k < 9; k++) { const mx = pl.x * K + Math.sin(tm / 140 + k * 1.7) * 160 + (k - 4) * 60, my = pl.y * K + Math.cos(tm / 170 + k * 2.3) * 50 + (k % 3 - 1) * 40, al = .022 + .01 * Math.sin(tm / 40 + k); for (let j = 0; j < 4; j++) g.fillStyle(0xd8e0d0, al).fillEllipse(mx, my, (130 + k * 8) * (1 + j * .45), (36 + (k % 3) * 8) * (1 + j * .45)); }   // mäkké okraje: štyri vrstvy od stredu
        // sneh na severe: vločky padajú len okolo kamery
        { const cx = cam.x + W / Z / 2, cy = cam.y + H / Z / 2; if (!lowFx() && regionAt(cx, cy) === 's') { const vw = W / Z, vh = H / Z; g.fillStyle(0xffffff, .75); for (let k = 0; k < 90; k++) { const sp = 1 + (k % 3) * .5, fx = cam.x + ((k * 137.3 + tm * .7 * sp + Math.sin(tm / 30 + k) * 12) % vw + vw) % vw, fy = cam.y + ((k * 211.7 + tm * 1.6 * sp) % vh); g.fillCircle(fx, fy, (1 + (k % 3) * .5) / Z); } } }
        // Hora osudu: dym a pulz žiary
        if (this.doom) { for (let k = 0; k < 5; k++) { const s = (tm * .3 + k * 30) % 150; g.fillStyle(0x2a1a18, .35 - s / 500).fillCircle(this.doom.x + Math.sin(s * .05 + k) * 20 - 10, this.doom.y - this.doom.displayHeight * .9 - s * 1.2, 14 + s * .25); } }
        // život v dedinách: dym z komínov cez deň, svietiace okná v noci (len pri kamere)
        { const nn = nightness(), cx = cam.x + W / Z / 2, cy = cam.y + H / Z / 2, rr = Math.max(W, H) / Z;
          for (let i = 0; i < VL.length; i++) { const v = VL[i]; if (v.st > 0 || Math.abs(v.x - cx) > rr || Math.abs(v.y - cy) > rr) continue;
            if (nn > .35) { g.fillStyle(0xffd080, .5 + .3 * Math.sin(tm / 7 + i)); for (let k = 0; k < 1 + lvl(v) / 2; k++) g.fillRect(v.x - 10 + ((k * 13 + i * 5) % 24), v.y - 6 + ((k * 7) % 8), 2.5, 2); g.fillStyle(0xffc060, .08).fillCircle(v.x, v.y, 26); }
            else if (lvl(v) >= 2 && !lowFx()) { for (let k = 0; k < 3; k++) { const sm = (tm * .35 + k * 20 + i * 7) % 60; g.fillStyle(0xd8d0c8, .22 - sm / 300).fillCircle(v.x + 6 + Math.sin(sm * .12 + k + i) * 4, v.y - 12 - sm * .55, 2.2 + sm * .08); } } } }
        // hrady v noci: svetlá v oknách, žiara nad hradbami a blikajúce fakle pri bráne; rieka sa cez deň trblieta a v noci odráža mesiac
        { const nn = nightness(), cx = cam.x + W / Z / 2, cy = cam.y + H / Z / 2, rr = Math.max(W, H) / Z * 1.2;
          if (nn > .3) for (let i = 0; i < this.towns.length; i++) { const o = this.towns[i], t = o.t; if (Math.abs(t.x - cx) > rr || Math.abs(t.y - cy) > rr) continue;
            const dw = o.spr.displayWidth, dh = o.spr.displayHeight, a = Math.min(1, (nn - .3) * 2.5);
            g.fillStyle(0xffb050, .07 * a).fillCircle(t.x, t.y - dh * .45, dw * .55);
            for (let k = 0; k < 7; k++) { const wx = t.x + (((k * 37 + i * 11) % 100) / 100 - .5) * dw * .6, wy = t.y - dh * (.25 + ((k * 53 + i * 7) % 100) / 100 * .45), fl = .6 + .4 * Math.sin(tm / (5 + k) + i + k); g.fillStyle(0xffd27a, .85 * a * fl).fillRect(wx - 1.6, wy - 2.2, 3.2, 4.4); g.fillStyle(0xffb050, .12 * a * fl).fillCircle(wx, wy, 7); }
            for (const s of [-1, 1]) { const fx = t.x + s * dw * .14, fy = t.y - dh * .08, f = 1 + .25 * Math.sin(tm / 2.3 + s + i); g.fillStyle(0xff8a20, .2 * a).fillCircle(fx, fy, 12 * f); g.fillStyle(0xffe08a, .9 * a).fillCircle(fx, fy, 2.2 * f); } }
          if (!lowFx()) { const rp = riverPoints(); for (let i = 0; i < rp.length; i += 2) { const [x, y] = rp[i]; if (Math.abs(x - cx) > rr || Math.abs(y - cy) > rr) continue;
            const sh = Math.sin(tm / 9 + i * .7); if (sh > .55) g.fillStyle(nn > .4 ? 0xdfe8ff : 0xffffff, (sh - .55) * (nn > .4 ? .9 : .7)).fillEllipse(x + Math.sin(tm / 20 + i) * 8, y, 12, 2.4); } } }
        // Nazgûl na okrídlenej šelme: tieň na zemi a tmavé krídla nad ním (js/sim/bosses.js)
        if (G.fell) { const F = G.fell, a = Math.atan2(G.y - F.y, G.x - F.x), fl = Math.sin(tm / 4) * 10, c = Math.cos(a), s = Math.sin(a);
            g.fillStyle(0x000000, .28).fillEllipse(F.x, F.y + 40, 90, 30);
            for (const sd of [-1, 1]) g.fillStyle(0x121218, .95).fillTriangle(F.x, F.y - 30, F.x - c * 30 - s * sd * 80, F.y - 30 - s * 30 + c * sd * 80 + fl * sd, F.x - c * 50, F.y - 30 - s * 50);
            g.fillStyle(0x1a1a20, 1).fillEllipse(F.x, F.y - 30, 44, 20); g.fillStyle(0xff3020, .9).fillCircle(F.x + c * 12, F.y - 36 + s * 12, 2.5); }
        // poslovia a karavány (js/sim/realm.js)
        for (const v of G.envs || []) { const b = Math.sin(tm / 3) * 1.5; g.fillStyle(0x000000, .3).fillEllipse(v.x, v.y + 6, 16, 5); g.fillStyle(0x6a4a2a, 1).fillEllipse(v.x, v.y + b, 14, 7); g.fillStyle(0xe8d8b0, 1).fillCircle(v.x + 2, v.y - 7 + b, 3.4); g.lineStyle(1.5, 0x3a2a1a, 1).lineBetween(v.x - 4, v.y - 4 + b, v.x - 4, v.y - 24 + b); g.fillStyle(hex(FC[v.f]), 1).fillTriangle(v.x - 4, v.y - 24 + b, v.x + 9, v.y - 20 + b, v.x - 4, v.y - 16 + b); }
        for (const c of G.cars || []) { g.fillStyle(0x000000, .3).fillEllipse(c.x, c.y + 7, 22, 6); g.fillStyle(0x8a5a30, 1).fillRect(c.x - 9, c.y - 6, 18, 9); g.fillStyle(0xe8d8b0, 1).fillRect(c.x - 8, c.y - 11, 16, 6); g.fillStyle(0x3a2a1a, 1).fillCircle(c.x - 6, c.y + 4, 3).fillCircle(c.x + 6, c.y + 4, 3); g.fillStyle(0xffd24a, 1).fillCircle(c.x, c.y - 13, 2); }
        // prach pod armádami na pochode
        if (!lowFx()) for (const e of E) if ((e.vx || e.vy) && Math.hypot(e.x - G.x, e.y - G.y) < 900) for (let k = 1; k < 3 + Math.min(3, e.n / 10); k++) g.fillStyle(regionAt(e.x, e.y) === 's' ? 0xffffff : 0xc8b48c, .16 - k * .03).fillCircle(e.x - e.vx * k * 9 + Math.sin(tm / 3 + k) * 2, e.y - e.vy * k * 9 + 8, 4 + k * .4);
        this.drawSieges(g);
        if (G.camp || G.besiege >= 0) {
            g.fillStyle(0xc8a870, 1).fillTriangle(G.x - 30, G.y + 6, G.x - 18, G.y - 12, G.x - 6, G.y + 6);
            g.fillStyle(0xff9a3a, 1).fillCircle(G.x + 26, G.y + 4, 3 + Math.random() * 1.5);
        }
    }

}
