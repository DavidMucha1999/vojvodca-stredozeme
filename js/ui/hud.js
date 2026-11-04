/*
 * Horná lišta so stavom hrdinu.
 */
function upd() {
    {
        {
            hud.innerHTML = `<span><b>${G.name}</b>, ${rank()} (${FN[G.fac]})</span><span>Zlato <b>${G.gold}</b></span><span>Pešiaci <b>${G.inf}</b></span><span>Jazdci <b>${G.cav}</b></span><span>Lukostrelci <b>${G.arc}</b></span><span>Elfovia <b>${G.elf}</b></span><span>Rohirimi <b>${G.roh}</b></span><span>Veteráni <b>${G.vet}</b></span><span>Zajatci <b>${G.cap}</b></span><span>Skúsenosti <b>${G.txp}</b></span>${QS[G.q] ? '<span>Kapitola <b>' + (G.q + 1) + '/' + QS.length + '</b></span>' : ''}<span>Zdravie <b>${Math.ceil(G.hp)}/${mh()}</b></span><span>Úroveň <b>${G.lv}</b> (${G.xp}/${G.lv * 30})</span>${G.sk ? '<span><b>Body: ' + G.sk + '</b></span>' : ''}<span>Sláva <b>${G.ren}</b></span><span>Deň <b>${G.day}</b> (${SEASONS[season()]}${MW && MW.n !== 'clear' ? ', ' + WNAME[MW.n] : ''})</span>${cargoCount() ? '<span>Voz <b>' + cargoCount() + '/' + CARGO_MAX + '</b></span>' : ''}${G.qu && G.qu.length ? '<span>Úlohy <b>' + G.qu.length + '</b></span>' : ''}${G.comp && G.comp.length ? '<span>Družina <b>' + myComps().map(c => c.n.split(' ')[0]).join(', ') + '</b></span>' : ''}`;
        }
        const us = uS();
        if (us)
            hud.innerHTML += '<span>Elitné jednotky <b>' + us + '</b></span>';
        if (G.ring === 1)
            hud.innerHTML += '<span style="color:#ffb347">Jeden prsteň: skazenosť <b>' + G.cor + ' %</b></span>';
    }
    if (G.kn) {
        FN[6] = G.kn;
        BF[6] = G.kc;
    }
    { const d = foodDays(), pm = G.pm ?? 60; hud.innerHTML += '<span' + (G.hungry || d < 2 ? ' style="color:#ff7a5a"' : '') + '>Zásoby <b>' + (G.hungry ? 'hlad' : d + ' d') + '</b></span><span' + (pm < 30 ? ' style="color:#ff7a5a"' : '') + '>Morálka <b>' + pm + '</b></span>'; }
    hud.innerHTML += '<span>Česť <b>' + (G.hon || 0) + '</b></span><span>Strach <b>' + (G.fear || 0) + '</b></span>' + (G.camp ? '<span><b>Tábor</b></span>' : '')
        + (G.besiege >= 0 && TW[G.besiege] ? '<span>Obliehanie <b>' + TW[G.besiege].n + '</b></span>' : '') + (G.defend >= 0 && TW[G.defend] ? '<span>Obrana <b>' + TW[G.defend].n + '</b></span>' : '');
    if (typeof timeBtn !== 'undefined') { timeBtn.style.display = waiting() ? '' : 'none'; timeBtn.textContent = 'Čas ×' + (G.tmul || 1); }
    if (G.king && !G.kn && !KD) {
        KD = 1;
        setTimeout(kingDlg, 0);
    }
}
