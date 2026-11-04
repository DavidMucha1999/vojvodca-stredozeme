/*
 * Vedľajšie výpravy (reťaze úloh) podľa krajov a rás. Začínajú pri návšteve miesta (hrad alebo zaujímavé miesto),
 * každý krok sa splní návštevou ďalšieho miesta, keď je splnená podmienka (víťazstvá proti frakcii, porazený boss…),
 * a na konci si vyberieš, ako príbeh dopadne. Stav: G.sq = { id: { s: krok, done } }, víťazstvá proti frakciám G.wf.
 */
const wonVs = f => ((G.wf || {})[f] || 0);
const CHAINS = [
    { id: 'kraj', n: 'Tiene nad Krajom', side: null, steps: [
        { at: 'Hobitov', t: 'Sedliaci v Hobitove hovoria o cudzích jazdcoch a vypálenej stodole. Vraj ich videli na ceste k Bree.', hint: 'Zisti v Bree, kto sú tí jazdci.' },
        { at: 'Bree', t: 'Hostinský z Bree stíši hlas: „To sú lupiči spod Vetrov. Platia mi, aby som mlčal. Ty mi zaplať tým, že ich rozoženieš.“', hint: 'Poraz tlupu lupičov a vráť sa do Hobitova.', start: () => ({ w: wonVs(9) }) },
        { at: 'Hobitov', need: st => wonVs(9) > st.w, needT: 'Najprv poraz aspoň jednu tlupu lupičov.', t: 'Hobiti ti ďakujú pri plnom stole. Starosta sa pýta, ako ochrániť Kraj nabudúce.', choices: [
            ['Postaviť hliadky (prosperita Hobitova +20, česť +3)', () => { const t = TW[portIdx('Hobitov')]; if (t) t.pr = Math.min(100, (t.pr ?? 40) + 20); G.hon = (G.hon || 0) + 3; return 'Hraničiari z Kraja dostali nové rohy a lucerny. Kraj spí pokojne.'; }],
            ['Naverbovať odvážnych hobitov (+8 pešiakov)', () => { G.inf += 8; return 'Osem hobitov si obulo čižmy – a to sa v Kraji nevidí každý deň.'; }]] }] },
    { id: 'moria', n: 'Hlas z hlbín', side: 0, steps: [
        { at: 'Erebor', t: 'Starý trpaslík Lóni ťa prosí: „Z Morie už roky neprišla žiadna správa. Choď k Bráne Morie a zisti, čo tam žije.“', hint: 'Choď k Bráne Morie (zaujímavé miesto pri Morii).' },
        { at: 'Brána Morie', t: 'Z hlbín duní kroky a vzduch páli ako z vyhne. V Morii sa prebudil Balrog.', hint: 'Poraz Balroga, alebo zapečať bránu, a vráť sa do Ereboru.', choices: [
            ['Vstúpiť do hlbín a bojovať (boss: Balrog)', () => { setTimeout(() => { ov.classList.add('hide'); bossBattle('balrog'); }, 0); return null; }, 1],
            ['Zapečatiť bránu kameňmi (Erebor vzťah +10, sláva +2)', () => { G.sqSealed = 1; rl(G.fac, 5, 10); G.ren += 2; return 'Brána je zavalená. Čo je dole, ostane dole – aspoň zatiaľ. Vráť sa s touto správou do Ereboru.'; }, 1]] },
        { at: 'Erebor', need: () => relic('balrog') || G.sqSealed, needT: 'Lóni čaká na správy z Morie.', t: 'Lóni počúva tvoju správu so slzami v očiach. Celý Erebor ti ďakuje.', choices: [
            ['Prijať dar Ereboru (+300 zlata)', () => { G.gold += 300; return 'Truhlica plná trpasličieho zlata je tvoja.'; }],
            ['Požiadať o trpasličích bojovníkov (+6 veteránov)', () => { G.vet += 6; return 'Šesť ostrieľaných trpaslíkov sa pripojilo k tvojej družine.'; }]] }] },
    { id: 'dale', n: 'Dym nad horami', side: null, steps: [
        { at: 'Dale', t: 'Pastieri zo severu hlásia, že stáda miznú a hory dymia. Na Dračej hore sa usadil drak Hrôzozub.', hint: 'Poraz draka na Dračej hore a vráť sa do Dale.' },
        { at: 'Dale', need: () => relic('dragon'), needT: 'Drak na Dračej hore ešte žije.', t: 'Mesto Dale oslavuje. Mešťania sa pýtajú, čo bude s dračím pokladom.', choices: [
            ['Darovať časť pokladu mestu (−500 zlata, česť +5, prosperita Dale +30)', () => { G.gold -= 500; G.hon = (G.hon || 0) + 5; const t = TW[portIdx('Dale')]; if (t) t.pr = Math.min(100, (t.pr ?? 40) + 30); return 'Z dračieho zlata postavia nový most a sýpky. Na tvoje meno sa pripíja v každej krčme.'; }],
            ['Nechať si celý poklad (vzťah s Dale −10)', () => { rl(G.fac, 5, -10); return 'Zlato je tvoje. Mešťania sa však za tebou dívajú chladne.'; }]] }] },
    { id: 'korzari', n: 'Čierne plachty', side: 0, steps: [
        { at: 'Pelargir', t: 'Korzári z Umbaru pália pobrežie Lebenninu. Kapitán prístavu prosí o pomoc.', hint: 'Poraz armádu Haradu (alebo korzárov) a vráť sa do Pelargiru.', start: () => ({ w: wonVs(4) }) },
        { at: 'Pelargir', need: st => wonVs(4) > st.w, needT: 'Najprv poraz armádu Haradu alebo korzárov.', t: 'Pobrežie sa spamätáva. Kapitán ponúka dve cesty.', choices: [
            ['Vylodiť sa pri Umbare (plavba zadarmo)', () => { const i = portIdx('Pelargir'), j = portIdx('Umbar'); if (i >= 0 && j >= 0) { const r = sail(i, j, 1); return r.text; } return 'Umbar nie je na mape.'; }],
            ['Opevniť pobrežie (−200 zlata, posádka Pelargiru +15)', () => { G.gold -= 200; const t = TW[portIdx('Pelargir')]; if (t) t.g += 15; return 'Na útesoch horia strážne ohne a korzári sa radšej držia ďalej.'; }]] }] },
    { id: 'umbar', n: 'Prístav tieňov', side: 1, steps: [
        { at: 'Umbar', t: 'Gondorské lode blokujú prístav Umbaru. Kapitáni korzárov chcú, aby niekto ukázal Gondoru silu.', hint: 'Poraz armádu Gondoru a vráť sa do Umbaru.', start: () => ({ w: wonVs(0) }) },
        { at: 'Umbar', need: st => wonVs(0) > st.w, needT: 'Najprv poraz armádu Gondoru.', t: 'Blokáda je prelomená. Korzári ťa oslavujú na móle.', choices: [
            ['Plieniť pobrežie Gondoru (+400 zlata, strach +3)', () => { G.gold += 400; G.fear = (G.fear || 0) + 3; return 'Čierne plachty sa vrátili s plnými podpalubiami.'; }],
            ['Postaviť flotilu (posádka Umbaru +15, vzťah s Haradom +10)', () => { const t = TW[portIdx('Umbar')]; if (t) t.g += 15; rl(G.fac, 4, 10); return 'V dokoch Umbaru sa spúšťajú nové lode.'; }]] }] }
];
/** Návšteva miesta name: začne, posunie alebo dokončí výpravy. Pridá riadky a voľby do otvoreného okna. back = návrat do okna. */
function sqVisit(name, back) {
    G.sq = G.sq || {};
    for (const C of CHAINS) {
        if (C.side != null && heroSide() !== C.side) continue;
        let st = G.sq[C.id];
        if (st && st.done) continue;
        if (!st) { if (C.steps[0].at !== name) continue; st = G.sq[C.id] = { s: 0 }; lg('Nová výprava: ' + C.n + '.'); }
        const S = C.steps[st.s];
        if (!S || S.at !== name) continue;
        if (S.need && !S.need(st)) { row(C.n + ': ' + S.needT, { color: '#ffd24a' }); continue; }
        rowHead('Výprava: ' + C.n);
        row(S.t);
        if (S.choices) {
            S.choices.forEach(([lab, fn, keep]) => btn(lab, () => { if (!keep) { st.done = G.day; lg('Výprava dokončená: ' + C.n + '.'); } else st.s++; const m = fn(); upd(); if (m) msg(m, back); }, 0, 'quest'));
        } else {
            if (S.start) Object.assign(st, S.start());
            st.s++;
            if (st.s >= C.steps.length) st.done = G.day;
            else if (S.hint) row('Ďalej: ' + S.hint, { color: '#9fe08a' });
        }
    }
}
/** Riadky do okna Úlohy: rozbehnuté výpravy a čo ďalej. */
function sqLogRows() {
    for (const C of CHAINS) { const st = (G.sq || {})[C.id]; if (!st || st.done) continue; const S = C.steps[st.s], P = C.steps[st.s - 1]; if (S) { rowHead('Výprava: ' + C.n); row((P && P.hint) || ('Choď do ' + S.at + '.')); } }
}
