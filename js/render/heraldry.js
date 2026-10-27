/*
 * Erby, zástavy a koruna.
 */
function embBase(x, y, s, f) {
    ctx.fillStyle = ctx.strokeStyle = EC[f];
    ctx.lineWidth = Math.max(1, s * .18);
    ctx.beginPath();
    if (f === 0) {
        ctx.moveTo(x, y + s);
        ctx.lineTo(x, y - s * .6);
        ctx.moveTo(x, y - s * .2);
        ctx.lineTo(x - s * .7, y - s * .8);
        ctx.moveTo(x, y - s * .2);
        ctx.lineTo(x + s * .7, y - s * .8);
        ctx.moveTo(x, y + s * .2);
        ctx.lineTo(x - s * .6, y - s * .2);
        ctx.moveTo(x, y + s * .2);
        ctx.lineTo(x + s * .6, y - s * .2);
        ctx.stroke();
        ctx.fillRect(x - s * .75, y - s * 1.1, s * .22, s * .22);
        ctx.fillRect(x - s * .11, y - s * 1.2, s * .22, s * .22);
        ctx.fillRect(x + s * .53, y - s * 1.1, s * .22, s * .22);
    }
    else if (f === 1) {
        ctx.moveTo(x - s * .5, y + s);
        ctx.lineTo(x - s * .3, y - s * .3);
        ctx.lineTo(x + s * .1, y - s);
        ctx.lineTo(x + s * .3, y - s * .6);
        ctx.lineTo(x + s * .8, y - s * .1);
        ctx.lineTo(x + s * .6, y + s * .15);
        ctx.lineTo(x + s * .15, y - s * .15);
        ctx.lineTo(x + s * .3, y + s);
        ctx.closePath();
        ctx.fill();
    }
    else if (f === 2) {
        ctx.ellipse(x, y, s * .95, s * .5, 0, 0, 7);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(x, y, s * .14, s * .48, 0, 0, 7);
        ctx.fill();
    }
    else if (f === 3) {
        ctx.ellipse(x, y + s * .3, s * .45, s * .5, 0, 0, 7);
        ctx.fill();
        for (let i = 0; i < 4; i++)
            ctx.fillRect(x - s * .42 + i * s * .24, y - s * .9, s * .16, s * .9);
        ctx.fillRect(x + s * .35, y - s * .1, s * .4, s * .15);
    }
    else if (f === 4) {
        for (let i = 0; i <= 8; i++)
            ctx.lineTo(x - s * .8 + i * s * .2, y + s * .8 - i * s * .2 + Math.sin(i * 1.6) * s * .3);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x + s * .85, y - s * .85, s * .22, 0, 7);
        ctx.fill();
    }
    else if (f === 5) {
        ctx.moveTo(x - s * .8, y + s * .5);
        ctx.lineTo(x - s * .8, y - s * .4);
        ctx.lineTo(x - s * .4, y);
        ctx.lineTo(x, y - s * .7);
        ctx.lineTo(x + s * .4, y);
        ctx.lineTo(x + s * .8, y - s * .4);
        ctx.lineTo(x + s * .8, y + s * .5);
        ctx.closePath();
        ctx.fill();
    }
    else if (f === 6) {
        for (let i = 0; i < 10; i++) {
            const a = i * Math.PI / 5 - Math.PI / 2, q = i % 2 ? s * .4 : s * .95;
            ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
        }
        ctx.closePath();
        ctx.fill();
    }
    else if (f === 7) {
        ctx.arc(x, y, s * .4, 0, 7);
        ctx.fill();
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const a = i * Math.PI / 4;
            ctx.moveTo(x + Math.cos(a) * s * .55, y + Math.sin(a) * s * .55);
            ctx.lineTo(x + Math.cos(a) * s * .95, y + Math.sin(a) * s * .95);
        }
        ctx.stroke();
    }
    else if (f === 9) {
        ctx.arc(x, y - s * .1, s * .6, 0, 7);
        ctx.fill();
        ctx.fillRect(x - s * .3, y + s * .3, s * .6, s * .4);
        ctx.fillStyle = BF[9];
        ctx.fillRect(x - s * .35, y - s * .25, s * .24, s * .24);
        ctx.fillRect(x + s * .11, y - s * .25, s * .24, s * .24);
    }
    else {
        ctx.ellipse(x, y, s * .4, s * .9, .5, 0, 7);
        ctx.fill();
        ctx.strokeStyle = BF[8];
        ctx.beginPath();
        ctx.moveTo(x - s * .4, y + s * .7);
        ctx.lineTo(x + s * .4, y - s * .7);
        ctx.stroke();
    }
}
function bnr(x, y, f, w = 20, h = 26) { const wv = Math.sin(tm / 9 + x * .01) * 2; ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x + 2, y + 2, w, h - 4); ctx.fillStyle = BF[f]; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y + wv * .3); ctx.lineTo(x + w + wv * .4, y + h); ctx.lineTo(x + w / 2 + wv * .4, y + h - 6); ctx.lineTo(x + wv * .2, y + h); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#d9a441'; ctx.lineWidth = 1.2; ctx.stroke(); emb(x + w / 2 + wv * .2, y + h * .42, w * .32, f); }
function crown(x, y) { ctx.fillStyle = '#ffd24a'; ctx.strokeStyle = '#5a3a00'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - 9, y + 5); ctx.lineTo(x - 9, y - 3); ctx.lineTo(x - 5, y + 1); ctx.lineTo(x, y - 6); ctx.lineTo(x + 5, y + 1); ctx.lineTo(x + 9, y - 3); ctx.lineTo(x + 9, y + 5); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(x, y + 2, 1.6, 0, 7); ctx.fill(); }
function emb(x, y, s, f) { if (f === 6 && G && G.ke != null) {
    const k = G.ke, o = EC[k];
    EC[k] = EC[6];
    embBase(x, y, s, k);
    EC[k] = o;
    return;
} embBase(x, y, s, f); }
