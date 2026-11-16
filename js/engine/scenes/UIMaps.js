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
        const mk = this.miniKey();
        if (!this.mmImg) {
            this.mmImg = this.add.image(MM.x, MM.y, mk).setOrigin(0).setDisplaySize(MM.w, MM.h);
            this.mmG = this.add.graphics();
            this.mmFrame = this.add.graphics();
            this.mmFrame.fillStyle(0x120e0c, .92).fillRoundedRect(MM.x - 6, MM.y - 6, MM.w + 12, MM.h + 12, 4);
            this.mmFrame.lineStyle(2, UI_C.line, 1).strokeRoundedRect(MM.x - 5, MM.y - 5, MM.w + 10, MM.h + 10, 3);
            this.mmFrame.lineStyle(1, 0x8a6a2a, .75).strokeRoundedRect(MM.x - 1, MM.y - 1, MM.w + 2, MM.h + 2, 2);
            for (const [cx, cy, sx, sy] of [[MM.x - 5, MM.y - 5, 1, 1], [MM.x + MM.w + 5, MM.y - 5, -1, 1], [MM.x - 5, MM.y + MM.h + 5, 1, -1], [MM.x + MM.w + 5, MM.y + MM.h + 5, -1, -1]]) { this.mmFrame.lineStyle(1.3, UI_C.line, .95); this.mmFrame.beginPath(); this.mmFrame.moveTo(cx + sx * 2, cy + sy * 9); this.mmFrame.lineTo(cx + sx * 2, cy + sy * 3); this.mmFrame.lineTo(cx + sx * 6, cy + sy * 2); this.mmFrame.lineTo(cx + sx * 10, cy + sy * 2); this.mmFrame.strokePath(); this.mmFrame.fillStyle(UI_C.line, 1).fillCircle(cx + sx * 5, cy + sy * 5, 1.7); }
            this.mmLayer.add([this.mmFrame, this.mmImg, this.mmG]);
        }
        if (this.mmImg.texture.key !== mk) this.mmImg.setTexture(mk).setDisplaySize(MM.w, MM.h);
        const g = this.mmG; g.clear();
        const kx = MM.w / WW, ky = MM.h / WH, X = x => MM.x + x * kx, Y = y => MM.y + y * ky;
        // dediny
        for (const v of VL) g.fillStyle(v.st > 0 ? 0xa04020 : 0x3a2a1a, .85).fillRect(X(v.x) - .8, Y(v.y) - .8, 1.6, 1.6);   // na pergamene tmavé bodky
        // miesta
        for (const p of PLACES) g.fillStyle(0x2a5a7a, .9).fillTriangle(X(p.x * K), Y(p.y * K) - 2.2, X(p.x * K) - 2, Y(p.y * K) + 1.4, X(p.x * K) + 2, Y(p.y * K) + 1.4);
        // hrady: farba frakcie s tmavým okrajom, vlastné s bielym rámom, ciele ťaženia s bodkou
        for (const t of TW) { const x = X(t.x), y = Y(t.y); g.fillStyle(0x000000, .7).fillRect(x - 3.2, y - 3.2, 6.4, 6.4); g.fillStyle(hex(FC[t.f]), 1).fillRect(x - 2.4, y - 2.4, 4.8, 4.8); if (t.mine) g.lineStyle(1, 0xffffff, 1).strokeRect(x - 3.6, y - 3.6, 7.2, 7.2); }
        // vojská: nepriateľ červený trojuholník, ostatní bodka vo farbe frakcie; maršali väčší
        for (const e of E) { const x = X(e.x), y = Y(e.y), m = typeof MAR !== 'undefined' && MAR[e.f] === e.id; if (hos(e.f, G.fac)) { g.fillStyle(0xff4030, 1).fillTriangle(x, y - (m ? 3.2 : 2.2), x - (m ? 2.8 : 2), y + (m ? 2 : 1.4), x + (m ? 2.8 : 2), y + (m ? 2 : 1.4)); } else { g.fillStyle(0x000000, .6).fillCircle(x, y, m ? 2.8 : 1.9); g.fillStyle(hex(FC[e.f]), 1).fillCircle(x, y, m ? 2.1 : 1.3); } }
        // zraz vlastnej frakcie
        const mm = G.fac !== 9 ? marshal(G.fac) : null;
        if (mm && mm.mu && TW[mm.mu.t]) { const mp = musterPoint(mm, TW[mm.mu.t]); g.lineStyle(1, 0xffd24a, .9).strokeCircle(X(mp.x), Y(mp.y), 4 + Math.sin(tm / 8) * 1.2); }
        // hrdina a výrez kamery
        g.fillStyle(0x2a1c10, 1).fillCircle(X(G.x), Y(G.y), 3.4); g.fillStyle(0xffffff, 1).fillCircle(X(G.x), Y(G.y), 2.2 + Math.sin(tm / 10) * .5); g.lineStyle(1.2, 0xd9a441, 1).strokeCircle(X(G.x), Y(G.y), 4.2);
        g.lineStyle(1.4, 0x3a2a1a, .9).strokeRect(X(cam.x), Y(cam.y), W / Z * kx, H / Z * ky); g.lineStyle(.6, 0xfff4d8, .9).strokeRect(X(cam.x) + 1, Y(cam.y) + 1, W / Z * kx - 2, H / Z * ky - 2);   // výrez kamery: tmavý rám s jasnou linkou
    },


    /** Podklad minimapy: zmenšený pergamen veľkej mapy (420 × 280, zmenšený v dvoch krokoch kvôli ostrosti); kým nie je mapa postavená, starý obrázok. */
    miniKey() {
        if (this.textures.exists('atlas_s')) return 'atlas_s';
        const ms = this.scene.get('Map'); if (!ms || !ms.roadLines) return 'minimap';
        this.buildAtlas();
        const src = this.textures.get('atlas').getSourceImage(), mid = document.createElement('canvas'); mid.width = 720; mid.height = 480;
        const m = mid.getContext('2d'); m.imageSmoothingQuality = 'high'; m.drawImage(src, 0, 0, 720, 480);
        const cv = document.createElement('canvas'); cv.width = 420; cv.height = 280; const c = cv.getContext('2d'); c.imageSmoothingQuality = 'high'; c.drawImage(mid, 0, 0, 420, 280);
        this.textures.addCanvas('atlas_s', cv);
        return 'atlas_s';
    },

    // ---------- Pergamenová veľká mapa: podklad sa namaľuje raz do textúry 'atlas' --------------------------
    /** Ručne kreslená mapa na pergamene: tónovaný papier, krajiny jemnou farbou, lesy ako stromčeky, pohoria
     *  šrafované atramentom, Anduin a jazero, cesty prerušovanou čiarou, dvojitý okraj a ružica svetových strán. */
    buildAtlas() {
        if (this.textures.exists('atlas')) return;
        const AW = 1440, AH = 960, k = AW / WW, B = AW / 1800, T = MAPDATA.terrain;
        const cv = document.createElement('canvas'); cv.width = AW; cv.height = AH; const c = cv.getContext('2d');
        let sd = 3; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
        const INK = '#3a2a1a';
        // papier: teplý podklad, škvrny, vlákna, tmavšie okraje
        c.fillStyle = '#dcc79a'; c.fillRect(0, 0, AW, AH);
        for (let i = 0; i < 70; i++) { const x = rnd() * AW, y = rnd() * AH, r = 40 + rnd() * 160, gr = c.createRadialGradient(x, y, 0, x, y, r), dk = rnd() < .55; gr.addColorStop(0, dk ? 'rgba(150,110,60,.10)' : 'rgba(250,240,210,.12)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(x - r, y - r, r * 2, r * 2); }
        c.lineWidth = .6; for (let i = 0; i < 1800; i++) { const x = rnd() * AW, y = rnd() * AH, a = rnd() * 6.28, l = 3 + rnd() * 9; c.strokeStyle = rnd() < .5 ? 'rgba(120,90,50,.10)' : 'rgba(255,250,230,.12)'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
        // krajiny: farba druhu zeme ako jemný akvarel (rozmazaný a zmiešaný s papierom)
        const tc = document.createElement('canvas'); tc.width = T.cols; tc.height = T.rows; const tx = tc.getContext('2d');
        const LC = ['#6f8a48', '#7f8648', '#948a52', '#9a7c52', '#4a3830', '#d0a868', '#f2f2ee', '#5a8aa8'];
        for (let j = 0; j < T.rows; j++) for (let i = 0; i < T.cols; i++) { tx.fillStyle = LC[Math.floor((T.ground[j * T.cols + i] - 1) / 4)] || LC[0]; tx.fillRect(i, j, 1, 1); }
        c.save(); c.globalAlpha = .42; c.filter = 'blur(6px)'; c.imageSmoothingEnabled = true; c.drawImage(tc, 0, 0, AW, AH); c.restore();
        c.save(); c.globalAlpha = .16; c.globalCompositeOperation = 'multiply'; c.filter = 'blur(2px)'; c.drawImage(tc, 0, 0, AW, AH); c.restore();
        // lesy: stromčeky (živé zelené koruny, mŕtve hnedé pahýle)
        const ts = AW / T.cols;
        for (let j = 0; j < T.rows; j++) for (let i = 0; i < T.cols; i++) {
            const f = T.forest[j * T.cols + i]; if (f < 33) continue;
            const dead = f >= 37, n = dead ? 1 : 1 + (rnd() < .5 ? 1 : 0);
            for (let q = 0; q < n; q++) {
                const x = (i + .2 + rnd() * .6) * ts, y = (j + .25 + rnd() * .6) * ts, r = 2.1 + rnd() * 1.2;
                if (dead) { c.strokeStyle = 'rgba(80,60,40,.7)'; c.lineWidth = .8; c.beginPath(); c.moveTo(x, y + r); c.lineTo(x, y - r); c.moveTo(x, y - r * .3); c.lineTo(x + r * .7, y - r); c.moveTo(x, y); c.lineTo(x - r * .7, y - r * .6); c.stroke(); continue; }
                c.strokeStyle = 'rgba(58,42,26,.55)'; c.lineWidth = .7; c.beginPath(); c.moveTo(x, y + r * .4); c.lineTo(x, y + r * 1.4); c.stroke();
                c.fillStyle = rnd() < .5 ? 'rgba(74,104,52,.85)' : 'rgba(92,120,60,.85)'; c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill(); c.stroke();
            }
        }
        // more, jazerá a rieky z geografie (js/data/geo.js): voda akvarelom, pobrežie atramentom s vlnovkami ako na starých mapách
        const B2 = AW / 1800, poly = (P, close) => { c.beginPath(); P.forEach(([px, py], i) => i ? c.lineTo(px * B2, py * B2) : c.moveTo(px * B2, py * B2)); if (close) c.closePath(); };
        c.fillStyle = 'rgba(90,138,168,.62)'; poly(GEO.SEA, true); c.fill();
        c.strokeStyle = INK; c.lineWidth = 1.4; poly(GEO.COAST); c.stroke();
        c.save(); poly(GEO.SEA, true); c.clip(); c.strokeStyle = 'rgba(58,42,26,.32)'; c.lineWidth = .8; for (const d of [6, 12]) { c.save(); c.translate(-d * .7, d * .7); poly(GEO.COAST); c.stroke(); c.restore(); } c.restore();
        for (const L of GEO.LAKES) { c.fillStyle = 'rgba(90,138,168,.75)'; poly(L.poly, true); c.fill(); c.strokeStyle = INK; c.lineWidth = 1.1; c.stroke(); }
        c.lineCap = 'round';
        for (const R of GEO.RIVERS) for (const [w0, col] of [[1.6, INK], [1, '#5a8aa8']]) { c.strokeStyle = col; for (let i = 1; i < R.pts.length; i++) { c.lineWidth = Math.max(1, (R.wd[i] * B2 + 1) * w0); c.beginPath(); c.moveTo(R.pts[i - 1][0] * B2, R.pts[i - 1][1] * B2); c.lineTo(R.pts[i][0] * B2, R.pts[i][1] * B2); c.stroke(); } }
        for (const X of GEO.CROSS) { c.fillStyle = X.k === 'most' ? '#6a4a2a' : '#8a8478'; c.fillRect(X.x * B2 - 3, X.y * B2 - 3, 6, 6); }
        // cesty: prerušovaná atramentová čiara po tých istých oblúkoch ako na mape
        const ms = this.scene.get('Map'), RL = ms && ms.roadLines;
        c.save(); c.setLineDash([5, 4]); c.strokeStyle = 'rgba(110,70,30,.75)'; c.lineWidth = 1.3;
        if (RL) for (const r of RL) { c.beginPath(); r.forEach((p, i) => i ? c.lineTo(p.x * k, p.y * k) : c.moveTo(p.x * k, p.y * k)); c.stroke(); }
        else for (const [a, b] of MAPDATA.roads) { const A = TW[a], Bt = TW[b]; c.beginPath(); c.moveTo(A.x * k, A.y * k); c.lineTo(Bt.x * k, Bt.y * k); c.stroke(); }
        c.restore();
        // pohoria: vrchy zoradené zozadu dopredu, svetlá ľavá strana, šrafovaná tienistá pravá, sneh a sopka
        for (const [x0, y0, size, kind] of [...T.mountains].sort((a, b) => a[1] - b[1])) {
            const x = x0 * B, y = y0 * B, w = size * B * 1.25, h = size * B * (kind === 'doom' ? 1.1 : .95), dk = kind === 'dark' || kind === 'doom';
            for (let q = -1; q <= 1; q++) {
                const px = x + q * w * .55, py = y + (q ? h * .08 : 0), hh = h * (q ? .72 : 1), ww = w * (q ? .7 : 1);
                if (q && kind === 'doom') continue;
                c.fillStyle = dk ? '#7a6a5e' : '#e6d6b0'; c.beginPath(); c.moveTo(px - ww / 2, py); c.lineTo(px, py - hh); c.lineTo(px + ww / 2, py); c.closePath(); c.fill();
                c.fillStyle = dk ? 'rgba(40,28,24,.55)' : 'rgba(120,96,64,.4)'; c.beginPath(); c.moveTo(px, py - hh); c.lineTo(px + ww / 2, py); c.lineTo(px + ww * .08, py); c.closePath(); c.fill();
                c.strokeStyle = 'rgba(58,42,26,.6)'; c.lineWidth = .6; for (let t = .15; t < 1; t += .17) { const ax = px + ww * .5 * t, ay = py - hh * (1 - t); c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax - ww * .12, py); c.stroke(); }   // šrafovanie tieňa
                if (kind === 'snow' || (!dk && hh > 26)) { c.fillStyle = '#fbfaf4'; c.beginPath(); c.moveTo(px, py - hh); c.lineTo(px - ww * .14, py - hh * .72); c.lineTo(px - ww * .03, py - hh * .78); c.lineTo(px + ww * .06, py - hh * .7); c.lineTo(px + ww * .12, py - hh * .76); c.closePath(); c.fill(); }
                c.strokeStyle = INK; c.lineWidth = 1.1; c.beginPath(); c.moveTo(px - ww / 2, py); c.lineTo(px, py - hh); c.lineTo(px + ww / 2, py); c.stroke();
                if (kind === 'doom') { const gr = c.createRadialGradient(px, py - hh, 0, px, py - hh, ww * .5); gr.addColorStop(0, 'rgba(255,90,20,.85)'); gr.addColorStop(1, 'rgba(255,90,20,0)'); c.fillStyle = gr; c.fillRect(px - ww, py - hh - ww * .5, ww * 2, ww); }
            }
        }
        // stmavené okraje papiera, dvojitý rám
        const vg = c.createRadialGradient(AW / 2, AH / 2, AH * .35, AW / 2, AH / 2, AW * .62); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(90,55,20,.38)'); c.fillStyle = vg; c.fillRect(0, 0, AW, AH);
        c.strokeStyle = INK; c.lineWidth = 3; c.strokeRect(8, 8, AW - 16, AH - 16); c.lineWidth = 1; c.strokeRect(15, 15, AW - 30, AH - 30);
        // ružica svetových strán vľavo dole
        const rx = 92, ry = AH - 96, R = 52;
        c.fillStyle = 'rgba(232,218,180,.85)'; c.beginPath(); c.arc(rx, ry, R + 10, 0, 6.283); c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.beginPath(); c.arc(rx, ry, R + 10, 0, 6.283); c.stroke(); c.beginPath(); c.arc(rx, ry, R * .42, 0, 6.283); c.stroke();
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, l = i % 2 ? R * .6 : R, w = i % 2 ? 6 : 9;
            for (const sdn of [-1, 1]) { c.fillStyle = sdn < 0 ? (i === 0 ? '#9a2a1a' : INK) : '#f4ead0'; c.beginPath(); c.moveTo(rx, ry); c.lineTo(rx + Math.cos(a) * l, ry + Math.sin(a) * l); c.lineTo(rx + Math.cos(a + sdn * Math.PI / 2) * w, ry + Math.sin(a + sdn * Math.PI / 2) * w); c.closePath(); c.fill(); c.strokeStyle = INK; c.lineWidth = .7; c.stroke(); } }
        c.fillStyle = INK; c.font = 'bold 15px ' + TITLE_FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
        [['S', 0, -1], ['V', 1, 0], ['J', 0, 1], ['Z', -1, 0]].forEach(([n, dx, dy]) => c.fillText(n, rx + dx * (R + 22), ry + dy * (R + 22)));
        this.textures.addCanvas('atlas', cv);
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
        this.buildAtlas();
        items.push(this.add.image(mx, my, 'atlas').setOrigin(0).setDisplaySize(mw, mh));
        const d = this.add.graphics(); items.push(d);
        // obsadené miesta na mape (obdĺžniky popiskov a značiek): popisok sa posunie, kým sa s ničím neprekrýva
        const used = [], hit = (a) => used.some(b => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y);
        const place = (txt, x, y, offs) => { for (const [ox, oy, ax, ay] of offs) { txt.setOrigin(ax, ay).setPosition(x + ox, y + oy); const b = txt.getBounds(), r = { x: b.x, y: b.y, w: b.width, h: b.height }; if (!hit(r)) { used.push(r); return true; } } return false; };
        TW.forEach(t => used.push({ x: mx + t.x * sx - 6, y: my + t.y * sy - 6, w: 12, h: 12 }));
        // názvy krajín: veľké riedke písmo atramentom vo farbe frakcie, pod všetkým ostatným
        const regions = {}; TW.forEach(t => { (regions[t.f] = regions[t.f] || []).push(t); });
        for (const f in regions) { const ts = regions[f]; if (f == 6 || f == 9 || ts.length < 2) continue; const cx = ts.reduce((a, t) => a + t.x, 0) / ts.length, cy = ts.reduce((a, t) => a + t.y, 0) / ts.length;
            const rt = this.add.text(0, 0, FN[f].toUpperCase().split('').join(' '), txtStyle(19, Phaser.Display.Color.ValueToColor(FC[f]).darken(50).rgba, { fontStyle: 'italic' })).setOrigin(.5).setAlpha(.42), hw = rt.width / 2 + 14;
            items.push(rt.setPosition(Math.max(mx + hw, Math.min(mx + mw - hw, mx + cx * sx)), my + cy * sy)); }   // meno ostane celé vnútri rámu   // riedke písmo atramentom ako na starých mapách (medzery medzi písmenami)
        // dediny: len bodky (mená ukáže popisok pri myši na hlavnej mape)
        for (const v of VL) { const x = mx + v.x * sx, y = my + v.y * sy; d.fillStyle(0x3a2a1a, .8).fillCircle(x, y, 2); d.fillStyle(v.st > 0 ? 0xa04020 : 0xf0e2c0, 1).fillCircle(x, y, 1.3); }
        // hrady: štvorec vo farbe frakcie, tvoje s bielym rámom; mená bez prekrývania (najprv tvoje a väčšie)
        const order = TW.map((t, i) => i).sort((a, b) => (TW[b].mine ? 10 : 0) + lvl(TW[b]) - (TW[a].mine ? 10 : 0) - lvl(TW[a]));
        for (const i of order) {
            const t = TW[i], x = mx + t.x * sx, y = my + t.y * sy, col = hex(FC[t.f]);
            d.fillStyle(0x2a1c10, .85).fillRect(x - 5, y - 5, 10, 10); d.fillStyle(col, 1).fillRect(x - 4, y - 4, 8, 8);
            if (t.mine) { d.lineStyle(1.5, 0xffffff, 1).strokeRect(x - 5.5, y - 5.5, 11, 11); }
            const tt = this.add.text(0, 0, t.n, txtStyle(10, hos(t.f, G.fac) ? '#7a1408' : t.f === G.fac ? '#5a3a00' : '#2a1c10', { fontStyle: 'bold', stroke: '#f0e2c0', strokeThickness: 3 }));
            if (!place(tt, x, y, [[0, 6, .5, 0], [0, -6, .5, 1], [7, 0, 0, .5], [-7, 0, 1, .5], [6, 5, 0, 0], [-6, 5, 1, 0], [6, -5, 0, 1], [-6, -5, 1, 1], [0, 16, .5, 0], [0, -16, .5, 1], [10, 12, 0, 0], [-10, 12, 1, 0]])) tt.setAlpha(.55);   // keď nie je miesto, ostane priesvitný na poslednej pozícii
            items.push(tt);
        }
        // zaujímavé miesta: modrý trojuholník, meno len keď sa zmestí
        for (const p of PLACES) { const x = mx + p.x * K * sx, y = my + p.y * K * sy; d.fillStyle(0x2a5a7a, 1).fillTriangle(x, y - 4, x - 3.5, y + 2, x + 3.5, y + 2); const pt = this.add.text(0, 0, p.n.split(' (')[0], txtStyle(7.5, '#1e4a66', { fontStyle: 'italic', stroke: '#f0e2c0', strokeThickness: 2 })); if (place(pt, x, y, [[5, -2, 0, .5], [-5, -2, 1, .5], [0, 4, .5, 0]])) items.push(pt); else pt.destroy(); }
        // vojská a hrdina
        for (const e of E) { d.fillStyle(hos(e.f, G.fac) ? 0xff4030 : hex(FC[e.f]), 1).fillCircle(mx + e.x * sx, my + e.y * sy, 2.6); d.lineStyle(.8, 0x000000, .8).strokeCircle(mx + e.x * sx, my + e.y * sy, 2.6); }
        const hx = mx + G.x * sx, hy = my + G.y * sy;
        d.fillStyle(0xffffff, 1).fillCircle(hx, hy, 4.5); d.lineStyle(1.5, 0xd9a441, 1).strokeCircle(hx, hy, 6.5 + Math.sin(tm / 10) * 1.5);
        if (G.tx != null && (Math.abs(G.tx - G.x) > 5 || Math.abs(G.ty - G.y) > 5)) { d.lineStyle(1, 0xffffff, .7).lineBetween(hx, hy, mx + G.tx * sx, my + G.ty * sy); d.fillStyle(0xffd24a, 1).fillCircle(mx + G.tx * sx, my + G.ty * sy, 3); }
        items.push(this.add.text(W / 2, my - 18, 'Mapa Stredozeme', txtStyle(16, UI_C.gold, { fontFamily: TITLE_FONT })).setOrigin(.5));
        items.push(this.add.text(W / 2, my + mh + 3, 'Klik na mapu = cieľ cesty  •  M alebo Esc zatvorí  •  biely rám = tvoje hrady, červené názvy = nepriateľ, zlaté = tvoja frakcia', txtStyle(9, UI_C.dim)).setOrigin(.5, 0));
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
        const F = [0, 1, 5, 8, 6, 2, 3, 4, 7, 9], x = 8, y = 56, w = 196, RH = 14, items = [], ts = 10.5;
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
        row('Slabší nepriateľ', (g, a, b) => g.lineStyle(1.5, 0xe0a030, 1).strokeEllipse(a, b, 14, 6));
        row('Tvoji a spojenci', (g, a, b) => g.lineStyle(1.5, 0x5aa0e8, 1).strokeEllipse(a, b, 14, 6));
        row('Neutrálni', (g, a, b) => g.lineStyle(1.5, 0xa8a49a, 1).strokeEllipse(a, b, 14, 6));
        items.push(txt(x + 8, yy - 1, '★★', '#ffd24a'), txt(x + 30, yy - 1, 'Prosperita hradu')); yy += RH;
        row('Vypálená dedina', (g, a, b) => g.fillStyle(0xff7a22, 1).fillCircle(a, b, 3));
        const bg = this.add.graphics(); this.panelFrame(bg, x, y, w, yy - y + 6, false);
        items.unshift(bg);
        this.legLayer.add(items);
    }
});
