/*
 * Panel tlačidiel na mape a rozkazy v bitke.
 */
const od = document.createElement('div');
od.style.cssText = 'display:none;position:absolute;bottom:.5rem;left:50%;transform:translateX(-50%);gap:.3rem;z-index:2';
const wrapEl = document.getElementById('wrap');
wrapEl.appendChild(od);
// rozkazy v bitke: horný rad skupiny (1–4), dolný rad rozkazy (T H F G R) pre vybranú skupinu (js/sim/combat.js)
[['all', '1 Všetci'], ['p', '2 Pechota'], ['l', '3 Lukostrelci'], ['j', '4 Jazda']].forEach(([g, n]) => { const b = document.createElement('button'); b.textContent = n; b.dataset.g = g; b.style.cssText = 'font-size:.75rem;padding:.25rem .5rem;opacity:.55'; b.onclick = () => selGroup(g); od.appendChild(b); });
[['a', 'T Útok'], ['h', 'H Držať'], ['f', 'F Za mnou'], ['l', 'G Šík'], ['r', 'R Ústup']].forEach(([k, n]) => { const b = document.createElement('button'); b.textContent = n; b.dataset.k = k; b.style.cssText = 'font-size:.8rem;padding:.3rem .55rem;opacity:.55'; b.onclick = () => setOrd(k); od.appendChild(b); });
od.style.flexWrap = 'wrap'; od.style.justifyContent = 'center'; od.style.maxWidth = '90%';
/** Vybraná skupina vojska pre rozkazy. */
function selGroup(g) { CMB.sel = g; odSync(); }
/** Rozkaz vybranej skupine (alebo všetkým). */
function setOrd(k) {
    ORD = k;
    const gs = CMB.sel === 'all' ? ['p', 'l', 'j'] : [CMB.sel];
    gs.forEach(g => { CMB.og[g] = k; });
    ordPlace(gs, k);
    odSync();
}
function odSync() {
    const gs = CMB.sel === 'all' ? ['p', 'l', 'j'] : [CMB.sel];
    [...od.children].forEach(b => { b.style.opacity = b.dataset.g ? (b.dataset.g === CMB.sel ? 1 : .55) : gs.every(g => CMB.og[g] === b.dataset.k) ? 1 : .55; });
}
const tb = document.createElement('div');
tb.style.cssText = 'position:absolute;left:.5rem;bottom:.5rem;display:flex;gap:.3rem;z-index:2';
wrapEl.appendChild(tb);
[['−', () => { Z = Math.max(.45, Z - .15); }], ['+', () => { Z = Math.min(1.5, Z + .15); }], ['Prehľad', () => ovw()], ['Denník', () => dnk()], ['Úlohy', () => questLog()], ['Družina', () => party()], ['Inventár', () => inv()], ['Štatistiky', () => sts()], ['Legenda', () => { LEG = !LEG; }], ['Trofeje', () => tro()], ['Úspechy', () => achs()], ['Návod', () => {
            if (mode === 'map')
                help();
        }], ['Zvuk', function () {
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
