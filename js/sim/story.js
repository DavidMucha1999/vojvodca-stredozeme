/*
 * Príbeh: zobrazenie, plnenie a kontrola kapitol.
 */
function qShow() {
    const q = QS[G.q];
    if (q) {
        mode = 'town';
        show('Príbeh: kapitola ' + (G.q + 1), q.t);
        btn('Na cestu', () => { ov.classList.add('hide'); mode = 'map'; });
    }
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
    const q = QS[G.q];
    if (!q || q.k !== k || q.a !== a)
        return;
    if (k === 'k' && ++G.qc < q.n) {
        lg('Úloha kapitoly: ' + G.qc + '/' + q.n);
        return;
    }
    G.qd = 1;
}
