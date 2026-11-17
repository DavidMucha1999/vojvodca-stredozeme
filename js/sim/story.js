/*
 * Príbeh: zobrazenie, plnenie a kontrola kapitol.
 */
/** Prvé kroky nezávislého hrdinu v Kraji: boj na dosah, potom Bree, až potom list do Rivendellu. */
const INTRO_Q = [
    { t: 'Pri ceste z Kraja číha tlupa lupičov. Poraž ju, kým dorazí k dedinám.', k: 'k', a: 9, r: 40 },
    { t: 'Cesta je voľná. Zastav sa v Bree a povedz, že lupiči sú preč.', k: 'v', a: 'Bree', r: 30 }
];
function qShow() {
    if (G && (G.intro === 0 || G.intro === 1)) {
        mode = 'town';
        evShow('Príbeh: prvé kroky', INTRO_Q[G.intro].t);
        btn('Na cestu', () => { ov.classList.add('hide'); mode = 'map'; });
        return;
    }
    const q = QS[G.q];
    if (q) {
        mode = 'town';
        evShow('Príbeh: kapitola ' + (G.q + 1), q.t);
        btn('Na cestu', () => { ov.classList.add('hide'); mode = 'map'; });
    }
}
/** Dokončenie úvodného kroku: odmena a ďalšie okno až po návrate na mapu (neprebije tabuľku bitky). */
function introDone() {
    const step = INTRO_Q[G.intro];
    if (!step) { G.intro = 2; qShow(); return; }
    G.gold += step.r;
    G.ren = (G.ren || 0) + 1;
    const note = G.intro === 0 ? 'Lupičská tlupa je rozbitá. Odmena ' + step.r + ' zlata.' : 'V Bree vedia, že cesta z Kraja je voľná. Odmena ' + step.r + ' zlata.';
    lg(note);
    G.intro++;
    upd();
    if (G.intro < 2) {
        mode = 'town';
        evShow('Príbeh: prvé kroky', note + ' ' + INTRO_Q[G.intro].t);
        btn('Na cestu', () => { ov.classList.add('hide'); mode = 'map'; });
    }
    else qShow();
}
function qDone() {
    const q = QS[G.q];
    if (!q)
        return;
    G.gold += q.r;
    G.ren += 2;
    lg('Splnená kapitola ' + (G.q + 1) + ', odmena ' + q.r + ' zlata.');
    G.q++;
    G.qc = 0;
    upd();
    if (G.q >= QS.length) {
        chron(QS === QE ? 'Minas Tirith padlo – Tieň zvíťazil.' : 'Saurónova moc padla.');
        ending('story');   // jeden zo šiestich koncov (js/sim/chronicle.js)
    }
    else
        qShow();
}
function qChk(k, a) {
    if (G && (G.intro === 0 || G.intro === 1)) {
        const s = INTRO_Q[G.intro];
        if (s && s.k === k && s.a === a) G.iq = 1;
        return;
    }
    const q = QS[G.q];
    if (!q || q.k !== k || q.a !== a)
        return;
    if (k === 'k' && ++G.qc < q.n) {
        lg('Úloha kapitoly: ' + G.qc + '/' + q.n);
        return;
    }
    G.qd = 1;
}
