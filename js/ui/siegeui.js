/*
 * Okná obliehania pre hráča (logika v js/sim/siege.js):
 *   siege(i)      – „Obliehať hrad“: založí obliehanie, alebo sa pridá k obliehaniu spojencov, a otvorí prehľad
 *   siegeMenu(i)  – stav obliehania (deň, posádka, zásoby, technika, kto oblieha) a voľby: čo stavať, čakať, zaútočiť, odtiahnuť
 *   defendCastle(i) – vstúpiť do spojeneckého obliehaného hradu a brániť ho, keď útočníci zaútočia
 *   siegeEventUI() – výzva, keď AI spojenci útočia (pridať sa), nepriateľ útočí na hrad, ktorý bránime, alebo posádka robí výpad
 * Počas obliehania čas plynie ako v tábore (dá sa zrýchliť); klik na mapu ďaleko od hradu obliehanie opustí.
 */
const pct = v => Math.round(v * 100) + ' %';
function siege(i) {
    const t = TW[i];
    let s = t.sg;
    if (s && hos(s.f, G.fac)) { msg('Hrad ' + t.n + ' už oblieha ' + FN[s.f] + ', s ktorým si vo vojne. Najprv musíš poraziť ich vojsko.', () => town(i)); return; }
    if (!s) s = startSiege(i, G.fac === 6 && !G.kn ? 6 : G.fac, 'G');
    else if (s.lead !== 'G') lg('Pridal si sa k obliehaniu hradu ' + t.n + ' (' + FN[s.f] + ').');
    G.besiege = i; G.defend = -1; G.camp = 0;
    G.x = G.tx = t.x - 70; G.y = G.ty = t.y + 50;   // tábor pred bránou
    siegeMenu(i);
}
function siegeMenu(i) {
    const t = TW[i], s = t.sg;
    if (!s) { G.besiege = -1; mode = 'map'; ov.classList.add('hide'); return; }
    mode = 'town'; G.dest = -1;
    const bs = besiegers(i), ins = defenders(i), lead = s.lead === 'G' ? 'ty' : (E.find(e => e.id === s.lead) || {}).nm || FN[s.f];
    show('Obliehanie: ' + t.n, (s.lead === 'G' ? 'Obliehanie vedieš ty' : 'Obliehanie vedie ' + lead) + ' – ' + (G.day - s.d0 + 1) + '. deň. Posádka ' + t.g + (t.wl ? ', hradby stupeň ' + t.wl : '') + (ins.length ? '; v hrade sú aj ' + ins.map(e => e.nm + ' (' + Math.ceil(e.n) + ')').join(', ') : '') + '. Zásoby posádky: ' + (s.food > 0 ? 'na ' + s.food + ' dní' : 'došli – posádka hladuje') + '.');
    row('Obliehatelia: tvoje vojsko (' + ar() + ')' + (bs.length ? ', ' + bs.map(e => e.nm + ' (' + Math.ceil(e.n) + ')').join(', ') : '') + ' – spolu ' + Math.round(siegeMen(i)) + ' mužov proti ' + Math.round(defStrength(i)) + ' obrancom.', { icon: { canvas: Icons.canvas('sword'), key: 'ico_ui_sword' } });
    row('Technika: ' + ['lad', 'ram', 'tow'].map(k => SIEGE_NAME[k] + ' ' + (s[k] ? 'hotové' : pct(siegeProg(s, k)))).join(', ') + '. Za deň pribudne práca ' + Math.min(SIEGE_DAY_WORK, Math.round(siegeMen(i))) + ' (rebríky ' + SIEGE_WORK.lad + ', baranidlo ' + SIEGE_WORK.ram + ', veža ' + SIEGE_WORK.tow + ').', { dim: 1 });
    if (s.lead === 'G') {
        const days = k => Math.max(1, Math.ceil((SIEGE_WORK[k] - (s.w[k] || 0)) / Math.max(1, Math.min(SIEGE_DAY_WORK, siegeMen(i)))));
        [['lad', 'Stavať rebríky', 'ladder'], ['ram', 'Stavať baranidlo (rýchlejšie rozbije bránu)', 'ram'], ['tow', 'Stavať obliehaciu vežu (široký prechod cez hradby, obrancovia slabší)', 'castle']].forEach(([k, n, ic]) => {
            if (s[k]) return;
            const b = btn((s.build === k ? '▶ ' : '') + n + ' (≈' + days(k) + ' d.)', () => { s.build = k; siegeMenu(i); }, 0, ic);
            if (s.build === k) select(b);
        });
    } else row('Techniku stavia ' + lead + ': ' + (aiBuild(t) ? SIEGE_NAME[aiBuild(t)] : 'všetko je hotové') + '. Keď bude pripravená, zaútočí – môžeš sa pridať.', { dim: 1 });
    btn('Čakať v tábore (čas plynie, dá sa zrýchliť)', () => { ov.classList.add('hide'); mode = 'map'; upd(); }, 0, 'tent');
    btn(siegeReady(s) ? 'Zaútočiť na hradby' : 'Zaútočiť na hradby (najprv postav rebríky alebo vežu)', () => siegeBattle(i), !siegeReady(s), 'attack');
    btn('Odtiahnuť od hradu', () => { leaveSiege(i); ov.classList.add('hide'); mode = 'map'; }, 0, 'back');
}
/** Hráč opúšťa obliehanie; ak ho viedol a nikto iný neoblieha, obliehanie skončí. */
function leaveSiege(i) {
    const t = TW[i], s = t.sg; G.besiege = -1;
    if (s && s.lead === 'G') {
        const bs = besiegers(i);
        if (!bs.length) { t.sg = null; lg('Zrušil si obliehanie hradu ' + t.n + '.'); }
        else { s.lead = bs.reduce((a, b) => b.n > a.n ? b : a).id; lg('Odtiahol si od ' + t.n + '; obliehanie preberá ' + (E.find(e => e.id === s.lead) || {}).nm + '.'); }
    } else if (s) lg('Odtiahol si od obliehaného hradu ' + t.n + '.');
    upd();
}
/** Útok na hradby: obrancovia (posádka + lordi vnútri) proti hráčovi a všetkým spojencom v obliehacom tábore. */
function siegeBattle(i) {
    const t = TW[i], s = t.sg || {}, ins = defenders(i), lordN = Math.round(ins.reduce((a, e) => a + e.n, 0));
    ov.classList.add('hide');
    startBattle({ n: Math.min(60, Math.max(3, t.g + lordN)), f: t.f, t, siege: 1, lords: ins, sgFood: s.food });
}
/** Vstup do spojeneckého obliehaného hradu: hráč čaká vnútri a bojuje, keď nepriateľ zaútočí. */
function defendCastle(i) {
    const t = TW[i]; G.defend = i; G.besiege = -1; G.camp = 0;
    G.x = G.tx = t.x; G.y = G.ty = t.y + 10;
    lg('Vstúpil si do obliehaného hradu ' + t.n + ' a pomáhaš ho brániť.');
    msg('Si za hradbami ' + t.n + '. Keď obliehatelia zaútočia, budeš brániť hradby spolu s posádkou. Čas plynie ako v tábore (dá sa zrýchliť); klik na mapu hrad opustí.', () => { ov.classList.add('hide'); mode = 'map'; upd(); });
}
/** Obrana hradu: útočníci z tábora proti hráčovi a posádke (posádka bojuje po boku hráča, hradby jej dodávajú silu). */
function defendBattle(i) {
    const t = TW[i], s = t.sg, bs = besiegers(i), A = Math.round(bs.reduce((a, e) => a + e.n, 0));
    ov.classList.add('hide');
    startBattle({ nm: 'Obliehatelia ' + t.n, n: Math.min(60, Math.max(4, A)), f: s.f, def: i, foes: bs, t });
}
/** Výzva hráčovi pri udalosti obliehania (volá updMap, keď je mapa voľná). */
function siegeEventUI() {
    const ev = SIEGE_EVENT; SIEGE_EVENT = null;
    const t = TW[ev.i], s = t.sg; if (!s) return;
    mode = 'town';
    if (ev.kind === 'assault') {
        const lead = (E.find(e => e.id === s.lead) || besiegers(ev.i)[0] || {}).nm || FN[s.f];
        show('Útok na ' + t.n, lead + ' dáva rozkaz k útoku na hradby. Technika je pripravená (' + ['lad', 'ram', 'tow'].filter(k => s[k]).map(k => SIEGE_NAME[k]).join(', ') + '). Obrancov je asi ' + Math.round(defStrength(ev.i)) + ', útočníkov ' + Math.round(siegeMen(ev.i) + (playerBesieging(ev.i) ? 0 : ar())) + '.');
        btn('Pridať sa k útoku', () => { G.besiege = ev.i; siegeBattle(ev.i); }, 0, 'attack');
        btn('Zostať bokom (útočia bez teba)', () => { siegeAssaultAI(ev.i); ov.classList.add('hide'); mode = 'map'; upd(); }, 0, 'back');
    } else if (ev.kind === 'defend') {
        show('Nepriateľ útočí na ' + t.n, FN[s.f] + ' sa ženie na hradby s ' + Math.round(siegeMen(ev.i)) + ' mužmi. Posádka (' + t.g + ') čaká na tvoj rozkaz.');
        btn('Brániť hradby', () => defendBattle(ev.i), 0, 'shield');
        btn('Nechať posádku brániť samu', () => { siegeAssaultAI(ev.i); if (G.defend === ev.i && TW[ev.i].f !== G.fac && hos(TW[ev.i].f, G.fac)) G.defend = -1; ov.classList.add('hide'); mode = 'map'; upd(); }, 0, 'back');
    } else if (ev.kind === 'sortie') {
        const n = Math.max(4, Math.round(t.g * .6));
        show('Výpad posádky ' + t.n, 'Brána sa otvorila a ' + n + ' obrancov vyráža na tvoj tábor!');
        btn('Do zbrane!', () => { ov.classList.add('hide'); t.g = Math.max(2, t.g - n); startBattle({ nm: 'Výpad posádky ' + t.n, n, f: t.f, sortie: ev.i, t }); }, 0, 'attack');
    }
}
