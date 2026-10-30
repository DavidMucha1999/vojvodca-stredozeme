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
let LOG = [], TS = null, BI = 'g', RN = null;
function show(h, body) {
    ov.classList.remove('encv');
    {
        ov.innerHTML = '<h1>' + h + '</h1><p>' + body + '</p><div id="bt"></div>';
        ov.classList.remove('hide');
    }
}
