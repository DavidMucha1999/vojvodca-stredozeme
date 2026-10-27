/*
 * ENGINE: úvodná obrazovka.
 * Zatiaľ prenáša pôvodnú animovanú bojovú scénu (js/render/intro.js) cez plátno.
 * Neskôr ju nahradí ilustrácia s parallaxou a časticami.
 */
class IntroScene extends Phaser.Scene {
    constructor() { super('Intro'); }

    create() {
        const c = document.createElement('canvas');
        c.width = W; c.height = H;
        this.cctx = c.getContext('2d');
        if (this.textures.exists('intro')) this.textures.remove('intro');
        this.tex = this.textures.addCanvas('intro', c);
        this.add.image(0, 0, 'intro').setOrigin(0);
    }

    update() {
        if (G) { this.scene.start('Map'); return; }
        introScene();
        this.cctx.clearRect(0, 0, W, H);
        this.cctx.drawImage(cv, 0, 0);
        this.tex.refresh();
    }
}
