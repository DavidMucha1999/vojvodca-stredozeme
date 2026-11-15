/*
 * ENGINE: minimapa (HD podklad + živé značky), veľká mapa (klávesa M), popisky pri myši a legenda – metódy UIScene.
 */
Object.assign(UIScene.prototype, {
    // ---------- Minimapa -------------------------------------------------------------
    syncMinimap(scene) {
        if (!this.mmLayer) { this.mmLayer = this.add.container(0, 0).setDepth(8); this.mmG = null; }
        const on = scene === 'map' && !!G && this.textures.exists('minimap') && !this.big;
        this.mmLayer.setVisible(on);
        if (!on) return;
        if (!this.mmImg) {
            this.mmImg = this.add.image(MM.x, MM.y, 'minimap').setOrigin(0).setDisplaySize(MM.w, MM.h);
            this.mmG = this.add.graphics();
            this.mmFrame = this.add.graphics();
            this.mmFrame.fillStyle(0x120e0c, .92).fillRoundedRect(MM.x - 6, MM.y - 6, MM.w + 12, MM.h + 12, 4);
            this.mmFrame.lineStyle(2, UI_C.line, 1).strokeRoundedRect(MM.x - 5, MM.y - 5, MM.w + 10, MM.h + 10, 3);
            this.mmFrame.lineStyle(1, 0x8a6a2a, .75).strokeRoundedRect(MM.x - 1, MM.y - 1, MM.w + 2, MM.h + 2, 2);
            for (const [cx, cy, sx, sy] of [[MM.x - 5, MM.y - 5, 1, 1], [MM.x + MM.w + 5, MM.y - 5, -1, 1], [MM.x - 5, MM.y + MM.h + 5, 1, -1], [MM.x + MM.w + 5, MM.y + MM.h + 5, -1, -1]]) { this.mmFrame.lineStyle(1.3, UI_C.line, .95); this.mmFrame.beginPath(); this.mmFrame.moveTo(cx + sx * 2, cy + sy * 9); this.mmFrame.lineTo(cx + sx * 2, cy + sy * 3); this.mmFrame.lineTo(cx + sx * 6, cy + sy * 2); this.mmFrame.lineTo(cx + sx * 10, cy + sy * 2); this.mmFrame.strokePath(); this.mmFrame.fillStyle(UI_C.line, 1).fillCircle(cx + sx * 5, cy + sy * 5, 1.7); }
            this.mmLayer.add([this.mmFrame, this.mmImg, this.mmG]);
        }
        if (this.mmImg.texture.key !== 'minimap') this.mmImg.setTexture('minimap').setDisplaySize(MM.w, MM.h);
        const g = this.mmG; g.clear();
        const kx = MM.w / WW, ky = MM.h / WH, X = x => MM.x + x * kx, Y = y => MM.y + y * ky;
        // dediny
        for (const v of VL) g.fillStyle(v.st > 0 ? 0x5a2a2a : 0xe8dcc0, .9).fillRect(X(v.x) - .8, Y(v.y) - .8, 1.6, 1.6);
        // miesta
        for (const p of PLACES) g.fillStyle(0xbfe8ff, .9).fillTriangle(X(p.x * K), Y(p.y * K) - 2.2, X(p.x * K) - 2, Y(p.y * K) + 1.4, X(p.x * K) + 2, Y(p.y * K) + 1.4);
        // hrady: farba frakcie s tmavým okrajom, vlastné s bielym rámom, ciele ťaženia s bodkou
        for (const t of TW) { const x = X(t.x), y = Y(t.y); g.fillStyle(0x000000, .7).fillRect(x - 3.2, y - 3.2, 6.4, 6.4); g.fillStyle(hex(FC[t.f]), 1).fillRect(x - 2.4, y - 2.4, 4.8, 4.8); if (t.mine) g.lineStyle(1, 0xffffff, 1).strokeRect(x - 3.6, y - 3.6, 7.2, 7.2); }
        // vojská: nepriateľ červený trojuholník, ostatní bodka vo farbe frakcie; maršali väčší
        for (const e of E) { const x = X(e.x), y = Y(e.y), m = typeof MAR !== 'undefined' && MAR[e.f] === e.id; if (hos(e.f, G.fac)) { g.fillStyle(0xff4030, 1).fillTriangle(x, y - (m ? 3.2 : 2.2), x - (m ? 2.8 : 2), y + (m ? 2 : 1.4), x + (m ? 2.8 : 2), y + (m ? 2 : 1.4)); } else { g.fillStyle(0x000000, .6).fillCircle(x, y, m ? 2.8 : 1.9); g.fillStyle(hex(FC[e.f]), 1).fillCircle(x, y, m ? 2.1 : 1.3); } }
        // zraz vlastnej frakcie
        const mm = G.fac !== 9 ? marshal(G.fac) : null;
        if (mm && mm.mu && TW[mm.mu.t]) { const mp = musterPoint(mm, TW[mm.mu.t]); g.lineStyle(1, 0xffd24a, .9).strokeCircle(X(mp.x), Y(mp.y), 4 + Math.sin(tm / 8) * 1.2); }
        // hrdina a výrez kamery
        g.fillStyle(0xffffff, 1).fillCircle(X(G.x), Y(G.y), 2.2 + Math.sin(tm / 10) * .5); g.lineStyle(1, 0xffd24a, 1).strokeCircle(X(G.x), Y(G.y), 3.6);
        g.lineStyle(1, 0xffffff, .85).strokeRect(X(cam.x), Y(cam.y), W / Z * kx, H / Z * ky);
    },

    // ---------- Veľká mapa (klávesa M) ---------------------------------------------
    syncBigMap(scene) {
        if (this.big && (scene !== 'map' || mode !== 'map' || this.dlg)) this.big = false;
        const sig = this.big ? [1, G.x | 0, G.y | 0, E.length, tm / 30 | 0].join('|') : '';
        if (sig === this.sig.big) return;
        this.sig.big = sig;
        this.bigLayer.removeAll(true);
        if (!this.big) return;
        const mh = H - 76, mw = mh * 1.5, mx = (W - mw) / 2, my = 38, sx = mw / WW, sy = mh / WH;
        const g = this.add.graphics();
        g.fillStyle(0x0a0806, .78).fillRect(0, 0, W, H);
        this.panelFrame(g, mx - 10, my - 30, mw + 20, mh + 46, false);
        const items = [g];
        const shade = this.add.rectangle(mx, my, mw, mh, 0, 0).setOrigin(0).setInteractive({ useHandCursor: true });
        shade.on('pointerup', p => {                              // klik = cieľ cesty
            if (this.drag && this.drag.moved) return;
            const wx = (p.x / RES - mx) / sx, wy = (p.y / RES - my) / sy;
            G.dest = -1; G.vd = -1; G.chase = null; G.talk = null; G.tx = wx; G.ty = wy;
            TW.forEach((t, i) => { if (Math.hypot(t.x - wx, t.y - wy) < 160) { G.tx = t.x; G.ty = t.y; G.dest = i; } });
            G.pd = -1; PLACES.forEach((p, i) => { if (Math.hypot(p.x * K - wx, p.y * K - wy) < 140 && G.dest < 0) { G.tx = p.x * K; G.ty = p.y * K + 10; G.pd = i; } });
            this.big = false;
        });
        const closer = this.add.rectangle(0, 0, W, H, 0, 0).setOrigin(0).setInteractive();
        closer.on('pointerup', () => { this.big = false; });
        items.push(closer, shade);
        if (this.textures.exists('minimap')) items.push(this.add.image(mx, my, 'minimap').setOrigin(0).setDisplaySize(mw, mh));
        const d = this.add.graphics(); items.push(d);
        // cesty
        if (typeof MAPDATA !== 'undefined' && MAPDATA.roads) { d.lineStyle(1.2, 0xc8b080, .55); for (const [a, b] of MAPDATA.roads) { const A = TW[a], B = TW[b]; if (A && B) d.lineBetween(mx + A.x * sx, my + A.y * sy, mx + B.x * sx, my + B.y * sy); } }
        // názvy krajín
        const regions = {}; TW.forEach(t => { (regions[t.f] = regions[t.f] || []).push(t); });
        for (const f in regions) { const ts = regions[f]; if (f == 6 || f == 9) continue; const cx = ts.reduce((a, t) => a + t.x, 0) / ts.length, cy = ts.reduce((a, t) => a + t.y, 0) / ts.length; items.push(this.add.text(mx + cx * sx, my + cy * sy - 22, FN[f].toUpperCase(), txtStyle(15, FC[f], { fontFamily: TITLE_FONT, stroke: '#000', strokeThickness: 3 })).setOrigin(.5).setAlpha(.8)); }
        // dediny
        for (const v of VL) { const x = mx + v.x * sx, y = my + v.y * sy; d.fillStyle(v.st > 0 ? 0x442222 : 0xe8d8b0, 1).fillCircle(x, y, 2.2); items.push(this.add.text(x + 3, y - 4, v.n, txtStyle(6.5, '#d8ccb0', { stroke: '#000', strokeThickness: 2 })).setAlpha(.8)); }
        // zaujímavé miesta
        for (const p of PLACES) { const x = mx + p.x * K * sx, y = my + p.y * K * sy; d.fillStyle(0xbfe8ff, 1).fillTriangle(x, y - 4, x - 3.5, y + 2, x + 3.5, y + 2); items.push(this.add.text(x + 4, y - 7, p.n.split(' (')[0], txtStyle(6.5, '#bfe8ff', { stroke: '#000', strokeThickness: 2 })).setAlpha(.9)); }
        // hrady
        TW.forEach((t, i) => {
            const x = mx + t.x * sx, y = my + t.y * sy, col = hex(FC[t.f]);
            d.fillStyle(0x000000, .6).fillRect(x - 5, y - 5, 10, 10); d.fillStyle(col, 1).fillRect(x - 4, y - 4, 8, 8);
            if (t.mine) { d.lineStyle(1.5, 0xffffff, 1).strokeRect(x - 5.5, y - 5.5, 11, 11); }
            items.push(this.add.text(x, y + 6, t.n, txtStyle(10, hos(t.f, G.fac) ? '#ffb0a0' : '#fff2d8', { fontStyle: 'bold', stroke: '#000', strokeThickness: 3 })).setOrigin(.5, 0));
        });
        // vojská a hrdina
        for (const e of E) { d.fillStyle(hos(e.f, G.fac) ? 0xff4030 : hex(FC[e.f]), 1).fillCircle(mx + e.x * sx, my + e.y * sy, 2.6); d.lineStyle(.8, 0x000000, .8).strokeCircle(mx + e.x * sx, my + e.y * sy, 2.6); }
        const hx = mx + G.x * sx, hy = my + G.y * sy;
        d.fillStyle(0xffffff, 1).fillCircle(hx, hy, 4.5); d.lineStyle(1.5, 0xd9a441, 1).strokeCircle(hx, hy, 6.5 + Math.sin(tm / 10) * 1.5);
        if (G.tx != null && (Math.abs(G.tx - G.x) > 5 || Math.abs(G.ty - G.y) > 5)) { d.lineStyle(1, 0xffffff, .7).lineBetween(hx, hy, mx + G.tx * sx, my + G.ty * sy); d.fillStyle(0xffd24a, 1).fillCircle(mx + G.tx * sx, my + G.ty * sy, 3); }
        items.push(this.add.text(W / 2, my - 18, 'Mapa Stredozeme', txtStyle(16, UI_C.gold, { fontFamily: TITLE_FONT })).setOrigin(.5));
        items.push(this.add.text(W / 2, my + mh + 3, 'Klik na mapu = cieľ cesty  •  M alebo Esc zatvorí  •  biely rám = tvoje hrady, červené názvy = nepriateľ', txtStyle(9, UI_C.dim)).setOrigin(.5, 0));
        this.bigLayer.add(items);
    },

    // ---------- Popisky pri myši na mape -------------------------------------------
    drawTooltip(scene) {
        this.tipLayer.removeAll(true);
        const ms = scene === 'map' && this.scene.get('Map');
        if (!ms || !ms.hover || mode !== 'map' || this.dlg || this.big || !G) return;
        const w = ms.hover, s = ms.hoverScreen;
        let L = null;
        for (const e of E) if (Math.hypot(e.x - w.x, e.y - w.y) < 26) { per(e); L = [e.nm, FN[e.f] + (e.kr ? ', panovník' : '') + (e.nz ? ', prisluhovač Saurona' : ''), 'Vojakov: ' + Math.ceil(e.n), e.f !== 9 && !e.nz ? 'Povaha: ' + TR[e.tr][0] : '', hos(e.f, G.fac) ? 'Nepriateľ – kliknutím zaútočíš' : 'Priateľ – kliknutím sa porozprávaš']; break; }
        if (!L) for (const t of TW) if (Math.hypot(t.x - w.x, t.y - w.y) < 32) { L = [t.n, FN[t.f] + (t.mine ? ' (tvoj hrad)' : ''), 'Posádka: ' + t.g + ', hradby ' + (t.wl || 0), 'Prosperita: úroveň ' + lvl(t) + ' (' + Math.round(t.pr ?? 40) + ' %)', t.lord ? 'Léno: ' + t.lord : 'Kliknutím vstúpiš']; break; }
        if (!L) for (const v of VL) if (Math.hypot(v.x - w.x, v.y - w.y) < 24) { L = [v.n, 'Patrí k hradu ' + TW[v.t].n + ' (' + FN[TW[v.t].f] + ')', 'Prosperita: úroveň ' + lvl(v), v.st > 0 ? 'Vypálená, obnova o ' + v.st + ' dní' : 'Neporušená']; break; }
        if (!L && Math.hypot(G.x - w.x, G.y - w.y) < 24) L = [G.name, rank() + ', ' + FN[G.fac], 'Vojsko: ' + ar(), G.ring === 1 ? 'Nesie Jeden prsteň' : 'Zdravie ' + Math.ceil(G.hp)];
        if (!L) return;
        L = L.filter(Boolean);
        const texts = L.map((l, i) => this.add.text(0, 0, l, txtStyle(i ? 12 : 14, i ? '#2a1c12' : '#7a4a14', { fontFamily: i ? FONT : TITLE_FONT })));
        const tw = Math.max(120, Math.max(...texts.map(t => t.width)) + 22), th = texts.length * 16 + 16;
        let x = s.x + 16, y = s.y + 16;
        if (x + tw > W - 4) x = Math.max(4, s.x - tw - 12);
        if (y + th > H - 4) y = Math.max(50, s.y - th - 12);
        const bg = this.add.graphics();
        this.panelFrame(bg, x, y, tw, th, true);
        bg.lineStyle(1, 0x8a6230, .45).lineBetween(x + 10, y + 22, x + tw - 10, y + 22);
        texts.forEach((t, i) => t.setPosition(x + 10, y + (i ? 8 + i * 16 : 6)));
        this.tipLayer.add([bg, ...texts]);
    },

    // ---------- Legenda mapy ---------------------------------------------------------
    drawLegend(scene) {
        const on = scene === 'map' && LEG && !this.dlg;
        if (on === !!this.sig.leg) return;
        this.sig.leg = on;
        this.legLayer.removeAll(true);
        if (!on) return;
        // malá legenda v ľavom hornom rohu: frakcie v dvoch stĺpcoch, pod nimi značky
        const F = [0, 1, 5, 8, 6, 2, 3, 4, 7, 9], x = 6, y = 54, w = 196, RH = 14, items = [], ts = 10.5;
        const txt = (tx, ty, s, col) => this.add.text(tx, ty, s, txtStyle(ts, col || UI_C.ink));
        items.push(this.add.text(x + 8, y + 4, 'Legenda', txtStyle(13, UI_C.gold, { fontFamily: TITLE_FONT })));
        F.forEach((f, k) => {
            const cx = x + 8 + (k % 2) * 94, cy = y + 24 + Math.floor(k / 2) * RH;
            items.push(Art.image(this, cx + 2, cy - 4, Art.banner(this, f)).setScale((Art.scale['banner_' + f] || 1 / RES) * .42));
            items.push(txt(cx + 14, cy - 1, FN[f]));
        });
        let yy = y + 30 + Math.ceil(F.length / 2) * RH;
        const row = (s, draw) => { const gg = this.add.graphics(); draw(gg, x + 16, yy + 5); items.push(gg, txt(x + 30, yy - 1, s)); yy += RH; };
        items.push(Art.image(this, x + 16, yy + 5, Art.crown(this)).setScale((Art.scale.crown || 1 / RES) * .7), txt(x + 30, yy - 1, 'Panovník frakcie')); yy += RH;
        row('Nazgûl', (g, a, b) => g.fillStyle(0xa00000, .7).fillCircle(a, b, 5));
        row('Silnejší nepriateľ', (g, a, b) => g.lineStyle(1.5, 0xe0442a, 1).strokeEllipse(a, b, 14, 6));
        row('Slabší nepriateľ', (g, a, b) => g.lineStyle(1.5, 0x6fbf5a, 1).strokeEllipse(a, b, 14, 6));
        items.push(txt(x + 8, yy - 1, '★★', '#ffd24a'), txt(x + 30, yy - 1, 'Prosperita hradu')); yy += RH;
        row('Vypálená dedina', (g, a, b) => g.fillStyle(0xff7a22, 1).fillCircle(a, b, 3));
        const bg = this.add.graphics(); this.panelFrame(bg, x, y, w, yy - y + 6, false);
        items.unshift(bg);
        this.legLayer.add(items);
    }
});
