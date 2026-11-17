/*
 * ENGINE: bohaté obrazovky v Phaseri (metódy UIScene) – vstup do hradu, Hrdina (výbava, vlastnosti, schopnosti), Družina a Voľby.
 * Okno opisuje herná logika ako doteraz (show/btn v js/ui/*.js) a označí ho ov.dataset.screen; tu sa namiesto spoločného
 * zoznamu tlačidiel nakreslí vlastné rozloženie. Akcie volajú tie isté HTML tlačidlá (b.click()) alebo tie isté funkcie hry,
 * takže logika sa nemení. Keď sa obsah nezmestí, vráti false a okno sa nakreslí po starom (UIDialog.buildDialog).
 */
// stav obrazoviek (záložka, slot, kategória, návrat) je v RICH (js/ui/dom.js)
Object.assign(UIScene.prototype, {
    // ---------- spoločné prvky ----------
    /** Nakreslí bohatú obrazovku podľa ov.dataset.screen; vráti true, keď sa podarilo. */
    richScreen(kind) {
        const fn = { town: this.richTown, hero: this.richHero, party: this.richParty, settings: this.richSettings, shop: this.richShop, sections: this.richSections, event: this.richEvent }[kind];
        if (!fn) return false;
        const root = this.add.container(0, 0).setDepth(40);
        this.dlgButtons = [];
        let ok = false; this._rs = null;
        try { ok = fn.call(this, root) !== false; } catch (e) { console.error('Obrazovka', kind, e); ok = false; }
        if (!ok) { root.destroy(true); this.dlgButtons = []; return false; }
        const h1 = ov.querySelector('h1');
        this.dlg = Object.assign({ root, title: h1 ? h1.textContent : kind, CH: 0, maxH: 1, scroll: 0, rich: kind }, this._rs || {});   // posúvateľné obrazovky (rScroll) dopĺňajú obsah, masku a posuvník
        return true;
    },
    /** Prekreslí bohatú obrazovku (napr. po výbere slotu) bez zmeny HTML okna. */
    richRebuild() { this.sig.dlg = '#'; },
    /** Okno: stmavenie, tmavý panel so zlatými lemami, zatváracie tlačidlo. Vráti {x, y, w, h}. */
    rWin(root, exit) {
        const x = 14, y = 12, w = W - 28, h = H - 24;
        const shade = this.add.rectangle(0, 0, W, H, 0x050302, .55).setOrigin(0).setInteractive();
        const g = this.add.graphics();
        g.fillStyle(0x000000, .5).fillRoundedRect(x + 2, y + 5, w, h, 8);
        g.fillGradientStyle(0x1e1610, 0x1e1610, 0x0e0a07, 0x0e0a07, .97, .97, .98, .98).fillRect(x + 3, y + 3, w - 6, h - 6);
        g.lineStyle(1, 0xe6c37a, .6).strokeRoundedRect(x, y, w, h, 7); g.lineStyle(3, 0x0a0704, .9).strokeRoundedRect(x - 2.5, y - 2.5, w + 5, h + 5, 9); g.lineStyle(.6, 0xe6c37a, .25).strokeRoundedRect(x - 4.5, y - 4.5, w + 9, h + 9, 10);
        root.add([shade, g]);
        if (exit) root.add(this.rRound(x + w - 18, y + 18, 11, null, '✕', () => exit.click()));
        return { x, y, w, h };
    },
    rT(x, y, s, size, col, o = {}) { const t = this.add.text(x, y, s, txtStyle(size, col || '#f6ecd6', { fontFamily: o.title ? TITLE_FONT : FONT, fontStyle: o.bold ? 'bold' : o.italic ? 'italic' : 'normal', wordWrap: o.wrap ? { width: o.wrap, useAdvancedWrap: true } : undefined, align: o.align || 'left', lineSpacing: o.ls || 0 })); if (o.shadow !== false) t.setShadow(0, 1, '#000', 3, true, true); return t; },
    /** Plátno → textúra (raz). */
    rTex(key, mk) { if (!this.textures.exists(key)) { const c = mk(); if (!c) return null; this.textures.addCanvas(key, c); } return key; },
    rBar(g, x, y, w, h, f, c1, c2) { g.fillStyle(0x000000, .55).fillRoundedRect(x, y, w, h, h / 2); g.lineStyle(.6, 0xe6c37a, .3).strokeRoundedRect(x, y, w, h, h / 2); const fw = Math.max(0, Math.min(1, f)) * w; if (fw > 1) { g.fillGradientStyle(c1, c2, c1, c2, 1, 1, 1, 1).fillRect(x + 1, y + 1, fw - 2, h - 2); } },
    /** Zaoblená karta (pozadie a lem). */
    rCard(g, x, y, w, h, o = {}) { g.fillStyle(0x000000, .35).fillRoundedRect(x + 1, y + 3, w, h, 6); g.fillGradientStyle(o.c1 || 0x24190f, o.c1 || 0x24190f, o.c2 || 0x120c08, o.c2 || 0x120c08, 1, 1, 1, 1).fillRect(x, y, w, h); g.lineStyle(o.hot ? 1.4 : .8, o.hot ? 0xffd88a : 0xe6c37a, o.hot ? 1 : .4).strokeRoundedRect(x, y, w, h, 6); },
    /** Popis pri myši (v ráme, pri kurzore). */
    rTip(root, zone, text) {
        let tip = null;
        zone.on('pointerover', p => { const t = this.rT(0, 0, text, 10.5, '#f3dc9a', { wrap: 220 }); const tw = t.width + 14, th = t.height + 8, tx = Math.min(W - tw - 6, p.x / RES + 12), ty = Math.min(H - th - 6, p.y / RES + 14); const g = this.add.graphics().fillStyle(0x120e0c, .97).fillRoundedRect(tx, ty, tw, th, 4).lineStyle(1, 0xe6c37a, .8).strokeRoundedRect(tx, ty, tw, th, 4); t.setPosition(tx + 7, ty + 4); tip = this.add.container(0, 0, [g, t]).setDepth(60); });
        zone.on('pointerout', () => { if (tip) tip.destroy(true); tip = null; });
        zone.on('destroy', () => { if (tip) tip.destroy(true); });
    },
    /** Tlačidlo ako pilulka. o.main = zvýraznené, o.off = nedostupné, o.icon = ikona rozhrania. Vráti pole objektov. */
    rBtn(x, y, w, h, label, fn, o = {}) {
        const g = this.add.graphics(), off = !!o.off;
        const draw = hov => { g.clear(); g.fillStyle(0x000000, .4).fillRoundedRect(x, y + 2, w, h, h / 2); g.fillGradientStyle(o.main ? (hov ? 0xa06a24 : 0x8a5a1c) : (hov ? 0x4a3620 : 0x3a2a18), o.main ? (hov ? 0xa06a24 : 0x8a5a1c) : (hov ? 0x4a3620 : 0x3a2a18), o.main ? 0x5a3a10 : 0x22180e, o.main ? 0x5a3a10 : 0x22180e, 1, 1, 1, 1).fillRect(x + h / 2 - 1, y, w - h + 2, h); g.fillStyle(o.main ? 0x8a5a1c : 0x2e2214, 1).fillCircle(x + h / 2, y + h / 2, h / 2).fillCircle(x + w - h / 2, y + h / 2, h / 2); g.fillGradientStyle(o.main ? (hov ? 0xa06a24 : 0x8a5a1c) : (hov ? 0x4a3620 : 0x3a2a18), o.main ? (hov ? 0xa06a24 : 0x8a5a1c) : (hov ? 0x4a3620 : 0x3a2a18), o.main ? 0x5a3a10 : 0x22180e, o.main ? 0x5a3a10 : 0x22180e, 1, 1, 1, 1).fillRect(x + h / 2 - 1, y, w - h + 2, h); g.lineStyle(1, hov ? 0xffe0a0 : o.main ? 0xf0cf80 : 0xe6c37a, off ? .3 : hov ? 1 : .65).strokeRoundedRect(x, y, w, h, h / 2); };
        draw(false);
        const out = [g], ic = o.icon ? 15 : 0;
        if (o.icon) out.push(this.add.image(x + 12 + (o.iconOnly ? (w - 24) / 2 : 0), y + h / 2, Icons.tex(this, o.icon)).setDisplaySize(h * .62, h * .62).setOrigin(o.iconOnly ? .5 : 0, .5).setAlpha(off ? .5 : 1));
        if (label) { const t = this.rT(x + w / 2 + ic / 2, y + h / 2, label, o.size || 11, off ? '#8a7a60' : o.main ? '#fff3d0' : '#f0d690', { bold: true }).setOrigin(.5); if (t.width > w - 14 - ic) t.setScale((w - 14 - ic) / t.width); out.push(t); }
        g.setAlpha(off ? .55 : 1);
        if (!off && fn) { const z = this.add.rectangle(x, y, w, h, 0, 0).setOrigin(0).setInteractive({ useHandCursor: true }); z.on('pointerover', () => { draw(true); if (typeof uiSnd === 'function') uiSnd('hover'); }); z.on('pointerout', () => draw(false)); z.on('pointerdown', () => { if (typeof uiSnd === 'function') uiSnd('click'); }); z.on('pointerup', () => fn()); out.push(z); if (o.tip) this.rTip(null, z, o.tip); }
        return out;
    },
    /** Okrúhle tlačidlo (zatvorenie, plus). */
    rRound(cx, cy, r, ic, label, fn, o = {}) {
        const g = this.add.graphics(), draw = hov => { g.clear(); g.fillStyle(o.main ? 0x6e4614 : 0x000000, hov ? .85 : .5).fillCircle(cx, cy, r); g.lineStyle(1.2, hov ? 0xffe0a0 : 0xe6c37a, hov ? 1 : .7).strokeCircle(cx, cy, r); };
        draw(false); const out = [g];
        if (ic) out.push(this.add.image(cx, cy, Icons.tex(this, ic)).setDisplaySize(r * 1.2, r * 1.2));
        if (label) out.push(this.rT(cx, cy, label, r * .95, '#f0e2c4', { bold: true }).setOrigin(.5));
        const z = this.add.circle(cx, cy, r, 0, 0).setInteractive({ useHandCursor: true }); z.on('pointerover', () => draw(true)); z.on('pointerout', () => draw(false)); z.on('pointerup', () => fn()); out.push(z);
        return out;
    },
    /** Nadpis sekcie s linkou. */
    rSec(root, x, y, w, s) { const t = this.rT(x, y, s.toUpperCase(), 8.5, '#bfa070', { bold: true }); const g = this.add.graphics(); g.lineStyle(.6, 0xe6c37a, .45).lineBetween(x + t.width + 6, y + t.height / 2, x + w, y + t.height / 2); root.add([t, g]); return t.height; },
    htmlButtons() { const bt = ov.querySelector('#bt'); return bt ? [...bt.children].filter(k => k.tagName === 'BUTTON') : []; },
    exitButton() { const bs = this.htmlButtons(); for (let i = bs.length - 1; i >= 0; i--) if (UI_EXIT.test(bs[i].textContent.trim()) || /^Odísť z mesta|^Zavrieť|^Späť/.test(bs[i].textContent.trim())) return bs[i]; return bs[bs.length - 1] || null; },

    // ---------- 1. vstup do hradu ----------
    richTown(root) {
        const i = +ov.dataset.ti, t = TW[i]; if (!t) return false;
        const bs = this.htmlButtons(), exit = bs.find(b => /^Odísť z mesta/.test(b.textContent.trim())) || this.exitButton();
        const R = this.rWin(root, exit), g = this.add.graphics(); root.add(g);
        // hlavička: obloha podľa dennej doby, siluety hôr, hrad, zástava frakcie
        const hx = R.x + 3, hy = R.y + 3, hw = R.w - 6, hh = 138, nn = nightness();
        const sky1 = nn > .5 ? 0x0c1430 : 0x2a3a5a, sky2 = nn > .5 ? 0x2a2a48 : 0xc87a4a;
        g.fillGradientStyle(sky1, sky1, sky2, sky2, 1, 1, 1, 1).fillRect(hx, hy, hw, hh);
        if (nn < .5) { g.fillStyle(0xfff0c0, .25).fillCircle(hx + hw * .66, hy + 96, 40); g.fillStyle(0xfff0c0, .35).fillCircle(hx + hw * .66, hy + 96, 22); }
        else { g.fillStyle(0xffffff, .8); for (let k = 0; k < 30; k++) g.fillRect(hx + (k * 97 % hw), hy + (k * 53 % 80), 1, 1); g.fillStyle(0xfff4d0, .9).fillCircle(hx + hw * .7, hy + 34, 9); }
        const ridge = (yb, amp, col, a, seed) => { const pts = [{ x: hx, y: hy + hh }]; for (let k = 0; k <= 12; k++) pts.push({ x: hx + k * hw / 12, y: hy + yb - (Math.sin(k * 1.7 + seed) * .5 + .5) * amp }); pts.push({ x: hx + hw, y: hy + hh }); g.fillStyle(col, a).fillPoints(pts, true); };
        ridge(110, 45, 0x3a3040, .55, 1); ridge(126, 22, 0x2a2018, .85, 4);
        const ck = 'map_castle_' + t.f;
        if (this.textures.exists(ck)) { const im = this.add.image(hx + hw * .5, hy + hh + 18, ck).setOrigin(.5, 1); const s = 250 / im.width; im.setScale(s); const mk = this.make.graphics({ add: false }); mk.fillStyle(0xffffff).fillRect(hx, hy, hw, hh); im.setMask(mk.createGeometryMask()); root.add(im); }
        const fade = this.add.graphics(); fade.fillGradientStyle(0x0e0a07, 0x0e0a07, 0x0e0a07, 0x0e0a07, .95, 0, .95, 0).fillRect(hx, hy, hw * .45, hh); fade.fillGradientStyle(0x0e0a07, 0x0e0a07, 0x0e0a07, 0x0e0a07, 0, 0, 1, 1).fillRect(hx, hy + hh - 40, hw, 40); root.add(fade);
        try { const bk = Art.banner(this, t.f), bi = this.add.image(R.x + R.w - 92, hy - 4, bk).setOrigin(.5, 0); bi.setScale(96 / bi.height); root.add(bi); } catch (e) { }
        const lord = t.lord || (E.find(e => e.kr && e.f === t.f) || {}).nm;
        root.add(this.rT(R.x + 22, hy + 14, t.n, 26, '#f6ecd6', { title: true }));
        root.add(this.rT(R.x + 24, hy + 48, FN[t.f] + (lord ? ' · pán: ' + lord : '') + (t.mine ? ' · tvoj hrad' : ''), 11.5, '#e0caa0', { italic: true }));
        let cx = R.x + 24; const chip = (ic, s) => { const tt = this.rT(0, 0, s, 10.5, '#f6ecd6', { bold: true }), w = tt.width + 30; const cg = this.add.graphics().fillStyle(0x000000, .45).fillRoundedRect(cx, hy + 70, w, 19, 9.5).lineStyle(.7, 0xe6c37a, .45).strokeRoundedRect(cx, hy + 70, w, 19, 9.5); root.add([cg, this.add.image(cx + 11, hy + 79.5, Icons.tex(this, ic)).setDisplaySize(13, 13), tt.setPosition(cx + 21, hy + 79.5 - tt.height / 2)]); cx += w + 6; };
        const L = lvl(t); root.add(this.rT(cx, hy + 69, '★'.repeat(L) + '☆'.repeat(Math.max(0, 3 - L)), 13, '#ffd24a')); cx += 46;
        chip('sword', 'Posádka ' + t.g); if (t.wl) chip('shield', 'Hradby ' + t.wl); chip('coins', 'Prosperita ' + Math.round(t.pr ?? 40) + ' %');
        if (t.f !== G.fac && REL[G.fac]) { const r = REL[G.fac][t.f] || 0, f = (r + 100) / 200; root.add(this.rT(R.x + 24, hy + 96, 'Vzťah ' + FN[t.f] + ' k tebe: ' + (r > 20 ? 'priateľský' : r < -20 ? 'nepriateľský' : 'zdržanlivý') + ' (' + (r > 0 ? '+' : '') + r + ')', 9.5, '#bfae8c')); this.rBar(g, R.x + 24, hy + 112, 210, 5, f, r < 0 ? 0xa03a20 : 0x5a8a3a, r < 0 ? 0xe8704a : 0xa8d870); }
        // budovy ako dlaždice
        const DEF = [
            [/^Vstúpiť na nádvorie/, 'Nádvorie', 'castle', 0x6a6a72, 'Prejdi sa po hrade a porozprávaj sa s ľuďmi.'],
            [/^Kováč/, 'Kováč a zbrojnica', 'anvil', 0xff7a30, 'Zbrane, brnenia, štíty a kone.'],
            [/^Trh/, 'Trh', 'scales', 0xc8a050, 'Jedlo, tovar a výkup koristi.'],
            [/^Krčma/, 'Krčma', 'mug', 0xe8a050, 'Spoločníci, klebety a nocľah.'],
            [/^Verbovanie/, 'Kasárne', 'recruit', 0x7a8aa8, 'Naverbuj vojakov a povýš veteránov.'],
            [/^Dvor/, 'Dvor a diplomacia', 'court', 0xd8b048, 'Pán hradu, lénna, mier a vojna.'],
            [/^Turnaj/, 'Aréna', 'attack', 0xc84a3a, 'Turnaj o slávu a zlato.'],
            [/^Vojsko, zajatci/, 'Tábor a zajatci', 'rest', 0x8a6a4a, 'Odpočinok, ranení a zajatci.'],
            [/^Hrdina a schopnosti/, 'Hrdina', 'hero', 0xb08a3a, 'Výbava, vlastnosti a schopnosti.'],
            [/^Správa hradu/, 'Správa hradu', 'chest', 0x8a7a5a, 'Pokladnica, stavby a posádka.'],
            [/^Prístav/, 'Prístav', 'map', 0x4a86a0, 'Plavba loďou do iných prístavov.']];
        const tiles = [], side = [];
        for (const b of bs) { const s = b.textContent.trim(); if (b === exit || /^Uložiť hru/.test(s)) continue; const d = DEF.find(D => D[0].test(s)); if (d) tiles.push([b, d, s]); else side.push(b); }
        if (tiles.length > 12) return false;
        const cols = 4, TW2 = 104, TH = tiles.length > 8 ? 86 : 96, gx = R.x + 12, gy = hy + hh + 10;
        tiles.forEach(([b, d, s], k) => {
            const x = gx + (k % cols) * (TW2 + 8), y = gy + Math.floor(k / cols) * (TH + 7), off = b.disabled, tg = this.add.graphics(), parts = [tg];
            const draw = hov => { tg.clear(); tg.setY(hov ? -2 : 0); this.rCard(tg, x, y, TW2, TH, { hot: hov }); for (let r = 5; r >= 1; r--) tg.fillStyle(d[3], .09 * (6 - r) / 3).fillCircle(x + TW2 / 2, y + 30, 8 + r * 7); };
            draw(false);
            parts.push(this.add.image(x + TW2 / 2, y + 28, Icons.tex(this, d[2])).setDisplaySize(32, 32));
            const nm = this.rT(x + 8, y + 52, d[1], 10, '#f6ecd6', { bold: true }); if (nm.width > TW2 - 12) nm.setScale((TW2 - 12) / nm.width); parts.push(nm);
            parts.push(this.rT(x + 8, y + 65, d[4], 8.2, '#cdbb95', { wrap: TW2 - 14, ls: -1 }));
            const badge = /niekto tu čaká/.test(s) ? ['Niekto tu čaká', 0xb03a20, '#fff0e0'] : /\((\d+) bod/.test(s) ? [RegExp.$1 + ' bodov', 0xe6c37a, '#2a1a04'] : /vstupné (\d+)/.test(s) ? ['Vstupné ' + RegExp.$1, 0xe6c37a, '#2a1a04'] : null;
            if (badge) { const bt = this.rT(0, 0, badge[0], 7.5, badge[2], { bold: true, shadow: false }), bw = bt.width + 10; parts.push(this.add.graphics().fillStyle(badge[1], 1).fillRoundedRect(x + 5, y + 5, bw, 12, 6), bt.setPosition(x + 10, y + 11 - bt.height / 2)); }
            if (k < 9) { parts.push(this.add.graphics().fillStyle(0x000000, .55).fillCircle(x + TW2 - 11, y + 11, 7).lineStyle(.8, 0xe6c37a, .6).strokeCircle(x + TW2 - 11, y + 11, 7), this.rT(x + TW2 - 11, y + 11, '' + (k + 1), 8, '#f0d690', { bold: true }).setOrigin(.5)); }
            if (off) parts.forEach(o => o.setAlpha && o.setAlpha(.45));
            if (!off) { const z = this.add.rectangle(x, y, TW2, TH, 0, 0).setOrigin(0).setInteractive({ useHandCursor: true }); z.on('pointerover', () => { draw(true); if (typeof uiSnd === 'function') uiSnd('hover'); }); z.on('pointerout', () => draw(false)); z.on('pointerup', () => { if (typeof uiSnd === 'function') uiSnd('click'); b.click(); }); parts.push(z); }
            root.add(parts); this.dlgButtons.push(b);
        });
        // vpravo: nástenka (riadky okna), úlohy a ďalšie akcie, uložiť a odísť
        const sx = gx + cols * (TW2 + 8) + 4, sw = R.x + R.w - 12 - sx; let sy = gy;
        sy += this.rSec(root, sx, sy, sw, 'Nástenka') + 6;
        const rows = [...(ov.querySelector('#bt') || { children: [] }).children].filter(k => k.tagName !== 'BUTTON' && k.textContent.trim());
        const txt = rows.length ? rows.map(r => r.textContent.trim()).join('\n') : 'V meste je pokoj. Na nástenke dnes nič nové.';
        const nt = this.rT(sx + 10, sy + 10, txt, 9.2, '#2a1c10', { wrap: sw - 20, shadow: false, ls: 1 }), nh = Math.min(nt.height, 130) + 20;
        g.fillStyle(0x000000, .4).fillRect(sx + 2, sy + 3, sw, nh); g.fillGradientStyle(0xefe0bc, 0xefe0bc, 0xd8c294, 0xd8c294, 1, 1, 1, 1).fillRect(sx, sy, sw, nh); g.fillStyle(0xb03a20, 1).fillCircle(sx + sw / 2, sy + 2, 4);
        if (nt.height > 130) { const mk = this.make.graphics({ add: false }); mk.fillStyle(0xffffff).fillRect(sx, sy + 6, sw, 134); nt.setMask(mk.createGeometryMask()); }
        root.add(nt); sy += nh + 10;
        for (const b of side) { if (sy > R.y + R.h - 76) break; root.add(this.rBtn(sx, sy, sw, 20, b.textContent.trim(), () => b.click(), { off: b.disabled, icon: 'quest', size: 9.5 })); this.dlgButtons.push(b); sy += 24; }
        const save = bs.find(b => /^Uložiť hru/.test(b.textContent.trim()));
        if (save) { root.add(this.rBtn(sx, R.y + R.h - 62, sw, 22, 'Uložiť hru', () => save.click(), { icon: 'chest' })); this.dlgButtons.push(save); }
        if (exit) { root.add(this.rBtn(sx, R.y + R.h - 34, sw, 24, exit.textContent.trim(), () => exit.click(), { main: true, icon: 'door', size: 12 })); this.dlgButtons.push(exit); }
        return true;
    },

    // ---------- 2. hrdina ----------
    richHero(root) {
        const back = { textContent: RICH.backLabel || 'Späť', disabled: false, click: () => (RICH.back || (() => { ov.classList.add('hide'); mode = 'map'; }))() };
        const R = this.rWin(root, back), g = this.add.graphics(); root.add(g);
        const reb = () => { upd(); this.richRebuild(); };
        // vľavo: postava hrdinu na podstavci a sloty výbavy
        const dx = R.x + 12, dy = R.y + 12, dw = 318, dh = R.h - 24;
        this.rCard(g, dx, dy, dw, dh, { c1: 0x1e1610, c2: 0x0e0a07 });
        for (let r = 6; r >= 1; r--) g.fillStyle(0x8a5a1c, .05 * (7 - r) / 3).fillEllipse(dx + dw / 2, dy + 248, 40 + r * 22, 12 + r * 6);
        g.lineStyle(.8, 0xe6c37a, .4).strokeEllipse(dx + dw / 2, dy + 250, 150, 30);
        try {
            const look = Portraits.hero(), bk = Art.bigFigure(this, typeof twoHand === 'function' && twoHand() ? { ...G.eq, s: 0 } : G.eq, { king: !!G.king, cape: heroSide() === 1 ? '#2a1414' : '#6a2a2a', ...Figures.lookOpts(look) });
            const im = this.add.image(0, 0, bk, 0), fw = im.frame.width, fh = im.frame.height, s = 250 / fh * 2;   // postava zaberá asi polovicu snímky: zväčšiť a orezať prázdny okraj
            im.setCrop(fw * .1, fh * .3, fw * .8, fh * .62).setScale(Math.min(s, .8 * 624 / fh)).setOrigin(.5, .875).setPosition(dx + dw / 2, dy + 250);
            root.add(im);
        } catch (e) { }
        const SL = { h: [0, 0], w: [0, 1], r: [0, 2], a: [1, 0], s: [1, 1], m: [1, 2] };
        for (const s of SH) {
            const pos = SL[s.k]; if (!pos) continue;
            const x = pos[0] ? dx + dw - 104 : dx + 8, y = dy + 26 + pos[1] * 70, w = 96, h = 54, x0 = it(s.k), sel = RICH.slot === s.k, sg = this.add.graphics();
            this.rCard(sg, x, y, w, h, { hot: sel }); root.add(sg);
            root.add(this.rT(x + 6, y - 6, s.l.toUpperCase(), 7, '#bfa070', { bold: true }).setBackgroundColor('#120c08'));
            const ik = this.rTex(['ico', s.k, G.eq[s.k], G.fac].join('_'), () => Soldiers.icon(s.k, G.eq[s.k], FC[G.fac]));
            if (ik) root.add(this.add.image(x + 6, y + h / 2, ik).setOrigin(0, .5).setDisplaySize(30, 30));
            const nm = this.rT(x + 40, y + 9, x0.n, 8.6, '#f6ecd6', { bold: true, wrap: w - 44, ls: -1 }); root.add(nm);
            root.add(this.rT(x + 40, Math.min(y + h - 15, nm.y + nm.height + 1), eqShort(s.k, x0), 8, '#cdbb95', { italic: true }));
            const z = this.add.rectangle(x, y, w, h, 0, 0).setOrigin(0).setInteractive({ useHandCursor: true }); z.on('pointerup', () => { RICH.slot = s.k; RICH.tab = 'eq'; this.richRebuild(); }); this.rTip(root, z, s.l + ': ' + x0.n + ' – ' + eqStat(s.k, x0) + '. Klikni a vyber inú vec.'); root.add(z);
        }
        root.add(this.rT(dx + dw / 2, dy + 282, G.name, 20, '#f6ecd6', { title: true }).setOrigin(.5, 0));
        root.add(this.rT(dx + dw / 2, dy + 310, (typeof rank === 'function' ? rank() : '') + ' · ' + FN[G.fac] + ' · ' + Math.ceil(G.hp) + ' / ' + mh() + ' zdravia', 10, '#bfae8c', { italic: true }).setOrigin(.5, 0));
        let cx = dx + 18; const chip = (ic, s2) => { const tt = this.rT(0, 0, s2, 10, '#f6ecd6', { bold: true }), w = tt.width + 28; root.add([this.add.graphics().fillStyle(0x000000, .45).fillRoundedRect(cx, dy + 334, w, 19, 9.5).lineStyle(.7, 0xe6c37a, .45).strokeRoundedRect(cx, dy + 334, w, 19, 9.5), this.add.image(cx + 10, dy + 343.5, Icons.tex(this, ic)).setDisplaySize(12, 12), tt.setPosition(cx + 20, dy + 343.5 - tt.height / 2)]); cx += w + 5; };
        chip('attack', 'Útok ' + Math.round(dmg())); chip('shield', 'Ochrana ' + Math.round((1 - red()) * 100) + ' %'); chip('time', 'Rýchlosť ' + it('m').v);
        root.add(this.rT(dx + dw / 2, dy + dh - 30, 'Klikni na slot a vyber vec z batohu.', 9, '#8a7a60', { italic: true }).setOrigin(.5, 0));
        // vpravo: úroveň, záložky
        const rx = dx + dw + 14, rw = R.x + R.w - 14 - rx; let ry = R.y + 16;
        const need = G.lv * 30, f = Math.min(1, (G.xp || 0) / need);
        g.lineStyle(5, 0x000000, .5).strokeCircle(rx + 24, ry + 24, 21); g.lineStyle(5, 0xe6c37a, 1).beginPath().arc(rx + 24, ry + 24, 21, -Math.PI / 2, -Math.PI / 2 + f * 6.283).strokePath();
        root.add(this.rT(rx + 24, ry + 24, '' + G.lv, 16, '#f6ecd6', { title: true }).setOrigin(.5));
        root.add(this.rT(rx + 54, ry + 4, 'Úroveň ' + G.lv, 15, '#f6ecd6', { title: true }));
        root.add(this.rT(rx + 55, ry + 26, 'skúsenosti ' + (G.xp || 0) + ' / ' + need + (G.sk ? ' · ' + G.sk + ' bodov vlastností' : '') + (G.pp ? ' · ' + G.pp + ' perkov' : '') + (G.bk ? ' · ' + G.bk + ' schopností' : ''), 9.5, '#bfae8c', { italic: true }));
        ry += 56;
        const TABS = [['eq', 'Výbava'], ['attr', 'Vlastnosti'], ['perk', 'Perky'], ['cs', 'Schopnosti']];
        let tx = rx; for (const [k, n] of TABS) { const on = RICH.tab === k, tt = this.rT(0, 0, n, 10.5, on ? '#fff3d0' : '#bfae8c', { bold: true }), w = tt.width + 22, tg = this.add.graphics(); tg.fillStyle(on ? 0x4a3418 : 0x000000, on ? 1 : .3).fillRoundedRect(tx, ry, w, 22, { tl: 6, tr: 6, bl: 0, br: 0 }); tg.lineStyle(.8, 0xe6c37a, on ? .8 : .3).strokeRoundedRect(tx, ry, w, 22, { tl: 6, tr: 6, bl: 0, br: 0 }); const z = this.add.rectangle(tx, ry, w, 22, 0, 0).setOrigin(0).setInteractive({ useHandCursor: true }); z.on('pointerup', () => { RICH.tab = k; this.richRebuild(); }); root.add([tg, tt.setPosition(tx + 11, ry + 11 - tt.height / 2), z]); tx += w + 4; }
        g.lineStyle(.8, 0xe6c37a, .5).lineBetween(rx, ry + 22, rx + rw, ry + 22);
        ry += 32; const bottom = R.y + R.h - 46;
        if (RICH.tab === 'eq') {
            const s = SH.find(x => x.k === RICH.slot) || SH[0], cur = it(s.k);
            ry += this.rSec(root, rx, ry, rw, s.l + ' v batohu') + 6;
            const own = [...G.own[s.k]].sort((a, b) => a - b), cw = (rw - 8) / 2, ch = 40;
            if (Math.ceil(own.length / 2) * (ch + 6) > bottom - ry) return false;
            own.forEach((j, n) => {
                const x0 = s.it[j], on = G.eq[s.k] === j, x = rx + (n % 2) * (cw + 8), y = ry + Math.floor(n / 2) * (ch + 6), cg = this.add.graphics(); this.rCard(cg, x, y, cw, ch, { hot: on }); root.add(cg);
                const ik = this.rTex(['ico', s.k, j, G.fac].join('_'), () => Soldiers.icon(s.k, j, FC[G.fac])); if (ik) root.add(this.add.image(x + 5, y + ch / 2, ik).setOrigin(0, .5).setDisplaySize(30, 30));
                root.add(this.rT(x + 40, y + 6, x0.n, 9.5, '#f6ecd6', { bold: true }));
                const dv = typeof x0.v === 'number' && typeof cur.v === 'number' ? x0.v - cur.v : 0, dtxt = on ? 'nosíš' : dv ? (dv > 0 ? '+' : '') + (Math.abs(dv) < 1 ? Math.round(dv * 100) + ' %' : Math.round(dv)) : '';
                root.add(this.rT(x + 40, y + 21, eqShort(s.k, x0), 8.6, '#cdbb95', { italic: true }));
                if (dtxt) root.add(this.rT(x + cw - 8, y + 21, dtxt, 9, on ? '#ffd88a' : dv > 0 ? '#9fe08a' : '#ff9c80', { bold: true }).setOrigin(1, 0));
                if (!on) { const z = this.add.rectangle(x, y, cw, ch, 0, 0).setOrigin(0).setInteractive({ useHandCursor: true }); z.on('pointerup', () => { wear(s.k, j); reb(); }); this.rTip(root, z, x0.n + ': ' + eqStat(s.k, x0) + '. Klikni a obleč.'); root.add(z); }
            });
        } else if (RICH.tab === 'attr') {
            const A = [['st', 'Sila', '+3 útok', 0xa03a20, 0xe8704a], ['od', 'Odolnosť', '+15 zdravie', 0x3a7a3a, 0x8ad070], ['ob', 'Obratnosť', '+8 % rýchlosť', 0x2a6a8a, 0x7ac0e0], ['pr', 'Presviedčanie', '+6 pri prehováraní', 0x8a6a1a, 0xe6c37a], ['ls', 'Lukostreľba', '+1 zranenie šípov', 0x5a4a8a, 0xa89ae0]];
            for (const [k, n, d, c1, c2] of A) {
                root.add(this.rT(rx, ry, n, 11.5, '#f6ecd6', { bold: true })); root.add(this.rT(rx, ry + 15, d + ' za stupeň', 8.5, '#bfae8c', { italic: true }));
                this.rBar(g, rx + 120, ry + 7, rw - 190, 7, (G.s[k] || 0) / 5, c1, c2);
                root.add(this.rT(rx + rw - 62, ry + 1, (G.s[k] || 0) + '/5', 11, '#f6ecd6', { bold: true }));
                if (G.sk > 0 && G.s[k] < 5) root.add(this.rRound(rx + rw - 14, ry + 10, 10, null, '+', () => { G.sk--; G.s[k]++; reb(); }, { main: true }));
                ry += 38;
            }
            ry += 4; this.rSec(root, rx, ry, rw, 'Povesť'); ry += 16;
            root.add(this.rT(rx, ry, 'Sláva ' + (G.ren || 0) + '   ·   Česť ' + (G.hon || 0) + '   ·   Strach ' + (G.fear || 0) + '   ·   Rasa: ' + (typeof raceName === 'function' ? raceName() : '') + ', povaha: ' + (typeof traitName === 'function' ? traitName() : ''), 10, '#e0caa0', { wrap: rw }));
        } else if (RICH.tab === 'perk') {
            root.add(this.rT(rx, ry, 'Voľné body perkov: ' + (G.pp || 0) + '. Vyšší perk vo vetve potrebuje predošlý a úroveň 2, 4 alebo 6.', 9.5, '#bfae8c', { italic: true, wrap: rw })); ry += 22;
            PERKS.forEach(([, bn, ic, list], bi) => {
                root.add(this.add.image(rx + 10, ry + 16, Icons.tex(this, ic)).setDisplaySize(18, 18)); root.add(this.rT(rx + 24, ry + 10, bn, 10, '#e6c37a', { bold: true }));
                list.forEach(([, n, d], ti) => {
                    const st = perkState(bi, ti), x = rx + 92 + ti * ((rw - 92) / 3), w = (rw - 92) / 3 - 6, has = st === 'has', okk = st === 'ok', pg = this.add.graphics();
                    pg.fillStyle(has ? 0x4a3418 : 0x000000, has ? 1 : .35).fillRoundedRect(x, ry + 3, w, 27, 6); pg.lineStyle(has || okk ? 1.2 : .6, has ? 0xffd88a : okk ? 0x9fe08a : 0xe6c37a, has || okk ? 1 : .3).strokeRoundedRect(x, ry + 3, w, 27, 6);
                    root.add([pg, this.rT(x + 6, ry + 6, (has ? '✔ ' : '') + n, 9, has ? '#fff3d0' : okk ? '#d8f8c0' : '#9a8a70', { bold: true }), this.rT(x + 6, ry + 18, has ? 'získaný' : okk ? 'klikni a vezmi' : st, 7.5, '#8a7a60', { italic: true })]);
                    const z = this.add.rectangle(x, ry + 3, w, 27, 0, 0).setOrigin(0).setInteractive({ useHandCursor: okk }); this.rTip(root, z, n + ': ' + d + (has ? '' : okk ? ' (klikni)' : ' – ' + st)); if (okk) z.on('pointerup', () => { takePerk(bi, ti); reb(); }); root.add(z);
                });
                ry += 34;
            });
        } else {
            if (typeof wpInit === 'function') wpInit();
            ry += this.rSec(root, rx, ry, rw, 'Zdatnosti so zbraňami') + 4;
            for (const k of Object.keys(WP_N)) { root.add(this.rT(rx, ry, WP_N[k], 9.5, '#f6ecd6')); this.rBar(g, rx + 140, ry + 4, rw - 186, 6, (G.wp[k] - WP0) / (WPMAX - WP0), 0x8a6a1a, 0xe6c37a); root.add(this.rT(rx + rw - 40, ry, '' + Math.floor(G.wp[k]), 9.5, '#e0caa0', { bold: true })); ry += 15; }
            ry += 6; ry += this.rSec(root, rx, ry, rw, 'Bojové schopnosti (voľné ' + (G.bk || 0) + ')') + 4;
            for (const [k, n, d] of CS) { const lv = csLv(k); root.add(this.rT(rx, ry, n, 9.8, '#f6ecd6', { bold: true })); for (let q = 0; q < CS_MAX; q++) g.fillStyle(q < lv ? 0xe6c37a : 0x000000, q < lv ? 1 : .5).fillCircle(rx + 120 + q * 13, ry + 7, 4.5), g.lineStyle(.6, 0xe6c37a, .5).strokeCircle(rx + 120 + q * 13, ry + 7, 4.5);
                const z = this.add.rectangle(rx, ry - 2, rw - 30, 17, 0, 0).setOrigin(0).setInteractive(); this.rTip(root, z, n + ': ' + d); root.add(z);
                if (G.bk > 0 && lv < CS_MAX) root.add(this.rRound(rx + rw - 12, ry + 7, 8, null, '+', () => { csTake(k); reb(); }, { main: true }));
                ry += 19; }
        }
        root.add(this.rBtn(R.x + R.w - 132, R.y + R.h - 34, 118, 24, back.textContent, () => back.click(), { main: true, icon: 'back' }));
        this.dlgButtons.push(back);
        return true;
    },

    // ---------- 3. družina ----------
    richParty(root) {
        const tab = ov.dataset.tab || 'c', kids = [...(ov.querySelector('#bt') || { children: [] }).children], bs = kids.filter(k => k.tagName === 'BUTTON');
        const TABRE = /^(Spoločníci|Vojsko|Zásoby a zajatci|Perky|Schopnosti|Rozkazy)/, tabsB = bs.filter(b => TABRE.test(b.textContent.trim())), exit = bs[bs.length - 1];
        const R = this.rWin(root, exit), g = this.add.graphics(); root.add(g);
        root.add(this.rT(R.x + 20, R.y + 12, 'Družina', 20, '#f6ecd6', { title: true }));
        // súhrn
        const up = Math.floor((G.inf + G.cav * 2) / 3), pm = G.pm ?? 60, stats = [['group', ar() + ' mužov', 'sila ' + Math.round(pw())], ['flag', 'Morálka ' + pm, pm < 30 ? 'muži reptajú' : pm > 75 ? 'výborná' : 'dobrá', pm / 100], ['bread', (G.hungry ? 'hlad' : foodDays() + ' d'), 'zásoby jedla'], ['coins', up + ' zl/deň', 'žold'], ['chain', (G.cap || 0) + ' zajatcov', typeof cargoCount === 'function' ? 'voz ' + cargoCount() + '/' + CARGO_MAX : '']];
        const sw = (R.w - 40 - 4 * 8) / 5;
        stats.forEach(([ic, a, b2, f], k) => { const x = R.x + 20 + k * (sw + 8), y = R.y + 42; this.rCard(g, x, y, sw, 44); root.add([this.add.image(x + 18, y + 22, Icons.tex(this, ic)).setDisplaySize(24, 24), this.rT(x + 36, y + 6, a, 12.5, '#f6ecd6', { title: true }), this.rT(x + 37, y + 24, b2, 8.5, '#bfae8c', { italic: true })]); if (f != null) this.rBar(g, x + 37, y + 35, sw - 46, 4, f, pm < 30 ? 0xa03a20 : 0x8a6a1a, pm < 30 ? 0xe8704a : 0xe6c37a); });
        // záložky (HTML tlačidlá)
        let tx = R.x + 20; const ty = R.y + 96;
        for (const b of tabsB) { const n = b.textContent.trim(), on = b.dataset.sel === '1' || (tab === 'c' && /^Spoločníci/.test(n)) || (tab === 'a' && /^Vojsko/.test(n)) || (tab === 'z' && /^Zásoby/.test(n)) || (tab === 'p' && /^Perky/.test(n)) || (tab === 'b' && /^Schopnosti/.test(n)) || (tab === 'o' && /^Rozkazy/.test(n));
            const tt = this.rT(0, 0, n, 10, on ? '#fff3d0' : '#bfae8c', { bold: true }), w = tt.width + 20, tg = this.add.graphics(); tg.fillStyle(on ? 0x4a3418 : 0x000000, on ? 1 : .3).fillRoundedRect(tx, ty, w, 21, { tl: 6, tr: 6, bl: 0, br: 0 }); tg.lineStyle(.8, 0xe6c37a, on ? .8 : .3).strokeRoundedRect(tx, ty, w, 21, { tl: 6, tr: 6, bl: 0, br: 0 });
            const z = this.add.rectangle(tx, ty, w, 21, 0, 0).setOrigin(0).setInteractive({ useHandCursor: true }); z.on('pointerup', () => b.click()); root.add([tg, tt.setPosition(tx + 10, ty + 10.5 - tt.height / 2), z]); this.dlgButtons.push(b); tx += w + 4; }
        g.lineStyle(.8, 0xe6c37a, .5).lineBetween(R.x + 20, ty + 21, R.x + R.w - 20, ty + 21);
        const cy0 = ty + 30, cx0 = R.x + 20, cw0 = R.w - 40, bottom = R.y + R.h - 44;
        const rest = kids.filter(k => !(k.tagName === 'BUTTON' && (TABRE.test(k.textContent.trim()) || k === exit)));
        if (tab === 'c') {
            const C = myComps(); if (!C.length) { root.add(this.rT(cx0, cy0, (ov.querySelector('p') || {}).textContent || '', 11, '#cdbb95', { italic: true, wrap: cw0 })); }
            // skupiny tlačidiel po spoločníkoch: zlatý riadok začína nového
            const groups = []; let cur = null; for (const k of rest) { if (k.tagName !== 'BUTTON' && k.dataset.kind === 'gold') { cur = []; groups.push(cur); } else if (k.tagName === 'BUTTON' && cur) cur.push(k); }
            const cw = (cw0 - 10) / 2, ch = Math.min(150, (bottom - cy0 - 10) / 2);
            C.forEach((c, n) => {
                const x = cx0 + (n % 2) * (cw + 10), y = cy0 + Math.floor(n / 2) * (ch + 10); this.rCard(g, x, y, cw, ch);
                const pk = this.rTex('por_r_' + c.id, () => Portraits.canvas(c.look, 120)); if (pk) { root.add(this.add.image(x + 8, y + 8, pk).setOrigin(0).setDisplaySize(78, 78)); g.lineStyle(1, 0xe6c37a, .6).strokeRect(x + 8, y + 8, 78, 78); }
                const hp = G.chp && G.chp[c.id] != null ? G.chp[c.id] : 1, w2 = G.cwound && G.cwound[c.id] > G.day, rel = crel(c.id), lv = compLv(c);
                root.add([this.rT(x + 96, y + 8, c.n, 14, '#f6ecd6', { title: true }), this.rT(x + 97, y + 28, c.t + ' · úroveň ' + lv + (w2 ? ' · ranený' : ''), 9.2, w2 ? '#ff9c80' : '#cdbb95', { italic: true, wrap: cw - 104 })]);
                root.add(this.rT(x + 97, y + 46, 'Zdravie', 8.5, '#bfae8c')); this.rBar(g, x + 140, y + 49, cw - 150, 5, hp, 0xa03a20, 0xe8704a);
                root.add(this.rT(x + 97, y + 59, 'Spokojnosť', 8.5, '#bfae8c')); this.rBar(g, x + 140, y + 62, cw - 150, 5, rel / 100, rel < 35 ? 0xa03a20 : 0x5a8a3a, rel < 35 ? 0xe8704a : 0xa8d870);
                const roles = (CROLE[c.id] || []).map(r => ROLE_N[r]).join(', '); if (roles) root.add(this.rT(x + 97, y + 72, 'Rola: ' + roles, 8.5, '#e6c37a', { italic: true, wrap: cw - 104 }));
                const gb = groups[n] || []; let bx = x + 8;
                gb.forEach(b => { const s = b.textContent.trim().replace(/\s*\(.*$/, ''), w = Math.min(cw - 16, Math.max(70, s.length * 5.4 + 28)); if (bx + w > x + cw - 6) return; root.add(this.rBtn(bx, y + ch - 28, w, 20, s, () => b.click(), { off: b.disabled, size: 9 })); this.dlgButtons.push(b); bx += w + 6; });
            });
        } else if (tab === 'a') {
            const list = [['inf', 'Pešiaci', 'i', 1 / 3], ['arc', 'Lukostrelci', 'a', 0], ['cav', 'Jazdci', 'c', 2 / 3], ['vet', 'Veteráni', 'v', 0], ['elf', 'Elfovia', 'e', 0], ['roh', 'Rohirimi', 'r', 0]];
            Object.keys(FU).filter(k => k[0] === 'u' && G[k]).forEach(k => list.push([k, FU[k].n, k, 0]));
            if (G.ent) list.push(['ent', 'Enti', 'n', 0]);
            const L = list.filter(([k]) => G[k] > 0), cols = 6, cw = (cw0 - (cols - 1) * 8) / cols, ch = 118;
            if (Math.ceil(L.length / cols) * (ch + 8) > bottom - cy0 - 34) return false;
            L.forEach(([k, n, u, wage], m) => {
                const x = cx0 + (m % cols) * (cw + 8), y = cy0 + Math.floor(m / cols) * (ch + 8); this.rCard(g, x, y, cw, ch);
                const ik = this.rTex(['ico_u', u, G.fac].join('_'), () => Soldiers.unitIcon(u, FC[G.fac], 96)); if (ik) root.add(this.add.image(x + cw / 2, y + 42, ik).setDisplaySize(64, 64));
                root.add([this.rT(x + cw - 8, y + 6, '' + G[k], 18, '#fff3d0', { title: true }).setOrigin(1, 0), this.rT(x + 8, y + 82, n, 10, '#f6ecd6', { bold: true, wrap: cw - 12 }), this.rT(x + 8, y + 100, wage ? (Math.round(G[k] * wage * 10) / 10) + ' zl/deň' : 'bez žoldu', 8.5, '#cdbb95', { italic: true })]);
            });
            const extra = rest.filter(k => k.tagName === 'BUTTON'); let bx = cx0;
            extra.forEach(b => { const s = b.textContent.trim(), w = Math.min(cw0 / 2 - 6, s.length * 5.6 + 40); root.add(this.rBtn(bx, bottom - 26, w, 22, s, () => b.click(), { off: b.disabled, icon: Icons.forButton(s) || 'door', size: 9.5 })); this.dlgButtons.push(b); bx += w + 8; });
            const dim = rest.find(k => k.tagName !== 'BUTTON'); if (dim) root.add(this.rT(cx0, bottom - 46, dim.textContent, 9, '#8a7a60', { italic: true, wrap: cw0 }));
        } else {
            // ostatné záložky: text a tlačidlá v dvoch stĺpcoch, vo vlastnom štýle
            let y = cy0; const p = ov.querySelector(':scope > p'); if (p && p.textContent.trim()) { const t = this.rT(cx0, y, p.textContent.trim(), 9.5, '#cdbb95', { italic: true, wrap: cw0 }); root.add(t); y += t.height + 6; }
            const colW = (cw0 - 10) / 2; let col = 0;
            for (const k of rest) {
                if (k.tagName === 'BUTTON') { const x = cx0 + col * (colW + 10); root.add(this.rBtn(x, y, colW, 20, k.textContent.trim(), () => k.click(), { off: k.disabled, size: 9, icon: k.dataset.icon && /^ico_ui_/.test(k.dataset.icon) ? k.dataset.icon.slice(7) : null })); this.dlgButtons.push(k); col++; if (col === 2) { col = 0; y += 24; } }
                else { if (col) { col = 0; y += 24; } const t = this.rT(cx0, y, k.textContent.trim(), k.dataset.kind === 'gold' ? 10.5 : 9, k.dataset.kind === 'gold' ? '#e6c37a' : '#cdbb95', { bold: k.dataset.kind === 'gold', wrap: cw0 }); root.add(t); y += t.height + 4; }
                if (y > bottom - 4) return false;
            }
        }
        if (exit) { root.add(this.rBtn(R.x + R.w - 132, R.y + R.h - 34, 118, 24, exit.textContent.trim(), () => exit.click(), { main: true, icon: 'back' })); this.dlgButtons.push(exit); }
        return true;
    },

    // ---------- 4. voľby ----------
    richSettings(root) {
        const bs = this.htmlButtons(), exit = bs[bs.length - 1], ctrl = bs.find(b => /^Klávesy/.test(b.textContent.trim()));
        const R = this.rWin(root, exit), g = this.add.graphics(); root.add(g);
        root.add(this.rT(R.x + 20, R.y + 12, 'Voľby', 20, '#f6ecd6', { title: true }));
        const G2 = optGroups(), CAT_IC = { Zvuk: 'sound', Hra: 'book', 'Bitka 3D': 'attack', Boj: 'attack', Obraz: 'map', Mapa: 'map', Ovládanie: 'gear' };
        const cats = [...G2.map(x => x.t), ...(ctrl ? ['Ovládanie'] : [])]; RICH.cat = Math.min(RICH.cat || 0, cats.length - 1);
        cats.forEach((n, k) => { const on = RICH.cat === k, y = R.y + 50 + k * 30, x = R.x + 16, w = 132, cg = this.add.graphics(); if (on) { cg.fillGradientStyle(0x4a3418, 0x2a1c0e, 0x4a3418, 0x2a1c0e, 1, .3, 1, .3).fillRect(x, y, w, 26); cg.lineStyle(.8, 0xe6c37a, .7).strokeRoundedRect(x, y, w, 26, 6); }
            const z = this.add.rectangle(x, y, w, 26, 0, 0).setOrigin(0).setInteractive({ useHandCursor: true }); z.on('pointerup', () => { RICH.cat = k; this.richRebuild(); });
            root.add([cg, this.add.image(x + 14, y + 13, Icons.tex(this, CAT_IC[n] || 'gear')).setDisplaySize(16, 16), this.rT(x + 28, y + 13, n, 11, on ? '#fff3d0' : '#cdbb95', { bold: true }).setOrigin(0, .5), z]); });
        const ox = R.x + 162, ow = R.x + R.w - 18 - ox; let y = R.y + 48;
        if (RICH.cat >= G2.length) {
            root.add(this.rT(ox, y, 'Klávesy a ovládač', 13, '#f6ecd6', { title: true })); root.add(this.rT(ox, y + 22, 'Zmena kláves pre pohyb, útok, kryt a rozkazy, ovládač a myš.', 10, '#bfae8c', { italic: true, wrap: ow }));
            root.add(this.rBtn(ox, y + 50, 200, 24, 'Nastaviť klávesy…', () => ctrl.click(), { main: true, icon: 'gear' })); this.dlgButtons.push(ctrl);
        } else {
            const items = G2[RICH.cat].items, rh = Math.min(38, (R.y + R.h - 50 - y) / items.length);
            items.forEach((itm, k) => {
                const v = '' + itm.v(), ry = y + k * rh, b = bs.find(x => x.textContent.trim().startsWith(itm.l + ':'));
                if (k) g.lineStyle(.5, 0xe6c37a, .14).lineBetween(ox, ry - 2, ox + ow, ry - 2);
                root.add(this.rT(ox, ry + 2, itm.l, 11, '#f6ecd6', { bold: true }));
                const tip = (itm.tip || '').split(/(?<=\.)\s/)[0]; const tt = this.rT(ox, ry + 17, tip.length > 92 ? tip.slice(0, 90) + '…' : tip, 8.4, '#bfae8c', { italic: true }); if (tt.width > ow - 150) tt.setScale((ow - 150) / tt.width); root.add(tt);
                const cxr = ox + ow, cyr = ry + rh / 2 - 2, yes = /^(áno|zapnut)/.test(v), no = /^(nie|vypnut)/.test(v);
                if (yes || no) { g.fillStyle(yes ? 0x8a5a1c : 0x000000, yes ? 1 : .5).fillRoundedRect(cxr - 38, cyr - 9, 38, 18, 9); g.lineStyle(1, yes ? 0xf0cf80 : 0xe6c37a, yes ? 1 : .45).strokeRoundedRect(cxr - 38, cyr - 9, 38, 18, 9); g.fillStyle(yes ? 0xfff3d0 : 0x8a7a60, 1).fillCircle(yes ? cxr - 9 : cxr - 29, cyr, 6.5); }
                else if (/%$/.test(v)) { const f = parseInt(v, 10) / 100; this.rBar(g, cxr - 140, cyr - 3, 104, 6, f, 0x8a5a1c, 0xe6c37a); g.fillStyle(0xfff3d0, 1).fillCircle(cxr - 140 + 104 * f, cyr, 6); root.add(this.rT(cxr, cyr, v, 10, '#f0d690', { bold: true }).setOrigin(1, .5)); }
                else { const vt = this.rT(0, 0, v, 10, '#fff3d0', { bold: true }), w = vt.width + 34; g.fillGradientStyle(0x8a5a1c, 0x8a5a1c, 0x5a3a10, 0x5a3a10, 1, 1, 1, 1).fillRect(cxr - w, cyr - 9, w, 18); g.lineStyle(1, 0xf0cf80, .9).strokeRoundedRect(cxr - w, cyr - 9, w, 18, 9); root.add([vt.setPosition(cxr - w / 2 - vt.width / 2, cyr - vt.height / 2), this.rT(cxr - w + 6, cyr, '‹', 11, '#f0d690', { bold: true }).setOrigin(0, .5), this.rT(cxr - 6, cyr, '›', 11, '#f0d690', { bold: true }).setOrigin(1, .5)]); }
                if (b) { const z = this.add.rectangle(ox, ry, ow, rh - 2, 0, 0).setOrigin(0).setInteractive({ useHandCursor: true }); z.on('pointerup', () => b.click()); this.rTip(root, z, itm.tip || itm.l); root.add(z); this.dlgButtons.push(b); }
            });
        }
        if (exit) { root.add(this.rBtn(R.x + R.w - 132, R.y + R.h - 34, 118, 24, exit.textContent.trim(), () => exit.click(), { main: true, icon: 'back' })); this.dlgButtons.push(exit); }
        return true;
    },

    // ---------- spoločné pomôcky pre vlastné obrazovky ----------
    /** Ikona HTML tlačidla: plátno veci/vojaka/ikony, alebo ikona podľa textu. */
    rBtnIcon(k) { const ik = this.iconFor(k); if (ik) return ik; const dn = Icons.forDialog(k.textContent.trim()); return dn ? Icons.tex(this, dn) : null; },
    /** Názov ikony rozhrania pre tlačidlo (podľa textu), predvolene meč. */
    rBtnIconName(k) { return Icons.forDialog(k.textContent.trim()) || 'sword'; },
    /** Panel okna s vlastnou veľkosťou (rovnaký rám ako rWin). */
    rPanel(root, x, y, w, h, exit, shade = true) {
        if (shade) root.add(this.add.rectangle(0, 0, W, H, 0x050302, .55).setOrigin(0).setInteractive());
        const g = this.add.graphics();
        g.fillStyle(0x000000, .5).fillRoundedRect(x + 2, y + 5, w, h, 8);
        g.fillGradientStyle(0x1e1610, 0x1e1610, 0x0e0a07, 0x0e0a07, .97, .97, .98, .98).fillRect(x + 3, y + 3, w - 6, h - 6);
        g.lineStyle(1, 0xe6c37a, .6).strokeRoundedRect(x, y, w, h, 7); g.lineStyle(3, 0x0a0704, .9).strokeRoundedRect(x - 2.5, y - 2.5, w + 5, h + 5, 9); g.lineStyle(.6, 0xe6c37a, .25).strokeRoundedRect(x - 4.5, y - 4.5, w + 9, h + 9, 10);
        root.add(g);
        if (exit) root.add(this.rRound(x + w - 18, y + 18, 11, null, '✕', () => exit.click()));
        return { x, y, w, h };
    },
    /** Posúvateľná oblasť: vráti kontajner obsahu (y relatívne k oblasti); rScrollEnd nastaví výšku a posuvník. */
    rScroll(x, y, w, h) {
        const c = this.add.container(x, y), mk = this.make.graphics({ add: false }); mk.fillStyle(0xffffff).fillRect(x - 6, y, w + 12, h); c.setMask(mk.createGeometryMask());
        this._rs = { content: c, mask: mk, px: x, py: y - 20, PW: w + 20, vy0: y, vy1: y + h, maxH: h, bar: this.add.graphics(), CH: 0, scroll: 0 };
        return c;
    },
    rScrollEnd(root, c, CH) { const r = this._rs; r.CH = CH; root.add([c, r.bar]); },
    /** Nadpis okna: medailón s ikonou (alebo portrét z okna), názov a text; vráti y pod hlavičkou. */
    rHead(root, R, title, text, exitless) {
        const por = ov.querySelector('canvas.por'), pk = por && por.dataset.key, ic = this.dlgIcon(title), g = this.add.graphics(); root.add(g);
        const cx = R.x + 42, cy = R.y + 42;
        g.fillStyle(0x000000, .55).fillCircle(cx, cy + 1, 27); g.fillStyle(0x2a1c10, 1).fillCircle(cx, cy, 26); g.lineStyle(1.6, 0xe6c37a, .9).strokeCircle(cx, cy, 27); g.lineStyle(.7, 0xe6c37a, .35).strokeCircle(cx, cy, 31);
        if (pk) { if (!this.textures.exists(pk)) this.textures.addCanvas(pk, por); root.add(this.add.image(cx, cy, pk).setDisplaySize(50, 50)); }
        else root.add(this.add.image(cx, cy, Icons.tex(this, ic)).setDisplaySize(34, 34));
        root.add(this.rT(R.x + 84, R.y + 14, title, 23, '#f6ecd6', { title: true }));
        const t = this.rT(R.x + 84, R.y + 46, text || '', 10.5, '#d8c8a4', { wrap: R.w - 130, italic: /^\s*„/.test(text || '') }); root.add(t);
        const yb = Math.max(R.y + 82, R.y + 46 + t.height + 8);
        g.fillGradientStyle(0xe6c37a, 0xe6c37a, 0xe6c37a, 0xe6c37a, .7, 0, .7, 0).fillRect(R.x + 14, yb, R.w - 28, 1.2);
        return yb + 8;
    },

    // ---------- 5. obchod a kováč: karty vecí ----------
    richShop(root) {
        const h1 = ov.querySelector('h1'), title = h1 ? h1.textContent : '', text = [...ov.querySelectorAll(':scope > p')].map(p => p.textContent).join(' ');
        const exit = this.exitButton(), bs = this.htmlButtons().filter(b => b !== exit); if (!bs.length || bs.length > 60) return false;
        const R = this.rWin(root, exit), top = this.rHead(root, R, title, text);
        const cols = +ov.dataset.cols || 3, gap = 8, cw = (R.w - 28 - gap * (cols - 1) - 12) / cols, chh = 64, y0 = top + 4, h = R.y + R.h - 46 - y0, content = this.rScroll(R.x + 14, y0, R.w - 28 - 12, h);
        bs.forEach((b, k) => {
            const label = b.textContent.trim(), parts = label.split(' · ').map(s => s.trim()); let name = parts[0], sub = [], price = null, state = null;
            const m = /^(.*?) \((.*)\)$/.exec(name); if (m) { name = m[1]; sub.push(m[2]); }
            for (const q of parts.slice(1)) { if (/^[\d\s]+ zl\.?$/.test(q)) price = q; else if (/nosíš/i.test(q)) state = 'nosíš'; else if (/^máš/.test(q)) state = 'máš'; else sub.push(q); }
            const x = (k % cols) * (cw + gap), y = Math.floor(k / cols) * (chh + gap), off = b.disabled, tg = this.add.graphics(), parts2 = [tg];
            const draw = hov => { tg.clear(); tg.setY(hov && !off ? -2 : 0); this.rCard(tg, x, y, cw, chh, { hot: hov && !off || state === 'nosíš', c1: state === 'nosíš' ? 0x3a2810 : undefined }); };
            draw(false);
            const ik = this.rBtnIcon(b); tg.fillStyle(0x000000, .45).fillRoundedRect(x + 6, y + 8, 48, 48, 6); tg.lineStyle(.8, 0xe6c37a, .45).strokeRoundedRect(x + 6, y + 8, 48, 48, 6);
            if (ik) parts2.push(this.add.image(x + 30, y + 32, ik).setDisplaySize(38, 38));
            const nm = this.rT(x + 62, y + 8, name, 10.5, '#f6ecd6', { bold: true, wrap: cw - 70 }); if (nm.height > 28) nm.setScale(.9); parts2.push(nm);
            if (sub.length) parts2.push(this.rT(x + 62, y + 8 + Math.min(nm.height, 28) + 1, sub.join(' · '), 8.8, '#cdbb95', { wrap: cw - 70 }));
            const chip = (s, col, tc, ix) => { const t = this.rT(0, 0, s, 8.6, tc, { bold: true, shadow: false }), w = t.width + 12; parts2.push(this.add.graphics().fillStyle(col, 1).fillRoundedRect(x + cw - w - 6, y + chh - 19, w, 13, 6.5), t.setPosition(x + cw - w, y + chh - 12.5 - t.height / 2)); };
            if (state === 'nosíš') chip('NOSÍŠ', 0xe6c37a, '#2a1a04'); else if (state === 'máš') chip('MÁŠ · OBLIECŤ', 0x5a8a3a, '#f0ffe0'); else if (price) chip(price.replace(/\s*zl\.?$/, '') + ' zl.', off ? 0x7a3a2a : 0xd9a441, off ? '#ffe0d0' : '#2a1a04');
            if (off) parts2.forEach(o => o.setAlpha && o.setAlpha(.5));
            if (!off) { const z = this.add.rectangle(x, y, cw, chh, 0, 0).setOrigin(0).setInteractive({ useHandCursor: true }); z.on('pointerover', () => { draw(true); if (typeof uiSnd === 'function') uiSnd('hover'); }); z.on('pointerout', () => draw(false)); z.on('pointerup', () => { if (this.drag && this.drag.moved) return; if (typeof uiSnd === 'function') uiSnd('click'); b.click(); }); parts2.push(z); }
            content.add(parts2); this.dlgButtons.push(b);
        });
        this.rScrollEnd(root, content, Math.ceil(bs.length / cols) * (chh + gap));
        if (exit) { root.add(this.rBtn(R.x + R.w - 150, R.y + R.h - 36, 134, 26, exit.textContent.trim(), () => exit.click(), { main: true, icon: 'back', size: 12 })); this.dlgButtons.push(exit); }
        return true;
    },

    // ---------- 6. prehľad sekcií (úlohy, kronika, štatistiky, trofeje, úspechy, denník) ----------
    richSections(root) {
        const h1 = ov.querySelector('h1'), title = h1 ? h1.textContent : '', text = [...ov.querySelectorAll(':scope > p')].map(p => p.textContent).join(' ');
        const bt = ov.querySelector('#bt'), exit = this.exitButton(), secs = []; let cur = null;
        const ensure = () => cur || (secs.push(cur = { head: '', lines: [], btns: [] }), cur);
        for (const k of [...bt.children]) {
            if (k.tagName === 'BUTTON') { if (k !== exit) ensure().btns.push(k); }
            else if (k.dataset.kind === 'gold') secs.push(cur = { head: k.textContent.trim(), lines: [], btns: [], ic: this.iconFor(k) });
            else if (k.textContent.trim()) ensure().lines.push([k.textContent.trim(), k.dataset.kind, this.iconFor(k)]);
        }
        if (!secs.length && !text) return false;
        const R = this.rWin(root, exit), top = this.rHead(root, R, title, text), y0 = top + 4, h = R.y + R.h - 46 - y0, cw = R.w - 28 - 12, content = this.rScroll(R.x + 14, y0, cw, h);
        let y = 0;
        if (!secs.length) content.add(this.rT(8, 8, 'Zatiaľ tu nič nie je.', 11, '#a8987c', { italic: true }));
        secs.forEach(s => {
            const pieces = [], body = s.lines.map(l => l[0]).join('\n'), hasHead = !!s.head;
            const ht = hasHead ? this.rT(14, y + 9, s.head, 11.5, '#e6c37a', { bold: true, wrap: cw - 28 }) : null, tb = body ? this.rT(14, y + (hasHead ? 12 + ht.height : 9), body, 10, '#e6dabf', { wrap: cw - 28, ls: 2 }) : null;
            const pw = s.btns.map(b => Math.min(cw - 28, 40 + b.textContent.trim().length * 5.4)), rowsB = []; { let cx0 = 0, rr = 0; s.btns.forEach((b, i) => { if (cx0 && cx0 + pw[i] > cw - 28) { rr++; cx0 = 0; } rowsB.push([cx0, rr]); cx0 += pw[i] + 6; }); }
            const bh = s.btns.length ? (rowsB.length ? rowsB[rowsB.length - 1][1] + 1 : 0) * 27 + 2 : 0, ch = (hasHead ? 12 + ht.height : 9) + (tb ? tb.height + 6 : 0) + bh + 9, g = this.add.graphics(); this.rCard(g, 0, y, cw, ch); g.fillStyle(0xe6c37a, .8).fillRect(0, y + 6, 3, ch - 12);
            content.add([g]); if (ht) content.add(ht); if (tb) content.add(tb);
            const by0 = y + ch - 9 - bh + 2; s.btns.forEach((b, i) => { const lab = b.textContent.trim(), bw = pw[i]; content.add(this.rBtn(14 + rowsB[i][0], by0 + rowsB[i][1] * 27, bw, 22, lab, () => b.click(), { off: b.disabled, size: 9.5, icon: this.rBtnIconName(b) })); this.dlgButtons.push(b); });
            y += ch + 8;
        });
        this.rScrollEnd(root, content, y);
        if (exit) { root.add(this.rBtn(R.x + R.w - 150, R.y + R.h - 36, 134, 26, exit.textContent.trim(), () => exit.click(), { main: true, icon: 'back', size: 12 })); this.dlgButtons.push(exit); }
        return true;
    },

    // ---------- 7. udalosť: filmová karta s ilustráciou ----------
    richEvent(root) {
        const h1 = ov.querySelector('h1'), title = h1 ? h1.textContent : '', text = [...ov.querySelectorAll(':scope > p')].map(p => p.textContent).join('\n\n');
        const bt = ov.querySelector('#bt'), kids = [...bt.children], bs = kids.filter(k => k.tagName === 'BUTTON'), rows = kids.filter(k => k.tagName !== 'BUTTON' && k.textContent.trim()).map(k => k.textContent.trim());
        if (!bs.length || bs.length > 6 || /^List /.test(title)) return false;
        const PW2 = 620, art = 188, tw = PW2 - art - 34, ic = this.dlgIcon(title), quote = /^\s*„/.test(text);
        const tt = this.rT(0, 0, title, 21, '#f6ecd6', { title: true, wrap: tw }), tb = this.rT(0, 0, text, 11.5, quote ? '#f2e4bf' : '#e6dabf', { wrap: tw, italic: quote, ls: 3 }), rb = rows.length ? this.rT(0, 0, rows.join('\n'), 10, '#cdbb95', { wrap: tw, ls: 2 }) : null;
        const bh = bs.map(b => b.textContent.trim().length > 54 ? 40 : 30), ph = 18 + tt.height + 8 + tb.height + (rb ? rb.height + 8 : 0) + 12 + bh.reduce((a, b) => a + b + 6, 0) + 14, H2 = Math.max(250, ph);
        if (H2 > H - 20) { [tt, tb, rb].forEach(o => o && o.destroy()); return false; }
        const px = (W - PW2) / 2, py = (H - H2) / 2, R = this.rPanel(root, px, py, PW2, H2, null), g = this.add.graphics(); root.add(g);
        // ilustrácia vľavo: obloha podľa dennej doby, siluety hôr, veľký medailón s ikonou
        const nn = nightness(), sky1 = nn > .5 ? 0x0c1430 : 0x2a3a5a, sky2 = nn > .5 ? 0x2a2a48 : 0xc87a4a, ax = px + 3, ay = py + 3, ah = H2 - 6;
        g.fillGradientStyle(sky1, sky1, sky2, sky2, 1, 1, 1, 1).fillRect(ax, ay, art, ah);
        if (nn < .5) { g.fillStyle(0xfff0c0, .25).fillCircle(ax + art * .7, ay + ah * .62, 34); g.fillStyle(0xfff0c0, .4).fillCircle(ax + art * .7, ay + ah * .62, 18); } else { g.fillStyle(0xffffff, .8); for (let k = 0; k < 24; k++) g.fillRect(ax + (k * 37 % art), ay + (k * 53 % (ah * .5)), 1, 1); g.fillStyle(0xfff4d0, .9).fillCircle(ax + art * .7, ay + 30, 8); }
        const ridge = (yb, amp, col, a, seed) => { const pts = [{ x: ax, y: ay + ah }]; for (let k = 0; k <= 8; k++) pts.push({ x: ax + k * art / 8, y: ay + ah * yb - (Math.sin(k * 1.9 + seed) * .5 + .5) * amp }); pts.push({ x: ax + art, y: ay + ah }); g.fillStyle(col, a).fillPoints(pts, true); };
        ridge(.78, 50, 0x3a3040, .6, H2 % 7); ridge(.9, 26, 0x1a1410, .9, H2 % 5);
        const cx = ax + art / 2, cy = ay + ah * .4; for (let r = 5; r >= 1; r--) g.fillStyle(0xe6c37a, .05 * (6 - r) / 2).fillCircle(cx, cy, 24 + r * 9);
        const por = ov.querySelector('canvas.por'), pk = por && por.dataset.key;
        if (pk) { if (!this.textures.exists(pk)) this.textures.addCanvas(pk, por); g.fillStyle(0x000000, .55).fillRoundedRect(cx - 44, cy - 42, 88, 88, 6); g.lineStyle(2, 0xe6c37a, .9).strokeRoundedRect(cx - 43, cy - 43, 86, 86, 6); g.lineStyle(.7, 0xe6c37a, .4).strokeRoundedRect(cx - 47, cy - 47, 94, 94, 8); root.add(this.add.image(cx, cy, pk).setDisplaySize(82, 82)); }
        else { g.fillStyle(0x000000, .5).fillCircle(cx, cy + 1, 38); g.fillStyle(0x2a1c10, 1).fillCircle(cx, cy, 37); g.lineStyle(2, 0xe6c37a, .9).strokeCircle(cx, cy, 38); g.lineStyle(.7, 0xe6c37a, .4).strokeCircle(cx, cy, 43); root.add(this.add.image(cx, cy, Icons.tex(this, ic)).setDisplaySize(52, 52)); }
        const fade = this.add.graphics(); fade.fillGradientStyle(0x0e0a07, 0x0e0a07, 0x0e0a07, 0x0e0a07, 0, .95, 0, .95).fillRect(ax + art - 40, ay, 40, ah); root.add(fade);
        const x0 = px + art + 20; let y = py + 18;
        tt.setPosition(x0, y); root.add(tt); y += tt.height + 4; g.fillGradientStyle(0xe6c37a, 0xe6c37a, 0xe6c37a, 0xe6c37a, .7, 0, .7, 0).fillRect(x0, y, tw, 1.2); y += 8;
        tb.setPosition(x0, y); root.add(tb); y += tb.height + 8; if (rb) { rb.setPosition(x0, y); root.add(rb); y += rb.height + 8; }
        y += 4;
        bs.forEach((b, i) => {
            const exitB = UI_EXIT.test(b.textContent.trim()), h = bh[i], off = b.disabled, cg = this.add.graphics(), ik = this.rBtnIcon(b), label = b.textContent.trim(), parts = [cg], by = y;
            const draw = hov => { cg.clear(); cg.setY(hov && !off ? -1.5 : 0); this.rCard(cg, x0, by, tw, h, { hot: hov && !off, c1: exitB ? 0x6a4614 : undefined, c2: exitB ? 0x3a2408 : undefined }); }; draw(false);
            if (ik) parts.push(this.add.image(x0 + 18, by + h / 2, ik).setDisplaySize(22, 22));
            const t = this.rT(x0 + (ik ? 36 : 12), by + h / 2, label, 11, off ? '#8a7a60' : exitB ? '#fff3d0' : '#f0d690', { bold: true, wrap: tw - (ik ? 46 : 22) }).setOrigin(0, .5); parts.push(t);
            if (off) parts.forEach(o => o.setAlpha && o.setAlpha(.5));
            if (!off) { const z = this.add.rectangle(x0, by, tw, h, 0, 0).setOrigin(0).setInteractive({ useHandCursor: true }); z.on('pointerover', () => { draw(true); if (typeof uiSnd === 'function') uiSnd('hover'); }); z.on('pointerout', () => draw(false)); z.on('pointerup', () => { if (typeof uiSnd === 'function') uiSnd('click'); b.click(); }); parts.push(z); }
            root.add(parts); this.dlgButtons.push(b); y += h + 6;
        });
        return true;
    }
});
