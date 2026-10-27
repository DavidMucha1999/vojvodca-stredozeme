/*
 * Automatický test simulácie bez prehliadača.
 * Spustenie: node tests/sim.test.js
 * Načíta všetky skripty hry s náhradným plátnom a DOM, odohrá desiatky dní
 * a skontroluje, že sa nič nepokazilo (žiadne chyby, NaN ani zaseknuté bitky).
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const scripts = [...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);

const noop = () => { };
const grad = { addColorStop: noop };
const ctx2d = new Proxy({}, { get: (t, k) => k in t ? t[k] : k === 'measureText' ? () => ({ width: 50 }) : k === 'getTransform' ? () => ({}) : k.startsWith('create') ? () => grad : noop, set: (t, k, v) => { t[k] = v; return true; } });
const reg = {};
function el(id) {
    const e = { id, style: {}, dataset: {}, children: [], classList: { add: noop, remove: noop, contains: () => false }, value: id === 'fs' ? '6' : id === 'pn' ? 'Test' : '',
        appendChild(c) { this.children.push(c); c.parentNode = this; return c; }, insertBefore(c) { this.children.push(c); return c; }, setAttribute: noop, addEventListener: noop, focus: noop,
        getContext: () => ctx2d, toDataURL: () => '', getBoundingClientRect: () => ({ left: 0, top: 0, width: 720, height: 480 }),
        querySelector: () => null, querySelectorAll: () => [], get lastChild() { return this.children[this.children.length - 1]; } };
    Object.defineProperty(e, 'innerHTML', { set(v) { this._h = v; if (String(v).includes('id="bt"')) reg.bt = el('bt'); }, get() { return this._h || ''; } });
    Object.defineProperty(e, 'textContent', { set(v) { this._t = v; }, get() { return this._t || ''; } });
    return e;
}
const sandbox = {
    console, Math, JSON, Date, Object, Array, String, Number, Proxy, Set, Map, isFinite, parseInt,
    document: { getElementById: id => reg[id] || (reg[id] = el(id)), createElement: () => el(), head: el('head'), querySelector: () => null, querySelectorAll: () => [] },
    localStorage: { _: {}, setItem(k, v) { this._[k] = v; }, getItem(k) { return this._[k] || null; } },
    addEventListener: noop, requestAnimationFrame: noop, setTimeout: f => f(), setInterval: noop,
};
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const s of scripts) vm.runInContext(fs.readFileSync(path.join(ROOT, s), 'utf8'), sandbox, { filename: s });

const run = code => vm.runInContext(code, sandbox);
let fails = 0;
const check = (name, ok, info = '') => { console.log((ok ? 'OK   ' : 'CHYBA') + ' ' + name + (info ? ' – ' + info : '')); if (!ok) fails++; };
const closeMenus = `(()=>{ const b = document.getElementById('bt'); if (b && b.children.length && Math.random() < .5) { const x = b.children.find(c => c.onclick && !c.disabled); if (x) { try { x.onclick.call(x); } catch (e) { throw e; } } } mode = 'map'; })()`;

try {
    run('newGame(); mode = "map"; G.camp = 1; G.gold = 5000;');
    check('Nová hra', run('!!G && TW.length === 50 && VL.length === 100'), run('TW.length + " hradov, " + VL.length + " dedín"'));
    for (let i = 0; i < 40000; i++) {
        const m = run('mode');
        if (m === 'map') run('updMap(1)');
        else if (m === 'battle') { run('U[0].hp = 999; for (const u of U) if (u.t) u.hp = 0; updBattle(1)'); }
        else run(closeMenus);
    }
    check('Simulácia dní', run('G.day') > 40, 'deň ' + run('G.day'));
    check('Armády bez chýb v číslach', run('E.every(e => isFinite(e.x) && isFinite(e.y) && isFinite(e.n) && e.n >= 0)'), run('E.length') + ' armád');
    check('Hráč bez chýb v číslach', run('isFinite(G.x) && isFinite(G.y) && isFinite(G.gold) && isFinite(G.hp)'));
    run('mode = "map"; G.camp = 0; G.inf = 40; G.hp = 999;');
    run('var si = TW.findIndex(t => hos(t.f, G.fac) && t.f !== 9); siege(si); startBattle({ n: 10, f: TW[si].f, t: TW[si], siege: 1 });');
    let k = 0; while (run('mode') === 'battle' && k < 12000) { run('U[0].hp = 999; updBattle(1)'); k++; }
    check('Obliehanie sa skončí', run('mode') !== 'battle', k + ' snímok');
    run('mode = "map"; save(); var d = G.day; G = null; load();');
    check('Uloženie a načítanie', run('!!G && G.day === d'));
} catch (e) { fails++; console.log('CHYBA výnimka: ' + e.stack); }
console.log(fails ? '\n' + fails + ' testov zlyhalo.' : '\nVšetky testy prešli.');
process.exit(fails ? 1 : 0);
