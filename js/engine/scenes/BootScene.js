/*
 * ENGINE: štartovacia scéna.
 * Pripraví svet (mapu, bojisko), skryje lištu a spustí úvod a scénu rozhrania.
 * Neskôr tu bude načítanie obrázkov a zvukov (this.load.image, this.load.audio).
 */
class BootScene extends Phaser.Scene {
    constructor() { super('Boot'); }

    preload() {
        // Sem pôjdu skutočné grafické a zvukové súbory, napr.:
        // this.load.image('castle_gondor', 'assets/castles/gondor.png');
        // this.load.spritesheet('uruk', 'assets/units/uruk.png', { frameWidth: 64, frameHeight: 64 });
    }

    create() {
        ov.classList.add('intro');
        tb.style.display = 'none';
        hud.style.visibility = 'hidden';
        buildMap();
        Bake.dot(this, 'spark', 3, '#ffffff');
        this.scene.launch('UI');
        this.scene.start('Intro');
    }
}
