/*
 * Tvorba postavy na úvodnej obrazovke: vzhľad (portrét), povaha a rozdelenie bodov schopností.
 * Ovládanie sa vloží do úvodného okna (#ov) pod meno a frakciu; newGame() si výsledok prečíta cez creatorResult().
 * Povahy (TRAITS) dávajú počiatočné bonusy a menia, ako o hrdinovi hovoria iní.
 */
const TRAITS = {
    cestny: { n: 'Čestný', d: 'Drží slovo a chráni slabých. Česť +3, lordi dobra ti veria (vzťah +5).', fx: G => { G.hon = (G.hon || 0) + 3; G.trel = 5; } },
    chamtivy: { n: 'Chamtivý', d: 'Zlato je odpoveď na všetko. +120 zlata, ceny u kupcov o 5 % lepšie, česť −1.', fx: G => { G.gold += 120; G.hon = (G.hon || 0) - 1; G.tmerc = 1; } },
    odvazny: { n: 'Odvážny', d: 'Prvý v boji, posledný v ústupe. Sila +1, zdravie +10, strach +1.', fx: G => { G.s.st++; G.hp += 10; G.fear = (G.fear || 0) + 1; } },
    prefikany: { n: 'Prefíkaný', d: 'Slová sú zbraň. Presviedčanie +2, zajatci sa predávajú drahšie.', fx: G => { G.s.pr += 2; G.tcun = 1; } },
    kruty: { n: 'Krutý', d: 'Nepriatelia sa ťa boja skôr, než ťa uvidia. Strach +3, česť −2, +2 pešiaci.', fx: G => { G.fear = (G.fear || 0) + 3; G.hon = (G.hon || 0) - 2; G.inf += 2; } },
    mudry: { n: 'Múdry', d: 'Učí sa z každého dňa. +2 body schopností, skúsenosti rastú o 10 % rýchlejšie.', fx: G => { G.sk += 2; G.twise = 1; } }
};
const CRE = { sex: 'm', skin: 0, hair: 'short', hcol: '#4a3020', beard: 'stubble', eyes: '#4a6a8a', trait: 'cestny', s: { st: 1, od: 1, ob: 1, pr: 1, ls: 1 } };
const CRE_POINTS = 5;
const CRE_OPT = {
    hair: [['short', 'krátke'], ['long', 'dlhé'], ['tied', 'zviazané'], ['curly', 'kučeravé'], ['lank', 'spustené'], ['bald', 'holá hlava']],
    hcol: [['#4a3020', 'hnedé'], ['#2a1a10', 'čierne'], ['#c8a060', 'plavé'], ['#b05a20', 'ryšavé'], ['#8a8a8a', 'šedivé'], ['#e8d8a0', 'svetlé']],
    beard: [['none', 'bez brady'], ['stubble', 'strnisko'], ['full', 'plná'], ['long', 'dlhá'], ['braided', 'zapletená']],
    eyes: [['#4a6a8a', 'modré'], ['#5a7a5a', 'zelené'], ['#6a4a2a', 'hnedé'], ['#6a7a7a', 'sivé']],
    skin: [[0, 'svetlá'], [1, 'opálená'], [2, 'tmavá'], [3, 'bledá']]
};
const SKILL_N = { st: 'Sila', od: 'Odolnosť', ob: 'Obratnosť', pr: 'Presviedčanie', ls: 'Lukostreľba' };
const creLook = () => ({ race: 'human', sex: CRE.sex, skin: CRE.skin, hair: CRE.hair, hcol: CRE.hcol, beard: CRE.sex === 'f' ? 'none' : CRE.beard, eyes: CRE.eyes });

/** Vloží tvorbu postavy do úvodného okna (raz). */
function buildCreator() {
    const fs = document.getElementById('fs');
    if (!fs || document.getElementById('cre') || typeof Portraits === 'undefined') return;
    const box = document.createElement('div'); box.id = 'cre';
    box.innerHTML = '<div class="cre-row"><canvas id="crePor" width="192" height="192"></canvas><div id="creCtl"></div></div>'
        + '<div class="cre-row"><label>Povaha <select id="creTrait"></select></label><div id="creTraitD" class="cre-note"></div></div>'
        + '<div class="cre-row"><span>Schopnosti (voľné body: <b id="crePts"></b>)</span><div id="creSk"></div></div>';
    fs.parentNode.insertBefore(box, fs.nextSibling);
    const ctl = document.getElementById('creCtl');
    const sel = (key, opts, label) => { const l = document.createElement('label'); l.textContent = label + ' '; const s = document.createElement('select'); opts.forEach(([v, n]) => { const o = document.createElement('option'); o.value = v; o.textContent = n; if (String(CRE[key]) === String(v)) o.selected = true; s.appendChild(o); }); s.onchange = () => { CRE[key] = key === 'skin' ? +s.value : s.value; creDraw(); }; l.appendChild(s); ctl.appendChild(l); };
    sel('sex', [['m', 'muž'], ['f', 'žena']], 'Postava'); sel('skin', CRE_OPT.skin, 'Pleť'); sel('hair', CRE_OPT.hair, 'Vlasy'); sel('hcol', CRE_OPT.hcol, 'Farba vlasov'); sel('beard', CRE_OPT.beard, 'Brada'); sel('eyes', CRE_OPT.eyes, 'Oči');
    const tr = document.getElementById('creTrait'); Object.entries(TRAITS).forEach(([k, t]) => { const o = document.createElement('option'); o.value = k; o.textContent = t.n; tr.appendChild(o); }); tr.value = CRE.trait;
    tr.onchange = () => { CRE.trait = tr.value; creDraw(); };
    const sk = document.getElementById('creSk');
    Object.keys(SKILL_N).forEach(k => { const d = document.createElement('div'); d.className = 'cre-sk'; d.innerHTML = '<span>' + SKILL_N[k] + '</span><button type="button" data-k="' + k + '" data-d="-1">−</button><b id="creS_' + k + '"></b><button type="button" data-k="' + k + '" data-d="1">+</button>'; sk.appendChild(d); });
    sk.onclick = e => { const b = e.target.closest('button'); if (!b) return; const k = b.dataset.k, d = +b.dataset.d, used = Object.values(CRE.s).reduce((a, v) => a + v, 0); if (d > 0 && (used >= CRE_POINTS || CRE.s[k] >= 3)) return; if (d < 0 && CRE.s[k] <= 0) return; CRE.s[k] += d; creDraw(); };
    creDraw();
}
/** Prekreslí portrét a čísla v tvorbe postavy. */
function creDraw() {
    const cv = document.getElementById('crePor');
    if (cv) { const c = cv.getContext('2d'); c.clearRect(0, 0, 192, 192); c.drawImage(Portraits.canvas(creLook()), 0, 0, 192, 192); }
    const t = TRAITS[CRE.trait]; const d = document.getElementById('creTraitD'); if (d) d.textContent = t.d;
    const used = Object.values(CRE.s).reduce((a, v) => a + v, 0), pts = document.getElementById('crePts'); if (pts) pts.textContent = CRE_POINTS - used;
    Object.keys(SKILL_N).forEach(k => { const b = document.getElementById('creS_' + k); if (b) b.textContent = CRE.s[k]; });
}
/** Výsledok tvorby postavy pre newGame(): vzhľad, povaha a schopnosti (aj bez formulára dá predvolené hodnoty). */
function creatorResult() {
    return { look: creLook(), trait: CRE.trait, s: { ...CRE.s } };
}
/** Krátky popis povahy hrdinu (do okna Hrdina a rozhovorov). */
const traitName = () => (G && G.trait && TRAITS[G.trait] ? TRAITS[G.trait].n : 'Nevyhranený');
if (typeof document !== 'undefined' && document.getElementById && document.getElementById('fs')) { try { buildCreator(); } catch (e) { } }
