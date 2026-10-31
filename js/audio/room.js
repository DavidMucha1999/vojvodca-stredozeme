/*
 * Zvuky miestností (krčma, nádvorie, sieň, dedina, pamätihodnosti): kroky podľa podlahy a šum prostredia.
 * Všetko je syntéza cez Web Audio (osc/noi z js/audio/sound.js), bez súborov. RoomSnd.start(kind) spustí šum,
 * RoomSnd.stop() ho vypne; RoomSnd.step(floor) zahrá krok ('wood', 'stone', 'grass', 'sand'); RoomSnd.door() vŕzganie dverí.
 * Hudba mapy sa nemení.
 */
const RoomSnd = (() => {
    let timer = null, kind = null, AB = null, loop = null, lastStep = 0;
    const ok = () => typeof ac !== 'undefined' && ac && !mu;
    const abus = () => { bus(); if (!AB) { AB = ac.createGain(); AB.gain.value = .5; AB.connect(ac.destination); AB.connect(RV); } return AB; };
    /** Šumový podklad (vietor, hukot ohňa, hovor hostí) ako slučka s filtrom. */
    function drone(fq, q, v, ty = 'bandpass') {
        const n = ac.sampleRate * 2 | 0, b = ac.createBuffer(1, n, ac.sampleRate), a = b.getChannelData(0);
        let p = 0; for (let i = 0; i < n; i++) { p = p * .96 + (Math.random() * 2 - 1) * .04; a[i] = p * 6; }   // hnedý šum
        const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
        s.buffer = b; s.loop = true; f.type = ty; f.frequency.value = fq; f.Q.value = q; g.gain.value = v;
        s.connect(f); f.connect(g); g.connect(abus()); s.start();
        return { s, g, f };
    }
    /** Jednotlivé zvuky prostredia, náhodne v čase. */
    const ONE = {
        clink() { const t = ac.currentTime, b = 1800 + Math.random() * 900; [1, 1.5, 2.4].forEach((p, i) => osc(b * p, t, .25 / (i + 1) + .08, 'sine', .035 / (i + 1), AB, .002)); },
        laugh() { const t = ac.currentTime; for (let k = 0; k < 3; k++) { const o = osc(180 + Math.random() * 80, t + k * .13, .11, 'sawtooth', .025, AB, .02, 0, 900); o.frequency.exponentialRampToValueAtTime(120, t + k * .13 + .1); } },
        murmur() { const t = ac.currentTime; for (let k = 0; k < 4; k++) { osc(110 + Math.random() * 90, t + k * .17, .16, 'sawtooth', .012, AB, .03, 0, 600); } },
        hammer() { const t = ac.currentTime; [0, .55, 1.1].forEach(h => { const b = 2600 + Math.random() * 400; osc(b, t + h, .3, 'sine', .07, AB, .001); osc(b * 1.9, t + h, .15, 'sine', .03, AB, .001); noi(t + h, .05, .25, 'highpass', 3000, AB); }); },
        bird() { const t = ac.currentTime; for (let k = 0; k < 3 + Math.random() * 3; k++) { const o = osc(2600 + Math.random() * 900, t + k * .09, .07, 'sine', .03, AB, .005); o.frequency.exponentialRampToValueAtTime(3600, t + k * .09 + .06); } },
        crow() { const t = ac.currentTime; for (let k = 0; k < 2; k++) { const o = osc(520, t + k * .3, .2, 'sawtooth', .03, AB, .02, 0, 1500); o.frequency.exponentialRampToValueAtTime(380, t + k * .3 + .18); } },
        dog() { const t = ac.currentTime; [0, .22].forEach(h => { const o = osc(420, t + h, .14, 'sawtooth', .035, AB, .01, 0, 1200); o.frequency.exponentialRampToValueAtTime(300, t + h + .12); }); },
        hen() { const t = ac.currentTime; for (let k = 0; k < 4; k++) { const o = osc(900 + Math.random() * 200, t + k * .11, .08, 'square', .012, AB, .005, 0, 2000); o.frequency.exponentialRampToValueAtTime(700, t + k * .11 + .07); } },
        crackle() { const t = ac.currentTime; for (let k = 0; k < 3; k++) noi(t + Math.random() * .4, .03, .12, 'highpass', 2500 + Math.random() * 2000, AB); },
        creak() { const t = ac.currentTime; const o = osc(140 + Math.random() * 60, t, .35, 'sawtooth', .02, AB, .1, 0, 700); o.frequency.linearRampToValueAtTime(90, t + .3); },
        bell() { const t = ac.currentTime, b = 660; [1, 2.01, 2.74, 4.1].forEach((p, i) => osc(b * p, t, 1.6 / (i + 1), 'sine', .05 / (i + 1), AB, .003)); },
        drip() { const t = ac.currentTime; const o = osc(1800, t, .12, 'sine', .04, AB, .002); o.frequency.exponentialRampToValueAtTime(900, t + .1); },
        wind() { const t = ac.currentTime; const f = noi(t, 1.8, .06, 'bandpass', 500 + Math.random() * 300, AB, .8); f.frequency.linearRampToValueAtTime(300, t + 1.6); },
        horse() { const t = ac.currentTime; for (let k = 0; k < 3; k++) { const o = osc(320 - k * 40, t + k * .15, .14, 'sawtooth', .02, AB, .02, 0, 1200); o.frequency.exponentialRampToValueAtTime(200, t + k * .15 + .12); } }
    };
    /** Prostredia: podklad + zoznam náhodných zvukov [názov, pravdepodobnosť za sekundu]. */
    const AMB = {
        tavern: { d: [[300, .7, .18], [1200, 1.2, .05]], e: [['murmur', .5], ['clink', .25], ['laugh', .08], ['crackle', .3], ['creak', .04]] },
        tavernEvil: { d: [[120, .8, .22], [900, 2, .04]], e: [['murmur', .35], ['clink', .12], ['crackle', .4], ['creak', .08], ['drip', .1]] },
        yard: { d: [[400, .6, .12]], e: [['hammer', .12], ['bird', .2], ['horse', .05], ['wind', .12], ['murmur', .15]] },
        yardEvil: { d: [[180, .8, .18]], e: [['hammer', .15], ['crow', .12], ['wind', .15], ['drip', .06], ['murmur', .1]] },
        hall: { d: [[160, 1, .12]], e: [['crackle', .5], ['creak', .05], ['murmur', .08], ['drip', .03]] },
        village: { d: [[500, .5, .1]], e: [['bird', .3], ['hen', .18], ['dog', .07], ['wind', .1], ['hammer', .04]] },
        villageEvil: { d: [[220, .7, .15]], e: [['crow', .2], ['dog', .1], ['wind', .15], ['murmur', .08]] },
        elf: { d: [[700, .4, .08], [2200, 3, .03]], e: [['bird', .35], ['wind', .1], ['bell', .04], ['drip', .08]] },
        cave: { d: [[90, 1, .2]], e: [['drip', .4], ['wind', .1], ['creak', .03]] }
    };
    function start(k) {
        if (!ok()) { kind = k; return; }
        if (kind === k && loop) return;
        stop(); kind = k;
        const A = AMB[k] || AMB.yard;
        abus();
        loop = A.d.map(([fq, q, v]) => drone(fq, q, v));
        timer = setInterval(() => { if (!ok()) return; for (const [n, p] of A.e) if (Math.random() < p * .5) ONE[n](); }, 500);
    }
    function stop() {
        if (timer) clearInterval(timer); timer = null;
        if (loop) loop.forEach(o => { try { o.g.gain.linearRampToValueAtTime(0, ac.currentTime + .4); o.s.stop(ac.currentTime + .5); } catch (e) { } });
        loop = null; kind = null;
    }
    /** Krok podľa podlahy; nie častejšie než každých 220 ms. */
    function step(floor) {
        if (!ok()) return;
        const t = ac.currentTime; if (t - lastStep < .22) return; lastStep = t;
        abus();
        if (floor === 'wood') { noi(t, .07, .3, 'lowpass', 300, AB); const o = osc(90 + Math.random() * 20, t, .09, 'sine', .25, AB, .002); o.frequency.exponentialRampToValueAtTime(50, t + .08); if (Math.random() < .25) ONE.creak(); }
        else if (floor === 'grass' || floor === 'sand') { noi(t, .09, .22, 'bandpass', floor === 'sand' ? 1600 : 900, AB, 1.2); }
        else { noi(t, .05, .35, 'highpass', 1800, AB); const o = osc(240, t, .06, 'sine', .12, AB, .001); o.frequency.exponentialRampToValueAtTime(120, t + .05); }
    }
    /** Dvere: vŕzganie a buchnutie. */
    function door() { if (!ok()) return; abus(); ONE.creak(); const t = ac.currentTime + .35; noi(t, .12, .4, 'lowpass', 250, AB); const o = osc(70, t, .14, 'sine', .3, AB, .002); o.frequency.exponentialRampToValueAtTime(40, t + .12); }
    return { start, stop, step, door, current: () => kind };
})();
