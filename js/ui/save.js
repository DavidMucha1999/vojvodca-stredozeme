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
    SLOTS.filter(([k]) => k !== 'auto').forEach(([k, n]) => slotBtn(k, n, () => { const had = !!slotData(k); msg(save(k) ? 'Hra uložená do pozície ' + k + (had ? ' (pôvodná pozícia prepísaná).' : '.') : 'Ukladanie nie je v tomto prostredí dostupné.', back); }));
    btn('Späť', back, 0, 'back');
}
/** Výber pozície na načítanie (z úvodu). */
function loadMenu() {
    const any = SLOTS.some(([k]) => slotInfo(k));
    if (!any) return load(1);
    show('Načítať hru', 'Vyber uloženú pozíciu.');
    ov.classList.add('intro');
    SLOTS.forEach(([k, n]) => slotBtn(k, n, () => load(k), !slotData(k)));
    btn('Späť', () => location.reload(), 0, 'back');
}
