/*
 * Pomocné funkcie rozhrania: okná, tlačidlá a správy.
 */
const msg = (t, fn) => { show('Správa', t); btn('Späť', fn); };
/** Tlačidlo okna. icon = { k, i } pridá ikonku veci od kováča (k = druh výbavy, i = poradie). */
function btn(label, fn, off, icon) {
    const b = document.createElement('button'); b.textContent = label; b.onclick = fn; b.disabled = !!off;
    if (icon && typeof Soldiers !== 'undefined') {
        const c = Soldiers.icon(icon.k, icon.i, FC[G.fac]);
        c.className = 'ico'; b.dataset.icon = ['ico', icon.k, icon.i, G.fac].join('_'); if (b.prepend) b.prepend(c);
    }
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
