/*
 * ENGINE: okná rozhrania v Phaseri (metódy UIScene). Okno sa opisuje v HTML (#ov: nadpis, odsek, tlačidlá a riadky z show/btn/rowHead
 * v js/ui/dom.js) a tu sa prekreslí ako panel s rámom, portrétom, ikonkami, posúvaním a klávesami 1–9/Esc; listy ako pergamen s pečaťou.
 */
/** Ikonka okna podľa nadpisu (medailón v hlavičke bežných okien). */
const DLG_ICONS = [[/Kováč|zbrojnic/, 'anvil'], [/Kupec|^Trh|Obchod/, 'scales'], [/Krčm|Hostiteľ|brloh|Krčmár/, 'mug'], [/Chrám|Kaplnka|Oltár|pamätník/, 'honor'], [/Cvičisko/, 'attack'],
    [/Veliteľ posádky|Posádka/, 'shield'], [/Správca hradu|Správa kráľovstva|Kráľovstvo|panstvo|Nové kráľovstvo|Strana/, 'castle'], [/Léna|Vazali|Dvor|Rada|Diplomacia/, 'court'],
    [/Obliehanie|Útok|Výpad|Nepriateľ útočí/, 'ram'], [/Studňa/, 'leaf'], [/Dedina|Starosta|Dozorca|dediny|Dobrovoľníci|sedliaci|Dedinčan/, 'village'], [/Úlohy|Príbeh|Úloha/, 'quest'],
    [/Kronika|Denník|Správa zo sveta/, 'diary'], [/Štatistiky/, 'chart'], [/Trofeje|Úspechy|Víťaz/, 'trophy'], [/Prehľad sveta/, 'map'], [/Návod|Encyklopédia/, 'help'], [/Uložiť|Načítať/, 'chest'],
    [/Ovládanie|Nastavenia/, 'gear'], [/Ukončiť/, 'door'], [/Prístav|Plavba/, 'flag'], [/karavána|Kupec|Trpasličí kupec/, 'cart'], [/Porazen|Porážka|Zajat|zajatí|V zajatí|výkupné/, 'chain'],
    [/Súboj|Stretnutie|Prehra v súboji/, 'sword'], [/Posol|Hádka|Spoloční|družiny/, 'group'], [/Hora osudu/, 'ring'], [/Búrka|víchrica/, 'sun'], [/Prosba|Utečenci|pocestný|Potulný/, 'talk']];

Object.assign(UIScene.prototype, {
    // ---------- Okná (zrkadlo #ov) ---------------------------------------------------
    mirrorable() {
        return G && !ov.classList.contains('hide') && !ov.classList.contains('intro') && !ov.classList.contains('encv')
            && !ov.querySelector('input,select,img,.enc,.egrid');
    },

    syncDialog() {
        const m = this.mirrorable();
        ov.classList.toggle('mirror', !!m);
        ov.classList.remove('pending');   // show() okno skryl, kým ho tu nepreberieme (formuláre ostávajú v HTML)
        const sig = m ? ov.innerHTML : '';
        if (sig === this.sig.dlg) return;
        const sameTitle = this.dlg && m && (ov.querySelector('h1') || {}).textContent === this.dlg.title;
        const keepScroll = sameTitle ? this.dlg.scroll : 0;
        this.sig.dlg = sig;
        if (this.dlg) { if (this.dlg.hold) this.dlg.hold.remove(); this.dlg.root.destroy(true); this.dlg.mask && this.dlg.mask.destroy(); this.dlg = null; }
        if (m && !(ov.dataset.screen && this.richScreen(ov.dataset.screen))) this.buildDialog(keepScroll);   // bohaté obrazovky: js/engine/scenes/UIRich.js
        this.sig.bars = null;
    },

    buildDialog(scroll) {
        const root = this.add.container(0, 0).setDepth(40);
        const shade = this.add.rectangle(0, 0, W, H, 0x050302, .5).setOrigin(0).setInteractive();
        const h1 = ov.querySelector('h1'), title = h1 ? h1.textContent : '';
        const letter = /^List /.test(title), LC = letter ? { gold: '#6a2a10', ink: '#2e2014', dim: '#6a5a48' } : { gold: '#e6c37a', ink: '#e6dabf', dim: '#a8987c' };   // list: pergamen s tmavým atramentom; ostatné okná tmavý rám so svetlým textom
        const bt = ov.querySelector('#bt'), kids = bt ? [...bt.children] : [];
        const nBtn = kids.filter(k => k.tagName === 'BUTTON').length, cols = nBtn > 14 || /^Trh:/.test(title) ? 3 : nBtn >= 5 ? 2 : 1;
        const PW = cols === 3 ? 620 : cols === 2 ? 540 : 460, GP = 8;
        let sb = 0, IW, bw;   // sb: miesto vpravo pre posuvník, keď je obsah dlhší ako okno
        const dims = () => { IW = PW - 32 - sb; bw = (IW - (cols - 1) * GP) / cols; };
        dims();
        this.dlgButtons = [];
        // rozloženie obsahu okna (nadpis, text, tlačidlá a riadky) od y = 0
        const layout = list => {
            const items = [];
            let y = 0, col = 0, rowH = 0;
            // portrét (plátno .por) vľavo od nadpisu a prvého odseku
            const por = ov.querySelector('canvas.por'), pk = por && por.dataset.key;
            let px0 = 16, pw0 = IW, py0 = y, pimg = null;
            if (por && pk) { if (!this.textures.exists(pk)) this.textures.addCanvas(pk, por); pimg = this.add.image(16, y, pk).setOrigin(0).setDisplaySize(78, 78); items.push(pimg); px0 = 16 + 86; pw0 = IW - 86;
                try {   // živý portrét: občas žmurkne
                    const L = JSON.parse(pk.slice(4)), bk = pk + '_b', im = pimg;
                    if (L && L.race !== 'wraith') {
                        if (!this.textures.exists(bk)) this.textures.addCanvas(bk, Portraits.canvas({ ...L, blink: 1 }));
                        const blink = () => { if (!im.active) return; im.setTexture(bk).setDisplaySize(78, 78); this.time.delayedCall(130, () => { if (im.active) im.setTexture(pk).setDisplaySize(78, 78); }); this.time.delayedCall(2200 + Math.random() * 3200, blink); };
                        this.time.delayedCall(1200 + Math.random() * 2000, blink);
                    }
                } catch (e) { }
            }
            if (title && letter) { const t = this.add.text(pimg ? px0 : PW / 2, y, title, txtStyle(19, LC.gold, { fontFamily: TITLE_FONT, align: pimg ? 'left' : 'center', wordWrap: { width: pw0 } })).setOrigin(pimg ? 0 : .5, 0); items.push(t); y += t.height + 5; }
            else if (title) {
                const ic = pimg ? null : this.dlgIcon(title), tx0 = pimg ? px0 : ic ? 16 + 46 : 16, tw = pimg ? pw0 : IW - (ic ? 46 : 0) - 4;
                const t = this.add.text(tx0, y, title, txtStyle(20, '#f6ecd6', { fontFamily: TITLE_FONT, align: 'left', wordWrap: { width: tw } })).setOrigin(0, 0).setShadow(0, 1, '#000', 3, true, true);
                const th = Math.max(t.height, ic ? 38 : 0);
                if (ic) { const mg = this.add.graphics(), cx = 35, cy = y + th / 2; mg.fillStyle(0x000000, .55).fillCircle(cx, cy + 1, 19); mg.fillStyle(0x2a1c10, 1).fillCircle(cx, cy, 18); mg.lineStyle(1.4, 0xe6c37a, .85).strokeCircle(cx, cy, 19); mg.lineStyle(.6, 0xe6c37a, .35).strokeCircle(cx, cy, 22.5); items.push(mg, this.add.image(cx, cy, Icons.tex(this, ic)).setDisplaySize(24, 24)); t.y = y + (th - t.height) / 2; }
                items.push(t); y += th + 6;
                const rg = this.add.graphics(), rx = pimg ? px0 : 16, rw = (pimg ? pw0 : IW) - 4;
                rg.fillGradientStyle(0xe6c37a, 0xe6c37a, 0xe6c37a, 0xe6c37a, .7, 0, .7, 0).fillRect(rx, y, rw, 1.2); rg.fillStyle(0xe6c37a, .9).fillRect(rx - 1, y - 1.5, 4, 4);
                items.push(rg); y += 9;
            }
            ov.querySelectorAll(':scope > p').forEach(p => {
                if (!p.textContent.trim()) return;
                const lft = pimg || !letter, quote = /^\s*„/.test(p.textContent);
                const t = this.add.text(lft ? (pimg ? px0 : 16) : PW / 2, y, p.textContent, txtStyle(13, p.style.color ? LC.gold : quote && !letter ? '#f2e4bf' : LC.ink, { fontStyle: letter || quote ? 'italic' : 'normal', align: lft ? 'left' : 'center', lineSpacing: 2, wordWrap: { width: pw0 - (lft && !pimg ? 4 : 0) } })).setOrigin(lft ? 0 : .5, 0);
                if (!letter) t.setShadow(0, 1, '#000', 3, true, true);
                items.push(t); y += t.height + 6;
            });
            if (pimg) { y = Math.max(y, py0 + 84); px0 = 16; }
            y += 4;
            const flush = () => { if (col) { y += rowH + GP; col = 0; rowH = 0; } };
            // v mriežke majú všetky tlačidlá rovnakú výšku (podľa najvyššieho), aby riadky boli rovné
            let uh = 0;
            if (cols > 1) list.forEach(k => { if (k.tagName === 'BUTTON' && !(UI_EXIT.test(k.textContent.trim()) && k === list[list.length - 1])) uh = Math.max(uh, this.dialogButton(k, -999, -999, bw, () => 0, false, 0, true).h); });
            list.forEach(k => {
                if (k.tagName === 'BUTTON') {
                    const exit = UI_EXIT.test(k.textContent.trim()), last = k === list[list.length - 1];
                    if (exit && last) {
                        flush();
                        const parts = this.dialogButton(k, 16, y, IW, () => this.inDialog(), true);
                        items.push(...parts); y += parts.h + GP; col = 0; rowH = 0;
                    } else {
                        const parts = this.dialogButton(k, 16 + col * (bw + GP), y, bw, () => this.inDialog(), cols === 1 && exit, uh);
                        items.push(...parts);
                        rowH = Math.max(rowH, parts.h); col++;
                        if (col === cols) flush();
                    }
                } else {
                    flush();
                    const ik = this.iconFor(k), ix = ik ? 40 : 0;   // riadok s ikonkou/portrétom vľavo
                    if (ik) items.push(this.add.image(16, y, ik).setOrigin(0).setDisplaySize(34, 34));
                    const t = this.add.text(16 + ix, y, k.textContent, txtStyle(k.dataset.kind === 'gold' ? 14 : 13, k.dataset.kind === 'gold' ? LC.gold : k.dataset.kind === 'dim' ? LC.dim : LC.ink, { wordWrap: { width: IW - 26 - ix } }));
                    items.push(t);
                    const block = Math.max(t.height, ik ? 34 : 0);
                    if (k.dataset.kind === 'gold') {
                        const rule = this.add.graphics();
                        rule.lineStyle(1, letter ? 0x8a6230 : 0xe6c37a, letter ? .55 : .4).lineBetween(16, y + block + 2, 16 + IW - 4, y + block + 2);
                        items.push(rule); y += block + 7;
                    } else y += block + 3;
                }
            });
            flush();
            return { items, CH: y };
        };
        const maxH = H - 110;
        let L = layout(kids), foot = [];
        if (L.CH > maxH) { sb = 14; dims(); L.items.forEach(o => o.destroy()); this.dlgButtons = []; L = layout(kids); }
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
            const fy = py + 26 + viewH + 4, fw = (IW - (foot.length - 1) * GP) / foot.length;
            panel.lineStyle(1, UI_C.line, .4).lineBetween(px + 14, fy - 4, px + PW - 14, fy - 4);
            foot.forEach((k, i) => root.add(this.dialogButton(k, px + 16 + i * (fw + GP), fy, fw, () => true, UI_EXIT.test(k.textContent.trim()))));
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
        // tmavý rám so zlatými lemami (rovnaký jazyk ako bohaté obrazovky: vstup do hradu, Hrdina, Družina, Voľby); zlo má červenší lem
        const evil = G && heroSide() === 1, gold = evil ? 0xd0644a : 0xe6c37a;
        panel.fillStyle(0x000000, .5).fillRoundedRect(px + 2, py + 5, PW, PH, 8);
        panel.fillGradientStyle(0x22170f, 0x22170f, 0x0f0a07, 0x0f0a07, .98, .98, .99, .99).fillRect(px + 3, py + 3, PW - 6, PH - 6);
        panel.fillGradientStyle(evil ? 0x4a1c14 : 0x4a3418, evil ? 0x4a1c14 : 0x4a3418, 0x0f0a07, 0x0f0a07, .55, .55, 0, 0).fillRect(px + 3, py + 3, PW - 6, 58);   // jemný lesk hlavičky
        panel.lineStyle(1, gold, .65).strokeRoundedRect(px, py, PW, PH, 7);
        panel.lineStyle(3, 0x0a0704, .9).strokeRoundedRect(px - 2.5, py - 2.5, PW + 5, PH + 5, 9);
        panel.lineStyle(.6, gold, .25).strokeRoundedRect(px - 4.5, py - 4.5, PW + 9, PH + 9, 10);
        for (const [cx, cy] of [[px, py], [px + PW, py], [px, py + PH], [px + PW, py + PH]]) { panel.fillStyle(0x0a0704, 1).fillCircle(cx, cy, 4.5); panel.fillStyle(gold, .9).fillCircle(cx, cy, 2.6); }
    },

    /** Ikonka okna podľa nadpisu, alebo null. */
    dlgIcon(title) { const m = DLG_ICONS.find(([re]) => re.test(title)); return m ? m[1] : 'scroll'; },

    /** Tlačidlo okna v novom štýle: zaoblená karta s tmavým drevom, zlatým lemom a ikonou v medailóne; o.primary = odchod (jantárová pilulka). */
    dlgBtn(x, y, w, h, label, fn, o = {}) {
        const off = !!o.disabled, prim = !!o.primary && !off, sel = !!o.sel, g = this.add.graphics();
        const draw = hov => {
            g.clear(); g.fillStyle(0x000000, .38).fillRoundedRect(x, y + 2, w, h, 6);
            const c1 = o.fill != null ? o.fill : off ? 0x1c1612 : prim ? (hov ? 0xa06a24 : 0x8a5a1c) : sel ? 0x6a4818 : hov ? 0x4a3620 : 0x33261a, c2 = o.fill != null ? o.fill : off ? 0x14100c : prim ? 0x5a3a10 : sel ? 0x4a3010 : 0x1e150d;
            g.fillGradientStyle(c1, c1, c2, c2, 1, 1, 1, 1).fillRect(x + 1, y + 1, w - 2, h - 2);
            g.fillStyle(0xffe0a0, off ? .02 : hov ? .12 : .06).fillRect(x + 1, y + 1, w - 2, Math.max(2, (h - 2) * .4));
            g.lineStyle(sel || prim ? 1.4 : .9, hov ? 0xffe0a0 : prim ? 0xf0cf80 : sel ? 0xffd88a : 0xe6c37a, off ? .25 : hov ? 1 : sel || prim ? .95 : .5).strokeRoundedRect(x, y, w, h, 6);
            if (o.icon) { const is = Math.min(h - 6, o.iconSize || 22), sx = x + 4, sy = y + (h - is - 4) / 2; g.fillStyle(0x0a0704, off ? .35 : .6).fillRoundedRect(sx, sy, is + 4, is + 4, 5); g.lineStyle(.9, 0xe6c37a, off ? .2 : .55).strokeRoundedRect(sx, sy, is + 4, is + 4, 5); }
        };
        draw(false);
        const out = [g], is = o.icon ? Math.min(h - 6, o.iconSize || 22) : 0, iw = o.icon ? is + 12 : 0;
        if (o.icon) out.push(this.add.image(x + 6 + is / 2 + 0, y + h / 2, o.icon).setDisplaySize(is - 2, is - 2).setAlpha(off ? .5 : 1));
        const t = this.add.text(o.icon ? x + iw + 4 : x + w / 2, y + h / 2, label, txtStyle(o.size || 13, off ? '#8a7a60' : prim || sel ? '#fff3d0' : '#f0d690', { align: o.icon ? 'left' : 'center', wordWrap: { width: Math.max(10, w - 14 - iw), useAdvancedWrap: true } })).setOrigin(o.icon ? 0 : .5, .5).setShadow(0, 1, '#000', 2, true, true);
        out.push(t);
        if (!off && fn) {
            const z = this.add.rectangle(x, y, w, h, 0, 0).setOrigin(0).setInteractive({ useHandCursor: true });
            z.on('pointerover', () => { draw(true); if (typeof uiSnd === 'function') uiSnd('hover'); }); z.on('pointerout', () => draw(false));
            z.on('pointerdown', () => { if (typeof uiSnd === 'function') uiSnd('click'); }); z.on('pointerup', () => { if (!(this.drag && this.drag.moved)) fn(); });
            out.push(z);
        }
        return out;
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
    dialogButton(k, x, y, w, allow, primary, minH = 0, measure = false) {
        const label = k.textContent.trim() || '•', dn = Icons.forDialog(label), icon = this.iconFor(k) || (dn && label !== '•' ? Icons.tex(this, dn) : null);
        const unit = icon && /^ico_(u|por)_/.test(icon), is = unit ? 32 : 22, iw = icon ? is + 8 : 0;   // ikonky vojakov sú väčšie
        const probe = this.add.text(0, 0, label, txtStyle(primary ? 14 : 13, '#000', { wordWrap: { width: Math.max(10, w - 12 - (icon ? Math.min(is, 24) + 6 : 0)), useAdvancedWrap: true } }));
        const bh = Math.max(minH, icon ? is + 8 : 28, probe.height + 12) + (primary ? 4 : 0); probe.destroy();
        if (measure) return { h: bh };
        const swatch = k.style.background && k.textContent.trim() === '' ? k.style.background : null;
        const parts = this.dlgBtn(x, y, w, bh, label, () => { if (allow()) k.click(); }, { disabled: k.disabled, icon, iconSize: is, size: primary ? 14 : 13, sel: !!(k.dataset.sel || k.style.outline), primary: !!primary && !k.disabled, fill: swatch ? hex(swatch) : undefined });
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
