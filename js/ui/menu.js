/*
 * Hlavné menu úvodnej obrazovky (HTML #mn nad animovanou bitkou z js/render/intro.js):
 *   Nová hra → tvorba postavy (#crs, js/ui/create.js), Pokračovať → najnovšie uloženie (ručné alebo automatické),
 *   Načítať hru → loadMenu(), Nastavenia (zvuk, celá obrazovka), Návod, v počítačovej verzii Ukončiť hru (js/ui/desktop.js).
 * Tlačidlá majú jemný zvuk pri prechode myšou a kliknutí (vlastný malý syntetizátor; rešpektuje vypnutý zvuk).
 */
let uiAC = null;
/** Krátky zvuk menu: 'hover' cinknutie, 'click' úder, 'tick' šípka, 'roll' kocky, 'open' obrazovka. */
function uiSnd(k) {
    if (typeof mu !== 'undefined' && mu) return;
    try {
        if (!uiAC) { if (k === 'hover') return; uiAC = new (window.AudioContext || window.webkitAudioContext)(); }
        if (uiAC.state !== 'running') { uiAC.resume(); if (k === 'hover') return; }
        const a = uiAC, t = a.currentTime, out = a.createGain(); out.gain.value = .18; out.connect(a.destination);
        const tone = (f, d, type, v, at = 0, f2) => { const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f, t + at); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + at + d); g.gain.setValueAtTime(0, t + at); g.gain.linearRampToValueAtTime(v, t + at + .005); g.gain.exponentialRampToValueAtTime(.0001, t + at + d); o.connect(g); g.connect(out); o.start(t + at); o.stop(t + at + d + .02); };
        if (k === 'hover') tone(1320, .09, 'sine', .12);
        else if (k === 'tick') tone(880, .06, 'triangle', .25);
        else if (k === 'roll') [0, .05, .1, .16].forEach((d, i) => tone(500 + i * 120, .05, 'square', .08, d));
        else if (k === 'open') { tone(196, .5, 'triangle', .35, 0); tone(294, .5, 'triangle', .25, .08); tone(392, .7, 'sine', .2, .16); }
        else { tone(170, .14, 'sine', .55, 0, 70); tone(1100, .05, 'triangle', .15); }
    } catch (e) { }
}
/** Najnovšie uložená pozícia (podľa času uloženia), alebo null. */
function latestSave() {
    let best = null;
    SLOTS.forEach(([k]) => { const d = slotData(k); if (d && (!best || d.ts > best.d.ts || (d.ts === best.d.ts && k === 'auto'))) best = { k, d }; });
    return best;
}
const mnShow = id => { ['mn', 'mnPanel', 'crs'].forEach(s => { const e = document.getElementById(s); if (e) e.classList.toggle('off', s !== id); }); ov.classList.toggle('cre-on', id === 'crs'); };
/** Malý panel v menu (Nastavenia, Návod) s tlačidlami. */
function mnPanel(title, html, btns) {
    const p = document.getElementById('mnPanel');
    p.innerHTML = '<div class="pnl"><h2>' + title + '</h2>' + html + '<div class="mn-row"></div></div>';
    const row = p.querySelector('.mn-row');
    btns.forEach(([n, fn]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'mn-btn'; b.textContent = n; b.onclick = () => { uiSnd('click'); fn(b); }; row.appendChild(b); });
    mnShow('mnPanel');
}
function mnSettings() {
    mnPanel('Nastavenia', '<p>Zvuk a hudbu môžeš kedykoľvek prepnúť aj tlačidlom Zvuk na mape. Celá obrazovka: tlačidlo nižšie' + (DESKTOP ? ', F11 alebo Alt+Enter.' : '.') + '</p>', [
        ['Zvuk: ' + (mu ? 'vypnutý' : 'zapnutý'), b => { mu = !mu; b.textContent = 'Zvuk: ' + (mu ? 'vypnutý' : 'zapnutý'); if (!mu) uiSnd('click'); }],
        ['Krv v bitke: ' + (OPT.blood ? 'áno' : 'nie'), b => { OPT.blood = !OPT.blood; saveOpt(); b.textContent = 'Krv v bitke: ' + (OPT.blood ? 'áno' : 'nie'); }],
        ['Celá obrazovka', () => fsc()],
        ['Späť', () => mnShow('mn')]]);
}
function mnHelp() {
    mnPanel('Návod', '<p>Veď svoju družinu po veľkej mape Stredozeme, pridaj sa ku Gondoru, Rohanu, Mordoru alebo Isengardu a dobýjaj hrady. Najímaj vojakov, kupuj zbrane, brnenie, štít a koňa, porážaj nepriateľov, plň kapitoly príbehu a prepracuj sa až na kráľa.</p>'
        + '<p><b>Mapa:</b> klikni, kam chceš ísť; v tábore podrž medzerník a čas pobeží rýchlejšie.</p>'
        + '<p><b>Bitka:</b> WASD alebo šípky pohyb, myš mieri. Ľavé tlačidlo alebo medzerník = sek (oblúk, až traja nepriatelia), E = bod (ďalej a silnejšie), pravé tlačidlo alebo Shift = kryt (so štítom široký; kryt tesne pred úderom nepriateľa ho zapotáca). Q = výstrel z luku či kuše alebo hod oštepom (strelná zbraň u kováča), V = bojový pokrik, B = na hradbách zhodiť rebrík, vyliať olej pri bráne alebo hodiť kameň. Obojručná zbraň seká široko, ale bez štítu; kôň môže v bitke padnúť a kopijníci v šíku zastavia nápor jazdy. Klávesy zmeníš v Nastaveniach, ide aj ovládač. Na koni rovný cval = nápor. Sleduj červený oblúk – nepriateľ sa napriahol. Úder zboku +25 %, zozadu +50 %.</p>'
        + '<p><b>Velenie:</b> 1 Všetci, 2 Pechota, 3 Lukostrelci, 4 Jazda; potom T Útok, H Držať, F Za mnou, G Šík, R Ústup. Keď morálka klesne, vojaci utekajú – padlý veliteľ (zlatý kruh) zlomí nepriateľa.</p>'
        + '<p><b>Družina:</b> muži jedia – zásoby kupuj na trhu v hrade alebo v dedine (pestrá strava dvíha morálku, hlad vedie k dezerciám). Po víťazstve sa časť padlých len zraní a vráti sa. Za každú úroveň dostaneš bod perku (Družina → Perky).</p>'
        + '<p><b>Dotykový displej:</b> drž prst tam, kam chceš bežať, a hrdina útočí sám.</p>', [['Späť', () => mnShow('mn')]]);
}
/** Prepojí tlačidlá menu (raz, po načítaní stránky). */
function buildMenu() {
    const mn = document.getElementById('mn'); if (!mn || mn.dataset.ok) return; mn.dataset.ok = 1;
    const go = (id, fn) => { const b = document.getElementById(id); if (b) b.onclick = () => { uiSnd('click'); fn(); }; };
    go('mnNew', () => { mnShow('crs'); uiSnd('open'); openCreator(); });
    go('mnSet', mnSettings); go('mnHelp', mnHelp);
    go('creBack', () => mnShow('mn'));
    const last = latestSave(), cb = document.getElementById('mnCont');
    if (last && cb) { cb.hidden = false; document.getElementById('mnContD').textContent = last.d.g.name + ' · deň ' + last.d.g.day + (last.k === 'auto' ? ' · automatické uloženie' : ' · pozícia ' + last.k); cb.onclick = () => { uiSnd('click'); load(last.k); }; }
    const lb = document.getElementById('mnLoad'); if (lb) lb.addEventListener('click', () => uiSnd('click'));
    // zvuk pri prechode myšou nad tlačidlami úvodu (aj v tvorbe postavy)
    ov.addEventListener('pointerover', e => { const b = e.target.closest && e.target.closest('button'); if (b && ov.classList.contains('intro') && !b.disabled && !b.contains(e.relatedTarget)) uiSnd('hover'); });
    // zvuk sa smie spustiť až po prvom kliknutí (pravidlo prehliadačov)
    document.addEventListener('pointerdown', () => { if (!uiAC) { try { uiAC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } } }, { once: true });
}
// newGame upratá triedy úvodných obrazoviek (inak by ostal tónovaný podklad v herných oknách)
if (typeof newGame === 'function') { const ng = newGame; newGame = function () { ov.classList.remove('cre-on', 'evil'); return ng.apply(this, arguments); }; }
if (typeof document !== 'undefined' && document.getElementById && document.getElementById('mn')) { try { buildMenu(); } catch (e) { } }
