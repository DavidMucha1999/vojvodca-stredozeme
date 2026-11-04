/*
 * ENGINE: bitka.
 * Boj, AI vojakov, šípy, rozkazy a obliehanie beží v js/sim cez updBattle(dt).
 * Scéna zobrazuje bojisko a animovaných vojakov (státie, chôdza, útok, pád),
 * šípy, lišty zdravia, obliehacie stroje a častice legendárnych zbraní.
 */
/** Priblíženie kamery v bitke (1 = celé zorné pole simulácie 720×480). */
const BZ = 1.35;

/** Pohyb myši pre smer úderu a krytu (js/sim/combat.js mouseDir). */
const mouseDelta = p => { CMB.mdx = (CMB.mdx || 0) + (p.x - p.prevPosition.x) / RES; CMB.mdy = (CMB.mdy || 0) + (p.y - p.prevPosition.y) / RES; };
class BattleScene extends Phaser.Scene {
    constructor() { super('Battle'); }

    create() {
        this.ready = false;
        if (!Art.loaded.battle && !B3.want()) {   // textúry bojiska sa ešte dočítavajú na pozadí (alebo sa ešte nezačali)
            this.cameras.main.setBackgroundColor('#0b0806');
            const t = this.add.text(W * RES / 2, H * RES / 2, 'Vojská sa zoraďujú…', { fontFamily: '"IM Fell English", Georgia, serif', fontSize: 16 * RES + 'px', color: '#d9a441' }).setOrigin(.5).setScrollFactor(0);
            (Art.loading.battle || Art.loadTextures(this, 'battle')).then(() => { if (this.scene.isActive('Battle')) { t.destroy(); this.build(); } });
            return;
        }
        this.build();
    }

    build() {
        this.ready = true;
        if (B3.want() && B3.start()) return this.build3d();   // 3D bojisko (js/engine/b3d.js); 2D ostáva ako voľba v Nastaveniach
        this.d3 = false;
        this.buildField();

        this.marks = this.add.graphics().setDepth(-6);   // trvalé stopy boja: krv, zapichnuté šípy, padlé zbrane
        this.markN = 0;
        this.fx = this.add.graphics().setDepth(5000);
        if (WX.night) {   // noc: tma nad bojiskom a svetlo fakieľ okolo vojakov
            this.night = this.add.graphics().setDepth(4990);
            this.torch = this.add.graphics().setDepth(4991).setBlendMode('ADD');
        }
        this.units = new Map();
        for (const u of U) this.addUnit(u);

        const w = it('w');
        if (w.fx) {
            const fire = w.fx === 'fire', dark = w.fx === 'dark', light = w.fx === 'light';
            this.trail = this.add.particles(0, 0, Art.spark(this), {
                speed: { min: 6, max: fire ? 30 : light ? 24 : 18 }, angle: fire || dark || light ? { min: 240, max: 300 } : { min: 0, max: 360 },
                lifespan: fire ? 380 : dark ? 700 : 520, scale: { start: fire ? .32 : dark ? .36 : .26, end: dark ? .1 : 0 }, alpha: { start: fire ? .75 : dark ? .6 : .65, end: 0 },
                tint: fire ? [0xffd060, 0xff7a18, 0xff4010] : dark ? [0x2a1030, 0x4a1a5a, 0x7a2aa0] : light ? [0xfff4c0, 0xffffff, 0xffe080] : [0xc8e6ff, 0xffffff, 0x9fd0ff],
                blendMode: dark ? 'NORMAL' : 'ADD', frequency: fire ? 28 : dark ? 40 : light ? 22 : 55
            }).setDepth(4999);
            this.trail.startFollow(this.units.get(U[0]).spr, 0, 0);
        }
        if (w.aura) this.aura = this.add.graphics().setBlendMode('ADD');   // aura najlepšej zbrane (Andúril)

        this.cameras.main.setBounds(0, 0, BW, BH).setZoom(RES * BZ).setBackgroundColor(WX.night ? '#0c1018' : '#22301a');
        // simulácia počíta cieľ ako ptr + bc, preto ukladáme bod na bojisku mínus bc
        const set = p => { const w = this.cameras.main.getWorldPoint(p.x, p.y); ptr.x = w.x - bc.x; ptr.y = w.y - bc.y; };
        // myš: ľavé tlačidlo útok (po prvom pohybe klávesnicou), pravé kryt; dotyk: drž prst, kam bežať (js/sim/combat.js)
        if (this.input.mouse) this.input.mouse.disableContextMenu();
        this.input.on('pointerdown', p => { set(p); if (p.rightButtonDown()) { CMB.rmb = 1; CMB.km = 1; } else { ptr.down = true; if (CMB.km) CMB.lmb = 1; } });
        this.input.on('pointermove', p => { set(p); mouseDelta(p); });
        this.input.on('pointerup', p => { if (p.rightButtonReleased()) CMB.rmb = 0; else { ptr.down = false; CMB.lmb = 0; } });
        this.events.once('shutdown', () => { this.input.removeAllListeners(); ptr.down = false; CMB.lmb = CMB.rmb = 0; });
    }

    /** 3D bitka: Phaser kreslí len rozhranie (UIScene), bojisko a vojakov kreslí B3 pod priehľadným plátnom. */
    build3d() {
        this.d3 = true; this.units = new Map();
        if (this.sys.game.device.input.mouse !== false) CMB.km = 1;   // v 3D mieri myš od začiatku
        this.cameras.main.transparent = true;
        let last = null;
        const set = p => { last = { x: p.x, y: p.y }; const q = B3.pick(p.x, p.y); if (q) { ptr.x = q.x - bc.x; ptr.y = q.y - bc.y; } };
        this.repick = () => { if (last) set(last); };
        if (this.input.mouse) this.input.mouse.disableContextMenu();
        // fotorežim (P): hra stojí, myš otáča voľnou kamerou; nálet kamery na začiatku preskočí klik alebo kláves
        // mierenie ako vo Warbande: prvý klik zamkne kurzor, myš potom otáča hrdinu a kameru (Esc kurzor uvoľní); fotorežim (P); Tab prvá/tretia osoba
        const M = this.input.mouse, locked = () => !!(M && M.locked);
        this.input.on('pointerdown', p => {
            B3.skipIntro(); if (B3.photo || p.middleButtonDown()) { B3.dragStart(p.x, p.y); return; }
            if (B3.look && M && !locked()) { M.requestPointerLock(); return; }
            if (!B3.look) set(p);
            if (p.rightButtonDown()) { CMB.rmb = 1; CMB.km = 1; } else { ptr.down = true; if (CMB.km) CMB.lmb = 1; }
        });
        this.input.on('pointermove', p => {
            if (B3.photo) { B3.dragMove(p.x, p.y); return; }
            if (B3.look) { if (locked()) { B3.lookMove(p.movementX || 0, p.movementY || 0); CMB.mdx = (CMB.mdx || 0) + (p.movementX || 0) / RES; CMB.mdy = (CMB.mdy || 0) + (p.movementY || 0) / RES; } return; }
            B3.dragMove(p.x, p.y); set(p); if (!p.middleButtonDown()) mouseDelta(p);
        });
        this.input.on('pointerup', p => { if (B3.photo || p.middleButtonReleased()) { B3.dragEnd(); if (B3.photo) return; } if (p.middleButtonReleased()) return; if (p.rightButtonReleased()) CMB.rmb = 0; else { ptr.down = false; CMB.lmb = 0; } });
        let wl = 0; this.input.on('wheel', (p, o, dx, dy) => { if (B3.photo) { B3.wheel(dy); return; } const n = performance.now(); if (n - wl > 220 && Math.abs(dy) > 1) { wl = n; wpnSwitch(); } });   // koliesko: zbraň na blízko / strelná
        this.keyH = e => {
            if (mode !== 'battle') return; const k = (e.key || '').toLowerCase();
            if (k === 'p' && !e.repeat) B3.photoToggle(); else if (k === 'escape' && B3.photo) B3.photoToggle();
            else if (e.key === KB().cam) { e.preventDefault(); if (!e.repeat) B3.toggleFP(); }
            else if (k === '+' || k === '=' || k === 'pageup') B3.wheel(-160); else if (k === '-' || k === 'pagedown') B3.wheel(160);
            else B3.skipIntro();
        };
        addEventListener('keydown', this.keyH);
        this.events.once('shutdown', () => { if (locked()) M.releasePointerLock(); });
        this.events.once('shutdown', () => removeEventListener('keydown', this.keyH));
        this.events.once('shutdown', () => { this.input.removeAllListeners(); ptr.down = false; CMB.lmb = CMB.rmb = 0; B3.stop(); });
    }

    addUnit(u) {
        const key = Art.unit(this, u);
        const spr = Art.image(this, u.x, u.y, key, 0, true);
        spr.setScale(spr.scaleX * 1.22);          // väčší vojak = čitateľnejší na bojisku
        const o = { spr, key, dead: false, lc: u.c, state: 'idle' };
        if (u.bn && Art.img['unit_' + Art.unitArt(u)]) {           // nové sprity nemajú zástavu: pridáme ju
            const f = u.t ? u.fc : G.fac;
            const bk = Art.banner(this, f);
            o.flag = Art.image(this, u.x, u.y, bk).setScale((Art.scale[bk] || 1 / RES) * .6);
        }
        this.units.set(u, o);
    }

    /** Bojisko z textúr podľa miesta na mape (FIELD): zem podľa krajiny, rieka s brodom len pri Anduine, lesné zhluky podľa hustoty lesa,
     *  kopec s výhodou pre obrancu pri horách, skaly; pri obliehaní hrad. */
    buildField() {
        const b = { g: 'g', a: 'a', d: 'd', s: 's' }[BI] || 'g', F = FIELD || { trees: [] };
        this.add.tileSprite(0, 0, BW, BH, 'ground_' + b).setOrigin(0).setTileScale(.5).setDepth(-10);
        let seed = 7 + BW + Math.floor((F.forest || 0) * 97);
        const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
        if (F.hill) {   // kopec / úpätie hory: svetlejšia vyvýšenina so šikmým tieňom
            const hg = this.add.graphics().setDepth(-9.5), hx = BW * .62, hy = BH * .5;
            for (let k = 5; k >= 0; k--) { hg.fillStyle(0xffffff, .05 + (F.mountain ? .02 : 0)).fillEllipse(hx, hy, 340 - k * 40, 240 - k * 28); }
            hg.fillStyle(0x000000, .14).fillEllipse(hx + 40, hy + 50, 320, 200); hg.fillStyle(0xffffff, .06).fillEllipse(hx - 30, hy - 30, 220, 140);
            hg.lineStyle(2, 0xffffff, .12).strokeEllipse(hx, hy, 340, 240).strokeEllipse(hx, hy, 220, 150);
            if (F.mountain) for (let i = 0; i < 10; i++) this.add.image(hx + (rnd() - .5) * 300, hy + (rnd() - .5) * 200, 'rock').setScale(.35 + rnd() * .3).setDepth(hy);
        }
        if (F.river) {
            const bank = this.add.graphics().setDepth(-9);
            bank.fillStyle(0x2a3a22, .55).fillRect(684, 0, 72, BH);
            this.water = this.add.tileSprite(690, 0, 60, BH, 'water').setOrigin(0).setTileScale(.5).setDepth(-9);
            bank.fillStyle(0x9a8558, 1).fillRect(686, 440, 68, 80).fillStyle(0x000000, .12).fillRect(686, 440, 68, 4).fillRect(686, 516, 68, 4);
        }
        const tree = b === 'a' ? ['deadtree'] : b === 'd' ? [] : ['tree_0', 'tree_1', 'tree_2'];
        const place = (x, y) => {
            if (F.river && x > 660 && x < 780) return;
            if (SGB && x > 960) return;
            if (!tree.length) { this.add.image(x, y, 'rock').setScale(.5).setDepth(y); return; }
            this.add.image(x, y, tree[Math.floor(rnd() * tree.length)]).setOrigin(.25, .45).setScale(.5 * (.8 + rnd() * .5)).setDepth(y);
        };
        const dens = .6 + (F.forest || 0) * 1.4;
        for (const t of F.trees || []) { const n = Math.round(t.r * t.r / 420 * dens); const sh = this.add.graphics().setDepth(-9.4); sh.fillStyle(0x0a200c, .12 + (F.forest || 0) * .15).fillEllipse(t.x, t.y, t.r * 2.1, t.r * 1.6); for (let j = 0; j < n; j++) { const a = rnd() * 6.283, d = Math.sqrt(rnd()) * t.r; if (!(SGB && t.x + Math.cos(a) * d > 960)) place(t.x + Math.cos(a) * d, t.y + Math.sin(a) * d * .8); } }
        for (let i = 0; i < 40; i++) { place(rnd() * BW, 30 + rnd() * 40); place(rnd() * BW, BH - 6 - rnd() * 30); }
        for (let i = 0; i < 24; i++) { place(10 + rnd() * 40, rnd() * BH); if (!SGB) place(BW - 10 - rnd() * 40, rnd() * BH); }
        for (let i = 0; i < 26 + (F.hill ? 14 : 0); i++) { const x = rnd() * BW, y = rnd() * BH; if ((!F.river || x < 660 || x > 780) && !(SGB && x > 960)) this.add.image(x, y, 'rock').setScale(.25 + rnd() * .2).setDepth(-5); }
        if (SGB) {
            this.add.tileSprite(1040, 0, BW - 1040, BH, 'cobble').setOrigin(0).setTileScale(.5).setDepth(-8);
            this.add.tileSprite(1000, 0, 40, BH, 'wall').setOrigin(0).setTileScale(.5).setDepth(-7);
            const w = this.add.graphics().setDepth(-6);
            w.fillStyle(0xa49e90, 1); for (let y = 0; y < BH; y += 20) w.fillRect(994, y, 10, 12);
            for (let y = 0; y < BH; y += 20) { w.fillStyle(0xffffff, .22).fillRect(994, y, 10, 2); w.fillStyle(0x000000, .35).fillRect(994, y + 12, 10, 3).fillRect(1004, y + 1, 2, 11); }   // cimburie so svetlom a tieňom
            w.lineStyle(1, 0x000000, .18); for (let y = 6; y < BH; y += 13) w.lineBetween(1006, y, 1036, y);   // rady kameňov
            w.fillStyle(0x000000, .3).fillRect(1036, 0, 6, BH);
            w.fillStyle(0x2a2018, 1).fillRect(1000, 435, 40, 90);
            for (const y of [150, 390, 570, 810]) this.add.image(982, y - 41, 'tower').setOrigin(0).setScale(.5).setDepth(-6);
            this.add.image(1240, 300, 'keep').setOrigin(0).setScale(.5).setDepth(300 + 270);
        }
    }

    update(time, delta) {
        if (!this.ready) { if (mode !== 'battle') this.scene.start('Map'); return; }
        if (mode === 'battle') { const k = this.d3 ? B3.timeK() : 1; if (HITSTOP > 0) HITSTOP -= delta / 16.67; else if (k > 0) updBattle(Math.min(2, delta / 16.67) * k); }   // zastavenie obrazu pri ťažkom údere; 3D: spomalenie, fotorežim   // 3D: spomalenie pri páde bossa, fotorežim zastaví hru
        if (mode !== 'battle') { if (this.input.mouse && this.input.mouse.locked) this.input.mouse.releasePointerLock(); this.scene.start('Map'); return; }
        if (this.d3) { if (!B3.look) this.repick(); B3.frame(Math.min(3, delta / 16.67)); return; }

        for (const u of U) {
            let o = this.units.get(u);
            if (!o) { this.addUnit(u); o = this.units.get(u); }
            if (u.fled) { if (!o.dead) { o.dead = true; o.spr.setVisible(false); if (o.flag) o.flag.setVisible(false); } continue; }   // utiekol z bojiska
            if (u.hp <= 0) {
                if (!o.dead) { o.dead = true; o.spr.play(o.key + ':death').setDepth(-4 + u.y / 1e4); this.markDeath(u); }
                continue;
            }
            const moving = o.px !== undefined && Math.abs(o.px - u.x) + Math.abs(o.py - u.y) > .05;
            o.px = u.x; o.py = u.y;
            if (u.c > o.lc + 5) { o.state = 'attack'; o.spr.play(o.key + ':attack'); }
            else if (o.state === 'attack' && !o.spr.anims.isPlaying) o.state = 'idle';
            if (o.state !== 'attack') {
                const want = moving ? 'walk' : 'idle';
                if (o.state !== want) { o.state = want; o.spr.play(o.key + ':' + want); }
            }
            o.lc = u.c;
            if (u.h && u.dis && !o.dis) { o.dis = 1; const m0 = G.eq.m; G.eq.m = 0; const key = Art.unit(this, u); G.eq.m = m0; o.key = key; o.spr.setTexture(key, 0); o.state = ''; }   // hrdina zosadol (padol mu kôň)
            if (u.boss && !o.bossInit) { o.bossInit = 1; if (u.boss === 'trollking') o.spr.setScale(o.spr.scaleX * 1.7); else o.spr.setVisible(false); }   // bossovia: kráľ trollov je veľký troll, ostatných kreslí drawBoss
            o.spr.setPosition(u.x, u.y).setRotation(u.f).setDepth(u.y);
            if (o.flag) o.flag.setPosition(u.x - Math.cos(u.f) * u.r * .8, u.y - Math.sin(u.f) * u.r * .8 - u.r * 2.4).setDepth(u.y + .5);
        }
        for (const [u, o] of this.units) if (o.flag && u.hp <= 0) { o.flag.destroy(); o.flag = null; }
        if (this.water) this.water.tilePositionY -= delta * .02;
        const vw = W / BZ / 2, vh = H / BZ / 2, h = U[0];
        this.cameras.main.centerOn(Math.max(vw, Math.min(BW - vw, h.x)), Math.max(vh, Math.min(BH - vh, h.y)));
        this.drawAura();
        this.drawNight();
        this.drawFx();
    }

    /** Noc: bojisko stmavne, každý piaty vojak nesie fakľu, ktorá bliká a osvetľuje okolie. */
    drawNight() {
        if (!this.night) return;
        const n = this.night, t = this.torch;
        n.clear().fillStyle(0x060a1c, .55).fillRect(0, 0, BW, BH);
        t.clear();
        for (let i = 0; i < U.length; i++) {
            const u = U[i];
            if (u.hp <= 0 || (i % 5 && !u.h)) continue;
            const fl = .85 + .15 * Math.sin(tm / 3 + i * 1.7), R = (u.h ? 64 : 44) * fl;
            for (let k = 5; k >= 1; k--) t.fillStyle(k > 3 ? 0xff8a20 : 0xffc060, .035 + (5 - k) * .012).fillCircle(u.x, u.y, R * k / 5);   // mäkký prechod svetla
            t.fillStyle(0xfff0b0, .9).fillCircle(u.x - Math.sin(u.f) * 6, u.y + Math.cos(u.f) * 6 - 4, 1.8);
        }
        if (WX.n === 'storm' && Math.floor(tm) % 160 < 3) n.fillStyle(0xffffff, .35).fillRect(0, 0, BW, BH);
    }

    /** Stopa po padlom vojakovi: kaluž krvi (u orkov tmavá) a padlá zbraň. Šípy, ktoré minuli, sa zapichnú do zeme (viď update). */
    markDeath(u) {
        if (this.markN++ > 400) return;
        const g = this.marks, orc = u.t && bloc(u.fc), col = orc ? 0x2a1a14 : 0x7a1a12;
        if (OPT.blood) for (let k = 0; k < 4; k++) g.fillStyle(col, .35 + k * .08).fillEllipse(u.x + (Math.random() - .5) * 14, u.y + (Math.random() - .5) * 10, 12 - k * 2, 8 - k * 1.5);
        const a = Math.random() * 6.3; g.lineStyle(1.5, 0x9aa0a8, .9).lineBetween(u.x + Math.cos(a) * 4, u.y + Math.sin(a) * 4, u.x + Math.cos(a) * 14, u.y + Math.sin(a) * 14);
        g.lineStyle(2, 0x3a2a1a, .9).lineBetween(u.x + Math.cos(a) * 1, u.y + Math.sin(a) * 1, u.x + Math.cos(a) * 4, u.y + Math.sin(a) * 4);
    }
    markArrow(a) {
        if (this.markN++ > 400) return;
        const g = this.marks, an = Math.atan2(a.vy, a.vx);
        g.lineStyle(1.2, 0xd8c8a0, .9).lineBetween(a.x, a.y, a.x - Math.cos(an) * 7, a.y - Math.sin(an) * 7 - 2);
        g.fillStyle(0xffffff, .8).fillRect(a.x - Math.cos(an) * 7 - 1, a.y - Math.sin(an) * 7 - 3, 2, 2);
    }

    /** Žiarivá aura okolo hrdinu: pomaly sa otáčajúce zlaté lúče a pulzujúci kruh svetla. */
    drawAura() {
        const g = this.aura, h = U[0];
        if (!g) return;
        g.clear();
        if (h.hp <= 0) return;
        g.setDepth(h.y - 1);
        const t = tm / 30, p = .5 + .5 * Math.sin(tm / 9);
        g.fillStyle(0xfff0c0, .08 + .05 * p).fillCircle(h.x, h.y, 30 + 3 * p);
        g.fillStyle(0xffffff, .1 + .06 * p).fillCircle(h.x, h.y, 17);
        for (let k = 0; k < 16; k++) {
            const a = k * Math.PI / 8 + t, len = k % 2 ? 26 + 4 * p : 38 + 6 * p, sw = k % 2 ? .05 : .08;
            g.fillStyle(k % 2 ? 0xffe8a0 : 0xffffff, .16 + .1 * p);
            g.fillTriangle(h.x + Math.cos(a - sw) * 12, h.y + Math.sin(a - sw) * 12, h.x + Math.cos(a) * len, h.y + Math.sin(a) * len, h.x + Math.cos(a + sw) * 12, h.y + Math.sin(a + sw) * 12);
        }
        g.lineStyle(1.5, 0xffe8a0, .35 + .2 * p).strokeCircle(h.x, h.y, 22 + 2 * Math.sin(tm / 7));
    }

    /** Bossovia: ohlásený útok (červená plocha, ktorá sa plní), Balrog, drak a okrídlená šelma kreslené tvarmi. */
    drawBoss(g, u) {
        const A = u.atk;
        if (A) {
            const p = 1 - A.t / A.t0, col = A.fire ? 0xff5a10 : 0xd02010, al = .1 + .25 * p;
            g.fillStyle(col, al); g.lineStyle(2, col, .5 + .4 * p);
            if (A.k === 'circle') { g.fillCircle(A.x, A.y, A.r).strokeCircle(A.x, A.y, A.r); g.fillStyle(col, .25).fillCircle(A.x, A.y, A.r * p); }
            else if (A.k === 'cone') { g.slice(A.x, A.y, A.len, A.a - A.w, A.a + A.w).fillPath(); g.slice(A.x, A.y, A.len, A.a - A.w, A.a + A.w).strokePath(); g.fillStyle(col, .25).slice(A.x, A.y, A.len * p, A.a - A.w, A.a + A.w).fillPath(); }
            else { const a = Math.atan2(A.y2 - A.y, A.x2 - A.x), nx = -Math.sin(a) * A.w, ny = Math.cos(a) * A.w; g.fillPoints([{ x: A.x + nx, y: A.y + ny }, { x: A.x2 + nx, y: A.y2 + ny }, { x: A.x2 - nx, y: A.y2 - ny }, { x: A.x - nx, y: A.y - ny }], true); }
        }
        if (u.boss === 'trollking') { g.fillStyle(0xd9a441, 1).fillTriangle(u.x - 9, u.y - 30, u.x - 6, u.y - 40, u.x - 3, u.y - 30).fillTriangle(u.x - 3, u.y - 30, u.x, u.y - 43, u.x + 3, u.y - 30).fillTriangle(u.x + 3, u.y - 30, u.x + 6, u.y - 40, u.x + 9, u.y - 30).fillRect(u.x - 9, u.y - 31, 18, 3); return; }
        const t = tm, f = u.f, c = Math.cos(f), s = Math.sin(f), P = (dx, dy) => ({ x: u.x + c * dx - s * dy, y: u.y + s * dx + c * dy });   // body v smere pohľadu
        const air = u.fly > 0 ? 50 + Math.sin(t / 6) * 6 : u.boss === 'fell' ? 26 : 0;
        g.fillStyle(0x000000, air ? .25 : .35).fillEllipse(u.x, u.y + 6, u.r * (air ? 3.4 : 2.4), u.r * (air ? 1.4 : 1));   // tieň na zemi
        const yo = -air, flap = Math.sin(t / (u.boss === 'fell' ? 4 : 7)) * .35;
        const wing = (side, len, col) => { const a = P(-4, 0), b = P(-u.r * .4 + Math.cos(flap) * 4, side * len), d = P(-u.r * 1.1, side * len * .7); g.fillStyle(col, .95).fillTriangle(a.x, a.y + yo, b.x, b.y + yo + side * flap * 10, d.x, d.y + yo); g.lineStyle(1.2, 0x000000, .5).lineBetween(a.x, a.y + yo, b.x, b.y + yo + side * flap * 10); };
        if (u.boss === 'balrog') {
            for (let k = 4; k >= 1; k--) g.fillStyle(k % 2 ? 0xff6a10 : 0xffa030, .07 + .03 * Math.sin(t / 3 + k)).fillCircle(u.x, u.y, u.r * (1 + k * .35));   // plamenná aura
            wing(-1, u.r * 2.2, 0x1a0c08); wing(1, u.r * 2.2, 0x1a0c08);
            const h = P(u.r * .55, 0); g.fillStyle(0x24120a, 1).fillEllipse(u.x, u.y, u.r * 1.5, u.r * 1.25); g.fillStyle(0x2e160c, 1).fillCircle(h.x, h.y, u.r * .5);
            for (const sd of [-1, 1]) { const b = P(u.r * .7, sd * u.r * .45), e = P(u.r * .95, sd * u.r * .75); g.lineStyle(3, 0x0a0604, 1).lineBetween(b.x, b.y, e.x, e.y); }   // rohy
            for (const sd of [-1, 1]) { const e = P(u.r * .8, sd * u.r * .18); g.fillStyle(0xffd040, .95).fillCircle(e.x, e.y, 2.2); }
            for (let k = 0; k < 6; k++) { const a = t / 4 + k, r = u.r * (.7 + (k % 3) * .2); g.fillStyle(0xffb040, .6).fillTriangle(u.x + Math.cos(a) * r - 3, u.y + Math.sin(a) * r, u.x + Math.cos(a) * r, u.y + Math.sin(a) * r - 9 - (k % 2) * 5, u.x + Math.cos(a) * r + 3, u.y + Math.sin(a) * r); }
            if (A && A.k === 'cone') { const w = P(A.len * (1 - A.t / A.t0), Math.sin(t / 2) * 10); g.lineStyle(3, 0xff8a20, .9).lineBetween(P(u.r * .4, u.r * .6).x, P(u.r * .4, u.r * .6).y, w.x, w.y); }   // ohnivý bič
        } else if (u.boss === 'dragon') {
            const col = 0x5a1e14, bel = 0x9a5a2a;
            for (let k = 0; k < 5; k++) { const q = P(-u.r * (1 + k * .45), Math.sin(t / 8 + k) * 6); g.fillStyle(col, 1).fillCircle(q.x, q.y + yo, u.r * (.45 - k * .07)); }   // chvost
            wing(-1, u.r * 2.6, 0x3a120c); wing(1, u.r * 2.6, 0x3a120c);
            g.fillStyle(col, 1).fillEllipse(u.x, u.y + yo, u.r * 1.9, u.r * 1.1); g.fillStyle(bel, .8).fillEllipse(u.x, u.y + yo + 3, u.r * 1.2, u.r * .5);
            const n = P(u.r * 1.1, 0), hd = P(u.r * 1.6, 0); g.fillStyle(col, 1).fillCircle(n.x, n.y + yo, u.r * .38).fillEllipse(hd.x, hd.y + yo, u.r * .9, u.r * .55);
            for (const sd of [-1, 1]) { const e = P(u.r * 1.75, sd * u.r * .14); g.fillStyle(0xffe040, 1).fillCircle(e.x, e.y + yo, 2); }
            if (A && A.k === 'cone' && A.t < 14) for (let k = 0; k < 14; k++) { const d = A.len * k / 14, q = P(u.r * 1.8 + d, (Math.random() - .5) * d * .55); g.fillStyle(k % 2 ? 0xffa020 : 0xff5010, .7).fillCircle(q.x, q.y, 4 + d * .05); }   // oheň z tlamy
        } else if (u.boss === 'fell') {
            wing(-1, u.r * 2.8, 0x14141a); wing(1, u.r * 2.8, 0x14141a);
            g.fillStyle(0x1a1a20, 1).fillEllipse(u.x, u.y + yo, u.r * 1.6, u.r * .8);
            const hd = P(u.r * 1.1, 0); g.fillStyle(0x24242a, 1).fillEllipse(hd.x, hd.y + yo, u.r * .7, u.r * .4);
            g.fillStyle(0x050508, 1).fillCircle(u.x, u.y + yo - 8, 5); g.fillStyle(0x0a0a10, 1).fillTriangle(u.x - 5, u.y + yo - 8, u.x, u.y + yo - 20, u.x + 5, u.y + yo - 8);   // jazdec v kapucni
            g.fillStyle(0xff3020, .8).fillCircle(u.x + 1, u.y + yo - 9, 1.2);
        }
    }

    /** Nový boj: oblúk sekania a bodnutia, nápor, kryt, varovanie pred úderom nepriateľa, veliteľ, utekajúci a zapotácaní. */
    drawCombat(g) {
        const h = U[0], C = CMB, sw = C.swing;
        if (sw && h.hp > 0) {
            const k = sw.t / 10;
            if (sw.k === 's') {   // sek: zlatý oblúk pred hrdinom
                g.fillStyle(0xfff0c0, .16 * k).slice(h.x, h.y, sw.r, sw.a - (sw.w || 1.05), sw.a + (sw.w || 1.05)).fillPath();
                g.lineStyle(3, 0xfff4d0, .85 * k).beginPath().arc(h.x, h.y, sw.r * (.85 + .15 * (1 - k)), sw.a - (sw.w || 1.05) + (1 - k) * .4, sw.a + (sw.w || 1.05) - (1 - k) * .4).strokePath();
            } else if (sw.k === 't') {   // bod: úzky klin
                g.fillStyle(0xfff0c0, .3 * k).fillTriangle(h.x + Math.cos(sw.a + .35) * 10, h.y + Math.sin(sw.a + .35) * 10, h.x + Math.cos(sw.a) * sw.r, h.y + Math.sin(sw.a) * sw.r, h.x + Math.cos(sw.a - .35) * 10, h.y + Math.sin(sw.a - .35) * 10);
            } else {   // nápor: náraz
                g.lineStyle(4, 0xffd080, .8 * k).strokeCircle(h.x + Math.cos(sw.a) * 14, h.y + Math.sin(sw.a) * 14, sw.r * (1.3 - k * .5));
            }
        } else if (fx > 0 && !C.km) g.lineStyle(3, 0xecdfc6, fx / 10).strokeCircle(h.x, h.y, it('w').r || 34);   // dotykové ovládanie: kruh úderu
        if (h.hp > 0 && C.charging) for (let k = 0; k < 5; k++) { const a = (C.lastA || h.f) + Math.PI + (k - 2) * .18, l = 18 + (k % 2) * 10; g.lineStyle(1.5, 0xfff0c0, .5).lineBetween(h.x + Math.cos(a) * 12, h.y + Math.sin(a) * 12, h.x + Math.cos(a) * (12 + l), h.y + Math.sin(a) * (12 + l)); }   // čiary rýchlosti
        if (h.hp > 0 && C.blk) {   // kryt: štít alebo zbraň pred hrdinom
            const arc = C.shp > 0 ? (perk('stit') ? 1.7 : 1.4) : .85;
            g.lineStyle(C.shp > 0 ? 4 : 2.5, C.shp > 0 ? 0xc8d8ff : 0xffffff, .75).beginPath().arc(h.x, h.y, h.r + 8, h.f - arc, h.f + arc).strokePath();
        }
        if ((C.mkT > 0 || C.place) && typeof grpOf === 'function') {   // vybraná skupina, jej miesta v útvare a náhľad pri rozkaze na miesto
            const gs = C.sel === 'all' ? ['p', 'l', 'j'] : [C.sel], GC = { p: 0x80c0ff, l: 0xa0e080, j: 0xffb060 };
            for (const u of U) if (!u.t && !u.h && !u.ally && u.hp > 0 && !u.rout && gs.includes(grpOf(u))) { g.lineStyle(1.5, GC[grpOf(u)], .8).strokeCircle(u.x, u.y, u.r + 2); if (u.hx != null && !C.prev) g.fillStyle(GC[grpOf(u)], .7).fillRect(u.hx - 2, u.hy - 2, 4, 4); }
            if (C.prev) for (const S of C.prev) g.fillStyle(0xffffff, .85).fillRect(S.x - 2.5, S.y - 2.5, 5, 5);
        }
        if (C.aim) { const A = C.aim; g.lineStyle(1.5, 0xffe8a0, .8).strokeCircle(A.x, A.y, A.r); g.lineBetween(A.x - A.r - 4, A.y, A.x - A.r + 3, A.y).lineBetween(A.x + A.r - 3, A.y, A.x + A.r + 4, A.y).lineBetween(A.x, A.y - A.r - 4, A.x, A.y - A.r + 3).lineBetween(A.x, A.y + A.r - 3, A.x, A.y + A.r + 4); }   // zameriavač luku
        for (const u of U) if (u.boss && u.hp > 0) this.drawBoss(g, u);
        for (const u of U) {
            if (u.hp <= 0) continue;
            if (u.wu > 0 && u.wu0 && (u.t || u.wt === h) && Math.hypot(u.x - h.x, u.y - h.y) < 240) {   // nápriah: červený oblúk rastie do úderu
                const p = 1 - u.wu / u.wu0, me = u.wt === h;
                g.lineStyle(me ? 3 : 2, me ? 0xff3020 : 0xff7050, (me ? .45 : .25) + .5 * p).beginPath().arc(u.x, u.y, u.r + 6 + p * 5, u.f - .7, u.f + .7).strokePath();
            }
            if (u.cmd) g.lineStyle(1.5, 0xffd24a, .85).strokeEllipse(u.x, u.y + u.r * .5, u.r * 2.6, u.r * 1.1);   // veliteľ
            if (u.rout) { g.lineStyle(1, 0x3a2a1a, 1).lineBetween(u.x, u.y - u.r * 1.6, u.x, u.y - u.r * 3.2); g.fillStyle(0xf4f0e0, .95).fillTriangle(u.x, u.y - u.r * 3.2, u.x + 7, u.y - u.r * 2.9, u.x, u.y - u.r * 2.6); }   // utekajúci: biela zástavka
            if (u.stun > 0) for (let k = 0; k < 3; k++) { const a = tm / 6 + k * 2.1; g.fillStyle(0xffe680, .9).fillCircle(u.x + Math.cos(a) * 7, u.y - u.r * 2 + Math.sin(a) * 2.5, 1.4); }   // zapotácaný
        }
    }

    drawFx() {
        const g = this.fx; g.clear();
        for (const [u, o] of this.units) if (o.flag) g.lineStyle(1.5, 0x3a2a1a, 1).lineBetween(o.flag.x, o.flag.y, o.flag.x, o.flag.y + u.r * 2.6);
        for (const u of U) if (u.hp > 0 && !u.h && !u.boss && u.hp < u.mh) {
            g.fillStyle(0x000000, 1).fillRect(u.x - 7, u.y - u.r - 6, 14, 3);
            g.fillStyle(u.t ? 0xc0392b : 0x6fbf5a, 1).fillRect(u.x - 7, u.y - u.r - 6, 14 * u.hp / u.mh, 3);
        }
        for (const a of AR) g.lineStyle(2.2, 0xe8d8b0, .18).lineBetween(a.x, a.y, a.x - a.vx * 7, a.y - a.vy * 7);   // stopa šípu
        if (SGB && WX.night) for (const a of AR) { g.fillStyle(0xff8a20, .25).fillCircle(a.x, a.y, 6); g.fillStyle(0xffe08a, .95).fillCircle(a.x, a.y, 1.6); g.lineStyle(2, 0xff6a10, .5).lineBetween(a.x, a.y, a.x - a.vx * 4, a.y - a.vy * 4); }   // horiace šípy pri nočnom obliehaní
        g.lineStyle(1.6, 0xe8d8b0, 1);
        for (const a of AR) if (a.jav || a.bolt) g.lineStyle(a.jav ? 2.6 : 2, a.jav ? 0x8a6238 : 0x5a4a3a, 1).lineBetween(a.x, a.y, a.x - a.vx * (a.jav ? 4.5 : 2), a.y - a.vy * (a.jav ? 4.5 : 2));   // oštep, šíp z kuše
        g.lineStyle(1.6, 0xe8d8b0, 1);
        for (const a of AR) { if (a.jav || a.bolt) continue; g.lineBetween(a.x, a.y, a.x - a.vx * 3, a.y - a.vy * 3); if (a.l <= 1 && !a.mk) { a.mk = 1; this.markArrow(a); } }
        for (const p of PT) if (p.ring) { const k = p.l / 22; g.lineStyle(2, hex(p.c), Math.min(1, k * 1.6)).strokeCircle(p.x, p.y, (p.rr || 10) * (1.25 - k * .6)); }   // záblesk krytu, pokrik
        for (const p of PT) { if (p.ring) continue; const a = Math.max(0, p.l / 18); if (p.sp) { g.lineStyle(1.2, 0xfff0b0, Math.min(1, a)).lineBetween(p.x, p.y, p.x - p.vx * 1.5, p.y - p.vy * 1.5); g.fillStyle(0xffffff, Math.min(1, a)).fillRect(p.x - .7, p.y - .7, 1.4, 1.4); continue; } if (p.bl) { g.fillStyle(hex(p.c), Math.min(.7, a * .7)).fillCircle(p.x, p.y, 1.6 + (30 - p.l) * .06); continue; } g.fillStyle(hex(p.c), a).fillRect(p.x, p.y, 3, 3); if (p.l > 14) g.fillStyle(0xfff0c0, a * .9).fillRect(p.x - 1, p.y - 1, 2, 2); }   // iskra pri zásahu
        // prach za jazdou a veľkými tvormi: obláčiky za kopytami, ktoré sa rozplývajú
        this.dust = this.dust || [];
        if (!lowFx()) for (const u of U) if (u.hp > 0 && (u.k === 'c' || u.k === 'r' || u.k === 'x' || u.k === 't' || u.k === 'n' || (u.h && G.eq.m) || u.uk === 'uI2' || u.uk === 'uN2' || u.uk === 'uG3')) { const o = this.units.get(u); if (o && o.state === 'walk' && Math.random() < (u.k === 'x' ? .5 : .25)) this.dust.push({ x: u.x - Math.cos(u.f) * u.r * .8 + (Math.random() - .5) * 6, y: u.y - Math.sin(u.f) * u.r * .8 + 4, l: 1, r: 3 + Math.random() * 3 }); }
        const dc = BI === 's' ? 0xffffff : BI === 'a' ? 0x6a5a52 : BI === 'd' ? 0xe0c890 : 0xc8b48c;
        for (const d of this.dust) { d.l -= .025; d.y -= .15; d.r += .18; g.fillStyle(dc, Math.max(0, d.l) * .28).fillCircle(d.x, d.y, d.r); }
        this.dust = this.dust.filter(d => d.l > 0);
        if (typeof SHAKE !== 'undefined' && SHAKE > 0 && !this.shaking) { this.shaking = 1; this.cameras.main.shake(140, .0022 * SHAKE, false, () => { this.shaking = 0; }); }
        this.drawCombat(g);
        if (SGB) {
            const tt = U[0].tt || 0, pl = Math.min(1, tt / 160), pt = Math.min(1, tt / 320);   // rebríky sa dvíhajú, veža sa prisúva
            if (SGB.lad) for (const [li, l] of [250, 710].entries()) {
                if ((SGB.ladOff || [])[li] > 0) { const a = .5; g.lineStyle(3, 0x7a5a30, 1).lineBetween(940, l - 10, 985 - Math.cos(a) * 10, l - 10 - 18).lineBetween(940, l + 10, 985 - Math.cos(a) * 10, l + 10 - 18); g.lineStyle(2, 0x7a5a30, 1); for (let k = 0; k < 5; k++) { const x = 945 + k * 9, y = -k * 3.5; g.lineBetween(x, l - 10 + y, x, l + 10 + y); } continue; }   // zhodený rebrík leží v priekope
                const x1 = 985 + 60 * pl;
                g.fillStyle(0x000000, .25).fillRect(985, l + 11, x1 - 985, 4);
                g.lineStyle(3, 0x7a5a30, 1); g.lineBetween(985, l - 10, x1, l - 10); g.lineBetween(985, l + 10, x1, l + 10);
                g.lineStyle(2, 0x7a5a30, 1); for (let k = 990; k < x1; k += 9) g.lineBetween(k, l - 10, k, l + 10);
                if (pl < 1) g.lineStyle(1.5, 0x3a2a1a, .8).lineBetween(x1, l - 10, x1 - 20, l - 26).lineBetween(x1, l + 10, x1 - 20, l + 26);   // laná, ktorými ich dvíhajú
            }
            const ox = -(1 - pt) * 150;
            if (SGB.tow) {   // obliehacia veža pri hradbách: drevená konštrukcia s mostíkom
                g.fillStyle(0x000000, .25).fillEllipse(960 + ox, 652, 90, 20);
                g.fillStyle(0x6b4a2e, 1).fillRect(925 + ox, 560, 70, 92); g.fillStyle(0x4a3220, 1).fillRect(925 + ox, 560, 12, 92).fillRect(983 + ox, 560, 12, 92);
                g.lineStyle(2, 0x3a2a1a, 1); for (let k = 572; k < 650; k += 16) g.lineBetween(925 + ox, k, 995, k); g.lineBetween(925 + ox, 560, 995, 652); g.lineBetween(995, 560, 925, 652);
                if (pt >= 1) { g.fillStyle(0x8a6a3a, 1).fillRect(990, 590, 56, 40); g.lineStyle(1.5, 0x4a3220, 1); for (let k = 996; k < 1046; k += 8) g.lineBetween(k, 590, k, 630); }   // mostík až pri hradbách
                g.fillStyle(0x3a2a1a, 1).fillCircle(935 + ox, 652, 8).fillCircle(985 + ox, 652, 8);
            }
            if (SGB.gate > 0) {
                g.fillStyle(0x5a3a1a, 1).fillRect(1004, 437, 32, 86);
                g.lineStyle(2, 0x2a1a0a, 1); for (let k = 445; k < 520; k += 12) g.lineBetween(1004, k, 1036, k);
                g.fillStyle(0x9a9a9a, 1).fillRect(1004, 455, 32, 4).fillRect(1004, 500, 32, 4);
                if (SGB.ram) {
                    const o = Math.sin(tm / 6) * 6;
                    g.fillStyle(0x6b4a2e, 1).fillRect(930 + o, 470, 64, 20);
                    g.fillStyle(0x4a4a4a, 1).fillRect(988 + o, 472, 10, 16);
                    g.fillStyle(0x3a2a1a, 1).fillTriangle(920 + o, 470, 962 + o, 448, 1004 + o, 470);
                }
            }
        }
    }
}
