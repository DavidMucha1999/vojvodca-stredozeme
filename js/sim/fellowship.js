/*
 * Spoločníci ako vo Warbande: role, osobné úlohy, spokojnosť a hádky.
 * Role (CROLE): ranhojič (viac ranených a rýchlejšie hojenie), stopár (rýchlejší pochod), zásobovač (menej jedla),
 *   inžinier (rýchlejšia stavba obliehacej techniky), veliteľ (vyššia morálka v bitke). Platia, kým je spoločník v družine.
 * Osobné úlohy (CQUEST): po ôsmich dňoch v družine spoločník požiada o cestu na svoje miesto; splníš ju, keď vyhráš potrebný počet
 *   bitiek a vstúpiš do hradu. Odmena: dve úrovne pre spoločníka, morálka družiny a vyššia spokojnosť.
 * Spokojnosť (G.crel 0–100): rastie s víťazstvami a dobrou morálkou, klesá pri hlade a v hádkach. Pod 20 spoločník odíde.
 * Hádky (CPAIRS): dvojice, ktoré si nesadnú (a pri nízkej morálke ktokoľvek), sa občas pohádajú; rozhodneš, komu dáš za pravdu.
 *   Legolas a Gimli sa po troch hádkach stanú priateľmi.
 */
const CROLE = { aragorn: ['ranhojic', 'stopar'], legolas: ['stopar'], gimli: ['inzinier'], boromir: ['velitel'], eowyn: ['velitel'], faramir: ['stopar'], sam: ['zasobovac', 'ranhojic'],
    lurtz: ['velitel'], gothmog: ['inzinier'], grima: ['zasobovac'], shagrat: ['inzinier'], suladan: ['stopar'], mouth: ['velitel'] };
const ROLE_N = { ranhojic: 'ranhojič', stopar: 'stopár', zasobovac: 'zásobovač', inzinier: 'inžinier', velitel: 'veliteľ' };
const ROLE_D = { ranhojic: 'viac ranených namiesto mŕtvych, rýchlejšie hojenie', stopar: 'družina pochoduje o 8 % rýchlejšie', zasobovac: 'družina zje o 15 % menej', inzinier: 'obliehacia technika rastie o 30 % rýchlejšie', velitel: 'vyššia morálka vojska v bitke' };
const hasRole = r => !!(G && (G.comp || []).some(id => (CROLE[id] || []).includes(r)));
const CQUEST = {
    aragorn: { a: 'Rivendell', w: 2, t: 'Aragorn chce navštíviť Rivendell – vraví, že tam naňho niekto čaká.', done: 'V Rivendelle sa Aragorn prvýkrát po dlhom čase usmial. Vrátil sa pokojnejší a odhodlanejší.' },
    legolas: { a: 'Lesné kráľovstvo', w: 2, t: 'Legolas chce priniesť otcovi správy o vojne do Lesného kráľovstva.', done: 'Kráľ Lesného kráľovstva vypočul syna a poslal ti pozdrav. Legolas strieľa ešte presnejšie.' },
    gimli: { a: 'Moria', w: 3, t: 'Gimli túži uvidieť siene Morie, kde kedysi vládol jeho rod.', done: 'Gimli stál dlho pri bráne Morie a mlčal. Potom zdvihol sekeru a povedal: „Teraz viem, za čo bojujem.“' },
    boromir: { a: 'Minas Tirith', w: 3, t: 'Boromir chce priniesť správy o víťazstvách otcovi do Minas Tirith.', done: 'Otec Boromira objal prvýkrát po rokoch. Boromir sa vrátil s novou silou.' },
    eowyn: { a: 'Edoras', w: 2, t: 'Éowyn chce ukázať strýkovi v Edorase, že dokáže viesť jazdcov.', done: 'V Edorase sa o Éowyn spieva. Jazdci ju teraz nasledujú bez otázok.' },
    faramir: { a: 'Cair Andros', w: 2, t: 'Faramir chce skontrolovať hliadky na Cair Androse.', done: 'Hliadky na Cair Androse sú pripravené. Faramir sa vrátil s mapami nepriateľských ciest.' },
    sam: { a: 'Hobitov', w: 1, t: 'Sam by rád zaskočil domov do Hobitova pozrieť záhradu.', done: 'Záhrada v Hobitove kvitne. Sam sa vrátil s košíkom jabĺk a širokým úsmevom.' },
    lurtz: { a: 'Isengard', w: 3, t: 'Lurtz chce priniesť Sarumanovi hlavy nepriateľov do Isengardu.', done: 'Saruman bol spokojný. Lurtz dostal nové brnenie a ešte väčšiu chuť zabíjať.' },
    gothmog: { a: 'Osgiliath', w: 3, t: 'Gothmog chce stáť na mostoch Osgiliathu ako víťaz.', done: 'Gothmog stál na ruinách mosta a smial sa. Jeho orkovia sa ho boja ešte viac.' },
    grima: { a: 'Edoras', w: 2, t: 'Gríma chce potajomky navštíviť Edoras – má tam ešte nevybavené účty.', done: 'Gríma sa vrátil z Edorasu s novými tajomstvami a zlým úsmevom.' },
    shagrat: { a: 'Cirith Ungol', w: 2, t: 'Šagrat chce skontrolovať svoju vežu v Cirith Ungole.', done: 'Veža Cirith Ungolu stojí. Šagrat našiel v pivnici starú truhlicu a je v dobrej nálade.' },
    suladan: { a: 'Harnen', w: 2, t: 'Suladân chce priviesť svojich jazdcov k brodom Harnenu.', done: 'Jazdci Haradu pri Harnene oslavujú svojho náčelníka. Suladân je spokojný.' },
    mouth: { a: 'Barad-dûr', w: 3, t: 'Ústa Saurona musia podať hlásenie v Barad-dûre.', done: 'Oko je spokojné. Ústa Saurona sa vrátili s jeho priazňou – a s ňou aj ty.' }
};
const CPAIRS = [['legolas', 'gimli', 'kto je lepší bojovník'], ['boromir', 'faramir', 'otcovu priazeň'], ['boromir', 'aragorn', 'to, kto má viesť Gondor'],
    ['lurtz', 'grima', 'Sarumanove rozkazy'], ['gothmog', 'shagrat', 'delenie koristi'], ['shagrat', 'mouth', 'to, kto je bližšie k Oku'], ['lurtz', 'gothmog', 'to, či je lepší uruk, alebo ork']];
const crel = id => { G.crel = G.crel || {}; if (G.crel[id] == null) G.crel[id] = 60; return G.crel[id]; };
const addCrel = (id, v) => { crel(id); G.crel[id] = Math.max(0, Math.min(100, G.crel[id] + v)); };

/** Denný chod: spokojnosť, osobné úlohy, hádky a odchod nespokojných (volá daily2). */
function fellowshipDaily() {
    G.cjoin = G.cjoin || {}; G.cq = G.cq || {};
    const ids = (G.comp || []).slice(), wins = (G.st || {}).w || 0, won = wins - (G.lastW ?? wins);
    G.lastW = wins;
    ids.forEach(id => {
        if (G.cjoin[id] == null) G.cjoin[id] = G.day;
        addCrel(id, (won > 0 ? 2 * won : 0) + ((G.pm ?? 60) > 60 ? 1 : (G.pm ?? 60) < 35 ? -1 : 0) - (G.hungry ? 2 : 0));
        const q = CQUEST[id];
        if (q && !G.cq[id] && G.day - G.cjoin[id] >= 8) { G.cq[id] = { st: G.day, w0: wins }; const c = compDef(id); lg('Osobná úloha: ' + q.t); TS = { s: c.n + ' má prosbu: ' + q.t, l: 360 }; }
    });
    // hádky
    if (mode === 'map' && !LETTERS.some(L => L.kind === 'quarrel')) {
        const pairs = CPAIRS.filter(([a, b]) => ids.includes(a) && ids.includes(b) && !(a === 'legolas' && b === 'gimli' && G.lgFriends));
        let p = pairs.find(() => Math.random() < .05 + ((G.pm ?? 60) < 40 ? .05 : 0));
        if (!p && ids.length >= 2 && (G.pm ?? 60) < 35 && Math.random() < .05) { const s = ids.slice().sort(() => Math.random() - .5); p = [s[0], s[1], 'hlad a zlú náladu v tábore']; }
        if (p) LETTERS.push({ kind: 'quarrel', a: p[0], b: p[1], topic: p[2] });
    }
    // odchod nespokojných
    ids.forEach(id => { if (crel(id) < 20) { const c = compDef(id); if (c) { compLeave(c); lg(c.n + ' bol nespokojný a odišiel z družiny.'); TS = { s: c.n + ' odišiel z družiny – bol nespokojný.', l: 300 }; } } });
}
/** Hádka dvoch spoločníkov: komu dáš za pravdu. */
function quarrelLetter(L) {
    const A = compDef(L.a), B = compDef(L.b), end = () => { ov.classList.add('hide'); mode = 'map'; upd(); };
    if (!A || !B || !(G.comp || []).includes(L.a) || !(G.comp || []).includes(L.b)) return;
    mode = 'town';
    PORTRAIT = A.look;
    show('Hádka v družine', A.n + ' a ' + B.n + ' sa pri ohni hádajú o ' + L.topic + '. Ostatní stíchli a pozerajú na teba.');
    const after = s => { if (L.a === 'legolas' && L.b === 'gimli' && (G.lgq = (G.lgq || 0) + 1) >= 3 && !G.lgFriends) { G.lgFriends = 1; addCrel('legolas', 20); addCrel('gimli', 20); lg('Legolas a Gimli sa po hádkach stali nerozlučnými priateľmi.'); s += ' Po tretej hádke si Legolas a Gimli podali ruky – odteraz sú nerozluční priatelia.'; } msg(s, end); };
    btn('Dať za pravdu: ' + A.n, () => { addCrel(L.a, 8); addCrel(L.b, -18); after(B.n + ' sa urazene vzdialil od ohňa.'); }, 0, 'talk');
    btn('Dať za pravdu: ' + B.n, () => { addCrel(L.b, 8); addCrel(L.a, -18); after(A.n + ' si odpľul a ide spať.'); }, 0, 'talk');
    btn('Upokojiť oboch pri súdku piva (40 zlata)', () => { G.gold -= 40; addCrel(L.a, 4); addCrel(L.b, 4); after('Pri pive sa hádka rozplynula. Ráno si nik nespomína, o čo išlo.'); }, G.gold < 40, 'mug');
    btn('Nechať ich tak', () => { addCrel(L.a, -6); addCrel(L.b, -6); after('Hádali sa do polnoci. Ráno sa jeden druhému vyhýbajú.'); }, 0, 'back');
}
/** Pri vstupe do hradu: splnené osobné úlohy spoločníkov. Vráti texty na zobrazenie. */
function compQuestVisit(name) {
    const out = [], wins = (G.st || {}).w || 0;
    for (const id of G.comp || []) {
        const q = CQUEST[id], s = G.cq && G.cq[id];
        if (!q || !s || s.done || q.a !== name) continue;
        if (wins - s.w0 < q.w) { out.push(compDef(id).n + ' čaká: ešte ' + (q.w - (wins - s.w0)) + ' víťazstvo(á), potom sa jeho úloha splní tu.'); continue; }
        s.done = G.day; G.cxp = G.cxp || {}; G.cxp[id] = (G.cxp[id] || 0) + 80; G.pm = Math.min(100, (G.pm ?? 60) + 10); addCrel(id, 25);
        lg('Splnená osobná úloha: ' + compDef(id).n + '.'); out.push(q.done + ' (' + compDef(id).n + ' +2 úrovne, morálka družiny +10.)');
    }
    return out;
}
