/*
 * Tvorba postavy na úvodnej obrazovke: strana (dobro/zlo) → frakcia a rasa tej strany → vzhľad (portrét) → povaha → body schopností.
 * Ovládanie sa vloží do úvodného okna (#ov) pod meno; newGame() si výsledok prečíta cez creatorResult().
 * Rasy a ich bonusy: js/data/races.js (RACES). Povahy (TRAITS) dávajú počiatočné bonusy.
 */
const TRAITS = {
    cestny: { n: 'Čestný', d: 'Drží slovo a chráni slabých. Česť +3, lordi dobra ti veria (vzťah +5).', fx: G => { G.hon = (G.hon || 0) + 3; G.trel = 5; } },
    chamtivy: { n: 'Chamtivý', d: 'Zlato je odpoveď na všetko. +120 zlata, ceny u kupcov o 5 % lepšie, česť −1.', fx: G => { G.gold += 120; G.hon = (G.hon || 0) - 1; G.tmerc = 1; } },
    odvazny: { n: 'Odvážny', d: 'Prvý v boji, posledný v ústupe. Sila +1, zdravie +10, strach +1.', fx: G => { G.s.st++; G.hp += 10; G.fear = (G.fear || 0) + 1; } },
    prefikany: { n: 'Prefíkaný', d: 'Slová sú zbraň. Presviedčanie +2, zajatci sa predávajú drahšie.', fx: G => { G.s.pr += 2; G.tcun = 1; } },
    kruty: { n: 'Krutý', d: 'Nepriatelia sa ťa boja skôr, než ťa uvidia. Strach +3, česť −2, +2 pešiaci.', fx: G => { G.fear = (G.fear || 0) + 3; G.hon = (G.hon || 0) - 2; G.inf += 2; } },
    mudry: { n: 'Múdry', d: 'Učí sa z každého dňa. +2 body schopností, skúsenosti rastú o 10 % rýchlejšie.', fx: G => { G.sk += 2; G.twise = 1; } }
};
const CRE = { side: 0, race: 'human', sex: 'm', skin: 0, hair: 'short', hcol: '#4a3020', beard: 'stubble', eyes: '#4a6a8a', eyeShape: 'almond', nose: 'straight', mouth: 'neutral', brows: 'flat', extra: 'none', age: 0, trait: 'cestny', s: { st: 1, od: 1, ob: 1, pr: 1, ls: 1 } };
const CRE_POINTS = 5;
const CRE_OPT = {
    hair: [['short', 'krátke'], ['long', 'dlhé'], ['wavy', 'vlnité'], ['tied', 'zviazané'], ['topknot', 'uzol'], ['curly', 'kučeravé'], ['lank', 'spustené'], ['braids', 'vrkoče'], ['mohawk', 'hrebeň'], ['bald', 'holá hlava']],
    hcol: [['#4a3020', 'hnedé'], ['#2a1a10', 'čierne'], ['#c8a060', 'plavé'], ['#b05a20', 'ryšavé'], ['#8a8a8a', 'šedivé'], ['#e8d8a0', 'svetlé'], ['#f0f0f0', 'biele']],
    beard: [['none', 'bez brady'], ['stubble', 'strnisko'], ['mustache', 'fúzy'], ['goatee', 'briadka'], ['full', 'plná'], ['long', 'dlhá'], ['braided', 'zapletená']],
    eyes: [['#4a6a8a', 'modré'], ['#5a7a5a', 'zelené'], ['#6a4a2a', 'hnedé'], ['#6a7a7a', 'sivé'], ['#e8c040', 'žlté'], ['#c03020', 'červené']],
    eyeShape: [['almond', 'mandľové'], ['round', 'okrúhle'], ['narrow', 'úzke'], ['deep', 'hlboko posadené']],
    nose: [['straight', 'rovný'], ['hooked', 'orlí'], ['wide', 'široký'], ['small', 'malý'], ['flat', 'plochý']],
    mouth: [['neutral', 'pokojné'], ['smile', 'úsmev'], ['stern', 'prísne'], ['thin', 'úzke']],
    brows: [['flat', 'rovné'], ['arched', 'klenuté'], ['thick', 'husté'], ['angry', 'zamračené']],
    extra: [['none', 'nič'], ['scar', 'jazva'], ['warpaint', 'bojové maľovanie'], ['tattoo', 'tetovanie'], ['earring', 'náušnica'], ['eyepatch', 'páska cez oko'], ['paint', 'biela ruka']],
    age: [[0, 'mladý'], [.5, 'zrelý'], [.8, 'starý']]
};
const SKIN_N = { 0: 'svetlá', 1: 'opálená', 2: 'tmavá', 3: 'bledá', '#5f7a4a': 'zelená', '#6a6a52': 'sivozelená', '#4a5a3a': 'tmavozelená', '#3e4a34': 'tmavá uruk', '#4a3a30': 'hnedočierna', '#7a4a2e': 'tmavá', '#5a3a22': 'veľmi tmavá' };
const SKILL_N = { st: 'Sila', od: 'Odolnosť', ob: 'Obratnosť', pr: 'Presviedčanie', ls: 'Lukostreľba' };
const GOOD_F = [6, 0, 1, 5, 8], EVIL_F = [6, 2, 3, 4, 7];
const creLook = () => { const r = RACES[CRE.race] || RACES.human, L = { ...r.look, sex: CRE.sex, skin: CRE.skin, hair: CRE.hair, hcol: CRE.hcol, beard: CRE.sex === 'f' ? 'none' : CRE.beard, eyes: CRE.eyes, eyeShape: CRE.eyeShape, nose: CRE.nose, mouth: CRE.mouth, brows: CRE.brows, age: CRE.age }; delete L.paint; delete L.turban; if (CRE.extra !== 'none') L[CRE.extra] = true; if (CRE.race === 'dark') L.turban = r.look.turban; return L; };

/** Vloží tvorbu postavy do úvodného okna (raz). */
function buildCreator() {
    const fs = document.getElementById('fs');
    if (!fs || document.getElementById('cre') || typeof Portraits === 'undefined') return;
    const box = document.createElement('div'); box.id = 'cre';
    box.innerHTML = '<div class="cre-row cre-side"><span>Strana:</span><button type="button" id="creGood" class="cre-tab">Dobro</button><button type="button" id="creEvil" class="cre-tab">Zlo</button><label>Rasa <select id="creRace"></select></label><button type="button" id="creRnd" class="cre-rnd">⚄ Náhodná postava</button></div>'
        + '<div id="creRaceD" class="cre-note"></div>'
        + '<div class="cre-row"><canvas id="crePor" width="192" height="192"></canvas><div id="creCtl"></div></div>'
        + '<div class="cre-row"><label>Povaha <select id="creTrait"></select></label><div id="creTraitD" class="cre-note"></div></div>'
        + '<div class="cre-row"><span>Schopnosti (voľné body: <b id="crePts"></b>)</span><div id="creSk"></div></div>';
    fs.parentNode.insertBefore(box, fs.nextSibling);
    document.getElementById('creGood').onclick = () => creSide(0);
    document.getElementById('creEvil').onclick = () => creSide(1);
    document.getElementById('creRnd').onclick = creRandom;
    const rs = document.getElementById('creRace'); rs.onchange = () => creRace(rs.value);
    const tr = document.getElementById('creTrait'); Object.entries(TRAITS).forEach(([k, t]) => { const o = document.createElement('option'); o.value = k; o.textContent = t.n; tr.appendChild(o); }); tr.value = CRE.trait;
    tr.onchange = () => { CRE.trait = tr.value; creDraw(); };
    const sk = document.getElementById('creSk');
    Object.keys(SKILL_N).forEach(k => { const d = document.createElement('div'); d.className = 'cre-sk'; d.innerHTML = '<span>' + SKILL_N[k] + '</span><button type="button" data-k="' + k + '" data-d="-1">−</button><b id="creS_' + k + '"></b><button type="button" data-k="' + k + '" data-d="1">+</button>'; sk.appendChild(d); });
    sk.onclick = e => { const b = e.target.closest('button'); if (!b) return; const k = b.dataset.k, d = +b.dataset.d, used = Object.values(CRE.s).reduce((a, v) => a + v, 0); if (d > 0 && (used >= CRE_POINTS || CRE.s[k] >= 3)) return; if (d < 0 && CRE.s[k] <= 0) return; CRE.s[k] += d; creDraw(); };
    fs.onchange = () => { const side = EVIL_F.includes(+fs.value) && +fs.value !== 6 ? 1 : GOOD_F.includes(+fs.value) && +fs.value !== 6 ? 0 : CRE.side; if (side !== CRE.side) creSide(side); };
    creSide(0);
}
/** Výber strany: filtruje frakcie a rasy, nastaví predvolenú rasu. */
function creSide(side) {
    CRE.side = side;
    const fs = document.getElementById('fs'), allow = side ? EVIL_F : GOOD_F;
    [...fs.options].forEach(o => { o.hidden = !allow.includes(+o.value); o.disabled = o.hidden; });
    if (!allow.includes(+fs.value)) fs.value = '6';
    document.getElementById('creGood').classList.toggle('on', side === 0); document.getElementById('creEvil').classList.toggle('on', side === 1);
    const rs = document.getElementById('creRace'); rs.innerHTML = '';
    Object.entries(RACES).filter(([, r]) => r.side === side).forEach(([k, r]) => { const o = document.createElement('option'); o.value = k; o.textContent = r.n; rs.appendChild(o); });
    creRace(RACES[CRE.race] && RACES[CRE.race].side === side ? CRE.race : rs.options[0].value);
}
/** Výber rasy: predvolený vzhľad rasy a ponuka pleti. */
function creRace(k) {
    const r = RACES[k]; if (!r) return;
    CRE.race = k;
    const L = r.look;
    Object.assign(CRE, { skin: L.skin ?? r.skins[0], hair: L.hair || 'short', hcol: L.hcol || '#4a3020', beard: L.beard || 'stubble', eyes: L.eyes || '#4a6a8a', eyeShape: L.eyeShape || (k === 'east' ? 'narrow' : k === 'hobbit' ? 'round' : 'almond'), brows: L.angry ? 'angry' : k === 'dwarf' ? 'thick' : 'flat', nose: k === 'orc' || k === 'uruk' ? 'flat' : k === 'dwarf' ? 'wide' : k === 'hobbit' ? 'small' : 'straight', mouth: L.angry ? 'stern' : 'neutral', extra: L.paint ? 'paint' : 'none' });
    document.getElementById('creRace').value = k;
    document.getElementById('creRaceD').textContent = r.d;
    creControls();
    creDraw();
}
/** Prekreslí ovládacie prvky vzhľadu (ponuka pleti závisí od rasy). */
function creControls() {
    const ctl = document.getElementById('creCtl'); ctl.innerHTML = '';
    const r = RACES[CRE.race];
    const sel = (key, opts, label) => { const l = document.createElement('label'); l.textContent = label + ' '; const s = document.createElement('select'); opts.forEach(([v, n]) => { const o = document.createElement('option'); o.value = v; o.textContent = n; if (String(CRE[key]) === String(v)) o.selected = true; s.appendChild(o); }); s.onchange = () => { CRE[key] = key === 'skin' ? (isNaN(+s.value) ? s.value : +s.value) : key === 'age' ? +s.value : s.value; creDraw(); }; l.appendChild(s); ctl.appendChild(l); };
    sel('sex', [['m', 'muž'], ['f', 'žena']], 'Postava');
    sel('skin', r.skins.map(v => [v, SKIN_N[v] || 'iná']), 'Pleť');
    sel('hair', CRE_OPT.hair, 'Vlasy'); sel('hcol', CRE_OPT.hcol, 'Farba vlasov'); sel('beard', CRE_OPT.beard, 'Brada');
    sel('eyes', CRE_OPT.eyes, 'Farba očí'); sel('eyeShape', CRE_OPT.eyeShape, 'Tvar očí'); sel('brows', CRE_OPT.brows, 'Obočie');
    sel('nose', CRE_OPT.nose, 'Nos'); sel('mouth', CRE_OPT.mouth, 'Ústa'); sel('age', CRE_OPT.age, 'Vek'); sel('extra', CRE_OPT.extra, 'Zvláštnosť');
}
/** Náhodná postava: rasa strany, vzhľad, povaha a body. */
function creRandom() {
    const R = a => a[Math.floor(Math.random() * a.length)];
    const races = Object.entries(RACES).filter(([, r]) => r.side === CRE.side).map(([k]) => k);
    creRace(R(races));
    const r = RACES[CRE.race];
    Object.assign(CRE, { sex: R(['m', 'm', 'f']), skin: R(r.skins), hair: R(CRE_OPT.hair)[0], hcol: R(CRE_OPT.hcol)[0], beard: R(CRE_OPT.beard)[0], eyes: R(CRE_OPT.eyes.slice(0, 4))[0], eyeShape: R(CRE_OPT.eyeShape)[0], nose: R(CRE_OPT.nose.slice(0, 4))[0], mouth: R(CRE_OPT.mouth)[0], brows: R(CRE_OPT.brows)[0], age: R(CRE_OPT.age)[0], extra: Math.random() < .35 ? R(CRE_OPT.extra.slice(1, 6))[0] : 'none', trait: R(Object.keys(TRAITS)) });
    if (CRE.race === 'orc' || CRE.race === 'uruk') { CRE.eyes = R(['#e8c040', '#c03020']); CRE.hair = R(['bald', 'mohawk', 'lank']); CRE.hcol = '#1a1410'; }
    if (CRE.race === 'elf') { CRE.beard = 'none'; CRE.hair = R(['long', 'tied', 'wavy']); }
    if (CRE.race === 'dwarf') { CRE.beard = R(['full', 'long', 'braided']); }
    const s = { st: 0, od: 0, ob: 0, pr: 0, ls: 0 }; for (let i = 0; i < CRE_POINTS; i++) { const ks = Object.keys(s).filter(k => s[k] < 3); s[R(ks)]++; } CRE.s = s;
    document.getElementById('creTrait').value = CRE.trait;
    const pn = document.getElementById('pn'); if (pn) pn.value = R(RNAMES[CRE.race] || RNAMES.human);
    creControls(); creDraw();
}
const RNAMES = { human: ['Halbarad', 'Dervorin', 'Éomund', 'Targon', 'Beregond', 'Hirluin'], elf: ['Haldir', 'Rúmil', 'Orophin', 'Gildor', 'Celebrían'], dwarf: ['Balin', 'Dwalin', 'Nori', 'Glóin', 'Bofur', 'Dís'], hobbit: ['Meriadoc', 'Peregrin', 'Fredegar', 'Hamfast', 'Folco'],
    orc: ['Gorbag', 'Grishnákh', 'Snaga', 'Muzgash', 'Radbug'], uruk: ['Uglúk', 'Mauhúr', 'Lugdush', 'Shargh'], dark: ['Suladân', 'Asdrubâl', 'Herumor', 'Fuinur'], east: ['Khamûl', 'Bór', 'Ulfang', 'Brodda'], numen: ['Castamir', 'Sangahyando', 'Angamaitë', 'Herumor'] };
/** Prekreslí portrét a čísla v tvorbe postavy. */
function creDraw() {
    const cv = document.getElementById('crePor');
    if (cv) { const c = cv.getContext('2d'); c.clearRect(0, 0, 192, 192); c.drawImage(Portraits.canvas(creLook()), 0, 0, 192, 192); }
    const t = TRAITS[CRE.trait]; const d = document.getElementById('creTraitD'); if (d) d.textContent = t.d;
    const used = Object.values(CRE.s).reduce((a, v) => a + v, 0), pts = document.getElementById('crePts'); if (pts) pts.textContent = CRE_POINTS - used;
    Object.keys(SKILL_N).forEach(k => { const b = document.getElementById('creS_' + k); if (b) b.textContent = CRE.s[k]; });
}
/** Výsledok tvorby postavy pre newGame(): strana, rasa, vzhľad, povaha a schopnosti (aj bez formulára dá predvolené hodnoty). */
function creatorResult() {
    return { side: CRE.side, race: CRE.race, look: creLook(), trait: CRE.trait, s: { ...CRE.s } };
}
/** Krátky popis povahy hrdinu (do okna Hrdina a rozhovorov). */
const traitName = () => (G && G.trait && TRAITS[G.trait] ? TRAITS[G.trait].n : 'Nevyhranený');
if (typeof document !== 'undefined' && document.getElementById && document.getElementById('fs')) { try { buildCreator(); } catch (e) { } }
