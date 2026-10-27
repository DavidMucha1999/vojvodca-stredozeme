/*
 * Pomocné funkcie rozhrania: okná, tlačidlá a správy.
 */
const msg = (t, fn) => { show('Správa', t); btn('Späť', fn); };
function btn(label, fn, off) { const b = document.createElement('button'); b.textContent = label; b.onclick = fn; b.disabled = !!off; document.getElementById('bt').appendChild(b); }
let LOG = [], TS = null, BI = 'g', RN = null;
function show(h, body) {
    ov.classList.remove('encv');
    {
        ov.innerHTML = '<h1>' + h + '</h1><p>' + body + '</p><div id="bt"></div>';
        ov.classList.remove('hide');
    }
}
