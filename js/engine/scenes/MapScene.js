/*
 * ENGINE: mapa sveta.
 * Logika (pohyb, AI, diplomacia, dni) beží v js/sim cez updMap(dt).
 * Táto scéna ju iba zobrazuje: dlaždice mapy, hrady, dediny, armády,
 * kameru so zoomom a minimapu ako druhú kameru Phaseru.
 */
const MM = { x: W - 186, y: H - 126, w: 180, h: 120 };

class MapScene extends Phaser.Scene {
    constructor() { super('Map'); }

    create() {
        this.armies = new Map();      // id armády -> { spr, txt, crown }
        this.tiles = this.add.group();
        for (const t of Bake.worldTiles(this))
            this.tiles.add(this.add.image(t.x, t.y, t.key).setOrigin(0).setScale(t.s).setDepth(-10));

        // Dediny
        this.vill = VL.map(v => {
            const spr = this.add.image(v.x, v.y, Bake.village(this, 0)).setDepth(v.y - 1);
            const txt = this.add.text(v.x, v.y + 14, v.n, { fontFamily: '"IM Fell English", Georgia, serif', fontSize: '12px', color: '#d8ccb4', backgroundColor: 'rgba(18,14,12,.6)', padding: { x: 4, y: 1 } }).setOrigin(.5, 0).setDepth(9000);
            return { v, spr, txt, key: '' };
        });

        // Hrady
        this.towns = TW.map(t => {
            const spr = this.add.image(t.x, t.y, Bake.castle(this, t.f)).setOrigin(52 / 120, 80 / 110).setDepth(t.y);
            const txt = this.add.text(t.x, t.y + 18, '', { fontFamily: '"IM Fell English", Georgia, serif', fontSize: '15px', color: '#ecdfc6', backgroundColor: 'rgba(18,14,12,.82)', padding: { x: 7, y: 2 } }).setOrigin(.5, 0).setDepth(9001);
            const stars = this.add.text(t.x - 24, t.y - 46, '', { fontFamily: 'sans-serif', fontSize: '11px', color: '#ffd24a', fontStyle: 'bold' }).setOrigin(.5).setDepth(9001);
            return { t, spr, txt, stars, f: -1 };
        });

        // Hrdina
        this.hero = this.add.image(G.x, G.y, Bake.rider(this, G.fac, 1)).setOrigin(22 / 60, 52 / 70);
        this.heroTxt = this.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#ffd24a', backgroundColor: 'rgba(18,14,12,.85)', padding: { x: 5, y: 1 } }).setOrigin(.5, 0).setDepth(9002);
        this.heroCrown = this.add.image(0, 0, Bake.crown(this)).setDepth(9002);

        // Kruhy, cieľ, tábor, Nazgûli a súboje – prekresľujú sa každý snímok
        this.fx = this.add.graphics().setDepth(8999);

        // Kamera
        const cam0 = this.cameras.main;
        cam0.setBounds(0, 0, WW, WH).setBackgroundColor('#1e2a16');

        // Minimapa: druhá kamera nad celým svetom
        this.mini = this.add.graphics().setDepth(9500);
        this.mmCam = this.cameras.add(MM.x, MM.y, MM.w, MM.h).setZoom(MM.w / WW).setBounds(0, 0, WW, WH).setBackgroundColor('#120e0c');
        this.mmCam.centerOn(WW / 2, WH / 2);
        cam0.ignore(this.mini);
        this.mmCam.ignore([this.fx, this.heroTxt, this.heroCrown, ...this.vill.flatMap(o => [o.spr, o.txt]), ...this.towns.flatMap(o => [o.txt, o.stars, o.spr]), this.hero]);

        this.input.on('pointerdown', p => this.click(p));
        this.input.on('wheel', (p, o, dx, dy) => { if (mode === 'map') Z = Math.max(.45, Math.min(1.5, Z - Math.sign(dy) * .1)); });
        this.events.once('shutdown', () => this.input.removeAllListeners());
    }

    click(p) {
        if (mode !== 'map' || !G) return;
        if (G.camp) { G.camp = 0; const b = [...tb.children].find(x => /tábor/i.test(x.textContent)); if (b) b.textContent = 'Tábor'; upd(); }
        G.dest = -1; G.vd = -1; G.chase = null; G.talk = null;
        if (p.x > MM.x && p.y > MM.y) { G.tx = (p.x - MM.x) / MM.w * WW; G.ty = (p.y - MM.y) / MM.h * WH; return; }
        const w = this.cameras.main.getWorldPoint(p.x, p.y);
        G.tx = w.x; G.ty = w.y;
        E.forEach(e => { if (Math.hypot(e.x - w.x, e.y - w.y) < 34) { if (hos(e.f, G.fac)) G.chase = e; else G.talk = e; } });
        VL.forEach((v, i) => { if (Math.hypot(v.x - w.x, v.y - w.y) < 26) { G.tx = v.x; G.ty = v.y; G.vd = i; } });
        TW.forEach((t, i) => { if (Math.hypot(t.x - w.x, t.y - w.y) < 30) { G.tx = t.x; G.ty = t.y; G.dest = i; } });
        if (G.chase || G.talk) { G.vd = -1; G.dest = -1; }
    }

    update(time, delta) {
        if (!G) return;
        const dt = Math.min(2, delta / 16.67);
        if (mode === 'map') updMap(dt);
        if (mode === 'battle') { this.scene.start('Battle'); return; }

        // Kamera nasleduje hrdinu (rovnaký prepočet ako simulácia, aby sedeli kliky)
        const c = this.cameras.main;
        c.setZoom(Z);
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
            if (o.f !== t.f) { o.f = t.f; o.spr.setTexture(Bake.castle(this, t.f)); o.txt.setStyle({ backgroundColor: 'rgba(18,14,12,.82)' }); }
            o.spr.setScale(.85 + L * .08);
            o.txt.setText(t.n + '  ⚔' + t.g);
            o.stars.setText('★'.repeat(L));
        }
        for (const o of this.vill) {
            const f = TW[o.v.t].f, b = o.v.st > 0, key = f + (b ? 'b' : '');
            if (o.key !== key) { o.key = key; o.spr.setTexture(Bake.village(this, f, b)); o.txt.setColor(b ? '#c08070' : FC[f]); }
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
                    spr: this.add.image(e.x, e.y, Bake.rider(this, e.f)).setOrigin(22 / 60, 52 / 70),
                    txt: this.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#ecdfc6', backgroundColor: 'rgba(18,14,12,.78)', padding: { x: 5, y: 1 } }).setOrigin(.5, 0).setDepth(9002),
                    crown: this.add.image(0, 0, Bake.crown(this)).setDepth(9002)
                };
                this.mmCam.ignore([o.spr, o.txt, o.crown]);
                this.armies.set(e.id, o);
            }
            if (o.f !== e.f) { o.f = e.f; o.spr.setTexture(Bake.rider(this, e.f)); }
            o.spr.setPosition(e.x, e.y).setDepth(e.y);
            o.txt.setPosition(e.x, e.y + 19).setText(e.nm + ' ' + Math.ceil(e.n))
                .setColor(hos(e.f, G.fac) ? '#ff8a70' : (AL[G.fac][e.f] || e.f === G.fac) ? '#9fe08a' : '#ecdfc6');
            o.crown.setVisible(!!e.kr).setPosition(e.x + 17, e.y - 46);
        }
        for (const [id, o] of this.armies)
            if (!seen.has(id)) { o.spr.destroy(); o.txt.destroy(); o.crown.destroy(); this.armies.delete(id); }
    }

    syncHero() {
        const key = Bake.rider(this, G.fac, 1);
        if (this.hero.texture.key !== key) this.hero.setTexture(key);
        this.hero.setPosition(G.x, G.y).setDepth(G.y + 1);
        this.heroTxt.setPosition(G.x, G.y + 38).setText(G.name + ' ' + ar());
        this.heroCrown.setVisible(!!G.king).setPosition(G.x + 17, G.y - 46);
    }

    drawFx() {
        const g = this.fx; g.clear();
        const moving = Math.hypot(G.tx - G.x, G.ty - G.y) > 3;
        g.lineStyle(2, 0xd9a441, .7).strokeEllipse(G.x, G.y + 8, 38, 16);
        if (moving) g.lineStyle(1.5, 0xecdfc6, .6).strokeRect(G.tx - 5, G.ty - 5, 10, 10);
        for (const e of E) {
            if (e.nz) { g.fillStyle(0x780000, .28).fillCircle(e.x, e.y, 26 + Math.sin(tm / 6) * 3); }
            if (hos(e.f, G.fac)) g.lineStyle(2, e.n > pw() ? 0xe0442a : 0x6fbf5a, 1).strokeEllipse(e.x, e.y + 8, 34, 14);
            if (e.fo) { g.lineStyle(3, 0xffd27a, 1); g.lineBetween(e.x - 9, e.y - 36, e.x + 9, e.y - 20); g.lineBetween(e.x + 9, e.y - 36, e.x - 9, e.y - 20); }
        }
        if (G.camp) {
            g.fillStyle(0xc8a870, 1).fillTriangle(G.x - 30, G.y + 6, G.x - 18, G.y - 12, G.x - 6, G.y + 6);
            g.fillStyle(0xff9a3a, 1).fillCircle(G.x + 26, G.y + 4, 3 + Math.random() * 1.5);
        }
    }

    drawMini() {
        const g = this.mini; g.clear();
        for (const t of TW) { g.fillStyle(hex(FC[t.f]), .28).fillCircle(t.x, t.y, 220); g.fillStyle(hex(FC[t.f]), 1).fillRect(t.x - 55, t.y - 55, 110, 110); }
        for (const e of E) g.fillStyle(hos(e.f, G.fac) ? 0xff4030 : hex(FC[e.f]), 1).fillCircle(e.x, e.y, 45);
        g.fillStyle(0xffffff, 1).fillCircle(G.x, G.y, 70);
        g.lineStyle(40, 0xffffff, .7).strokeRect(cam.x, cam.y, W / Z, H / Z);
    }
}
