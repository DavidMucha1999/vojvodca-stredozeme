/*
 * Armády na mape: sila, vznik veliteľov, banditi, Nazgûli a povahy veliteľov.
 */
const pw = () => G.inf + G.cav * 1.5 + G.arc * 1.2 + G.elf * 2 + G.roh * 3 + G.vet * 2 + uS() * 2.5 + 4;
let NID = 0, LRL = {};
const lr = (a, b) => LRL[a.id + '-' + b.id] ?? (LRL[a.id + '-' + b.id] = Math.random() * 20 - 6);
function spawnE() {
    const f = [0, 1, 2, 3, 4, 5, 7, 8][Math.floor(Math.random() * 8)], ts = TW.filter(t => t.f === f);
    if (!ts.length || E.filter(e => e.f === f).length >= 8)
        return;
    const t = ts[Math.floor(Math.random() * ts.length)];
    const kr = !E.some(o => o.f === f && o.kr);
    E.push({ kr, id: ++NID, home: TW.indexOf(t), role: 'army', x: t.x, y: t.y + 25, f, n: (kr ? 10 : 0) + Math.min(26, 6 + Math.floor(Math.random() * 8) + Math.floor(G.day / 2)), vx: 0, vy: 0, w: 0, nm: kr ? KN[f] : ((a) => a[Math.floor(Math.random() * a.length)])(LN.filter(n => !E.some(e => e.nm === n))) || LN[NID % LN.length] + ' II' });
}
function spawnX() {
    const r = Math.random;
    // tlupy bez pána: lupiči, orkské tlupy (viac v Mordore a pri Isengarde), vargovia na severe a v horách, dezertéri po vojne
    const bands = E.filter(e => e.f === 9);
    for (let b = 0; b < 2 && bands.length + b < 14; b++) {
        let x, y, k = 0;
        do {
            x = 200 + r() * (WW - 400);
            y = 200 + r() * (WH - 400);
            k++;
        } while ((TW.some(t => Math.hypot(t.x - x, t.y - y) < 300) || Math.hypot(G.x - x, G.y - y) < 500 || (typeof navOk === 'function' && !navOk(x, y))) && k < 30);   // nie vo vode
        const reg = regionAt(x, y), q = r();
        const kind = reg === 'a' || reg === 'd' ? (q < .7 ? 'orcs' : 'wolves') : reg === 's' ? (q < .5 ? 'wolves' : 'bandit') : q < .55 ? 'bandit' : q < .75 ? 'orcs' : q < .9 ? 'deserters' : 'wolves';
        const n = (kind === 'orcs' ? 6 : kind === 'wolves' ? 5 : 4) + Math.floor(r() * 6 + G.day / 4);
        const nm = kind === 'orcs' ? ['Orkská tlupa', 'Lúpežní orkovia', 'Gundabadskí orkovia', 'Orkovia z hôr'][Math.floor(r() * 4)] : kind === 'wolves' ? ['Vargovia', 'Vlčia svorka', 'Vargovia z Hmlistých hôr'][Math.floor(r() * 3)] : kind === 'deserters' ? ['Dezertéri', 'Zbehovia', 'Žoldnieri bez pána'][Math.floor(r() * 3)] : BN[Math.floor(r() * BN.length)];
        E.push({ id: ++NID, x, y, f: 9, kind, n, vx: 0, vy: 0, w: 0, nm });
    }
    if (G.day >= 4 && E.filter(e => e.nz).length < (worldEv('nazgul') ? 5 : 2)) {
        const t = TW.find(t => t.f === 2);
        if (t) {
            E.push({ id: ++NID, x: t.x, y: t.y + 30, f: 2, nz: 1, n: 4, vx: 0, vy: 0, w: 0, nm: 'Nazgûl' });
            lg('Nazgûl vyrazil z ' + t.n + '.');
        }
    }
    E.forEach(e => {
        if (e.f === 9)
            VL.forEach(v => {
                if (!v.st && Math.hypot(v.x - e.x, v.y - e.y) < 120 && !(v.bd && v.bd.w && Math.random() < .8)) {   // palisáda
                    v.st = 6;
                    lg(e.nm + ' vyplienil dedinu ' + v.n + '.');
                }
            });
    });
}
function uS() { return G ? Object.keys(FU).filter(k => k[0] === 'u').reduce((s, k) => s + (G[k] || 0), 0) : 0; }
function per(e) { if (e.tr == null) {
    const h = ((e.id || 1) * 2654435761) >>> 0;
    e.tr = h % 6;
    e.bo = (h >>> 8) % 6;
} }
