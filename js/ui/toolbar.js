/*
 * Panel tlačidiel na mape a rozkazy v bitke.
 */
const od = document.createElement('div');
od.style.cssText = 'display:none;position:absolute;bottom:.5rem;left:50%;transform:translateX(-50%);gap:.3rem;z-index:2';
const wrapEl = document.getElementById('wrap');
wrapEl.appendChild(od);
// rozkazy v bitke: horný rad skupiny (1–4), dolný rad rozkazy (T H F G R) pre vybranú skupinu (js/sim/combat.js)
[['all', '1 Všetci'], ['p', '2 Pechota'], ['l', '3 Lukostrelci'], ['j', '4 Jazda']].forEach(([g, n]) => { const b = document.createElement('button'); b.textContent = n; b.dataset.g = g; b.style.cssText = 'font-size:.75rem;padding:.25rem .5rem;opacity:.55'; b.onclick = () => selGroup(g); od.appendChild(b); });
[['a', 'T Útok'], ['h', 'H Držať'], ['f', 'F Za mnou'], ['l', 'G Šík'], ['r', 'R Ústup']].forEach(([k, n]) => { const b = document.createElement('button'); b.textContent = n; b.dataset.k = k; b.dataset.n = n.slice(2); b.style.cssText = 'font-size:.8rem;padding:.3rem .55rem;opacity:.55'; b.onclick = () => setOrd(k); od.appendChild(b); });
[['o_adv', 'Vpred'], ['o_bk', 'Vzad'], ['o_hf', 'Držať palbu']].forEach(([x, n]) => { const b = document.createElement('button'); b.textContent = n; b.dataset.x = x; b.dataset.n = n; b.style.cssText = 'font-size:.75rem;padding:.25rem .5rem;opacity:.55'; b.onclick = () => { tacOrder(x); odSync(); }; od.appendChild(b); });   // posun o 10 krokov a palba (js/sim/tactics.js)
{ const b = document.createElement('button'); b.textContent = 'X Riadky'; b.dataset.fm = 1; b.style.cssText = 'font-size:.8rem;padding:.3rem .55rem'; b.onclick = () => { cycleFormation(); odSync(); }; od.appendChild(b); }   // útvar skupiny (js/sim/combat.js)
od.style.flexWrap = 'wrap'; od.style.justifyContent = 'center'; od.style.maxWidth = '90%';
/** Vybraná skupina vojska pre rozkazy. */
function selGroup(g) { CMB.sel = g; odSync(); }
/** Rozkaz vybranej skupine (alebo všetkým). */
const ORD_SHOUT = { a: 'Do útoku!', h: 'Držte pozície!', f: 'Za mnou!', l: 'Do šíku!', r: 'Ústup!' };
function setOrd(k) {
    ORD = k;
    const gs = CMB.sel === 'all' ? ['p', 'l', 'j'] : [CMB.sel];
    // hlasový povel: vojaci začnú rozkaz plniť s malým oneskorením (0,1 – 0,6 s), kým ho nepočuli, držia predošlý
    if (U && mode === 'battle' && gs.some(g => CMB.og[g] !== k)) {
        for (const u of U) if (!u.t && !u.ally && !u.h && u.hp > 0 && gs.includes(grpOf(u)) && CMB.og[grpOf(u)] !== k) { u.ogOld = CMB.og[grpOf(u)]; u.ordWait = 8 + Math.random() * 28; }
        wbMsg((GRP_N[CMB.sel] || 'Vojsko') + ': ' + (ORD_SHOUT[k] || ''), '#ffd24a'); if (k === 'a' || k === 'r') snd('horn');
    }
    gs.forEach(g => { CMB.og[g] = k; });
    ordPlace(gs, k);
    odSync();
}
function odSync() {
    const gs = CMB.sel === 'all' ? ['p', 'l', 'j'] : [CMB.sel];
    const K = KB();
    [...od.children].forEach(b => { if (b.dataset.x) { b.textContent = keyName(K[b.dataset.x]) + ' ' + (b.dataset.x === 'o_hf' ? (CMB.hf ? 'Palba' : 'Držať palbu') : b.dataset.n); b.style.opacity = b.dataset.x === 'o_hf' && CMB.hf ? 1 : .55; return; } if (b.dataset.fm) { b.textContent = keyName(K.fm) + ' ' + ({ line: 'Riadky', wall: 'Štítový val', loose: 'Voľný útvar' }[(CMB.fm || {})[gs[0]] || 'line']); return; } if (b.dataset.n) b.textContent = keyName(K['o_' + b.dataset.k]) + ' ' + b.dataset.n; b.style.opacity = b.dataset.g ? (b.dataset.g === CMB.sel ? 1 : .55) : gs.every(g => CMB.og[g] === b.dataset.k) ? 1 : .55; });
}
const tb = document.createElement('div');
tb.style.cssText = 'position:absolute;left:.5rem;bottom:.5rem;display:flex;gap:.3rem;z-index:2';
wrapEl.appendChild(tb);
[['−', () => { Z = Math.max(.45, Z - .15); }], ['+', () => { Z = Math.min(1.5, Z + .15); }], ['Prehľad', () => ovw()], ['Denník', () => dnk()], ['Úlohy', () => questLog()], ['Družina', () => party()], ['Inventár', () => inv()], ['Štatistiky', () => sts()], ['Legenda', () => { LEG = !LEG; }], ['Trofeje', () => tro()], ['Úspechy', () => achs()], ['Návod', () => {
            if (mode === 'map')
                help();
        }], ['Kronika hrdinu', () => chronicle()], ['Nastavenia hry', () => gameSettings()], ['Zvuk', function () {
            mu = !mu;
            if (mu)
                roar(0);
            this.textContent = 'Zvuk: ' + (mu ? 'vyp' : 'zap');
        }]].forEach(([n, fn]) => { const b = document.createElement('button'); b.textContent = n; b.style.cssText = 'font-size:.8rem;padding:.3rem .55rem'; b.onclick = fn; tb.appendChild(b); });
tb.style.flexWrap = 'wrap';
tb.style.maxWidth = '70%';
/** Rýchlosť času pri čakaní: ×1 → ×3 → ×8 (viditeľné len v tábore, pri obliehaní, obrane hradu a v zajatí). */
const timeBtn = document.createElement('button');
timeBtn.style.cssText = 'font-size:.8rem;padding:.3rem .55rem;display:none';
timeBtn.onclick = () => { if (!G) return; G.tmul = { 1: 3, 3: 8, 8: 1 }[G.tmul || 1]; upd(); };
[['Tábor', function () { if (!G || mode !== 'map')
            return; G.camp = !G.camp; if (!G.camp) G.stay = null; this.textContent = G.camp ? 'Zrušiť tábor' : 'Tábor'; upd(); }], ['Encyklopédia', () => { if (G && mode === 'map')
            ency(); }], ['Celá obrazovka', () => fsc()]].forEach(([n, fn]) => { const b = document.createElement('button'); b.textContent = n; b.style.cssText = 'font-size:.8rem;padding:.3rem .55rem'; b.onclick = fn; tb.appendChild(b); });

tb.appendChild(timeBtn);
