/*
 * ENGINE: bitka.
 * Boj, AI vojakov, šípy, rozkazy a obliehanie beží v js/sim cez updBattle(dt).
 * Scéna zobrazuje bojisko, vojakov ako sprity s rotáciou, mŕtvych,
 * šípy, lišty zdravia, obliehacie stroje a častice legendárnych zbraní.
 */
class BattleScene extends Phaser.Scene {
    constructor() { super('Battle'); }

    create() {
        // Bojisko (pri obliehaní s hradom) – kópia plátna simulácie
        const c = document.createElement('canvas');
        c.width = BW; c.height = BH;
        c.getContext('2d').drawImage(BG, 0, 0);
        if (this.textures.exists('battlebg')) this.textures.remove('battlebg');
        this.textures.addCanvas('battlebg', c);
        const bg = this.add.image(0, 0, 'battlebg').setOrigin(0).setDepth(-10);
        const tint = { a: 0x9a7a70, d: 0xf0d8a0, s: 0xe8eef8 }[BI];
        if (tint) bg.setTint(tint);

        this.corpses = this.add.graphics().setDepth(-5);
        this.fx = this.add.graphics().setDepth(5000);
        this.units = new Map();
        for (const u of U) this.addUnit(u);

        // Legendárna zbraň hrdinu: častice ohňa alebo trblietok
        const w = it('w');
        if (w.fx) {
            const fire = w.fx === 'fire';
            this.trail = this.add.particles(0, 0, 'spark', {
                speed: { min: 8, max: fire ? 45 : 25 }, angle: fire ? { min: 240, max: 300 } : { min: 0, max: 360 },
                lifespan: fire ? 450 : 600, scale: { start: fire ? .9 : .6, end: 0 }, alpha: { start: .9, end: 0 },
                tint: fire ? [0xffe080, 0xff8a20, 0xff3a10] : [0xc8e6ff, 0xffffff, 0x9fd0ff],
                blendMode: 'ADD', frequency: fire ? 18 : 45
            }).setDepth(4999);
            this.trail.startFollow(this.units.get(U[0]).spr, 14, 0);
        }

        this.cameras.main.setBounds(0, 0, BW, BH).setBackgroundColor('#22301a');
        const set = p => { ptr.x = p.x; ptr.y = p.y; };
        this.input.on('pointerdown', p => { set(p); ptr.down = true; });
        this.input.on('pointermove', set);
        this.input.on('pointerup', () => ptr.down = false);
        this.events.once('shutdown', () => { this.input.removeAllListeners(); ptr.down = false; });
    }

    addUnit(u) {
        const spr = this.add.image(u.x, u.y, Bake.unit(this, u));
        this.units.set(u, { spr, dead: false });
    }

    update(time, delta) {
        const dt = Math.min(2, delta / 16.67);
        if (mode === 'battle') updBattle(dt);
        if (mode !== 'battle') { this.scene.start('Map'); return; }

        for (const u of U) {
            let o = this.units.get(u);
            if (!o) { this.addUnit(u); o = this.units.get(u); }
            if (u.hp <= 0) {
                if (!o.dead) {
                    o.dead = true;
                    this.corpses.fillStyle(0x6e1212, .35).fillEllipse(u.x, u.y, u.r * 3.6, u.r * 2.2);
                    o.spr.setTint(0x5a5a5a).setAlpha(.75).setDepth(-4).setRotation(u.f + 1.3).setScale(.9);
                }
                continue;
            }
            const moving = o.px !== undefined && Math.abs(o.px - u.x) + Math.abs(o.py - u.y) > .05;
            o.px = u.x; o.py = u.y;
            const lunge = u.c > (u.h ? 14 : 35) ? 3 : 0;
            o.spr.setPosition(u.x + Math.cos(u.f) * lunge, u.y + Math.sin(u.f) * lunge + (moving ? Math.sin(tm * .5 + u.x) * 1.4 : 0))
                .setRotation(u.f).setDepth(u.y);
        }
        this.cameras.main.setScroll(bc.x, bc.y);
        this.drawFx();
    }

    drawFx() {
        const g = this.fx; g.clear();
        // Lišty zdravia
        for (const u of U) if (u.hp > 0 && !u.h && u.hp < u.mh) {
            g.fillStyle(0x000000, 1).fillRect(u.x - 7, u.y - u.r - 6, 14, 3);
            g.fillStyle(u.t ? 0xc0392b : 0x6fbf5a, 1).fillRect(u.x - 7, u.y - u.r - 6, 14 * u.hp / u.mh, 3);
        }
        // Šípy a iskry zásahov
        g.lineStyle(1.6, 0xe8d8b0, 1);
        for (const a of AR) g.lineBetween(a.x, a.y, a.x - a.vx * 3, a.y - a.vy * 3);
        for (const p of PT) g.fillStyle(hex(p.c), p.l / 18).fillRect(p.x, p.y, 3, 3);
        // Švih zbrane hrdinu
        if (fx > 0) g.lineStyle(3, 0xecdfc6, fx / 10).strokeCircle(U[0].x, U[0].y, it('w').r || 34);
        // Obliehanie: rebríky, brána, baranidlo
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
