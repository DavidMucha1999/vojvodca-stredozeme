/*
 * Postavičky na mape (pohľad zboku): hrdina podľa kúpenej výbavy a lordi podľa svojej frakcie.
 * Figures.draw(ctx, eq, o, frame) nakreslí jazdca alebo pešiaka okolo bodu (0, 0) – nohy stoja na y = 0.
 *   eq = { w, a, s, h, m } (poradie vecí ako u kováča, Soldiers.GEAR), o = { fac, king, cape, beard, nazgul, flag }.
 *   frame 0–3 = krok / viatie zástavy.
 * Figures.lordEq(e) vráti výbavu lorda e podľa frakcie (a drobné odlišnosti podľa jeho mena), Figures.key(eq, o) kľúč textúry.
 * Farby a tvary sa berú z tých istých dát ako v bitke (Soldiers.GEAR), takže kôň, prilba či zbraň sedia s bojiskom.
 */
const Figures = (() => {
    const g = (k, i) => Soldiers.gear(k, i);
    const P = (c, pts, close = true) => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); if (close) c.closePath(); };
    const E = (c, x, y, rx, ry, rot = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, 7); };
    const dark = (col, k = .6) => { const n = parseInt(col.slice(1), 16); const f = v => Math.round(v * k); return '#' + [f(n >> 16 & 255), f(n >> 8 & 255), f(n & 255)].map(v => v.toString(16).padStart(2, '0')).join(''); };
    const glow = (c, col, blur, fn) => { c.save(); c.shadowColor = col; c.shadowBlur = blur; fn(); fn(); c.restore(); };
    const CAPES = ['#8a2a2a', '#2a4a7a', '#3a6a3a', '#6a3a7a', '#8a6a2a', '#2a6a6a'];

    /* ---------- kôň / varg (zboku, hlava vpravo) ---------- */
    function mount(c, M, fr, o) {
        const s = M.s || 1, leg = Math.sin(fr * Math.PI / 2) * 3;
        c.save(); c.scale(s, s);
        if (M.glow) glow(c, M.glow, 10, () => { c.fillStyle = M.glow; c.globalAlpha = .25; E(c, 0, -10, 20, 10); c.fill(); c.globalAlpha = 1; });
        if (M.wolf) {
            c.fillStyle = M.col;
            // nohy
            for (const [x, d] of [[-10, leg], [-6, -leg], [6, -leg], [10, leg]]) { P(c, [[x - 2, -9], [x + 2, -9], [x + 1.5 + d * .6, 0], [x - 1.5 + d * .6, 0]]); c.fill(); }
            E(c, 0, -11, 15, 6); c.fill();                                            // telo
            c.fillStyle = M.back; E(c, -1, -14, 12, 3.5); c.fill();                    // tmavý chrbát
            c.fillStyle = M.col; P(c, [[-14, -12], [-22, -18 + leg * .5], [-19, -11]]); c.fill();   // chvost
            E(c, 15, -14, 6.5, 4.5, -.2); c.fill();                                   // hlava
            P(c, [[19, -14], [26, -12], [20, -10]]); c.fill();                        // papuľa
            c.fillStyle = '#fff'; P(c, [[21, -11], [23, -9], [22, -11]]); c.fill();   // zub
            c.fillStyle = M.col; P(c, [[12, -17], [14, -23], [16, -17]]); c.fill(); P(c, [[16, -18], [19, -23], [20, -17]]); c.fill(); // uši
            c.fillStyle = M.eye; E(c, 17, -15, 1.3, 1); c.fill();
            c.restore(); return { seat: -17 * s, lx: -2 * s };
        }
        const col = M.col, dk = dark(col, .7);
        // nohy (4, striedavo)
        for (const [x, d, back] of [[-9, leg, 1], [-5, -leg, 0], [8, -leg, 1], [12, leg, 0]]) {
            c.fillStyle = back ? dk : col; P(c, [[x - 2.2, -12], [x + 2.2, -12], [x + 1.6 + d * .8, -2], [x - 1.6 + d * .8, -2]]); c.fill();
            c.fillStyle = M.socks && !back ? M.socks : col; c.fillRect(x - 1.6 + d * .8, -4, 3.2, 3);
            c.fillStyle = M.hoof; c.fillRect(x - 1.9 + d * .8, -1.6, 3.8, 1.8);
        }
        if (M.shroud) { c.fillStyle = 'rgba(40,10,60,.45)'; E(c, 0, -8, 24, 8); c.fill(); }
        // telo
        c.fillStyle = col; E(c, 0, -17, 16 * (M.chubby ? 1.05 : 1), 7.5 * (M.chubby ? 1.15 : 1)); c.fill();
        if (M.dapple) { c.fillStyle = M.dapple; for (let k = 0; k < 6; k++) { E(c, -8 + k * 3.2, -19 + (k % 2) * 3, 1.6, 1.1); c.fill(); } }
        if (M.sheen) { c.fillStyle = 'rgba(255,255,255,.35)'; E(c, -2, -20, 10, 2.5); c.fill(); }
        // chvost
        c.strokeStyle = M.mane; c.lineWidth = 2.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(-15, -19); c.quadraticCurveTo(-22, -16 + leg * .4, -21 + (M.flow ? -3 : 0), -5); c.stroke();
        // krk a hlava
        c.fillStyle = col; P(c, [[9, -21], [15, -22], [21, -31], [17, -34], [10, -28]]); c.fill();
        P(c, [[15, -35], [24, -34], [28, -27], [25, -24], [17, -26]]); c.fill();           // hlava
        c.fillStyle = dk; c.fillRect(25.5, -28, 2.2, 1.6);                                  // nozdra
        if (M.blaze) { c.fillStyle = '#f4f0e4'; P(c, [[19, -34], [21.5, -34], [26, -26], [24.5, -25.5]]); c.fill(); }
        c.fillStyle = M.redEye ? '#ff3020' : '#1a1210'; E(c, 21, -31, 1.3, 1.1); c.fill();
        if (M.redEye) glow(c, '#ff3020', 6, () => { c.fillStyle = '#ff5030'; E(c, 21, -31, 1, .9); c.fill(); });
        c.fillStyle = col; P(c, [[17, -35], [18, -40], [20, -35]]); c.fill(); P(c, [[21, -35], [23, -39], [24, -34]]); c.fill(); // uši
        if (M.horn) { c.fillStyle = '#2a2a2e'; P(c, [[19, -36], [22, -45], [21, -35]]); c.fill(); }
        // hriva
        c.strokeStyle = M.mane; c.lineWidth = M.long ? 3.2 : 2.2; c.beginPath(); c.moveTo(10, -24); c.quadraticCurveTo(14, -30, 18, -36); c.stroke();
        if (M.long || M.flow) { c.lineWidth = 1.6; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(11 + k * 2, -24 - k * 2.5); c.lineTo(5 + k * 2 - (M.flow ? leg * .6 : 0), -22 - k * 2.5); c.stroke(); } }
        if (M.braid) { c.strokeStyle = M.braid; c.lineWidth = 1; c.beginPath(); c.moveTo(12, -27); c.lineTo(16, -33); c.stroke(); }
        if (M.shaggy) { c.fillStyle = M.mane; for (let k = 0; k < 5; k++) { E(c, -12 + k * 2.4, -24, 1.4, 2); c.fill(); } }
        // výstroj: deka, čabraka, brnenie koňa
        if (M.caparison) { c.fillStyle = M.barding; P(c, [[-13, -17], [13, -17], [12, -6], [-12, -6]]); c.fill(); c.fillStyle = dark(M.barding, .75); for (let k = 0; k < 4; k++) c.fillRect(-11 + k * 6, -14, 1, 8); }
        else if (M.barding) { c.fillStyle = M.barding; E(c, 0, -17, 14, 5); c.fill(); }
        if (M.blanket) { c.fillStyle = M.tack ? '#9a2a24' : '#5a3a2a'; c.fillRect(-7, -22, 14, 7); }
        if (M.crinet) { c.fillStyle = M.barding; P(c, [[10, -21], [16, -23], [21, -31], [17, -33], [11, -27]]); c.fill(); }
        if (M.tree) { c.fillStyle = '#fff'; P(c, [[0, -8], [-3, -13], [-1, -12], [0, -15], [1, -12], [3, -13]]); c.fill(); }
        if (M.plume) { c.fillStyle = M.plume; P(c, [[17, -40], [19, -47], [22, -41]]); c.fill(); }
        if (M.packs) { c.fillStyle = '#6a4a2a'; c.fillRect(-15, -23, 6, 7); c.fillRect(8, -23, 6, 7); c.fillStyle = '#c8a870'; c.fillRect(-14, -22, 4, 2); c.fillRect(9, -22, 4, 2); }
        if (M.sparkle) { c.fillStyle = '#fff'; for (let k = 0; k < 4; k++) { const sx = -12 + ((k * 9 + fr * 5) % 30), sy = -30 + (k % 2) * 8 + Math.sin(fr + k) * 2; c.fillRect(sx, sy, 1.4, 1.4); } }
        c.restore();
        return { seat: -24 * s, lx: -1 * s };
    }

    /* ---------- štít (zboku, na ľavom boku jazdca) ---------- */
    function shield(c, S, x, y) {
        if (!S) return;
        const w = (S.shape === 'round' ? 7 : 6) * (S.big || 1), h = (S.shape === 'round' ? 7 : 9) * (S.big || 1);
        if (S.glow) glow(c, S.glow, 8, () => { c.fillStyle = S.glow; c.globalAlpha = .3; E(c, x, y, w + 2, h + 2); c.fill(); c.globalAlpha = 1; });
        c.fillStyle = S.col;
        if (S.shape === 'round') { E(c, x, y, w, h); c.fill(); }
        else if (S.shape === 'leaf') { P(c, [[x, y - h], [x + w, y - h * .3], [x, y + h], [x - w, y - h * .3]]); c.fill(); }
        else { P(c, [[x - w, y - h * .8], [x + w, y - h * .8], [x + w, y], [x, y + h], [x - w, y]]); c.fill(); }
        c.strokeStyle = S.rim; c.lineWidth = 1; c.stroke();
        if (S.boss) { c.fillStyle = S.boss; E(c, x, y, 1.8, 1.8); c.fill(); }
        if (S.sun) { c.fillStyle = '#f0d060'; E(c, x, y, 2.5, 2.5); c.fill(); }
        if (S.tree) { c.fillStyle = '#fff'; P(c, [[x, y + 3], [x - 2.5, y - 1], [x - .8, y - .5], [x, y - 4], [x + .8, y - .5], [x + 2.5, y - 1]]); c.fill(); }
        if (S.vein) { c.strokeStyle = S.rim; c.lineWidth = .8; c.beginPath(); c.moveTo(x, y - h + 1); c.lineTo(x, y + h - 1); c.stroke(); }
        if (S.rune) { c.strokeStyle = '#ffd890'; c.lineWidth = 1; c.beginPath(); c.moveTo(x - 2, y - 3); c.lineTo(x - 2, y + 3); c.moveTo(x - 2, y); c.lineTo(x + 2, y - 3); c.stroke(); }
        if (S.hand) { c.fillStyle = '#eee'; E(c, x, y + 1, 2.2, 2.6); c.fill(); for (let k = -2; k <= 2; k++) c.fillRect(x + k * 1.1 - .4, y - 4.5, .8, 3); }
        if (S.rays) { c.strokeStyle = '#f0d060'; c.lineWidth = .8; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; c.beginPath(); c.moveTo(x + Math.cos(a) * 2, y + Math.sin(a) * 2); c.lineTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5); c.stroke(); } }
        if (S.eye) { c.fillStyle = '#ff6a20'; E(c, x, y, 3.2, 1.8); c.fill(); c.fillStyle = '#000'; E(c, x, y, .9, 1.8); c.fill(); }
        if (S.planks) { c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = .7; for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(x + k * 3, y - h + 1); c.lineTo(x + k * 3, y + h - 1); c.stroke(); } }
    }

    /* ---------- zbraň v pravej ruke, držaná šikmo hore ---------- */
    function weapon(c, Wp, x, y, fr) {
        c.save(); c.translate(x, y); c.rotate(-.5 + Math.sin(fr * 1.5) * .04);
        const L = (Wp.L || 2) * 7;
        if (Wp.glow) glow(c, Wp.glow, 6 + (Wp.glowR || 1) * 2, () => { c.strokeStyle = Wp.glow; c.lineWidth = 3; c.globalAlpha = .45; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -L); c.stroke(); c.globalAlpha = 1; });
        if (Wp.t === 'spear') {
            c.strokeStyle = Wp.shaft; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, 6); c.lineTo(0, -L); c.stroke();
            c.fillStyle = Wp.blade; P(c, [[-1.8, -L], [0, -L - 6], [1.8, -L]]); c.fill();
            if (Wp.pennon) { c.fillStyle = Wp.pennon; P(c, [[0, -L + 1], [8 + Math.sin(fr) * 1.5, -L + 3], [0, -L + 7]]); c.fill(); }
            if (Wp.barbs) { c.fillStyle = Wp.blade; P(c, [[-1, -L + 2], [-3.5, -L + 5], [-1, -L + 4]]); c.fill(); P(c, [[1, -L + 2], [3.5, -L + 5], [1, -L + 4]]); c.fill(); }
        } else if (Wp.t === 'axe') {
            c.strokeStyle = Wp.haft; c.lineWidth = 1.8; c.beginPath(); c.moveTo(0, 4); c.lineTo(0, -L); c.stroke();
            c.fillStyle = Wp.head; P(c, [[0, -L + 7], [7, -L + 10], [7, -L - 2], [0, -L + 1]]); c.fill();
            if (!Wp.single) { P(c, [[0, -L + 7], [-7, -L + 10], [-7, -L - 2], [0, -L + 1]]); c.fill(); }
            if (Wp.rim) { c.strokeStyle = Wp.rim; c.lineWidth = .8; c.beginPath(); c.moveTo(7, -L + 10); c.lineTo(7, -L - 2); c.stroke(); }
            if (Wp.gem) { c.fillStyle = Wp.gem; E(c, 0, -L + 4, 1.3, 1.3); c.fill(); }
            if (Wp.spikes) { c.fillStyle = Wp.head; P(c, [[-1.5, -L], [0, -L - 6], [1.5, -L]]); c.fill(); }
        } else if (Wp.t === 'mace') {
            const b = Wp.big || 1;
            c.strokeStyle = Wp.haft; c.lineWidth = 1.8; c.beginPath(); c.moveTo(0, 4); c.lineTo(0, -L); c.stroke();
            if (Wp.glow) glow(c, Wp.glow, 8, () => { c.fillStyle = Wp.core; E(c, 0, -L, 4 * b, 4 * b); c.fill(); });
            c.fillStyle = Wp.head; E(c, 0, -L, 4.5 * b, 4.5 * b); c.fill();
            c.fillStyle = Wp.spike; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; P(c, [[Math.cos(a - .3) * 3.5 * b, -L + Math.sin(a - .3) * 3.5 * b], [Math.cos(a) * 7 * b, -L + Math.sin(a) * 7 * b], [Math.cos(a + .3) * 3.5 * b, -L + Math.sin(a + .3) * 3.5 * b]]); c.fill(); }
            c.fillStyle = Wp.core; E(c, 0, -L, 1.6 * b, 1.6 * b); c.fill();
        } else if (Wp.t === 'bow') {
            c.strokeStyle = '#6a4a2a'; c.lineWidth = 1.6; c.beginPath(); c.arc(-4, -L / 2, L / 2, -1.3, 1.3); c.stroke();
        } else {
            // meče, šable, sekáče, plameň
            const w = (Wp.w || .12) * 22, grad = Wp.grad ? (() => { const gr = c.createLinearGradient(0, 0, 0, -L); gr.addColorStop(0, Wp.grad[0]); gr.addColorStop(1, Wp.grad[1]); return gr; })() : Wp.blade;
            c.fillStyle = Wp.grip; c.fillRect(-1, 0, 2, 6); c.fillStyle = Wp.pommel; E(c, 0, 6.5, 1.6, 1.6); c.fill();
            c.fillStyle = Wp.guard; c.fillRect(-(Wp.gw || 1) * 3.2, -1, (Wp.gw || 1) * 6.4, 1.6);
            if (Wp.wing) { P(c, [[-3, -1], [-6, -4], [-3, 0]]); c.fill(); P(c, [[3, -1], [6, -4], [3, 0]]); c.fill(); }
            c.fillStyle = grad;
            if (Wp.t === 'curve' || Wp.t === 'scimitar') { P(c, [[-w, -1], [w, -1], [w + 2.5, -L * .6], [w + 1, -L], [w - 1, -L * .7], [-w, -L * .55]]); c.fill(); }
            else if (Wp.t === 'cleaver') { P(c, [[-w, -1], [w * .6, -1], [w * .6, -L * .5], [w * 1.6, -L * .55], [w * 1.2, -L], [-w, -L * .95]]); c.fill(); }
            else if (Wp.t === 'flame') { c.beginPath(); c.moveTo(-w, -1); c.lineTo(w, -1); for (let k = 1; k <= 5; k++) c.lineTo(w * (k % 2 ? 1.5 : .6), -L * k / 5); c.lineTo(0, -L - 3); for (let k = 5; k >= 1; k--) c.lineTo(-w * (k % 2 ? 1.5 : .6), -L * k / 5); c.closePath(); c.fill(); if (Wp.tongues) { c.fillStyle = Wp.base; for (let k = 0; k < 3; k++) { P(c, [[w, -L * (.3 + k * .25)], [w + 3 + Math.sin(fr + k) * 1.5, -L * (.38 + k * .25)], [w, -L * (.45 + k * .25)]]); c.fill(); } } }
            else { P(c, [[-w, -1], [w, -1], [w, -L + 3], [0, -L - 2], [-w, -L + 3]]); c.fill(); if (Wp.edgeCol) { c.strokeStyle = Wp.edgeCol; c.lineWidth = .6; c.stroke(); } }
            if (Wp.fuller) { c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = .6; c.beginPath(); c.moveTo(0, -3); c.lineTo(0, -L + 6); c.stroke(); }
            if (Wp.runes) { c.fillStyle = Wp.runes; for (let k = 1; k < 5; k++) c.fillRect(-.5, -L * k / 6, 1, 1.5); }
            if (Wp.tree) { c.fillStyle = '#fff'; P(c, [[0, -L * .35], [-1.5, -L * .5], [0, -L * .48], [0, -L * .62], [1.5, -L * .5]]); c.fill(); }
            if (Wp.tipStar) glow(c, '#fff', 6, () => { c.fillStyle = '#fff'; E(c, 0, -L - 2, 1.6, 1.6); c.fill(); });
            if (Wp.rays) { c.strokeStyle = 'rgba(255,240,190,.6)'; c.lineWidth = .7; for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * .35; c.beginPath(); c.moveTo(0, -L); c.lineTo(Math.cos(a) * 9, -L + Math.sin(a) * 9); c.stroke(); } }
            if (Wp.gem) { c.fillStyle = Wp.gem; E(c, 0, -.2, 1.2, 1.2); c.fill(); }
        }
        c.restore();
    }

    /* ---------- prilba ---------- */
    function helm(c, Hm, x, y, o) {
        const k = Hm.kind, col = Hm.col;
        c.fillStyle = col;
        if (k === 'cap') { c.beginPath(); c.arc(x, y, 4.6, Math.PI, 0); c.lineTo(x + 4.6, y + 1.2); c.lineTo(x - 4.6, y + 1.2); c.fill(); }
        if (k === 'rohan') { c.beginPath(); c.arc(x, y, 4.6, Math.PI, 0); c.lineTo(x + 4.8, y + 2); c.lineTo(x - 4.8, y + 2); c.fill(); c.fillStyle = '#d9a441'; c.fillRect(x - 4.8, y, 9.6, 1); c.strokeStyle = Hm.tail; c.lineWidth = 1.8; c.beginPath(); c.moveTo(x, y - 4.5); c.quadraticCurveTo(x - 6, y - 3, x - 8, y + 4); c.stroke(); c.fillStyle = col; c.fillRect(x + 1, y - 1, 1.6, 4); }
        if (k === 'gondor' || k === 'citadel') {
            P(c, [[x - 4.8, y + 2], [x - 4.8, y - 3], [x - 2, y - 8], [x + 2, y - 8], [x + 4.8, y - 3], [x + 4.8, y + 2]]); c.fill();
            c.fillStyle = Hm.wings; P(c, [[x - 4, y - 2], [x - 10, y - 8], [x - 4, y - 5]]); c.fill(); P(c, [[x + 4, y - 2], [x + 9, y - 8], [x + 4, y - 5]]); c.fill();
            if (Hm.plume) { c.fillStyle = k === 'citadel' ? '#fff' : '#e8e8e8'; P(c, [[x - 1, y - 8], [x - 7, y - 13], [x + 1, y - 8]]); c.fill(); }
            if (Hm.band) { c.fillStyle = Hm.band; c.fillRect(x - 4.8, y - 1, 9.6, 1.2); }
            if (Hm.gems) { c.fillStyle = '#4a8af0'; c.fillRect(x - 1, y - 5, 2, 2); }
            c.fillStyle = col; c.fillRect(x - .8, y - 3, 1.6, 5);   // nánosník
        }
        if (k === 'elf') { c.beginPath(); c.arc(x, y, 4.4, Math.PI, 0); c.lineTo(x + 4.4, y + 1); c.lineTo(x - 4.4, y + 1); c.fill(); c.fillStyle = Hm.crest; P(c, [[x - 4, y - 1], [x, y - 9], [x + 4, y - 1]]); c.fill(); c.fillStyle = col; P(c, [[x + 3, y], [x + 7, y - 3], [x + 4, y + 2]]); c.fill(); }
        if (k === 'orc') { P(c, [[x - 5, y + 2], [x - 5, y - 3], [x - 2, y - 6], [x + 1, y - 4], [x + 3, y - 7], [x + 5, y - 2], [x + 5, y + 2]]); c.fill(); c.fillStyle = '#1a1410'; c.fillRect(x - 5, y, 10, 1.4); }
        if (k === 'uruk') { P(c, [[x - 5, y + 2], [x - 5, y - 4], [x + 5, y - 4], [x + 5, y + 2]]); c.fill(); c.fillStyle = '#e8e8e8'; E(c, x + 1, y - 1, 1.6, 2); c.fill(); for (let k2 = -1; k2 <= 1; k2++) c.fillRect(x + .4 + k2 * .9, y - 4, .6, 1.8); c.fillStyle = col; c.fillRect(x - 5, y + 2, 10, 2); }
        if (k === 'mask') { c.beginPath(); c.arc(x, y, 4.6, Math.PI, 0); c.lineTo(x + 4.6, y + 1); c.lineTo(x - 4.6, y + 1); c.fill(); c.fillStyle = '#d9b850'; E(c, x + 1.5, y + 2.5, 3.6, 3.4); c.fill(); c.fillStyle = '#2a1a10'; c.fillRect(x + 1, y + 1.5, 1.4, .8); c.fillRect(x + 3.5, y + 1.5, 1, .8); }
        if (k === 'mouth') { P(c, [[x - 5, y + 3], [x - 4, y - 7], [x + 4, y - 7], [x + 5, y + 3]]); c.fill(); c.fillStyle = Hm.glow || '#ff3010'; c.fillRect(x - 3, y - 3, 6, .9); c.fillRect(x - 3, y - 1, 6, .9); c.fillStyle = '#e8d8c8'; c.fillRect(x + 1, y + 2, 4, 2.2); c.fillStyle = '#3a1010'; c.fillRect(x + 2, y + 3, 2.5, .6); }
        if (Hm.glow) glow(c, Hm.glow, 6, () => { c.fillStyle = Hm.glow; c.globalAlpha = .2; E(c, x, y - 2, 7, 6); c.fill(); c.globalAlpha = 1; });
        if (o.king) { c.fillStyle = '#ffd24a'; P(c, [[x - 4, y - 7], [x - 4, y - 12], [x - 2, y - 9], [x, y - 13], [x + 2, y - 9], [x + 4, y - 12], [x + 4, y - 7]]); c.fill(); c.fillStyle = '#d8402a'; c.fillRect(x - .7, y - 10, 1.4, 1.4); }
    }

    /* ---------- celá postavička ---------- */
    function draw(c, eq, o, fr) {
        const M = eq.m > 0 ? g('m', eq.m) : null, A = g('a', eq.a), S = eq.s > 0 ? g('s', eq.s) : null, Hm = eq.h == null ? null : g('h', eq.h);
        const Wp = eq.w == null ? null : typeof eq.w === 'object' ? eq.w : g('w', eq.w);   // objekt = vlastná zbraň (napr. luk), null = bez zbrane
        const skin = o.skin || (o.nazgul ? '#000' : o.orc ? '#5f7a4a' : o.dark ? '#8a5a3a' : '#e2bf96');
        const bob = M ? 0 : Math.abs(Math.sin(fr * Math.PI / 2)) * 1.2, walk = Math.sin(fr * Math.PI / 2) * 3.5;
        // tieň
        c.fillStyle = 'rgba(0,0,0,.32)'; E(c, 0, 0, M ? 18 * (M.s || 1) : 7, M ? 5 : 2.5); c.fill();
        let seat = 0, lx = 0;
        if (M) ({ seat, lx } = mount(c, M, fr, o));
        c.save(); c.translate(lx, seat - bob);
        if (o.rscale && o.rscale !== 1) c.scale(o.rscale > 1 ? 1 : 1.05, o.rscale);   // rasa: trpaslík a hobit nižší, uruk vyšší
        // zástava za chrbtom
        if (o.flag != null) { c.strokeStyle = '#3a2a1a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-6, -2); c.lineTo(-6, -62); c.stroke(); c.fillStyle = '#d9b850'; c.beginPath(); c.moveTo(-8, -62); c.lineTo(-6, -67); c.lineTo(-4, -62); c.fill(); tm = fr * 14.1; bnr(-6, -62, o.flag, 16, 20); }   // žrď siaha vysoko nad hlavu a zbraň
        // plášť
        const cape = o.cape || CAPES[0];
        { const cg = c.createLinearGradient(-9, 0, 3, 0); cg.addColorStop(0, dark(A.pat === 'robe' ? '#0a0a10' : cape, .7)); cg.addColorStop(1, A.pat === 'robe' ? '#0a0a10' : cape); c.fillStyle = cg; P(c, [[-2, -18], [3, -18], [2, -2 + (M ? 2 : 0)], [-9 - walk * .3, 0]]); c.fill(); c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = .5; c.beginPath(); c.moveTo(-1, -17); c.lineTo(-5 - walk * .2, -1); c.stroke(); }
        // nohy: stehno a lýtko s kolenom (zadná noha tmavšia), čižmy
        const trous = A.pat === 'robe' ? '#0a0a10' : o.trous || '#3a2a1a';
        if (!M) {
            [[-walk, 1], [walk, 0]].forEach(([d, back]) => {
                c.strokeStyle = back ? dark(trous, .7) : trous; c.lineWidth = 2.6; c.lineCap = 'round'; c.lineJoin = 'round';
                const kx = d * .45 + Math.abs(walk) * .25, ky = -5.5 - Math.abs(d) * .15;
                c.beginPath(); c.moveTo(0, -10.5); c.lineTo(kx, ky); c.lineTo(d, -1.2); c.stroke();
                c.fillStyle = back ? '#1a1008' : '#2a1a10'; c.beginPath(); c.roundRect ? c.roundRect(d - 2.2, -2.2, 5.2, 2.2, 1) : c.rect(d - 2.2, -2.2, 5.2, 2.2); c.fill();   // čižma
            });
            c.translate(0, -3);                                                            // dlhšie nohy: horná časť tela vyššie
        }
        else { c.strokeStyle = trous; c.lineWidth = 2.6; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(2, -8); c.lineTo(5, -2); c.lineTo(5.5, 2.5); c.stroke(); c.fillStyle = '#2a1a10'; c.fillRect(3, 1.8, 5, 1.8); }
        // krk
        c.fillStyle = dark(skin, .85); c.fillRect(-1.3, -22, 2.6, 3);
        // trup
        const pad = A.pad || 1;
        const tg = c.createLinearGradient(-4 * pad, 0, 4 * pad, 0); tg.addColorStop(0, dark(A.col, .75)); tg.addColorStop(.6, A.col); tg.addColorStop(1, dark(A.col, .9));
        c.fillStyle = tg; P(c, [[-4.5 * pad, -20], [4.5 * pad, -20], [4 * pad, -7], [-4 * pad, -7]]); c.fill();
        c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = .5; c.stroke();
        if (A.glow) glow(c, A.glow, 6, () => { c.fillStyle = A.glow; c.globalAlpha = .35; c.fillRect(-4 * pad, -19, 8 * pad, 11); c.globalAlpha = 1; });
        if (A.pat === 'mail') { c.fillStyle = 'rgba(255,255,255,.22)'; for (let yy = -18; yy < -8; yy += 2.2) for (let xx = -3.5; xx < 3.5; xx += 2) { E(c, xx + (yy % 4 ? 1 : 0), yy, .7, .7); c.fill(); } }
        if (A.pat === 'plate') { c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(-4 * pad, -19, 8 * pad, 1); c.fillRect(-4 * pad, -14, 8 * pad, 1); c.fillRect(-4 * pad, -10, 8 * pad, 1); c.fillStyle = A.rim || '#fff'; c.fillRect(-4.5 * pad, -20, 9 * pad, 1.2); }
        if (A.pat === 'scale') { c.strokeStyle = A.rim || '#fff'; c.lineWidth = .6; for (let yy = -18; yy < -8; yy += 2.5) for (let xx = -3; xx <= 3; xx += 2.5) { c.beginPath(); c.arc(xx + (yy % 5 ? 1.2 : 0), yy, 1.2, 0, Math.PI); c.stroke(); } }
        if (A.pat === 'dwarf') { c.fillStyle = A.rim; c.fillRect(-4.5 * pad, -20, 9 * pad, 1.5); c.fillRect(-1, -20, 2, 13); c.fillRect(-4.5 * pad, -13, 9 * pad, 1); }
        if (A.pat === 'mithril') { c.fillStyle = 'rgba(255,255,255,.5)'; for (let yy = -18; yy < -8; yy += 2) c.fillRect(-3.5 * pad, yy, 7 * pad, .6); }
        if (A.pat === 'robe') { c.fillStyle = A.col; P(c, [[-5, -20], [5, -20], [7, 4], [-8, 4]]); c.fill(); if (A.glow) { c.fillStyle = A.glow; c.globalAlpha = .25; P(c, [[-5, -20], [5, -20], [7, 4], [-8, 4]]); c.fill(); c.globalAlpha = 1; } }
        if (A.mantle) { c.fillStyle = A.mantle; P(c, [[-5, -20], [5, -20], [4, -14], [-4, -14]]); c.fill(); }
        if (A.spikes) { c.fillStyle = A.rim || '#666'; for (const sx of [-4, 0, 4]) { P(c, [[sx - 1, -20], [sx, -24], [sx + 1, -20]]); c.fill(); } }
        if (A.hand) { c.fillStyle = '#eee'; E(c, 0, -14, 1.6, 2); c.fill(); }
        if (A.rust) { c.fillStyle = 'rgba(120,60,20,.35)'; c.fillRect(-2, -16, 3, 2); c.fillRect(1, -11, 2, 2); }
        // opasok s prackou
        if (A.pat !== 'robe') { c.fillStyle = '#2a1a10'; c.fillRect(-4 * pad, -9.6, 8 * pad, 1.6); c.fillStyle = A.rim || '#c8a040'; c.fillRect(-.9, -9.9, 1.8, 2.2); }
        // ramená (plátové zbroje majú náplecníky) a ruky
        c.fillStyle = A.col; E(c, -4 * pad, -18, 2.2, 2.2); c.fill(); E(c, 4 * pad, -18, 2.2, 2.2); c.fill();
        if (A.pat === 'plate' || A.pat === 'dwarf' || A.pat === 'scale') { c.fillStyle = dark(A.col, 1.15); E(c, -4.2 * pad, -18.6, 2.8, 2); c.fill(); E(c, 4.2 * pad, -18.6, 2.8, 2); c.fill(); c.strokeStyle = A.rim || '#888'; c.lineWidth = .5; E(c, 4.2 * pad, -18.6, 2.8, 2); c.stroke(); }
        c.strokeStyle = skin === '#000' ? '#0a0a10' : A.col; c.lineWidth = 2.4; c.lineCap = 'round';
        const aw = M ? 0 : walk * .35, hx = 8 - aw, hy = -12 + Math.abs(aw) * .3;   // ruky sa pri chôdzi kývu proti nohám
        if (Wp) { c.beginPath(); c.moveTo(4 * pad, -17); c.lineTo(6.5 - aw * .5, -14.5); c.lineTo(hx, hy); c.stroke(); c.strokeStyle = dark(A.col, .8); c.lineWidth = 1; c.beginPath(); c.moveTo(6.5 - aw * .5, -14.5); c.lineTo(hx, hy); c.stroke(); c.fillStyle = skin; E(c, hx + .5, hy + .5, 1.6, 1.6); c.fill(); weapon(c, Wp, hx + .5, hy + .5, fr); }   // pravá ruka so zbraňou (rameno, lakeť, dlaň)
        else { c.beginPath(); c.moveTo(4 * pad, -17); c.lineTo(6 - aw, -9); c.stroke(); c.fillStyle = skin; E(c, 6 - aw, -8.5, 1.6, 1.6); c.fill(); if (o.mug) { c.fillStyle = '#c8903a'; c.fillRect(6.5, -11, 3.5, 4); c.fillStyle = '#fff4dc'; c.fillRect(6.5, -11.8, 3.5, 1.2); } }
        if (S) shield(c, S, -7, -12);
        else { c.strokeStyle = A.col; c.beginPath(); c.moveTo(-4 * pad, -17); c.lineTo(-6 + aw, -10); c.stroke(); c.fillStyle = skin; E(c, -6 + aw, -9.5, 1.5, 1.5); c.fill(); }
        // hlava a tvár (z profilu, hľadí doprava): tieňovaná pleť, oko s dúhovkou, obočie, nos, ústa, ucho, vlasy a brada
        const hcol = o.hcol || (typeof o.hair === 'string' && o.hair[0] === '#' ? o.hair : '#4a3020'), hs = o.hstyle || (o.hair === 'long' ? 'long' : 'short');
        if (!o.nazgul && (hs === 'long' || hs === 'lank')) { c.fillStyle = hcol; P(c, [[-4.5, -27], [1, -28], [1.5, -22], [-3.5, -14 + (hs === 'lank' ? 2 : 0)], [-5.5, -16]]); c.fill(); }   // vlasy vzadu
        const hg = c.createLinearGradient(-4, 0, 4, 0); hg.addColorStop(0, dark(skin, .8)); hg.addColorStop(1, skin);
        c.fillStyle = hg;
        if (o.orc) { P(c, [[-4, -27], [2, -28.5], [5, -25], [5.5, -21], [2, -19.5], [-3.5, -20.5]]); c.fill(); }
        else { E(c, 0, -24, 4, 4.4); c.fill(); c.fillStyle = 'rgba(200,90,70,.18)'; E(c, 2.2, -22.6, 1.4, .9); c.fill(); }   // líce
        c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = .4; c.stroke();
        if (o.elf) { c.fillStyle = skin; P(c, [[-3.5, -25], [-7, -28], [-3, -22.5]]); c.fill(); } else if (!o.nazgul) { c.fillStyle = dark(skin, .9); E(c, -3.6, -24, 1, 1.4); c.fill(); }   // ucho
        if (!o.nazgul) {
            c.fillStyle = '#f4f0ea'; E(c, 2, -24.8, 1.1, .8); c.fill();                            // oko
            c.fillStyle = o.eyes || (o.orc ? '#e8c040' : '#3a5a7a'); E(c, 2.3, -24.8, .6, .7); c.fill();
            c.fillStyle = '#0a0806'; E(c, 2.4, -24.8, .3, .5); c.fill();
            c.strokeStyle = o.orc ? '#1a1a10' : dark(hcol, .8); c.lineWidth = .6; c.beginPath(); c.moveTo(.8, -26.4); c.lineTo(3.4, -26.1 + (o.orc ? .6 : 0)); c.stroke();   // obočie
            c.fillStyle = dark(skin, .85); P(c, [[3.6, -24.2], [5.2, -22.6], [3.6, -22.2]]); c.fill();   // nos
            c.strokeStyle = dark(skin, .6); c.lineWidth = .5; c.beginPath(); c.moveTo(2.2, -21.3); c.lineTo(3.8, -21.1); c.stroke();   // ústa
            if (o.orc) { c.fillStyle = '#e8e0c8'; P(c, [[3, -21], [3.6, -22.6], [4.2, -21]]); c.fill(); }
        }
        if (o.beard && o.beard !== 'none') { c.fillStyle = o.beard === 'stubble' ? 'rgba(40,30,20,.4)' : (o.beard[0] === '#' ? o.beard : hcol); const bl = o.beard === 'long' || o.beard === 'braided' ? -12 : o.beard === 'stubble' ? -20.5 : -17; P(c, [[-2.5, -22], [4.2, -22.2], [3.2, -20.3], [2, bl], [-1.5, bl], [-3, -20.5]]); c.fill(); }
        if (o.nazgul) { c.fillStyle = '#0a0a10'; P(c, [[-6, -16], [-5, -30], [0, -33], [5, -30], [5, -20]]); c.fill(); }
        else if (Hm) helm(c, Hm, 0, -25, o);
        else {
            c.fillStyle = hcol;
            if (hs !== 'bald') { c.beginPath(); c.arc(0, -25.6, 4.3, Math.PI, 0); c.lineTo(4.3, -24.5); c.quadraticCurveTo(1, -26.5, -4.3, -24.5); c.closePath(); c.fill(); }
            if (hs === 'curly') for (let k = 0; k < 5; k++) { E(c, -3.5 + k * 1.8, -28 + Math.abs(k - 2) * .5, 1.4, 1.3); c.fill(); }
            if (hs === 'tied') { E(c, -4.5, -27, 1.6, 1.6); c.fill(); }
            if (hs === 'braids') { c.fillRect(-5, -26, 1.6, 9); c.fillStyle = '#d9a441'; c.fillRect(-5, -20, 1.6, .8); }
            if (o.king) helm(c, { kind: 'none', col: '#000' }, 0, -25, o);
        }
        if (o.apron) { c.fillStyle = '#e8dcc0'; P(c, [[-3.5, -16], [3.5, -16], [3, -4], [-3, -4]]); c.fill(); }
        c.restore();
    }

    /** Výbava lorda e podľa frakcie; drobné odlišnosti podľa mena (prilba, kôň). */
    function lordEq(e) {
        const id = (e.id || 0) + (e.nm ? e.nm.length : 0), v = id % 2;
        const T = {
            0: [{ w: 1, a: 2, s: 2, h: v ? 2 : 4, m: 3 }, { cape: '#2a3a6a' }],
            1: [{ w: 2, a: 1, s: 1, h: 1, m: 2 }, { cape: '#3a6a2a' }],
            2: [{ w: v ? 9 : 14, a: v ? 6 : 9, s: v ? 5 : 8, h: v ? 5 : 8, m: 7 }, { cape: '#2a1010', orc: !!v }],
            3: [{ w: 11, a: 7, s: 6, h: 6, m: v ? 6 : 5 }, { cape: '#1a1a1a', orc: 1 }],
            4: [{ w: 17, a: 8, s: 7, h: v ? 0 : 7, m: 2 }, { cape: '#a03020', dark: 1 }],
            5: [{ w: 5, a: 4, s: 4, h: 0, m: 1 }, { cape: '#3a4a7a', beard: v ? '#c8a060' : '#5a3a20' }],
            7: [{ w: 10, a: 8, s: 7, h: 7, m: 7 }, { cape: '#5a1f4a' }],
            8: [{ w: 4, a: 3, s: 3, h: 3, m: 4 }, { cape: '#9ab07a' }],
            9: [{ w: 0, a: 0, s: 0, h: 0, m: 0 }, { cape: '#4a3a2a' }]
        };
        if (e.nz) return [{ w: 13, a: 10, s: 0, h: 8, m: 8 }, { cape: '#000', nazgul: 1 }];
        if (e.cp && compDef(e.cp)) { const r = compEq(compDef(e.cp)); return [r[0], { ...r[1], flag: e.f }]; }   // spoločník s lénom
        // tlupy bez pána: orkská tlupa, vargovia (jazdec na vlkovi), dezertéri, lupiči
        if (e.kind === 'orcs') return [{ w: 9, a: 6, s: 5, h: 5, m: 0 }, { cape: '#2a1a10', orc: 1, flag: null }];
        if (e.kind === 'wolves') return [{ w: 9, a: 6, s: 0, h: 5, m: 6 }, { cape: '#1a1a1a', orc: 1 }];
        if (e.kind === 'deserters') return [{ w: 1, a: 1, s: 1, h: 1, m: 0 }, { cape: '#4a4a3a' }];
        let r = T[e.f];
        if (!r) r = (heroSide() === 1) ? T[2] : T[0];   // vlastní vazali podľa strany hráča
        return [r[0], { ...r[1], king: !!e.kr, flag: e.f, ...(typeof Portraits !== 'undefined' ? lookOpts(Portraits.forLord(e)) : {}) }];
    }
    /** Voľby postavičky z popisu tváre (Portraits look): pleť, vlasy, brada, oči, rasa. */
    function lookOpts(L) {
        if (!L) return {};
        const SK = ['#e8c39e', '#c9956a', '#7a4a2e', '#efe1d2'];
        return { skin: typeof L.skin === 'string' ? L.skin : L.race === 'orc' ? '#5f7a4a' : L.race === 'uruk' ? '#3e4a34' : L.race === 'dark' ? '#7a4a2e' : L.race === 'wraith' ? '#000' : SK[L.skin | 0],
            hcol: L.hcol || '#4a3020', hstyle: L.hair || (L.sex === 'f' ? 'long' : 'short'), beard: L.beard && L.beard !== 'none' ? L.beard : null, eyes: L.eyes, elf: L.race === 'elf', orc: L.race === 'orc' || L.race === 'uruk', nazgul: L.race === 'wraith',
            rscale: L.race === 'dwarf' ? .86 : L.race === 'hobbit' ? .8 : L.race === 'uruk' ? 1.08 : 1 };
    }
    /** Výbava spoločníka c (postava z filmu) pre postavičku; bez koňa v interiéri (noMount). */
    function compEq(c, noMount) {
        const ART = { uL2: [{ w: 4, a: 3, s: 0, h: 3, m: 0 }, { cape: '#5a7a5a' }], uE1: [{ w: 5, a: 4, s: 4, h: 0, m: 0 }, { beard: '#b05a20', cape: '#3a4a7a' }],
            uG2: [{ w: { t: 'bow', L: 2.6 }, a: 0, s: 0, h: null, m: 0 }, { cape: '#3a5a32', hair: '#6a4a2a' }], uI1: [{ w: 11, a: 7, s: 6, h: 6, m: 0 }, { orc: 1, cape: '#1a1a1a' }],
            uM1: [{ w: 9, a: 6, s: 5, h: 5, m: 0 }, { orc: 1, cape: '#2a1010' }], uM2: [{ w: 12, a: 9, s: 0, h: 5, m: 0 }, { orc: 1, cape: '#2a1a10' }], uH1: [{ w: 17, a: 8, s: 7, h: 0, m: 0 }, { dark: 1, cape: '#a03020' }],
            uN1: [{ w: 10, a: 8, s: 7, h: 7, m: 0 }, { cape: '#5a1f4a' }], z: [{ w: 13, a: 10, s: 0, h: 8, m: 0 }, { nazgul: 1, cape: '#000' }], t: [{ w: 12, a: 9, s: 0, h: 5, m: 0 }, { orc: 1, cape: '#2a1a10' }],
            e: [{ w: { t: 'bow', L: 2.8 }, a: 3, s: 0, h: 3, m: 0 }, { cape: '#9ab07a' }], a: [{ w: { t: 'bow', L: 2.6 }, a: 0, s: 0, h: 0, m: 0 }, { cape: '#4a3a2a' }] };
        let r = c.eq ? [{ ...c.eq }, { cape: c.side ? '#2a1414' : '#6a2a2a' }] : (ART[c.art] || [{ w: 0, a: c.side ? 11 : 0, s: 0, h: 0, m: 0 }, { cape: '#4a3a2a' }]);
        r = [{ ...r[0] }, { ...r[1], ...lookOpts(c.look) }];
        if (noMount) r[0].m = 0;
        if (c.look && !c.look.helm && c.eq && c.eq.h === 0) r[0].h = null;    // bez prilby vidno tvár
        return r;
    }
    const key = (eq, o) => 'figure_' + [eq.w == null ? 'n' : typeof eq.w === 'object' ? 'x' + eq.w.t : eq.w, eq.a, eq.s, eq.h, eq.m, o.flag ?? '', o.king ? 1 : 0, o.cape || '', o.beard || '', o.nazgul ? 1 : 0, o.orc ? 1 : 0, o.dark ? 1 : 0, o.hair || '', o.apron ? 1 : 0, o.mug ? 1 : 0, o.skin || '', o.hcol || '', o.hstyle || '', o.eyes || '', o.elf ? 1 : 0, o.rscale || 1].join('_');
    return { draw, lordEq, compEq, lookOpts, key, CAPES };
})();
