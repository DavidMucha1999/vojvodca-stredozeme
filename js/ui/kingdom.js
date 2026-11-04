/*
 * Vlastné kráľovstvo: prehľad (meno, erb, strana, hrady, dediny, príjem), vyhlásenie nezávislosti od pána,
 * léna pre vazalov aj spoločníkov (spoločník sa stane lordom na mape a drží hrad), žold a maršal vazalov,
 * dane (G.tax: 'low' | 'normal' | 'high' – príjem, prosperita a priazeň vazalov), zmena mena a erbu.
 * Korunovácia ostáva v okne Dvor a diplomacia (kingDlg v js/ui/town.js).
 */
const taxMul = () => ({ low: .7, normal: 1, high: 1.35 })[G.tax || 'normal'];
const taxPr = () => ({ low: 1, normal: 0, high: -1 })[G.tax || 'normal'];
const fiefShare = t => t.lord ? .7 : 1;   // držiteľ léna si necháva 30 % príjmu
function kingdom(i, tab) {
    const back = () => tsub(i, 'd'), re = t => kingdom(i, t);
    tab = tab || 'o';
    mode = 'town';
    const own = TW.filter(t => t.mine), vill = VL.filter(v => TW[v.t].mine), vas = E.filter(e => e.f === G.fac && !e.dead && !e.nz && !e.kr && (G.fac === 6 || G.king || e.vas));
    const income = own.reduce((s, t) => s + Math.round(castleIncome(t) * taxMul() * fiefShare(t)), 0) + vill.reduce((s, v) => s + (v.st > 0 ? 0 : 4 + lvl(v) * 2), 0);
    const tabs = () => [['o', 'Prehľad', 'crown'], ['f', 'Léna', 'castle'], ['v', 'Vazali', 'group'], ['p', 'Správa', 'scales']].forEach(([k, n, ic]) => { const b = btn(n, () => re(k), 0, ic); if (k === tab) select(b); });
    if (tab === 'o') {
        show(G.kn ? 'Kráľovstvo ' + G.kn : G.fac === 6 ? 'Vlastná družina' : 'Tvoje panstvo – ' + FN[G.fac], (G.king ? 'Si kráľ. ' : G.fac === 6 ? 'Si nezávislý vojvodca. ' : 'Slúžiš kráľovstvu ' + FN[G.fac] + '. ') + 'Hrady: ' + own.length + ', dediny: ' + vill.length + ', vazali: ' + vas.length + '. Denný príjem z panstva: ' + income + ' zlata (dane: ' + ({ low: 'nízke', normal: 'bežné', high: 'vysoké' })[G.tax || 'normal'] + '). Sláva ' + G.ren + ', česť ' + (G.hon || 0) + ', strach ' + (G.fear || 0) + '.' + (G.side != null ? ' Strana: ' + sideName(G.side) + '.' : ''));
        tabs();
        if (G.fac !== 6 && own.length) btn('Vyhlásiť nezávislosť (vojna s ' + FN[G.fac] + ')', () => { const o = G.fac; G.fac = 6; TW.forEach(x => { if (x.mine) x.f = 6; }); WR[6][o] = WR[o][6] = true; AL[6][o] = AL[o][6] = false; REL[6][o] = REL[o][6] = -70; E.forEach(e => { if (e.f === o) e.rl = (e.rl || 0) - 15; }); vas.forEach(e => { if (e.vas) e.f = 6; }); G.ren += 3; lg('Vyhlásil si nezávislosť od ' + FN[o] + '. Kráľovstvo ti vyhlásilo vojnu.'); upd(); msg('Tvoji poslovia odniesli list kráľovi: od dnešného dňa si pánom vlastnej zeme. ' + FN[o] + ' ti vyhlásil vojnu a jeho lordi ťa považujú za zradcu. Vazali, ktorým si udelil léno, idú s tebou.', () => re('o')); }, 0, 'flag');
        if (G.fac === 6 && !G.king) btn('Korunovať sa za kráľa (sláva 14, 3 hrady)', () => { G.king = 1; lg(G.name + ' bol korunovaný za kráľa.'); upd(); kingDlg(); }, !(G.ren >= 14 && own.length >= 3), 'crown');
        if (G.king) btn('Zmeniť meno kráľovstva, erb a farbu', () => kingDlg(), 0, 'flag');
    }
    if (tab === 'f') {
        show('Léna', 'Hrad môžeš udeliť vazalovi (lord sa stane jeho strážcom) alebo spoločníkovi z družiny – ten odíde z družiny, usadí sa na hrade ako jeho pán a bráni ho. Držiteľ léna si necháva 30 % príjmu hradu, ale je ti verný.');
        tabs();
        own.forEach(t => {
            const ti = TW.indexOf(t);
            rowHead(t.n + ' · prosperita ' + Math.round(t.pr ?? 40) + ' % · nespokojnosť ' + Math.round(t.unrest || 0) + '/12 · posádka ' + t.g + ' · príjem ' + Math.round(castleIncome(t) * taxMul() * fiefShare(t)) + (t.lord ? ' · léno drží ' + t.lord : ' · bez pána'));
            if (!t.lord) {
                E.filter(e => e.f === G.fac && !e.kr && !e.dead && !e.nz && !TW.some(x => x.lord === e.nm)).sort((a, b) => Math.hypot(a.x - t.x, a.y - t.y) - Math.hypot(b.x - t.x, b.y - t.y)).slice(0, 2).forEach(e => btn('Udeliť ' + e.nm, () => { t.lord = e.nm; e.rl = (e.rl || 0) + 30; e.vas = 1; e.home = ti; e.role = 'guard'; loyOf(e); e.loy = 30; lg(e.nm + ' dostal léno ' + t.n + '.'); re('f'); }, 0, 'hero'));
                btn('Nechať rozhodnúť radu vazalov (všetci vernosť +2)', () => { const r = fiefVote(ti); msg(r ? 'Rada hlasovala (' + r.votes + '). Léno ' + t.n + ' dostal ' + r.win.nm + '.' : 'Nemáš vazalov bez léna.', () => re('f')); }, 0, 'court');
                myComps().forEach(c => btn('Udeliť spoločníkovi ' + c.n, () => { grantToCompanion(c, ti); re('f'); }, 0, 'group'));
            } else {
                const cid = Object.keys(G.cfief || {}).find(k => G.cfief[k] === ti);
                if (cid) btn('Odvolať ' + t.lord + ' späť do družiny', () => { recallCompanion(cid); re('f'); }, (G.comp || []).length >= 4, 'back');
                else btn('Odobrať léno ' + t.lord + ' (vzťah −25)', () => { const e = E.find(x => x.nm === t.lord); if (e) { e.rl = (e.rl || 0) - 25; e.vas = 0; loyOf(e); e.loy -= 8; } lg('Odobral si léno ' + t.n + '.'); t.lord = 0; re('f'); }, 0, 'back');
            }
        });
        if (!own.length) row('Nemáš žiadny hrad. Dobyj nejaký obliehaním alebo ho dostaň ako léno od panovníka.');
    }
    if (tab === 'v') {
        show('Vazali', vas.length ? 'Lordi v tvojich službách: vzťah k tebe, vernosť (0–30) a vojsko. Žold zvyšuje vernosť; maršal vedie ťaženia.' : 'Zatiaľ nemáš vazalov. Lordov získaš udelením léna, presvedčením (rokovanie na mape) alebo keď nespokojný lord ponúkne služby listom.');
        tabs();
        const m = MAR[G.fac] != null ? E.find(o => o.id === MAR[G.fac]) : null;
        vas.forEach(e => {
            per(e); loyOf(e);
            const fief = TW.find(t => t.lord === e.nm);
            rowHead(e.nm + (e === m ? ' (maršal)' : '') + ' · ' + TR[e.tr][0] + ' · ' + Math.ceil(e.n) + ' mužov · vzťah ' + Math.round(e.rl || 0) + ' · vernosť ' + Math.round(e.loy) + (fief ? ' · léno ' + fief.n : ''));
            if (e !== m) btn('Vymenovať za maršala', () => { MAR[G.fac] = e.id; e.role = 'army'; mst(G.fac).since = G.day; mst(G.fac).day = G.day; lg(e.nm + ' je novým maršalom tvojho vojska.'); re('v'); }, 0, 'flag');
        });
        if (vas.length) btn('Vyplatiť žold všetkým (' + vas.length * 40 + ' zlata, vernosť +3, vzťah +4)', () => { G.gold -= vas.length * 40; vas.forEach(e => { e.loy = Math.min(30, loyOf(e) + 3); e.rl = (e.rl || 0) + 4; }); upd(); re('v'); }, G.gold < vas.length * 40, 'coins');
    }
    if (tab === 'p') {
        show('Správa kráľovstva', 'Dane: nízke = menej zlata, prosperita dedín rastie, vazali spokojní; vysoké = o 35 % viac zlata, prosperita klesá, vazali šomrú (vernosť −0,1 denne).');
        tabs();
        [['low', 'Nízke dane'], ['normal', 'Bežné dane'], ['high', 'Vysoké dane']].forEach(([k, n]) => { const b = btn(n, () => { G.tax = k; re('p'); }, 0, 'coins'); if ((G.tax || 'normal') === k) select(b); });
        if (own.length) btn('Posilniť všetky posádky (+5 obrancov na hrad, ' + own.length * 40 + ' zlata)', () => { G.gold -= own.length * 40; own.forEach(t => t.g += 5); upd(); re('p'); }, G.gold < own.length * 40, 'shield');
        if (own.length) { const t0 = own[0], ti0 = TW.indexOf(t0), d = caravanDest(ti0); btn('Vyslať karavánu z ' + t0.n + (d >= 0 ? ' do ' + TW[d].n : '') + ' (200 zlata, zisk 30–70 %, môžu ju prepadnúť)', () => { sendCaravan(ti0); upd(); re('p'); }, G.gold < 200 || d < 0, 'cart'); }
        if ((G.cars || []).length) row('Karavány na ceste: ' + G.cars.map(c => TW[c.from].n + ' → ' + TW[c.to].n).join(', ') + '.');
        if (vill.length) btn('Obnoviť vypálené dediny (' + vill.filter(v => v.st > 0).length + ', 30 zlata/dedinu)', () => { const b = vill.filter(v => v.st > 0); G.gold -= b.length * 30; b.forEach(v => v.st = 0); upd(); re('p'); }, !vill.some(v => v.st > 0) || G.gold < vill.filter(v => v.st > 0).length * 30, 'village');
    }
    btn('Späť', back, 0, 'back');
}
/** Spoločník dostane léno: odíde z družiny a stane sa lordom (strážcom) hradu ti. */
function grantToCompanion(c, ti) {
    const t = TW[ti];
    G.comp = (G.comp || []).filter(id => id !== c.id);
    (G.cfief = G.cfief || {})[c.id] = ti;
    t.lord = c.n;
    E.push({ id: ++NID, x: t.x, y: t.y + 25, f: G.fac, n: 8 + compLv(c) * 2, vx: 0, vy: 0, w: 0, nm: c.n, home: ti, role: 'guard', rl: 60, vas: 1, loy: 30, cp: c.id });
    lg(c.n + ' prijal léno ' + t.n + ' a bude ho brániť.');
}
/** Spoločník s lénom sa vráti do družiny. */
function recallCompanion(cid) {
    const ti = G.cfief[cid], t = TW[ti], c = compDef(cid);
    delete G.cfief[cid];
    if (t && t.lord === c.n) t.lord = 0;
    E = E.filter(e => !(e.cp === cid));
    G.comp = G.comp || []; G.comp.push(cid); (G.chp = G.chp || {})[cid] = 1;
    lg(c.n + ' sa vrátil do družiny.');
}
