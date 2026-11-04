/*
 * Tvorba postavy – samostatná obrazovka v troch stĺpcoch (HTML #crs v úvodnom okne, otvára ju „Nová hra“ v js/ui/menu.js):
 *   vľavo strana (dobro/zlo), karty frakcií s erbom a farbou a rasy tej strany,
 *   v strede veľký portrét a celá postava v počiatočnej výbave (jemne „dýcha“), meno na pergamene a karty povahy,
 *   vpravo vzhľad šípkami ◀ ▶, náhodná postava a schopnosti ako body ●●○.
 * Frakcia sa zapisuje do skrytého select#fs a meno do input#pn; newGame() si výsledok prečíta cez creatorResult().
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
    extra: [['none', 'nič'], ['scar', 'jazva'], ['warpaint', 'bojové maľovanie'], ['tattoo', 'tetovanie'], ['earring', 'náušnica'], ['eyepatch', 'páska cez oko'], ['paint', 'biela ruka'], ['freckles', 'pehy']],
    age: [[0, 'mladý'], [.5, 'zrelý'], [.8, 'starý']]
};
const SKIN_N = { 0: 'svetlá', 1: 'opálená', 2: 'tmavá', 3: 'bledá', '#5f7a4a': 'zelená', '#6a6a52': 'sivozelená', '#4a5a3a': 'tmavozelená', '#3e4a34': 'tmavá uruk', '#4a3a30': 'hnedočierna', '#7a4a2e': 'tmavá', '#5a3a22': 'veľmi tmavá' };
const SKILL_N = { st: 'Sila', od: 'Odolnosť', ob: 'Obratnosť', pr: 'Presviedčanie', ls: 'Lukostreľba' };
const GOOD_F = [6, 0, 1, 5, 8], EVIL_F = [6, 2, 3, 4, 7];
const creLook = () => { const r = RACES[CRE.race] || RACES.human, L = { ...r.look, sex: CRE.sex, skin: CRE.skin, hair: CRE.hair, hcol: CRE.hcol, beard: CRE.sex === 'f' ? 'none' : CRE.beard, eyes: CRE.eyes, eyeShape: CRE.eyeShape, nose: CRE.nose, mouth: CRE.mouth, brows: CRE.brows, age: CRE.age }; delete L.paint; delete L.turban; if (CRE.extra !== 'none') L[CRE.extra] = true; if (CRE.race === 'dark') L.turban = r.look.turban; return L; };

/** Jednoriadkový popis frakcií na kartách. */
const FAC_D = { 6: 'Vlastná družina bez pána. Slobodný, no spojencov si musíš získať sám.', 0: 'Strážcovia Západu z Minas Tirith. Pevná pechota a kamenné hrady.', 1: 'Jazdci z Edorasu. Najlepšia jazda Stredozeme.',
    5: 'Trpaslíci z Osamelej hory. Ťažké brnenia a zlato z hlbín.', 8: 'Elfovia Zlatého lesa. Výborní lukostrelci.', 2: 'Vojská Temného pána. Nekonečné zástupy orkov.',
    3: 'Uruk-hai Bielej ruky. Disciplinovaní a neúnavní.', 4: 'Juhania z Haradu. Rýchla jazda a lukostrelci z púšte.', 7: 'Easterlingovia z východu. Zlaté brnenia a dlhé kopije.' };
const $c = id => document.getElementById(id);
/** Zvuk prechodu a kliknutia (js/ui/menu.js; bez neho ticho). */
const creSnd = k => { if (typeof uiSnd === 'function') uiSnd(k); };
/** Erb frakcie na štíte vo farbe frakcie (kreslí sa cez globálne plátno, kde sú erby). */
function creCrest(f) {
    const c = document.createElement('canvas'); c.width = 92; c.height = 104; const x = c.getContext('2d');
    const sh = () => { x.beginPath(); x.moveTo(6, 6); x.lineTo(86, 6); x.lineTo(86, 52); x.quadraticCurveTo(84, 86, 46, 100); x.quadraticCurveTo(8, 86, 6, 52); x.closePath(); };
    const gr = x.createLinearGradient(0, 0, 0, 104); gr.addColorStop(0, shadeHex(BF[f], 1.5)); gr.addColorStop(1, shadeHex(BF[f], .7));
    sh(); x.fillStyle = gr; x.fill(); x.lineWidth = 5; x.strokeStyle = '#2a1a08'; x.stroke(); x.lineWidth = 3; x.strokeStyle = '#d9a441'; x.stroke();
    try { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 100, 100); embBase(50, 50, 30, f); x.drawImage(cv, 4, 0, 100, 100, 0, 0, 100, 100); ctx.restore(); } catch (e) { }
    return c;
}
/** Postaví ovládanie tvorby postavy v pripravenom HTML (raz). */
function buildCreator() {
    const fs = $c('fs');
    if (!fs || !$c('creFac') || $c('creFac').dataset.ok || typeof Portraits === 'undefined') return;
    $c('creFac').dataset.ok = 1;
    $c('creGood').onclick = () => { creSnd('click'); creSide(0); };
    $c('creEvil').onclick = () => { creSnd('click'); creSide(1); };
    $c('creRnd').onclick = () => { creSnd('roll'); creRandom(); };
    const tr = $c('creTraits');
    Object.entries(TRAITS).forEach(([k, t]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'cre-trait'; b.dataset.k = k; b.textContent = t.n; b.onclick = () => { creSnd('click'); CRE.trait = k; creDraw(); }; tr.appendChild(b); });
    const sk = $c('creSk');
    Object.keys(SKILL_N).forEach(k => { const d = document.createElement('div'); d.className = 'cre-sk'; d.innerHTML = '<span>' + SKILL_N[k] + '</span><button type="button" data-k="' + k + '" data-d="-1" aria-label="Menej">−</button><b class="dots" id="creS_' + k + '"></b><button type="button" data-k="' + k + '" data-d="1" aria-label="Viac">+</button>'; sk.appendChild(d); });
    sk.onclick = e => { const b = e.target.closest('button'); if (!b) return; const k = b.dataset.k, d = +b.dataset.d, used = Object.values(CRE.s).reduce((a, v) => a + v, 0); if (d > 0 && (used >= CRE_POINTS || CRE.s[k] >= 3)) return; if (d < 0 && CRE.s[k] <= 0) return; creSnd('click'); CRE.s[k] += d; creDraw(); };
    creSide(0);
}
/** Výber strany: karty frakcií a rasy tej strany, predvolená rasa; pozadie úvodu sa prefarbí. */
function creSide(side) {
    CRE.side = side;
    const fs = $c('fs'), allow = side ? EVIL_F : GOOD_F;
    if (!allow.includes(+fs.value)) fs.value = '6';
    $c('creGood').classList.toggle('on', side === 0); $c('creEvil').classList.toggle('on', side === 1);
    if (typeof ov !== 'undefined' && ov) ov.classList.toggle('evil', side === 1);
    const fc = $c('creFac'); fc.innerHTML = '';
    allow.forEach(f => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'cre-fac'; b.dataset.f = f; b.style.setProperty('--fc', FC[f]);
        b.appendChild(creCrest(f));
        const t = document.createElement('div'); t.innerHTML = '<b>' + (f === 6 ? 'Nezávislý' : FN[f]) + '</b><span>' + FAC_D[f] + '</span>'; b.appendChild(t);
        b.onclick = () => { creSnd('click'); fs.value = String(f); creDraw(); };
        fc.appendChild(b);
    });
    const rs = $c('creRaces'); rs.innerHTML = '';
    Object.entries(RACES).filter(([, r]) => r.side === side).forEach(([k, r]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'cre-race'; b.dataset.k = k; b.textContent = r.n; b.onclick = () => { creSnd('click'); creRace(k); }; rs.appendChild(b); });
    creRace(RACES[CRE.race] && RACES[CRE.race].side === side ? CRE.race : rs.firstChild.dataset.k);
}
/** Výber rasy: predvolený vzhľad rasy a ponuka pleti. */
function creRace(k) {
    const r = RACES[k]; if (!r) return;
    CRE.race = k;
    const L = r.look;
    Object.assign(CRE, { skin: L.skin ?? r.skins[0], hair: L.hair || 'short', hcol: L.hcol || '#4a3020', beard: L.beard || 'stubble', eyes: L.eyes || '#4a6a8a', eyeShape: L.eyeShape || (k === 'east' ? 'narrow' : k === 'hobbit' ? 'round' : 'almond'), brows: L.angry ? 'angry' : k === 'dwarf' ? 'thick' : 'flat', nose: k === 'orc' || k === 'uruk' ? 'flat' : k === 'dwarf' ? 'wide' : k === 'hobbit' ? 'small' : 'straight', mouth: L.angry ? 'stern' : 'neutral', extra: L.paint ? 'paint' : 'none' });
    $c('creRaceD').textContent = r.d;
    creControls();
    creDraw();
}
/** Voľby vzhľadu so šípkami ◀ ▶ (ponuka pleti závisí od rasy). */
function creControls() {
    const ctl = $c('creCtl'); ctl.innerHTML = '';
    const r = RACES[CRE.race];
    const sel = (key, opts, label, color) => {
        const d = document.createElement('div'); d.className = 'cre-opt'; d.dataset.k = key;
        d.innerHTML = '<span>' + label + '</span><div><button type="button" class="cre-arr" data-d="-1" aria-label="' + label + ' – predchádzajúca">◀</button><b></b><button type="button" class="cre-arr" data-d="1" aria-label="' + label + ' – ďalšia">▶</button></div>';
        const val = d.querySelector('b');
        const paint = () => { const o = opts.find(([v]) => String(v) === String(CRE[key])) || opts[0]; val.innerHTML = (color ? '<i style="background:' + color(o[0]) + '"></i>' : '') + o[1]; };
        d.onclick = e => { const b = e.target.closest('button'); if (!b) return; let i = opts.findIndex(([v]) => String(v) === String(CRE[key])); i = (i + +b.dataset.d + opts.length) % opts.length; CRE[key] = opts[i][0]; creSnd('tick'); paint(); creDraw(); };
        d.paint = paint; paint(); ctl.appendChild(d);
    };
    const SK = Portraits.SKIN || [];
    sel('sex', [['m', 'muž'], ['f', 'žena']], 'Postava');
    sel('skin', r.skins.map(v => [v, SKIN_N[v] || 'iná']), 'Pleť', v => typeof v === 'string' ? v : SK[v] || '#c8a080');
    sel('hair', CRE_OPT.hair, 'Vlasy'); sel('hcol', CRE_OPT.hcol, 'Farba vlasov', v => v);
    sel('beard', CRE_OPT.beard, 'Brada'); sel('eyes', CRE_OPT.eyes, 'Farba očí', v => v);
    sel('eyeShape', CRE_OPT.eyeShape, 'Tvar očí'); sel('brows', CRE_OPT.brows, 'Obočie');
    sel('nose', CRE_OPT.nose, 'Nos'); sel('mouth', CRE_OPT.mouth, 'Ústa');
    sel('age', CRE_OPT.age, 'Vek'); sel('extra', CRE_OPT.extra, 'Zvláštnosť');
}
/** Náhodná postava: rasa strany, vzhľad, povaha, body a meno. */
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
    const allow = CRE.side ? EVIL_F : GOOD_F; $c('fs').value = String(R(allow));
    const pn = $c('pn'); if (pn) pn.value = R(RNAMES[CRE.race] || RNAMES.human);
    creControls(); creDraw();
}
const RNAMES = { human: ['Halbarad', 'Dervorin', 'Éomund', 'Targon', 'Beregond', 'Hirluin'], elf: ['Haldir', 'Rúmil', 'Orophin', 'Gildor', 'Celebrían'], dwarf: ['Balin', 'Dwalin', 'Nori', 'Glóin', 'Bofur', 'Dís'], hobbit: ['Meriadoc', 'Peregrin', 'Fredegar', 'Hamfast', 'Folco'],
    orc: ['Gorbag', 'Grishnákh', 'Snaga', 'Muzgash', 'Radbug'], uruk: ['Uglúk', 'Mauhúr', 'Lugdush', 'Shargh'], dark: ['Suladân', 'Asdrubâl', 'Herumor', 'Fuinur'], east: ['Khamûl', 'Bór', 'Ulfang', 'Brodda'], numen: ['Castamir', 'Sangahyando', 'Angamaitë', 'Herumor'] };
/** Prekreslí portrét, vybrané karty a body; postavu kreslí creAnim. */
function creDraw() {
    const pc = $c('crePor');
    if (pc) { const c = pc.getContext('2d'); c.clearRect(0, 0, pc.width, pc.height); c.drawImage(Portraits.canvas(creLook(), 120), 0, 0, pc.width, pc.height); }
    const f = +$c('fs').value;
    document.querySelectorAll('#creFac .cre-fac').forEach(b => b.classList.toggle('on', +b.dataset.f === f));
    document.querySelectorAll('#creRaces .cre-race').forEach(b => b.classList.toggle('on', b.dataset.k === CRE.race));
    document.querySelectorAll('#creTraits .cre-trait').forEach(b => b.classList.toggle('on', b.dataset.k === CRE.trait));
    document.querySelectorAll('#creCtl .cre-opt').forEach(d => d.paint && d.paint());
    const t = TRAITS[CRE.trait], d = $c('creTraitD'); if (d) d.textContent = t.d;
    const used = Object.values(CRE.s).reduce((a, v) => a + v, 0), pts = $c('crePts'); if (pts) pts.textContent = CRE_POINTS - used;
    Object.keys(SKILL_N).forEach(k => { const b = $c('creS_' + k); if (!b) return; b.innerHTML = '●'.repeat(CRE.s[k]) + '<em>' + '○'.repeat(3 - CRE.s[k]) + '</em>'; const [m, p] = b.parentNode.querySelectorAll('button'); m.disabled = CRE.s[k] <= 0; p.disabled = CRE.s[k] >= 3 || used >= CRE_POINTS; });
    creFigKey = null;
}
/** Celá postava v počiatočnej výbave – jemne dýcha, plášť a zástava sa vlnia (beží len pri otvorenej tvorbe postavy). */
let creFigKey = null, creRaf = 0;
function creAnim(t) {
    const fc = $c('creFig'), crs = $c('crs');
    if (!fc || !crs || crs.classList.contains('off') || !document.contains(fc)) { creRaf = 0; return; }
    creRaf = requestAnimationFrame(creAnim);
    const c = fc.getContext('2d'), evil = CRE.side === 1, s = t / 1000;
    const o = { cape: evil ? '#2a1414' : '#6a2a2a', ...Figures.lookOpts(creLook()) };
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, fc.width, fc.height);
    const br = Math.sin(s * 1.6), tm0 = tm;
    try {
        tm = s * 9;
        c.translate(fc.width / 2, fc.height - 12); c.scale(7, 7 * (1 + .014 * br));
        Figures.draw(c, { w: 0, a: 0, s: 0, m: 0, h: 0 }, o, 0);
    } catch (e) { } finally { tm = tm0; }
}
/** Otvorí obrazovku tvorby postavy (z menu). */
function openCreator() {
    buildCreator(); creDraw();
    if (!creRaf) creRaf = requestAnimationFrame(creAnim);
}
/** Výsledok tvorby postavy pre newGame(): strana, rasa, vzhľad, povaha a schopnosti (aj bez formulára dá predvolené hodnoty). */
function creatorResult() {
    return { side: CRE.side, race: CRE.race, look: creLook(), trait: CRE.trait, s: { ...CRE.s } };
}
/** Krátky popis povahy hrdinu (do okna Hrdina a rozhovorov). */
const traitName = () => (G && G.trait && TRAITS[G.trait] ? TRAITS[G.trait].n : 'Nevyhranený');

