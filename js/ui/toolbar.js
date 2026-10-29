/*
 * Panel tlačidiel na mape a rozkazy v bitke.
 */
const od = document.createElement('div');
od.style.cssText = 'display:none;position:absolute;bottom:.5rem;left:50%;transform:translateX(-50%);gap:.3rem;z-index:2';
const wrapEl = document.getElementById('wrap');
wrapEl.appendChild(od);
Object.entries({ a: '1 Útok', h: '2 Držať', r: '3 Ústup', f: '4 Šík' }).forEach(([k, n]) => { const b = document.createElement('button'); b.textContent = n; b.dataset.k = k; b.style.cssText = 'font-size:.8rem;padding:.3rem .55rem;opacity:.55'; b.onclick = () => setOrd(k); od.appendChild(b); });
function setOrd(k) { ORD = k; [...od.children].forEach(b => b.style.opacity = b.dataset.k === k ? 1 : .55); }
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
[['Tábor', function () { if (!G || mode !== 'map')
            return; G.camp = !G.camp; this.textContent = G.camp ? 'Zrušiť tábor' : 'Tábor'; upd(); }], ['Encyklopédia', () => { if (G && mode === 'map')
            ency(); }], ['Celá obrazovka', () => fsc()]].forEach(([n, fn]) => { const b = document.createElement('button'); b.textContent = n; b.style.cssText = 'font-size:.8rem;padding:.3rem .55rem'; b.onclick = fn; tb.appendChild(b); });
