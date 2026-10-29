/*
 * Vedľajšie úlohy od pánov (dáta v js/data/quests.js).
 * G.qu = zoznam aktívnych úloh: { id, lord (meno pána), lf (frakcia pána), t (hrad pána), step, cnt, day }.
 * G.qdone = počet splnených úloh podľa id (tá istá úloha sa dá splniť znova až po 20 dňoch, G.qlast).
 * Postup kontrolujú háčiky: questEvent('k', frakcia) po bitke, questEvent('v', hrad) pri vstupe do hradu,
 * questEvent('t', frakcia) po rozhovore; tovar sa odovzdáva v hrade pána tlačidlom.
 */
const MAX_QUESTS = 3;
const qText = (q, s) => s.replace(/\{L\}/g, q.lord).replace(/\{T\}/g, q.t).replace(/\{Y\}/g, G.name);
const qDef = q => QUESTS.find(d => d.id === q.id);
const qStep = q => qDef(q).steps[q.step];
const qLordKing = q => E.some(e => e.nm === q.lord && e.kr);

/** Úloha, ktorú by pán e mohol ponúknuť (podľa strany a povahy), alebo null. */
function questFor(e) {
    per(e);
    G.qu = G.qu || []; G.qlast = G.qlast || {};
    if (G.qu.length >= MAX_QUESTS || G.qu.some(q => q.lord === e.nm)) return null;
    const home = TW.find(t => t.f === e.f && !hos(t.f, G.fac)) || TW.find(t => t.f === e.f);
    if (!home) return null;
    const side = bloc(e.f), pool = QUESTS.filter(d => (d.side == null || d.side === side) && d.tr.includes(e.tr) && !G.qu.some(q => q.id === d.id) && (G.qlast[d.id] == null || G.day - G.qlast[d.id] > 20));
    if (!pool.length) return null;
    const h = ((e.id || 1) * 7919 + G.day) % pool.length;
    return { def: pool[h], home };
}
/** Pán e zadá úlohu def. */
function questAccept(e, def, home) {
    G.qu.push({ id: def.id, lord: e.nm, lf: e.f, t: home.n, step: 0, cnt: 0, day: G.day });
    lg('Nová úloha od ' + e.nm + ': ' + def.n + '.');
    upd();
}
/** Posun kroku; pri poslednom kroku sa úloha uzavrie u pána (krok r) alebo rovno (ak r nie je). */
function questAdvance(q) {
    q.step++; q.cnt = 0;
    const d = qDef(q);
    if (q.step >= d.steps.length) questComplete(q);
    else { lg('Úloha ' + d.n + ': ' + qText(q, d.steps[q.step].s)); TS = { s: 'Úloha: ' + qText(q, d.steps[q.step].s), l: 240 }; }
}
function questComplete(q) {
    const d = qDef(q), lord = E.find(e => e.nm === q.lord), king = lord && lord.kr;
    G.gold += d.r; G.ren += d.ren;
    if (lord) lord.rl = (lord.rl || 0) + d.rl * (king ? 2 : 1);
    if (king) rl(G.fac, q.lf, 8);
    G.qu = G.qu.filter(x => x !== q);
    G.qdone = G.qdone || {}; G.qdone[q.id] = (G.qdone[q.id] || 0) + 1;
    G.qlast[q.id] = G.day;
    G.st.q = (G.st.q || 0) + 1;
    lg('Splnená úloha ' + d.n + ': ' + d.r + ' zlata, sláva +' + d.ren + (king ? ', panovník ' + q.lord + ' si ťa váži' : '') + '.');
    upd();
    return d;
}
/** Udalosť pre úlohy: k = porazená armáda frakcie a (9 = banditi), v = vstup do hradu a, t = rozhovor s veliteľom frakcie a. */
function questEvent(k, a) {
    if (!G || !G.qu) return;
    for (const q of [...G.qu]) {
        const s = qStep(q);
        if (!s || s.k === 'r' || s.k === 'd') continue;
        if (s.k === 'k' && k === 'k') {
            const ok = s.a === 'bandit' ? a === 9 : s.a === 'enemy' ? a !== 9 && hos(a, G.fac) : a === s.a;
            if (ok && ++q.cnt >= s.n) questAdvance(q); else if (ok) { lg('Úloha ' + qDef(q).n + ': ' + q.cnt + '/' + s.n); TS = { s: qDef(q).n + ': ' + q.cnt + '/' + s.n, l: 180 }; }
        }
        if (s.k === 'v' && k === 'v' && a === s.a) questAdvance(q);
        if (s.k === 't' && k === 't' && a === s.a) questAdvance(q);
    }
}
/** Úlohy, ktoré sa dajú uzavrieť alebo odovzdať v hrade t (pán tam má sídlo). */
const questsAt = t => (G.qu || []).filter(q => q.t === t.n && (qStep(q).k === 'r' || qStep(q).k === 'd'));
/** Odovzdá tovar pre krok d, ak ho hráč vezie dosť. */
function questDeliver(q) {
    const s = qStep(q), have = (G.cargo || {})[s.a] || 0;
    if (have < s.n) return false;
    G.cargo[s.a] -= s.n;
    questAdvance(q);
    return true;
}
/** Zruší úlohu (vzťah s pánom klesne). */
function questAbandon(q) {
    const lord = E.find(e => e.nm === q.lord);
    if (lord) lord.rl = (lord.rl || 0) - 6;
    G.qu = G.qu.filter(x => x !== q);
    lg('Vzdal si sa úlohy ' + qDef(q).n + '.');
    upd();
}
