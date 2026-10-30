/*
 * ENGINE: procedurálne textúry pre miestnosti (krčma, nádvorie, sieň) kreslené v 2× rozlíšení,
 * a mäkká žiara (soft_glow) pre svetlo ohňa, sviečok a fakieľ.
 * Tex.pattern(scene, kind, cols, seed) vráti kľúč dlaždice 256 × 256 bodov (512 px) – druhy:
 *   planks (drevené dosky), planksV (zvislé), bricks (kamenné kvádre), cobbles (dlažobné kocky),
 *   flags (veľké dlaždice), sand (pieskovec), grass (tráva so zemou), dark (čierny kameň Mordoru), bark (elfské drevo s rezbami).
 */
const Tex = (() => {
    const S = 2, T = 256;
    const rngOf = seed => { let s = seed | 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
    const shade = (col, k) => { const n = parseInt(col.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v * k))); return '#' + [f(n >> 16 & 255), f(n >> 8 & 255), f(n & 255)].map(v => v.toString(16).padStart(2, '0')).join(''); };
    const noise = (c, R, n, a) => { for (let k = 0; k < n; k++) { c.fillStyle = 'rgba(' + (R() < .5 ? '255,255,255' : '0,0,0') + ',' + (R() * a).toFixed(3) + ')'; c.fillRect(R() * T, R() * T, 1 + R() * 3, 1 + R() * 2); } };

    const DRAW = {
        planks(c, R, col, vertical) {
            const pw = 28;
            for (let i = 0; i < T / pw; i++) {
                const tone = shade(col, .85 + R() * .3);
                const x = i * pw, off = (i % 2) * T / 2;
                c.fillStyle = tone; if (vertical) c.fillRect(x, 0, pw, T); else c.fillRect(0, x, T, pw);
                // vlákna dreva
                for (let k = 0; k < 7; k++) { c.strokeStyle = 'rgba(0,0,0,' + (.06 + R() * .08).toFixed(3) + ')'; c.lineWidth = 1; c.beginPath(); const p = x + 3 + R() * (pw - 6); if (vertical) { c.moveTo(p, 0); c.bezierCurveTo(p + R() * 4 - 2, T * .3, p + R() * 4 - 2, T * .7, p, T); } else { c.moveTo(0, p); c.bezierCurveTo(T * .3, p + R() * 4 - 2, T * .7, p + R() * 4 - 2, T, p); } c.stroke(); }
                if (R() < .6) { const kx = R() * T, ky = x + pw / 2 + (R() - .5) * 10; c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); if (vertical) c.ellipse(ky, kx, 3, 5, 0, 0, 7); else c.ellipse(kx, ky, 5, 3, 0, 0, 7); c.fill(); }
                // škáry a koniec dosky
                c.fillStyle = 'rgba(0,0,0,.45)'; if (vertical) { c.fillRect(x, 0, 1.5, T); c.fillRect(x, off, pw, 1.5); } else { c.fillRect(0, x, T, 1.5); c.fillRect(off, x, 1.5, pw); }
                c.fillStyle = 'rgba(255,255,255,.08)'; if (vertical) c.fillRect(x + 1.5, 0, 1, T); else c.fillRect(0, x + 1.5, T, 1);
            }
            noise(c, R, 400, .06);
        },
        bricks(c, R, col) {
            const bh = 20, bw = 44;
            c.fillStyle = shade(col, .55); c.fillRect(0, 0, T, T);
            for (let j = 0; j < T / bh; j++) for (let i = -1; i < T / bw + 1; i++) {
                const x = i * bw + (j % 2) * bw / 2, y = j * bh, tone = shade(col, .82 + R() * .3);
                c.fillStyle = tone; c.fillRect(x + 1.5, y + 1.5, bw - 3, bh - 3);
                c.fillStyle = 'rgba(255,255,255,.14)'; c.fillRect(x + 1.5, y + 1.5, bw - 3, 1.5); c.fillRect(x + 1.5, y + 1.5, 1.5, bh - 3);   // svetlá hrana
                c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x + 1.5, y + bh - 3, bw - 3, 1.5); c.fillRect(x + bw - 3, y + 1.5, 1.5, bh - 3);      // tieň hrany
                if (R() < .2) { c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = .8; c.beginPath(); const cx = x + 6 + R() * 30, cy = y + 3; c.moveTo(cx, cy); c.lineTo(cx + 4, cy + 6); c.lineTo(cx + 2, cy + 12); c.stroke(); }
            }
            noise(c, R, 500, .08);
        },
        cobbles(c, R, col) {
            c.fillStyle = shade(col, .6); c.fillRect(0, 0, T, T);
            const r = 11;
            for (let j = 0; j < T / (r * 1.6) + 1; j++) for (let i = 0; i < T / (r * 1.8) + 1; i++) {
                const x = i * r * 1.8 + (j % 2) * r * .9 + (R() - .5) * 3, y = j * r * 1.6 + (R() - .5) * 3, rx = r * (.8 + R() * .3), ry = r * (.65 + R() * .25);
                const g = c.createRadialGradient(x - rx * .3, y - ry * .35, 1, x, y, rx); g.addColorStop(0, shade(col, 1.15 + R() * .1)); g.addColorStop(1, shade(col, .72));
                c.fillStyle = g; c.beginPath(); c.ellipse(x, y, rx, ry, (R() - .5) * .4, 0, 7); c.fill();
            }
            noise(c, R, 300, .06);
        },
        flags(c, R, col) {
            const s = 64;
            c.fillStyle = shade(col, .5); c.fillRect(0, 0, T, T);
            for (let j = 0; j < T / s; j++) for (let i = 0; i < T / s; i++) {
                const x = i * s, y = j * s, tone = shade(col, .88 + R() * .22);
                const g = c.createLinearGradient(x, y, x + s, y + s); g.addColorStop(0, shade(tone, 1.08)); g.addColorStop(1, shade(tone, .9));
                c.fillStyle = g; c.fillRect(x + 2, y + 2, s - 4, s - 4);
                c.fillStyle = 'rgba(255,255,255,.1)'; c.fillRect(x + 2, y + 2, s - 4, 2);
                c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(x + 2, y + s - 4, s - 4, 2);
                if (R() < .3) { c.fillStyle = 'rgba(0,0,0,.12)'; c.beginPath(); c.ellipse(x + R() * s, y + R() * s, 6 + R() * 10, 3 + R() * 5, R() * 3, 0, 7); c.fill(); }
            }
            noise(c, R, 500, .07);
        },
        sand(c, R, col) { c.fillStyle = col; c.fillRect(0, 0, T, T); for (let k = 0; k < 40; k++) { c.fillStyle = 'rgba(' + (R() < .5 ? '255,240,200' : '80,50,20') + ',' + (.04 + R() * .06).toFixed(3) + ')'; c.beginPath(); c.ellipse(R() * T, R() * T, 14 + R() * 30, 4 + R() * 8, R() * .6, 0, 7); c.fill(); } noise(c, R, 900, .07); },
        grass(c, R, col) { c.fillStyle = col; c.fillRect(0, 0, T, T); for (let k = 0; k < 30; k++) { c.fillStyle = 'rgba(90,60,30,' + (.1 + R() * .15).toFixed(3) + ')'; c.beginPath(); c.ellipse(R() * T, R() * T, 10 + R() * 26, 5 + R() * 9, R() * 3, 0, 7); c.fill(); } for (let k = 0; k < 500; k++) { c.strokeStyle = 'rgba(' + (R() < .5 ? '150,200,90' : '40,80,30') + ',.45)'; c.lineWidth = 1; const x = R() * T, y = R() * T; c.beginPath(); c.moveTo(x, y); c.lineTo(x + R() * 3 - 1.5, y - 3 - R() * 4); c.stroke(); } },
        dark(c, R, col) { DRAW.bricks(c, R, col); for (let k = 0; k < 24; k++) { c.strokeStyle = 'rgba(255,90,30,' + (.08 + R() * .12).toFixed(3) + ')'; c.lineWidth = 1; c.beginPath(); const x = R() * T, y = R() * T; c.moveTo(x, y); c.lineTo(x + R() * 10 - 5, y + 8 + R() * 10); c.stroke(); } },
        bark(c, R, col) { DRAW.planks(c, R, col, true); c.strokeStyle = 'rgba(220,230,200,.35)'; c.lineWidth = 1.2; for (let k = 0; k < 6; k++) { const x = 20 + k * 42; c.beginPath(); c.moveTo(x, T); c.bezierCurveTo(x - 14, T * .66, x + 14, T * .33, x, 0); c.stroke(); for (let m = 0; m < 4; m++) { const y = 30 + m * 60; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 10, y - 8, x + 16, y - 16); c.stroke(); } } }
    };

    /** Dlaždica druhu kind vo farbe col (seed pre variácie); vráti kľúč textúry. */
    function pattern(scene, kind, col, seed = 1) {
        const key = 'tex_' + kind + '_' + col.slice(1) + '_' + seed;
        if (scene.textures.exists(key)) return key;
        const cv = document.createElement('canvas'); cv.width = cv.height = T * S;
        const c = cv.getContext('2d'); c.scale(S, S);
        (DRAW[kind] || DRAW.flags)(c, rngOf(seed * 7919 + kind.length), col, kind === 'planksV');
        scene.textures.addCanvas(key, cv);
        return key;
    }
    /** Mäkká kruhová žiara (biela → priehľadná), používa sa s tintom a sčítaným miešaním. */
    function glow(scene) {
        const key = 'soft_glow';
        if (scene.textures.exists(key)) return key;
        const cv = document.createElement('canvas'); cv.width = cv.height = 256; const c = cv.getContext('2d');
        const g = c.createRadialGradient(128, 128, 0, 128, 128, 128); for (let k = 0; k <= 24; k++) { const u = k / 24; g.addColorStop(u, 'rgba(255,255,255,' + (Math.pow(1 - u, 2.6)).toFixed(4) + ')'); }
        c.fillStyle = g; c.fillRect(0, 0, 256, 256);
        scene.textures.addCanvas(key, cv);
        return key;
    }
    /** Svetlo: obrázok žiary so sčítaným miešaním; vráti objekt na animovanie alfa. */
    function light(scene, x, y, radius, color, alpha = .5, depth = 39) {
        const im = scene.add.image(x, y, glow(scene)).setDisplaySize(radius * 2, radius * 2).setTint(color).setAlpha(alpha).setDepth(depth).setBlendMode(Phaser.BlendModes.ADD);
        return im;
    }
    /** Tieň pod predmetom (mäkká elipsa). */
    function shadow(scene, x, y, w, h, alpha = .35, depth = 1.1) {
        return scene.add.image(x, y, glow(scene)).setDisplaySize(w, h).setTint(0x000000).setAlpha(alpha).setDepth(depth);
    }
    return { pattern, glow, light, shadow, T };
})();
