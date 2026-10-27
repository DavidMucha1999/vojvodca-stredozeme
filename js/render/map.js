/*
 * Vykresľovanie mapy: hrady, dediny, armády, popisky, minimapa a legenda.
 */
function label(t, x, y, c) {
    ctx.font = '15px "IM Fell English",Georgia,serif';
    ctx.textAlign = 'center';
    const w = ctx.measureText(t).width + 14;
    ctx.fillStyle = 'rgba(18,14,12,.8)';
    ctx.fillRect(x - w / 2, y - 14, w, 19);
    if (c) {
        ctx.fillStyle = c;
        ctx.fillRect(x - w / 2, y + 3, w, 2);
    }
    ctx.fillStyle = '#ecdfc6';
    ctx.fillText(t, x, y);
}
function rider(x, y, f, flag, body) {
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.ellipse(x, y + 7, 12, 4, 0, 0, 7);
    ctx.fill();
    if (G.eq.m > 0 || body !== '#5a6b55') {
        ctx.fillStyle = body !== '#5a6b55' ? '#2a1a14' : '#6b4a2e';
        ctx.beginPath();
        ctx.ellipse(x, y + 2, 10, 5, Math.cos(f) >= 0 ? .1 : -.1, 0, 7);
        ctx.fill();
    }
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(x, y - 3, 5, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#e8c9a0';
    ctx.beginPath();
    ctx.arc(x, y - 9, 3.5, 0, 7);
    ctx.fill();
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 7, y + 3);
    ctx.lineTo(x + 7, y - 36);
    ctx.stroke();
    bnr(x + 7, y - 36, flag);
}
let LEG = false, MP = { x: 0, y: 0 };
function drawTown(t) {
    const L = lvl(t), i = TW.indexOf(t);
    VL.forEach(v => {
        if (v.t !== i || v.st > 0 || v.x < cam.x - 80 || v.x > cam.x + W / Z + 80 || v.y < cam.y - 80 || v.y > cam.y + H / Z + 80)
            return;
        const n = lvl(v);
        for (let k = 0; k < n - 1; k++) {
            const a = k * 2.1 + 1, dx = Math.cos(a) * (20 + k * 4), dy = Math.sin(a) * 12;
            ctx.fillStyle = '#b09070';
            ctx.fillRect(v.x + dx - 4, v.y + dy - 3, 8, 6);
            ctx.fillStyle = '#8a4a2a';
            ctx.beginPath();
            ctx.moveTo(v.x + dx - 5, v.y + dy - 3);
            ctx.lineTo(v.x + dx, v.y + dy - 8);
            ctx.lineTo(v.x + dx + 5, v.y + dy - 3);
            ctx.fill();
        }
        if (n >= 3) {
            ctx.fillStyle = 'rgba(200,180,80,.35)';
            ctx.fillRect(v.x - 34, v.y + 2, 16, 10);
            ctx.fillRect(v.x + 18, v.y + 2, 16, 10);
        }
        if (n >= 5) {
            ctx.fillStyle = '#d9a441';
            ctx.fillRect(v.x - 1, v.y - 20, 2, 12);
            ctx.beginPath();
            ctx.arc(v.x, v.y - 21, 3, 0, 7);
            ctx.fill();
        }
    });
    if (L >= 2)
        for (let k = 0; k < L * 2; k++) {
            const a = k / (L * 2) * 6.28 + .4, dx = Math.cos(a) * (38 + L * 3), dy = Math.sin(a) * (16 + L * 2) + 6;
            ctx.fillStyle = '#a08868';
            ctx.fillRect(t.x + dx - 4, t.y + dy - 3, 8, 6);
            ctx.fillStyle = t.c;
            ctx.beginPath();
            ctx.moveTo(t.x + dx - 5, t.y + dy - 3);
            ctx.lineTo(t.x + dx, t.y + dy - 8);
            ctx.lineTo(t.x + dx + 5, t.y + dy - 3);
            ctx.fill();
        }
    if (L >= 4) {
        ctx.strokeStyle = '#8a8276';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(t.x, t.y + 4, 30 + L * 2, 14 + L, 0, 0, 7);
        ctx.stroke();
    }
    if (L >= 5) {
        const g = ctx.createRadialGradient(t.x, t.y, 5, t.x, t.y, 70);
        g.addColorStop(0, 'rgba(255,215,90,.35)');
        g.addColorStop(1, 'rgba(255,215,90,0)');
        ctx.fillStyle = g;
        ctx.fillRect(t.x - 70, t.y - 70, 140, 140);
    }
    const s = .85 + L * .08;
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.scale(s, s);
    ctx.translate(-t.x, -t.y);
    drawCastle(t);
    ctx.restore();
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd24a';
    ctx.fillText('★'.repeat(L), t.x - 24, t.y - 36 * s);
}
function legend() {
    const x = 8, y = 56, F = [0, 1, 2, 3, 4, 5, 7, 8, 9, 6], hh = F.length * 21 + 140;
    ctx.fillStyle = 'rgba(18,14,12,.92)';
    ctx.fillRect(x, y, 230, hh);
    ctx.strokeStyle = '#d9a441';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, 230, hh);
    F.forEach((f, k) => { bnr(x + 10, y + 6 + k * 21, f, 13, 17); ctx.font = '13px sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#ecdfc6'; ctx.fillText(FN[f], x + 34, y + 19 + k * 21); });
    let yy = y + 14 + F.length * 21;
    const tx = (s) => { ctx.fillStyle = '#ecdfc6'; ctx.fillText(s, x + 34, yy + 9); yy += 22; };
    crown(x + 18, yy + 4);
    tx('Panovník frakcie');
    ctx.fillStyle = 'rgba(160,0,0,.7)';
    ctx.beginPath();
    ctx.arc(x + 18, yy + 4, 8, 0, 7);
    ctx.fill();
    tx('Nazgûl');
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#e0442a';
    ctx.beginPath();
    ctx.ellipse(x + 18, yy + 4, 9, 4, 0, 0, 7);
    ctx.stroke();
    tx('Silnejší nepriateľ');
    ctx.strokeStyle = '#6fbf5a';
    ctx.beginPath();
    ctx.ellipse(x + 18, yy + 4, 9, 4, 0, 0, 7);
    ctx.stroke();
    tx('Slabší nepriateľ');
    ctx.fillStyle = '#ffd24a';
    ctx.fillText('★★', x + 8, yy + 9);
    tx('Úroveň prosperity hradu');
    ctx.fillStyle = '#ff7a22';
    ctx.beginPath();
    ctx.arc(x + 18, yy + 4, 4, 0, 7);
    ctx.fill();
    tx('Vypálená dedina');
}
function drawCastle(t) {
    const x = t.x, y = t.y, f = t.f, c = FC[f];
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.ellipse(x + 4, y + 14, 34, 10, 0, 0, 7);
    ctx.fill();
    const R = (a, b, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x + a, y + b, w, h); }, T = (a, b, w, h, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x + a, y + b); ctx.lineTo(x + a + w / 2, y + b - h); ctx.lineTo(x + a + w, y + b); ctx.fill(); }, Wn = (a, b) => R(a, b, 2.5, 3.5, f === 2 ? '#ff4a1a' : '#ffd27a');
    if (f === 0) {
        R(-24, -2, 48, 14, '#d8d4c8');
        R(-17, -12, 34, 11, '#e8e4da');
        R(-10, -22, 20, 11, '#f2efe6');
        R(-3, -38, 6, 18, '#f8f6f0');
        T(-4, -38, 8, 10, '#b8c0cc');
        [-12, -4, 4, 12].forEach(a => Wn(a, 4));
        Wn(-6, -8);
        Wn(4, -8);
        R(-26, 10, 52, 2, '#a8a498');
    }
    else if (f === 1) {
        ctx.strokeStyle = '#5a3a1a';
        ctx.lineWidth = 2;
        for (let k = -26; k <= 26; k += 4) {
            ctx.beginPath();
            ctx.moveTo(x + k, y + 12);
            ctx.lineTo(x + k, y + 2);
            ctx.stroke();
        }
        R(-16, -8, 32, 14, '#7a5a30');
        T(-20, -8, 40, 16, '#d9a441');
        R(-3, -2, 6, 8, '#3a2a1a');
        T(-20, -8, 6, 7, '#7aa84a');
        T(14, -8, 6, 7, '#7aa84a');
    }
    else if (f === 2) {
        R(-22, -2, 44, 14, '#2a2222');
        [-20, -6, 8].forEach((a, k) => { R(a, -18 - k * 4, 10, 22 + k * 4, '#1a1414'); T(a - 1, -18 - k * 4, 12, 10, '#0a0808'); Wn(a + 4, -10 - k * 3); });
        ctx.fillStyle = 'rgba(255,80,20,.25)';
        ctx.beginPath();
        ctx.arc(x, y - 20, 16 + Math.sin(tm / 5) * 2, 0, 7);
        ctx.fill();
    }
    else if (f === 3) {
        ctx.strokeStyle = '#2a2a2e';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(x, y + 6, 28, 9, 0, 0, 7);
        ctx.stroke();
        R(-6, -40, 12, 50, '#1a1a1e');
        [-6, -2, 2, 6].forEach(a => T(a - 1.5, -40, 3, 8, '#1a1a1e'));
        Wn(-1, -28);
        Wn(-1, -14);
    }
    else if (f === 4) {
        R(-24, -4, 48, 16, '#c8a070');
        [[-16, 9], [0, 13], [16, 9]].forEach(([a, rr]) => { ctx.fillStyle = a ? '#b8803a' : '#d9a441'; ctx.beginPath(); ctx.arc(x + a, y - 4, rr, Math.PI, 0); ctx.fill(); });
        R(-2, -24, 4, 8, '#c8a070');
        [-14, -2, 10].forEach(a => Wn(a, 3));
    }
    else if (f === 5) {
        ctx.fillStyle = '#6a6a70';
        ctx.beginPath();
        ctx.moveTo(x - 34, y + 12);
        ctx.lineTo(x - 6, y - 34);
        ctx.lineTo(x + 8, y - 22);
        ctx.lineTo(x + 34, y + 12);
        ctx.fill();
        ctx.fillStyle = '#f0f0f4';
        ctx.beginPath();
        ctx.moveTo(x - 6, y - 34);
        ctx.lineTo(x - 12, y - 24);
        ctx.lineTo(x + 2, y - 26);
        ctx.fill();
        R(-8, -6, 16, 18, '#2a2a30');
        ctx.strokeStyle = '#d9a441';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x - 8, y - 6, 16, 18);
        R(-10, -9, 20, 3, '#8a8a90');
    }
    else if (f === 7) {
        R(-22, -2, 44, 14, '#6a3a30');
        [[-12, -6], [12, -6], [0, -16]].forEach(([a, b]) => { R(a - 6, b, 12, 10, '#7a4a40'); ctx.fillStyle = '#5a1f4a'; ctx.beginPath(); ctx.moveTo(x + a - 10, y + b); ctx.quadraticCurveTo(x + a, y + b - 10, x + a + 10, y + b); ctx.fill(); });
        Wn(-2, 0);
    }
    else if (f === 8) {
        R(-3, -30, 6, 42, '#d8d8d0');
        ctx.fillStyle = '#c8b840';
        [[-14, -30, 14], [12, -32, 13], [0, -42, 15], [-4, -22, 11], [10, -20, 10]].forEach(([a, b, rr]) => { ctx.beginPath(); ctx.arc(x + a, y + b, rr, 0, 7); ctx.fill(); });
        ctx.fillStyle = '#e6d56a';
        ctx.beginPath();
        ctx.arc(x, y - 38, 8, 0, 7);
        ctx.fill();
        R(-14, -12, 28, 3, '#e8e4da');
        [[-10, -14], [8, -14], [0, -26]].forEach(([a, b]) => { ctx.fillStyle = 'rgba(255,255,200,' + (.6 + .3 * Math.sin(tm / 8 + a)) + ')'; ctx.beginPath(); ctx.arc(x + a, y + b, 1.8, 0, 7); ctx.fill(); });
    }
    else {
        R(-16, -6, 32, 18, '#7a7266');
        R(-4, 2, 8, 10, '#2a2018');
        [-1, 1].forEach(sd => { R(sd * 14 - 5, -20, 10, 32, '#8a8276'); T(sd * 14 - 7, -20, 14, 12, c); });
        R(-7, -17, 14, 13, '#8f877a');
        T(-9, -17, 18, 10, c);
        Wn(-2, -13);
    }
    ctx.strokeStyle = '#2a2018';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 22, y + 2);
    ctx.lineTo(x + 22, y - 50);
    ctx.stroke();
    bnr(x + 22, y - 50, f, 16, 22);
    label(t.n + '  ⚔' + t.g, x, y + 30, c);
}
function drawMap() {
    {
        {
            ctx.drawImage(MAP, cam.x * 3 / K, cam.y * 3 / K, W / Z * 3 / K, H / Z * 3 / K, 0, 0, W, H);
            ctx.save();
            ctx.scale(Z, Z);
            ctx.translate(-cam.x, -cam.y);
            for (let i = 0; i < 9; i++) {
                const cx = ((i * 613 + tm * .2 * (1 + i % 3 * .3)) % (WW + 400)) - 200, cy = (i * 397) % WH;
                ctx.fillStyle = 'rgba(0,0,0,.05)';
                ctx.beginPath();
                ctx.ellipse(cx, cy, 150 + i * 12, 70, 0, 0, 7);
                ctx.fill();
            }
            ctx.strokeStyle = 'rgba(255,255,255,.25)';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 24]);
            ctx.lineDashOffset = -tm * .5;
            ctx.beginPath();
            ctx.moveTo(640 * K, 0);
            ctx.bezierCurveTo(600 * K, 300 * K, 820 * K, 420 * K, 780 * K, 640 * K);
            ctx.bezierCurveTo(760 * K, 800 * K, 900 * K, 880 * K, 860 * K, 1200 * K);
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(1190 * K, 322 * K, 90 * K, 45 * K, .2, 0, 7);
            ctx.stroke();
            ctx.setLineDash([]);
            for (const t of TW) {
                ctx.fillStyle = FC[t.f];
                ctx.globalAlpha = .09;
                ctx.beginPath();
                ctx.arc(t.x, t.y, 260, 0, 7);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            for (const v of VL) {
                if (v.x < cam.x - 60 || v.x > cam.x + W / Z + 60 || v.y < cam.y - 60 || v.y > cam.y + H / Z + 60)
                    continue;
                const b = v.st > 0;
                ctx.fillStyle = 'rgba(0,0,0,.25)';
                ctx.beginPath();
                ctx.ellipse(v.x + 2, v.y + 7, 20, 6, 0, 0, 7);
                ctx.fill();
                for (const [dx, dy] of [[-10, 0], [4, -5], [8, 4]]) {
                    ctx.fillStyle = b ? '#2a2420' : VW[TW[v.t].f] || '#a08060';
                    ctx.fillRect(v.x + dx - 4, v.y + dy - 3, 8, 6);
                    ctx.fillStyle = b ? '#1a1410' : VR[TW[v.t].f] || '#7a3a22';
                    ctx.beginPath();
                    ctx.moveTo(v.x + dx - 5, v.y + dy - 3);
                    ctx.lineTo(v.x + dx, v.y + dy - 8);
                    ctx.lineTo(v.x + dx + 5, v.y + dy - 3);
                    ctx.fill();
                }
                if (b) {
                    for (let k = 0; k < 3; k++) {
                        const s = (tm * .5 + k * 20) % 60;
                        ctx.fillStyle = 'rgba(60,50,45,' + (.5 - s / 130) + ')';
                        ctx.beginPath();
                        ctx.arc(v.x + Math.sin(s * .2) * 5, v.y - 8 - s * .6, 4 + s * .1, 0, 7);
                        ctx.fill();
                    }
                    ctx.fillStyle = 'rgba(255,120,30,' + (.5 + .4 * Math.sin(tm / 3)) + ')';
                    ctx.beginPath();
                    ctx.arc(v.x, v.y - 2, 3, 0, 7);
                    ctx.fill();
                }
                ctx.font = '12px "IM Fell English",Georgia,serif';
                ctx.textAlign = 'center';
                const w = ctx.measureText(v.n).width + 8;
                ctx.fillStyle = 'rgba(18,14,12,.6)';
                ctx.fillRect(v.x - w / 2, v.y + 11, w, 14);
                ctx.fillStyle = b ? '#c08070' : FC[TW[v.t].f];
                ctx.fillText(v.n, v.x, v.y + 22);
            }
            for (const t of TW)
                drawTown(t);
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            for (const e of E) {
                ctx.fillStyle = '#1c1210';
                for (const o of [[-9, 3], [9, 3], [0, 6]]) {
                    ctx.beginPath();
                    ctx.arc(e.x + o[0], e.y + o[1], 5, 0, 7);
                    ctx.fill();
                }
                if (e.nz) {
                    ctx.fillStyle = 'rgba(120,0,0,.28)';
                    ctx.beginPath();
                    ctx.arc(e.x, e.y, 26 + Math.sin(tm / 6) * 3, 0, 7);
                    ctx.fill();
                }
                if (e.fo) {
                    ctx.strokeStyle = '#ffd27a';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(e.x - 9, e.y - 36);
                    ctx.lineTo(e.x + 9, e.y - 20);
                    ctx.moveTo(e.x + 9, e.y - 36);
                    ctx.lineTo(e.x - 9, e.y - 20);
                    ctx.stroke();
                }
                if (hos(e.f, G.fac)) {
                    ctx.strokeStyle = e.n > pw() ? '#e0442a' : '#6fbf5a';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.ellipse(e.x, e.y + 8, 17, 7, 0, 0, 7);
                    ctx.stroke();
                }
                rider(e.x, e.y, 0, e.f, '#2c2a26');
                if (e.kr)
                    crown(e.x + 17, e.y - 46);
                {
                    const s = e.nm + ' ' + Math.ceil(e.n), w = ctx.measureText(s).width + 10;
                    ctx.fillStyle = 'rgba(18,14,12,.78)';
                    ctx.fillRect(e.x - w / 2, e.y + 19, w, 15);
                    ctx.fillStyle = hos(e.f, G.fac) ? '#ff8a70' : AL[G.fac][e.f] || e.f === G.fac ? '#9fe08a' : '#ecdfc6';
                    ctx.fillText(s, e.x, e.y + 30);
                }
            }
            if (Math.hypot(G.tx - G.x, G.ty - G.y) > 3) {
                ctx.strokeStyle = 'rgba(236,223,198,.6)';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(G.tx - 5, G.ty - 5, 10, 10);
            }
            if (Math.hypot(G.tx - G.x, G.ty - G.y) > 3)
                for (let k = 1; k < 5; k++) {
                    ctx.fillStyle = 'rgba(200,180,140,' + (.22 - k * .04) + ')';
                    ctx.beginPath();
                    ctx.arc(G.x - Math.cos(G.f || 0) * k * 7, G.y - Math.sin(G.f || 0) * k * 7 + 8, 5 - k * .6, 0, 7);
                    ctx.fill();
                }
            ctx.strokeStyle = 'rgba(217,164,65,.7)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(G.x, G.y + 8, 19, 8, 0, 0, 7);
            ctx.stroke();
            rider(G.x, G.y, G.f || 0, G.fac, '#5a6b55');
            {
                ctx.font = 'bold 12px sans-serif';
                ctx.textAlign = 'center';
                const s = G.name + ' ' + ar(), w = ctx.measureText(s).width + 10;
                ctx.fillStyle = 'rgba(18,14,12,.85)';
                ctx.fillRect(G.x - w / 2, G.y + 38, w, 15);
                ctx.fillStyle = '#ffd24a';
                ctx.fillText(s, G.x, G.y + 49);
            }
            if (G.king)
                crown(G.x + 17, G.y - 46);
            ctx.restore();
            {
                const se = Math.floor(G.day / 10) % 4;
                if (se === 2) {
                    ctx.fillStyle = 'rgba(200,110,30,.13)';
                    ctx.fillRect(0, 0, W, H);
                }
                if (se === 3) {
                    ctx.fillStyle = 'rgba(220,230,255,.2)';
                    ctx.fillRect(0, 0, W, H);
                    ctx.fillStyle = '#fff';
                    for (let k = 0; k < 70; k++)
                        ctx.fillRect((k * 113 + tm * .8 + Math.sin(tm / 30 + k) * 10) % W, (k * 71 + tm * 1.6) % H, 2, 2);
                }
            }
            if (G.day % 5 === 0) {
                ctx.strokeStyle = 'rgba(180,200,230,.35)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                for (let k = 0; k < 90; k++) {
                    const x = (k * 97 + tm * 6) % W, y = (k * 53 + tm * 14) % H;
                    ctx.moveTo(x, y);
                    ctx.lineTo(x - 3, y + 10);
                }
                ctx.stroke();
            }
            ctx.fillStyle = 'rgba(8,14,40,' + (.18 * (.5 - .5 * Math.cos(dayT / 600 * 6.283))) + ')';
            ctx.fillRect(0, 0, W, H);
            ctx.drawImage(VG, 0, 0);
            const mx = W - 186, my = H - 126, k = 180 / WW;
            ctx.fillStyle = '#d9a441';
            ctx.fillRect(mx - 3, my - 3, 186, 126);
            ctx.fillStyle = '#120e0c';
            ctx.fillRect(mx - 1, my - 1, 182, 122);
            ctx.globalAlpha = .85;
            ctx.drawImage(MAP, mx, my, 180, 120);
            ctx.globalAlpha = 1;
            if (MF.t)
                for (const t of TW) {
                    ctx.globalAlpha = .28;
                    ctx.fillStyle = FC[t.f];
                    ctx.beginPath();
                    ctx.arc(mx + t.x * k, my + t.y * k, 9, 0, 7);
                    ctx.fill();
                    ctx.globalAlpha = 1;
                    ctx.fillRect(mx + t.x * k - 2.5, my + t.y * k - 2.5, 5, 5);
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(mx + t.x * k - 2.5, my + t.y * k - 2.5, 5, 5);
                }
            if (MF.e)
                for (const e of E) {
                    ctx.fillStyle = hos(e.f, G.fac) ? '#ff4030' : FC[e.f];
                    ctx.beginPath();
                    ctx.arc(mx + e.x * k, my + e.y * k, 2, 0, 7);
                    ctx.fill();
                }
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(mx + G.x * k, my + G.y * k, 3, 0, 7);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,' + (.5 + .5 * Math.sin(tm / 10)) + ')';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(mx + G.x * k, my + G.y * k, 7, 0, 7);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,.6)';
            ctx.lineWidth = 1;
            ctx.strokeRect(mx + cam.x * k, my + cam.y * k, W / Z * k, H / Z * k);
        }
        if (mode === 'map') {
            const wx = MP.x / Z + cam.x, wy = MP.y / Z + cam.y;
            let L = null;
            for (const e of E)
                if (Math.hypot(e.x - wx, e.y - wy) < 26) {
                    L = [e.nm, FN[e.f] + (e.kr ? ', panovník' : '') + (e.nz ? ', prisluhovač Saurona' : ''), 'Vojakov: ' + Math.ceil(e.n), hos(e.f, G.fac) ? 'Nepriateľ' : 'Priateľ' + (e.rl ? ' (vzťah ' + Math.round(e.rl) + ')' : '')];
                    break;
                }
            if (!L)
                for (const t of TW)
                    if (Math.hypot(t.x - wx, t.y - wy) < 32) {
                        L = [t.n, FN[t.f] + (t.mine ? ' (tvoj hrad)' : ''), 'Posádka: ' + t.g + ', hradby ' + (t.wl || 0), 'Prosperita: úroveň ' + lvl(t) + ' (' + Math.round(t.pr ?? 40) + ' %)', t.lord ? 'Léno: ' + t.lord : 'Kliknutím vstúpiš'];
                        break;
                    }
            if (!L)
                for (const v of VL)
                    if (Math.hypot(v.x - wx, v.y - wy) < 24) {
                        L = [v.n, 'Patrí k hradu ' + TW[v.t].n + ' (' + FN[TW[v.t].f] + ')', 'Prosperita: úroveň ' + lvl(v) + ' (' + Math.round(v.pr ?? 40) + ' %)', v.st > 0 ? 'Vypálená, obnova o ' + v.st + ' dní' : 'Neporušená'];
                        break;
                    }
            if (!L && Math.hypot(G.x - wx, G.y - wy) < 24)
                L = [G.name, rank() + ', ' + FN[G.fac], 'Vojsko: ' + ar(), G.ring === 1 ? 'Nesie Jeden prsteň' : 'Zdravie ' + Math.ceil(G.hp)];
            if (L) {
                ctx.font = '13px sans-serif';
                ctx.textAlign = 'left';
                const w = Math.max(...L.map(s => ctx.measureText(s).width)) + 16, h = L.length * 17 + 8;
                let x = MP.x + 14, y = MP.y + 14;
                if (x + w > W)
                    x = MP.x - w - 10;
                if (y + h > H)
                    y = MP.y - h - 10;
                ctx.fillStyle = 'rgba(18,14,12,.92)';
                ctx.fillRect(x, y, w, h);
                ctx.strokeStyle = '#d9a441';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, w, h);
                L.forEach((s, k) => { ctx.fillStyle = k ? '#ecdfc6' : '#ffd24a'; ctx.fillText(s, x + 8, y + 19 + k * 17); });
            }
        }
        if (LEG)
            legend();
    }
    if (G.camp) {
        const x = (G.x - cam.x) * Z, y = (G.y - cam.y) * Z;
        ctx.fillStyle = '#c8a870';
        ctx.beginPath();
        ctx.moveTo(x - 30, y + 6);
        ctx.lineTo(x - 18, y - 12);
        ctx.lineTo(x - 6, y + 6);
        ctx.fill();
        ctx.fillStyle = '#ff9a3a';
        ctx.beginPath();
        ctx.arc(x + 26, y + 4, 3 + Math.random() * 1.5, 0, 7);
        ctx.fill();
    }
    if (PAUSE && mode === 'map') {
        ctx.font = '15px "IM Fell English",Georgia,serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(18,14,12,.85)';
        ctx.fillRect(W / 2 - 190, H - 70, 380, 24);
        ctx.fillStyle = '#ffd24a';
        ctx.fillText('Pauza: klikni na mapu alebo sa utábor, aby čas plynul', W / 2, H - 53);
    }
}
