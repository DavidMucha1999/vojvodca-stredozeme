/*
 * Počasie a deň/noc na mape.
 * MW = { n: druh, l: zostávajúci čas } – druh: clear, rain, storm, fog, snow. Mení sa každých pár dní
 * podľa ročného obdobia (jar, leto, jeseň, zima) a kraja (na severe sneží, v Mordore sú búrky popola).
 * Počasie na mape spomaľuje pochod a prenáša sa do bitky; bitka v noci má fakle a kratší dostrel lukostrelcov.
 */
let MW = { n: 'clear', l: 0 };
const SEASONS = ['jar', 'leto', 'jeseň', 'zima'];
const season = () => Math.floor(G.day / 10) % 4;
/** Je noc? (podľa dennej doby dayT 0–DAY_LEN: noc je okolo polovice dňa, keď je mapa najtmavšia) */
const isNight = () => (.5 - .5 * Math.cos(dayT / DAY_LEN * 6.283)) > .72;
const nightness = () => Math.max(0, ((.5 - .5 * Math.cos(dayT / DAY_LEN * 6.283)) - .55) / .45);
/** Kraj podľa polohy hrdinu: s = sever (sneh), a = Mordor (popol), d = juh (púšť), g = ostatné. */

const WNAME = { clear: 'jasno', rain: 'dážď', storm: 'búrka', fog: 'hmla', snow: 'sneženie', ash: 'popolový dážď' };
/** Vyberie nové počasie podľa ročného obdobia a kraja. */
function rollWeather() {
    const se = season(), reg = regionAt(G.x, G.y), r = Math.random();
    let n = 'clear';
    if (reg === 'a') n = r < .35 ? 'ash' : r < .55 ? 'storm' : r < .7 ? 'fog' : 'clear';
    else if (reg === 's' || se === 3) n = r < .45 ? 'snow' : r < .6 ? 'fog' : r < .7 ? 'storm' : 'clear';
    else if (reg === 'd') n = r < .12 ? 'storm' : 'clear';
    else if (se === 0) n = r < .35 ? 'rain' : r < .45 ? 'storm' : r < .6 ? 'fog' : 'clear';
    else if (se === 1) n = r < .15 ? 'rain' : r < .25 ? 'storm' : 'clear';
    else n = r < .3 ? 'rain' : r < .4 ? 'storm' : r < .65 ? 'fog' : 'clear';
    MW = { n, l: 1 + Math.floor(Math.random() * 3) };
    if (n !== 'clear') lg('Počasie: ' + WNAME[n] + '.');
}
/** Denná zmena počasia (volá sa raz za deň). */
function dailyWeather() {
    if (!MW || MW.l <= 0) rollWeather();
    else MW.l--;
}
/** Spomalenie pochodu na mape podľa počasia. */
const weatherSlow = () => ({ clear: 1, rain: .9, storm: .75, fog: .9, snow: .7, ash: .85 })[MW.n] || 1;
/** Počasie do bitky: podľa počasia na mape a noci. WX.r = dostrel lukostrelcov, WX.night = noc. */
function battleWeather() {
    const map = { clear: ['clear', 190], rain: ['rain', 130], storm: ['storm', 110], fog: ['fog', 120], snow: ['snow', 150], ash: ['ash', 125] }[MW.n] || ['clear', 190];
    const night = isNight();
    return { n: map[0], r: Math.round(map[1] * (night ? .7 : 1) * (G && G.relf ? 1.1 : 1)), night };   // elf: lukostrelci dostrelia ďalej
}
