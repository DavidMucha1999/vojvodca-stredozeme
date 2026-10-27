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
    show('Obliehanie: ' + t.n, 'Posádka ' + t.g + (t.wl ? ', hradby stupeň ' + t.wl : '') + '. Obliehanie trvá ' + s.d + ' dní. Rebríky: ' + (s.lad ? 'pripravené' : 'nie') + ', baranidlo: ' + (s.ram ? 'pripravené' : 'nie') + '. Každý deň obliehania posádka hladuje.');
    const day = () => { dayT = 600; worldTick(1); t.g = Math.max(3, t.g - 3 - (t.wl || 0)); s.d++; mode = 'town'; siege(i); };
    if (!s.lad)
        btn('Postaviť rebríky (1 deň)', () => { s.lad = 1; day(); });
    if (!s.ram)
        btn('Postaviť baranidlo (2 dni)', () => { s.ram = 1; dayT = 600; worldTick(1); day(); });
    btn('Vyhladovať posádku (čakať 1 deň)', () => day());
    btn('Zaútočiť na hradby', () => { ov.classList.add('hide'); startBattle({ n: Math.min(30, Math.max(3, t.g)), f: t.f, t, siege: 1 }); });
    btn('Zrušiť obliehanie', () => { G.sg = null; ov.classList.add('hide'); mode = 'map'; });
}
