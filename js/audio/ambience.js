/*
 * Zvuky prostredia (syntetizované, nezávislé od hudby): dážď, vietor a sneh, hrom pri búrke,
 * praskanie fakieľ v noci, ruch trhu a krčmy. Hudba na mape ostáva bez zmeny (sound.js).
 * Bežia ako slučky šumu s filtrom a plynulou hlasitosťou; každých 200 ms sa podľa stavu hry
 * rozhodne, ktoré majú hrať (ambTick).
 */
let AMB = null, thunderAt = 0, crackleAt = 0;
function ambInit() {
    if (AMB || !ac) return;
    bus();
    AMB = { g: ac.createGain(), src: {} };
    AMB.g.gain.value = .9;
    AMB.g.connect(ac.destination);
    const mkLoop = (type, fq, q) => {
        const n = ac.sampleRate * 3 | 0, b = ac.createBuffer(1, n, ac.sampleRate), a = b.getChannelData(0);
        for (let i = 0; i < n; i++) a[i] = Math.random() * 2 - 1;
        const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
        s.buffer = b; s.loop = true; f.type = type; f.frequency.value = fq; f.Q.value = q; g.gain.value = 0;
        s.connect(f); f.connect(g); g.connect(AMB.g); s.start();
        return { f, g };
    };
    AMB.src.rain = mkLoop('bandpass', 2600, .5);      // dážď: jemný vysoký šum
    AMB.src.wind = mkLoop('lowpass', 420, .8);        // vietor: hlboký šum, ktorý sa vlní
    AMB.src.fire = mkLoop('bandpass', 900, 1.2);      // fakle: šum, ktorý praská
    AMB.src.crowd = mkLoop('bandpass', 600, .9);      // trh a krčma: ruch
}
/** Plynulá zmena hlasitosti slučky. */
const ambSet = (k, v) => { const s = AMB.src[k]; if (!s) return; s.g.gain.setTargetAtTime(v, ac.currentTime, .6); };
/** Hrom: hlboký úder so zadunením. */
function thunder() {
    const t = ac.currentTime, d = 1.6 + Math.random() * 1.2;
    noi(t, d, .55, 'lowpass', 140 + Math.random() * 80, AMB.g, .7);
    noi(t + .05, .4, .35, 'lowpass', 400, AMB.g, 1);
    const o = osc(55, t, d, 'sine', .35, AMB.g, .01); o.frequency.exponentialRampToValueAtTime(28, t + d);
}
/** Praskanie fakle: krátke tlesknutie. */
function crackle() { noi(ac.currentTime, .05 + Math.random() * .05, .18, 'highpass', 1800 + Math.random() * 2000, AMB.g, 2); }
/** Rozhodne podľa stavu hry, ktoré zvuky prostredia znejú. Volá sa každých 200 ms zo zvukového intervalu. */
function ambTick() {
    if (!ac || !G || mode === 'intro') { if (AMB) for (const k in AMB.src) ambSet(k, 0); return; }
    ambInit();
    if (mu) { for (const k in AMB.src) ambSet(k, 0); return; }
    const battle = mode === 'battle', inside = mode === 'town' || mode === 'tavern' || mode === 'castle';   // v hrade a v krčme vonkajšie zvuky nepočuť
    const w = inside ? 'clear' : battle ? WX.n : MW.n, night = battle ? WX.night : isNight();
    const se = season();
    ambSet('rain', w === 'rain' ? .1 : w === 'storm' ? .18 : w === 'ash' ? .05 : 0);            // dážď tichý, len ako podkres
    const windy = w === 'snow' || w === 'storm' || (!inside && se === 3) || (w === 'fog' ? .5 : 0);
    ambSet('wind', w === 'snow' ? .18 : w === 'storm' ? .14 : !inside && se === 3 ? .08 : w === 'fog' ? .06 : 0);
    if (windy) AMB.src.wind.f.frequency.setTargetAtTime(300 + 250 * (.5 + .5 * Math.sin(tm / 90)), ac.currentTime, .5);
    ambSet('fire', battle && night ? .12 : 0);
    ambSet('crowd', 0);                                                                         // v krčme hrá iba hudba
    const now = ac.currentTime;
    if (w === 'storm' && !inside && now > thunderAt) { thunder(); thunderAt = now + 5 + Math.random() * 10; }
    if (battle && night && now > crackleAt) { crackle(); crackleAt = now + .15 + Math.random() * .5; }
}
{   // napojenie na zvukový interval hry
    const mus0 = mus;
    mus = function () { mus0(); try { ambTick(); } catch (e) { } };
}
