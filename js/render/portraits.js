/*
 * Portréty: tvár spredu kreslená kódom podľa popisu look = { race, sex, skin, hair, hcol, beard, eyes, age, scar, paint, hood, turban, helm, crown }.
 *   race: human | elf | dwarf | hobbit | orc | uruk | dark (juh) | east (Rhûn) | wraith;  sex: m | f
 *   eyeShape: almond | round | narrow | deep;  nose: straight | hooked | wide | small | flat;  mouth: neutral | smile | stern | thin;  brows: flat | arched | thick | angry
 *   skin: 0 svetlá, 1 opálená, 2 tmavá, 3 bledá (alebo farba '#rrggbb');  hair: short | long | bald | tied | curly | lank | braids | wavy | mohawk | topknot
 *   hcol: farba vlasov; beard: none | stubble | full | long | braided | goatee | mustache; eyes: farba dúhovky; age 0–1 (vrásky); scar, paint (biela ruka), hood, turban, helm, crown.
 * Portraits.canvas(look, size) vráti plátno; Portraits.forLord(e) a Portraits.hero() odvodia popis z dát hry.
 * Používa sa v rozhovoroch (okno dostane plátno .por) a pri tvorbe postavy.
 */
const Portraits = (() => {
    const SKIN = ['#e8c39e', '#c9956a', '#7a4a2e', '#efe1d2'];
    const shade = (col, k) => { const n = parseInt(col.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v * k))); return '#' + [f(n >> 16 & 255), f(n >> 8 & 255), f(n & 255)].map(v => v.toString(16).padStart(2, '0')).join(''); };
    const E = (c, x, y, rx, ry, rot = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, 7); };
    const P = (c, pts) => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); };

    function draw(c, L) {
        const race = L.race || 'human', f = L.sex === 'f', orcish = race === 'orc' || race === 'uruk';
        const skin = typeof L.skin === 'string' ? L.skin : race === 'orc' ? '#5f7a4a' : race === 'uruk' ? '#3e4a34' : race === 'wraith' ? '#111' : race === 'dark' ? '#7a4a2e' : SKIN[L.skin | 0] || SKIN[0];
        const hcol = L.hcol || '#4a3020', eyes = L.eyes || (orcish ? '#e8c040' : '#4a6a8a');
        const cx = 48, cy = 50, hw = race === 'dwarf' ? 25 : race === 'elf' ? 20 : race === 'hobbit' ? 23.5 : race === 'uruk' ? 23.5 : f ? 20.5 : 22.5, hh = race === 'elf' ? 29 : race === 'hobbit' ? 25 : race === 'dwarf' ? 26 : 27;
        const eyeShape = L.eyeShape || (race === 'east' ? 'narrow' : race === 'hobbit' ? 'round' : race === 'elf' ? 'almond' : orcish ? 'deep' : 'almond');
        const nose = L.nose || (race === 'dwarf' ? 'wide' : race === 'hobbit' ? 'small' : orcish ? 'flat' : 'straight');
        const mouth = L.mouth || (L.smile ? 'smile' : L.angry || orcish ? 'stern' : 'neutral');
        const brows = L.brows || (L.angry || orcish ? 'angry' : race === 'dwarf' ? 'thick' : f ? 'arched' : 'flat');
        // pozadie, ramená a golier v farbe frakcie
        const bg = c.createRadialGradient(cx, cy, 10, cx, cy, 62); bg.addColorStop(0, L.bg || '#3a2c20'); bg.addColorStop(1, '#0e0a08');
        c.fillStyle = bg; c.fillRect(0, 0, 96, 96);
        const cloth = L.cloth || (orcish || race === 'wraith' ? '#1e1a18' : '#4a3a2a');
        const cg = c.createLinearGradient(0, 78, 0, 110); cg.addColorStop(0, shade(cloth, 1.25)); cg.addColorStop(1, shade(cloth, .7));
        c.fillStyle = cg; E(c, cx, 106, 46, 32); c.fill();
        c.fillStyle = shade(cloth, .6); c.beginPath(); c.moveTo(cx - 14, cy + hh + 4); c.lineTo(cx - 24, 96); c.lineTo(cx + 24, 96); c.lineTo(cx + 14, cy + hh + 4); c.closePath(); c.fill();   // golier
        // brnenie na pleciach: krúžková košeľa alebo plátové náplecníky (L.armor = 'mail' | 'plate', farba L.armorCol)
        if (L.armor && race !== 'wraith') {
            const ac = L.armorCol || (L.armor === 'plate' ? '#9aa0aa' : '#7a8088');
            if (L.armor === 'mail') { c.save(); E(c, cx, 106, 46, 32); c.clip(); c.fillStyle = shade(ac, .55); c.fillRect(0, 74, 96, 22); c.strokeStyle = shade(ac, 1.15); c.lineWidth = .7; for (let y = 76; y < 96; y += 2.6) for (let x = (y * 1.3) % 3; x < 96; x += 3) { c.beginPath(); c.arc(x, y, 1.3, 0, Math.PI); c.stroke(); } c.restore(); }
            else for (const s of [-1, 1]) {
                const pg = c.createLinearGradient(cx + s * 20, 74, cx + s * 44, 96); pg.addColorStop(0, shade(ac, 1.35)); pg.addColorStop(.5, ac); pg.addColorStop(1, shade(ac, .55));
                c.fillStyle = pg; c.beginPath(); c.ellipse(cx + s * 31, 88, 17, 11, s * .35, Math.PI, 0); c.lineTo(cx + s * 46, 96); c.lineTo(cx + s * 16, 96); c.closePath(); c.fill();
                c.strokeStyle = shade(ac, .45); c.lineWidth = .8; c.beginPath(); c.ellipse(cx + s * 31, 91, 15, 8, s * .35, Math.PI * 1.05, -.05); c.stroke();
                c.fillStyle = 'rgba(255,255,255,.35)'; E(c, cx + s * 26, 81, 5, 1.6, s * .4); c.fill();
                c.fillStyle = '#d9b860'; for (const k of [0, 1, 2]) { c.beginPath(); c.arc(cx + s * (22 + k * 8), 84 + Math.abs(k - 1) * -1.5 + 2, .9, 0, 7); c.fill(); }
            }
            if (L.clasp !== false) { c.fillStyle = '#d9a441'; c.beginPath(); c.arc(cx - 15, 88, 2.4, 0, 7); c.fill(); c.fillStyle = '#fff0b0'; c.beginPath(); c.arc(cx - 15.6, 87.4, .8, 0, 7); c.fill(); }   // spona plášťa
        }
        if (orcish) { c.fillStyle = '#6a6a70'; for (const sx of [-30, -18, 18, 30]) { c.beginPath(); c.moveTo(cx + sx - 3, 90); c.lineTo(cx + sx, 80); c.lineTo(cx + sx + 3, 90); c.fill(); } }   // ostne na pleciach
        if (race === 'dark') { c.fillStyle = '#d9a441'; c.fillRect(cx - 20, 88, 40, 3); }
        // krk s tieňom
        const ng = c.createLinearGradient(0, cy + hh - 6, 0, cy + hh + 10); ng.addColorStop(0, shade(skin, .6)); ng.addColorStop(1, shade(skin, .85));
        c.fillStyle = ng; c.fillRect(cx - 9, cy + hh - 6, 18, 17);
        // vlasy vzadu
        const hair = L.hair || (f ? 'long' : 'short');
        const seed = n => { const v = Math.sin(n * 127.1 + (L.hcol || '').length * 7.7) * 43758.5; return v - Math.floor(v); };
        const grey = (k, col) => L.age >= .75 && k % 3 !== 0 ? '#c8c4bc' : L.age >= .5 && k % 5 === 0 ? '#a8a49c' : col;   // šediny podľa veku
        const hairBack = (w, bottom) => {
            const hg = c.createLinearGradient(0, cy - 10, 0, cy + bottom); hg.addColorStop(0, shade(hcol, .75)); hg.addColorStop(1, shade(hcol, .55));
            c.fillStyle = hg; P(c, [[cx - hw - w, cy - 10], [cx + hw + w, cy - 10], [cx + hw + w + 3, cy + bottom], [cx - hw - w - 3, cy + bottom]]); c.fill();
            c.lineCap = 'round';
            for (let k = 0; k < 20; k++) { const t = k / 19, x0 = cx - hw - w + 1 + t * (2 * hw + 2 * w - 2), x1 = cx - hw - w - 3 + t * (2 * hw + 2 * w + 6) + (seed(k) - .5) * 3; c.strokeStyle = grey(k, shade(hcol, .55 + seed(k + 9) * .7)); c.lineWidth = .6 + seed(k + 3) * .8; c.beginPath(); c.moveTo(x0, cy - 6); c.quadraticCurveTo(x0 + (seed(k + 5) - .5) * 6, cy + bottom * .5, x1, cy + bottom + seed(k + 7) * 4); c.stroke(); }   // prame­ne a rozstrapkané končeky
        };
        if (race !== 'wraith') { if (hair === 'long' || hair === 'braids' || hair === 'wavy') hairBack(4, 40); if (hair === 'lank') hairBack(2, 30); }
        // hlava s tieňovaním pleti (svetlo zľava hore)
        const g = c.createRadialGradient(cx - 8, cy - 10, 4, cx, cy + 4, hh + 14); g.addColorStop(0, shade(skin, 1.1)); g.addColorStop(.6, skin); g.addColorStop(1, shade(skin, .72));
        c.fillStyle = g;
        if (orcish) { P(c, [[cx - hw, cy - hh * .7], [cx - hw * .6, cy - hh], [cx + hw * .6, cy - hh], [cx + hw, cy - hh * .7], [cx + hw * .95, cy + hh * .3], [cx + hw * .5, cy + hh], [cx - hw * .5, cy + hh], [cx - hw * .95, cy + hh * .3]]); c.fill(); }
        else if (race === 'wraith') { c.fillStyle = '#050508'; E(c, cx, cy, hw, hh); c.fill(); }
        else { c.beginPath(); c.moveTo(cx - hw, cy - 4); c.quadraticCurveTo(cx - hw, cy - hh - 2, cx, cy - hh - 2); c.quadraticCurveTo(cx + hw, cy - hh - 2, cx + hw, cy - 4); c.quadraticCurveTo(cx + hw, cy + hh * .55, cx + (race === 'dwarf' ? 10 : f ? 5 : 7), cy + hh); c.lineTo(cx - (race === 'dwarf' ? 10 : f ? 5 : 7), cy + hh); c.quadraticCurveTo(cx - hw, cy + hh * .55, cx - hw, cy - 4); c.fill(); }
        if (race !== 'wraith') {
            c.save(); E(c, cx, cy + 2, hw - 2, hh - 3); c.clip(); for (let k = 0; k < 160; k++) { const sx = cx + (seed(k * 3.1) - .5) * 2 * hw, sy = cy + (seed(k * 5.7) - .5) * 2 * hh; c.fillStyle = k % 2 ? 'rgba(0,0,0,.05)' : 'rgba(255,240,220,.06)'; c.fillRect(sx, sy, .8, .8); } c.restore();   // pórovitá pleť
            if (L.freckles) { c.fillStyle = shade(skin, .62); for (let k = 0; k < 26; k++) { const s = k % 2 ? 1 : -1, fx = cx + s * (5 + seed(k) * 11), fy = cy + 1 + seed(k + 40) * 8; c.globalAlpha = .45 + seed(k + 20) * .4; c.beginPath(); c.arc(fx, fy, .45 + seed(k + 60) * .35, 0, 7); c.fill(); } c.globalAlpha = 1; }   // pehy
            c.fillStyle = 'rgba(0,0,0,.12)'; E(c, cx, cy + hh - 4, hw * .55, 4); c.fill();                                         // tieň pod bradou
            for (const s of [-1, 1]) { c.fillStyle = 'rgba(255,255,255,.08)'; E(c, cx + s * 12, cy + 4, 5, 3, s * .4); c.fill(); }     // lícne kosti
            if (race === 'hobbit' || L.rosy) { c.fillStyle = 'rgba(220,90,80,.22)'; E(c, cx - 12, cy + 7, 5, 3); c.fill(); E(c, cx + 12, cy + 7, 5, 3); c.fill(); }
            if (race === 'orc') { c.fillStyle = shade(skin, .75); for (const [wx, wy] of [[-14, -2], [10, 12], [16, -8]]) { c.beginPath(); c.arc(cx + wx, cy + wy, 1.6, 0, 7); c.fill(); } }   // bradavice
        }
        // uši
        if (race !== 'wraith') {
            c.fillStyle = shade(skin, .9);
            if (race === 'elf' || orcish) { const e = race === 'elf' ? 14 : 9, up = race === 'elf' ? 6 : 2; for (const s of [-1, 1]) { P(c, [[cx + s * (hw - 2), cy - 2], [cx + s * (hw + e), cy - 8 - up], [cx + s * (hw - 1), cy + 7]]); c.fill(); c.fillStyle = shade(skin, .75); P(c, [[cx + s * (hw - 1), cy - 1], [cx + s * (hw + e * .6), cy - 6 - up * .6], [cx + s * (hw - .5), cy + 5]]); c.fill(); c.fillStyle = shade(skin, .9); } }
            else for (const s of [-1, 1]) { E(c, cx + s * hw, cy + 1, 3.5, 5.5); c.fill(); c.fillStyle = shade(skin, .75); E(c, cx + s * hw, cy + 1.5, 1.6, 3); c.fill(); c.fillStyle = shade(skin, .9); }
            if (L.earring) { c.strokeStyle = '#d9a441'; c.lineWidth = 1; c.beginPath(); c.arc(cx + hw + 1, cy + 7, 2.2, 0, 7); c.stroke(); }
        }
        // oči
        const ey = cy - 3, ex = race === 'dwarf' ? 9 : 8.5, erx = eyeShape === 'narrow' ? 4.4 : eyeShape === 'round' ? 3.8 : 4.2, ery = eyeShape === 'round' ? 3 : eyeShape === 'narrow' ? 1.4 : eyeShape === 'deep' ? 2.1 : 2.5;
        if (race === 'wraith') { c.save(); c.shadowColor = '#ff3020'; c.shadowBlur = 8; c.fillStyle = '#ff5030'; E(c, cx - ex, ey, 2.5, 1); c.fill(); E(c, cx + ex, ey, 2.5, 1); c.fill(); c.restore(); }
        else for (const s of [-1, 1]) {
            const x = cx + s * ex;
            c.fillStyle = shade(skin, eyeShape === 'deep' ? .68 : .8); E(c, x, ey + 1, erx + 1.6, ery + 1.8); c.fill();         // očná jamka
            c.fillStyle = orcish ? '#f0e0a0' : '#f4f0ea'; E(c, x, ey, erx, ery); c.fill();
            c.save(); c.beginPath(); c.ellipse(x, ey, erx, ery, 0, 0, 7); c.clip();
            const ir = Math.min(erx, ery + 1.2) * .78;
            const ig = c.createRadialGradient(x + (L.look || 0), ey, .2, x + (L.look || 0), ey, ir); ig.addColorStop(0, shade(eyes, 1.3)); ig.addColorStop(1, shade(eyes, .6));
            c.fillStyle = ig; c.beginPath(); c.arc(x + (L.look || 0), ey, ir, 0, 7); c.fill();
            c.fillStyle = '#0a0806'; c.beginPath(); c.arc(x + (L.look || 0), ey, ir * .45, 0, 7); c.fill();
            c.strokeStyle = shade(eyes, 1.6); c.globalAlpha = .4; c.lineWidth = .3; for (let k = 0; k < 12; k++) { const a = k * .5236; c.beginPath(); c.moveTo(x + (L.look || 0) + Math.cos(a) * ir * .5, ey + Math.sin(a) * ir * .5); c.lineTo(x + (L.look || 0) + Math.cos(a) * ir * .92, ey + Math.sin(a) * ir * .92); c.stroke(); } c.globalAlpha = 1;   // vlákna dúhovky
            c.strokeStyle = shade(eyes, .35); c.lineWidth = .45; c.beginPath(); c.arc(x + (L.look || 0), ey, ir, 0, 7); c.stroke();   // okraj dúhovky
            c.fillStyle = 'rgba(120,60,50,.18)'; E(c, x - s * (erx - .6), ey + .3, .9, ery * .6); c.fill();   // vnútorný kútik
            c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x - erx, ey - ery, erx * 2, ery * .55);                                        // tieň horného viečka
            c.restore();
            c.fillStyle = '#fff'; c.beginPath(); c.arc(x + .9 + (L.look || 0), ey - .9, .8, 0, 7); c.fill();
            c.strokeStyle = shade(skin, .5); c.lineWidth = f ? 1.3 : 1; c.beginPath(); c.ellipse(x, ey, erx, ery, 0, Math.PI, 0); c.stroke();   // horné viečko
            c.strokeStyle = shade(skin, .7); c.lineWidth = .7; c.beginPath(); c.ellipse(x, ey, erx, ery, 0, 0, Math.PI); c.stroke();
            if (f) { c.strokeStyle = '#1a1210'; c.lineWidth = .8; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(x + s * (erx - k * 1.2), ey - ery + .2); c.lineTo(x + s * (erx + 1 - k * 1.2), ey - ery - 1.6); c.stroke(); } }   // mihalnice
            // obočie
            c.strokeStyle = orcish ? '#2a2a1a' : shade(hcol, .85); c.lineWidth = brows === 'thick' ? 3 : f ? 1.3 : 2.2; c.lineCap = 'round';
            const by = ey - 6.5, tilt = brows === 'angry' ? 3 : brows === 'arched' ? -1 : 0;
            c.beginPath(); c.moveTo(x - s * (erx + 1.5), by - (brows === 'angry' ? 1 : 0) - (brows === 'arched' ? 0 : 0)); c.quadraticCurveTo(x, by - 2.5 + (brows === 'arched' ? -1.5 : 0) + (brows === 'angry' ? 2 : 0), x + s * (erx - .5), by + tilt); c.stroke();
        }
        // nos
        if (race !== 'wraith') {
            c.strokeStyle = shade(skin, .68); c.lineWidth = 1.3; c.lineCap = 'round';
            if (nose === 'flat') { c.fillStyle = shade(skin, .82); E(c, cx, cy + 6, 5.5, 3.2); c.fill(); c.fillStyle = '#1a1a12'; E(c, cx - 2.4, cy + 6.6, 1.4, .9); c.fill(); E(c, cx + 2.4, cy + 6.6, 1.4, .9); c.fill(); }
            else {
                const nw = nose === 'wide' ? 4.2 : nose === 'small' ? 2.4 : 3.2, nl = nose === 'small' ? 5.5 : 7.5, hook = nose === 'hooked' ? 1.5 : 0;
                c.beginPath(); c.moveTo(cx - 1, cy - 1); c.quadraticCurveTo(cx - 2.5 - hook, cy + nl * .5, cx - nw * .7, cy + nl); c.quadraticCurveTo(cx, cy + nl + 2.2, cx + nw, cy + nl - .4); c.stroke();
                c.fillStyle = shade(skin, 1.12); E(c, cx + 1 + hook * .6, cy + 2.5, 1.5, nl * .5); c.fill();                       // svetlo na chrbte nosa
                c.fillStyle = shade(skin, .6); E(c, cx - nw * .45, cy + nl - .2, 1.1, .7); c.fill(); E(c, cx + nw * .55, cy + nl - .4, 1.1, .7); c.fill();   // nozdry
            }
        }
        // ústa
        const my = cy + (race === 'dwarf' ? 14 : 13.5);
        if (race === 'wraith') { c.fillStyle = '#e8d8c8'; c.fillRect(cx - 6, my - 1, 12, 3.2); c.strokeStyle = '#3a1010'; c.lineWidth = .7; c.beginPath(); c.moveTo(cx - 6, my + .6); c.lineTo(cx + 6, my + .6); c.stroke(); }
        else {
            const mw = orcish ? 8 : mouth === 'thin' ? 4.5 : 5.5, curve = mouth === 'smile' ? -2 : mouth === 'stern' ? 1.6 : 0;
            c.strokeStyle = shade(skin, .55); c.lineWidth = 1.3; c.beginPath(); c.moveTo(cx - mw, my + curve * .5); c.quadraticCurveTo(cx, my + 1.2 - curve, cx + mw, my + curve * .5); c.stroke();   // čiara úst
            c.fillStyle = f ? '#b05a58' : shade(skin, .78); c.beginPath(); c.moveTo(cx - mw, my + curve * .5); c.quadraticCurveTo(cx, my + 3.2 - curve * .4, cx + mw, my + curve * .5); c.quadraticCurveTo(cx, my + 1 - curve, cx - mw, my + curve * .5); c.fill();   // spodná pera
            c.fillStyle = 'rgba(255,255,255,.18)'; E(c, cx, my + 1.6 - curve * .3, mw * .45, .7); c.fill();
            if (orcish) { c.fillStyle = '#e8e0c8'; for (const s of [-1, 1]) { P(c, [[cx + s * 6, my + 1], [cx + s * 4.6, my - 4.5], [cx + s * 3, my + 1]]); c.fill(); } }
            if (race === 'hobbit' && mouth === 'smile') { c.fillStyle = '#f4f0ea'; c.fillRect(cx - 3, my - .4, 6, 1.4); }
        }
        // vrásky, jazva, maľovanie, tetovanie
        if (L.age > .4 && race !== 'wraith') { c.strokeStyle = shade(skin, .72); c.lineWidth = .8; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(cx + s * 4, cy + 8); c.quadraticCurveTo(cx + s * 7, cy + 12, cx + s * 8, cy + 17); c.stroke(); c.beginPath(); c.moveTo(cx + s * 12, cy - 1); c.lineTo(cx + s * 15, cy + 1); c.stroke(); } c.beginPath(); c.moveTo(cx - 8, cy - 15); c.quadraticCurveTo(cx, cy - 17, cx + 8, cy - 15); c.stroke(); if (L.age > .7) { c.beginPath(); c.moveTo(cx - 9, cy - 11.5); c.quadraticCurveTo(cx, cy - 13.5, cx + 9, cy - 11.5); c.stroke(); } }
        if (L.age > .6 && race !== 'wraith') { c.strokeStyle = shade(skin, .74); c.lineWidth = .6; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(cx - 9 + k, cy - hh * .52 + k * 2.4); c.quadraticCurveTo(cx, cy - hh * .58 + k * 2.4, cx + 9 - k, cy - hh * .52 + k * 2.4); c.stroke(); } for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(cx + s * 13, cy - 3 + k * 1.6); c.lineTo(cx + s * 16.5, cy - 4 + k * 2.4); c.stroke(); } }   // čelo a vranie pätky
        if (L.scar) { c.strokeStyle = '#8a3a30'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(cx + 10, cy - 12); c.lineTo(cx + 6, cy + 10); c.stroke(); c.strokeStyle = 'rgba(138,58,48,.6)'; c.lineWidth = .7; for (let k = 0; k < 4; k++) { const yy = cy - 8 + k * 5, xx = cx + 9.3 - k * .9; c.beginPath(); c.moveTo(xx - 2, yy); c.lineTo(xx + 2, yy + .4); c.stroke(); } }
        if (L.paint) { c.fillStyle = 'rgba(240,240,240,.9)'; E(c, cx, cy + 2, 5, 7); c.fill(); for (let k = -2; k <= 2; k++) c.fillRect(cx + k * 2.4 - .8, cy - 16, 1.6, 10); }
        if (L.warpaint) { c.fillStyle = L.warpaint === true ? 'rgba(200,40,30,.8)' : L.warpaint; for (const s of [-1, 1]) { c.fillRect(cx + s * 9 - 3, cy + 2, 6, 1.6); c.fillRect(cx + s * 9 - 3, cy + 5, 6, 1.6); } }
        if (L.tattoo) { c.strokeStyle = 'rgba(30,50,90,.75)'; c.lineWidth = 1; c.beginPath(); c.moveTo(cx - 16, cy - 6); c.quadraticCurveTo(cx - 10, cy - 14, cx - 4, cy - 18); c.moveTo(cx - 16, cy); c.lineTo(cx - 10, cy - 10); c.stroke(); }
        if (L.eyepatch) { c.fillStyle = '#1a1210'; E(c, cx + ex, ey, 5.5, 4.5); c.fill(); c.strokeStyle = '#1a1210'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(cx + ex - 5, ey - 3); c.lineTo(cx - hw, cy - 12); c.moveTo(cx + ex + 5, ey - 2); c.lineTo(cx + hw, cy - 10); c.stroke(); }
        // brada a fúzy s textúrou
        const beard = L.beard || 'none';
        const beardTex = (poly, col) => {
            const ys = poly.map(p => p[1]), xs = poly.map(p => p[0]), y0 = Math.min(...ys), y1 = Math.max(...ys), x0 = Math.min(...xs), x1 = Math.max(...xs);
            const bg = c.createLinearGradient(0, y0, 0, y1); bg.addColorStop(0, shade(col, .7)); bg.addColorStop(.35, col); bg.addColorStop(1, shade(col, 1.15));
            c.fillStyle = bg; P(c, poly); c.fill(); c.save(); P(c, poly); c.clip(); c.lineCap = 'round';
            for (let k = 0; k < 44; k++) { const xx = x0 + (k + seed(k + 90)) * (x1 - x0) / 44; c.strokeStyle = grey(k, k % 3 ? shade(col, .55 + seed(k + 30) * .4) : shade(col, 1.3 + seed(k) * .3)); c.lineWidth = .5 + seed(k + 11) * .6; c.beginPath(); c.moveTo(xx, y0 - 1); c.quadraticCurveTo(xx + (seed(k + 13) - .5) * 5, (y0 + y1) / 2, xx + (xx - cx) * .12 + (seed(k + 17) - .5) * 3, y1 + 2); c.stroke(); }
            c.fillStyle = 'rgba(0,0,0,.18)'; E(c, cx, y0 + 2, (x1 - x0) * .35, 2.5); c.fill(); c.restore();
            c.strokeStyle = shade(col, .85); c.lineWidth = .6; for (let k = 0; k < 9; k++) { const xx = cx + (k - 4) * (x1 - x0) / 12 * .8, yb = y1 - Math.abs(k - 4) * (y1 - y0) * .05; c.beginPath(); c.moveTo(xx, yb - 3); c.lineTo(xx + (seed(k + 70) - .5) * 2, yb + 1.5 + seed(k + 71) * 2); c.stroke(); }   // rozstrapkané končeky
        };
        if (race !== 'wraith' && beard !== 'none' && !f) {
            if (beard === 'stubble') { c.fillStyle = 'rgba(40,30,20,.3)'; P(c, [[cx - hw + 3, cy + 6], [cx + hw - 3, cy + 6], [cx + 6, cy + hh + 1], [cx - 6, cy + hh + 1]]); c.fill(); c.fillStyle = 'rgba(30,20,10,.35)'; for (let k = 0; k < 40; k++) { const px = cx - 14 + (k * 7.3) % 28, py = cy + 8 + (k * 5.1) % 18; if (Math.abs(px - cx) < 6 && py < my + 3 && py > my - 3) continue; c.fillRect(px, py, .9, .9); } }
            else if (beard === 'mustache') { c.strokeStyle = hcol; c.lineWidth = 2.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(cx - 1, my - 3); c.quadraticCurveTo(cx - 6, my - 4.5, cx - 10, my); c.moveTo(cx + 1, my - 3); c.quadraticCurveTo(cx + 6, my - 4.5, cx + 10, my); c.stroke(); }
            else if (beard === 'goatee') { beardTex([[cx - 5, my - 1], [cx + 5, my - 1], [cx + 6, cy + hh + 6], [cx - 6, cy + hh + 6]], hcol); c.strokeStyle = hcol; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - 1, my - 3); c.quadraticCurveTo(cx - 6, my - 4.5, cx - 9, my - 1); c.moveTo(cx + 1, my - 3); c.quadraticCurveTo(cx + 6, my - 4.5, cx + 9, my - 1); c.stroke(); }
            else if (beard === 'full') beardTex([[cx - hw + 1, cy + 4], [cx - hw + 5, cy + 20], [cx, cy + hh + 9], [cx + hw - 5, cy + 20], [cx + hw - 1, cy + 4], [cx + hw - 4, cy + 12], [cx + 7, cy + 10], [cx - 7, cy + 10], [cx - hw + 4, cy + 12]], hcol);
            else { beardTex([[cx - hw + 1, cy + 4], [cx - hw + 3, cy + 28], [cx - 9, cy + 47], [cx + 9, cy + 47], [cx + hw - 3, cy + 28], [cx + hw - 1, cy + 4], [cx + hw - 4, cy + 12], [cx + 7, cy + 10], [cx - 7, cy + 10], [cx - hw + 4, cy + 12]], hcol); if (beard === 'braided') { c.strokeStyle = '#d9a441'; c.lineWidth = 1.6; for (const yy of [cy + 33, cy + 41]) { c.beginPath(); c.moveTo(cx - 5, yy); c.lineTo(cx + 5, yy); c.stroke(); } c.fillStyle = '#d9a441'; c.beginPath(); c.arc(cx, cy + 46, 1.6, 0, 7); c.fill(); } }
            if (beard !== 'stubble' && beard !== 'mustache' && beard !== 'goatee') { c.fillStyle = shade(skin, .72); E(c, cx, my, 5, 1.4); c.fill(); }
        }
        // vlasy vpredu s prameňmi a leskom
        if (race !== 'wraith' && !L.hood && !L.helm && !L.turban) {
            const front = (path) => {
                const fg = c.createLinearGradient(0, cy - hh - 6, 0, cy - hh * .3); fg.addColorStop(0, shade(hcol, 1.12)); fg.addColorStop(1, shade(hcol, .78));
                c.fillStyle = fg; path(); c.fill(); c.save(); path(); c.clip(); c.lineCap = 'round';
                for (let k = 0; k < 30; k++) { const xx = cx - hw - 1 + (k + seed(k + 50)) * (hw * 2 + 2) / 30, bend = (xx - cx) * .18; c.strokeStyle = grey(k, k % 4 === 1 ? shade(hcol, 1.35) : shade(hcol, .55 + seed(k + 21) * .45)); c.lineWidth = .45 + seed(k + 33) * .75; c.beginPath(); c.moveTo(cx + (xx - cx) * .3, cy - hh - 7); c.quadraticCurveTo(xx + bend, cy - hh * .85, xx + bend * 1.6 + (seed(k + 8) - .5) * 2, cy - hh * .45 + 3); c.stroke(); }
                c.strokeStyle = 'rgba(255,250,235,.15)'; c.lineWidth = 1.6; c.beginPath(); c.ellipse(cx - 3, cy - hh * .55, hw * .75, hh * .38, -.08, Math.PI * 1.12, Math.PI * 1.62); c.stroke();   // lesk vlasov
                c.restore();
            };
            if (hair === 'short' || hair === 'tied' || hair === 'long' || hair === 'lank' || hair === 'wavy') front(() => { c.beginPath(); c.moveTo(cx - hw - 1, cy - 6); c.quadraticCurveTo(cx - hw, cy - hh - 5, cx, cy - hh - 5); c.quadraticCurveTo(cx + hw, cy - hh - 5, cx + hw + 1, cy - 6); c.quadraticCurveTo(cx + hw * .7, cy - hh * .7, cx + 4, cy - hh * .75); c.quadraticCurveTo(cx - 6, cy - hh * .85, cx - hw * .8, cy - hh * .5); });
            if (hair === 'wavy') { c.fillStyle = hcol; for (let k = 0; k < 5; k++) { E(c, cx - hw - 2 + k * 3, cy + 20 + k * 3, 4, 7); c.fill(); E(c, cx + hw + 2 - k * 3, cy + 20 + k * 3, 4, 7); c.fill(); } }
            if (hair === 'curly') { for (let k = 0; k < 11; k++) { const a = Math.PI + k * Math.PI / 10; c.fillStyle = k % 2 ? shade(hcol, 1.2) : hcol; E(c, cx + Math.cos(a) * (hw - 1), cy - 6 + Math.sin(a) * (hh - 2), 6, 6); c.fill(); } for (let k = 0; k < 4; k++) { c.fillStyle = shade(hcol, .85); E(c, cx - 12 + k * 8, cy - hh + 2, 5, 5); c.fill(); } }
            if (hair === 'braids') { for (const s of [-1, 1]) { c.strokeStyle = hcol; c.lineWidth = 4.5; c.beginPath(); c.moveTo(cx + s * hw, cy); c.lineTo(cx + s * (hw + 2), cy + 42); c.stroke(); c.strokeStyle = shade(hcol, .65); c.lineWidth = 1; for (let y = cy + 4; y < cy + 42; y += 5) { c.beginPath(); c.moveTo(cx + s * (hw - 2), y); c.lineTo(cx + s * (hw + 4), y + 3); c.stroke(); } c.strokeStyle = '#d9a441'; c.lineWidth = 1.2; for (const y of [cy + 14, cy + 30]) { c.beginPath(); c.moveTo(cx + s * (hw - 3), y); c.lineTo(cx + s * (hw + 5), y); c.stroke(); } } front(() => { c.beginPath(); c.moveTo(cx - hw - 1, cy - 6); c.quadraticCurveTo(cx - hw, cy - hh - 5, cx, cy - hh - 5); c.quadraticCurveTo(cx + hw, cy - hh - 5, cx + hw + 1, cy - 6); c.quadraticCurveTo(cx, cy - hh * .6, cx - hw - 1, cy - 6); }); }
            if (hair === 'mohawk') { c.fillStyle = hcol; for (let k = 0; k < 7; k++) { P(c, [[cx - 12 + k * 4, cy - hh + 2], [cx - 10 + k * 4, cy - hh - 14 - Math.abs(3 - k) * -2], [cx - 8 + k * 4, cy - hh + 2]]); c.fill(); } }
            if (hair === 'topknot') { front(() => { c.beginPath(); c.moveTo(cx - hw - 1, cy - 6); c.quadraticCurveTo(cx - hw, cy - hh - 5, cx, cy - hh - 5); c.quadraticCurveTo(cx + hw, cy - hh - 5, cx + hw + 1, cy - 6); c.quadraticCurveTo(cx, cy - hh * .55, cx - hw - 1, cy - 6); }); c.fillStyle = hcol; E(c, cx, cy - hh - 7, 6, 5); c.fill(); c.fillStyle = '#d9a441'; c.fillRect(cx - 6, cy - hh - 4, 12, 1.5); }
            if (hair === 'bald') { c.fillStyle = 'rgba(255,255,255,.14)'; E(c, cx - 6, cy - hh + 7, 6, 3.2, .3); c.fill(); }
            if (hair === 'tied') { c.fillStyle = hcol; E(c, cx, cy - hh - 4, 8, 4.2); c.fill(); c.fillStyle = '#5a3a1a'; c.fillRect(cx - 3, cy - hh - 5.5, 6, 2); }
        }
        // pokrývky hlavy
        if (L.hood) { const hc = L.hood === true ? '#2a2420' : L.hood, hg = c.createLinearGradient(cx - hw, 0, cx + hw, 0); hg.addColorStop(0, shade(hc, 1.2)); hg.addColorStop(1, shade(hc, .6)); c.fillStyle = hg; c.beginPath(); c.moveTo(cx - hw - 8, cy + 30); c.quadraticCurveTo(cx - hw - 10, cy - hh - 14, cx, cy - hh - 16); c.quadraticCurveTo(cx + hw + 10, cy - hh - 14, cx + hw + 8, cy + 30); c.lineTo(cx + hw - 2, cy + 30); c.quadraticCurveTo(cx + hw + 2, cy - hh + 2, cx, cy - hh); c.quadraticCurveTo(cx - hw - 2, cy - hh + 2, cx - hw + 2, cy + 30); c.closePath(); c.fill(); c.fillStyle = 'rgba(0,0,0,.4)'; P(c, [[cx - hw + 2, cy - hh + 2], [cx + hw - 2, cy - hh + 2], [cx + hw - 4, cy - 2], [cx - hw + 4, cy - 2]]); c.fill(); }
        if (L.turban) { const tc = L.turban === true ? '#c84a2a' : L.turban; c.fillStyle = tc; c.beginPath(); c.moveTo(cx - hw - 3, cy - 8); c.quadraticCurveTo(cx - hw - 2, cy - hh - 12, cx, cy - hh - 12); c.quadraticCurveTo(cx + hw + 2, cy - hh - 12, cx + hw + 3, cy - 8); c.lineTo(cx + hw, cy - 4); c.quadraticCurveTo(cx, cy - hh + 2, cx - hw, cy - 4); c.fill(); for (let k = 0; k < 3; k++) { c.strokeStyle = k % 2 ? shade(tc, .7) : shade(tc, 1.2); c.lineWidth = 1.5; c.beginPath(); c.moveTo(cx - hw - 1, cy - 10 - k * 6); c.quadraticCurveTo(cx + (k % 2 ? 10 : -10), cy - hh - 4 - k * 2, cx + hw + 1, cy - 10 - k * 6); c.stroke(); } c.strokeStyle = '#d9a441'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(cx - hw, cy - 12); c.quadraticCurveTo(cx, cy - 20, cx + hw, cy - 12); c.stroke(); c.fillStyle = '#d8402a'; c.beginPath(); c.arc(cx, cy - hh - 2, 2.2, 0, 7); c.fill(); }
        if (L.helm) { const col = typeof L.helm === 'string' ? L.helm : '#8a8c92', hg = c.createLinearGradient(cx - hw, 0, cx + hw, 0); hg.addColorStop(0, shade(col, 1.3)); hg.addColorStop(.5, col); hg.addColorStop(1, shade(col, .6)); c.fillStyle = hg; c.beginPath(); c.moveTo(cx - hw - 2, cy - 2); c.quadraticCurveTo(cx - hw - 2, cy - hh - 8, cx, cy - hh - 8); c.quadraticCurveTo(cx + hw + 2, cy - hh - 8, cx + hw + 2, cy - 2); c.lineTo(cx + hw, cy - 8); c.quadraticCurveTo(cx, cy - hh + 4, cx - hw, cy - 8); c.fill(); c.fillStyle = shade(col, 1.25); c.fillRect(cx - 1.5, cy - hh - 6, 3, 14); c.strokeStyle = shade(col, .5); c.lineWidth = .8; c.beginPath(); c.moveTo(cx - hw, cy - 8); c.quadraticCurveTo(cx, cy - hh + 4, cx + hw, cy - 8); c.stroke(); if (L.wings) { c.fillStyle = '#eef0f4'; for (const s of [-1, 1]) { P(c, [[cx + s * hw, cy - 10], [cx + s * (hw + 16), cy - 26], [cx + s * (hw - 2), cy - 20]]); c.fill(); c.strokeStyle = '#c8ccd4'; c.lineWidth = .6; for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(cx + s * hw, cy - 10 - k * 2.5); c.lineTo(cx + s * (hw + 12 - k * 2), cy - 22 - k * 1.2); c.stroke(); } } } }
        if (L.crown) { c.fillStyle = '#ffd24a'; P(c, [[cx - 16, cy - hh - 2], [cx - 16, cy - hh - 14], [cx - 8, cy - hh - 6], [cx, cy - hh - 17], [cx + 8, cy - hh - 6], [cx + 16, cy - hh - 14], [cx + 16, cy - hh - 2]]); c.fill(); c.fillStyle = '#b08020'; c.fillRect(cx - 16, cy - hh - 4, 32, 2); for (const [px, col] of [[-16, '#3a8ae0'], [0, '#d8402a'], [16, '#3a8ae0']]) { c.fillStyle = col; c.beginPath(); c.arc(cx + px, cy - hh - (px ? 14 : 8), 2, 0, 7); c.fill(); } }
        // svetlo: teplé zľava hore, tieň vpravo dole, jemná vinetácia
        if (race !== 'wraith') {
            c.save(); E(c, cx, cy - 2, hw + 6, hh + 8); c.clip();
            const lg = c.createLinearGradient(cx - hw, cy - hh, cx + hw, cy + hh); lg.addColorStop(0, 'rgba(255,225,180,.14)'); lg.addColorStop(.5, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(20,10,30,.24)');
            c.fillStyle = lg; c.fillRect(0, 0, 96, 96); c.restore();
        }
        const vg = c.createRadialGradient(48, 46, 34, 48, 48, 70); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)'); c.fillStyle = vg; c.fillRect(0, 0, 96, 96);
        // rám
        c.strokeStyle = '#d9a441'; c.lineWidth = 2; c.strokeRect(1, 1, 94, 94);
        c.strokeStyle = 'rgba(255,230,160,.35)'; c.lineWidth = .8; c.strokeRect(4, 4, 88, 88);
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
        const base = { human: { race: 'human', skin: pick([0, 0, 1, 3], 2), hair: pick(['short', 'long', 'tied', 'wavy'], 4), hcol: pick(H, 6), beard: pick(['none', 'stubble', 'full', 'goatee', 'mustache'], 8), age: (h % 7) / 7, eyeShape: pick(['almond', 'round', 'narrow', 'deep'], 12), nose: pick(['straight', 'hooked', 'wide', 'small'], 14), mouth: pick(['neutral', 'stern', 'thin', 'neutral'], 16), brows: pick(['flat', 'thick', 'arched', 'angry'], 18) } };
        let L;
        switch (e.f) {
            case 0: L = { ...base.human, helm: pick([0, '#c8ccd4'], 10), wings: !!pick([0, 1], 11) }; break;
            case 1: L = { ...base.human, hair: 'long', hcol: pick(['#c8a060', '#e8d0a0', '#8a5a30'], 6), beard: pick(['full', 'stubble'], 8) }; break;
            case 2: L = { race: 'orc', hair: pick(['bald', 'mohawk', 'lank'], 4), hcol: '#1a1410', beard: 'none', angry: 1, scar: !!(h % 2), helm: pick([0, '#3a3632'], 10), eyepatch: h % 5 === 0 }; break;
            case 3: L = { race: 'uruk', hair: 'lank', hcol: '#1a1410', beard: 'none', angry: 1, paint: !!(h % 3 === 0) }; break;
            case 4: L = { race: 'dark', hair: 'short', hcol: '#1a1410', beard: pick(['none', 'stubble', 'full'], 8), turban: pick(['#c84a2a', '#d9a441', '#8a2a5a'], 5), earring: !!(h % 2), warpaint: !!(h % 3 === 0) }; break;
            case 5: L = { race: 'dwarf', hair: pick(['long', 'braids', 'bald'], 4), hcol: pick(['#b05a20', '#4a3020', '#8a8a8a', '#c8a060'], 6), beard: pick(['long', 'braided'], 8) }; break;
            case 7: L = { race: 'east', skin: 1, hair: pick(['tied', 'topknot'], 4), hcol: '#1a1410', beard: pick(['none', 'mustache', 'goatee'], 8), helm: pick([0, '#c09030'], 10) }; break;
            case 8: L = { race: 'elf', skin: pick([0, 3], 2), hair: 'long', hcol: pick(['#e8d8a0', '#2a1a10', '#8a7a60'], 6), beard: 'none' }; break;
            case 9: L = { ...base.human, hood: true, scar: !!(h % 2), eyepatch: h % 4 === 0 }; break;
            default: L = { ...base.human };
        }
        if (e.nz) L = { race: 'wraith', hood: '#0a0a10' };
        if (e.kr && e.f !== 2 && e.f !== 3) L.crown = 1;
        L.cloth = ['#2a3a6a', '#3a6a2a', '#2a1010', '#1a1a1a', '#a03020', '#3a4a7a', '#4a3a2a', '#5a1f4a', '#9ab07a', '#4a3a2a'][e.f] || '#4a3a2a';
        L.armor = { 0: 'plate', 1: 'mail', 2: 'mail', 3: 'plate', 5: 'plate', 7: 'plate' }[e.f] || null;
        L.armorCol = { 2: '#4a4842', 3: '#3a3a40', 5: '#a08a60', 7: '#b08a3a' }[e.f];
        if (typeof FC !== 'undefined' && FC[e.f]) L.bg = shade(FC[e.f], .32);
        return L;
    }
    /** Portrét hrdinu z G.look (predvolený, ak chýba). */
    function hero() {
        const L = { race: 'human', sex: 'm', skin: 0, hair: 'short', hcol: '#4a3020', beard: 'stubble', eyes: '#4a6a8a', ...(G && G.look || {}) };
        if (G && G.king) L.crown = 1;
        L.cloth = G && heroSide() === 1 ? '#2a1414' : '#6a2a2a';
        if (G && G.eq && typeof it === 'function') { const av = it('a').v; L.armor = av >= .4 ? 'plate' : av > 0 ? 'mail' : null; L.armorCol = heroSide() === 1 ? '#4a4646' : null; }
        if (G && typeof FC !== 'undefined') L.bg = shade(FC[G.fac] || '#3a2c20', .32);
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
