/*
 * ENGINE: okná rozhrania v Phaseri (metódy UIScene). Okno sa opisuje v HTML (#ov: nadpis, odsek, tlačidlá a riadky z show/btn/rowHead
 * v js/ui/dom.js) a tu sa prekreslí ako panel s rámom, portrétom, ikonkami, posúvaním a klávesami 1–9/Esc; listy ako pergamen s pečaťou.
 */
Object.assign(UIScene.prototype, {
    // ---------- Okná (zrkadlo #ov) ---------------------------------------------------
    mirrorable() {
        return G && !ov.classList.contains('hide') && !ov.classList.contains('intro') && !ov.classList.contains('encv')
            && !ov.querySelector('input,select,img,.enc,.egrid');
    },

    syncDialog() {
        const m = this.mirrorable();
        ov.classList.toggle('mirror', !!m);
        const sig = m ? ov.innerHTML : '';
        if (sig === this.sig.dlg) return;
        const sameTitle = this.dlg && m && (ov.querySelector('h1') || {}).textContent === this.dlg.title;
        const keepScroll = sameTitle ? this.dlg.scroll : 0;
        this.sig.dlg = sig;
        if (this.dlg) { if (this.dlg.hold) this.dlg.hold.remove(); this.dlg.root.destroy(true); this.dlg.mask && this.dlg.mask.destroy(); this.dlg = null; }
        if (m) this.buildDialog(keepScroll);
        this.sig.bars = null;
    },

    buildDialog(scroll) {
        const PW = 440, IW = PW - 32, root = this.add.container(0, 0).setDepth(40);
        const shade = this.add.rectangle(0, 0, W, H, 0x0c0907, .35).setOrigin(0).setInteractive();
        const h1 = ov.querySelector('h1'), title = h1 ? h1.textContent : '';
        const letter = /^List /.test(title), LC = letter ? { gold: '#6a2a10', ink: '#2e2014', dim: '#6a5a48' } : UI_C;   // list = pergamen s tmavým atramentom
        const bt = ov.querySelector('#bt'), kids = bt ? [...bt.children] : [];
        const nBtn = kids.filter(k => k.tagName === 'BUTTON').length, cols = nBtn > 8 || /^Trh:/.test(title) ? 3 : 2, bw = (IW - (cols - 1) * 6) / cols;
        this.dlgButtons = [];
        // rozloženie obsahu okna (nadpis, text, tlačidlá a riadky) od y = 0
        const layout = list => {
            const items = [];
            let y = 0, col = 0, rowH = 0;
            // portrét (plátno .por) vľavo od nadpisu a prvého odseku
            const por = ov.querySelector('canvas.por'), pk = por && por.dataset.key;
            let px0 = 16, pw0 = IW, py0 = y, pimg = null;
            if (por && pk) { if (!this.textures.exists(pk)) this.textures.addCanvas(pk, por); pimg = this.add.image(16, y, pk).setOrigin(0).setDisplaySize(78, 78); items.push(pimg); px0 = 16 + 86; pw0 = IW - 86; }
            if (title) { const t = this.add.text(pimg ? px0 : PW / 2, y, title, txtStyle(19, LC.gold, { fontFamily: TITLE_FONT, align: pimg ? 'left' : 'center', wordWrap: { width: pw0 } })).setOrigin(pimg ? 0 : .5, 0); items.push(t); y += t.height + 5; }
            ov.querySelectorAll(':scope > p').forEach(p => {
                if (!p.textContent.trim()) return;
                const t = this.add.text(pimg ? px0 : PW / 2, y, p.textContent, txtStyle(letter ? 12.5 : 12, p.style.color ? LC.gold : LC.ink, { fontStyle: letter ? 'italic' : 'normal', align: pimg ? 'left' : 'center', lineSpacing: 2, wordWrap: { width: pw0 } })).setOrigin(pimg ? 0 : .5, 0);
                items.push(t); y += t.height + 6;
            });
            if (pimg) { y = Math.max(y, py0 + 84); px0 = 16; }
            y += 4;
            const flush = () => { if (col) { y += rowH + 5; col = 0; rowH = 0; } };
            list.forEach(k => {
                if (k.tagName === 'BUTTON') {
                    const parts = this.dialogButton(k, 16 + col * (bw + 6), y, bw, () => this.inDialog());
                    items.push(...parts);
                    rowH = Math.max(rowH, parts.h); col++;
                    if (col === cols) flush();
                } else {
                    flush();
                    const ik = this.iconFor(k), ix = ik ? 40 : 0;   // riadok s ikonkou/portrétom vľavo
                    if (ik) items.push(this.add.image(16, y, ik).setOrigin(0).setDisplaySize(34, 34));
                    const t = this.add.text(16 + ix, y, k.textContent, txtStyle(k.dataset.kind === 'gold' ? 12.5 : 11.5, k.dataset.kind === 'gold' ? LC.gold : k.dataset.kind === 'dim' ? LC.dim : LC.ink, { wordWrap: { width: IW - 26 - ix } }));
                    items.push(t); y += Math.max(t.height, ik ? 34 : 0) + 3;
                }
            });
            flush();
            return { items, CH: y };
        };
        const maxH = H - 110;
        let L = layout(kids), foot = [];
        if (L.CH > maxH) {
            // dlhé okno: tlačidlá na odchod (Späť, Zavrieť…) budú vždy viditeľné dole
            let n = kids.length;
            while (n > 0 && kids[n - 1].tagName === 'BUTTON' && UI_EXIT.test(kids[n - 1].textContent.trim())) n--;
            foot = kids.slice(n);
            if (foot.length) { L.items.forEach(o => o.destroy()); this.dlgButtons = []; L = layout(kids.slice(0, n)); }
        }
        const footH = foot.length ? 34 : 0, viewH = Math.min(L.CH, maxH - footH), CH = L.CH;
        const PH = viewH + 34 + footH, px = (W - PW) / 2, py = Math.max(44, (H - PH) / 2);
        const panel = this.add.graphics();
        this.drawFrame(panel, px, py, PW, PH, letter);
        if (letter) this.drawSeal(panel, px + PW - 34, py + 30, title);
        const content = this.add.container(0, 0);
        content.add(L.items);
        content.setPosition(px, py + 20 - scroll);
        root.add([shade, panel, content]);
        if (this.pendingSeal) { root.add(this.pendingSeal); this.pendingSeal = null; }
        const maskG = this.make.graphics({ add: false });
        maskG.fillStyle(0xffffff).fillRect(px, py + 14, PW, viewH + 12);
        const d = this.dlg = { root, content, mask: maskG, px, py, PW, PH, CH, maxH: viewH, scroll: 0, title, vy0: py + 14, vy1: py + 26 + viewH };
        if (foot.length) {
            const fy = py + 26 + viewH + 4, fw = (IW - (foot.length - 1) * 6) / foot.length;
            panel.lineStyle(1, UI_C.line, .4).lineBetween(px + 14, fy - 4, px + PW - 14, fy - 4);
            foot.forEach((k, i) => root.add(this.dialogButton(k, px + 16 + i * (fw + 6), fy, fw, () => true)));
        }
        if (CH > viewH) {
            content.setMask(maskG.createGeometryMask());
            d.bar = this.add.graphics(); root.add(d.bar);
            // šípky na posúvanie (pre myš bez kolieska)
            const arrow = (y, dir) => {
                const r = this.add.rectangle(px + PW - 18, y, 20, 20, UI_C.panel2).setOrigin(.5).setStrokeStyle(1, UI_C.line, .8).setInteractive({ useHandCursor: true });
                const t = this.add.text(px + PW - 18, y, dir < 0 ? '▲' : '▼', txtStyle(11, UI_C.gold)).setOrigin(.5);
                r.on('pointerdown', () => { this.scrollDialog(dir * 60, true); d.hold = this.time.addEvent({ delay: 90, loop: true, startAt: -250, callback: () => this.scrollDialog(dir * 25, true) }); });
                const stop = () => { if (d.hold) { d.hold.remove(); d.hold = null; } };
                r.on('pointerup', stop); r.on('pointerout', stop);
                root.add([r, t]);
            };
            arrow(d.vy0 + 12, -1); arrow(d.vy1 - 12, 1);
            this.scrollDialog(scroll, true, true);
        }
    },

    /** Rám okna s ornamentom podľa strany: dobro elfské úponky a zlato, zlo ostré hroty a červeň. */
    drawFrame(panel, px, py, PW, PH, letter) {
        if (letter) {   // pergamen: roztrhané okraje, zažltnuté rohy, stopy po zložení
            let sd = Math.round(px + py);
            const rnd = () => (sd = sd * 16807 % 2147483647) / 2147483647;
            const pts = [];
            for (let x = px; x < px + PW; x += 10) pts.push([x, py + (rnd() - .5) * 5]);
            for (let y = py; y < py + PH; y += 10) pts.push([px + PW + (rnd() - .5) * 5, y]);
            for (let x = px + PW; x > px; x -= 10) pts.push([x, py + PH + (rnd() - .5) * 5]);
            for (let y = py + PH; y > py; y -= 10) pts.push([px + (rnd() - .5) * 5, y]);
            panel.fillStyle(0x2a1a0c, .5).fillPoints(pts.map(([x, y]) => ({ x: x + 4, y: y + 5 })), true);   // tieň
            panel.fillStyle(0xe6d5a8, 1).fillPoints(pts.map(([x, y]) => ({ x, y })), true);
            panel.fillStyle(0xc8b080, .35); for (let k = 0; k < 40; k++) panel.fillEllipse(px + rnd() * PW, py + rnd() * PH, 10 + rnd() * 40, 4 + rnd() * 12);   // škvrny
            panel.fillStyle(0x8a6a3a, .18); panel.fillRect(px, py, PW, 6); panel.fillRect(px, py + PH - 6, PW, 6); panel.fillRect(px, py, 6, PH); panel.fillRect(px + PW - 6, py, 6, PH);   // tmavšie okraje
            panel.lineStyle(1, 0x8a6a3a, .25).lineBetween(px + 8, py + PH / 3, px + PW - 8, py + PH / 3 + 2).lineBetween(px + 8, py + PH * 2 / 3, px + PW - 8, py + PH * 2 / 3 - 1);   // prehyby
            panel.lineStyle(1.2, 0x6a4a2a, .6).strokePoints(pts.map(([x, y]) => ({ x, y })), true);
            return;
        }
        const evil = G && heroSide() === 1, line = evil ? 0x9a2a1a : UI_C.line, line2 = evil ? 0x5a1a12 : 0x8a6a2a;
        panel.fillStyle(evil ? 0x14100f : UI_C.panel, .97).fillRoundedRect(px, py, PW, PH, 6);
        panel.lineStyle(2, line, 1).strokeRoundedRect(px, py, PW, PH, 6);
        panel.lineStyle(1, line, .35).strokeRoundedRect(px + 5, py + 5, PW - 10, PH - 10, 4);
        // rohy
        for (const [cx, cy, sx, sy] of [[px, py, 1, 1], [px + PW, py, -1, 1], [px, py + PH, 1, -1], [px + PW, py + PH, -1, -1]]) {
            if (evil) { panel.fillStyle(line, 1).fillTriangle(cx, cy, cx + sx * 14, cy, cx, cy + sy * 14); panel.fillStyle(line2, 1).fillTriangle(cx + sx * 4, cy + sy * 4, cx + sx * 10, cy + sy * 4, cx + sx * 4, cy + sy * 10); }
            else { panel.lineStyle(1.5, line, .9); panel.beginPath(); panel.moveTo(cx + sx * 3, cy + sy * 16); panel.lineTo(cx + sx * 3, cy + sy * 6); panel.lineTo(cx + sx * 8, cy + sy * 3); panel.lineTo(cx + sx * 16, cy + sy * 3); panel.strokePath(); panel.fillStyle(line, 1).fillCircle(cx + sx * 9, cy + sy * 9, 2.2); panel.lineStyle(1, line, .6); panel.beginPath(); panel.moveTo(cx + sx * 9, cy + sy * 9); panel.lineTo(cx + sx * 20, cy + sy * 12); panel.strokePath(); panel.beginPath(); panel.moveTo(cx + sx * 9, cy + sy * 9); panel.lineTo(cx + sx * 12, cy + sy * 20); panel.strokePath(); }
        }
        // stredový ornament hore
        const mx = px + PW / 2;
        if (evil) { panel.fillStyle(line, 1).fillTriangle(mx - 6, py + 1, mx, py + 9, mx + 6, py + 1); }
        else { panel.lineStyle(1.2, line, .8); panel.beginPath(); panel.moveTo(mx - 22, py + 1); panel.lineTo(mx - 8, py + 6); panel.lineTo(mx, py + 2); panel.lineTo(mx + 8, py + 6); panel.lineTo(mx + 22, py + 1); panel.strokePath(); }
    },

    /** Vosková pečať listu: červený vosk s erbom frakcie odosielateľa (podľa mena v nadpise), stuha. */
    drawSeal(panel, x, y, title) {
        let f = -1;
        const m = /od (?:maršala |lorda )?([^:,]+)/.exec(title);
        if (m) { const nm = m[1].trim(); const fi = FN.indexOf(nm); if (fi >= 0) f = fi; else { const e = E.find(o => o.nm === nm); if (e) f = e.f; } }
        if (f < 0) f = G ? G.fac : 0;
        panel.fillStyle(0x6a2a1a, 1).fillRect(x - 4, y - 26, 8, 30); panel.fillStyle(0x8a3a24, 1).fillRect(x - 3, y - 26, 3, 30);   // stuha
        panel.fillStyle(0x3a0a06, .6).fillCircle(x + 2, y + 3, 15);
        panel.fillStyle(0xa02018, 1).fillCircle(x, y, 15); panel.fillStyle(0xc03028, 1).fillCircle(x - 2, y - 2, 12); panel.fillStyle(0x8a1810, 1).fillCircle(x, y, 9);
        const key = 'seal_' + f;
        if (!this.textures.exists(key)) { const out = document.createElement('canvas'); out.width = out.height = 64; try { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 64, 64); ctx.translate(32, 32); ctx.scale(1.3, 1.3); if (typeof embBase === 'function') embBase(0, 0, 14, f); ctx.restore(); out.getContext('2d').drawImage(cv, 0, 0, 64, 64, 0, 0, 64, 64); } catch (e) { } this.textures.addCanvas(key, out); }
        const im = this.add.image(x, y, key).setDisplaySize(22, 22).setAlpha(.85).setTint(0xffb0a0); this.sealImgs = this.sealImgs || []; this.sealImgs.push(im); if (this.dlg) this.dlg.root.add(im); else this.pendingSeal = im;
    },

    /** Tlačidlo okna podľa pôvodného HTML tlačidla k (aj s ikonkou výbavy). Vráti pole objektov s výškou .h. */
    dialogButton(k, x, y, w, allow) {
        const label = k.textContent.trim() || '•', dn = Icons.forDialog(label), icon = this.iconFor(k) || (dn && label !== '•' ? Icons.tex(this, dn) : null);
        const unit = icon && /^ico_(u|por)_/.test(icon), is = unit ? 34 : 24, iw = icon ? is + 6 : 0;   // ikonky vojakov sú väčšie
        const probe = this.add.text(0, 0, label, txtStyle(12, '#000', { wordWrap: { width: w - 12 - iw, useAdvancedWrap: true } }));
        const bh = Math.max(icon ? is + 4 : 24, probe.height + 8); probe.destroy();
        const swatch = k.style.background && k.textContent.trim() === '' ? k.style.background : null;
        const parts = this.button(x, y, w, bh, label, () => { if (allow()) k.click(); }, { disabled: k.disabled, icon, iconSize: is, size: 12 });
        if (swatch) parts[0].setFillStyle(hex(swatch));
        if (k.dataset.sel || k.style.outline) parts[0].setStrokeStyle(3, 0xffffff, 1);
        this.dlgButtons.push(k);
        parts.h = bh;
        return parts;
    },

    /** Ikonka výbavy z HTML tlačidla (plátno canvas.ico) ako textúra Phaseru. */
    iconFor(k) {
        const cv = k.querySelector && k.querySelector('canvas.ico'), key = k.dataset && k.dataset.icon;
        if (!cv || !key) return null;
        if (!this.textures.exists(key)) this.textures.addCanvas(key, cv);
        return key;
    },

    /** Klik je vo viditeľnej časti okna (nie na tlačidle odrolovanom mimo) a nejde o ťahanie. */
    inDialog() {
        const d = this.dlg, y = this.input.activePointer.y / RES;
        if (this.drag && this.drag.moved) return false;
        return !d || (y >= d.vy0 && y <= d.vy1);
    },

    /** Posunie obsah okna o dy (koliesko), alebo nastaví polohu (abs = true). */
    scrollDialog(dy, direct, abs) {
        const d = this.dlg;
        if (!d || d.CH <= d.maxH) return;
        const target = abs ? dy : d.scroll + (direct ? dy : dy * .5);
        d.scroll = Math.max(0, Math.min(d.CH - d.maxH, target));
        d.content.y = d.py + 20 - d.scroll;
        const top = d.vy0 + 28, len = d.vy1 - d.vy0 - 56;
        d.bar.clear().fillStyle(0x000000, .35).fillRect(d.px + d.PW - 20, top, 4, len)
            .fillStyle(UI_C.line, .85).fillRect(d.px + d.PW - 20, top + len * d.scroll / d.CH, 4, Math.max(12, len * d.maxH / d.CH));
    },

    dialogKey(k) {
        if (!this.dlg) return;
        const bs = (this.dlgButtons || []).filter(b => !b.disabled);
        if (k === 'esc') { const b = bs.find(b => UI_EXIT.test(b.textContent.trim())); if (b) b.click(); }
        else if (bs[k - 1]) bs[k - 1].click();
    }
});
