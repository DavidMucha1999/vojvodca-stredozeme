/*
 * ENGINE: bitka.
 * Boj, AI vojakov, šípy, rozkazy a obliehanie beží v js/sim cez updBattle(dt).
 * Scéna zobrazuje bojisko a animovaných vojakov (státie, chôdza, útok, pád),
 * šípy, lišty zdravia, obliehacie stroje a častice legendárnych zbraní.
 */
/** Priblíženie kamery v bitke (1 = celé zorné pole simulácie 720×480). */
const BZ = 1.35;

class BattleScene extends Phaser.Scene {
    constructor() { super('Battle'); }

    create() {
        if (this.textures.exists('ground_g')) this.buildField();
        else {
            const c = document.createElement('canvas');
            c.width = BW; c.height = BH;
            c.getContext('2d').drawImage(BG, 0, 0);
            if (this.textures.exists('battlebg')) this.textures.remove('battlebg');
            this.textures.addCanvas('battlebg', c);
            const bg = this.add.image(0, 0, 'battlebg').setOrigin(0).setDepth(-10);
            const tint = { a: 0x9a7a70, d: 0xf0d8a0, s: 0xe8eef8 }[BI];
            if (tint) bg.setTint(tint);
        }

        this.fx = this.add.graphics().setDepth(5000);
        this.units = new Map();
        for (const u of U) this.addUnit(u);

        const w = it('w');
        if (w.fx) {
            const fire = w.fx === 'fire', dark = w.fx === 'dark', light = w.fx === 'light';
            this.trail = this.add.particles(0, 0, Art.spark(this), {
                speed: { min: 6, max: fire ? 30 : 18 }, angle: fire || dark ? { min: 240, max: 300 } : { min: 0, max: 360 },
                lifespan: fire ? 380 : dark ? 700 : 520, scale: { start: fire ? .32 : dark ? .36 : .26, end: dark ? .1 : 0 }, alpha: { start: fire ? .75 : dark ? .6 : .65, end: 0 },
                tint: fire ? [0xffd060, 0xff7a18, 0xff4010] : dark ? [0x2a1030, 0x4a1a5a, 0x7a2aa0] : light ? [0xfff4c0, 0xffffff, 0xffe080] : [0xc8e6ff, 0xffffff, 0x9fd0ff],
                blendMode: dark ? 'NORMAL' : 'ADD', frequency: fire ? 28 : dark ? 40 : 55
            }).setDepth(4999);
            this.trail.startFollow(this.units.get(U[0]).spr, 0, 0);
        }

        this.cameras.main.setBounds(0, 0, BW, BH).setZoom(RES * BZ).setBackgroundColor('#22301a');
        // simulácia počíta cieľ ako ptr + bc, preto ukladáme bod na bojisku mínus bc
        const set = p => { const w = this.cameras.main.getWorldPoint(p.x, p.y); ptr.x = w.x - bc.x; ptr.y = w.y - bc.y; };
        this.input.on('pointerdown', p => { set(p); ptr.down = true; });
        this.input.on('pointermove', set);
        this.input.on('pointerup', () => ptr.down = false);
        this.events.once('shutdown', () => { this.input.removeAllListeners(); ptr.down = false; });
    }

    addUnit(u) {
        const key = Art.unit(this, u);
        const spr = Art.image(this, u.x, u.y, key, 0, true);
        const o = { spr, key, dead: false, lc: u.c, state: 'idle' };
        if (u.bn && Art.img['unit_' + Art.unitArt(u)]) {           // nové sprity nemajú zástavu: pridáme ju
            const f = u.t ? u.fc : G.fac;
            const bk = Art.banner(this, f);
            o.flag = Art.image(this, u.x, u.y, bk).setScale((Art.scale[bk] || 1 / RES) * .6);
        }
        this.units.set(u, o);
    }

    /** Bojisko z textúr: zem podľa krajiny, rieka s brodom, stromy, skaly a pri obliehaní hrad. */
    buildField() {
        const b = { g: 'g', a: 'a', d: 'd', s: 's' }[BI] || 'g';
        this.add.tileSprite(0, 0, BW, BH, 'ground_' + b).setOrigin(0).setTileScale(.5).setDepth(-10);
        const bank = this.add.graphics().setDepth(-9);
        bank.fillStyle(0x2a3a22, .55).fillRect(684, 0, 72, BH);
        this.water = this.add.tileSprite(690, 0, 60, BH, 'water').setOrigin(0).setTileScale(.5).setDepth(-9);
        bank.fillStyle(0x9a8558, 1).fillRect(686, 440, 68, 80).fillStyle(0x000000, .12).fillRect(686, 440, 68, 4).fillRect(686, 516, 68, 4);
        let seed = 7 + BW;
        const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
        const tree = b === 'a' ? ['deadtree'] : b === 'd' ? [] : ['tree_0', 'tree_1', 'tree_2'];
        const place = (x, y) => {
            if (x > 660 && x < 780) return;
            if (SGB && x > 960) return;
            if (!tree.length) { this.add.image(x, y, 'rock').setScale(.5).setDepth(y); return; }
            this.add.image(x, y, tree[Math.floor(rnd() * tree.length)]).setOrigin(.25, .45).setScale(.5 * (.8 + rnd() * .5)).setDepth(y);
        };
        for (let i = 0; i < 5; i++) { const cx = 200 + rnd() * 1000, cy = 100 + rnd() * 760; for (let j = 0; j < 12; j++) place(cx + rnd() * 90 - 45, cy + rnd() * 70 - 35); }
        for (let i = 0; i < 40; i++) { place(rnd() * BW, 30 + rnd() * 40); place(rnd() * BW, BH - 6 - rnd() * 30); }
        for (let i = 0; i < 24; i++) { place(10 + rnd() * 40, rnd() * BH); if (!SGB) place(BW - 10 - rnd() * 40, rnd() * BH); }
        for (let i = 0; i < 26; i++) { const x = rnd() * BW, y = rnd() * BH; if ((x < 660 || x > 780) && !(SGB && x > 960)) this.add.image(x, y, 'rock').setScale(.25 + rnd() * .2).setDepth(-5); }
        if (SGB) {
            this.add.tileSprite(1040, 0, BW - 1040, BH, 'cobble').setOrigin(0).setTileScale(.5).setDepth(-8);
            this.add.tileSprite(1000, 0, 40, BH, 'wall').setOrigin(0).setTileScale(.5).setDepth(-7);
            const w = this.add.graphics().setDepth(-6);
            w.fillStyle(0xa49e90, 1); for (let y = 0; y < BH; y += 20) w.fillRect(994, y, 10, 12);
            w.fillStyle(0x000000, .3).fillRect(1036, 0, 6, BH);
            w.fillStyle(0x2a2018, 1).fillRect(1000, 435, 40, 90);
            for (const y of [150, 390, 570, 810]) this.add.image(982, y - 41, 'tower').setOrigin(0).setScale(.5).setDepth(-6);
            this.add.image(1240, 300, 'keep').setOrigin(0).setScale(.5).setDepth(300 + 270);
        }
    }

    update(time, delta) {
        if (mode === 'battle') updBattle(Math.min(2, delta / 16.67));
        if (mode !== 'battle') { this.scene.start('Map'); return; }

        for (const u of U) {
            let o = this.units.get(u);
            if (!o) { this.addUnit(u); o = this.units.get(u); }
            if (u.hp <= 0) {
                if (!o.dead) { o.dead = true; o.spr.play(o.key + ':death').setDepth(-4 + u.y / 1e4); }
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
            o.spr.setPosition(u.x, u.y).setRotation(u.f).setDepth(u.y);
            if (o.flag) o.flag.setPosition(u.x - Math.cos(u.f) * u.r * .8, u.y - Math.sin(u.f) * u.r * .8 - u.r * 2.4).setDepth(u.y + .5);
        }
        for (const [u, o] of this.units) if (o.flag && u.hp <= 0) { o.flag.destroy(); o.flag = null; }
        if (this.water) this.water.tilePositionY -= delta * .02;
        const vw = W / BZ / 2, vh = H / BZ / 2, h = U[0];
        this.cameras.main.centerOn(Math.max(vw, Math.min(BW - vw, h.x)), Math.max(vh, Math.min(BH - vh, h.y)));
        this.drawFx();
    }

    drawFx() {
        const g = this.fx; g.clear();
        for (const [u, o] of this.units) if (o.flag) g.lineStyle(1.5, 0x3a2a1a, 1).lineBetween(o.flag.x, o.flag.y, o.flag.x, o.flag.y + u.r * 2.6);
        for (const u of U) if (u.hp > 0 && !u.h && u.hp < u.mh) {
            g.fillStyle(0x000000, 1).fillRect(u.x - 7, u.y - u.r - 6, 14, 3);
            g.fillStyle(u.t ? 0xc0392b : 0x6fbf5a, 1).fillRect(u.x - 7, u.y - u.r - 6, 14 * u.hp / u.mh, 3);
        }
        g.lineStyle(1.6, 0xe8d8b0, 1);
        for (const a of AR) g.lineBetween(a.x, a.y, a.x - a.vx * 3, a.y - a.vy * 3);
        for (const p of PT) g.fillStyle(hex(p.c), Math.max(0, p.l / 18)).fillRect(p.x, p.y, 3, 3);
        if (fx > 0) g.lineStyle(3, 0xecdfc6, fx / 10).strokeCircle(U[0].x, U[0].y, it('w').r || 34);
        if (SGB) {
            if (SGB.lad) for (const l of [250, 710]) {
                g.lineStyle(3, 0x7a5a30, 1); g.lineBetween(985, l - 10, 1045, l - 10); g.lineBetween(985, l + 10, 1045, l + 10);
                g.lineStyle(2, 0x7a5a30, 1); for (let k = 990; k < 1045; k += 9) g.lineBetween(k, l - 10, k, l + 10);
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
