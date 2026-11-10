/*
 * Nastavenia hry (hlavné menu → Nastavenia, na mape panel Nastavenia → Nastavenia hry), zálohy automatického ukladania a tipy pri prvom vstupe.
 *   Hlasitosť hudby, zvukov boja a prostredia zvlášť, krv v bitke, kvalita grafiky (nízka = menej častíc pre slabší počítač),
 *   obťažnosť (ľahká: tvoja strana dostáva o štvrtinu menšie zranenia, ťažká: o štvrtinu väčšie). Ukladá sa v prehliadači (OPT, localStorage vsOpt).
 * Automatické ukladanie má tri pozície: koniec dňa, deň predtým, pred dvoma dňami (vsauto, vsauto2, vsauto3).
 * Tipy: pri prvom vstupe do hradu, dediny, krčmy, na trh, k zaujímavému miestu a k obliehaniu sa v okne ukáže krátka rada (G.tips).
 */
Object.entries({ vMus: 1, vSfx: 1, vAmb: 1, fx: 'high', diff: 'normal', gfx: 'high', bsize: 'v', autoQ: true, fps: false, mblur: false, dof: true, grain: false }).forEach(([k, v]) => { if (OPT[k] == null) OPT[k] = v; });
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
        [() => 'Bitka: ' + (OPT.b3d === false ? '2D (pohľad zhora)' : '3D (pohľad za hrdinom)'), () => set('b3d', OPT.b3d === false)],
        [() => 'Grafika 3D bitky: ' + ({ low: 'nízka (najrýchlejšia)', med: 'stredná', high: 'vysoká', ultra: 'ultra (silný počítač)' }[OPT.gfx] || 'vysoká'), () => set('gfx', { low: 'med', med: 'high', high: 'ultra', ultra: 'low' }[OPT.gfx] || 'ultra')],
        [() => 'Veľkosť bitiek: ' + ({ n: 'normálna (do 150 vojakov)', v: 'veľká (do 350 vojakov)', o: 'obrovská (500 a viac vojakov)' }[OPT.bsize] || 'veľká'), () => set('bsize', { n: 'v', v: 'o', o: 'n' }[OPT.bsize] || 'o')],
        [() => 'Automatická kvalita 3D (udrží plynulosť): ' + (OPT.autoQ === false ? 'nie' : 'áno'), () => set('autoQ', OPT.autoQ === false)],
        [() => 'Počítadlo snímok (FPS): ' + (OPT.fps ? 'áno' : 'nie'), () => set('fps', !OPT.fps)],
        [() => 'Rozmazanie pohybu: ' + (OPT.mblur ? 'áno' : 'nie'), () => set('mblur', !OPT.mblur)],
        [() => 'Hĺbka ostrosti (foto režim a spomalenie): ' + (OPT.dof === false ? 'nie' : 'áno'), () => set('dof', OPT.dof === false)],
        [() => 'Zastavenie obrazu pri ťažkom údere: ' + (OPT.hitstop ? 'áno' : 'nie (plynulejší boj)'), () => set('hitstop', !OPT.hitstop)],
        [() => 'Časové vyhladenie obrazu (TAA): ' + (OPT.taa === true ? 'áno' : OPT.taa === false ? 'nie' : 'len na ultra'), () => set('taa', OPT.taa === true ? false : OPT.taa === false ? null : true)],
        [() => 'Telá postáv z modelov (Meshy): ' + (OPT.modelHuman === false ? 'tvarované kódom' : 'model (Meshy)'), () => set('modelHuman', OPT.modelHuman === false)],
        [() => 'Filmové zrno: ' + (OPT.grain ? 'áno' : 'nie'), () => set('grain', !OPT.grain)],
        [() => 'Nálet kamery na začiatku bitky: ' + (OPT.intro3d === false ? 'nie' : 'áno'), () => set('intro3d', OPT.intro3d === false)],
        [() => 'Mierenie v 3D: ' + (OPT.aimMode === 'ground' ? 'kurzorom na zem' : 'ako vo Warbande (myš otáča kameru, zameriavač v strede)'), () => set('aimMode', OPT.aimMode === 'ground' ? 'look' : 'ground')],
        [() => 'Výdrž v boji: ' + (OPT.noStam !== false ? 'bez výdrže (ako Warband)' : 'áno (ťažší boj)'), () => set('noStam', OPT.noStam === false)],
        [() => 'Smer krytu: ' + (OPT.blkDir === 'manual' ? 'myšou (ako Warband – pohni myšou k úderu)' : 'automatický'), () => set('blkDir', OPT.blkDir === 'manual' ? 'auto' : 'manual')],
        [() => 'Kvalita grafiky: ' + (lowFx() ? 'nízka (rýchlejšia)' : 'vysoká'), () => set('fx', lowFx() ? 'high' : 'low')],
        [() => 'Obťažnosť: ' + DIFF_N[OPT.diff], () => set('diff', { easy: 'normal', normal: 'hard', hard: 'easy' }[OPT.diff] || 'normal')]
    ];
}
/** Ovládanie: priradenie kláves k akciám (klik → stlač nový kláves). */
function ctlItems() { const K = KB(); return Object.keys(KEYS_DEF).map(a => [() => KEY_N[a] + ': ' + keyName(K[a]) + (CAPTURE && CAPTURE.a === a ? ' … stlač kláves (Esc zruší)' : ''), a]); }
const PAD_TXT = 'Ovládač: ľavá páčka pohyb (aj na mape), pravá mierenie, A alebo RT sek, X bod, RB alebo LT kryt, Y výstrel, B pokrik, LB hradby; kríž: hore Útok, dole Ústup, vľavo Držať, vpravo Šík; Select Za mnou, Start ďalšia skupina.';
function controls(back) {
    mode = 'town';
    show('Ovládanie', 'Klikni na akciu a stlač nový kláves. Pohyb ostáva na WASD a šípkach, skupiny na 1–4. ' + PAD_TXT);
    ctlItems().forEach(([lab, a]) => btn(lab(), () => { CAPTURE = { a, done: () => controls(back) }; controls(back); }, 0, 'key'));
    btn('Obnoviť predvolené klávesy', () => { OPT.keys = {}; saveOpt(); controls(back); }, 0, 'back');
    btn('Späť', back, 0, 'back');
}
/** Okno nastavení počas hry. */
function gameSettings(back) {
    const fromMap = !back;
    if (fromMap) { if (mode !== 'map' && mode !== 'town') return; back = () => { ov.classList.add('hide'); mode = 'map'; }; }
    mode = 'town';
    show('Nastavenia hry', 'Kliknutím na položku ju zmeníš. Obťažnosť mení zranenia, ktoré dostáva tvoja strana (ľahká −25 %, ťažká +25 %). Nízka kvalita grafiky vypne prach, dym a časť častíc. Zvuk úplne vypne tlačidlo Zvuk.');
    optItems().forEach(([lab, fn]) => btn(lab(), () => { fn(); gameSettings(fromMap ? null : back); }, 0, 'gear'));
    btn('Ovládanie (klávesy a ovládač)', () => controls(() => gameSettings(fromMap ? null : back)), 0, 'key');
    btn(fromMap ? 'Zavrieť' : 'Späť', back, 0, 'back');
}
// hlavné menu: rovnaké položky v paneli Nastavenia (js/ui/menu.js)
if (typeof mnSettings === 'function') {
    mnSettings = function () {
        mnPanel('Nastavenia', '<p>Kliknutím na položku ju zmeníš. Obťažnosť mení zranenia tvojej strany (ľahká −25 %, ťažká +25 %); nízka kvalita grafiky pomôže slabšiemu počítaču.' + (DESKTOP ? ' Celá obrazovka: aj F11 alebo Alt+Enter.' : '') + '</p>', [
            ['Zvuk: ' + (mu ? 'vypnutý' : 'zapnutý'), b => { mu = !mu; b.textContent = 'Zvuk: ' + (mu ? 'vypnutý' : 'zapnutý'); }],
            ...optItems().map(([lab, fn]) => [lab(), b => { fn(); b.textContent = lab(); }]),
            ['Ovládanie', () => mnControls()],
            ['Celá obrazovka', () => fsc()],
            ['Späť', () => mnShow('mn')]]);
    };
    const sb = document.getElementById && document.getElementById('mnSet'); if (sb) sb.onclick = () => { uiSnd('click'); mnSettings(); };
}
/** Ovládanie v hlavnom menu (panel). */
function mnControls() {
    mnPanel('Ovládanie', '<p>Klikni na akciu a stlač nový kláves (Esc zruší). Pohyb ostáva na WASD a šípkach, skupiny na 1–4.</p><p>' + PAD_TXT + '</p>', [
        ...ctlItems().map(([lab, a]) => [lab(), b => { CAPTURE = { a, done: () => { b.textContent = lab(); } }; b.textContent = lab(); }]),
        ['Obnoviť predvolené', () => { OPT.keys = {}; saveOpt(); mnControls(); }],
        ['Späť', () => mnSettings()]]);
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
// osobné úlohy spoločníkov sa plnia pri vstupe do hradu (js/sim/fellowship.js)
if (typeof town === 'function') { const t0 = town; town = function (i) {
    const r = t0.apply(this, arguments);
    try {
        const t = TW[i];
        if (t && !hos(t.f, G.fac) && !ov.classList.contains('hide')) {
            compQuestVisit(t.n).forEach(s => row(s, { color: '#9fe08a' }));   // osobné úlohy spoločníkov
            sqVisit(t.n, () => town(i));                                        // vedľajšie výpravy (js/sim/sidequests.js)
            if (PORTS[t.n] && portsFrom(i).length) btn('Prístav – plavba loďou', () => portMenu(i), 0, 'map');   // plavba (js/sim/voyage.js)
        }
    } catch (e) { }
    return r;
}; }
if (typeof place === 'function') { const p0 = place; place = function (i, inScene) { const r = p0.apply(this, arguments); try { if (!ov.classList.contains('hide') && PLACES[i]) sqVisit(PLACES[i].n, inScene != null ? () => { ov.classList.add('hide'); mode = 'room'; } : () => { ov.classList.add('hide'); mode = 'map'; }); } catch (e) { } return r; }; }
if (typeof questLog === 'function') { const q0 = questLog; questLog = function () { const r = q0.apply(this, arguments); try { if (mode === 'town') sqLogRows(); } catch (e) { } return r; }; }
if (typeof market === 'function') { const m0 = market; market = function () { const r = m0.apply(this, arguments); tip('market', 'kupuj tovar tam, kde ho je veľa (lacno), a predávaj tam, kde chýba. Pestré jedlo dvíha morálku družiny.'); return r; }; }
