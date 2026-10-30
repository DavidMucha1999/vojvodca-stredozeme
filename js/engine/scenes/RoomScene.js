/*
 * ENGINE: spoločný základ „miestností“, po ktorých chodí hráčova postava (krčma, nádvorie hradu, sieň hradu).
 * Dáva: hráčovu postavičku podľa výbavy a vzhľadu, chôdzu klikom na podlahu alebo šípkami/WASD,
 * postavy (person) a miesta (spot), ku ktorým hráč po kliknutí dôjde a potom sa spustí akcia,
 * oblohu v okne podľa dennej doby a počasia (drawSky), tlačidlo na odchod a klávesu Esc.
 * Potomok nastaví this.room = { mode, floorY, title, leave: 'text', spawn: [x, y] } a nakreslí miestnosť v create().
 */
class RoomScene extends Phaser.Scene {
    /** Spoločná príprava po nakreslení miestnosti: hráč, podlaha, klávesy, tlačidlo odchodu. */
    setupRoom(r) {
        this.room = r;
        this.people = this.people || [];
        this.add.text(W / 2, 72, r.title, txtStyle(17, '#f0d9a8', { fontFamily: TITLE_FONT, stroke: '#000', strokeThickness: 4 })).setOrigin(.5).setDepth(50);
        this.hint = this.add.text(W / 2, H - 14, r.hint || 'Klik na zem alebo šípky/WASD = chôdza  •  klik na postavu alebo miesto = akcia  •  Esc = odísť', txtStyle(10, '#d8c8a8', { stroke: '#000', strokeThickness: 3 })).setOrigin(.5).setDepth(50);
        const ui = this.scene.get('UI');
        this.leaveBtn = ui.button.call(this, W - 128, H - 34, 118, 24, r.leave, () => this.leave(), { size: 11, icon: Icons.tex(this, 'door') });
        this.leaveBtn.forEach(o => o.setDepth(51));
        const pk = Art.bigFigure(this, { ...G.eq, m: 0 }, { king: !!G.king, cape: heroSide() === 1 ? '#2a1414' : '#6a2a2a', ...Figures.lookOpts(Portraits.hero()) });
        const [sx, sy] = r.spawn || [W / 2, H - 40];
        this.pl = Art.image(this, sx, sy, pk).setDepth(sy);
        this.plT = null; this.plDo = null; this.plStep = 0;
        this.plLbl = this.add.text(sx, sy + 8, G.name, txtStyle(10, '#ffd24a', { stroke: '#000', strokeThickness: 3 })).setOrigin(.5, 0).setDepth(45);
        this.floor = this.add.rectangle(0, r.floorY, W, H - r.floorY, 0, 0).setOrigin(0).setInteractive().setDepth(-1);
        this.floor.on('pointerup', p => { if (ov.classList.contains('hide')) this.goTo(p.x / RES, p.y / RES, null); });
        this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,LEFT,DOWN,RIGHT');
        this.input.keyboard.on('keydown-ESC', () => { if (ov.classList.contains('hide')) this.leave(); });
        this.events.on('shutdown', () => this.input.keyboard.removeAllListeners());
        this.light = this.add.graphics().setDepth(40);
    }

    /** Postava, ku ktorej sa dá prísť a prihovoriť; sc = mierka. */
    person(x, y, [eq, o], name, onClick, sc = 1) {
        const key = Art.bigFigure(this, eq, o);
        const spr = Art.image(this, x, y, key).setScale((Art.scale[key] || 1 / RES) * sc).setDepth(y);
        spr.setInteractive({ useHandCursor: true });
        const ring = this.add.graphics().setDepth(y - 1).setVisible(false);
        ring.lineStyle(2, 0xffd24a, .9).strokeEllipse(x, y + 2, 44 * sc, 14 * sc);
        const lbl = this.add.text(x, y + 8, name, txtStyle(10, '#f4e8d0', { stroke: '#000', strokeThickness: 3 })).setOrigin(.5, 0).setDepth(45);
        spr.on('pointerover', () => ring.setVisible(true)); spr.on('pointerout', () => ring.setVisible(false));
        spr.on('pointerup', () => { if (!ov.classList.contains('hide')) return; this.goTo(x + (this.pl.x < x ? -46 : 46), y + 4, onClick); });
        this.people.push({ spr, ring, lbl, name, x, y, t0: Math.random() * 6 });
        return spr;
    }
    /** Miesto (dvere, stánok…): neviditeľná plocha w × h okolo (x, y) s popiskom; hráč k nemu dôjde a vykoná fn. */
    spot(x, y, w, h, name, fn, standY) {
        const z = this.add.rectangle(x, y, w, h, 0xffd24a, 0).setInteractive({ useHandCursor: true }).setDepth(44);
        const lbl = this.add.text(x, y + h / 2 + 2, name, txtStyle(10, '#ffe8b0', { stroke: '#000', strokeThickness: 3 })).setOrigin(.5, 0).setDepth(45);
        z.on('pointerover', () => { z.setFillStyle(0xffd24a, .12); }); z.on('pointerout', () => { z.setFillStyle(0xffd24a, 0); });
        z.on('pointerup', () => { if (!ov.classList.contains('hide')) return; this.goTo(x, standY ?? (y + h / 2 + 14), fn); });
        this.people.push({ spr: z, ring: this.add.graphics(), lbl, name, x, y: standY ?? y, t0: 0, spot: 1 });
        return z;
    }
    clearPeople() { this.people.forEach(p => { p.spr.destroy(); p.ring.destroy(); p.lbl.destroy(); }); this.people = []; }

    /** Hráč ide na miesto (x, y); po príchode zavolá fn. */
    goTo(x, y, fn) { const r = this.room; this.plT = { x: Math.max(24, Math.min(W - 24, x)), y: Math.max(r.floorY + 10, Math.min(H - 30, y)) }; this.plDo = fn; }
    movePlayer(dt = 1) {
        const pl = this.pl, k = this.keys, r = this.room, dlgOpen = !ov.classList.contains('hide');
        let dx = 0, dy = 0;
        if (!dlgOpen && k) { if (k.A.isDown || k.LEFT.isDown) dx -= 1; if (k.D.isDown || k.RIGHT.isDown) dx += 1; if (k.W.isDown || k.UP.isDown) dy -= 1; if (k.S.isDown || k.DOWN.isDown) dy += 1; }
        if (dx || dy) { this.plT = null; this.plDo = null; }
        else if (this.plT) { const ddx = this.plT.x - pl.x, ddy = this.plT.y - pl.y, d = Math.hypot(ddx, ddy); if (d < 2.5 * dt) { const fn = this.plDo; this.plT = null; this.plDo = null; if (fn) fn(); } else { dx = ddx / d; dy = ddy / d; } }
        if (dx || dy) {
            const sp = 2 * dt;
            pl.x = Math.max(24, Math.min(W - 24, pl.x + dx * sp)); pl.y = Math.max(r.floorY + 10, Math.min(H - 30, pl.y + dy * sp));
            if (r.block) for (const [bx, by, bw, bh] of r.block) if (pl.x > bx && pl.x < bx + bw && pl.y > by && pl.y < by + bh) { pl.x -= dx * sp; pl.y -= dy * sp; this.plT = null; }
            if (dx) pl.setFlipX(dx < 0);
            this.plStep += dt; pl.setFrame(1 + Math.floor(this.plStep / 5) % 4);
        } else pl.setFrame(0);
        pl.setDepth(pl.y); this.plLbl.setPosition(pl.x, pl.y + 8);
        this.people.forEach(p => { const near = Math.hypot(p.x - pl.x, p.y - pl.y) < 70; p.lbl.setColor(near ? '#ffd24a' : p.spot ? '#ffe8b0' : '#f4e8d0'); });
    }

    /** Obloha v obdĺžniku (okno, nebo nad hradbami) podľa dennej doby a počasia. */
    drawSky(s, x, y, w, h, round) {
        const nn = nightness(), day = 1 - nn, t = tm;
        s.fillStyle(Phaser.Display.Color.GetColor(40 + 120 * day, 60 + 120 * day, 90 + 140 * day), 1);
        if (round) s.fillCircle(x + w / 2, y + h / 2, Math.min(w, h) / 2); else s.fillRect(x, y, w, h);
        if (nn > .4) { s.fillStyle(0xfff4d0, 1).fillCircle(x + w * .72, y + h * .25, Math.min(7, h / 8)); s.fillStyle(0xffffff, 1); for (let k = 0; k < 6 + w / 20; k++) s.fillRect(x + 6 + (k * 37) % (w - 12), y + 4 + (k * 29) % (h * .7), 1.5, 1.5); }
        else if (day > .6) { s.fillStyle(0xffffff, .6); s.fillEllipse(x + w * .3 + (t * .1) % (w * .6), y + h * .3, w * .22, h * .14); s.fillEllipse(x + w * .3 + (t * .1 + w * .2) % (w * .6), y + h * .34, w * .14, h * .1); }
        if (MW.n === 'rain' || MW.n === 'storm') { s.lineStyle(1, 0xcfe0f0, .6); for (let k = 0; k < w / 6; k++) { const rx = x + (k * 37 + t * 2) % w, ry = y + (k * 53 + t * 6) % h; s.lineBetween(rx, ry, rx - 2, ry + 6); } }
        if (MW.n === 'snow') { s.fillStyle(0xffffff, .9); for (let k = 0; k < w / 7; k++) s.fillRect(x + (k * 41 + t) % w, y + (k * 29 + t * 2) % h, 2, 2); }
        if (MW.n === 'fog') { s.fillStyle(0xbec8d2, .35).fillRect(x, y, w, h); }
        if (MW.n === 'ash') { s.fillStyle(0x3a2a24, .35).fillRect(x, y, w, h); }
    }

    /** Odchod z miestnosti; potomok prepíše. */
    leave() { }
    /** Ukončí scénu a prípadne zobudí mapu. */
    closeRoom() { this.scene.stop(); if (this.scene.isSleeping('Map')) this.scene.wake('Map'); }
}
