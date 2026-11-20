/*
 * Príbeh: zobrazenie, plnenie a kontrola kapitol.
 */
/** Prvé kroky nezávislého hrdinu v Kraji: boj na dosah, potom Bree, až potom list do Rivendellu. */
const INTRO_Q = [
    { t: 'Pri ceste z Kraja číha tlupa lupičov. Poraž ju, kým dorazí k dedinám.', k: 'k', a: 9, r: 40 },
    { t: 'Cesta je voľná. Zastav sa v Bree a povedz, že lupiči sú preč.', k: 'v', a: 'Bree', r: 30 }
];
const COMPASS = ['východ', 'juhovýchod', 'juh', 'juhozápad', 'západ', 'severozápad', 'sever', 'severovýchod'];
/** Aktuálny cieľ pre hráča (riadok na mape): úvodné kroky ukážu vzdialenosť a svetovú stranu cieľa, ďalej prvá veta kapitoly príbehu. */
function goalText() {
    const at = o => { const dx = o.x - G.x, dy = o.y - G.y, d = Math.round(Math.hypot(dx, dy) / K), a = Math.round(Math.atan2(dy, dx) / (Math.PI / 4) + 8) % 8; return d < 12 ? ' – už je blízko' : ' – ' + d + ' míľ na ' + COMPASS[a]; };
    if (G.intro === 0) { const b = E.find(e => e.kind === 'bandit' && !e.dead && e.nm === 'Lupiči z Kraja'); return 'Cieľ: poraž lupičov z Kraja' + (b ? at(b) : ''); }
    if (G.intro === 1) { const t = TW.find(x => x.n === 'Bree'); return 'Cieľ: zastav sa v Bree' + (t ? at(t) : ''); }
    const q = QS[G.q]; if (!q || !q.t) return '';
    const s = q.t.split(/(?<=[.!?])\s/)[0]; return 'Cieľ: ' + (s.length > 78 ? s.slice(0, 75) + '…' : s);
}
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
