/*
 * ENGINE: mapa sveta.
 * Logika (pohyb, AI, diplomacia, dni) beží v js/sim cez updMap(dt).
 * Krajinu, hrady, dediny a postavy kreslí 3D mapa (js/engine/3d/m3d.js) pod priehľadným plátnom Phaseru;
 * táto scéna ovláda kameru (zoom, stred na družine), klikanie, trasy ciest a štítky (mená hradov, dedín, armád),
 * ktoré 3D mapa premieta na obrazovku, a pripraví textúru minimapy.
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
        this._ht = null;   // text je nový: zabudni naposledy nastavený (inak štítok družiny po bitke ostane prázdny)
        try { this.buildRoads(); }
        catch (e) { console.error('Mapa', e); }
        const places = () => {
        try {
        this.vill = VL.map(v => ({
            v, key: '',
            txt: this.add.text(v.x, v.y + 14, v.n, txtStyle(12, '#d8ccb4', { backgroundColor: 'rgba(18,14,12,.6)', padding: { x: 4, y: 1 } })).setOrigin(.5, 0).setDepth(9000)
        }));

        this.towns = TW.map(t => ({
            t, f: -1,
            txt: this.add.text(t.x, t.y + 18, '', txtStyle(15, '#ecdfc6', { backgroundColor: 'rgba(18,14,12,.82)', padding: { x: 7, y: 2 } })).setOrigin(.5, 0).setDepth(9001),
            stars: this.add.text(t.x - 24, t.y - 60, '', { fontFamily: 'sans-serif', fontSize: '11px', color: '#ffd24a', fontStyle: 'bold', resolution: RES }).setOrigin(.5).setDepth(9001)
        }));

        this.heroTxt = this.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#ffd24a', backgroundColor: 'rgba(18,14,12,.85)', padding: { x: 5, y: 1 }, resolution: RES }).setOrigin(.5, 0).setDepth(9002);

        this.cameras.main.setBounds(0, 0, WW, WH).setBackgroundColor('#1e2a16');
        this.ready = true;
        const chart = () => {
        try {
        if (typeof BootLoad !== 'undefined' && BootLoad.on) BootLoad.set(.9, 'Kreslím minimapu…');
        this.minimapTexture();   // minimapu kreslí UIScene z textúry 'minimap'

        this.input.on('pointerdown', p => this.click(p));
        this.input.on('pointermove', p => { this.hover = (M3.on && M3.pick(p.x / RES, p.y / RES)) || this.cameras.main.getWorldPoint(p.x, p.y); this.hoverScreen = { x: p.x / RES, y: p.y / RES }; });
        this.input.on('gameout', () => this.hover = null);
        this.input.on('wheel', (p, o, dx, dy) => { if (mode === 'map') Z = Math.max(.45, Math.min(1.5, Z - Math.sign(dy) * .1)); });
        this.events.once('shutdown', () => { this.input.removeAllListeners(); M3.stop(); });
        } catch (e) { console.error('Mapa', e); }
        this.finishBoot();
        };
        if (this.booting) setTimeout(() => { if (this.scene.isActive()) chart(); else this.finishBoot(); }, 30); else chart();
        } catch (e) { console.error('Mapa', e); this.finishBoot(); }
        };
        if (this.booting) { BootLoad.set(.68, 'Staviam dediny a hrady…'); setTimeout(() => { if (this.scene.isActive()) places(); else this.finishBoot(); }, 30); } else places();
    }

    /** Cesty medzi hradmi: trasa po súši z hľadania cesty (js/sim/nav.js) – rieky prekračujú len na mostoch a brodoch; rohy sa zaoblia (Chaikin).
     *  roadLines = tvar ciest pre pergamenovú veľkú mapu (UIMaps.js), roadPts = ich body (3D mapa podľa nich vyšliapáva cesty). */
    buildRoads() {
        const k = K;
        const roads = MAPDATA.roads.map(([a, b]) => {
            const A = TW[a], B = TW[b]; if (!A || !B) return [];
            let P = [[A.x, A.y], ...(NAV.path(A.x, A.y, B.x, B.y) || [[B.x, B.y]])];
            for (let it = 0; it < 3; it++) { const Q = [P[0]]; for (let i = 0; i < P.length - 1; i++) { const [x0, y0] = P[i], [x1, y1] = P[i + 1]; Q.push([x0 * .75 + x1 * .25, y0 * .75 + y1 * .25], [x0 * .25 + x1 * .75, y0 * .25 + y1 * .75]); } Q.push(P[P.length - 1]); P = Q; }
            const D = [P[0]]; for (let i = 1; i < P.length; i++) { const [x0, y0] = P[i - 1], [x1, y1] = P[i], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (5 * k))); for (let q = 1; q <= n; q++) D.push([x0 + (x1 - x0) * q / n, y0 + (y1 - y0) * q / n]); }
            return D.map(([x, y]) => new Phaser.Math.Vector2(x, y));
        }).filter(r => r.length > 1);
        this.roadLines = roads;
        this.roadPts = roads.flat();
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
        const w = (M3.on && M3.pick(sx, sy)) || this.cameras.main.getWorldPoint(p.x, p.y);   // 3D mapa: lúč kamery na zem (js/engine/3d/m3d.js)
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
        if (mode === 'battle') { M3.stop(this); this.scene.start('Battle'); return; }

        const c = this.cameras.main;
        c.setZoom(Z * RES);
        cam.x = Math.max(0, Math.min(WW - W / Z, G.x - W / Z / 2));
        cam.y = Math.max(0, Math.min(WH - H / Z, G.y - H / Z / 2));
        c.centerOn(cam.x + W / Z / 2, cam.y + H / Z / 2);

        try {
            if (this.towns) this.syncTowns();
            this.syncArmies();
            if (this.heroTxt) this.syncHero();
            if (typeof fpsBox === 'function') fpsBox(this.game.loop.actualFps);
            M3.frame(this, delta);   // 3D mapa: vykreslí krajinu, hrady a postavy a premietne sem štítky (js/engine/3d/m3d.js)
        } catch (e) {
            if (!this.drawErr) { this.drawErr = 1; console.error('Mapa', e); }
        }
    }

    /** Štítky hradov a dedín (3D mapa ich premieta na obrazovku): meno, počet vojakov, úroveň a farba podľa vzťahu k hráčovi. */
    syncTowns() {
        for (const o of this.towns) {
            const t = o.t, L = lvl(t);
            if (o.lv !== L) { o.lv = L; o.stars.setText('★'.repeat(L)); }
            const lab = t.n + '  ⚔' + t.g;
            if (o.lab !== lab) { o.lab = lab; o.txt.setText(lab); }
            const col = t.f === G.fac ? '#ffd24a' : hos(t.f, G.fac) ? '#ffa890' : AL[G.fac] && AL[G.fac][t.f] ? '#b0e898' : '#ecdfc6';   // tvoj hrad zlatý, nepriateľský červenkastý, spojenecký zelený
            if (o.col !== col) { o.col = col; o.txt.setColor(col); }
        }
        for (const o of this.vill) {
            const f = TW[o.v.t].f, b = o.v.st > 0, key = f + (b ? 'b' : '');
            if (o.key !== key) { o.key = key; o.txt.setColor(b ? '#c08070' : FC[f]); }
        }
    }

    /** Štítky armád: meno a počet vojakov, farba podľa vzťahu k hráčovi. */
    syncArmies() {
        const seen = this._seen || (this._seen = new Set());
        seen.clear();
        for (const e of E) {
            seen.add(e.id);
            let o = this.armies.get(e.id);
            if (!o) {
                o = { txt: this.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#ecdfc6', backgroundColor: 'rgba(18,14,12,.78)', padding: { x: 5, y: 1 }, resolution: RES }).setOrigin(.5, 0).setDepth(9002) };
                this.armies.set(e.id, o);
            }
            const lab = e.nm + ' ' + Math.ceil(e.n), col = hos(e.f, G.fac) ? '#ff8a70' : (AL[G.fac][e.f] || e.f === G.fac) ? '#9fe08a' : '#ecdfc6';
            if (o.lab !== lab) { o.lab = lab; o.txt.setText(lab); }
            if (o.col !== col) { o.col = col; o.txt.setColor(col); }
        }
        for (const [id, o] of this.armies) if (!seen.has(id)) { o.txt.destroy(); this.armies.delete(id); }
    }

    /** Štítok družiny: meno hrdinu a počet vojakov. */
    syncHero() {
        const ht = G.name + ' ' + ar();
        if (this._ht !== ht) { this._ht = ht; this.heroTxt.setText(ht); }
    }
}
