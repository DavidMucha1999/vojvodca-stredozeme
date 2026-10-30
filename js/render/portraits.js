/*
 * Portréty: tvár spredu kreslená kódom podľa popisu look = { race, sex, skin, hair, hcol, beard, eyes, age, scar, paint, hood, turban, helm, crown }.
 *   race: human | elf | dwarf | hobbit | orc | uruk | dark (juh) | wraith;  sex: m | f
 *   skin: 0 svetlá, 1 opálená, 2 tmavá, 3 bledá (alebo farba '#rrggbb');  hair: short | long | bald | tied | curly | lank | braids
 *   hcol: farba vlasov; beard: none | stubble | full | long | braided; eyes: farba dúhovky; age 0–1 (vrásky); scar, paint (biela ruka), hood, turban, helm, crown.
 * Portraits.canvas(look, size) vráti plátno; Portraits.forLord(e) a Portraits.hero() odvodia popis z dát hry.
 * Používa sa v rozhovoroch (okno dostane plátno .por) a pri tvorbe postavy.
 */
const Portraits = (() => {
    const SKIN = ['#e8c39e', '#c9956a', '#7a4a2e', '#efe1d2'];
    const shade = (col, k) => { const n = parseInt(col.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v * k))); return '#' + [f(n >> 16 & 255), f(n >> 8 & 255), f(n & 255)].map(v => v.toString(16).padStart(2, '0')).join(''); };
    const E = (c, x, y, rx, ry, rot = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, 7); };
    const P = (c, pts) => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); };

    function draw(c, L) {
        const race = L.race || 'human', f = L.sex === 'f', skin = typeof L.skin === 'string' ? L.skin : race === 'orc' ? '#5f7a4a' : race === 'uruk' ? '#3e4a34' : race === 'wraith' ? '#111' : race === 'dark' ? '#7a4a2e' : SKIN[L.skin | 0] || SKIN[0];
        const hcol = L.hcol || '#4a3020', eyes = L.eyes || (race === 'orc' || race === 'uruk' ? '#e8c040' : '#4a6a8a');
        const cx = 48, cy = 50, hw = race === 'dwarf' ? 25 : race === 'elf' ? 20 : race === 'hobbit' ? 23 : f ? 20.5 : 22.5, hh = race === 'elf' ? 29 : race === 'hobbit' ? 25 : 27;
        // pozadie a ramená
        const bg = c.createRadialGradient(cx, cy, 10, cx, cy, 60); bg.addColorStop(0, L.bg || '#3a2c20'); bg.addColorStop(1, '#120e0c');
        c.fillStyle = bg; c.fillRect(0, 0, 96, 96);
        c.fillStyle = L.cloth || (race === 'orc' || race === 'uruk' || race === 'wraith' ? '#1e1a18' : '#4a3a2a');
        E(c, cx, 104, 44, 30); c.fill();
        c.fillStyle = shade(skin, .85); c.fillRect(cx - 9, cy + hh - 6, 18, 16);                    // krk
        // vlasy vzadu
        const hair = L.hair || (f ? 'long' : 'short');
        if (race !== 'wraith' && (hair === 'long' || hair === 'braids')) { c.fillStyle = hcol; P(c, [[cx - hw - 4, cy - 10], [cx + hw + 4, cy - 10], [cx + hw + 7, cy + 40], [cx - hw - 7, cy + 40]]); c.fill(); }
        if (race !== 'wraith' && hair === 'lank') { c.fillStyle = hcol; P(c, [[cx - hw - 2, cy - 12], [cx + hw + 2, cy - 12], [cx + hw + 3, cy + 30], [cx - hw - 3, cy + 30]]); c.fill(); }
        // hlava
        const g = c.createLinearGradient(cx - hw, 0, cx + hw, 0); g.addColorStop(0, shade(skin, .8)); g.addColorStop(.45, skin); g.addColorStop(1, shade(skin, .92));
        c.fillStyle = g;
        if (race === 'orc' || race === 'uruk') { P(c, [[cx - hw, cy - hh * .7], [cx - hw * .6, cy - hh], [cx + hw * .6, cy - hh], [cx + hw, cy - hh * .7], [cx + hw * .95, cy + hh * .3], [cx + hw * .5, cy + hh], [cx - hw * .5, cy + hh], [cx - hw * .95, cy + hh * .3]]); c.fill(); }
        else if (race === 'wraith') { c.fillStyle = '#050508'; E(c, cx, cy, hw, hh); c.fill(); }
        else { c.beginPath(); c.moveTo(cx - hw, cy - 4); c.quadraticCurveTo(cx - hw, cy - hh - 2, cx, cy - hh - 2); c.quadraticCurveTo(cx + hw, cy - hh - 2, cx + hw, cy - 4); c.quadraticCurveTo(cx + hw, cy + hh * .55, cx + (race === 'dwarf' ? 10 : 6), cy + hh); c.lineTo(cx - (race === 'dwarf' ? 10 : 6), cy + hh); c.quadraticCurveTo(cx - hw, cy + hh * .55, cx - hw, cy - 4); c.fill(); }
        // uši
        if (race !== 'wraith') {
            c.fillStyle = shade(skin, .9);
            if (race === 'elf' || race === 'orc' || race === 'uruk') { const e = race === 'elf' ? 14 : 9; P(c, [[cx - hw + 2, cy - 2], [cx - hw - e, cy - 8 - (race === 'elf' ? 4 : 0)], [cx - hw + 1, cy + 7]]); c.fill(); P(c, [[cx + hw - 2, cy - 2], [cx + hw + e, cy - 8 - (race === 'elf' ? 4 : 0)], [cx + hw - 1, cy + 7]]); c.fill(); }
            else { E(c, cx - hw, cy + 1, 3.5, 5.5); c.fill(); E(c, cx + hw, cy + 1, 3.5, 5.5); c.fill(); }
        }
        // oči
        const ey = cy - 3, ex = race === 'dwarf' ? 9 : 8.5, er = race === 'orc' || race === 'uruk' ? 3.2 : 4;
        if (race === 'wraith') { c.save(); c.shadowColor = '#ff3020'; c.shadowBlur = 8; c.fillStyle = '#ff5030'; E(c, cx - ex, ey, 2.5, 1); c.fill(); E(c, cx + ex, ey, 2.5, 1); c.fill(); c.restore(); }
        else for (const s of [-1, 1]) {
            const x = cx + s * ex;
            c.fillStyle = shade(skin, .78); E(c, x, ey + 1, er + 1.5, er * .9); c.fill();            // očná jamka
            c.fillStyle = race === 'orc' || race === 'uruk' ? '#f0e0a0' : '#f4f0ea'; E(c, x, ey, er, er * .62); c.fill();
            c.fillStyle = eyes; c.beginPath(); c.arc(x + (L.look || 0), ey, er * .5, 0, 7); c.fill();
            c.fillStyle = '#0a0806'; c.beginPath(); c.arc(x + (L.look || 0), ey, er * .25, 0, 7); c.fill();
            c.fillStyle = '#fff'; c.beginPath(); c.arc(x + .8 + (L.look || 0), ey - .9, .7, 0, 7); c.fill();
            c.strokeStyle = shade(skin, .6); c.lineWidth = .9; c.beginPath(); c.arc(x, ey, er, Math.PI, 0); c.stroke();   // viečko
            // obočie
            c.strokeStyle = race === 'orc' || race === 'uruk' ? '#2a2a1a' : hcol; c.lineWidth = f ? 1.3 : 2.2; c.lineCap = 'round';
            const angry = L.angry || race === 'orc' || race === 'uruk';
            c.beginPath(); c.moveTo(x - s * (er + 1.5), ey - 5.5 + (angry ? -1 : 0)); c.lineTo(x + s * (er - .5), ey - 5.5 + (angry ? 2.5 : 0)); c.stroke();
        }
        // nos
        if (race !== 'wraith') {
            c.strokeStyle = shade(skin, .7); c.lineWidth = 1.4; c.lineCap = 'round';
            if (race === 'orc' || race === 'uruk') { c.fillStyle = shade(skin, .8); E(c, cx, cy + 6, 5, 3); c.fill(); c.fillStyle = '#1a1a12'; E(c, cx - 2.2, cy + 6.5, 1.3, .9); c.fill(); E(c, cx + 2.2, cy + 6.5, 1.3, .9); c.fill(); }
            else { c.beginPath(); c.moveTo(cx - 1, cy); c.lineTo(cx - 2.5, cy + 7); c.quadraticCurveTo(cx, cy + 9.5, cx + 3, cy + 7); c.stroke(); c.fillStyle = shade(skin, 1.08); E(c, cx + 1, cy + 3, 1.6, 4); c.fill(); }
        }
        // ústa
        const my = cy + (race === 'dwarf' ? 14 : 13.5);
        if (race === 'wraith') { c.fillStyle = '#e8d8c8'; c.fillRect(cx - 6, my - 1, 12, 3.2); c.strokeStyle = '#3a1010'; c.lineWidth = .7; c.beginPath(); c.moveTo(cx - 6, my + .6); c.lineTo(cx + 6, my + .6); c.stroke(); }
        else {
            c.fillStyle = race === 'orc' || race === 'uruk' ? '#3a2a24' : shade(skin, .7); E(c, cx, my, race === 'orc' || race === 'uruk' ? 8 : 5.5, 1.6); c.fill();
            if (L.smile) { c.strokeStyle = shade(skin, .6); c.lineWidth = 1; c.beginPath(); c.arc(cx, my - 2.5, 6, .3, Math.PI - .3); c.stroke(); }
            if (f) { c.fillStyle = '#b05a58'; E(c, cx, my + .6, 5, 1.5); c.fill(); }
            if (race === 'orc' || race === 'uruk') { c.fillStyle = '#e8e0c8'; P(c, [[cx - 6, my], [cx - 4.5, my - 4], [cx - 3, my]]); c.fill(); P(c, [[cx + 6, my], [cx + 4.5, my - 4], [cx + 3, my]]); c.fill(); }
        }
        // vrásky, jazva, bojové maľovanie
        if (L.age > .4 && race !== 'wraith') { c.strokeStyle = shade(skin, .72); c.lineWidth = .8; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(cx + s * 4, cy + 8); c.lineTo(cx + s * 8, cy + 16); c.stroke(); } c.beginPath(); c.moveTo(cx - 8, cy - 14); c.lineTo(cx + 8, cy - 14); c.stroke(); }
        if (L.scar) { c.strokeStyle = '#8a3a30'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(cx + 10, cy - 12); c.lineTo(cx + 6, cy + 10); c.stroke(); }
        if (L.paint) { c.fillStyle = 'rgba(240,240,240,.9)'; E(c, cx, cy + 2, 5, 7); c.fill(); for (let k = -2; k <= 2; k++) c.fillRect(cx + k * 2.4 - .8, cy - 16, 1.6, 10); }
        // brada
        const beard = L.beard || 'none';
        if (race !== 'wraith' && beard !== 'none' && !f) {
            c.fillStyle = beard === 'stubble' ? 'rgba(40,30,20,.35)' : hcol;
            if (beard === 'stubble') { P(c, [[cx - hw + 3, cy + 6], [cx + hw - 3, cy + 6], [cx + 6, cy + hh + 1], [cx - 6, cy + hh + 1]]); c.fill(); }
            else if (beard === 'full') { P(c, [[cx - hw + 1, cy + 4], [cx - hw + 5, cy + 20], [cx, cy + hh + 8], [cx + hw - 5, cy + 20], [cx + hw - 1, cy + 4], [cx + hw - 4, cy + 12], [cx + 7, cy + 10], [cx - 7, cy + 10], [cx - hw + 4, cy + 12]]); c.fill(); }
            else { P(c, [[cx - hw + 1, cy + 4], [cx - hw + 3, cy + 28], [cx - 8, cy + 46], [cx + 8, cy + 46], [cx + hw - 3, cy + 28], [cx + hw - 1, cy + 4], [cx + hw - 4, cy + 12], [cx + 7, cy + 10], [cx - 7, cy + 10], [cx - hw + 4, cy + 12]]); c.fill(); if (beard === 'braided') { c.strokeStyle = '#d9a441'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(cx - 4, cy + 34); c.lineTo(cx + 4, cy + 34); c.moveTo(cx - 3, cy + 41); c.lineTo(cx + 3, cy + 41); c.stroke(); } }
            if (beard !== 'stubble') { c.fillStyle = shade(skin, .7); E(c, cx, my, 5, 1.4); c.fill(); }   // ústa cez bradu
        }
        // vlasy vpredu
        if (race !== 'wraith' && !L.hood && !L.helm && !L.turban) {
            c.fillStyle = hcol;
            if (hair === 'short' || hair === 'tied' || hair === 'long' || hair === 'lank') { c.beginPath(); c.moveTo(cx - hw - 1, cy - 6); c.quadraticCurveTo(cx - hw, cy - hh - 5, cx, cy - hh - 5); c.quadraticCurveTo(cx + hw, cy - hh - 5, cx + hw + 1, cy - 6); c.quadraticCurveTo(cx + hw * .7, cy - hh * .7, cx + 4, cy - hh * .75); c.quadraticCurveTo(cx - 6, cy - hh * .85, cx - hw * .8, cy - hh * .5); c.fill(); }
            if (hair === 'curly') { for (let k = 0; k < 9; k++) { const a = Math.PI + k * Math.PI / 8; E(c, cx + Math.cos(a) * (hw - 1), cy - 6 + Math.sin(a) * (hh - 2), 6, 6); c.fill(); } }
            if (hair === 'braids') { c.strokeStyle = hcol; c.lineWidth = 4; c.beginPath(); c.moveTo(cx - hw, cy); c.lineTo(cx - hw - 2, cy + 40); c.moveTo(cx + hw, cy); c.lineTo(cx + hw + 2, cy + 40); c.stroke(); c.strokeStyle = '#d9a441'; c.lineWidth = 1; for (let y = cy + 10; y < cy + 40; y += 8) { c.beginPath(); c.moveTo(cx - hw - 4, y); c.lineTo(cx - hw, y); c.moveTo(cx + hw, y); c.lineTo(cx + hw + 4, y); c.stroke(); } }
            if (hair === 'bald' && race !== 'orc') { c.fillStyle = shade(skin, 1.06); E(c, cx - 6, cy - hh + 6, 5, 3); c.fill(); }
            if (hair === 'tied') { c.fillStyle = hcol; E(c, cx, cy - hh - 4, 7, 4); c.fill(); }
        }
        // pokrývky hlavy
        if (L.hood) { c.fillStyle = L.hood === true ? '#2a2420' : L.hood; c.beginPath(); c.moveTo(cx - hw - 8, cy + 30); c.quadraticCurveTo(cx - hw - 10, cy - hh - 14, cx, cy - hh - 16); c.quadraticCurveTo(cx + hw + 10, cy - hh - 14, cx + hw + 8, cy + 30); c.lineTo(cx + hw - 2, cy + 30); c.quadraticCurveTo(cx + hw + 2, cy - hh + 2, cx, cy - hh); c.quadraticCurveTo(cx - hw - 2, cy - hh + 2, cx - hw + 2, cy + 30); c.closePath(); c.fill(); c.fillStyle = 'rgba(0,0,0,.35)'; P(c, [[cx - hw + 2, cy - hh + 2], [cx + hw - 2, cy - hh + 2], [cx + hw - 4, cy - 2], [cx - hw + 4, cy - 2]]); c.fill(); }
        if (L.turban) { c.fillStyle = L.turban === true ? '#c84a2a' : L.turban; c.beginPath(); c.moveTo(cx - hw - 3, cy - 8); c.quadraticCurveTo(cx - hw - 2, cy - hh - 12, cx, cy - hh - 12); c.quadraticCurveTo(cx + hw + 2, cy - hh - 12, cx + hw + 3, cy - 8); c.lineTo(cx + hw, cy - 4); c.quadraticCurveTo(cx, cy - hh + 2, cx - hw, cy - 4); c.fill(); c.strokeStyle = '#d9a441'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(cx - hw, cy - 12); c.quadraticCurveTo(cx, cy - 20, cx + hw, cy - 12); c.stroke(); }
        if (L.helm) { const col = typeof L.helm === 'string' ? L.helm : '#8a8c92'; c.fillStyle = col; c.beginPath(); c.moveTo(cx - hw - 2, cy - 2); c.quadraticCurveTo(cx - hw - 2, cy - hh - 8, cx, cy - hh - 8); c.quadraticCurveTo(cx + hw + 2, cy - hh - 8, cx + hw + 2, cy - 2); c.lineTo(cx + hw, cy - 8); c.quadraticCurveTo(cx, cy - hh + 4, cx - hw, cy - 8); c.fill(); c.fillStyle = shade(col, 1.25); c.fillRect(cx - 1.5, cy - hh - 6, 3, 14); if (L.wings) { c.fillStyle = '#eef0f4'; P(c, [[cx - hw, cy - 10], [cx - hw - 16, cy - 26], [cx - hw + 2, cy - 20]]); c.fill(); P(c, [[cx + hw, cy - 10], [cx + hw + 16, cy - 26], [cx + hw - 2, cy - 20]]); c.fill(); } }
        if (L.crown) { c.fillStyle = '#ffd24a'; P(c, [[cx - 16, cy - hh - 2], [cx - 16, cy - hh - 14], [cx - 8, cy - hh - 6], [cx, cy - hh - 17], [cx + 8, cy - hh - 6], [cx + 16, cy - hh - 14], [cx + 16, cy - hh - 2]]); c.fill(); c.fillStyle = '#d8402a'; c.beginPath(); c.arc(cx, cy - hh - 7, 2, 0, 7); c.fill(); }
        // rám
        c.strokeStyle = '#d9a441'; c.lineWidth = 2; c.strokeRect(1, 1, 94, 94);
    }

    function canvas(look, size = 96) {
        const cv = document.createElement('canvas'); cv.width = cv.height = size * 2; const c = cv.getContext('2d');
        c.scale(size * 2 / 96, size * 2 / 96); draw(c, look || {});
        return cv;
    }
    const hashOf = s => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
    /** Portrét lorda podľa frakcie a mena (vždy rovnaký pre rovnaké meno). */
    function forLord(e) {
        const h = hashOf(e.nm + e.f), pick = (arr, k) => arr[(h >> k) % arr.length];
        const H = ['#2a1a10', '#4a3020', '#8a5a30', '#c8a060', '#6a6a6a'];
        const base = { human: { race: 'human', skin: pick([0, 0, 1, 3], 2), hair: pick(['short', 'long', 'tied', 'short'], 4), hcol: pick(H, 6), beard: pick(['none', 'stubble', 'full', 'short'], 8), age: (h % 7) / 7 } };
        let L;
        switch (e.f) {
            case 0: L = { ...base.human, helm: pick([0, '#c8ccd4'], 10), wings: !!pick([0, 1], 11) }; break;
            case 1: L = { ...base.human, hair: 'long', hcol: pick(['#c8a060', '#e8d0a0', '#8a5a30'], 6), beard: pick(['full', 'stubble'], 8) }; break;
            case 2: L = { race: 'orc', hair: 'bald', beard: 'none', angry: 1, scar: !!(h % 2), helm: pick([0, '#3a3632'], 10) }; break;
            case 3: L = { race: 'uruk', hair: 'lank', hcol: '#1a1410', beard: 'none', angry: 1, paint: !!(h % 3 === 0) }; break;
            case 4: L = { race: 'dark', hair: 'short', hcol: '#1a1410', beard: pick(['none', 'stubble', 'full'], 8), turban: pick(['#c84a2a', '#d9a441', '#8a2a5a'], 5) }; break;
            case 5: L = { race: 'dwarf', hair: pick(['long', 'braids', 'bald'], 4), hcol: pick(['#b05a20', '#4a3020', '#8a8a8a', '#c8a060'], 6), beard: pick(['long', 'braided'], 8) }; break;
            case 7: L = { race: 'human', skin: 1, hair: 'tied', hcol: '#1a1410', beard: pick(['none', 'stubble', 'full'], 8), helm: pick([0, '#c09030'], 10) }; break;
            case 8: L = { race: 'elf', skin: pick([0, 3], 2), hair: 'long', hcol: pick(['#e8d8a0', '#2a1a10', '#8a7a60'], 6), beard: 'none' }; break;
            case 9: L = { ...base.human, hood: true, scar: !!(h % 2) }; break;
            default: L = { ...base.human };
        }
        if (e.nz) L = { race: 'wraith', hood: '#0a0a10' };
        if (e.kr && e.f !== 2 && e.f !== 3) L.crown = 1;
        L.cloth = ['#2a3a6a', '#3a6a2a', '#2a1010', '#1a1a1a', '#a03020', '#3a4a7a', '#4a3a2a', '#5a1f4a', '#9ab07a', '#4a3a2a'][e.f] || '#4a3a2a';
        return L;
    }
    /** Portrét hrdinu z G.look (predvolený, ak chýba). */
    function hero() {
        const L = { race: 'human', sex: 'm', skin: 0, hair: 'short', hcol: '#4a3020', beard: 'stubble', eyes: '#4a6a8a', ...(G && G.look || {}) };
        if (G && G.king) L.crown = 1;
        L.cloth = G && typeof heroSide === 'function' && heroSide() === 1 ? '#2a1414' : '#6a2a2a';
        return L;
    }
    return { draw, canvas, forLord, hero, SKIN, hashOf };
})();

/** Snímka z pôvodného plátna (encyklopédia: zástavy, jednotky, hrady). */
function snap(w, h, fn) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    try {
        fn();
    }
    catch (e) { }
    ctx.restore();
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.getContext('2d').drawImage(cv, 0, 0, w, h, 0, 0, w, h);
    return c.toDataURL();
}
