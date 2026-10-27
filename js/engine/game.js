/*
 * ENGINE: spustenie hry v Phaseri 3.
 * Poradie scén: Boot → Intro → Map ⇄ Battle, pričom UI beží stále navrchu.
 * Simulácia (js/sim) sa nemení; scény ju volajú a iba zobrazujú jej stav.
 */
const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: W,
    height: H,
    backgroundColor: '#120e0c',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, roundPixels: false },
    input: { mouse: { preventDefaultWheel: true } },
    scene: [BootScene, IntroScene, MapScene, BattleScene, UIScene]
});
