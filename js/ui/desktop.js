/*
 * Počítačová verzia (Electron, priečinok desktop/): tlačidlo „Ukončiť hru“ na úvodnej obrazovke a v nastaveniach,
 * „Celá obrazovka“ prepína celé okno programu (F11 a Alt+Enter fungujú vždy). V prehliadači sa nič nemení.
 */
if (DESKTOP) {
    const introQuit = document.createElement('button');
    introQuit.textContent = 'Ukončiť hru';
    introQuit.onclick = () => DESKTOP.quit();
    const ovEl = document.getElementById('ov'), last = ovEl && [...ovEl.querySelectorAll('button')].pop();
    if (last) last.after(introQuit);
    // panel na mape: patrí do skupiny Nastavenia (UIScene.GROUPS)
    const qb = document.createElement('button');
    qb.textContent = 'Ukončiť hru';
    qb.style.cssText = 'font-size:.8rem;padding:.3rem .55rem';
    qb.onclick = () => {
        if (!G || mode !== 'map') return DESKTOP.quit();
        mode = 'town';
        show('Ukončiť hru?', 'Neuložený postup od konca posledného dňa sa stratí, ak hru predtým neuložíš.');
        btn('Uložiť (automatická pozícia) a ukončiť', () => { save('auto'); DESKTOP.quit(); }, 0, 'chest');
        btn('Ukončiť bez uloženia', () => DESKTOP.quit(), 0, 'door');
        btn('Späť do hry', () => { ov.classList.add('hide'); mode = 'map'; }, 0, 'back');
    };
    tb.appendChild(qb);
}
/** Celá obrazovka: v počítačovej verzii celé okno programu, v prehliadači celá stránka. */
const fscBrowser = fsc;
fsc = function () { if (DESKTOP) DESKTOP.fullscreen(); else fscBrowser(); };
