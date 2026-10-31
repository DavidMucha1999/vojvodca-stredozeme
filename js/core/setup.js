/*
 * Základ: plátno, rozmery sveta, náhodný generátor, globálny stav hry a denník.
 */
const cv = document.getElementById('c'), ctx = cv.getContext('2d'), W = 720, H = 480, WW = 14400, WH = 9600, K = 8, BW = 1440, BH = 960, ov = document.getElementById('ov'), hud = document.getElementById('hud');
cv.width = W;
cv.height = H;
let seed = 11;
const R = () => (seed = seed * 16807 % 2147483647) / 2147483647;
let Z = 1, ORD = 'a', WX = { n: 'clear', r: 190 }, MF = { t: 1, e: 1 }, bc = { x: 0, y: 0 }, AR = [], G, E, mode = 'intro', keys = {}, ptr = { x: 0, y: 0, down: false }, U, PT = [], fx = 0, last = 0, sp = 0, dayT = 0, LB, cam = { x: 0, y: 0 }, tm = 0, LEG = false;
function lg(s) {
    LOG.unshift('Deň ' + (G ? G.day : 1) + ': ' + s);
    if (LOG.length > 60)
        LOG.pop();
    TS = { s, l: 240 };
}
/** Dĺžka herného dňa v tikoch (dayT 0–DAY_LEN); endDay() posunie čas na koniec dňa (nocľah, čakanie, obliehanie). */
const DAY_LEN = 600;
const endDay = () => { dayT = DAY_LEN; };
/** Dennú dobu 0–1 (0 = ráno, .5 = polnoc) a noc počíta weather.js (isNight, nightness). */
/** Kraj podľa polohy na mape: 'd' púšť Haradu, 'a' popol Mordoru, 's' sever, 'g' zelené kraje. */
const regionAt = (x, y) => y > 967 * K && x > 1133 * K ? 'd' : x > 1433 * K ? 'a' : y < 233 * K ? 's' : 'g';
/** Dosah, v ktorom nepriateľská armáda napadne hráča, a dosah, v ktorom armády hľadajú ciele. */
const ENGAGE_R = 18, SEEK_R = 230;
