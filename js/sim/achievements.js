/*
 * Kontrola a udeľovanie úspechov.
 */
function ach() { if (!G)
    return; G.ach = G.ach || {}; ACH.forEach(([id, n, c]) => { if (!G.ach[id] && c()) {
    G.ach[id] = 1;
    lg('Úspech: ' + n);
} }); }
