/*
 * Diplomacia: tábory dobra a zla, vojny, spojenectvá a vzťahy medzi frakciami.
 */
const bloc = f => f > 1 && f < 5 || f === 7 ? 1 : 0, hos = (a, b) => a !== b && (a === 9 || b === 9 || WR[a][b]);
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
