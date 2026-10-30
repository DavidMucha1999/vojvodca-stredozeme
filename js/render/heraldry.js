/*
 * Erby, zástavy a koruna (kreslené na globálne plátno ctx).
 * embBase(x, y, s, f) – erb frakcie f so stredom (x, y) a polomerom s: Gondor biely strom so siedmimi hviezdami,
 * Rohan cválajúci kôň, Mordor ohnivé oko, Isengard biela ruka, Harad had so slnkom, Erebor hora s bránou a žilou zlata,
 * vlastná družina osemcípa hviezda, Rhûn slnečný kotúč s drakom, Lothlórien list mallornu, banditi lebka so sekerami.
 * bnr(x, y, f, w, h) – zástava s látkou, záhybmi, zlatým lemom, strapcami a erbom; vlní sa podľa času tm.
 */
function embBase(x, y, s, f) {
    const C = EC[f], dk = shadeHex(C, .6);
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.fillStyle = ctx.strokeStyle = C;
    ctx.lineWidth = Math.max(1, s * .16);
    if (f === 0) {                                   // biely strom Gondoru: kmeň, zahnuté konáre, koruna z lístia, 7 hviezd a koruna
        ctx.beginPath(); ctx.moveTo(x, y + s); ctx.quadraticCurveTo(x - s * .08, y + s * .2, x, y - s * .55); ctx.stroke();
        for (const d of [-1, 1]) {
            ctx.beginPath(); ctx.moveTo(x, y - s * .1); ctx.quadraticCurveTo(x + d * s * .45, y - s * .3, x + d * s * .75, y - s * .85); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x, y + s * .3); ctx.quadraticCurveTo(x + d * s * .5, y + s * .15, x + d * s * .7, y - s * .25); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x + d * s * .75, y - s * .85); ctx.quadraticCurveTo(x + d * s * .95, y - s * .95, x + d * s * .85, y - s * 1.1); ctx.stroke();
        }
        ctx.lineWidth = Math.max(.6, s * .08);
        for (const [dx, dy] of [[-.55, -.55], [.55, -.55], [-.35, -.9], [.35, -.9], [0, -.75]]) { ctx.beginPath(); ctx.ellipse(x + dx * s, y + dy * s, s * .14, s * .08, dx > 0 ? -.6 : .6, 0, 7); ctx.fill(); }
        for (let i = 0; i < 7; i++) { const a = Math.PI + i * Math.PI / 6, r = s * 1.25; star(x + Math.cos(a) * r, y + s * .15 + Math.sin(a) * r * .9, s * .11, C); }
        ctx.fillStyle = C; ctx.beginPath(); ctx.moveTo(x - s * .22, y - s * 1.3); ctx.lineTo(x - s * .22, y - s * 1.5); ctx.lineTo(x - s * .08, y - s * 1.38); ctx.lineTo(x, y - s * 1.56); ctx.lineTo(x + s * .08, y - s * 1.38); ctx.lineTo(x + s * .22, y - s * 1.5); ctx.lineTo(x + s * .22, y - s * 1.3); ctx.closePath(); ctx.fill();
    }
    else if (f === 1) {                              // kôň Rohanu v cvale: telo, krk, hlava, hriva, chvost, nohy
        ctx.beginPath(); ctx.ellipse(x - s * .05, y + s * .05, s * .6, s * .32, -.1, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + s * .35, y - s * .1); ctx.quadraticCurveTo(x + s * .5, y - s * .6, x + s * .75, y - s * .7); ctx.lineTo(x + s * .95, y - s * .55); ctx.quadraticCurveTo(x + s * .7, y - s * .35, x + s * .6, y + s * .05); ctx.closePath(); ctx.fill();   // krk a hlava
        ctx.beginPath(); ctx.moveTo(x + s * .72, y - s * .72); ctx.lineTo(x + s * .78, y - s * .9); ctx.lineTo(x + s * .84, y - s * .7); ctx.fill();   // ucho
        ctx.lineWidth = Math.max(.8, s * .1);
        for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x + s * (.3 + k * .1), y - s * (.3 + k * .1)); ctx.lineTo(x + s * (.1 + k * .1), y - s * (.55 + k * .08)); ctx.stroke(); }   // hriva
        ctx.beginPath(); ctx.moveTo(x - s * .6, y - s * .05); ctx.quadraticCurveTo(x - s * .95, y - s * .3, x - s * 1.05, y + s * .15); ctx.stroke();   // chvost
        ctx.lineWidth = Math.max(.9, s * .13);
        for (const [sx, ex, ey] of [[.35, .75, .7], [.2, .05, .8], [-.3, -.75, .65], [-.45, -.2, .85]]) { ctx.beginPath(); ctx.moveTo(x + s * sx, y + s * .25); ctx.lineTo(x + s * ex, y + s * ey); ctx.stroke(); }
        ctx.fillStyle = BF[1]; ctx.beginPath(); ctx.arc(x + s * .82, y - s * .6, s * .05, 0, 7); ctx.fill();   // oko
    }
    else if (f === 2) {                              // Oko Saurona: plamenné lúče, ohnivá dúhovka, čierna zrenica
        for (let i = 0; i < 14; i++) { const a = i * Math.PI / 7, r1 = s * .95, r2 = s * (1.25 + (i % 2) * .2); ctx.beginPath(); ctx.moveTo(x + Math.cos(a - .12) * r1, y + Math.sin(a - .12) * r1 * .55); ctx.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2 * .7); ctx.lineTo(x + Math.cos(a + .12) * r1, y + Math.sin(a + .12) * r1 * .55); ctx.closePath(); ctx.fillStyle = i % 2 ? dk : C; ctx.fill(); }
        const g = ctx.createRadialGradient(x, y, s * .1, x, y, s); g.addColorStop(0, '#ffe08a'); g.addColorStop(.5, C); g.addColorStop(1, dk);
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, s * .95, s * .5, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(x, y, s * .13, s * .48, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = Math.max(.6, s * .06); ctx.beginPath(); ctx.ellipse(x, y, s * .95, s * .5, 0, 0, 7); ctx.stroke();
    }
    else if (f === 3) {                              // Biela ruka Sarumana: dlaň, prsty s kĺbmi, palec
        ctx.beginPath(); ctx.ellipse(x, y + s * .35, s * .48, s * .5, 0, 0, 7); ctx.fill();
        for (let i = 0; i < 4; i++) { const fx = x - s * .36 + i * s * .24, h = s * (.85 + (i === 1 || i === 2 ? .15 : 0)); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(fx - s * .09, y - h, s * .18, h + s * .1, s * .09) : ctx.rect(fx - s * .09, y - h, s * .18, h); ctx.fill(); ctx.fillStyle = dk; ctx.fillRect(fx - s * .07, y - h * .55, s * .14, s * .03); ctx.fillStyle = C; }
        ctx.beginPath(); ctx.moveTo(x + s * .35, y + s * .2); ctx.quadraticCurveTo(x + s * .75, y, x + s * .85, y - s * .3); ctx.lineTo(x + s * .7, y - s * .35); ctx.quadraticCurveTo(x + s * .6, y - s * .05, x + s * .35, y + s * .05); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = dk; ctx.lineWidth = Math.max(.5, s * .05); ctx.beginPath(); ctx.moveTo(x - s * .25, y + s * .45); ctx.quadraticCurveTo(x, y + s * .3, x + s * .2, y + s * .55); ctx.stroke();   // čiara dlane
    }
    else if (f === 4) {                              // Had Haradu: zvlnené telo, hlava s okom a jazykom, slnko
        ctx.lineWidth = Math.max(1.2, s * .22); ctx.beginPath();
        for (let i = 0; i <= 16; i++) { const u = i / 16, px = x - s * .9 + u * s * 1.7, py = y + s * .55 - u * s * .9 + Math.sin(u * 9.4) * s * .28; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.stroke();
        ctx.strokeStyle = shadeHex(C, 1.6); ctx.lineWidth = Math.max(.5, s * .06); ctx.beginPath();
        for (let i = 0; i <= 16; i++) { const u = i / 16, px = x - s * .9 + u * s * 1.7, py = y + s * .55 - u * s * .9 + Math.sin(u * 9.4) * s * .28 - s * .05; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.stroke();
        ctx.fillStyle = C; ctx.beginPath(); ctx.ellipse(x + s * .85, y - s * .4, s * .22, s * .16, -.4, 0, 7); ctx.fill();
        ctx.strokeStyle = '#d8302a'; ctx.lineWidth = Math.max(.5, s * .05); ctx.beginPath(); ctx.moveTo(x + s * 1.02, y - s * .5); ctx.lineTo(x + s * 1.2, y - s * .6); ctx.moveTo(x + s * 1.2, y - s * .6); ctx.lineTo(x + s * 1.25, y - s * .52); ctx.stroke();
        ctx.fillStyle = '#f0d060'; ctx.beginPath(); ctx.arc(x + s * .88, y - s * .44, s * .04, 0, 7); ctx.fill();
        ctx.fillStyle = '#f0c040'; ctx.beginPath(); ctx.arc(x - s * .6, y - s * .65, s * .22, 0, 7); ctx.fill();
        ctx.strokeStyle = '#f0c040'; ctx.lineWidth = Math.max(.5, s * .05); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(x - s * .6 + Math.cos(a) * s * .3, y - s * .65 + Math.sin(a) * s * .3); ctx.lineTo(x - s * .6 + Math.cos(a) * s * .42, y - s * .65 + Math.sin(a) * s * .42); ctx.stroke(); }
    }
    else if (f === 5) {                              // Erebor: Osamelá hora so snehom, bránou a žilou zlata, hviezda nad ňou
        ctx.beginPath(); ctx.moveTo(x - s * 1, y + s * .6); ctx.lineTo(x - s * .55, y - s * .1); ctx.lineTo(x - s * .35, y + s * .05); ctx.lineTo(x, y - s * .95); ctx.lineTo(x + s * .35, y + s * .05); ctx.lineTo(x + s * .55, y - s * .1); ctx.lineTo(x + s * 1, y + s * .6); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x, y - s * .95); ctx.lineTo(x + s * .18, y - s * .5); ctx.lineTo(x + s * .06, y - s * .55); ctx.lineTo(x - s * .04, y - s * .42); ctx.lineTo(x - s * .18, y - s * .5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = BF[5]; ctx.beginPath(); ctx.moveTo(x - s * .16, y + s * .6); ctx.lineTo(x - s * .16, y + s * .25); ctx.quadraticCurveTo(x, y + s * .05, x + s * .16, y + s * .25); ctx.lineTo(x + s * .16, y + s * .6); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#ffe070'; ctx.lineWidth = Math.max(.6, s * .07); ctx.beginPath(); ctx.moveTo(x - s * .3, y + s * .55); ctx.lineTo(x - s * .15, y + s * .1); ctx.lineTo(x - s * .4, y - s * .05); ctx.stroke();
        star(x, y - s * 1.25, s * .12, '#ffe070');
    }
    else if (f === 6) {                              // vlastná družina: osemcípa hviezda s jadrom
        ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8 - Math.PI / 2, q = i % 2 ? s * .42 : (i % 4 === 0 ? s * 1 : s * .75); ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } ctx.closePath(); ctx.fill();
        ctx.fillStyle = dk; ctx.beginPath(); ctx.arc(x, y, s * .22, 0, 7); ctx.fill(); ctx.fillStyle = C; ctx.beginPath(); ctx.arc(x, y, s * .1, 0, 7); ctx.fill();
    }
    else if (f === 7) {                              // Rhûn: slnečný kotúč s plameňmi a drakom
        ctx.beginPath(); ctx.arc(x, y, s * .45, 0, 7); ctx.fill();
        for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, r = s * (.95 + (i % 2) * .15); ctx.beginPath(); ctx.moveTo(x + Math.cos(a - .18) * s * .5, y + Math.sin(a - .18) * s * .5); ctx.quadraticCurveTo(x + Math.cos(a + .1) * s * .75, y + Math.sin(a + .1) * s * .75, x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.lineTo(x + Math.cos(a + .18) * s * .5, y + Math.sin(a + .18) * s * .5); ctx.closePath(); ctx.fill(); }
        ctx.strokeStyle = BF[7]; ctx.lineWidth = Math.max(.7, s * .1); ctx.beginPath(); ctx.moveTo(x - s * .3, y + s * .15); ctx.quadraticCurveTo(x - s * .1, y - s * .35, x + s * .15, y - s * .05); ctx.quadraticCurveTo(x + s * .3, y + s * .15, x + s * .32, y - s * .2); ctx.stroke();
        ctx.fillStyle = BF[7]; ctx.beginPath(); ctx.arc(x + s * .32, y - s * .22, s * .07, 0, 7); ctx.fill();
    }
    else if (f === 9) {                              // banditi: lebka a skrížené sekery
        ctx.lineWidth = Math.max(.9, s * .12); ctx.strokeStyle = '#8a7a60';
        for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x - d * s * .8, y + s * .9); ctx.lineTo(x + d * s * .7, y - s * .7); ctx.stroke(); ctx.fillStyle = '#9a9aa0'; ctx.beginPath(); ctx.moveTo(x + d * s * .7, y - s * .7); ctx.lineTo(x + d * s * 1, y - s * .95); ctx.lineTo(x + d * s * 1.05, y - s * .55); ctx.closePath(); ctx.fill(); }
        ctx.fillStyle = C; ctx.beginPath(); ctx.arc(x, y - s * .15, s * .55, 0, 7); ctx.fill(); ctx.fillRect(x - s * .3, y + s * .25, s * .6, s * .35);
        ctx.fillStyle = BF[9]; ctx.beginPath(); ctx.arc(x - s * .22, y - s * .15, s * .14, 0, 7); ctx.arc(x + s * .22, y - s * .15, s * .14, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x, y + s * .05); ctx.lineTo(x - s * .08, y + s * .22); ctx.lineTo(x + s * .08, y + s * .22); ctx.fill();
        for (let k = -1; k <= 1; k++) ctx.fillRect(x + k * s * .14 - s * .03, y + s * .38, s * .06, s * .18);
    }
    else {                                           // Lothlórien: list mallornu so žilkami a striebornou stopkou
        ctx.save(); ctx.translate(x, y); ctx.rotate(.5);
        ctx.beginPath(); ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * .7, -s * .3, s * .1, s * .95); ctx.quadraticCurveTo(-s * .7, -s * .3, 0, -s); ctx.fill();
        ctx.strokeStyle = BF[8]; ctx.lineWidth = Math.max(.5, s * .06); ctx.beginPath(); ctx.moveTo(0, -s * .9); ctx.lineTo(s * .05, s * .8); ctx.stroke();
        for (let k = 0; k < 4; k++) { const yy = -s * .6 + k * s * .35; ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(s * .3, yy + s * .22); ctx.moveTo(0, yy); ctx.lineTo(-s * .3, yy + s * .22); ctx.stroke(); }
        ctx.strokeStyle = '#d8d8e8'; ctx.lineWidth = Math.max(.7, s * .1); ctx.beginPath(); ctx.moveTo(s * .08, s * .9); ctx.lineTo(s * .15, s * 1.25); ctx.stroke();
        ctx.restore();
    }
    ctx.restore();
}
/** Päťcípa hviezda. */
function star(x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * .45 : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } ctx.closePath(); ctx.fill(); }
/** Zosvetlenie/stmavenie farby '#rrggbb'. */
function shadeHex(col, k) { const n = parseInt(col.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v * k))); return '#' + [f(n >> 16 & 255), f(n >> 8 & 255), f(n & 255)].map(v => v.toString(16).padStart(2, '0')).join(''); }

/** Zástava frakcie f: látka so záhybmi a vlnením, zlatý lem, strapce, erb. Horný ľavý roh (x, y), šírka w, výška h. */
function bnr(x, y, f, w = 20, h = 26) {
    const wv = Math.sin(tm / 9 + x * .01) * 2, wv2 = Math.sin(tm / 7 + x * .02 + 1) * 1.2, base = BF[f];
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x + 2, y + 2, w, h - 4);
    const shape = () => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y + wv * .3); ctx.lineTo(x + w + wv * .4, y + h * .55); ctx.lineTo(x + w + wv2 * .5, y + h); ctx.lineTo(x + w / 2 + wv * .4, y + h - h * .22); ctx.lineTo(x + wv2 * .3, y + h); ctx.lineTo(x + wv * .2, y + h * .55); ctx.closePath(); };
    const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, shadeHex(base, .75)); g.addColorStop(.35, shadeHex(base, 1.15)); g.addColorStop(.7, base); g.addColorStop(1, shadeHex(base, .7));
    shape(); ctx.fillStyle = g; ctx.fill();
    ctx.save(); shape(); ctx.clip();                                              // záhyby látky
    for (let k = 1; k < 4; k++) { const fx = x + w * k / 4 + Math.sin(tm / 9 + k) * 1.2; ctx.fillStyle = 'rgba(0,0,0,' + (k % 2 ? .12 : .06) + ')'; ctx.fillRect(fx, y, w * .09, h); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(fx + w * .09, y, w * .05, h); }
    ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fillRect(x, y, w, h * .12);         // lesk pri žrdi
    ctx.restore();
    shape(); ctx.strokeStyle = '#d9a441'; ctx.lineWidth = Math.max(.8, w * .06); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,230,160,.5)'; ctx.lineWidth = Math.max(.4, w * .025); ctx.beginPath(); ctx.moveTo(x + w * .1, y + h * .12); ctx.lineTo(x + w * .9, y + h * .12 + wv * .25); ctx.stroke();   // vnútorný lem
    for (const [tx, ty] of [[x + wv2 * .3, y + h], [x + w / 2 + wv * .4, y + h - h * .22], [x + w + wv2 * .5, y + h]]) { ctx.fillStyle = '#d9a441'; ctx.beginPath(); ctx.arc(tx, ty + 1, w * .06, 0, 7); ctx.fill(); ctx.fillRect(tx - w * .03, ty + 1, w * .06, h * .09); }   // strapce
    emb(x + w / 2 + wv * .2, y + h * .4, w * .3, f);
    ctx.restore();
}
function crown(x, y) {
    ctx.save();
    ctx.fillStyle = '#ffd24a'; ctx.strokeStyle = '#5a3a00'; ctx.lineWidth = 1.2; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x - 9, y + 5); ctx.lineTo(x - 9, y - 3); ctx.lineTo(x - 5, y + 1); ctx.lineTo(x, y - 6); ctx.lineTo(x + 5, y + 1); ctx.lineTo(x + 9, y - 3); ctx.lineTo(x + 9, y + 5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#b08020'; ctx.fillRect(x - 9, y + 3, 18, 2);
    for (const [px, py, col] of [[-9, -3, '#3a8ae0'], [0, -6, '#fff'], [9, -3, '#3a8ae0'], [0, 2, '#c0392b']]) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + px, y + py, px === 0 && py === 2 ? 1.8 : 1.2, 0, 7); ctx.fill(); }
    ctx.restore();
}
function emb(x, y, s, f) {
    if (f === 6 && G && G.ke != null) { const k = G.ke, o = EC[k]; EC[k] = EC[6]; embBase(x, y, s, k); EC[k] = o; return; }
    embBase(x, y, s, f);
}
