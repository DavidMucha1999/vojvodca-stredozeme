/*
 * Politika: rada šľachticov, hlasovanie o lénach a vojnách.
 */
function council() {
    const f = G.fac, L = E.filter(e => e.f === f);
    if (!L.length)
        return;
    const fr = TW.filter(t => t.f === f && !t.lord && !t.mine);
    const end = () => { ov.classList.add('hide'); mode = 'map'; };
    mode = 'town';
    if (fr.length && Math.random() < .6) {
        const t = fr[0], C = [...L.filter(e => !e.kr), ...L.filter(e => e.kr)].slice(0, 2), c = C.map(e => e.nm);
        evShow('Rada šľachticov: ' + FN[f], 'Rada rozhoduje, kto dostane léno ' + t.n + '. Kandidáti sú ty a ' + c.join(', ') + '.');
        btn('Hlasovať za seba', () => { let s = G.ren * 1.5 + (G.hon || 0) * .5 + 15; L.forEach(e => { per(e); s += ((e.rl || 0) > 10 ? 8 : -4) + (e.tr === 3 ? -6 : 0); }); const w = s > L.length * 4; if (w) {
            t.mine = 1;
            t.lord = G.name;
        }
        else
            t.lord = c[0]; lg(w ? 'Rada ti udelila léno ' + t.n + '.' : 'Léno ' + t.n + ' získal ' + c[0] + '.'); msg(w ? 'Rada ti udelila léno ' + t.n + '!' : 'Léno získal ' + c[0] + '.', end); });
        btn('Podporiť ' + c[0], () => { C[0].rl = (C[0].rl || 0) + 15; t.lord = c[0]; lg('Podporil si ' + c[0] + ' pri udelení léna.'); msg(c[0] + ' ti je vďačný.', end); });
    }
    else {
        const tg = [0, 1, 2, 3, 4, 5, 7, 8].filter(x => x !== f && !WR[f][x] && !AL[f][x]).sort((a, b) => TW.filter(t => t.f === a).length - TW.filter(t => t.f === b).length)[0];
        if (tg == null) {
            mode = 'map';
            return;
        }
        evShow('Rada šľachticov: ' + FN[f], 'Šľachtici navrhujú vyhlásiť vojnu frakcii ' + FN[tg] + '. Ako hlasuješ?');
        const go = y => { const v = Math.ceil(G.ren / 5) + 1, yes = L.filter(e => { per(e); return e.tr === 3 || e.tr === 4 || Math.random() < .4; }).length + (y ? v : 0), no = L.length + v - yes; const p = yes > no; if (p) {
            WR[f][tg] = WR[tg][f] = true;
            AL[f][tg] = AL[tg][f] = false;
            lg(FN[f] + ' na návrh rady vyhlásil vojnu ' + FN[tg] + '.');
        }
        else
            lg('Rada odmietla vojnu s ' + FN[tg] + '.'); msg('Hlasovanie: ' + yes + ' za, ' + no + ' proti. ' + (p ? 'Vojna je vyhlásená.' : 'Návrh neprešiel.'), end); };
        btn('Za vojnu', () => go(1));
        btn('Proti vojne', () => go(0));
    }
}
