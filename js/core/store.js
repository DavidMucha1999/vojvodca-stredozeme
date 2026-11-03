/*
 * Úložisko uložených hier.
 *   V prehliadači: localStorage (ako doteraz).
 *   V desktopovej verzii (Electron, priečinok desktop/): súbory .json v Dokumenty\Vojvodca Stredozeme\Uloženia –
 *   preload.js sprístupní window.desktop s funkciami load/save/list/quit/importSaves/savesDir.
 * Export a import (prenos uložení z prehliadača do desktopovej verzie): exportSaves() stiahne súbor vojvodca-ulozenia.json
 * so všetkými pozíciami; desktopová verzia ho pri prvom spustení nájde v Stiahnutých súboroch, alebo sa dá načítať tlačidlom.
 */
const DESKTOP = typeof window !== 'undefined' && window.desktop ? window.desktop : null;
if (DESKTOP && document.documentElement) document.documentElement.classList.add('desktop');   // css: hra na celé okno
const STORE = DESKTOP
    ? { getItem: k => DESKTOP.load(k), setItem: (k, v) => DESKTOP.save(k, v), keys: () => DESKTOP.list() }
    : { getItem: k => localStorage.getItem(k), setItem: (k, v) => localStorage.setItem(k, v), keys: () => { try { return Object.keys(localStorage); } catch (e) { return []; } } };
/** Všetky uložené pozície ako objekt { kľúč: text }. */
function allSaves() { const o = {}; STORE.keys().filter(k => /^vs/.test(k)).forEach(k => { const v = STORE.getItem(k); if (v) o[k] = v; }); return o; }
/** Stiahne súbor so všetkými uloženými hrami (na prenos do desktopovej verzie alebo zálohu). */
function exportSaves() {
    const data = JSON.stringify({ app: 'vojvodca-stredozeme', saves: allSaves() });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    a.download = 'vojvodca-ulozenia.json';
    document.body.appendChild(a); a.click(); a.remove();
    return Object.keys(JSON.parse(data).saves).length;
}
