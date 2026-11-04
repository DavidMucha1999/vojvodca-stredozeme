/*
 * Nastavenia hry (hlavné menu → Nastavenia, na mape panel Nastavenia → Nastavenia hry), zálohy automatického ukladania a tipy pri prvom vstupe.
 *   Hlasitosť hudby, zvukov boja a prostredia zvlášť, krv v bitke, kvalita grafiky (nízka = menej častíc pre slabší počítač),
 *   obťažnosť (ľahká: tvoja strana dostáva o štvrtinu menšie zranenia, ťažká: o štvrtinu väčšie). Ukladá sa v prehliadači (OPT, localStorage vsOpt).
 * Automatické ukladanie má tri pozície: koniec dňa, deň predtým, pred dvoma dňami (vsauto, vsauto2, vsauto3).
 * Tipy: pri prvom vstupe do hradu, dediny, krčmy, na trh, k zaujímavému miestu a k obliehaniu sa v okne ukáže krátka rada (G.tips).
 */
Object.entries({ vMus: 1, vSfx: 1, vAmb: 1, fx: 'high', diff: 'normal' }).forEach(([k, v]) => { if (OPT[k] == null) OPT[k] = v; });
const DIFF_N = { easy: 'ľahká', normal: 'normálna', hard: 'ťažká' }, DIFF_MUL = () => ({ easy: .75, normal: 1, hard: 1.25 })[OPT.diff] || 1;
const lowFx = () => OPT.fx === 'low';
/** Hlasitosti do zvukových zberníc (syntetizátor, prostredie, hudba zo súborov). */
function applyVol() {
    try {
        if (typeof MB !== 'undefined' && MB) MB.gain.value = .5 * OPT.vMus;
        if (typeof SB !== 'undefined' && SB) SB.gain.value = .8 * OPT.vSfx;
        if (typeof AMB !== 'undefined' && AMB && AMB.g) AMB.g.gain.value = .9 * OPT.vAmb;
        if (typeof musicNow !== 'undefined' && musicNow && musicNow.isPlaying && musicNow.volume > .01) musicNow.setVolume(.5 * OPT.vMus);
    } catch (e) { }
}
if (typeof setInterval === 'function') setInterval(applyVol, 1500);
const volPct = v => Math.round(v * 100) + ' %';
const nextVol = v => [1, .75, .5, .25, 0][([1, .75, .5, .25, 0].indexOf(v) + 1) % 5];
/** Položky nastavení: [text, po kliknutí vráti nový text]. */
function optItems() {
    const set = (k, v) => { OPT[k] = v; saveOpt(); applyVol(); };
    return [
        [() => 'Hudba: ' + volPct(OPT.vMus), () => set('vMus', nextVol(OPT.vMus))],
        [() => 'Zvuky boja: ' + volPct(OPT.vSfx), () => set('vSfx', nextVol(OPT.vSfx))],
        [() => 'Prostredie (dážď, vietor): ' + volPct(OPT.vAmb), () => set('vAmb', nextVol(OPT.vAmb))],
        [() => 'Krv v bitke: ' + (OPT.blood ? 'áno' : 'nie'), () => set('blood', !OPT.blood)],
        [() => 'Kvalita grafiky: ' + (lowFx() ? 'nízka (rýchlejšia)' : 'vysoká'), () => set('fx', lowFx() ? 'high' : 'low')],
        [() => 'Obťažnosť: ' + DIFF_N[OPT.diff], () => set('diff', { easy: 'normal', normal: 'hard', hard: 'easy' }[OPT.diff] || 'normal')]
    ];
}
/** Okno nastavení počas hry. */
function gameSettings(back) {
    const fromMap = !back;
    if (fromMap) { if (mode !== 'map' && mode !== 'town') return; back = () => { ov.classList.add('hide'); mode = 'map'; }; }
    mode = 'town';
    show('Nastavenia hry', 'Kliknutím na položku ju zmeníš. Obťažnosť mení zranenia, ktoré dostáva tvoja strana (ľahká −25 %, ťažká +25 %). Nízka kvalita grafiky vypne prach, dym a časť častíc. Zvuk úplne vypne tlačidlo Zvuk.');
    optItems().forEach(([lab, fn]) => btn(lab(), () => { fn(); gameSettings(fromMap ? null : back); }, 0, 'gear'));
    btn(fromMap ? 'Zavrieť' : 'Späť', back, 0, 'back');
}
// hlavné menu: rovnaké položky v paneli Nastavenia (js/ui/menu.js)
if (typeof mnSettings === 'function') {
    mnSettings = function () {
        mnPanel('Nastavenia', '<p>Kliknutím na položku ju zmeníš. Obťažnosť mení zranenia tvojej strany (ľahká −25 %, ťažká +25 %); nízka kvalita grafiky pomôže slabšiemu počítaču.' + (DESKTOP ? ' Celá obrazovka: aj F11 alebo Alt+Enter.' : '') + '</p>', [
            ['Zvuk: ' + (mu ? 'vypnutý' : 'zapnutý'), b => { mu = !mu; b.textContent = 'Zvuk: ' + (mu ? 'vypnutý' : 'zapnutý'); }],
            ...optItems().map(([lab, fn]) => [lab(), b => { fn(); b.textContent = lab(); }]),
            ['Celá obrazovka', () => fsc()],
            ['Späť', () => mnShow('mn')]]);
    };
    const sb = document.getElementById && document.getElementById('mnSet'); if (sb) sb.onclick = () => { uiSnd('click'); mnSettings(); };
}
/** Pred dennou automatickou pozíciou sa staršie posunú: vsauto → vsauto2 → vsauto3. */
function rotateAutosaves() {
    try { const a2 = STORE.getItem('vsauto2'), a1 = STORE.getItem('vsauto'); if (a2) STORE.setItem('vsauto3', a2); if (a1) STORE.setItem('vsauto2', a1); } catch (e) { }
}
/** Tip pri prvom vstupe (riadok na konci okna). */
function tip(id, s) {
    if (!G || (G.tips = G.tips || {})[id]) return;
    G.tips[id] = 1;
    try { row('Tip: ' + s, { color: '#9fe08a' }); } catch (e) { }
}
const TIPS = {
    town: ['town', 'v hrade verbuješ vojakov, kupuješ výbavu u kováča a jedlo na trhu. V krčme čakajú spoločníci a krčmár vie, čo sa deje vo svete.'],
    vill: ['vill', 'v dedine kúpiš lacné jedlo a naverbuješ dobrovoľníkov. Vyplienenie prinesie zlato, ale stojí česť a vzťahy.'],
    tavern: ['tavern', 'spoločníci bojujú po tvojom boku, zbierajú skúsenosti a dajú sa posadiť na koňa (Družina → Spoločníci).'],
    place: ['place', 'zaujímavé miesta ponúkajú jedinečné udalosti – niektoré liečia, iné skúšajú odvahu.'],
    siegeMenu: ['siege', 'na útok potrebuješ rebríky alebo vežu; čakanie oslabí posádku hladom. Spojenci z tábora bojujú s tebou.']
};
Object.entries(TIPS).forEach(([fn, [id, s]]) => {
    if (typeof window === 'undefined' || typeof window[fn] !== 'function') return;
    const f0 = window[fn];
    window[fn] = function () { const r = f0.apply(this, arguments); tip(id, s); return r; };
});
if (typeof market === 'function') { const m0 = market; market = function () { const r = m0.apply(this, arguments); tip('market', 'kupuj tovar tam, kde ho je veľa (lacno), a predávaj tam, kde chýba. Pestré jedlo dvíha morálku družiny.'); return r; }; }
