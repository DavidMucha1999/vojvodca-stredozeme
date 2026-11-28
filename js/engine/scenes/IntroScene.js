/*
 * ENGINE: úvodná obrazovka.
 * Pozadie menu: ilustrácia assets/menu.webp s pomalým priblížením (nenáročné na výkon).
 */
class IntroScene extends Phaser.Scene {
    constructor() { super('Intro'); }

    create() {
        this.t0 = performance.now(); this.loaded = !!G;   // menu sa ukáže, až keď je obrázok načítaný (alebo zlyhal)
        if (G) return;
        const img = new Image();
        img.onload = () => {
            if (!this.scene.isActive()) return;
            if (this.textures.exists('menu')) this.textures.remove('menu');
            this.textures.addImage('menu', img);
            this.base = Math.max(W * RES / img.width, H * RES / img.height) * 1.04;
            this.pic = this.add.image(W * RES / 2, H * RES / 2, 'menu').setScale(this.base);
            this.add.graphics().fillStyle(0x050302, .28).fillRect(0, 0, W * RES, H * RES);   // stmavenie, aby bolo menu čitateľné
            this.loaded = true;
        };
        img.onerror = () => { this.loaded = true; };
        img.src = 'assets/menu.webp';
    }

    update() {
        if (!this.loaded && !this.shown) return;
        if (!this.shown) { this.shown = 1; if (!G) ov.classList.remove('hide'); }   // úvodný formulár až keď je pozadie nakreslené
        if (G) { this.scene.start('Map'); return; }
        if (!this.pic) return;
        const t = (performance.now() - this.t0) / 1000;   // pomalé priblíženie a posun, aby obraz žil
        this.pic.setScale(this.base * (1 + .035 * (.5 - .5 * Math.cos(t * .12)))).setPosition(W * RES / 2 + Math.sin(t * .09) * 14 * RES, H * RES / 2 + Math.sin(t * .07) * 6 * RES);
    }
}
