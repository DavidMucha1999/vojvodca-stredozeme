/*
 * Základ: plátno, rozmery sveta, náhodný generátor, globálny stav hry a denník.
 */
const cv = document.getElementById('c'), ctx = cv.getContext('2d'), W = 720, H = 480, WW = 14400, WH = 9600, K = 8, BW = 1440, BH = 960, ov = document.getElementById('ov'), hud = document.getElementById('hud');
cv.width = W;
cv.height = H;
let seed = 11;
const R = () => (seed = seed * 16807 % 2147483647) / 2147483647;
let Z = 1, ORD = 'a', WX = { n: 'clear', r: 190 }, MF = { t: 1, e: 1 }, bc = { x: 0, y: 0 }, AR = [], VG, G, E, mode = 'intro', keys = {}, ptr = { x: 0, y: 0, down: false }, U, PT = [], fx = 0, last = 0, sp = 0, dayT = 0, LB, cam = { x: 0, y: 0 }, MAP, BG, tm = 0;
function lg(s) {
    LOG.unshift('Deň ' + (G ? G.day : 1) + ': ' + s);
    if (LOG.length > 60)
        LOG.pop();
    TS = { s, l: 240 };
}
