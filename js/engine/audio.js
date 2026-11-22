/*
 * ENGINE: zvuky zo súborov (Phaser).
 * Zvuky boja sú súbory assets/audio/sfx_<druh>_<n>.wav (zbalené v js/engine/assets.js).
 * Hra vyberá náhodný variant, mení výšku tónu a pri bitke nastavuje hlasitosť
 * a stereo podľa toho, kde na bojisku zvuk vznikol.
 * Ak súbor chýba, použije sa pôvodná syntéza (js/audio/sound.js).
 * Hudba: súbory music_kraj, music_stred, music_mordor, music_bitka (ogg/mp3) nahradia
 * syntetickú hudbu; bez nich hrá pôvodná hudba.
 */
const SFX = {}, MUSIC = {};
const SFX_VOL = { sw: .55, hb: .7, sh: .7, dy: .5, ar: .35, cl: .25, horn: .8 };
let SNDPOS = null, sfxScene = null, sfxLast = {}, sfxPlaying = 0, musicNow = null;

const SoundFX = {
    /** Dekóduje zvuky zo zbalených súborov (volá BootScene). */
    init(scene) {
        sfxScene = scene;
        const A = (typeof ASSETS !== 'undefined' && ASSETS.audio) || {};
        const keys = Object.keys(A);
        if (!keys.length || !scene.sound || !scene.sound.decodeAudio) return;
        scene.sound.on('decoded', key => {
            const m = key.match(/^sfx_([a-z]+)_\d+$/);
            if (m) (SFX[m[1]] = SFX[m[1]] || []).push(key);
            const mu2 = key.match(/^music_([a-z]+)$/);
            if (mu2) MUSIC[mu2[1]] = key;
        });
        scene.sound.decodeAudio(keys.map(key => ({ key, data: A[key] })));
    },

    play(k) {
        const list = SFX[k];
        if (!list || !list.length || !sfxScene) return false;
        const now = performance.now();
        if (k !== 'horn' && now - (sfxLast[k] || 0) < 45) return true;
        if (sfxPlaying > 24) return true;
        sfxLast[k] = now;
        let vol = 1, pan = 0;
        if (SNDPOS && mode === 'battle') {
            const ear = typeof B3 !== 'undefined' && B3.isOn() ? B3.earPan(SNDPOS.x, SNDPOS.y) : null;   // v 3D od kamery a podľa jej smeru
            if (ear) { vol = Math.max(.15, 1 - ear.d / 700); pan = ear.pan; }
            else { const cx = bc.x + W / 2, cy = bc.y + H / 2, d = Math.hypot(SNDPOS.x - cx, SNDPOS.y - cy); vol = Math.max(.15, 1 - d / 700); pan = Math.max(-1, Math.min(1, (SNDPOS.x - cx) / 360)); }
        }
        const s = sfxScene.sound.add(list[Math.random() * list.length | 0]);
        if (s.setPan) s.setPan(pan * .8);
        sfxPlaying++;
        s.once('complete', () => { sfxPlaying--; s.destroy(); });
        s.play({ volume: vol * (SFX_VOL[k] || .6) * (typeof OPT !== 'undefined' ? OPT.vSfx : 1), detune: (Math.random() - .5) * 300 });
        return true;
    },

    /** Hudba zo súborov podľa oblasti (iba ak súbory existujú). */
    music() {
        if (!sfxScene || !G || mode === 'intro') return false;
        const z = mode === 'battle' ? 'bitka' : G.x < 500 * K ? 'kraj' : G.x > 1267 * K ? 'mordor' : 'stred';
        const key = MUSIC[z];
        if (!key) return false;
        if (musicNow && musicNow.key === key) { musicNow.setMute(mu); return true; }
        if (musicNow) { const old = musicNow; sfxScene.tweens.add({ targets: old, volume: 0, duration: 1500, onComplete: () => old.destroy() }); }
        musicNow = sfxScene.sound.add(key, { loop: true, volume: 0 });
        musicNow.play();
        musicNow.setMute(mu);
        sfxScene.tweens.add({ targets: musicNow, volume: .5 * (typeof OPT !== 'undefined' ? OPT.vMus : 1), duration: 1500 });
        return true;
    }
};

// Napojenie na simuláciu: zvuky z bitky si pamätajú polohu zasiahnutej jednotky.
{
    const sndSynth = snd, hitSim = hit, musSynth = mus;
    snd = function (k) {
        if (mu) return;
        if (!SoundFX.play(k)) sndSynth(k);
    };
    hit = function (b, d, from) {
        SNDPOS = b;
        try { return hitSim(b, d, from); } finally { SNDPOS = null; }
    };
    mus = function () {
        if (!SoundFX.music()) musSynth();
    };
}
