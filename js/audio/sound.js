/*
 * Zvuk a hudba: syntéza zvukov boja, ozvena a hudba podľa miesta.
 */
let ac = null, mu = false, ls = 0, tk = 0;
function initA() {
    const A = window.AudioContext || window.webkitAudioContext;
    if (ac || !A)
        return;
    try {
        ac = new A();
        setInterval(mus, 200);
    }
    catch (e) {
        ac = null;
    }
    if (ac && ac.state === 'suspended')
        ac.resume();
}
let RV, MB, SB, nb = 0, bar = 0;
const mf = m => 440 * Math.pow(2, (m - 69) / 12);
function bus() {
    if (RV)
        return;
    const n = ac.sampleRate * 2.6 | 0, b = ac.createBuffer(2, n, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
        const d = b.getChannelData(c);
        for (let i = 0; i < n; i++)
            d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    }
    RV = ac.createConvolver();
    RV.buffer = b;
    const wet = ac.createGain();
    wet.gain.value = .35;
    RV.connect(wet);
    wet.connect(ac.destination);
    MB = ac.createGain();
    MB.gain.value = .5;
    MB.connect(ac.destination);
    MB.connect(RV);
    SB = ac.createGain();
    SB.gain.value = .8;
    SB.connect(ac.destination);
    SB.connect(RV);
}
function osc(f, t, d, ty, v, out, a, det, lp) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = ty;
    o.frequency.setValueAtTime(f, t);
    o.detune.value = det || 0;
    let n = o;
    if (lp) {
        const fl = ac.createBiquadFilter();
        fl.type = 'lowpass';
        fl.frequency.value = lp;
        o.connect(fl);
        n = fl;
    }
    n.connect(g);
    g.connect(out);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + (a || .01));
    g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.start(t);
    o.stop(t + d + .05);
    return o;
}
const NOISE_B = {};   // šum sa vytvorí raz pre každú dĺžku (v boji sa nezahlcuje pamäť)
function noi(t, d, v, ty, fq, out, q) {
    const n = ac.sampleRate * d | 0; let b = NOISE_B[n];
    if (!b) { b = NOISE_B[n] = ac.createBuffer(1, n, ac.sampleRate); const a = b.getChannelData(0); for (let i = 0; i < n; i++) a[i] = Math.random() * 2 - 1; }
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = b;
    f.type = ty;
    f.frequency.value = fq;
    f.Q.value = q || 1;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + d);
    s.connect(f);
    f.connect(g);
    g.connect(out);
    s.start(t);
    return f;
}
/** Vojnový bubon (k = sila): hlboký úder s dozvukom. */
function warDrum(k) {
    if (!ac || mu) return;
    bus(); const t = ac.currentTime;
    const o = osc(62, t, .5, 'sine', .5 * k, SB, .004); o.frequency.exponentialRampToValueAtTime(36, t + .32);
    noi(t, .14, .22 * k, 'lowpass', 260, SB);
}
function sndBase(k) {
    if (!ac || mu)
        return;
    bus();
    const t = ac.currentTime;
    if (t - ls < .05 && k !== 'horn')
        return;
    ls = t;
    if (k === 'sw') {
        const b = 550 + Math.random() * 350;
        [1, 2.76, 5.4, 8.93].forEach((p, i) => osc(b * p, t, .12 + .45 / (i + 1), 'sine', .06 / (i + 1), SB, .002));
        noi(t, .06, .3, 'highpass', 2500, SB);
    }
    else if (k === 'sh') {
        noi(t, .2, .7, 'lowpass', 380, SB);
        const o = osc(95, t, .22, 'sine', .4, SB, .003);
        o.frequency.exponentialRampToValueAtTime(45, t + .2);
    }
    else if (k === 'ar') {
        const f = noi(t, .28, .35, 'bandpass', 1500, SB, 3);
        f.frequency.exponentialRampToValueAtTime(4000, t + .25);
    }
    else if (k === 'dy') {
        const o = osc(170 + Math.random() * 60, t, .45, 'sawtooth', .12, SB, .02, 0, 900);
        o.frequency.exponentialRampToValueAtTime(80, t + .4);
        noi(t, .3, .15, 'bandpass', 700, SB, 2);
    }
    else if (k === 'hb') {
        noi(t, .12, .6, 'lowpass', 250, SB);
        const o = osc(70, t, .15, 'sine', .3, SB, .002);
        o.frequency.exponentialRampToValueAtTime(40, t + .12);
    }
    else if (k === 'cl') {
        const b = 500 + Math.random() * 500, g = ac.createGain(), fl = ac.createBiquadFilter();
        g.gain.value = .25;
        fl.type = 'lowpass';
        fl.frequency.value = 1800;
        fl.connect(g);
        g.connect(SB);
        [1, 2.7, 5.2].forEach((p, i) => osc(b * p, t, .3 / (i + 1) + .1, 'sine', .05 / (i + 1), fl, .002));
    }
    else if (k === 'horn') {
        [110, 110.6, 165].forEach(f => osc(f, t, 1.8, 'sawtooth', .09, SB, .18, 0, 900));
    }
}
function pb(t) {
    const z = mode === 'tavern' || (mode === 'room' && ROOM && ROOM.inn) ? (heroSide() === 1 ? 'tv' : 't') : mode === 'battle' ? 'b' : G.x < 500 * K ? 's' : G.x > 1267 * K ? 'd' : 'e', P = { t: [[55, 59, 62], [53, 57, 60], [50, 53, 57], [55, 59, 62]], tv: [[45, 48, 52], [44, 48, 51], [45, 48, 52], [43, 46, 50]], e: [[50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55]], d: [[50, 53, 57], [51, 55, 58], [50, 53, 57], [49, 52, 57]], s: [[53, 57, 60], [48, 52, 55], [50, 53, 57], [46, 50, 53]], b: [[50, 53, 57], [50, 53, 57], [46, 50, 53], [45, 49, 52]] }[z], c = P[bar % 4], L = 2.4;
    bar++;
    if (z === 't' || z === 'tv') return pbTavern(t, c, z === 'tv', L);
    c.forEach(m => { osc(mf(m), t, L + .6, 'sawtooth', .03, MB, .6, -7, 1100); osc(mf(m), t, L + .6, 'sawtooth', .03, MB, .6, 7, 1100); });
    osc(mf(c[0] - 24), t, L, 'sine', .18, MB, .05);
    if (z !== 's')
        (z === 'b' ? [0, .3, .6, 1.2, 1.5, 1.8, 2.1] : [0, 1.2, 1.8]).forEach(h => { const o = osc(110, t + h, .5, 'sine', z === 'b' ? .5 : .3, MB, .005); o.frequency.exponentialRampToValueAtTime(45, t + h + .4); noi(t + h, .12, .12, 'lowpass', 600, MB); });
    if (Math.random() < .8)
        [0, 1.2].forEach(h => osc(mf(c[Math.floor(Math.random() * 3)] + 12), t + h, 1.4, 'triangle', .06, MB, .25, 0, 2000));
}
/** Hudba krčmy (hudba mapy sa nemení): dobro = veselá brnkačka s ľahkým bubnom, zlo = temný dron s ťažkým úderom. */
function pbTavern(t, c, evil, L) {
    if (evil) {
        c.forEach(m => osc(mf(m - 12), t, L + .4, 'sawtooth', .035, MB, .5, 0, 500));
        osc(mf(c[0] - 24), t, L, 'sine', .2, MB, .05);
        [0, 1.2].forEach(h => { const o = osc(80, t + h, .6, 'sine', .45, MB, .005); o.frequency.exponentialRampToValueAtTime(35, t + h + .5); noi(t + h, .15, .18, 'lowpass', 400, MB); });
        if (Math.random() < .5) osc(mf(c[1] + 6), t + 1.8, .5, 'triangle', .04, MB, .1, 0, 1500);   // falošný tón
        return;
    }
    // dobro: tri doby na takt, brnkané akordy a hopsavá melódia
    [0, .8, 1.6].forEach((h, i) => c.forEach((m, k) => osc(mf(m + (i ? 0 : -12)), t + h + k * .03, .5, 'triangle', .07, MB, .005, 0, 2500)));
    const mel = [c[2] + 12, c[1] + 12, c[0] + 12, c[2] + 12, c[0] + 14, c[2] + 12];
    mel.forEach((m, i) => { if (Math.random() < .85) osc(mf(m), t + i * .4, .35, 'triangle', .08, MB, .005, 0, 3000); });
    [0, 1.6].forEach(h => { noi(t + h, .08, .15, 'lowpass', 500, MB); });
    [.8].forEach(h => noi(t + h, .05, .08, 'highpass', 3000, MB));
}
function mus() {
    if (!ac || mu || !G || mode === 'intro')
        return;
    bus();
    if (nb < ac.currentTime)
        nb = ac.currentTime + .05;
    while (nb < ac.currentTime + .6) {
        pb(nb);
        nb += 2.4;
    }
}
function roar(on) {
    if (!ac)
        return;
    if (!on && RN) {
        RN.stop();
        RN = null;
    }
    if (!on || mu || RN)
        return;
    bus();
    const n = ac.sampleRate * 2 | 0, b = ac.createBuffer(1, n, ac.sampleRate), a = b.getChannelData(0);
    for (let i = 0; i < n; i++)
        a[i] = Math.random() * 2 - 1;
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = b;
    s.loop = true;
    f.type = 'bandpass';
    f.frequency.value = 450;
    f.Q.value = .6;
    g.gain.value = .07;
    s.connect(f);
    f.connect(g);
    g.connect(SB);
    s.start();
    RN = s;
}
let ls2 = 0;
function snd(k) {
    if (!ac || mu)
        return;
    if (k !== 'sw' && k !== 'hb')
        return sndBase(k);
    bus();
    const t = ac.currentTime;
    if (t - ls2 < .045)
        return;
    ls2 = t;
    const wf = noi(t, .13, .12, 'bandpass', 900, SB, 1.5);
    wf.frequency.exponentialRampToValueAtTime(2600, t + .12);
    const ti = t + .09;
    if (k === 'sw') {
        const b = 900 + Math.random() * 700;
        [1, 1.51, 2.13, 2.95, 3.62, 4.41].forEach((p, i) => { const o = osc(b * p, ti, .18 + .5 / (i + 1), 'sine', .07 / (i * .7 + 1), SB, .001); o.detune.value = (Math.random() - .5) * 30; });
        noi(ti, .05, .45, 'highpass', 3500, SB);
        noi(ti, .25, .06, 'bandpass', 5000, SB, 4);
        const o = osc(160, ti, .08, 'triangle', .15, SB, .001);
        o.frequency.exponentialRampToValueAtTime(70, ti + .07);
    }
    else {
        noi(ti, .16, .7, 'lowpass', 320, SB);
        const o = osc(95, ti, .18, 'sine', .35, SB, .002);
        o.frequency.exponentialRampToValueAtTime(45, ti + .15);
        noi(ti, .06, .25, 'bandpass', 1400, SB, 2);
        if (Math.random() < .3) {
            const g = osc(140 + Math.random() * 60, ti + .03, .3, 'sawtooth', .06, SB, .02, 0, 700);
            g.frequency.exponentialRampToValueAtTime(90, ti + .3);
        }
    }
}
