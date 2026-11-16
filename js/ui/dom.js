/*
 * Pomocné funkcie rozhrania: okná, tlačidlá a správy.
 */
const msg = (t, fn) => { show('Správa', t); btn('Späť', fn); };
/** Tlačidlo okna. icon = { k, i } pridá ikonku veci od kováča (k = druh výbavy, i = poradie). */
function btn(label, fn, off, icon) {
    const b = document.createElement('button'); b.textContent = label; b.onclick = fn; b.disabled = !!off;
    // ikona: {k,i} = výbava (kováč), {u} = vojak ako v boji, reťazec = ikona rozhrania (Icons)
    let c = null, key = null;
    if (icon && typeof Soldiers !== 'undefined' && icon.k) { c = Soldiers.icon(icon.k, icon.i, FC[G.fac]); key = ['ico', icon.k, icon.i, G.fac].join('_'); }
    else if (icon && typeof Soldiers !== 'undefined' && icon.u) { c = Soldiers.unitIcon(icon.u, FC[G.fac]); key = ['ico_u', icon.u, G.fac].join('_'); }
    else if (typeof icon === 'string' && typeof Icons !== 'undefined' && Icons.has(icon)) { c = Icons.canvas(icon); key = 'ico_ui_' + icon; }
    if (c) { c.className = 'ico'; b.dataset.icon = key; if (b.prepend) b.prepend(c); }
    document.getElementById('bt').appendChild(b);
    return b;
}
/** Stav bohatých obrazoviek (js/engine/scenes/UIRich.js): vybraná záložka, slot výbavy, kategória volieb a kam sa vrátiť. */
let RICH = { tab: 'eq', slot: 'w', cat: 0, back: null, backLabel: 'Späť' };
let LOG = [], TS = null, BI = 'g', RN = null, PORTRAIT = null;
/** Textový riadok v okne (cez celú šírku). o.gold = zlatý nadpis riadka, o.dim = tlmený, o.color = vlastná farba, o.icon = plátno ikony/portrétu + kľúč. */
function row(text, o = {}) {
    const d = document.createElement('div');
    d.style.cssText = 'grid-column:1/-1;text-align:left;font-size:' + (o.gold ? '.95rem;color:var(--gold);margin-top:.3rem' : o.dim ? '.85rem;opacity:.85' : '.9rem') + (o.color ? ';color:' + o.color : '');
    if (o.gold) d.dataset.kind = 'gold'; else if (o.dim) d.dataset.kind = 'dim'; else if (o.color) d.dataset.kind = 'gold';
    d.textContent = text;
    if (o.icon && o.icon.canvas) { o.icon.canvas.className = 'ico'; d.dataset.icon = o.icon.key; if (d.prepend) d.prepend(o.icon.canvas); }
    document.getElementById('bt').appendChild(d);
    return d;
}
/** Zlatý nadpis riadka (napr. meno postavy alebo hradu v zozname). */
const rowHead = text => row(text, { gold: 1 });
/** Označí tlačidlo ako zvolené (biely rám). */
const select = b => { b.dataset.sel = '1'; b.style.outline = '3px solid #fff'; return b; };
/** Okno s nadpisom h a textom body. Ak je pred volaním nastavený PORTRAIT (popis tváre), okno dostane portrét (plátno .por). */
function show(h, body) {
    ov.classList.remove('encv');
    delete ov.dataset.screen; delete ov.dataset.ti; delete ov.dataset.tab;   // druh bohatej obrazovky (js/engine/scenes/UIRich.js) nastaví až volajúci
    {
        ov.innerHTML = '<h1>' + h + '</h1><p>' + body + '</p><div id="bt"></div>';
        if (PORTRAIT && typeof Portraits !== 'undefined') {
            try { const c = Portraits.canvas(PORTRAIT); c.className = 'por'; c.dataset.key = 'por_' + JSON.stringify(PORTRAIT); ov.insertBefore(c, ov.firstChild); } catch (e) { }
        }
        PORTRAIT = null;
        if (document.body && document.body.classList.contains('phaser-ui')) ov.classList.add('pending');   // okno nakreslí Phaser (UIScene); HTML verzia sa medzitým neukáže
        ov.classList.remove('hide');
    }
}
