/*
 * Vykresľovanie bitky: hrad pri obliehaní, vojaci, efekty výbavy.
 */
function mkCBG() {
    const c = document.createElement('canvas');
    c.width = BW;
    c.height = BH;
    const d = c.getContext('2d');
    d.drawImage(BG, 0, 0);
    d.fillStyle = '#6e675c';
    d.fillRect(1040, 0, BW - 1040, BH);
    d.fillStyle = 'rgba(0,0,0,.12)';
    for (let yy = 0; yy < BH; yy += 24)
        for (let xx = 1040 + (yy / 24 % 2) * 20; xx < BW; xx += 40)
            d.fillRect(xx, yy, 38, 22);
    d.fillStyle = '#8a8478';
    d.fillRect(1000, 0, 40, BH);
    d.fillStyle = '#a49e90';
    for (let yy = 0; yy < BH; yy += 20)
        d.fillRect(994, yy, 10, 12);
    d.fillStyle = 'rgba(0,0,0,.3)';
    d.fillRect(1036, 0, 6, BH);
    [150, 390, 570, 810].forEach(yy => { d.fillStyle = '#7e786c'; d.fillRect(982, yy - 35, 76, 70); d.fillStyle = '#a49e90'; for (let k = 0; k < 4; k++)
        d.fillRect(982 + k * 20, yy - 41, 12, 8); d.fillStyle = '#2a2420'; d.fillRect(1014, yy - 6, 8, 12); });
    d.fillStyle = '#2a2018';
    d.fillRect(1000, 435, 40, 90);
    d.fillStyle = '#7a7266';
    d.fillRect(1250, 360, 140, 200);
    d.fillStyle = '#5a544a';
    d.beginPath();
    d.moveTo(1240, 360);
    d.lineTo(1320, 300);
    d.lineTo(1400, 360);
    d.fill();
    d.fillStyle = '#ffd27a';
    [1280, 1320, 1360].forEach(xx => d.fillRect(xx, 420, 8, 12));
    return c;
}
function drawBattle() {
    {
        ctx.save();
        ctx.translate(-bc.x, -bc.y);
        ctx.drawImage(BG, 0, 0);
        if (BI !== 'g') {
            const C = { a: ['#5a3a30', 'rgba(40,20,15,.35)', 'multiply'], d: ['#d2a860', 'rgba(90,60,20,.18)', 'screen'], s: ['#dfe6f0', 'rgba(170,175,190,.55)', 'screen'] }[BI];
            ctx.globalCompositeOperation = 'color';
            ctx.fillStyle = C[0];
            ctx.fillRect(0, 0, 690, BH);
            ctx.fillRect(750, 0, BW - 750, BH);
            ctx.globalCompositeOperation = C[2];
            ctx.fillStyle = C[1];
            ctx.fillRect(0, 0, 690, BH);
            ctx.fillRect(750, 0, BW - 750, BH);
            ctx.globalCompositeOperation = 'source-over';
        }
        ctx.strokeStyle = 'rgba(255,255,255,.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 18]);
        ctx.lineDashOffset = -tm;
        ctx.beginPath();
        ctx.moveTo(715, 0);
        ctx.lineTo(715, 440);
        ctx.moveTo(715, 520);
        ctx.lineTo(715, BH);
        ctx.stroke();
        ctx.setLineDash([]);
        for (const u of U)
            if (u.hp <= 0) {
                ctx.fillStyle = 'rgba(110,18,18,.35)';
                ctx.beginPath();
                ctx.ellipse(u.x, u.y, u.r * 1.8, u.r * 1.1, 0, 0, 7);
                ctx.fill();
                ctx.fillStyle = u.t ? '#3a3a2a' : '#4a5a48';
                ctx.beginPath();
                ctx.ellipse(u.x, u.y, u.r * 1.1, u.r * .6, u.x, 0, 7);
                ctx.fill();
            }
        U.slice().sort((a, b) => a.y - b.y).forEach(u => {
            if (u.hp > 0)
                drawU(u);
        });
        const h = U[0];
        if (fx > 0) {
            ctx.strokeStyle = 'rgba(236,223,198,' + fx / 10 + ')';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(h.x, h.y, it('w').r || 34, 0, 7);
            ctx.stroke();
        }
        for (const p of PT) {
            ctx.globalAlpha = p.l / 18;
            ctx.fillStyle = p.c;
            ctx.fillRect(p.x, p.y, 3, 3);
        }
        ctx.globalAlpha = 1;
        for (const a of AR) {
            ctx.strokeStyle = '#e8d8b0';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(a.x - a.vx * 3, a.y - a.vy * 3);
            ctx.stroke();
        }
        ctx.restore();
        if (WX.n === 'rain') {
            ctx.strokeStyle = 'rgba(180,200,230,.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let k = 0; k < 120; k++) {
                const x = (k * 89 + tm * 7) % W, y = (k * 61 + tm * 16) % H;
                ctx.moveTo(x, y);
                ctx.lineTo(x - 3, y + 11);
            }
            ctx.stroke();
        }
        if (WX.n === 'snow') {
            ctx.fillStyle = '#fff';
            for (let k = 0; k < 110; k++)
                ctx.fillRect((k * 97 + tm * .9 + Math.sin(tm / 25 + k) * 12) % W, (k * 59 + tm * 1.8) % H, 2, 2);
        }
        if (WX.n === 'fog') {
            ctx.fillStyle = 'rgba(190,200,210,.38)';
            ctx.fillRect(0, 0, W, H);
        }
        ctx.drawImage(VG, 0, 0);
        ctx.fillStyle = 'rgba(0,0,0,.55)';
        ctx.fillRect(W / 2 - 82, 58, 164, 10);
        ctx.fillStyle = '#b8402a';
        ctx.fillRect(W / 2 - 80, 60, 160 * Math.max(0, h.hp) / h.mh, 6);
    }
    if (!SGB)
        return;
    ctx.save();
    ctx.translate(-bc.x, -bc.y);
    if (SGB.lad)
        [250, 710].forEach(l => { ctx.strokeStyle = '#7a5a30'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(985, l - 10); ctx.lineTo(1045, l - 10); ctx.moveTo(985, l + 10); ctx.lineTo(1045, l + 10); ctx.stroke(); ctx.lineWidth = 2; for (let k = 990; k < 1045; k += 9) {
            ctx.beginPath();
            ctx.moveTo(k, l - 10);
            ctx.lineTo(k, l + 10);
            ctx.stroke();
        } });
    if (SGB.gate > 0) {
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(1004, 437, 32, 86);
        ctx.strokeStyle = '#2a1a0a';
        ctx.lineWidth = 2;
        for (let k = 445; k < 520; k += 12) {
            ctx.beginPath();
            ctx.moveTo(1004, k);
            ctx.lineTo(1036, k);
            ctx.stroke();
        }
        ctx.fillStyle = '#9a9a9a';
        ctx.fillRect(1004, 455, 32, 4);
        ctx.fillRect(1004, 500, 32, 4);
    }
    if (SGB.ram && SGB.gate > 0) {
        const o = Math.sin(tm / 6) * 6;
        ctx.fillStyle = '#6b4a2e';
        ctx.fillRect(930 + o, 470, 64, 20);
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(988 + o, 472, 10, 16);
        ctx.fillStyle = '#3a2a1a';
        ctx.beginPath();
        ctx.moveTo(920 + o, 470);
        ctx.lineTo(962 + o, 448);
        ctx.lineTo(1004 + o, 470);
        ctx.fill();
    }
    ctx.restore();
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(W / 2 - 82, 114, 164, 8);
    ctx.fillStyle = '#c08a3a';
    ctx.fillRect(W / 2 - 80, 116, 160 * Math.max(0, SGB.gate) / SGB.mg, 4);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000';
    ctx.strokeText(SGB.gate > 0 ? 'Brána hradu' : 'Brána je zničená!', W / 2, 138);
    ctx.fillStyle = '#ecdfc6';
    ctx.fillText(SGB.gate > 0 ? 'Brána hradu' : 'Brána je zničená!', W / 2, 138);
}
function drawU(u) {
    L_drawU1: {
        {
            const mvv = u.px !== undefined && Math.abs(u.px - u.x) + Math.abs(u.py - u.y) > .05;
            u.px = u.x;
            u.py = u.y;
            const f = u.f, r = u.r, o = !!u.t, x = u.x + (u.c > (u.h ? 14 : 35) ? Math.cos(u.f) * 3 : 0), y = u.y + (mvv ? Math.sin(tm * .5 + u.x) * 1.4 : 0);
            ctx.fillStyle = 'rgba(0,0,0,.3)';
            ctx.beginPath();
            ctx.ellipse(x + 2, y + r * .7, r * 1.2, r * .6, 0, 0, 7);
            ctx.fill();
            if (u.k === 'c' || u.k === 'r') {
                ctx.fillStyle = '#6b4a2e';
                ctx.beginPath();
                ctx.ellipse(x, y, r * 1.7, r * .8, f, 0, 7);
                ctx.fill();
                ctx.beginPath();
                ctx.ellipse(x + Math.cos(f) * r * 1.7, y + Math.sin(f) * r * 1.7, r * .55, r * .35, f, 0, 7);
                ctx.fill();
                ctx.strokeStyle = '#2a1a10';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x - Math.cos(f) * r * 1.7, y - Math.sin(f) * r * 1.7);
                ctx.lineTo(x - Math.cos(f) * r * 2.3, y - Math.sin(f) * r * 2.3 + Math.sin(tm / 4));
                ctx.stroke();
            }
            if (u.h) {
                ctx.fillStyle = '#8a1c1c';
                ctx.beginPath();
                ctx.moveTo(x - Math.cos(f) * r * 2, y - Math.sin(f) * r * 2);
                ctx.lineTo(x + Math.cos(f + 1.57) * r, y + Math.sin(f + 1.57) * r);
                ctx.lineTo(x + Math.cos(f - 1.57) * r, y + Math.sin(f - 1.57) * r);
                ctx.fill();
            }
            ctx.fillStyle = u.h ? '#c9962e' : u.k === 'z' ? '#0a0a0e' : u.k === 't' ? '#6a7a5a' : u.k === 'w' ? '#555' : u.k === 'x' ? '#8a8078' : u.k === 'r' ? '#7a9a5a' : u.k === 'e' ? '#6a9a82' : u.k === 'v' ? '#9a9a8a' : o ? (u.fc >= 0 && u.fc < 10 ? ['#9a8f78', '#4a7a3a', '#5a1a14', '#3a3a44', '#7a5a2a', '#3a5a8a', '#2c2a26', '#5a2a4a', '#8a7a3a', '#6a5a4a'][u.fc] : '#2c2a26') : u.k === 'c' ? '#6f8fa8' : '#5a6b55';
            ctx.beginPath();
            ctx.ellipse(x, y, r * .7, r, f + 1.57, 0, 7);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,.55)';
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,.18)';
            ctx.beginPath();
            ctx.ellipse(x - r * .2, y - r * .3, r * .3, r * .5, f + 1.57, 0, 7);
            ctx.fill();
            ctx.fillStyle = o ? (FC[u.fc] || '#555') : FC[G.fac];
            ctx.globalAlpha = .85;
            ctx.beginPath();
            ctx.ellipse(x, y, r * .28, r * .8, f + 1.57, 0, 7);
            ctx.fill();
            ctx.globalAlpha = 1;
            const sw = u.c > 0 && u.c < (u.h ? 22 : 45) && u.c > (u.h ? 10 : 30) ? .9 : 0, wa = f + sw, wl = u.h ? (it('w').r ? r * 3 : r * 2.2) : (u.k === 'i' ? r * 2.6 : r * 1.8);
            ctx.strokeStyle = o ? '#6a6a6a' : '#cfd6dc';
            ctx.lineWidth = u.h ? 2.5 : 2;
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(wa) * r * .6, y + Math.sin(wa) * r * .6);
            ctx.lineTo(x + Math.cos(wa) * wl, y + Math.sin(wa) * wl);
            ctx.stroke();
            if (!o && (u.h ? G.eq.s > 0 : true)) {
                ctx.fillStyle = u.h ? '#d9a441' : '#8a5a2a';
                ctx.beginPath();
                ctx.arc(x + Math.cos(f - 1.2) * r * .9, y + Math.sin(f - 1.2) * r * .9, r * .45, 0, 7);
                ctx.fill();
            }
            ctx.fillStyle = o && bloc(u.fc) ? '#5f7a4a' : '#e8c9a0';
            ctx.beginPath();
            ctx.arc(x, y, r * .5, 0, 7);
            ctx.fill();
            ctx.fillStyle = o ? '#2a2a2e' : '#aab0b8';
            ctx.beginPath();
            ctx.arc(x, y, r * .56, f + 1.6, f + 4.7);
            ctx.fill();
            if (o && bloc(u.fc)) {
                ctx.strokeStyle = '#d8d0b8';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(x + Math.cos(f + 2) * r * .5, y + Math.sin(f + 2) * r * .5);
                ctx.lineTo(x + Math.cos(f + 2) * r * .95, y + Math.sin(f + 2) * r * .95);
                ctx.moveTo(x + Math.cos(f - 2) * r * .5, y + Math.sin(f - 2) * r * .5);
                ctx.lineTo(x + Math.cos(f - 2) * r * .95, y + Math.sin(f - 2) * r * .95);
                ctx.stroke();
            }
            if (u.k === 'a' || u.k === 'e') {
                ctx.strokeStyle = '#6b4a2e';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(x + Math.cos(f) * r * 1.1, y + Math.sin(f) * r * 1.1, r * 1.1, f - 1.2, f + 1.2);
                ctx.stroke();
            }
            if (u.h || u.bn) {
                const bx = x - Math.cos(f) * r * .8, by = y - Math.sin(f) * r * .8;
                ctx.strokeStyle = '#3a2a1a';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(bx, by);
                ctx.lineTo(bx, by - r * 2.4);
                ctx.stroke();
                ctx.fillStyle = o ? FC[u.fc] || '#555' : FC[G.fac];
                ctx.beginPath();
                ctx.moveTo(bx, by - r * 2.4);
                ctx.lineTo(bx + r * 1.6, by - r * 1.9 + Math.sin(tm / 6) * 2);
                ctx.lineTo(bx, by - r * 1.4);
                ctx.fill();
            }
            if (u.h) {
                ctx.strokeStyle = '#ecdfc6';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(x, y, r * .5, 3.4, 6);
                ctx.stroke();
            }
            if (o && bloc(u.fc)) {
                ctx.fillStyle = '#ff3a2a';
                ctx.fillRect(x + Math.cos(f) * r * .3 - 1, y + Math.sin(f) * r * .3 - 1, 2, 2);
            }
            if (u.hp < u.mh && !u.h) {
                ctx.fillStyle = '#000';
                ctx.fillRect(x - 7, y - r - 6, 14, 3);
                ctx.fillStyle = o ? '#c0392b' : '#6fbf5a';
                ctx.fillRect(x - 7, y - r - 6, 14 * u.hp / u.mh, 3);
            }
        }
        if (u.hp <= 0)
            break L_drawU1;
        const F = FU[u.uk], f = u.f, r = u.r, x = u.x, y = u.y, c = Math.cos(f), s = Math.sin(f);
        if (F) {
            ctx.fillStyle = F.col;
            ctx.beginPath();
            ctx.ellipse(x, y, r * .32, r * .85, f + 1.57, 0, 7);
            ctx.fill();
            ctx.fillStyle = F.hel;
            ctx.beginPath();
            ctx.arc(x, y, r * .5, f + 1.2, f + 5.1);
            ctx.fill();
            const a = f + (u.c > 25 ? .8 : 0), ca = Math.cos(a), sa = Math.sin(a);
            ctx.lineWidth = 2;
            if (F.wp === 'sp') {
                ctx.strokeStyle = '#6a4a2a';
                ctx.beginPath();
                ctx.moveTo(x - ca * r, y - sa * r);
                ctx.lineTo(x + ca * r * 3.2, y + sa * r * 3.2);
                ctx.stroke();
                ctx.fillStyle = '#d8dce0';
                ctx.beginPath();
                ctx.moveTo(x + ca * r * 3.8, y + sa * r * 3.8);
                ctx.lineTo(x + ca * r * 3.1 - sa * 2.5, y + sa * r * 3.1 + ca * 2.5);
                ctx.lineTo(x + ca * r * 3.1 + sa * 2.5, y + sa * r * 3.1 - ca * 2.5);
                ctx.fill();
            }
            else if (F.wp === 'ax') {
                ctx.strokeStyle = '#5a3a1a';
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + ca * r * 2.2, y + sa * r * 2.2);
                ctx.stroke();
                ctx.fillStyle = '#b8bcc4';
                ctx.beginPath();
                ctx.moveTo(x + ca * r * 2.1, y + sa * r * 2.1);
                ctx.arc(x + ca * r * 2.1, y + sa * r * 2.1, r * .7, a - 1.3, a + 1.3);
                ctx.fill();
            }
            else if (F.wp === 'sw') {
                ctx.strokeStyle = '#d0d4d8';
                ctx.beginPath();
                ctx.moveTo(x + ca * r * .6, y + sa * r * .6);
                ctx.lineTo(x + ca * r * 2.5, y + sa * r * 2.5);
                ctx.stroke();
                ctx.strokeStyle = '#8a6a2a';
                ctx.beginPath();
                ctx.moveTo(x + ca * r * .8 - sa * 3, y + sa * r * .8 + ca * 3);
                ctx.lineTo(x + ca * r * .8 + sa * 3, y + sa * r * .8 - ca * 3);
                ctx.stroke();
            }
            else {
                ctx.strokeStyle = '#6b4a2e';
                ctx.beginPath();
                ctx.arc(x + c * r * .9, y + s * r * .9, r * 1.2, f - 1.3, f + 1.3);
                ctx.stroke();
                ctx.strokeStyle = 'rgba(240,240,240,.6)';
                ctx.lineWidth = .8;
                ctx.beginPath();
                ctx.moveTo(x + c * r * .9 + Math.cos(f - 1.3) * r * 1.2, y + s * r * .9 + Math.sin(f - 1.3) * r * 1.2);
                ctx.lineTo(x + c * r * .9 + Math.cos(f + 1.3) * r * 1.2, y + s * r * .9 + Math.sin(f + 1.3) * r * 1.2);
                ctx.stroke();
            }
        }
        const sf = F ? F.f : u.t ? u.fc : G.fac;
        if ((F && F.b === 'i' && F.wp !== 'ax') || (!F && !u.t && ['i', 'v', 'c', 'r'].includes(u.k)) || (!F && u.t && u.k === 'o' && sf >= 0)) {
            const sx = x + Math.cos(f - 1.3) * r * .95, sy = y + Math.sin(f - 1.3) * r * .95, rr = r * .58;
            ctx.fillStyle = BF[sf] || '#444';
            ctx.beginPath();
            ctx.arc(sx, sy, rr, 0, 7);
            ctx.fill();
            ctx.strokeStyle = '#d9a441';
            ctx.lineWidth = 1;
            ctx.stroke();
            if (rr > 3)
                emb(sx, sy, rr * .7, sf);
        }
        if (u.h && G.king)
            crown(x, y - r - 7);
    }
    if (!u.h || u.hp <= 0)
        return;
    const w = it('w'), f = u.f, x = u.x, y = u.y, r = u.r;
    if (w.fx) {
        for (let k = 1; k <= 6; k++) {
            const px = x + Math.cos(f) * r * (.6 + k * .3), py = y + Math.sin(f) * r * (.6 + k * .3);
            if (w.fx === 'fire') {
                ctx.fillStyle = 'rgba(255,' + (120 + Math.random() * 100 | 0) + ',30,' + (.5 + Math.random() * .4) + ')';
                ctx.beginPath();
                ctx.arc(px + (Math.random() - .5) * 3, py - Math.random() * 5, 1.5 + Math.random() * 2.2, 0, 7);
                ctx.fill();
            }
            else {
                ctx.fillStyle = (w.fx === 'dark' ? 'rgba(90,30,120,' : w.fx === 'light' ? 'rgba(255,240,190,' : 'rgba(200,230,255,') + (.35 + .3 * Math.sin(tm / 4 + k)) + ')';
                ctx.beginPath();
                ctx.arc(px, py, 2, 0, 7);
                ctx.fill();
            }
        }
        if (w.fx === 'glow' && Math.random() < .25) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(x + Math.cos(f) * r * 2 + (Math.random() - .5) * 8, y + Math.sin(f) * r * 2 + (Math.random() - .5) * 8, 2, 2);
        }
    }
    if (w.aura) {   // aura najlepšej zbrane (Andúril)
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 16; k++) {
            const a = k * Math.PI / 8 + tm / 30, len = k % 2 ? 26 : 38;
            ctx.strokeStyle = 'rgba(255,236,170,' + (.18 + .1 * Math.sin(tm / 9)) + ')'; ctx.lineWidth = k % 2 ? 1.5 : 2.5;
            ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12); ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.stroke();
        }
        ctx.restore();
    }
    const ag = ['a', 's', 'h', 'm'].filter(k => it(k).fx).length;
    if (ag) {
        ctx.strokeStyle = 'rgba(220,235,255,' + (.25 + .2 * Math.sin(tm / 6)) + ')';
        ctx.lineWidth = 1.5 + ag * .5;
        ctx.beginPath();
        ctx.arc(x, y, r * 1.6 + Math.sin(tm / 5) * 1.5, 0, 7);
        ctx.stroke();
    }
}
