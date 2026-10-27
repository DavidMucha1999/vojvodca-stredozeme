/*
 * ENGINE: herné rozhranie nad scénami.
 * Beží stále navrchu: posúva herný čas, zobrazuje oznámenia, pauzu, noc,
 * počasie, rám minimapy, zdravie hrdinu a stav brány pri obliehaní.
 * Menu (hrady, encyklopédia, diplomacia) zostávajú zatiaľ v HTML (js/ui).
 */
class UIScene extends Phaser.Scene {
    constructor() { super('UI'); }

    create() {
        this.g = this.add.graphics();
        const font = { fontFamily: '"IM Fell English", Georgia, serif', fontSize: '15px' };
        this.toast = this.add.text(W / 2, 77, '', { ...font, color: '#d9a441', backgroundColor: 'rgba(18,14,12,.88)', padding: { x: 12, y: 4 } }).setOrigin(.5);
        this.pause = this.add.text(W / 2, H - 58, 'Pauza: klikni na mapu alebo sa utábor, aby čas plynul', { ...font, color: '#ffd24a', backgroundColor: 'rgba(18,14,12,.85)', padding: { x: 10, y: 3 } }).setOrigin(.5);
        this.gate = this.add.text(W / 2, 132, '', { fontFamily: 'sans-serif', fontSize: '13px', color: '#ecdfc6', stroke: '#000', strokeThickness: 3 }).setOrigin(.5);
    }

    update(time, delta) {
        const dt = Math.min(2, delta / 16.67);
        tm += dt;
        const g = this.g; g.clear();
        const scene = this.scene.isActive('Battle') ? 'battle' : this.scene.isActive('Map') ? 'map' : 'intro';

        // Oznámenia z denníka
        if (TS && TS.l > 0 && G) { TS.l -= dt; this.toast.setVisible(true).setText(TS.s).setAlpha(Math.min(1, TS.l / 40)); }
        else this.toast.setVisible(false);
        this.pause.setVisible(scene === 'map' && mode === 'map' && !!PAUSE);

        if (scene === 'map') {
            g.fillStyle(0x080e28, .18 * (.5 - .5 * Math.cos(dayT / 600 * 6.283))).fillRect(0, 0, W, H);
            g.lineStyle(3, 0xd9a441, 1).strokeRect(MM.x - 1.5, MM.y - 1.5, MM.w + 3, MM.h + 3);
        }

        if (scene === 'battle' && U && U[0]) {
            if (WX.n === 'rain') { g.lineStyle(1, 0xb4c8e6, .4); for (let k = 0; k < 120; k++) { const x = (k * 89 + tm * 7) % W, y = (k * 61 + tm * 16) % H; g.lineBetween(x, y, x - 3, y + 11); } }
            if (WX.n === 'snow') { g.fillStyle(0xffffff, 1); for (let k = 0; k < 110; k++) g.fillRect((k * 97 + tm * .9 + Math.sin(tm / 25 + k) * 12) % W, (k * 59 + tm * 1.8) % H, 2, 2); }
            if (WX.n === 'fog') g.fillStyle(0xbec8d2, .38).fillRect(0, 0, W, H);
            const h = U[0];
            g.fillStyle(0x000000, .55).fillRect(W / 2 - 82, 58, 164, 10);
            g.fillStyle(0xb8402a, 1).fillRect(W / 2 - 80, 60, 160 * Math.max(0, h.hp) / h.mh, 6);
            if (SGB) {
                g.fillStyle(0x000000, .6).fillRect(W / 2 - 82, 114, 164, 8);
                g.fillStyle(0xc08a3a, 1).fillRect(W / 2 - 80, 116, 160 * Math.max(0, SGB.gate) / SGB.mg, 4);
                this.gate.setVisible(true).setText(SGB.gate > 0 ? 'Brána hradu' : 'Brána je zničená!');
            } else this.gate.setVisible(false);
        } else this.gate.setVisible(false);
    }
}
