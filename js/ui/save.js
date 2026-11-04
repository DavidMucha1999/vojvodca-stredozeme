/*
 * Okná ukladania a načítania: 6 ručných pozícií + automatická, každá s portrétom hrdinu a popisom (slotData v js/sim/game.js).
 */
/** Tlačidlo pozície s portrétom hrdinu z uloženia. */
function slotBtn(k, n, fn, off) {
    const d = slotData(k), b = btn(n + ': ' + (d ? d.text : 'prázdna'), fn, off);
    if (d && d.look && typeof Portraits !== 'undefined') { try { const c = Portraits.canvas(d.look, 34); c.className = 'ico'; b.dataset.icon = 'ico_por_' + k + '_' + (d.g.day || 0) + '_' + (d.g.name || ''); b.prepend(c); } catch (e) { } }
    else if (!d && typeof Icons !== 'undefined') { const c = Icons.canvas('chest'); c.className = 'ico'; b.dataset.icon = 'ico_ui_chest'; b.prepend(c); }
    return b;
}
function saveMenu(back) {
    mode = 'town';
    show('Uložiť hru', 'Vyber pozíciu (6 ručných). Hra sa okrem toho sama ukladá na konci každého dňa do automatickej pozície.');
    SLOTS.filter(([k]) => !/^auto/.test(k)).forEach(([k, n]) => slotBtn(k, n, () => { const had = !!slotData(k); msg(save(k) ? 'Hra uložená do pozície ' + k + (had ? ' (pôvodná pozícia prepísaná).' : '.') : 'Ukladanie nie je v tomto prostredí dostupné.', back); }));
    saveTransferBtns(() => saveMenu(back));
    btn('Späť', back, 0, 'back');
}
/** Výber pozície na načítanie (z úvodu). */
function loadMenu() {
    const any = SLOTS.some(([k]) => slotInfo(k));
    if (!any && !DESKTOP) return load(1);
    show('Načítať hru', 'Vyber uloženú pozíciu.');
    ov.classList.add('intro');
    SLOTS.forEach(([k, n]) => slotBtn(k, n, () => load(k), !slotData(k)));
    saveTransferBtns(loadMenu);
    btn('Späť', () => location.reload(), 0, 'back');
}
/** Prenos uložených hier: v prehliadači export do súboru, v desktopovej verzii import zo súboru a otvorenie priečinka s uloženiami. */
function saveTransferBtns(back) {
    if (DESKTOP) {
        btn('Načítať uložené hry zo súboru (z prehliadačovej verzie)', () => { const n = DESKTOP.importSaves(); msg(n > 0 ? 'Načítaných ' + n + ' uložených pozícií.' : n === 0 ? 'V súbore neboli žiadne uložené hry.' : 'Žiadny súbor nebol vybraný.', back); }, 0, 'chest');
        btn('Otvoriť priečinok s uloženými hrami', () => DESKTOP.openSaves(), 0, 'chest');
    } else btn('Exportovať uložené hry do súboru (na prenos do počítačovej verzie)', () => { const n = exportSaves(); msg('Stiahnutý súbor vojvodca-ulozenia.json (' + n + ' pozícií). Počítačová verzia ho pri spustení nájde v priečinku Stiahnuté súbory.', back); }, 0, 'chest');
}
