/*
 * ENGINE: štartovacia scéna.
 * Pripraví svet (mapu, bojisko), načíta textúry, vlastné obrázky a zvuky z js/engine/assets.js,
 * počká na písma a spustí úvod spolu so scénou rozhrania.
 */
class BootScene extends Phaser.Scene {
    constructor() { super('Boot'); }

    create() {
        ov.classList.add('intro');
        tb.style.display = 'none';
        hud.style.visibility = 'hidden';
        tb.id = 'tb'; od.id = 'od';
        cv.width = W * RES; cv.height = H * RES;          // pomocné plátno pre kreslenie vo vysokom rozlíšení
        buildMap();
        SoundFX.init(this);
        const txt = this.add.text(W * RES / 2, H * RES / 2, 'Načítavam Stredozem…', { fontFamily: 'Georgia, serif', fontSize: 18 * RES + 'px', color: '#d9a441' }).setOrigin(.5);
        const fonts = document.fonts && document.fonts.load
            ? Promise.race([Promise.all([document.fonts.load('15px "IM Fell English"'), document.fonts.load('26px "Uncial Antiqua"')]), new Promise(r => setTimeout(r, 2500))])
            : Promise.resolve();
        Promise.all([Art.loadTextures(this), Art.loadOverrides(this), fonts]).then(() => {
            txt.destroy();
            this.scene.launch('UI');
            this.scene.start('Intro');
        });
    }
}
