/*
 * ENGINE: spustenie hry v Phaseri 3.
 * Poradie scén: Boot → Intro → Map ⇄ Battle, pričom UI beží stále navrchu.
 * Plátno má RES-násobné rozlíšenie (ostrý obraz), kamery používajú logické súradnice 720×480.
 */
const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: W * RES,
    height: H * RES,
    backgroundColor: '#120e0c', transparent: true,   // pod Phaserom môže ležať 3D bojisko (js/engine/3d/b3d.js)
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, roundPixels: false },
    input: { mouse: { preventDefaultWheel: true } },
    scene: [BootScene, IntroScene, MapScene, BattleScene, TavernScene, CastleScene, VillageScene, PlaceScene, UIScene]
});
