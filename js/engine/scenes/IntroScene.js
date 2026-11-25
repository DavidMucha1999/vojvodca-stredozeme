/*
 * ENGINE: úvodná obrazovka.
 * Pozadie menu: ilustrácia assets/menu.webp s pomalým priblížením (nenáročné na výkon).
 * Ak sa obrázok nenačíta, ostane animovaná bojová scéna z js/render/intro.js kreslená vo vysokom rozlíšení.
 */
class IntroScene extends Phaser.Scene {
    constructor() { super('Intro'); }

    create() {
        const c = document.createElement('canvas');
        c.width = W * RES; c.height = H * RES;
        this.cctx = c.getContext('2d');
        if (this.textures.exists('intro')) this.textures.remove('intro');
        this.tex = this.textures.addCanvas('intro', c);
        this.fallback = this.add.image(0, 0, 'intro').setOrigin(0);
        this.t0 = performance.now(); this.loaded = !!G;   // menu sa ukáže, až keď je obrázok načítaný (alebo zlyhal)
        if (!G) {
            const img = new Image();
            img.onload = () => {
                if (!this.scene.isActive()) return;
                if (this.textures.exists('menu')) this.textures.remove('menu');
                this.textures.addImage('menu', img);
                this.base = Math.max(W * RES / img.width, H * RES / img.height) * 1.04;
                this.pic = this.add.image(W * RES / 2, H * RES / 2, 'menu').setScale(this.base);
                const v = this.add.graphics();   // stmavenie okrajov, aby bolo menu čitateľné
                v.fillStyle(0x050302, .28).fillRect(0, 0, W * RES, H * RES);
                this.fallback.setVisible(false); this.loaded = true;
            };
            img.onerror = () => { this.loaded = true; };
            img.src = 'assets/menu.webp';
        }
        // textúry bitky sa nenačítavajú počas mapy: ich dekódovanie seká pochod. Načítajú sa až pri vstupe do bitky.
    }

    update() {
        if (!this.loaded && !this.shown) return;
        if (!this.shown) { this.shown = 1; if (!G) ov.classList.remove('hide'); }   // úvodný formulár až keď je úvodná scéna nakreslená
        if (G) { this.scene.start('Map'); return; }
        if (this.pic) {   // pomalé priblíženie a posun, aby obraz žil
            const t = (performance.now() - this.t0) / 1000;
            this.pic.setScale(this.base * (1 + .035 * (.5 - .5 * Math.cos(t * .12)))).setPosition(W * RES / 2 + Math.sin(t * .09) * 14 * RES, H * RES / 2 + Math.sin(t * .07) * 6 * RES);
            return;
        }
        ctx.save();
        ctx.setTransform(RES, 0, 0, RES, 0, 0);
        introScene();
        ctx.restore();
        this.cctx.clearRect(0, 0, W * RES, H * RES);
        this.cctx.drawImage(cv, 0, 0, W * RES, H * RES, 0, 0, W * RES, H * RES);
        this.tex.refresh();
    }
}
