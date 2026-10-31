/*
 * Dvor a vzťahy lordov.
 * Lordi majú vzťahy medzi sebou (LRL cez lr(a, b): priateľ > 8, spor < −3) a vernosť svojmu pánovi e.loy (0–30):
 * klesá po stratených hradoch, zvrhnutom maršalovi a pri sporoch s maršalom, rastie po víťazstvách a hostinách.
 * Lord v spore s maršalom odmieta jeho zvolanie; nespokojný lord (loy < 4), ktorý má hráča rád, ponúkne prestup listom
 * (LETTERS kind 'court'). Hostina na vlastnom hrade zlepší vzťahy a vernosť, dar urovná spor dvoch lordov.
 * Okno dvora: court(i) – zoznam lordov frakcie so vzťahmi, spormi a vernosťou.
 */
const loyOf = e => { if (e.loy == null) { per(e); e.loy = 12 + (e.tr === 0 ? 8 : e.tr === 3 ? -4 : e.tr === 1 ? -2 : 0) + (e.kr ? 20 : 0); } return e.loy; };
const friends = e => E.filter(o => o !== e && !o.dead && o.f === e.f && !o.nz && lr(e, o) > 8);
const foes = e => E.filter(o => o !== e && !o.dead && o.f === e.f && !o.nz && lr(e, o) < -3);
const setLr = (a, b, v) => { LRL[a.id + '-' + b.id] = v; LRL[b.id + '-' + a.id] = v; };
/** Denné zmeny vernosti a ponuky prestupu. */
function courtDaily() {
    E.forEach(e => {
        if (e.nz || e.f === 9 || e.dead) return;
        loyOf(e);
        const m = MAR[e.f] != null ? E.find(o => o.id === MAR[e.f]) : null;
        if (m && m !== e && lr(e, m) < -3 && Math.random() < .3) e.loy -= .3;        // slúži maršalovi, ktorého nenávidí
        if (e.f === G.fac && G.king) e.loy += .1;                                       // vlastný kráľ platí a chváli
        e.loy = Math.max(0, Math.min(30, e.loy + (Math.random() < .2 ? .2 : 0)));
        // nespokojný lord cudzej frakcie, ktorý má hráča rád, ponúkne služby (ak hráč velí vlastnej frakcii alebo je kráľ)
        if (e.f !== G.fac && e.loy < 4 && (e.rl || 0) > 12 && !e.kr && Math.random() < .08 && (G.king || G.fac === 6 && TW.some(t => t.mine)) && !LETTERS.some(L => L.kind === 'court' && L.eid === e.id)) {
            LETTERS.push({ kind: 'court', eid: e.id, from: e.nm, f: e.f, day: G.day, text: 'Pane, môj kráľ ma ponižuje a moje služby si neváži. Dlho som ťa sledoval. Ak ma prijmeš do svojich služieb, prídem aj so svojimi mužmi.' });
        }
    });
}
/** Straty a výhry frakcie: vernosť lordov. */
function courtEvent(f, kind) { E.forEach(e => { if (e.f === f && !e.nz) { loyOf(e); e.loy = Math.max(0, Math.min(30, e.loy + (kind === 'lost' ? -2 : kind === 'won' ? 1.5 : kind === 'overthrow' ? -1 : 0))); } }); }
/** List s ponukou prestupu. */
function courtLetter(L) {
    const e = E.find(o => o.id === L.eid && !o.dead);
    mode = 'town';
    if (e) PORTRAIT = Portraits.forLord(e);
    show('List od lorda ' + L.from, '„' + L.text + '“' + (e ? ' (' + e.nm + ', ' + FN[e.f] + ', ' + Math.ceil(e.n) + ' mužov, vernosť pánovi ' + Math.round(loyOf(e)) + ')' : ' (Lord medzitým padol.)'));
    btn('Prijať do služieb', () => { if (e) { const o = e.f; e.f = G.fac; e.loy = 20; e.rl = (e.rl || 0) + 10; e.home = TW.findIndex(t => t.mine) >= 0 ? TW.findIndex(t => t.mine) : e.home; rl(G.fac, o, -8); lg(e.nm + ' prešiel do tvojich služieb.'); assignRoles(G.fac); } ov.classList.add('hide'); mode = 'map'; }, !e, 'crown');
    btn('Odmietnuť', () => { if (e) e.rl = (e.rl || 0) - 5; ov.classList.add('hide'); mode = 'map'; }, 0, 'back');
}
/** Okno dvora: lordi frakcie f (alebo hradu i), vzťahy, spory, vernosť; hostina a urovnanie sporov. */
function court(i, back) {
    const t = TW[i], f = t.f, mine = t.mine, lords = E.filter(e => e.f === f && !e.dead && !e.nz).sort((a, b) => (b.kr ? 1 : 0) - (a.kr ? 1 : 0) || b.n - a.n);
    mode = 'town';
    const m = MAR[f] != null ? E.find(o => o.id === MAR[f]) : null;
    show('Dvor: ' + FN[f], 'Lordi kráľovstva (' + lords.length + ')' + (m ? ', maršal ' + m.nm : '') + '. Vzťah = k tebe, vernosť = k vlastnému pánovi (0–30; pod 4 lord uvažuje o prestupe). Spory medzi lordmi oslabujú zvolávanie vojska.');
    lords.slice(0, 12).forEach(e => {
        per(e); loyOf(e);
        const fr = friends(e).map(o => o.nm), fo = foes(e).map(o => o.nm);
        rowHead(e.nm + (e.kr ? ' (panovník)' : e === m ? ' (maršal)' : '') + ' · ' + TR[e.tr][0] + ' · ' + Math.ceil(e.n) + ' mužov · vzťah ' + Math.round(e.rl || 0) + ' · vernosť ' + Math.round(e.loy) + (e.home != null && TW[e.home] ? ' · ' + TW[e.home].n : ''));
        if (fr.length || fo.length) row((fr.length ? 'Priatelia: ' + fr.join(', ') + '. ' : '') + (fo.length ? 'Spory: ' + fo.join(', ') + '.' : ''), { dim: 1 });
        btn('Dar 40 zlata (vzťah +6)', () => { G.gold -= 40; e.rl = (e.rl || 0) + 6; upd(); court(i, back); }, G.gold < 40, 'coins');
        if (fo.length && (e.rl || 0) >= 10) btn('Urovnať spor s ' + fo[0] + ' (60 zlata)', () => { const o = foes(e)[0]; G.gold -= 60; setLr(e, o, 5); e.rl += 3; o.rl = (o.rl || 0) + 3; G.ren++; lg('Urovnal si spor medzi ' + e.nm + ' a ' + o.nm + '.'); upd(); court(i, back); }, G.gold < 60, 'honor');
    });
    if (mine) { const n = E.filter(e => e.f === G.fac && !e.dead && !e.nz && Math.hypot(e.x - t.x, e.y - t.y) < 500 * K).length, cost = 100 + n * 20; btn('Usporiadať hostinu (' + cost + ' zlata, ' + n + ' lordov v okolí)', () => { G.gold -= cost; feast(t); court(i, back); }, G.gold < cost || !n, 'mug'); }
    btn('Späť', back || (() => tsub(i, 'd')), 0, 'back');
}
/** Hostina: lordi v okolí prídu, vzťahy a vernosť stúpnu, spory sa občas urovnajú. */
function feast(t) {
    const guests = E.filter(e => e.f === G.fac && !e.dead && !e.nz && Math.hypot(e.x - t.x, e.y - t.y) < 500 * K);
    guests.forEach(e => { e.rl = (e.rl || 0) + 5; loyOf(e); e.loy = Math.min(30, e.loy + 3); });
    for (let k = 0; k < guests.length; k++) for (let j = k + 1; j < guests.length; j++) if (lr(guests[k], guests[j]) < -3 && Math.random() < .5) { setLr(guests[k], guests[j], 2); lg('Pri hostine sa zmierili ' + guests[k].nm + ' a ' + guests[j].nm + '.'); }
    G.ren += 2; G.hon = (G.hon || 0) + 1;
    lg('Hostina v ' + t.n + ': prišlo ' + guests.length + ' lordov. Sláva +2.');
    TS = { s: 'Hostina v ' + t.n + ' – ' + guests.length + ' lordov pripíja na tvoje zdravie.', l: 300 };
}
