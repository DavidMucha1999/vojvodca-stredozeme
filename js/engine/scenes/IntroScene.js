/*
 * ENGINE: úvodná obrazovka.
 * Animovaná bojová scéna z js/render/intro.js kreslená vo vysokom rozlíšení.
 */
class IntroScene extends Phaser.Scene {
    constructor() { super('Intro'); }

    create() {
        const c = document.createElement('canvas');
        c.width = W * RES; c.height = H * RES;
        this.cctx = c.getContext('2d');
        if (this.textures.exists('intro')) this.textures.remove('intro');
        this.tex = this.textures.addCanvas('intro', c);
        this.add.image(0, 0, 'intro').setOrigin(0);
        setTimeout(() => { if (!Art.loaded.battle && !Art.loading.battle) Art.loadTextures(this, 'battle'); }, 400);   // bojisko a vojaci sa dočítajú na pozadí počas úvodu
    }

    update() {
        if (!this.shown) { this.shown = 1; if (!G) ov.classList.remove('hide'); }   // úvodný formulár až keď je úvodná scéna nakreslená
        if (G) { this.scene.start('Map'); return; }
        ctx.save();
        ctx.setTransform(RES, 0, 0, RES, 0, 0);
        introScene();
        ctx.restore();
        this.cctx.clearRect(0, 0, W * RES, H * RES);
        this.cctx.drawImage(cv, 0, 0, W * RES, H * RES, 0, 0, W * RES, H * RES);
        this.tex.refresh();
    }
}
