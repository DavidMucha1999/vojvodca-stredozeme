/*
 * Kreslenie vojakov a výbavy (pohľad zhora, vojak hľadí doprava).
 *
 * Používa ho:
 *   - tools/generate_art.py: vykreslí pásy snímok bežných vojakov do assets/textures/unit_*.png,
 *   - hra: hrdinu kreslí priamo podľa výbavy (každá zbraň, brnenie, štít, prilba a kôň vyzerá inak)
 *     a ikonky výbavy u kováča.
 *
 * Vrstva 'base' = všetko okrem tímových farieb, 'team' = biele časti, ktoré hra zafarbí farbou frakcie.
 * Pás snímok: 0 státie | 1–4 chôdza | 5–7 útok | 8–11 pád, jedna snímka 192 × 192 px (96 jednotiek sveta).
 */
const Soldiers = (() => {
    const S = 2, FRAME = 192, FRAMES = 12;

    /* ---------- pomocné ---------- */
    const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    function shade(hex, f) {
        const n = parseInt(hex.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255;
        const m = v => Math.max(0, Math.min(255, Math.round(f >= 1 ? v + (255 - v) * (f - 1) : v * f)));
        return '#' + ((1 << 24) + (m(r) << 16) + (m(g) << 8) + m(b)).toString(16).slice(1);
    }
    function ell(c, x, y, rx, ry, rot, fill, stroke, lw) {
        c.beginPath(); c.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot || 0, 0, Math.PI * 2);
        if (fill) { c.fillStyle = fill; c.fill(); }
        if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); }
    }
    const line = (c, x1, y1, x2, y2, col, lw) => { c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); };
    const glow = (c, fn, col, blur) => { c.save(); c.shadowColor = col; c.shadowBlur = blur; fn(); c.restore(); };

    /* ---------- bežní vojaci ---------- */
    const SKIN = { human: '#e2bf96', orc: '#5f7a4a', uruk: '#3e4a34', troll: '#7a8670', dwarf: '#dcb48c', elf: '#efd6b4', dark: '#8a5a3a', none: '#111' };
    const UNITS = {
        i: { r: 6, armor: '#7d7f80', skin: 'human', helm: 'kettle', weapon: 'sword', shield: 'round' },
        a: { r: 6, armor: '#6a5a3e', skin: 'human', helm: 'hood', weapon: 'bow' },
        c: { r: 8, armor: '#8a8c90', skin: 'human', helm: 'kettle', weapon: 'sword', shield: 'kite', mount: 'horse' },
        v: { r: 7, armor: '#a8acb2', skin: 'human', helm: 'plume', weapon: 'sword', shield: 'kite' },
        r: { r: 9, armor: '#5a6a3a', skin: 'human', helm: 'rohan', weapon: 'spear', shield: 'round', mount: 'horse' },
        e: { r: 6, armor: '#6a8a6a', skin: 'elf', helm: 'elf', weapon: 'bow' },
        orc: { r: 6, armor: '#3a3028', skin: 'orc', helm: 'orc', weapon: 'scimitar', shield: 'round' },
        orc_a: { r: 6, armor: '#3a3028', skin: 'orc', helm: 'orc', weapon: 'bow' },
        t: { r: 11, armor: '#4e5446', skin: 'troll', helm: 'none', weapon: 'club', big: 1 },
        w: { r: 5, beast: 'wolf' },
        x: { r: 15, beast: 'oliphant' },
        z: { r: 10, armor: '#08080a', skin: 'none', helm: 'nazgul', weapon: 'sword', mount: 'darkhorse' },
        uG1: { r: 7, armor: '#22222a', skin: 'human', helm: 'winged', weapon: 'spear', shield: 'kite' },
        uG2: { r: 6, armor: '#3a5a32', skin: 'human', helm: 'hood', weapon: 'bow' },
        uR2: { r: 7, armor: '#4a6a2a', skin: 'human', helm: 'rohan', weapon: 'spear', shield: 'round' },
        uM1: { r: 6, armor: '#2a2420', skin: 'orc', helm: 'orc', weapon: 'scimitar', shield: 'round' },
        uM2: { r: 11, armor: '#2a2a26', skin: 'troll', helm: 'troll', weapon: 'axe', big: 1 },
        uI1: { r: 8, armor: '#1a1a1e', skin: 'uruk', helm: 'uruk', weapon: 'sword', shield: 'kite' },
        uI2: { r: 8, armor: '#2a2420', skin: 'orc', helm: 'orc', weapon: 'scimitar', mount: 'wolf' },
        uH1: { r: 6, armor: '#b0301a', skin: 'dark', helm: 'turban', weapon: 'spear', shield: 'round' },
        uH2: { r: 6, armor: '#c06a20', skin: 'dark', helm: 'turban', weapon: 'bow' },
        uE1: { r: 7, armor: '#3a5a8a', skin: 'dwarf', helm: 'dwarf', weapon: 'axe', shield: 'round', beard: 1 },
        uE2: { r: 6, armor: '#2a4a7a', skin: 'dwarf', helm: 'dwarf', weapon: 'xbow', beard: 1 },
        uN1: { r: 7, armor: '#6a2a4a', skin: 'human', helm: 'easterling', weapon: 'spear', shield: 'kite' },
        uN2: { r: 9, armor: '#5a1f4a', skin: 'human', helm: 'easterling', weapon: 'spear', mount: 'horse' },
        uL2: { r: 7, armor: '#5a7a5a', skin: 'elf', helm: 'elf', weapon: 'elfblade' }
    };

    /* ---------- výbava hrdinu (poradie = poradie vecí u kováča v js/data/equipment.js) ---------- */
    const GEAR = {
        // zbrane
        w: [
            { t: 'sword', L: 2.0, w: .12, blade: '#9ba0a6', guard: '#5a5048', grip: '#4a3020', pommel: '#6a6058', shine: .2, gw: .9 },          // Železný meč
            { t: 'sword', L: 2.3, w: .13, blade: '#e2e7ec', guard: '#b8bec6', grip: '#3a2a1a', pommel: '#b8bec6', shine: .7, gw: 1.2 },         // Oceľový meč
            { t: 'spear', L: 4.2, blade: '#dfe4ea', shaft: '#8a6238', pennon: '#2f6a2a', trim: '#d9a441' },                                     // Rohanská kopija
            { t: 'sword', L: 2.6, w: .14, blade: '#eef2f6', guard: '#c8d0d8', grip: '#1e1a18', pommel: '#e8f0ff', shine: .8, gw: 1.35, fuller: 1, star: 1 }, // Dúnadanský meč
            { t: 'elf', L: 2.8, w: .13, blade: '#e6f0e4', guard: '#d9b85a', grip: '#3a5a32', pommel: '#d9b85a', shine: .8, runes: '#c8a040' },  // Elfský dlhý meč
            { t: 'axe', L: 2.3, head: '#b8bcc4', rim: '#d9a441', haft: '#4a2e16' },                                                             // Trpasličia sekera
            { t: 'sword', L: 2.8, w: .15, blade: '#dcefff', guard: '#e0e6ee', grip: '#2a3a5a', pommel: '#ffffff', shine: .9, gw: 1.45, glow: '#7ab8ff', runes: '#7ab8ff' }, // Glamdring
            { t: 'flame', L: 2.7, w: .16, blade: '#ff7a1a', edge: '#ffe070', guard: '#7a2a10', grip: '#2a1410', pommel: '#ffb030', glow: '#ff5a10', gw: 1.3 }, // Plameňový meč
            { t: 'sword', L: 3.0, w: .15, blade: '#f6f8fc', guard: '#d9a441', grip: '#2a1e14', pommel: '#d9a441', shine: 1, gw: 1.7, wing: 1, runes: '#d9a441', glow: '#cfe4ff', fuller: 1 }, // Andúril
            // temná výbava
            { t: 'scimitar', L: 2.2, w: .14, blade: '#8a8478', guard: '#3a2a1a', grip: '#2a1a10', pommel: '#4a3a2a', shine: .15, gw: .8, notch: 1 },   // Orkská šabľa
            { t: 'spear', L: 4.2, blade: '#6a6e74', shaft: '#2a2220', pennon: '#7a1010', trim: '#141414', barbs: 1 },                                  // Morgulská kopija
            { t: 'cleaver', L: 2.4, w: .22, blade: '#5a5e66', guard: '#2a2a2e', grip: '#1a1414', pommel: '#2a2a2e', shine: .3, gw: 1, hand: 1 },       // Uruk-haiský meč
            { t: 'axe', L: 2.5, head: '#3e4048', rim: '#8a1a10', haft: '#1e1612', single: 1, spikes: 1 },                                              // Sekera Olog-haia
            { t: 'sword', L: 2.7, w: .12, blade: '#cfe8d8', guard: '#2a2a30', grip: '#101014', pommel: '#7af0b0', shine: .6, gw: 1.2, glow: '#7af0b0', notch: 1 }, // Morgulská čepeľ
            { t: 'mace', L: 2.4, head: '#2a2a2e', spike: '#8a8e96', haft: '#3a2a1a', core: '#ff7a1a', glow: '#ff5a10' },                              // Gothmogov ohnivý palcát
            { t: 'mace', L: 2.7, head: '#141418', spike: '#4a4a56', haft: '#1a1a1e', core: '#c060ff', glow: '#8a2ad0', big: 1.3 }                      // Sauronov palcát
        ],
        // brnenie
        a: [
            { col: '#7a5636', pat: 'leather', pad: .95 },                                 // Kožený odev
            { col: '#8c9096', pat: 'mail', pad: 1.05 },                                   // Kolčuha
            { col: '#3a3c44', pat: 'plate', pad: 1.3, rim: '#9aa0aa' },                   // Gondorský plát
            { col: '#5f7044', pat: 'scale', pad: 1.1, rim: '#c8b060' },                   // Elfská šupinová zbroj
            { col: '#6e5a3a', pat: 'dwarf', pad: 1.4, rim: '#d9a441' },                   // Trpasličí plát
            { col: '#e4ecf4', pat: 'mithril', pad: 1.15, rim: '#ffffff', glow: '#cfe4ff' }, // Mithrilová košeľa
            // temná výbava
            { col: '#4a4038', pat: 'mail', pad: 1, rust: 1 },                                  // Orkská krúžková zbroj
            { col: '#1c1c22', pat: 'plate', pad: 1.3, rim: '#6a6e76', hand: 1 },               // Čierny plát Uruk-haiov
            { col: '#8a2a18', pat: 'scale', pad: 1.1, rim: '#d9a441' },                        // Haradská šupinová zbroj
            { col: '#141418', pat: 'plate', pad: 1.45, rim: '#6a1a1a', spikes: 1 },            // Plát Čiernej veže
            { col: '#0c0c10', pat: 'robe', pad: 1.15, rim: '#2e2e3a', glow: '#7a30c0', spikes: 1 } // Zbroj nazgûla
        ],
        // štíty
        s: [
            null,                                                                                         // Bez štítu
            { shape: 'round', col: '#7a5230', rim: '#3e3a36', boss: '#9aa0a8', planks: 1, paint: 1 },     // Drevený štít
            { shape: 'kite', col: '#18181e', rim: '#c8ccd4', tree: 1 },                                   // Gondorský štít
            { shape: 'leaf', col: '#3f6a3a', rim: '#d9b85a', vein: 1 },                                   // Elfský štít
            { shape: 'round', col: '#8e969e', rim: '#d9a441', rune: 1, big: 1.12, glow: '#ffd890' },       // Štít z Ereboru
            // temná výbava
            { shape: 'round', col: '#3a2e24', rim: '#2a2a2a', boss: '#5a5a5a', planks: 1, paint: 1, crude: 1 }, // Orkský štít
            { shape: 'kite', col: '#141416', rim: '#6a6e76', hand: 1 },                                        // Štít Bielej ruky
            { shape: 'round', col: '#9a2a18', rim: '#d9a441', rays: 1 },                                       // Haradský štít
            { shape: 'kite', col: '#0e0e12', rim: '#5a1a1a', eye: 1, glow: '#ff4a10' }                         // Štít Oka
        ],
        // prilby
        h: [
            { col: '#6a4a2e', kind: 'cap' },                                                              // Kožená čiapka
            { col: '#9aa0a8', kind: 'nasal' },                                                            // Oceľová prilba
            { col: '#d4d8de', kind: 'gondor', wings: '#f2f4f6', plume: 1 },                               // Gondorská prilba
            { col: '#d8b860', kind: 'elf', crest: '#f4e2a0' },                                            // Elfská prilba
            { col: '#c8ccd4', kind: 'citadel', wings: '#ffffff', band: '#d9a441', plume: 1, glow: '#ffffff' }, // Prilba strážcu Citadely
            // temná výbava
            { col: '#3a3632', kind: 'orc' },                                   // Orkská prilba
            { col: '#1c1c22', kind: 'uruk' },                                  // Prilba Bielej ruky
            { col: '#c09030', kind: 'mask' },                                  // Maska z Rhûnu
            { col: '#141418', kind: 'mouth', glow: '#ff3010' }                 // Prilba Saurónových úst
        ],
        // kone
        m: [
            null,                                                                                                          // Pešo
            { s: .8, col: '#8b6b47', mane: '#3e2a18', hoof: '#3a2a1a', blanket: 1, shaggy: 1, dapple: '#a8885e' },          // Poník
            { s: 1, col: '#7b4524', mane: '#eadcae', hoof: '#2a1a10', blanket: 1, blaze: 1, tack: '#3a2412', long: 1 },    // Rohanský kôň
            { s: 1.08, col: '#4e4c50', mane: '#1a1a1c', hoof: '#1e1c1e', barding: '#aab0ba', caparison: 1, tack: '#222' },  // Obrnený bojový kôň
            { s: 1.15, col: '#f2f2f6', mane: '#ffffff', hoof: '#c8ccd6', glow: '#d6e8ff', long: 1, sheen: 1 },               // Mearas
            // temná výbava
            { wolf: 1, s: .9, col: '#7a7064', back: '#4a4238', eye: '#e8c040' },                                                     // Mladý varg
            { wolf: 1, s: 1.15, col: '#45403a', back: '#1e1a18', eye: '#ff8a20' },                                                   // Varg
            { s: 1.08, col: '#18161a', mane: '#050505', hoof: '#000000', barding: '#3a3c42', caparison: 1, tack: '#111', horn: 1, redEye: 1 }, // Čierny kôň Mordoru
            { s: 1.15, col: '#0c0a0e', mane: '#000000', hoof: '#000000', glow: '#8a2ad0', long: 1, redEye: 1, shroud: 1 }             // Kôň nazgûla
        ]
    };
    const gear = (k, i) => { const L = GEAR[k]; return L[Math.max(0, Math.min(L.length - 1, i | 0))]; };

    /** Popis hrdinu pre kreslenie podľa výbavy eq = { w, a, s, h, m }. */
    function heroSpec(eq) {
        const W = gear('w', eq.w), M = gear('m', eq.m);
        return {
            r: 9, skin: 'human', cape: 1, hero: 1,
            weaponG: W, weapon: W.t === 'spear' ? 'spear' : 'sword',
            armorG: gear('a', eq.a), shieldG: gear('s', eq.s), helmG: gear('h', eq.h),
            horse: M, mount: M ? 'hero' : null
        };
    }

    /* ---------- kone a zvery ---------- */
    function drawWarg(c, r0, H, ph, layer) {
        const r = r0 * H.s, step = Math.sin(ph) * r * .35, col = H.col;
        if (layer === 'team') { ell(c, -r * .15, 0, r * .75, r * .62, 0, '#ffffff'); return; }
        for (const [x, y, k] of [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]]) ell(c, x * r * 1.05 + k * step, y * r * .55, r * .32, r * .2, 0, H.back);
        c.fillStyle = col; c.beginPath(); c.moveTo(-r * 1.9, Math.sin(ph * 2) * r * .3); c.quadraticCurveTo(-r * 1.6, -r * .2, -r * 1.3, -r * .15); c.lineTo(-r * 1.3, r * .15); c.quadraticCurveTo(-r * 1.6, r * .2, -r * 1.9, Math.sin(ph * 2) * r * .3); c.fill();
        ell(c, 0, 0, r * 1.55, r * .66, 0, col, 'rgba(0,0,0,.35)', 1);
        ell(c, -r * .1, 0, r * 1.25, r * .26, 0, H.back);                      // tmavý pruh srsti
        ell(c, r * 1.35, 0, r * .55, r * .5, 0, col);
        ell(c, r * 1.85, 0, r * .45, r * .32, 0, col, 'rgba(0,0,0,.3)', .8);
        ell(c, r * 2.3, 0, r * .3, r * .2, 0, shade(col, .75)); ell(c, r * 2.55, 0, r * .08, r * .1, 0, '#111');
        c.fillStyle = shade(col, .8); for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(r * 1.65, sd * r * .2); c.lineTo(r * 1.45, sd * r * .6); c.lineTo(r * 1.85, sd * r * .3); c.fill(); }
        for (const sd of [-1, 1]) glow(c, () => ell(c, r * 2.0, sd * r * .2, r * .07, r * .06, 0, H.eye), H.eye, r * .5);
        ell(c, -r * .1, 0, r * .55, r * .45, 0, 'rgba(60,30,20,.45)');           // sedlo
    }

    function drawHorse(c, r0, H, ph, layer) {
        if (H.wolf) return drawWarg(c, r0, H, ph, layer);
        const r = r0 * H.s, step = Math.sin(ph) * r * .35, col = H.col;
        if (layer === 'team') {
            if (H.caparison) {
                ell(c, -r * .1, 0, r * 1.62, r * .86, 0, '#ffffff');
                c.fillStyle = '#ffffff'; for (let k = -3; k <= 3; k++) { c.beginPath(); c.arc(k * r * .42, r * .86, r * .13, 0, Math.PI); c.fill(); c.beginPath(); c.arc(k * r * .42, -r * .86, r * .13, Math.PI, 0); c.fill(); }
            } else if (H.blanket) ell(c, -r * .12, 0, r * (H.shaggy ? .8 : 1.02), r * .84, 0, '#ffffff');
            return;
        }
        if (H.glow) glow(c, () => ell(c, 0, 0, r * 1.75, r * .78, 0, col), H.glow, r * 1.6);
        const leg = (x, y) => ell(c, x, y, r * .3, r * .18, 0, H.hoof);
        leg(r * 1.2 + step, r * .55); leg(r * 1.2 - step, -r * .55); leg(-r * 1.2 - step, r * .55); leg(-r * 1.2 + step, -r * .55);
        // telo, krk, hlava
        ell(c, 0, 0, r * 1.75, r * .78, 0, col, 'rgba(0,0,0,.35)', 1);
        if (H.dapple) for (const [x, y, s] of [[-.8, .3, .2], [-.3, -.35, .16], [.4, .25, .18], [-1.2, -.1, .14], [.9, -.2, .15]]) ell(c, r * x, r * y, r * s, r * s * .8, 0, H.dapple);
        ell(c, -r * .25, -r * .28, r * 1.15, r * .28, 0, H.sheen ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.12)');
        ell(c, r * 1.3, 0, r * .68, r * .42, 0, col);
        ell(c, r * 2.05, 0, r * .62, r * .33, 0, shade(col, .96), 'rgba(0,0,0,.3)', .8);
        ell(c, r * 2.58, 0, r * .25, r * .24, 0, shade(col, H.sheen ? .88 : .72));
        c.fillStyle = '#111'; c.fillRect(r * 2.72, -r * .12, r * .06, r * .06); c.fillRect(r * 2.72, r * .06, r * .06, r * .06);
        ell(c, r * 1.75, -r * .22, r * .15, r * .08, -.4, shade(col, .8)); ell(c, r * 1.75, r * .22, r * .15, r * .08, .4, shade(col, .8));
        if (H.redEye) for (const sd of [-1, 1]) glow(c, () => ell(c, r * 2.1, sd * r * .3, r * .08, r * .06, 0, '#ff3010'), '#ff3010', r * .6);
        else { ell(c, r * 2.1, -r * .3, r * .06, r * .05, 0, '#111'); ell(c, r * 2.1, r * .3, r * .06, r * .05, 0, '#111'); }
        if (H.blaze) ell(c, r * 2.25, 0, r * .4, r * .07, 0, '#f4f0e4');
        // hriva a chvost
        c.strokeStyle = H.mane; c.lineCap = 'round';
        c.lineWidth = r * (H.long ? .3 : .22); c.beginPath(); c.moveTo(r * .75, 0); c.quadraticCurveTo(r * 1.3, Math.sin(ph) * r * .08, r * 1.85, 0); c.stroke();
        if (H.long) { c.lineWidth = r * .12; c.beginPath(); c.moveTo(r * .8, r * .1); c.quadraticCurveTo(r * 1.2, r * .32 + Math.sin(ph) * r * .1, r * 1.7, r * .18); c.stroke(); }
        if (H.shaggy) { c.lineWidth = r * .14; c.beginPath(); c.moveTo(r * 1.85, 0); c.lineTo(r * 2.2, Math.sin(ph) * r * .06); c.stroke(); }
        const tl = H.long ? 2.85 : 2.5, wv = Math.sin(ph * 2) * r * .3, tw = H.long ? .24 : .17;
        c.fillStyle = H.mane; c.beginPath(); c.moveTo(-r * 1.55, -r * tw);
        c.quadraticCurveTo(-r * 2.1, -r * (tw + .1) + wv * .5, -r * tl, wv); c.quadraticCurveTo(-r * 2.1, r * (tw + .1) + wv * .5, -r * 1.55, r * tw); c.closePath(); c.fill();
        c.strokeStyle = shade(H.mane, .78); c.lineWidth = .6; c.beginPath(); c.moveTo(-r * 1.6, 0); c.quadraticCurveTo(-r * 2.1, wv * .5, -r * (tl - .1), wv); c.stroke();
        // postroj
        if (H.tack) {
            line(c, r * 2.35, -r * .27, r * 2.35, r * .27, H.tack, r * .07);
            line(c, r * 2.3, -r * .25, r * .45, -r * .3, H.tack, r * .06); line(c, r * 2.3, r * .25, r * .45, r * .3, H.tack, r * .06);
        }
        if (H.barding) {
            ell(c, r * 2.12, 0, r * .52, r * .25, 0, H.barding, 'rgba(0,0,0,.4)', .8);
            line(c, r * 1.75, 0, r * 2.55, 0, '#e8ecf2', r * .06);
            for (let k = 0; k < 3; k++) ell(c, r * (.85 + k * .32), 0, r * .2, r * .3, 0, shade(H.barding, .9 + k * .05), 'rgba(0,0,0,.35)', .7);
            c.fillStyle = '#e8ecf2'; for (const x of [1.95, 2.3]) for (const y of [-.14, .14]) { c.beginPath(); c.arc(r * x, r * y, r * .04, 0, 7); c.fill(); }
        }
        if (H.horn) { c.fillStyle = '#8a8e96'; c.beginPath(); c.moveTo(r * 2.95, 0); c.lineTo(r * 2.35, -r * .12); c.lineTo(r * 2.35, r * .12); c.fill(); for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(r * (.85 + k * .32), 0); c.lineTo(r * (.75 + k * .32), -r * .42); c.lineTo(r * (.95 + k * .32), -r * .1); c.fill(); } }
        if (H.shroud) {   // čierna roztrhaná pokrývka koňa nazgûla
            c.fillStyle = '#060608'; c.beginPath();
            for (let k = 0; k <= 16; k++) { const a = Math.PI * 2 * k / 16, rr = k % 2 ? 1 : 1.18; c.lineTo(Math.cos(a) * r * 1.55 * rr - r * .1, Math.sin(a) * r * .9 * rr); }
            c.fill(); ell(c, -r * .3, -r * .3, r * .9, r * .2, 0, 'rgba(120,80,160,.18)');
        }
        if (!H.blanket && !H.caparison && !H.shroud) ell(c, -r * .05, 0, r * .5, r * .4, 0, 'rgba(255,255,255,.18)');
    }

    function drawMount(c, sp, kind, ph, layer) {
        if (kind === 'hero') return drawHorse(c, sp.r, sp.horse, ph, layer);
        const r = sp.r, step = Math.sin(ph) * r * .35;
        if (kind === 'wolf') {
            if (layer === 'team') return;
            const col = '#4a443e';
            [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([fx, fy], k) => ell(c, fx * r * .9 + (k % 3 ? step : -step), fy * r * .5, r * .32, r * .18, 0, '#2e2a26'));
            ell(c, 0, 0, r * 1.5, r * .55, 0, col); ell(c, r * 1.5, 0, r * .55, r * .4, 0, col);
            c.fillStyle = col; c.beginPath(); c.moveTo(r * 1.4, -r * .35); c.lineTo(r * 1.3, -r * .7); c.lineTo(r * 1.6, -r * .3); c.fill(); c.beginPath(); c.moveTo(r * 1.4, r * .35); c.lineTo(r * 1.3, r * .7); c.lineTo(r * 1.6, r * .3); c.fill();
            ell(c, r * 2, 0, r * .25, r * .2, 0, '#2e2a26');
            c.strokeStyle = col; c.lineWidth = r * .25; c.lineCap = 'round'; c.beginPath(); c.moveTo(-r * 1.4, 0); c.lineTo(-r * 2.1, Math.sin(ph * 2) * r * .3); c.stroke();
            return;
        }
        const dark = kind === 'darkhorse';
        drawHorse(c, r, dark ? { s: 1, col: '#121014', mane: '#000000', hoof: '#000000' } : { s: 1, col: '#6b4a2e', mane: '#3a2416', hoof: '#2a1a10', blanket: 1, tack: '#2a1a10' }, ph, layer);
    }

    /* ---------- zbrane ---------- */
    /** Zbraň hrdinu v polohe ruky (os x = smer čepele, začiatok = ruka). */
    function weaponShape(c, r, Wp, ph) {
        c.lineCap = 'round';
        if (Wp.t === 'spear') {
            const L = r * Wp.L;
            line(c, -r * 1.6, 0, L - r * .5, 0, Wp.shaft, r * .2);
            c.fillStyle = Wp.blade; c.beginPath(); c.moveTo(L + r * .45, 0); c.quadraticCurveTo(L - r * .1, -r * .32, L - r * .65, -r * .1); c.lineTo(L - r * .65, r * .1); c.quadraticCurveTo(L - r * .1, r * .32, L + r * .45, 0); c.fill();
            line(c, L - r * .6, 0, L + r * .3, 0, 'rgba(0,0,0,.25)', .7);
            if (Wp.barbs) { c.fillStyle = Wp.blade; for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(L - r * .6, sd * r * .08); c.lineTo(L - r * .95, sd * r * .42); c.lineTo(L - r * .45, sd * r * .15); c.fill(); } }
            const wv = Math.sin(ph || 0) * r * .15;
            c.fillStyle = Wp.pennon; c.beginPath(); c.moveTo(L - r * .75, 0); c.lineTo(L - r * .75, -r * .6); c.quadraticCurveTo(L - r * 1.5, -r * .5 + wv, L - r * 2.3, -r * .35 + wv); c.lineTo(L - r * 1.6, -r * .1); c.closePath(); c.fill();
            line(c, L - r * .8, -r * .32, L - r * 1.9, -r * .3 + wv * .8, Wp.trim, r * .08);
            ell(c, L - r * .72, r * .12, r * .14, r * .1, 0, '#f0e8d0');
            return;
        }
        if (Wp.t === 'mace') {
            const L = r * Wp.L, R = r * .55 * (Wp.big || 1);
            line(c, -r * .45, 0, L - R * .6, 0, Wp.haft, r * .26);
            for (let k = 0; k < 3; k++) line(c, r * (.1 + k * .5), -r * .14, r * (.3 + k * .5), r * .14, '#000000', r * .05);
            if (Wp.glow) glow(c, () => ell(c, L, 0, R * 1.05, R * 1.05, 0, Wp.glow), Wp.glow, r * 1.6);
            c.fillStyle = Wp.spike;
            for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5, ca = Math.cos(a), sa = Math.sin(a); c.beginPath(); c.moveTo(L + ca * R * .7 - sa * R * .25, sa * R * .7 + ca * R * .25); c.lineTo(L + ca * R * 1.75, sa * R * 1.75); c.lineTo(L + ca * R * .7 + sa * R * .25, sa * R * .7 - ca * R * .25); c.fill(); }
            ell(c, L, 0, R, R, 0, Wp.head, 'rgba(0,0,0,.5)', .8);
            if (Wp.core) { ell(c, L, 0, R * .5, R * .5, 0, Wp.core); for (let k = 0; k < 4; k++) { const a = k * 1.7 + .4; line(c, L, 0, L + Math.cos(a) * R * .9, Math.sin(a) * R * .9, Wp.core, r * .07); } }
            ell(c, -r * .5, 0, r * .17, r * .17, 0, Wp.spike);
            return;
        }
        if (Wp.t === 'axe') {
            const L = r * Wp.L;
            line(c, -r * .45, 0, L + r * .2, 0, Wp.haft, r * .25);
            if (Wp.spikes) { c.fillStyle = Wp.head; c.beginPath(); c.moveTo(L - r * .35, r * .1); c.lineTo(L - r * .1, r * .85); c.lineTo(L + r * .1, r * .1); c.fill(); c.beginPath(); c.moveTo(L + r * .2, -r * .12); c.lineTo(L + r * .75, 0); c.lineTo(L + r * .2, r * .12); c.fill(); }
            for (const sd of Wp.single ? [-1.25] : [-1, 1]) {
                c.fillStyle = Wp.head; c.beginPath(); c.moveTo(L - r * .45, 0); c.lineTo(L - r * .55, sd * r * .35); c.quadraticCurveTo(L - r * .2, sd * r * 1.05, L + r * .45, sd * r * .9); c.quadraticCurveTo(L + r * .2, sd * r * .4, L + r * .05, 0); c.closePath(); c.fill();
                c.strokeStyle = Wp.rim; c.lineWidth = r * .09; c.beginPath(); c.moveTo(L - r * .2, sd * r * 1.0); c.quadraticCurveTo(L + r * .3, sd * r * .75, L + r * .45, sd * r * .9); c.stroke();
            }
            ell(c, L - r * .2, 0, r * .18, r * .18, 0, Wp.rim);
            line(c, -r * .45, 0, -r * .1, 0, Wp.rim, r * .3);
            return;
        }
        const L = r * Wp.L, w = r * Wp.w, b0 = r * .28;
        const blade = () => {
            c.beginPath(); c.moveTo(b0, -w);
            if (Wp.t === 'elf') { c.quadraticCurveTo(L * .65, -w * 1.7, L - r * .2, -w * .5); c.lineTo(L, 0); c.lineTo(L - r * .2, w * .5); c.quadraticCurveTo(L * .65, w * 1.7, b0, w); }
            else if (Wp.t === 'scimitar') { c.quadraticCurveTo(L * .55, -w * 1.2, L, -w * 3.2); c.quadraticCurveTo(L * .72, w * 1.9, b0, w); }
            else if (Wp.t === 'cleaver') { c.lineTo(L - r * .15, -w * 1.25); c.lineTo(L, w * .1); c.lineTo(L - r * .45, w); c.lineTo(b0, w * .8); }
            else if (Wp.t === 'flame') { const n = 6; for (let k = 1; k <= n; k++) c.lineTo(b0 + (L - r * .4 - b0) * k / n, -w * (k % 2 ? 1.45 : .85)); c.lineTo(L, 0); for (let k = n; k >= 1; k--) c.lineTo(b0 + (L - r * .4 - b0) * k / n, w * (k % 2 ? 1.45 : .85)); c.lineTo(b0, w); }
            else { c.lineTo(L - r * .35, -w); c.lineTo(L, 0); c.lineTo(L - r * .35, w); c.lineTo(b0, w); }
            c.closePath();
        };
        if (Wp.glow) glow(c, () => { c.fillStyle = Wp.glow; blade(); c.fill(); }, Wp.glow, r * 1.4);
        if (Wp.t === 'flame') { const g = c.createLinearGradient(b0, 0, L, 0); g.addColorStop(0, '#c02a0a'); g.addColorStop(.5, Wp.blade); g.addColorStop(1, Wp.edge); c.fillStyle = g; }
        else c.fillStyle = Wp.blade;
        blade(); c.fill(); c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = .7; c.stroke();
        if (Wp.t === 'flame') line(c, b0 + r * .1, 0, L - r * .4, 0, Wp.edge, w * .6);
        if (Wp.fuller) line(c, b0 + r * .15, 0, L * .7, 0, 'rgba(60,70,90,.35)', w * .45);
        if (Wp.shine) { c.globalAlpha = Wp.shine; line(c, b0 + r * .1, -w * .45, L - r * .45, -w * .45, '#ffffff', .9); c.globalAlpha = 1; }
        if (Wp.notch) { c.fillStyle = 'rgba(20,16,14,.85)'; for (const f of [.45, .62, .8]) { const x = b0 + (L - b0) * f; c.beginPath(); c.moveTo(x - r * .1, w * 1.1); c.lineTo(x, w * .25); c.lineTo(x + r * .1, w * 1.1); c.fill(); } }
        if (Wp.hand) drawHand(c, b0 + (L - b0) * .45, 0, w * 1.3, '#f2f2f2');
        if (Wp.runes) { c.fillStyle = Wp.runes; for (let x = b0 + r * .3; x < L * .72; x += r * .3) c.fillRect(x, -w * .18, r * .14, w * .36); }
        // rukoväť, záštita, hlavica
        line(c, -r * .35, 0, b0, 0, Wp.grip, r * .27);
        if (Wp.wing) { c.fillStyle = Wp.guard; for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(b0 - r * .05, 0); c.quadraticCurveTo(b0 + r * .25, sd * r * .35, b0 - r * .1, sd * r * .62); c.lineTo(b0 + r * .12, sd * r * .1); c.fill(); } }
        else if (Wp.t === 'elf') { c.strokeStyle = Wp.guard; c.lineWidth = r * .15; c.beginPath(); c.moveTo(b0 + r * .2, -r * .45); c.quadraticCurveTo(b0 - r * .1, 0, b0 + r * .2, r * .45); c.stroke(); }
        else line(c, b0, -r * .38 * Wp.gw, b0, r * .38 * Wp.gw, Wp.guard, r * .18);
        ell(c, -r * .42, 0, r * .16, r * .16, 0, Wp.pommel);
        if (Wp.star) { c.fillStyle = '#ffffff'; c.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, rr = k % 2 ? r * .07 : r * .2; c.lineTo(-r * .42 + Math.cos(a) * rr, Math.sin(a) * rr); } c.fill(); }
    }

    function drawWeapon(c, sp, a, lunge, layer, ph) {
        if (layer === 'team') return;
        const r = sp.r, big = sp.big ? 1.4 : 1, hx = r * .45, hy = r * .7;
        c.save(); c.translate(hx + lunge, hy); c.rotate(a);
        c.lineCap = 'round';
        if (sp.weaponG) { weaponShape(c, r, sp.weaponG, ph); c.restore(); return; }
        switch (sp.weapon) {
            case 'sword': case 'elfblade': case 'scimitar': {
                const L = r * (sp.weapon === 'elfblade' ? 2.6 : 2.2) * big;
                c.strokeStyle = '#2a2018'; c.lineWidth = r * .3; c.beginPath(); c.moveTo(-r * .3, 0); c.lineTo(r * .15, 0); c.stroke();
                c.strokeStyle = '#a07a2a'; c.lineWidth = r * .22; c.beginPath(); c.moveTo(r * .2, -r * .38); c.lineTo(r * .2, r * .38); c.stroke();
                c.fillStyle = '#d8dde2';
                c.beginPath(); c.moveTo(r * .25, -r * .12);
                if (sp.weapon === 'scimitar') { c.quadraticCurveTo(L * .6, -r * .35, L, r * .25); c.lineTo(r * .25, r * .12); }
                else { c.lineTo(L - r * .3, -r * .12); c.lineTo(L, 0); c.lineTo(L - r * .3, r * .12); c.lineTo(r * .25, r * .12); }
                c.fill(); c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = .8; c.stroke();
                c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1; c.beginPath(); c.moveTo(r * .35, -r * .04); c.lineTo(L - r * .4, -r * .04); c.stroke();
                break;
            }
            case 'spear': {
                const L = r * 4;
                c.strokeStyle = '#6a4a2a'; c.lineWidth = r * .2; c.beginPath(); c.moveTo(-r * 1.6, 0); c.lineTo(L - r * .5, 0); c.stroke();
                c.fillStyle = '#d8dde2'; c.beginPath(); c.moveTo(L + r * .3, 0); c.lineTo(L - r * .6, -r * .25); c.lineTo(L - r * .6, r * .25); c.fill();
                break;
            }
            case 'axe': {
                const L = r * 2.1 * big;
                c.strokeStyle = '#5a3a1a'; c.lineWidth = r * .25; c.beginPath(); c.moveTo(-r * .4, 0); c.lineTo(L, 0); c.stroke();
                c.fillStyle = '#b8bcc4'; c.beginPath(); c.moveTo(L - r * .2, 0); c.arc(L - r * .2, 0, r * .8, -1.2, 1.2); c.fill();
                c.strokeStyle = '#eef'; c.lineWidth = 1; c.beginPath(); c.arc(L - r * .2, 0, r * .78, -1, 1); c.stroke();
                break;
            }
            case 'club': {
                c.strokeStyle = '#4a3420'; c.lineWidth = r * .35; c.beginPath(); c.moveTo(-r * .3, 0); c.lineTo(r * 2.2, 0); c.stroke();
                ell(c, r * 2.3, 0, r * .55, r * .42, 0, '#5a4028'); c.fillStyle = '#ccc';
                [[2, -.4], [2.5, .3], [2.2, .45]].forEach(([dx, dy]) => { c.beginPath(); c.arc(r * dx, r * dy, r * .1, 0, 7); c.fill(); });
                break;
            }
            case 'bow': case 'xbow': {
                c.restore(); c.save();
                const pull = lunge < 0 ? -lunge : 0;
                c.translate(r * .9, 0);
                if (sp.weapon === 'xbow') {
                    c.strokeStyle = '#5a3a1a'; c.lineWidth = r * .3; c.beginPath(); c.moveTo(-r * .9, 0); c.lineTo(r * .6, 0); c.stroke();
                    c.strokeStyle = '#3a2a1a'; c.lineWidth = r * .2; c.beginPath(); c.arc(-r * .2, 0, r * .9, -1.1, 1.1); c.stroke();
                    c.strokeStyle = 'rgba(240,240,240,.8)'; c.lineWidth = .8; c.beginPath(); c.moveTo(r * .2, -r * .8); c.lineTo(-r * .6, 0); c.lineTo(r * .2, r * .8); c.stroke();
                } else {
                    c.strokeStyle = '#6b4a2e'; c.lineWidth = r * .22; c.beginPath(); c.arc(-r * .2, 0, r * 1.3, -1.25, 1.25); c.stroke();
                    c.strokeStyle = 'rgba(240,240,240,.85)'; c.lineWidth = .9;
                    const ex = -r * .2 + Math.cos(1.25) * r * 1.3, ey = Math.sin(1.25) * r * 1.3;
                    c.beginPath(); c.moveTo(ex, -ey); c.lineTo(-r * .6 - pull * r * .12, 0); c.lineTo(ex, ey); c.stroke();
                    if (pull) { c.strokeStyle = '#e8d8b0'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-r * .6 - pull * r * .12, 0); c.lineTo(r * 1.2, 0); c.stroke(); }
                }
                break;
            }
        }
        c.restore();
    }

    /** Biela ruka Sarumana (dlaň s prstami smerom nahor), stred x, y, veľkosť s. */
    function drawHand(c, x, y, s, col) {
        c.save(); c.translate(x, y); c.fillStyle = col;
        ell(c, 0, s * .25, s * .42, s * .4, 0, col);
        for (const [dx, l] of [[-.3, .55], [-.1, .7], [.1, .68], [.3, .5]]) { c.fillRect(s * dx - s * .08, -s * l, s * .16, s * l + s * .2); ell(c, s * dx, -s * l, s * .08, s * .08, 0, col); }
        c.beginPath(); c.moveTo(-s * .38, s * .25); c.lineTo(-s * .7, -s * .05); c.lineTo(-s * .55, -s * .15); c.lineTo(-s * .25, s * .1); c.fill();
        c.restore();
    }
    /** Červené plamenné Oko. */
    function drawEye(c, x, y, rx, ry) {
        glow(c, () => { c.fillStyle = '#ff6a10'; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); c.fill(); }, '#ff4a10', rx * 1.5);
        const g = c.createRadialGradient(x, y, 0, x, y, rx); g.addColorStop(0, '#ffe080'); g.addColorStop(.5, '#ff7a10'); g.addColorStop(1, '#a01a08');
        c.fillStyle = g; c.beginPath(); c.moveTo(x - rx, y); c.quadraticCurveTo(x, y - ry * 1.6, x + rx, y); c.quadraticCurveTo(x, y + ry * 1.6, x - rx, y); c.fill();
        c.fillStyle = '#000'; c.beginPath(); c.ellipse(x, y, rx * .12, ry * .85, 0, 0, 7); c.fill();
    }

    /* ---------- brnenie a štíty hrdinu ---------- */
    function armorPattern(c, rr, A) {
        c.save(); c.beginPath(); c.ellipse(0, 0, rr * .72, rr, 0, 0, 7); c.clip();
        const dk = shade(A.col, .7);
        if (A.pat === 'leather') { line(c, -rr * .5, -rr * .55, rr * .5, -rr * .55, dk, .8); line(c, -rr * .5, rr * .55, rr * .5, rr * .55, dk, .8); c.setLineDash([1.5, 1.5]); line(c, -rr * .6, 0, rr * .6, 0, dk, .7); c.setLineDash([]); }
        if (A.pat === 'mail' || A.pat === 'mithril') { c.strokeStyle = A.pat === 'mail' ? dk : 'rgba(150,180,220,.6)'; c.lineWidth = .5; for (let x = -rr; x < rr; x += rr * .2) for (let y = -rr; y < rr; y += rr * .2) { c.beginPath(); c.arc(x + (Math.round(y / rr * 5) % 2) * rr * .1, y, rr * .08, 0, 7); c.stroke(); } }
        if (A.pat === 'plate') { for (let k = -2; k <= 2; k++) { c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = .9; c.beginPath(); c.arc(-rr * 1.6 + k * rr * .25, 0, rr * 1.5, -.6, .6); c.stroke(); } line(c, -rr * .7, 0, rr * .7, 0, A.rim, rr * .08); }
        if (A.pat === 'scale') { c.strokeStyle = A.rim; c.lineWidth = .6; for (let x = -rr; x < rr; x += rr * .22) for (let y = -rr; y < rr; y += rr * .22) { c.beginPath(); c.arc(x, y + (Math.round(x / rr * 4.5) % 2) * rr * .11, rr * .12, -1.2, 1.2); c.stroke(); } }
        if (A.pat === 'dwarf') { for (const y of [-.45, 0, .45]) line(c, -rr * .8, rr * y, rr * .8, rr * y, A.rim, rr * .1); c.fillStyle = A.rim; for (const y of [-.7, -.2, .2, .7]) { c.beginPath(); c.arc(rr * .35, rr * y, rr * .06, 0, 7); c.fill(); } }
        if (A.pat === 'mithril') ell(c, -rr * .2, -rr * .35, rr * .35, rr * .55, 0, 'rgba(255,255,255,.55)');
        if (A.rust) for (const [x, y, q] of [[-.3, -.4, .2], [.2, .3, .25], [-.1, .6, .15], [.35, -.2, .14]]) ell(c, rr * x, rr * y, rr * q, rr * q * .8, 0, 'rgba(120,60,20,.45)');
        if (A.pat === 'robe') {
            for (let k = -3; k <= 3; k++) line(c, -rr, k * rr * .28, rr, k * rr * .28 + rr * .08, 'rgba(60,50,80,.6)', .7);
            ell(c, -rr * .25, -rr * .3, rr * .3, rr * .5, 0, 'rgba(140,100,180,.18)');
        }
        c.restore();
    }
    function drawArmor(c, rr, A) {
        if (A.glow) glow(c, () => ell(c, 0, 0, rr * .72, rr, 0, A.col), A.glow, rr * 1.2);
        ell(c, 0, 0, rr * .72, rr, 0, A.col, 'rgba(0,0,0,.55)', 1.2);
        armorPattern(c, rr, A);
        ell(c, -rr * .2, -rr * .3, rr * .3, rr * .55, 0, 'rgba(255,255,255,.14)');
        if (A.pat === 'robe') {   // roztrhaný plášť nazgûla cez plecia
            c.fillStyle = A.col; c.beginPath();
            for (let k = 0; k <= 14; k++) { const a = Math.PI * .35 + Math.PI * 1.3 * k / 14, q = k % 2 ? 1.05 : 1.28; c.lineTo(Math.cos(a) * rr * .9 * q, Math.sin(a) * rr * 1.15 * q); }
            c.fill();
        }
        for (const sd of [-1, 1]) {
            ell(c, rr * .1, sd * rr * .95, rr * .3 * A.pad, rr * .28 * A.pad, 0, shade(A.col, 1.15), A.rim || 'rgba(0,0,0,.4)', A.rim ? 1 : .6);
            if (A.spikes) { c.fillStyle = A.rim; for (const dx of [-.15, .2]) { c.beginPath(); c.moveTo(rr * (.1 + dx) - rr * .08, sd * rr * 1.05); c.lineTo(rr * (.1 + dx), sd * rr * (1.05 + .38 * A.pad)); c.lineTo(rr * (.1 + dx) + rr * .08, sd * rr * 1.05); c.fill(); } }
        }
        if (A.hand) drawHand(c, rr * .1, -rr * .95, rr * .24, '#f2f2f2');
    }
    function shieldPath(c, Sh, rx, ry) {
        c.beginPath();
        if (Sh.shape === 'kite') { c.moveTo(0, -ry); c.quadraticCurveTo(rx * 1.25, -ry * .55, rx * .9, ry * .1); c.quadraticCurveTo(rx * .5, ry * .7, 0, ry); c.quadraticCurveTo(-rx * .5, ry * .7, -rx * .9, ry * .1); c.quadraticCurveTo(-rx * 1.25, -ry * .55, 0, -ry); }
        else if (Sh.shape === 'leaf') { c.moveTo(0, -ry); c.quadraticCurveTo(rx * 1.5, 0, 0, ry); c.quadraticCurveTo(-rx * 1.5, 0, 0, -ry); }
        else c.ellipse(0, 0, rx, ry, 0, 0, 7);
        c.closePath();
    }
    /** Štít spredu so stredom v (0, 0); veľkosť rx × ry. */
    function shieldFace(c, Sh, rx, ry, layer) {
        if (layer === 'team') { if (Sh.paint) { c.save(); shieldPath(c, Sh, rx * .78, ry * .78); c.clip(); c.fillStyle = '#ffffff'; c.fillRect(-rx, -ry * .28, rx * 2, ry * .56); c.restore(); ell(c, 0, 0, rx * .3, ry * .3, 0, '#000'); } return; }
        if (Sh.glow) glow(c, () => { c.fillStyle = Sh.col; shieldPath(c, Sh, rx, ry); c.fill(); }, Sh.glow, rx * 1.2);
        c.fillStyle = Sh.col; shieldPath(c, Sh, rx, ry); c.fill();
        c.save(); shieldPath(c, Sh, rx, ry); c.clip();
        if (Sh.planks) for (let k = -2; k <= 2; k++) line(c, k * rx * .4, -ry, k * rx * .4, ry, 'rgba(0,0,0,.3)', .6);
        ell(c, -rx * .3, -ry * .35, rx * .5, ry * .3, -.4, 'rgba(255,255,255,.18)');
        c.restore();
        c.strokeStyle = Sh.rim; c.lineWidth = Math.max(1, rx * .16); shieldPath(c, Sh, rx, ry); c.stroke();
        if (Sh.boss) ell(c, 0, 0, rx * .26, ry * .26, 0, Sh.boss, '#3a3a3a', .6);
        if (Sh.tree) {
            const w = '#f2f2f2', lw = Math.max(.6, rx * .1);
            line(c, 0, -ry * .45, 0, ry * .55, w, lw);
            for (const [y, l] of [[-.3, .35], [-.05, .45], [.2, .35]]) { line(c, 0, ry * y, -rx * l, ry * (y - .18), w, lw * .8); line(c, 0, ry * y, rx * l, ry * (y - .18), w, lw * .8); }
            c.fillStyle = w; for (const [x, y] of [[0, -.62], [-.32, -.55], [.32, -.55]]) { c.beginPath(); c.arc(rx * x, ry * y, rx * .07, 0, 7); c.fill(); }
        }
        if (Sh.vein) { line(c, 0, -ry * .85, 0, ry * .85, Sh.rim, Math.max(.6, rx * .1)); for (const y of [-.4, 0, .4]) { line(c, 0, ry * y, -rx * .55, ry * (y - .25), Sh.rim, Math.max(.5, rx * .06)); line(c, 0, ry * y, rx * .55, ry * (y - .25), Sh.rim, Math.max(.5, rx * .06)); } }
        if (Sh.hand) drawHand(c, 0, 0, Math.min(rx, ry) * .65, '#f2f2f2');
        if (Sh.rays) { for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; line(c, Math.cos(a) * rx * .25, Math.sin(a) * ry * .25, Math.cos(a) * rx * .8, Math.sin(a) * ry * .8, Sh.rim, Math.max(.6, rx * .08)); } ell(c, 0, 0, rx * .25, ry * .25, 0, Sh.rim); }
        if (Sh.eye) drawEye(c, 0, -ry * .05, rx * .6, ry * .22);
        if (Sh.crude) { c.fillStyle = '#8a8e96'; for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + .3; c.beginPath(); c.arc(Math.cos(a) * rx * .8, Math.sin(a) * ry * .8, Math.max(.5, rx * .07), 0, 7); c.fill(); } }
        if (Sh.rune) { c.fillStyle = Sh.rim; c.beginPath(); for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8, q = k % 2 ? .18 : .48; c.lineTo(Math.cos(a) * rx * q, Math.sin(a) * ry * q); } c.fill(); ell(c, 0, 0, rx * .12, ry * .12, 0, '#fff6d8'); }
    }

    /* ---------- hlavy a prilby ---------- */
    function drawHead(c, sp, layer) {
        const r = sp.r * (sp.big ? .8 : 1), skin = SKIN[sp.skin], hr = r * .48;
        if (sp.helmG) return drawHeroHelm(c, hr, skin, sp.helmG, layer);
        if (layer === 'team') {
            if (sp.helm === 'plume') { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(-hr * .6, 0, hr * .9, hr * .28, 0, 0, 7); c.fill(); }
            if (sp.helm === 'turban' || sp.helm === 'easterling') { c.strokeStyle = '#fff'; c.lineWidth = hr * .35; c.beginPath(); c.arc(0, 0, hr * .95, 1.8, 4.5); c.stroke(); }
            return;
        }
        ell(c, 0, 0, hr, hr, 0, skin);
        const H = { kettle: '#9aa0a8', plume: '#c0c6ce', rohan: '#b89a50', winged: '#d0d4dc', orc: '#2a2a2a', uruk: '#1a1a1e', turban: '#d8b070', dwarf: '#9aa2aa', elf: null, hood: '#4a3a28', troll: '#1a1a1a', nazgul: '#050507', easterling: '#c09030', none: null }[sp.helm];
        if (H) {
            c.fillStyle = H; c.beginPath(); c.arc(0, 0, hr * 1.06, Math.PI * .45, Math.PI * 1.55); c.closePath(); c.fill();
            c.beginPath(); c.arc(0, 0, hr * 1.06, Math.PI * 1.55, Math.PI * 2.45); c.fill();
            if (sp.helm !== 'hood' && sp.helm !== 'nazgul' && sp.helm !== 'turban') { c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-hr * .25, -hr * .3, hr * .35, hr * .2, -.5, 0, 7); c.fill(); }
        }
        if (sp.helm === 'winged') { c.fillStyle = '#e8eaee'; [-1, 1].forEach(sd => { c.beginPath(); c.moveTo(-hr * .2, sd * hr * .8); c.quadraticCurveTo(-hr * 1.2, sd * hr * 1.9, -hr * 1.6, sd * hr * 1.3); c.lineTo(-hr * .5, sd * hr * .7); c.fill(); }); }
        if (sp.helm === 'orc' || sp.helm === 'troll' || sp.helm === 'uruk') {
            c.fillStyle = '#d8d0b8';
            [-1, 1].forEach(sd => { c.beginPath(); c.moveTo(0, sd * hr * .7); c.lineTo(-hr * .5, sd * hr * 1.5); c.lineTo(hr * .3, sd * hr * .8); c.fill(); });
            c.fillStyle = '#ff3a2a'; c.fillRect(hr * .55, -hr * .35, hr * .22, hr * .2); c.fillRect(hr * .55, hr * .15, hr * .22, hr * .2);
            if (sp.helm === 'uruk') { c.fillStyle = '#f0f0f0'; c.beginPath(); c.arc(-hr * .1, 0, hr * .3, 0, 7); c.fill(); }
        }
        if (sp.helm === 'nazgul') { c.fillStyle = '#000'; c.beginPath(); c.arc(hr * .2, 0, hr * .7, 0, 7); c.fill(); c.fillStyle = '#9aa0a8'; c.beginPath(); c.moveTo(-hr, -hr * .6); c.lineTo(0, -hr * 1.3); c.lineTo(hr * .4, -hr * .4); c.lineTo(hr * .4, hr * .4); c.lineTo(0, hr * 1.3); c.lineTo(-hr, hr * .6); c.closePath(); c.globalAlpha = .7; c.fill(); c.globalAlpha = 1; }
        if (sp.helm === 'elf') { c.fillStyle = '#e8d890'; c.beginPath(); c.ellipse(-hr * .45, 0, hr * .8, hr * .95, 0, 0, 7); c.fill(); c.strokeStyle = '#e8d870'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, hr * .95, 1.8, 4.5); c.stroke(); }
        if (sp.helm === 'dwarf') { c.fillStyle = '#d9a441'; c.fillRect(-hr * .1, -hr * 1.05, hr * .2, hr * 2.1); }
        if (sp.helm === 'rohan') { c.fillStyle = '#e8e0c0'; c.beginPath(); c.ellipse(-hr * .9, 0, hr * .8, hr * .22, 0, 0, 7); c.fill(); }
        if (sp.beard) { c.fillStyle = '#8a3a1a'; c.beginPath(); c.ellipse(hr * .75, 0, hr * .55, hr * .45, 0, 0, 7); c.fill(); }
    }
    function drawHeroHelm(c, hr, skin, Hm, layer) {
        if (layer === 'team') {
            if (Hm.plume) { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(-hr * .75, 0, hr * 1.05, hr * .28, 0, 0, 7); c.fill(); }
            return;
        }
        if (Hm.glow) glow(c, () => ell(c, 0, 0, hr, hr, 0, Hm.col), Hm.glow, hr * 1.5);
        ell(c, 0, 0, hr, hr, 0, skin);
        c.fillStyle = Hm.col;
        if (Hm.kind === 'cap') { c.beginPath(); c.arc(0, 0, hr * 1.04, Math.PI * .5, Math.PI * 1.5); c.closePath(); c.fill(); ell(c, -hr * .1, 0, hr * .75, hr * .95, 0, Hm.col); line(c, hr * .2, -hr * .85, hr * .2, hr * .85, shade(Hm.col, .7), hr * .14); return; }
        c.beginPath(); c.arc(0, 0, hr * 1.08, Math.PI * .4, Math.PI * 1.6); c.closePath(); c.fill();
        c.beginPath(); c.arc(0, 0, hr * 1.08, Math.PI * 1.6, Math.PI * 2.4); c.fill();
        c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(-hr * .25, -hr * .3, hr * .35, hr * .2, -.5, 0, 7); c.fill();
        if (Hm.kind === 'nasal') { c.fillStyle = shade(Hm.col, .8); c.fillRect(hr * .55, -hr * .1, hr * .55, hr * .2); line(c, -hr, 0, hr * .6, 0, shade(Hm.col, .8), hr * .12); }
        if (Hm.kind === 'gondor' || Hm.kind === 'citadel') {
            const big = Hm.kind === 'citadel' ? 1.35 : 1;
            c.fillStyle = Hm.wings;
            [-1, 1].forEach(sd => { c.beginPath(); c.moveTo(-hr * .1, sd * hr * .85); c.quadraticCurveTo(-hr * 1.1 * big, sd * hr * 2 * big, -hr * 1.75 * big, sd * hr * 1.35 * big); c.lineTo(-hr * .5, sd * hr * .7); c.fill(); });
            c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = .5; [-1, 1].forEach(sd => { for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(-hr * .3, sd * hr * .8); c.lineTo(-hr * (.4 + k * .4) * big, sd * hr * (1 + k * .25) * big); c.stroke(); } });
        }
        if (Hm.kind === 'orc') { ell(c, -hr * .1, 0, hr * .2, hr * .2, 0, '#7a7e86'); for (const sd of [-1, 1]) ell(c, hr * .45, sd * hr * .8, hr * .3, hr * .2, 0, shade(Hm.col, .8)); }
        if (Hm.kind === 'uruk') drawHand(c, hr * .25, 0, hr * .55, '#f2f2f2');
        if (Hm.kind === 'mask') { ell(c, hr * .7, 0, hr * .45, hr * .8, 0, '#e0b040', 'rgba(0,0,0,.4)', .6); c.fillStyle = '#000'; c.fillRect(hr * .8, -hr * .45, hr * .14, hr * .3); c.fillRect(hr * .8, hr * .15, hr * .14, hr * .3); }
        if (Hm.kind === 'mouth') {
            c.fillStyle = '#2a2a32'; for (let k = 0; k < 9; k++) { const a = Math.PI * .55 + k * Math.PI * .9 / 8 + Math.PI * .5; c.beginPath(); c.moveTo(Math.cos(a - .15) * hr, Math.sin(a - .15) * hr); c.lineTo(Math.cos(a) * hr * 1.9, Math.sin(a) * hr * 1.9); c.lineTo(Math.cos(a + .15) * hr, Math.sin(a + .15) * hr); c.fill(); }
            line(c, hr * .2, -hr * .7, hr * .2, hr * .7, '#8a1a10', hr * .15);
        }
        if (Hm.band) { line(c, -hr * .9, 0, hr * .9, 0, Hm.band, hr * .25); ell(c, hr * .7, 0, hr * .18, hr * .18, 0, Hm.band); }
        if (Hm.kind === 'elf') { c.fillStyle = Hm.crest; c.beginPath(); c.moveTo(hr * .7, 0); c.quadraticCurveTo(-hr * .2, -hr * .35, -hr * 1.7, 0); c.quadraticCurveTo(-hr * .2, hr * .35, hr * .7, 0); c.fill(); line(c, hr * .6, 0, -hr * 1.5, 0, '#a08030', .6); }
    }

    /* ---------- jedna snímka a pás snímok ---------- */
    /** Jeden snímok vojaka do kontextu c (stred = poloha jednotky). key = druh z UNITS alebo hotový popis (heroSpec). */
    function drawUnit(c, key, frame12, layer) {
        // 12 snímok hry -> vnútorné číslovanie: 0–3 chôdza, 4–6 útok, 7–9 pád, 10 státie
        const frame = frame12 === 0 ? 10 : frame12 <= 4 ? frame12 - 1 : frame12 <= 7 ? frame12 - 1 : Math.min(9, 7 + Math.floor((frame12 - 8) * 3 / 4));
        const sp = typeof key === 'string' ? UNITS[key] : key, team = layer === 'team';
        c.save();
        const dying = frame12 >= 8 ? frame12 - 7 : 0;      // 1–4
        if (dying) {
            if (!team) ell(c, 0, 0, sp.r * (1.2 + dying * .4) * (sp.mount || sp.beast ? 1.6 : 1), sp.r * (.9 + dying * .25), 0, 'rgba(110,18,18,' + (.1 + dying * .08) + ')');
            c.rotate([.3, .7, 1.1, 1.4][dying - 1]); c.scale(1, [.92, .84, .76, .7][dying - 1]);
            if (team) c.globalAlpha = [.9, .78, .66, .55][dying - 1];
        }
        if (sp.beast) { drawBeast(c, sp, sp.beast, dying ? 0 : frame, layer); c.restore(); return; }
        const r = sp.r, ph = frame < 4 ? frame / 4 * Math.PI * 2 : 0, walk = frame < 4 || frame === 10;
        const atkA = { 4: -1.1, 5: .55, 6: .15 }[frame] || 0, lunge = { 4: -2, 5: 3.5, 6: 1 }[frame] || 0;
        const bodyX = frame === 5 ? r * .15 : 0, rr = sp.big ? r * .8 : r, hr = rr * .48;
        const cut = (fn) => { c.save(); c.globalCompositeOperation = 'destination-out'; c.globalAlpha = 1; fn(); c.restore(); };
        const bodyAt = () => { c.save(); c.translate(bodyX, 0); if (sp.big) c.scale(1.25, 1.25); };
        const sx = rr * .25 + (frame === 4 ? rr * .2 : 0);
        const Sh = sp.shieldG, shW = Sh ? rr * (Sh.shape === 'round' ? .42 : .3) * (Sh.big || 1) : 0, shH = Sh ? rr * (Sh.shape === 'round' ? .5 : .68) * (Sh.big || 1) : 0;
        const bodyCut = () => { ell(c, 0, 0, rr * .76, rr * 1.04, 0, '#000'); ell(c, rr * .1, -rr * .95, rr * .32, rr * .3, 0, '#000'); ell(c, rr * .1, rr * .95, rr * .32, rr * .3, 0, '#000'); };
        if (!team) {
            const hs = sp.horse ? sp.horse.s : 1;
            ell(c, 1, 2, r * (sp.mount ? 2.2 * hs : 1.15), r * (sp.mount ? 1.1 * hs : 1.15) * .85, 0, 'rgba(0,0,0,.28)');
            if (sp.mount) drawMount(c, sp, sp.mount, ph, 'base');
            if (!sp.mount) { const st = walk ? Math.sin(ph) * r * .45 : 0; ell(c, st, -r * .38, r * .32, r * .2, 0, '#2a2018'); ell(c, -st, r * .38, r * .32, r * .2, 0, '#2a2018'); }
            bodyAt();
            if (sp.armorG) drawArmor(c, rr, sp.armorG);
            else {
                ell(c, 0, 0, rr * .72, rr, 0, sp.armor, 'rgba(0,0,0,.55)', 1.2);
                ell(c, -rr * .2, -rr * .3, rr * .3, rr * .55, 0, 'rgba(255,255,255,.16)');
                ell(c, rr * .1, -rr * .95, rr * .3, rr * .28, 0, shade(sp.armor, 1.15));
                ell(c, rr * .1, rr * .95, rr * .3, rr * .28, 0, shade(sp.armor, 1.15));
            }
            if (Sh) { c.save(); c.translate(sx, -rr * .95); shieldFace(c, Sh, shW, shH, 'base'); c.restore(); }
            else if (sp.shield && !sp.shieldG && !sp.hero) ell(c, sx, -rr * .95, rr * (sp.shield === 'kite' ? .3 : .4), rr * (sp.shield === 'kite' ? .6 : .45), 0, '#d9a441');
            drawWeapon(c, sp, walk ? Math.sin(ph) * .12 : atkA, ['bow', 'xbow'].includes(sp.weapon) ? (frame === 4 ? -6 : frame === 5 ? -8 : 0) : lunge, 'base', ph);
            drawHead(c, sp, 'base');
            c.restore();
        } else {
            if (sp.mount && sp.mount !== 'darkhorse' && sp.mount !== 'wolf') { drawMount(c, sp, sp.mount, ph, 'team'); cut(() => { c.translate(bodyX, 0); bodyCut(); }); }
            bodyAt();
            if (sp.cape) {
                const L = sp.mount ? 1.45 : 1.6;
                c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(-rr * L, Math.sin(ph) * rr * .25); c.quadraticCurveTo(-rr * 1.1, rr * 1.05, 0, rr * .85); c.lineTo(0, -rr * .85); c.quadraticCurveTo(-rr * 1.1, -rr * 1.05, -rr * L, Math.sin(ph) * rr * .25); c.fill();
                cut(bodyCut);
            }
            if (sp.skin !== 'none' && sp.helm !== 'nazgul' && !sp.big) ell(c, 0, 0, rr * .32, rr * .78, 0, '#f2f2f2');
            if (Sh) { cut(() => { c.save(); c.translate(sx, -rr * .95); shieldPath(c, Sh, shW, shH); c.fill(); c.restore(); }); c.save(); c.translate(sx, -rr * .95); shieldFace(c, Sh, shW, shH, 'team'); c.restore(); }
            else if (sp.shield && !sp.hero) ell(c, sx, -rr * .95, rr * (sp.shield === 'kite' ? .24 : .33), rr * (sp.shield === 'kite' ? .52 : .38), 0, '#ffffff');
            cut(() => ell(c, 0, 0, hr * 1.12, hr * 1.12, 0, '#000'));
            drawHead(c, sp, 'team');
            c.restore();
        }
        c.restore();
    }

    function drawBeast(c, sp, kind, frame, layer) {
        const r = sp.r, ph = frame < 4 ? frame / 4 * Math.PI * 2 : 0, atk = frame >= 4 && frame <= 6 ? [.0, .5, .2][frame - 4] : 0;
        if (kind === 'wolf') { drawMount(c, { r: r * 1.3 }, 'wolf', ph, layer); if (layer === 'base' && atk) { ell(c, r * 2.6 + atk * r, 0, r * .35, r * .3, 0, '#1a1614'); } return; }
        // olifant
        const step = Math.sin(ph) * r * .25;
        if (layer === 'base') {
            [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([fx, fy], k) => ell(c, fx * r * .9 + (k % 3 ? step : -step), fy * r * .7, r * .38, r * .34, 0, '#5a5650'));
            ell(c, 0, 0, r * 1.5, r * 1.05, 0, '#7a7670'); ell(c, -r * .3, -r * .35, r * .9, r * .35, 0, 'rgba(255,255,255,.08)');
            ell(c, r * 1.45, 0, r * .62, r * .7, 0, '#6e6a64');
            [-1, 1].forEach(sd => ell(c, r * 1.2, sd * r * .85, r * .45, r * .32, sd * .3, '#625e58'));
            c.strokeStyle = '#f0ead8'; c.lineWidth = r * .14; c.lineCap = 'round';
            [-1, 1].forEach(sd => { c.beginPath(); c.moveTo(r * 1.8, sd * r * .3); c.quadraticCurveTo(r * 2.6, sd * r * .5, r * 2.8 + atk * r, sd * r * .1); c.stroke(); });
            c.strokeStyle = '#5e5a54'; c.lineWidth = r * .22; c.beginPath(); c.moveTo(r * 2, 0); c.quadraticCurveTo(r * 2.7, Math.sin(ph) * r * .3, r * 3 + atk * r * 1.2, r * .2); c.stroke();
            c.fillStyle = '#6a4a2e'; c.fillRect(-r * .7, -r * .6, r * 1.2, r * 1.2);
            c.strokeStyle = '#3a2a1a'; c.lineWidth = 2; c.strokeRect(-r * .7, -r * .6, r * 1.2, r * 1.2);
        } else {
            c.fillStyle = '#fff'; c.fillRect(-r * .6, -r * .5, r, r);
        }
    }

    /** Pás 12 snímok vedľa seba (192 px na snímku). */
    function sheet(key, layer) {
        const cv = mkCanvas(FRAME * FRAMES, FRAME), c = cv.getContext('2d');
        for (let k = 0; k < FRAMES; k++) {
            c.save(); c.translate(k * FRAME + FRAME / 2, FRAME / 2); c.scale(S, S);
            drawUnit(c, key, k, layer);
            c.restore();
            if (k >= 8 && layer === 'base') {   // stmavenie padlých
                c.save(); c.globalCompositeOperation = 'source-atop'; c.fillStyle = 'rgba(20,10,10,' + (.12 + (k - 8) * .1) + ')'; c.fillRect(k * FRAME, 0, FRAME, FRAME); c.restore();
            }
        }
        return cv;
    }

    /* ---------- ikonky výbavy (pre kováča) ---------- */
    /** Ikonka veci k (w, a, s, h, m) s poradím i, vo farbe frakcie color. Plátno size × size. */
    function icon(k, i, color, size = 64) {
        const cv = mkCanvas(size, size), c = cv.getContext('2d'), u = size / 64, team = color || '#c8a050';
        c.translate(size / 2, size / 2); c.scale(u, u);
        const G = gear(k, i);
        if (k === 'w') {
            const r = G.t === 'spear' ? 9.6 : G.t === 'axe' ? 14.5 : G.t === 'mace' ? 15.5 / (G.big || 1) : 64 / (G.L + .9) * .95;
            c.rotate(-Math.PI / 4);
            const len = G.t === 'spear' ? (G.L + 1.9) * r : G.t === 'mace' ? (G.L + 1.4 * (G.big || 1)) * r : (G.L + .6) * r;
            c.translate(-len / 2 + (G.t === 'spear' ? 1.6 * r : .55 * r), 0);
            weaponShape(c, r, G, 1);
        }
        if (k === 'a') iconArmor(c, G, team);
        if (k === 's') { if (G) { shieldFace(c, G, G.shape === 'round' ? 22 : 18, G.shape === 'round' ? 22 : 27, 'base'); if (G.paint) tintedLayer(c, team, cc => shieldFace(cc, G, 22, 22, 'team')); } else iconNone(c); }
        if (k === 'h') iconHelm(c, G, team);
        if (k === 'm') { if (G) iconHorse(c, G, team); else iconBoots(c); }
        return cv;
    }
    /** Nakreslí bielu vrstvu fn a zafarbí ju farbou frakcie. */
    function tintedLayer(c, color, fn) {
        const sz = 64, t = mkCanvas(sz, sz), tc = t.getContext('2d');
        tc.translate(sz / 2, sz / 2); fn(tc);
        tc.setTransform(1, 0, 0, 1, 0, 0);
        tc.globalCompositeOperation = 'source-in'; tc.fillStyle = color; tc.fillRect(0, 0, sz, sz);
        c.drawImage(t, -sz / 2, -sz / 2);
    }
    function iconNone(c) { c.strokeStyle = 'rgba(80,60,40,.6)'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 16, 0, 7); c.moveTo(-11, 11); c.lineTo(11, -11); c.stroke(); }
    function iconArmor(c, A, team) {
        const torso = () => { c.beginPath(); c.moveTo(-15, -20); c.quadraticCurveTo(0, -14, 15, -20); c.lineTo(20, -6); c.lineTo(15, -4); c.lineTo(14, 22); c.lineTo(-14, 22); c.lineTo(-15, -4); c.lineTo(-20, -6); c.closePath(); };
        if (A.glow) glow(c, () => { c.fillStyle = A.col; torso(); c.fill(); }, A.glow, 12);
        c.fillStyle = A.col; torso(); c.fill();
        c.save(); torso(); c.clip(); c.scale(1.25, 1); c.rotate(Math.PI / 2); armorPattern(c, 24, A); c.restore();
        c.save(); torso(); c.clip(); c.fillStyle = team; c.fillRect(-5, -16, 10, 38); c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(-14, 8, 28, 4); c.restore();
        c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 1.2; torso(); c.stroke();
        if (A.pat === 'robe') { c.fillStyle = A.col; c.beginPath(); c.moveTo(-15, 20); for (let k = 0; k <= 10; k++) c.lineTo(-15 + k * 3, k % 2 ? 30 : 22); c.lineTo(15, 20); c.fill(); c.beginPath(); c.moveTo(-11, -18); c.quadraticCurveTo(0, -32, 11, -18); c.quadraticCurveTo(0, -12, -11, -18); c.fill(); }
        for (const sd of [-1, 1]) {
            ell(c, sd * 16, -15, 7 * A.pad, 5.5 * A.pad, sd * .3, shade(A.col, 1.15), A.rim || 'rgba(0,0,0,.5)', 1);
            if (A.spikes) { c.fillStyle = A.rim; for (const dx of [-3, 3]) { c.beginPath(); c.moveTo(sd * 16 + dx - 2, -18); c.lineTo(sd * 16 + dx * 1.6, -28); c.lineTo(sd * 16 + dx + 2, -18); c.fill(); } }
        }
        if (A.hand) drawHand(c, -10, 4, 6, '#f2f2f2');
    }
    function iconHelm(c, Hm, team) {
        if (Hm.glow) glow(c, () => ell(c, 0, 2, 16, 18, 0, Hm.col), Hm.glow, 10);
        if (Hm.plume) { c.fillStyle = team; c.beginPath(); c.moveTo(-3, -18); c.quadraticCurveTo(14, -34, 24, -18); c.quadraticCurveTo(12, -24, 3, -16); c.fill(); }
        if (Hm.kind === 'gondor' || Hm.kind === 'citadel') {
            const b = Hm.kind === 'citadel' ? 1.3 : 1; c.fillStyle = Hm.wings;
            for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * 13, -2); c.quadraticCurveTo(sd * 30 * b, -10 * b, sd * 26 * b, -26 * b); c.quadraticCurveTo(sd * 20, -12, sd * 12, -10); c.fill(); }
        }
        c.fillStyle = Hm.col; c.beginPath();
        if (Hm.kind === 'cap') { c.arc(0, 4, 17, Math.PI, 0); c.lineTo(19, 8); c.lineTo(-19, 8); }
        else if (Hm.kind === 'elf') { c.moveTo(-15, 14); c.lineTo(-16, 0); c.quadraticCurveTo(-14, -18, 0, -26); c.quadraticCurveTo(14, -18, 16, 0); c.lineTo(15, 14); c.lineTo(8, 16); c.lineTo(5, 2); c.lineTo(-5, 2); c.lineTo(-8, 16); }
        else { const tall = Hm.kind === 'citadel' ? 6 : Hm.kind === 'gondor' ? 3 : 0; c.moveTo(-15, 16); c.lineTo(-16, 0); c.quadraticCurveTo(-15, -20 - tall, 0, -22 - tall); c.quadraticCurveTo(15, -20 - tall, 16, 0); c.lineTo(15, 16); c.lineTo(8, 18); c.lineTo(6, 4); c.lineTo(-6, 4); c.lineTo(-8, 18); }
        c.closePath(); c.fill(); c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 1; c.stroke();
        ell(c, -6, -8, 4, 8, .3, 'rgba(255,255,255,.4)');
        if (Hm.kind === 'cap') { line(c, -18, 7, 18, 7, shade(Hm.col, .7), 3); c.setLineDash([2, 2]); line(c, 0, -12, 0, 6, shade(Hm.col, .65), 1); c.setLineDash([]); }
        if (Hm.kind === 'nasal') { c.fillStyle = shade(Hm.col, .75); c.fillRect(-2, 2, 4, 15); line(c, -16, 2, 16, 2, shade(Hm.col, .75), 2.5); }
        if (Hm.kind === 'elf') { line(c, 0, -26, 0, 2, Hm.crest, 2); line(c, -15, 2, 15, 2, Hm.crest, 1.5); }
        if (Hm.kind === 'orc') { c.fillStyle = '#7a7e86'; c.beginPath(); c.moveTo(-3, -21); c.lineTo(0, -31); c.lineTo(3, -21); c.fill(); for (const sd of [-1, 1]) { c.fillStyle = shade(Hm.col, .8); c.fillRect(sd * 15 - 4, 0, 8, 16); } ell(c, -9, 16, 3, 2, 0, 'rgba(120,60,20,.6)'); ell(c, 8, -10, 3, 2, 0, 'rgba(120,60,20,.5)'); }
        if (Hm.kind === 'uruk') drawHand(c, 0, -6, 11, '#f2f2f2');
        if (Hm.kind === 'mask') { c.fillStyle = '#e8c050'; c.beginPath(); c.moveTo(-13, -4); c.quadraticCurveTo(0, -8, 13, -4); c.lineTo(10, 14); c.quadraticCurveTo(0, 22, -10, 14); c.closePath(); c.fill(); c.strokeStyle = 'rgba(0,0,0,.45)'; c.stroke(); c.fillStyle = '#000'; c.fillRect(-9, 1, 6, 2.5); c.fillRect(3, 1, 6, 2.5); line(c, -4, 13, 4, 13, '#5a3a10', 1.5); }
        if (Hm.kind === 'mouth') {
            c.fillStyle = '#2a2a32'; for (let k = -3; k <= 3; k++) { c.beginPath(); c.moveTo(k * 5 - 3, -16 - (3 - Math.abs(k)) * 2); c.lineTo(k * 7, -34 - (3 - Math.abs(k)) * 3); c.lineTo(k * 5 + 3, -16 - (3 - Math.abs(k)) * 2); c.fill(); }
            c.fillStyle = '#d8b090'; c.beginPath(); c.moveTo(-7, 6); c.lineTo(7, 6); c.lineTo(5, 18); c.lineTo(-5, 18); c.closePath(); c.fill();
            line(c, -5, 12, 5, 12, '#8a1010', 2.5); line(c, -15, 4, 15, 4, '#8a1a10', 2);
        }
        if (Hm.band) { line(c, -16, -2, 16, -2, Hm.band, 3.5); c.fillStyle = Hm.band; c.beginPath(); c.moveTo(-5, -4); c.lineTo(0, -14); c.lineTo(5, -4); c.fill(); }
    }
    function iconWolf(c, H, team) {
        c.save(); c.translate(0, 4);
        const head = () => { c.beginPath(); c.moveTo(-16, 26); c.quadraticCurveTo(-20, 4, -10, -10); c.lineTo(-12, -26); c.lineTo(-2, -16); c.lineTo(4, -24); c.lineTo(6, -12); c.quadraticCurveTo(18, -6, 26, 4); c.lineTo(22, 10); c.quadraticCurveTo(10, 10, 4, 12); c.quadraticCurveTo(4, 20, 8, 26); c.closePath(); };
        c.fillStyle = H.col; head(); c.fill(); c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 1; head(); c.stroke();
        c.fillStyle = H.back; c.beginPath(); c.moveTo(-10, -10); c.quadraticCurveTo(-22, 6, -16, 26); c.lineTo(-10, 26); c.quadraticCurveTo(-14, 6, -4, -8); c.fill();
        ell(c, 25, 5, 2.5, 2.2, 0, '#111');
        c.fillStyle = '#f0ead8'; for (const x of [12, 17, 21]) { c.beginPath(); c.moveTo(x, 9); c.lineTo(x + 1.5, 14); c.lineTo(x + 3, 9); c.fill(); }
        glow(c, () => ell(c, 4, -4, 2.6, 2, -.3, H.eye), H.eye, 6); ell(c, 4, -4, .8, 1.6, 0, '#000');
        c.fillStyle = team; c.beginPath(); c.moveTo(-16, 26); c.quadraticCurveTo(-15, 20, -8, 20); c.lineTo(8, 26); c.closePath(); c.fill();
        c.restore();
    }
    function iconHorse(c, H, team) {
        if (H.wolf) return iconWolf(c, H, team);
        c.save(); c.translate(-2, 4);
        if (H.glow) glow(c, () => { c.fillStyle = H.col; c.beginPath(); c.ellipse(0, 0, 18, 22, 0, 0, 7); c.fill(); }, H.glow, 14);
        const head = () => { c.beginPath(); c.moveTo(-12, 26); c.quadraticCurveTo(-16, 2, -6, -16); c.lineTo(-3, -26); c.lineTo(1, -18); c.quadraticCurveTo(10, -14, 22, 4); c.quadraticCurveTo(26, 10, 20, 14); c.quadraticCurveTo(10, 12, 4, 6); c.quadraticCurveTo(6, 18, 12, 26); c.closePath(); };
        c.fillStyle = H.col; head(); c.fill(); c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 1; head(); c.stroke();
        if (H.dapple) for (const [x, y] of [[-8, 14], [-3, 20], [-9, 4]]) ell(c, x, y, 2.5, 2, 0, H.dapple);
        if (H.sheen) ell(c, -6, 0, 3, 12, .3, 'rgba(255,255,255,.7)');
        ell(c, 19, 9, 3.5, 3, 0, shade(H.col, H.sheen ? .85 : .65));
        if (H.redEye) glow(c, () => ell(c, 4, -8, 2.4, 2, 0, '#ff3010'), '#ff3010', 6);
        else { ell(c, 4, -8, 2.2, 2.2, 0, '#111'); ell(c, 4.6, -8.6, .7, .7, 0, '#fff'); }
        if (H.blaze) { c.fillStyle = '#f4f0e4'; c.beginPath(); c.moveTo(2, -16); c.quadraticCurveTo(14, -6, 20, 6); c.lineTo(17, 7); c.quadraticCurveTo(10, -4, 0, -14); c.fill(); }
        c.strokeStyle = H.mane; c.lineCap = 'round';
        c.lineWidth = H.long ? 6 : 4; c.beginPath(); c.moveTo(-4, -20); c.quadraticCurveTo(-18, -4, -16, 24); c.stroke();
        if (H.long) { c.lineWidth = 3; c.beginPath(); c.moveTo(-6, -12); c.quadraticCurveTo(-24, 4, -22, 22); c.stroke(); }
        if (H.shaggy) { c.lineWidth = 3; c.beginPath(); c.moveTo(-1, -20); c.quadraticCurveTo(4, -16, 6, -12); c.stroke(); }
        if (H.tack) { line(c, 4, -14, 10, 4, H.tack, 1.6); line(c, -2, -6, 16, 4, H.tack, 1.6); line(c, 10, 4, 20, 14, H.tack, 1.6); }
        if (H.barding) {
            c.fillStyle = H.barding; c.beginPath(); c.moveTo(-1, -18); c.quadraticCurveTo(12, -10, 20, 4); c.lineTo(14, 6); c.quadraticCurveTo(6, -6, -4, -10); c.closePath(); c.fill(); c.strokeStyle = 'rgba(0,0,0,.4)'; c.stroke();
            for (let k = 0; k < 3; k++) { c.fillStyle = shade(H.barding, .9 + k * .05); c.beginPath(); c.ellipse(-11 + k * 1.5, -2 + k * 9, 5, 4, 0, 0, 7); c.fill(); }
        }
        if (H.horn) { c.fillStyle = '#8a8e96'; c.beginPath(); c.moveTo(2, -14); c.lineTo(10, -30); c.lineTo(8, -12); c.fill(); }
        if (H.shroud) { c.fillStyle = '#050507'; c.beginPath(); c.moveTo(-6, -18); c.quadraticCurveTo(-24, -4, -20, 26); c.lineTo(-14, 22); c.lineTo(-10, 27); c.lineTo(-4, 21); c.lineTo(2, 27); c.lineTo(4, 20); c.quadraticCurveTo(-8, 6, -2, -14); c.closePath(); c.fill(); }
        if (H.caparison || H.blanket) { c.fillStyle = team; c.beginPath(); c.moveTo(-14, 26); c.quadraticCurveTo(-13, 18, -6, 18); c.lineTo(12, 26); c.closePath(); c.fill(); }
        c.restore();
    }
    function iconBoots(c) {
        for (const [x, s] of [[-9, 1], [9, 1]]) {
            c.fillStyle = '#6a4a2e'; c.beginPath(); c.moveTo(x - 6, -16); c.lineTo(x + 4, -16); c.lineTo(x + 4, 6); c.quadraticCurveTo(x + 14 * s, 8, x + 14 * s, 16); c.lineTo(x - 6, 16); c.closePath(); c.fill();
            c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 1; c.stroke();
            line(c, x - 6, -12, x + 4, -12, '#4a3020', 2);
        }
    }

    return { S, FRAME, FRAMES, UNITS, GEAR, gear, heroSpec, drawUnit, sheet, icon, shade, ell, mkCanvas };
})();
