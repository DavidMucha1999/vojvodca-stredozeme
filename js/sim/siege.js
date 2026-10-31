/*
 * Obliehanie: tábor obliehateľov, rebríky, baranidlo a vyhladovanie.
 */
function siege(i) {
    const t = TW[i];
    if (!G.sg || G.sg.t !== i)
        G.sg = { t: i, lad: 0, ram: 0, d: 0 };
    const s = G.sg;
    mode = 'town';
    G.dest = -1;
    const inside = E.filter(e => e.f === t.f && !e.dead && Math.hypot(e.x - t.x, e.y - t.y) < 15 * K), lordN = Math.round(inside.reduce((a, e) => a + e.n, 0));
    show('Obliehanie: ' + t.n, 'Posádka ' + t.g + (t.wl ? ', hradby stupeň ' + t.wl : '') + (inside.length ? '. V hrade bráni aj ' + inside.map(e => e.nm).join(', ') + ' s ' + lordN + ' mužmi' : '') + '. Obliehanie trvá ' + s.d + ' dní. Rebríky: ' + (s.lad ? 'pripravené' : 'nie') + ', baranidlo: ' + (s.ram ? 'pripravené' : 'nie') + '. Každý deň obliehania posádka hladuje.');
    const day = () => { endDay(); worldTick(1); t.g = Math.max(3, t.g - 3 - (t.wl || 0)); s.d++; mode = 'town'; siege(i); };
    if (!s.lad)
        btn('Postaviť rebríky (1 deň)', () => { s.lad = 1; day(); });
    if (!s.ram)
        btn('Postaviť baranidlo (2 dni)', () => { s.ram = 1; endDay(); worldTick(1); day(); });
    btn('Vyhladovať posádku (čakať 1 deň)', () => day());
    btn('Zaútočiť na hradby', () => { ov.classList.add('hide'); startBattle({ n: Math.min(40, Math.max(3, t.g + lordN)), f: t.f, t, siege: 1, lords: inside }); });
    btn('Zrušiť obliehanie', () => { G.sg = null; ov.classList.add('hide'); mode = 'map'; });
}
