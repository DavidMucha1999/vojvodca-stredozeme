/*
 * Nastavenia hry (hlavné menu → Nastavenia, na mape panel Nastavenia → Nastavenia hry), zálohy automatického ukladania a tipy pri prvom vstupe.
 *   Hlasitosť hudby, zvukov boja a prostredia zvlášť, krv v bitke, kvalita grafiky (nízka = menej častíc pre slabší počítač),
 *   obťažnosť (ľahká: tvoja strana dostáva o štvrtinu menšie zranenia, ťažká: o štvrtinu väčšie). Ukladá sa v prehliadači (OPT, localStorage vsOpt).
 * Automatické ukladanie má tri pozície: koniec dňa, deň predtým, pred dvoma dňami (vsauto, vsauto2, vsauto3).
 * Tipy: pri prvom vstupe do hradu, dediny, krčmy, na trh, k zaujímavému miestu a k obliehaniu sa v okne ukáže krátka rada (G.tips).
 */
Object.entries({ vMus: 1, vSfx: 1, vAmb: 1, fx: 'high', diff: 'normal', gfx: 'high', bsize: 'v', tempo: 'n', view: 'fp', xhair: 'n', autoQ: true, fps: false, mblur: false, dof: true, grain: false }).forEach(([k, v]) => { if (OPT[k] == null) OPT[k] = v; });
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
/** Nastavenia po skupinách: { t: názov skupiny, items: [{ l: krátky názov, v: () => hodnota, fn: zmena, tip: vysvetlenie }] }. */
function optGroups() {
    const set = (k, v) => { OPT[k] = v; saveOpt(); applyVol(); };
    const yn = b => b ? 'áno' : 'nie', vol = k => () => volPct(OPT[k]);
    return [
        { t: 'Zvuk', items: [
            { l: 'Hudba', v: vol('vMus'), fn: () => set('vMus', nextVol(OPT.vMus)), tip: 'Hlasitosť hudby (kliknutím znižuješ po krokoch).' },
            { l: 'Zvuky boja', v: vol('vSfx'), fn: () => set('vSfx', nextVol(OPT.vSfx)), tip: 'Hlasitosť úderov, zbraní a výkrikov.' },
            { l: 'Prostredie', v: vol('vAmb'), fn: () => set('vAmb', nextVol(OPT.vAmb)), tip: 'Hlasitosť dažďa, vetra a ruchu okolia.' }
        ] },
        { t: 'Hra', items: [
            { l: 'Obťažnosť', v: () => DIFF_N[OPT.diff], fn: () => set('diff', { easy: 'normal', normal: 'hard', hard: 'easy' }[OPT.diff] || 'normal'), tip: 'Mení zranenia tvojej strany: ľahká −25 %, ťažká +25 %.' },
            { l: 'Krv v bitke', v: () => yn(OPT.blood), fn: () => set('blood', !OPT.blood), tip: 'Krvavé stopy a škvrny v bitke.' },
            { l: 'Výdrž', v: () => OPT.noStam !== false ? 'vypnutá' : 'zapnutá', fn: () => set('noStam', OPT.noStam === false), tip: 'Bez výdrže ako vo Warbande; so zapnutou výdržou je boj ťažší.' },
            { l: 'Smer krytu', v: () => OPT.blkDir === 'manual' ? 'myšou' : 'auto', fn: () => set('blkDir', OPT.blkDir === 'manual' ? 'auto' : 'manual'), tip: 'Myšou: kryt smeruješ pohybom myši k úderu (ako Warband).' },
            { l: 'Zásahy vlastných', v: () => yn(OPT.ff !== false), fn: () => set('ff', OPT.ff === false), tip: 'Ako vo Warbande: šípy aj tvoje údery zhora a body môžu zraniť vlastných vojakov v ceste.' },
            { l: 'Pauza pri údere', v: () => OPT.hitstop ? 'áno' : 'nie', fn: () => set('hitstop', !OPT.hitstop), tip: 'Krátke zastavenie obrazu pri ťažkom údere. Vypnuté = plynulejší boj.' }
        ] },
        { t: 'Bitka', items: [
            { l: 'Grafika', v: () => ({ low: 'nízka', med: 'stredná', high: 'vysoká', ultra: 'ultra' }[OPT.gfx] || 'vysoká'), fn: () => set('gfx', { low: 'med', med: 'high', high: 'ultra', ultra: 'low' }[OPT.gfx] || 'ultra'), tip: 'Nízka je najrýchlejšia, ultra potrebuje silný počítač.' },
            { l: 'Pohľad v bitke', v: () => OPT.view === 'tp' ? 'z tretej osoby' : 'z prvej osoby', fn: () => set('view', OPT.view === 'tp' ? 'fp' : 'tp'), tip: 'Bitka začne v pohľade z prvej osoby (ako Warband). Pohľad môžeš počas boja prepnúť klávesom kamery.' },
            { l: 'Zameriavač', v: () => ({ s: 'malý', n: 'normálny', off: 'vypnutý' }[OPT.xhair] || 'normálny'), fn: () => set('xhair', { s: 'n', n: 'off', off: 's' }[OPT.xhair] || 'off'), tip: 'Bodka v strede obrazovky. Pri kopiji zčervenie, keď je nepriateľ v dosahu.' },
            { l: 'Tempo boja', v: () => ({ s: 'pomalé', n: 'normálne', r: 'rýchle' }[OPT.tempo] || 'normálne'), fn: () => set('tempo', { s: 'n', n: 'r', r: 's' }[OPT.tempo] || 'r'), tip: 'Rýchlosť pohybu aj úderov v bitke. Normálne je pokojnejšie, rýchle je pôvodné tempo.' },
            { l: 'Veľkosť bitky', v: () => ({ n: 'normálna', v: 'veľká', o: 'obrovská' }[OPT.bsize] || 'veľká'), fn: () => set('bsize', { n: 'v', v: 'o', o: 'n' }[OPT.bsize] || 'o'), tip: 'Normálna do 150 vojakov, veľká do 350, obrovská 500 a viac.' },
            { l: 'Auto kvalita', v: () => yn(OPT.autoQ !== false), fn: () => set('autoQ', OPT.autoQ === false), tip: 'Pri nízkom počte snímok za sekundu sama zníži kvalitu, aby bola hra plynulá.' },
            { l: 'Nálet kamery', v: () => yn(OPT.intro3d !== false), fn: () => set('intro3d', OPT.intro3d === false), tip: 'Filmový pohyb kamery na začiatku bitky.' },
            { l: 'Mierenie', v: () => OPT.aimMode === 'ground' ? 'kurzor' : 'zameriavač', fn: () => set('aimMode', OPT.aimMode === 'ground' ? 'look' : 'ground'), tip: 'Kurzor: mieriš kurzorom na zem. Zameriavač: myš otáča kameru, zameriavač je v strede (ako Warband).' },
            { l: 'Ukazovateľ úderu', v: () => yn(OPT.tell !== false), fn: () => set('tell', OPT.tell === false), tip: 'Šípky okolo zameriavača ukazujú smer chystaného úderu.' },
            { l: 'Kompas v bitke', v: () => yn(OPT.compass !== false), fn: () => set('compass', OPT.compass === false), tip: 'Pás hore ukazuje svetové strany, nepriateľov (červené) a tvojich (modré); šípka na okraji ukáže najbližšieho nepriateľa mimo záberu.' },
            { l: 'Krúžok pod cieľom', v: () => yn(OPT.tgMark !== false), fn: () => set('tgMark', OPT.tgMark === false), tip: 'Súper pod zameriavačom má pod nohami červený krúžok.' }
        ] },
        { t: 'Obraz', items: [
            { l: 'Počítadlo FPS', v: () => yn(OPT.fps), fn: () => set('fps', !OPT.fps), tip: 'Zobrazí počet snímok za sekundu (aktuálny, priemer a najhorší 1 %) na mape aj v bitke.' },
            { l: 'Rozmazanie', v: () => yn(OPT.mblur), fn: () => set('mblur', !OPT.mblur), tip: 'Jemné rozmazanie rýchlych pohybov.' },
            { l: 'Hĺbka ostrosti', v: () => yn(OPT.dof !== false), fn: () => set('dof', OPT.dof === false), tip: 'Rozostrenie pozadia vo foto režime a pri spomalení.' },
            { l: 'Vyhladenie (TAA)', v: () => OPT.taa === true ? 'áno' : OPT.taa === false ? 'nie' : 'len ultra', fn: () => set('taa', OPT.taa === true ? false : OPT.taa === false ? null : true), tip: 'Časové vyhladenie hrán obrazu.' },
            { l: 'Filmové zrno', v: () => yn(OPT.grain), fn: () => set('grain', !OPT.grain), tip: 'Jemné zrno na obraze.' },
            { l: 'Efekty', v: () => lowFx() ? 'nízke' : 'vysoké', fn: () => set('fx', lowFx() ? 'high' : 'low'), tip: 'Nízke vypne prach, dym a časť častíc – pomôže slabšiemu počítaču.' }
        ] }
    ];
}
/** Plochý zoznam položiek (text + zmena), napr. pre testy. */
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
/** Okno nastavení počas hry: skupiny s nadpisom, krátke tlačidlá názov: hodnota (bez ikoniek). */
function gameSettings(back) {
    const fromMap = !back;
    if (fromMap) { if (mode !== 'map' && mode !== 'town') return; back = () => { ov.classList.add('hide'); mode = 'map'; }; }
    mode = 'town';
    show('Nastavenia hry', 'Klikni na položku a jej hodnota sa zmení.');
    ov.dataset.screen = 'settings';   // bohatá obrazovka Voľby (js/engine/scenes/UIRich.js)
    for (const g of optGroups()) {
        row(g.t, { gold: 1 });
        g.items.forEach(i => btn(i.l + ': ' + i.v(), () => { i.fn(); gameSettings(fromMap ? null : back); }, 0));
    }
    row('Ovládanie', { gold: 1 });
    btn('Klávesy a ovládač…', () => controls(() => gameSettings(fromMap ? null : back)), 0);
    btn(fromMap ? 'Zavrieť' : 'Späť', back, 0, 'back');
}
// hlavné menu: rovnaké položky v paneli Nastavenia (js/ui/menu.js)
if (typeof mnSettings === 'function') {
    /** Štýl prehľadného panelu nastavení (raz). */
    const setCss = () => {
        if (document.getElementById('setCss')) return;
        const st = document.createElement('style'); st.id = 'setCss';
        st.textContent = '.set{max-height:58vh;overflow-y:auto;margin:.4rem 0;padding-right:.4rem;text-align:left}'
            + '.set h3{margin:.7rem 0 .25rem;font-size:.82rem;letter-spacing:.14em;text-transform:uppercase;color:#d9a441;border-bottom:1px solid rgba(217,164,65,.35);padding-bottom:.15rem}'
            + '.set-g{display:grid;grid-template-columns:1fr 1fr;gap:.15rem .9rem}'
            + '.set-r{display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.12rem .25rem;border-radius:3px}'
            + '.set-r:hover{background:rgba(217,164,65,.1)}'
            + '.set-r span{font-size:.86rem;opacity:.92}'
            + '.set-r button{min-width:6.2rem;padding:.14rem .5rem;font:inherit;font-size:.8rem;color:#f3dc9a;background:#2e2012;border:1px solid #b08a3a;border-radius:3px;cursor:pointer}'
            + '.set-r button:hover{background:#4e3618;color:#fff4d0}'
            + '@media(max-width:700px){.set-g{grid-template-columns:1fr}}';
        document.head.appendChild(st);
    };
    mnSettings = function () {
        setCss();
        mnPanel('Nastavenia', '<p style="margin:.2rem 0 0;font-size:.85rem;opacity:.85">Kliknutím na hodnotu ju zmeníš. Zvuk a hudbu prepneš aj tlačidlom Zvuk na mape.</p><div class="set"></div>', [
            ['Zvuk: ' + (mu ? 'vypnutý' : 'zapnutý'), b => { mu = !mu; b.textContent = 'Zvuk: ' + (mu ? 'vypnutý' : 'zapnutý'); if (!mu) uiSnd('click'); }],
            ['Ovládanie', () => mnControls()],
            ['Celá obrazovka', () => fsc()],
            ['Späť', () => mnShow('mn')]]);
        const box = document.querySelector('#mnPanel .set'); if (!box) return;
        for (const g of optGroups()) {
            const h = document.createElement('h3'); h.textContent = g.t; box.appendChild(h);
            const grid = document.createElement('div'); grid.className = 'set-g'; box.appendChild(grid);
            for (const i of g.items) {
                const r = document.createElement('div'); r.className = 'set-r'; if (i.tip) r.title = i.tip;
                const l = document.createElement('span'); l.textContent = i.l;
                const b = document.createElement('button'); b.type = 'button'; b.textContent = i.v();
                b.onclick = () => { uiSnd('click'); i.fn(); b.textContent = i.v(); };
                r.append(l, b); grid.appendChild(r);
            }
        }
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
