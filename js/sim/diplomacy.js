/*
 * Diplomacia: tábory dobra a zla, vojny, spojenectvá a vzťahy medzi frakciami.
 */
/** Tábor frakcie: 1 = zlo, 0 = dobro. Vlastná družina (6) patrí k dobru, kým si kráľ pri korunovácii nevyberie stranu (G.side). */
const bloc = f => f === 6 ? (G && G.side != null ? G.side : 0) : f > 1 && f < 5 || f === 7 ? 1 : 0, hos = (a, b) => a !== b && (a === 9 || b === 9 || WR[a][b]);
const mkWR = () => Array.from({ length: 10 }, (_, i) => Array.from({ length: 10 }, (_, j) => i !== j && bloc(i) !== bloc(j)));
let WR = mkWR();
const mkREL = () => Array.from({ length: 10 }, (_, i) => Array.from({ length: 10 }, (_, j) => i === j ? 100 : bloc(i) !== bloc(j) ? -60 : 20)), mkAL = () => Array.from({ length: 10 }, () => Array(10).fill(false));
let REL = mkREL(), AL = mkAL(), CP = {};
const rl = (a, b, d) => {
    if (a > 8 || b > 8)
        return;
    REL[a][b] = REL[b][a] = Math.max(-100, Math.min(100, REL[a][b] + d));
};
const a0x = [0, 1, 2, 3, 4, 5, 7, 8];
/**
 * Kráľ si vybral stranu z (0 dobro, 1 zlo): frakcie tej istej strany uzavrú mier a vzťahy sa zlepšia,
 * frakcie druhej strany vyhlásia vojnu a vzťahy klesnú. Vráti zoznam zmien pre denník.
 */
function chooseSide(z) {
    G.side = z;
    const out = [];
    for (const f of a0x) {
        const same = bloc(f) === z;
        AL[6][f] = AL[f][6] = false;
        if (same) { if (WR[6][f]) out.push(FN[f] + ' uzavrel mier'); WR[6][f] = WR[f][6] = false; REL[6][f] = REL[f][6] = Math.max(REL[6][f], 40); }
        else { if (!WR[6][f]) out.push(FN[f] + ' vyhlásil vojnu'); WR[6][f] = WR[f][6] = true; REL[6][f] = REL[f][6] = Math.min(REL[6][f], -60); }
    }
    lg('Kráľovstvo sa postavilo na stranu ' + sideName(z) + (out.length ? ': ' + out.join(', ') + '.' : '.'));
    return out;
}
