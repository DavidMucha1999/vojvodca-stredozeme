/*
 * ENGINE: rozhranie v Phaseri.
 *
 * Herné menu sú naďalej napísané v js/ui (funkcie show/btn vytvárajú HTML).
 * Táto scéna ich „zrkadlí“: prečíta HTML okna, hornej lišty a panelov
 * a nakreslí ich v Phaseri. Kliknutie na tlačidlo v Phaseri klikne na pôvodné
 * HTML tlačidlo, takže herná logika sa nemení. Okná s formulármi a obrázkami
 * (úvod, korunovácia, encyklopédia) ostávajú v HTML.
 *
 * Okrem toho kreslí: oznámenia, pauzu, noc, počasie, zdravie hrdinu, bránu,
 * popisky pri myši a legendu mapy. Scéna tiež posúva herný čas (tm).
 */
const UI_C = { ink: '#ecdfc6', gold: '#d9a441', dim: '#9a8c78', panel: 0x1c1510, panel2: 0x2c2018, line: 0xd9a441, btn: 0xd9a441, btnHover: 0xf0c060, btnOff: 0x4a4036 };
/** Tlačidlá, ktorými sa okno zatvára (v dlhých oknách sú vždy viditeľné dole). */
const UI_EXIT = /^(Späť|Odísť|Zavrieť|Pokračovať|Rozumiem|Na cestu)/;
const TITLE_FONT = '"Uncial Antiqua", Georgia, serif';

class UIScene extends Phaser.Scene {
    constructor() { super('UI'); }

    create() {
        this.cameras.main.setZoom(RES).setOrigin(0, 0);
        sfxScene = this;                         // zvuky a prelínanie hudby bežia v tejto scéne
        this.g = this.add.graphics().setDepth(1);
        const t = (x, y, s, size, color, extra) => this.add.text(x, y, s, txtStyle(size, color, extra));
        this.toast = t(W / 2, 77, '', 15, UI_C.gold, { backgroundColor: 'rgba(18,14,12,.88)', padding: { x: 12, y: 4 } }).setOrigin(.5).setDepth(50);
        this.pause = t(W / 2, H - 92, 'Pauza: klikni na mapu alebo sa utábor, aby čas plynul', 15, '#ffd24a', { backgroundColor: 'rgba(18,14,12,.85)', padding: { x: 10, y: 3 } }).setOrigin(.5).setDepth(5);
        this.gateTxt = t(W / 2, 132, '', 13, UI_C.ink, { fontFamily: 'sans-serif', stroke: '#000', strokeThickness: 3 }).setOrigin(.5).setDepth(5);
        this.hudLayer = this.add.container(0, 0).setDepth(10);
        this.barLayer = this.add.container(0, 0).setDepth(20);
        this.tipLayer = this.add.container(0, 0).setDepth(30);
        this.legLayer = this.add.container(0, 0).setDepth(25);
        this.dlg = null; this.sig = {};
        document.body.classList.add('phaser-ui');
        this.input.keyboard.on('keydown-ESC', () => this.dialogKey('esc'));
        this.input.keyboard.on('keydown', e => { if (this.dlg && e.key >= '1' && e.key <= '9') this.dialogKey(+e.key); });
        this.input.on('wheel', (p, o, dx, dy) => { if (this.dlg) this.scrollDialog(dy); });
        // posúvanie dlhého okna ťahaním myšou alebo prstom
        this.input.on('pointerdown', p => { const d = this.dlg; this.drag = d && d.CH > d.maxH ? { y: p.y, s: d.scroll, moved: false } : null; });
        this.input.on('pointermove', p => {
            const g = this.drag; if (!g || !p.isDown || !this.dlg) return;
            const dy = (p.y - g.y) / RES;
            if (Math.abs(dy) > 5) g.moved = true;
            if (g.moved) this.scrollDialog(g.s - dy, true, true);
        });
        this.input.on('pointerup', () => this.time.delayedCall(0, () => { this.drag = null; }));
        const keyScroll = { ArrowDown: 40, ArrowUp: -40, PageDown: 300, PageUp: -300, End: 1e5, Home: -1e5 };
        this.input.keyboard.on('keydown', e => { if (this.dlg && keyScroll[e.key] && this.dlg.CH > this.dlg.maxH) this.scrollDialog(keyScroll[e.key], true); });
    }

    update(time, delta) {
        const dt = Math.min(2, delta / 16.67);
        tm += dt;
        const scene = this.scene.isActive('Battle') ? 'battle' : this.scene.isActive('Map') ? 'map' : 'intro';
        this.drawOverlay(scene, dt);
        this.syncHud();
        this.syncBars();
        this.syncDialog();
        this.drawTooltip(scene);
        this.drawLegend(scene);
    }

    // ---------- Prekryvné efekty ----------------------------------------------------
    drawOverlay(scene, dt) {
        const g = this.g; g.clear();
        if (TS && TS.l > 0 && G) { TS.l -= dt; this.toast.setVisible(true).setText(TS.s).setAlpha(Math.min(1, TS.l / 40)); }
        else this.toast.setVisible(false);
        this.pause.setVisible(scene === 'map' && mode === 'map' && !!PAUSE && !this.dlg);
        if (scene === 'map') {
            g.fillStyle(0x080e28, .18 * (.5 - .5 * Math.cos(dayT / 600 * 6.283))).fillRect(0, 0, W, H);
            const se = G ? Math.floor(G.day / 10) % 4 : 0;
            if (se === 2) g.fillStyle(0xc86e1e, .1).fillRect(0, 0, W, H);
            if (se === 3) { g.fillStyle(0xdce6ff, .14).fillRect(0, 0, W, H); g.fillStyle(0xffffff, 1); for (let k = 0; k < 70; k++) g.fillRect((k * 113 + tm * .8 + Math.sin(tm / 30 + k) * 10) % W, (k * 71 + tm * 1.6) % H, 1.5, 1.5); }
            if (G && G.day % 5 === 0) { g.lineStyle(1, 0xb4c8e6, .35); for (let k = 0; k < 90; k++) { const x = (k * 97 + tm * 6) % W, y = (k * 53 + tm * 14) % H; g.lineBetween(x, y, x - 3, y + 10); } }
            g.lineStyle(3, UI_C.line, 1).strokeRect(MM.x - 1.5, MM.y - 1.5, MM.w + 3, MM.h + 3);
        }
        this.gateTxt.setVisible(false);
        if (scene === 'battle' && U && U[0]) {
            if (WX.n === 'rain') { g.lineStyle(1, 0xb4c8e6, .4); for (let k = 0; k < 120; k++) { const x = (k * 89 + tm * 7) % W, y = (k * 61 + tm * 16) % H; g.lineBetween(x, y, x - 3, y + 11); } }
            if (WX.n === 'snow') { g.fillStyle(0xffffff, 1); for (let k = 0; k < 110; k++) g.fillRect((k * 97 + tm * .9 + Math.sin(tm / 25 + k) * 12) % W, (k * 59 + tm * 1.8) % H, 2, 2); }
            if (WX.n === 'fog') g.fillStyle(0xbec8d2, .38).fillRect(0, 0, W, H);
            const h = U[0];
            g.fillStyle(0x000000, .55).fillRect(W / 2 - 82, 58, 164, 10);
            g.fillStyle(0xb8402a, 1).fillRect(W / 2 - 80, 60, 160 * Math.max(0, h.hp) / h.mh, 6);
            if (SGB) {
                g.fillStyle(0x000000, .6).fillRect(W / 2 - 82, 114, 164, 8);
                g.fillStyle(0xc08a3a, 1).fillRect(W / 2 - 80, 116, 160 * Math.max(0, SGB.gate) / SGB.mg, 4);
                this.gateTxt.setVisible(true).setText(SGB.gate > 0 ? 'Brána hradu' : 'Brána je zničená!');
            }
        }
    }

    // ---------- Horná lišta (zrkadlo #hud) -----------------------------------------
    syncHud() {
        const on = !!G && hud.style.visibility !== 'hidden' && !ov.classList.contains('intro');
        const sig = on ? hud.innerHTML : '';
        if (sig === this.sig.hud) return;
        this.sig.hud = sig;
        this.hudLayer.removeAll(true);
        if (!on) return;
        let x = 10, y = 6;
        const items = [];
        for (const span of hud.children) {
            const val = span.querySelector('b');                 // nulové položky (napr. Elfovia 0) lištu zbytočne zahlcujú
            if (val && val.textContent.trim() === '0' && !/Zlato|Sláva/.test(span.textContent)) continue;
            const parts = [];
            span.childNodes.forEach(n => { const s = n.textContent; if (s.trim()) parts.push([s, n.nodeName === 'B' ? (span.style.color || UI_C.gold) : (span.style.color || UI_C.ink)]); });
            const texts = parts.map(([s, c]) => this.add.text(0, 0, s.replace(/\s+/g, ' '), txtStyle(13, c)));
            const w = texts.reduce((a, t) => a + t.width, 0);
            if (x + w > W - 10 && x > 10) { x = 10; y += 19; }
            let xx = x; texts.forEach(t => { t.setPosition(xx, y); xx += t.width; });
            items.push(...texts); x += w + 14;
        }
        const bg = this.add.graphics();
        bg.fillStyle(0x120e0c, .88).fillRect(0, 0, W, y + 22);
        bg.lineStyle(1, 0x6a5a46, 1).lineBetween(0, y + 22, W, y + 22);
        this.hudLayer.add([bg, ...items]);
    }

    // ---------- Panel tlačidiel a rozkazy (zrkadlo tb a od) --------------------------
    syncBars() {
        const vis = el => el.style.display !== 'none' && !!G && !this.dlg;
        const sig = [vis(tb), vis(od), ...[...tb.children, ...od.children].map(b => b.textContent + (b.style.opacity || ''))].join('|');
        if (sig === this.sig.bars) return;
        this.sig.bars = sig;
        this.barLayer.removeAll(true);
        if (vis(tb)) {
            let x = 8, y = H - 30;
            const rows = [];
            [...tb.children].forEach(b => {
                const w = Math.max(24, this.measure(b.textContent, 12) + 14);
                if (x + w > W * .68) { x = 8; y -= 28; }
                rows.push(this.button(x, y, w, 24, b.textContent, () => b.click(), { size: 12 }));
                x += w + 4;
            });
            this.barLayer.add(rows.flat());
        }
        if (vis(od)) {
            const bs = [...od.children], w = 76, x0 = W / 2 - (bs.length * (w + 4)) / 2;
            bs.forEach((b, i) => this.barLayer.add(this.button(x0 + i * (w + 4), H - 30, w, 24, b.textContent, () => b.click(), { size: 12, alpha: +(b.style.opacity || 1) })));
        }
    }

    measure(s, size) { const t = this.add.text(0, 0, s, txtStyle(size, '#fff')); const w = t.width; t.destroy(); return w; }

    /** Tlačidlo v štýle hry; vráti pole objektov. */
    button(x, y, w, h, label, fn, o = {}) {
        const off = !!o.disabled, size = o.size || 14;
        const r = this.add.rectangle(x, y, w, h, off ? UI_C.btnOff : UI_C.btn).setOrigin(0).setStrokeStyle(1, 0x5a3a12, .8).setAlpha(o.alpha ?? 1);
        const iw = o.icon ? 34 : 0;
        const t = this.add.text(x + iw + (w - iw) / 2, y + h / 2, label, txtStyle(size, off ? UI_C.dim : '#1a120a', { align: 'center', wordWrap: { width: w - 12 - iw, useAdvancedWrap: true } })).setOrigin(.5);
        const out = [r, t];
        if (o.icon) {
            const ib = this.add.rectangle(x + 4, y + h / 2, 30, 30, 0xf4e6c4, off ? .35 : .55).setOrigin(0, .5).setStrokeStyle(1, 0x5a3a12, .6);
            const im = this.add.image(x + 19, y + h / 2, o.icon).setDisplaySize(28, 28).setAlpha(off ? .75 : 1);
            out.push(ib, im);
        }
        if (!off && fn) {
            r.setInteractive({ useHandCursor: true });
            r.on('pointerover', () => r.setFillStyle(UI_C.btnHover));
            r.on('pointerout', () => r.setFillStyle(UI_C.btn));
            r.on('pointerup', () => { if (!(this.drag && this.drag.moved)) fn(); });
        }
        return out;
    }

    // ---------- Okná (zrkadlo #ov) ---------------------------------------------------
    mirrorable() {
        return G && !ov.classList.contains('hide') && !ov.classList.contains('intro') && !ov.classList.contains('encv')
            && !ov.querySelector('input,select,img,.enc,.egrid');
    }

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
    }

    buildDialog(scroll) {
        const PW = 620, IW = PW - 40, root = this.add.container(0, 0).setDepth(40);
        const shade = this.add.rectangle(0, 0, W, H, 0x0c0907, .72).setOrigin(0).setInteractive();
        const h1 = ov.querySelector('h1'), title = h1 ? h1.textContent : '';
        const bt = ov.querySelector('#bt'), kids = bt ? [...bt.children] : [];
        const nBtn = kids.filter(k => k.tagName === 'BUTTON').length, cols = nBtn > 8 ? 3 : 2, bw = (IW - (cols - 1) * 8) / cols;
        this.dlgButtons = [];
        // rozloženie obsahu okna (nadpis, text, tlačidlá a riadky) od y = 0
        const layout = list => {
            const items = [];
            let y = 0, col = 0, rowH = 0;
            if (title) { const t = this.add.text(PW / 2, y, title, txtStyle(26, UI_C.gold, { fontFamily: TITLE_FONT, align: 'center', wordWrap: { width: IW } })).setOrigin(.5, 0); items.push(t); y += t.height + 8; }
            ov.querySelectorAll(':scope > p').forEach(p => {
                if (!p.textContent.trim()) return;
                const t = this.add.text(PW / 2, y, p.textContent, txtStyle(15, p.style.color ? UI_C.gold : UI_C.ink, { align: 'center', lineSpacing: 3, wordWrap: { width: IW } })).setOrigin(.5, 0);
                items.push(t); y += t.height + 8;
            });
            y += 4;
            const flush = () => { if (col) { y += rowH + 6; col = 0; rowH = 0; } };
            list.forEach(k => {
                if (k.tagName === 'BUTTON') {
                    const parts = this.dialogButton(k, 20 + col * (bw + 8), y, bw, () => this.inDialog());
                    items.push(...parts);
                    rowH = Math.max(rowH, parts.h); col++;
                    if (col === cols) flush();
                } else {
                    flush();
                    const t = this.add.text(20, y, k.textContent, txtStyle(13.5, k.style.opacity && +k.style.opacity < 1 ? UI_C.dim : UI_C.ink, { wordWrap: { width: IW - 26 } }));
                    items.push(t); y += t.height + 4;
                }
            });
            flush();
            return { items, CH: y };
        };
        const maxH = H - 70;
        let L = layout(kids), foot = [];
        if (L.CH > maxH) {
            // dlhé okno: tlačidlá na odchod (Späť, Zavrieť…) budú vždy viditeľné dole
            let n = kids.length;
            while (n > 0 && kids[n - 1].tagName === 'BUTTON' && UI_EXIT.test(kids[n - 1].textContent.trim())) n--;
            foot = kids.slice(n);
            if (foot.length) { L.items.forEach(o => o.destroy()); this.dlgButtons = []; L = layout(kids.slice(0, n)); }
        }
        const footH = foot.length ? 42 : 0, viewH = Math.min(L.CH, maxH - footH), CH = L.CH;
        const PH = viewH + 40 + footH, px = (W - PW) / 2, py = Math.max(30, (H - PH) / 2);
        const panel = this.add.graphics();
        panel.fillStyle(UI_C.panel, .97).fillRoundedRect(px, py, PW, PH, 6);
        panel.lineStyle(2, UI_C.line, 1).strokeRoundedRect(px, py, PW, PH, 6);
        panel.lineStyle(1, UI_C.line, .35).strokeRoundedRect(px + 5, py + 5, PW - 10, PH - 10, 4);
        const content = this.add.container(0, 0);
        content.add(L.items);
        content.setPosition(px, py + 20 - scroll);
        root.add([shade, panel, content]);
        const maskG = this.make.graphics({ add: false });
        maskG.fillStyle(0xffffff).fillRect(px, py + 14, PW, viewH + 12);
        const d = this.dlg = { root, content, mask: maskG, px, py, PW, PH, CH, maxH: viewH, scroll: 0, title, vy0: py + 14, vy1: py + 26 + viewH };
        if (foot.length) {
            const fy = py + 26 + viewH + 6, fw = (IW - (foot.length - 1) * 8) / foot.length;
            panel.lineStyle(1, UI_C.line, .4).lineBetween(px + 14, fy - 4, px + PW - 14, fy - 4);
            foot.forEach((k, i) => root.add(this.dialogButton(k, px + 20 + i * (fw + 8), fy, fw, () => true)));
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
    }

    /** Tlačidlo okna podľa pôvodného HTML tlačidla k (aj s ikonkou výbavy). Vráti pole objektov s výškou .h. */
    dialogButton(k, x, y, w, allow) {
        const label = k.textContent.trim() || '•', icon = this.iconFor(k), iw = icon ? 34 : 0;
        const probe = this.add.text(0, 0, label, txtStyle(14, '#000', { wordWrap: { width: w - 12 - iw, useAdvancedWrap: true } }));
        const bh = Math.max(icon ? 38 : 30, probe.height + 10); probe.destroy();
        const swatch = k.style.background && k.textContent.trim() === '' ? k.style.background : null;
        const parts = this.button(x, y, w, bh, label, () => { if (allow()) k.click(); }, { disabled: k.disabled, icon });
        if (swatch) parts[0].setFillStyle(hex(swatch));
        if (k.style.outline) parts[0].setStrokeStyle(3, 0xffffff, 1);
        this.dlgButtons.push(k);
        parts.h = bh;
        return parts;
    }

    /** Ikonka výbavy z HTML tlačidla (plátno canvas.ico) ako textúra Phaseru. */
    iconFor(k) {
        const cv = k.querySelector && k.querySelector('canvas.ico'), key = k.dataset && k.dataset.icon;
        if (!cv || !key) return null;
        if (!this.textures.exists(key)) this.textures.addCanvas(key, cv);
        return key;
    }

    /** Klik je vo viditeľnej časti okna (nie na tlačidle odrolovanom mimo) a nejde o ťahanie. */
    inDialog() {
        const d = this.dlg, y = this.input.activePointer.y / RES;
        if (this.drag && this.drag.moved) return false;
        return !d || (y >= d.vy0 && y <= d.vy1);
    }

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
    }

    dialogKey(k) {
        if (!this.dlg) return;
        const bs = (this.dlgButtons || []).filter(b => !b.disabled);
        if (k === 'esc') { const b = bs.find(b => UI_EXIT.test(b.textContent.trim())); if (b) b.click(); }
        else if (bs[k - 1]) bs[k - 1].click();
    }

    // ---------- Popisky pri myši na mape -------------------------------------------
    drawTooltip(scene) {
        this.tipLayer.removeAll(true);
        const ms = scene === 'map' && this.scene.get('Map');
        if (!ms || !ms.hover || mode !== 'map' || this.dlg || !G) return;
        const w = ms.hover, s = ms.hoverScreen;
        let L = null;
        for (const e of E) if (Math.hypot(e.x - w.x, e.y - w.y) < 26) { per(e); L = [e.nm, FN[e.f] + (e.kr ? ', panovník' : '') + (e.nz ? ', prisluhovač Saurona' : ''), 'Vojakov: ' + Math.ceil(e.n), e.f !== 9 && !e.nz ? 'Povaha: ' + TR[e.tr][0] : '', hos(e.f, G.fac) ? 'Nepriateľ – kliknutím zaútočíš' : 'Priateľ – kliknutím sa porozprávaš']; break; }
        if (!L) for (const t of TW) if (Math.hypot(t.x - w.x, t.y - w.y) < 32) { L = [t.n, FN[t.f] + (t.mine ? ' (tvoj hrad)' : ''), 'Posádka: ' + t.g + ', hradby ' + (t.wl || 0), 'Prosperita: úroveň ' + lvl(t) + ' (' + Math.round(t.pr ?? 40) + ' %)', t.lord ? 'Léno: ' + t.lord : 'Kliknutím vstúpiš']; break; }
        if (!L) for (const v of VL) if (Math.hypot(v.x - w.x, v.y - w.y) < 24) { L = [v.n, 'Patrí k hradu ' + TW[v.t].n + ' (' + FN[TW[v.t].f] + ')', 'Prosperita: úroveň ' + lvl(v), v.st > 0 ? 'Vypálená, obnova o ' + v.st + ' dní' : 'Neporušená']; break; }
        if (!L && Math.hypot(G.x - w.x, G.y - w.y) < 24) L = [G.name, rank() + ', ' + FN[G.fac], 'Vojsko: ' + ar(), G.ring === 1 ? 'Nesie Jeden prsteň' : 'Zdravie ' + Math.ceil(G.hp)];
        if (!L) return;
        L = L.filter(Boolean);
        const texts = L.map((l, i) => this.add.text(0, 0, l, txtStyle(13, i ? UI_C.ink : '#ffd24a', { fontFamily: i ? 'sans-serif' : FONT })));
        const tw = Math.max(...texts.map(t => t.width)) + 16, th = texts.length * 17 + 8;
        let x = s.x + 14, y = s.y + 14;
        if (x + tw > W) x = s.x - tw - 10;
        if (y + th > H) y = s.y - th - 10;
        const bg = this.add.graphics().fillStyle(0x120e0c, .93).fillRect(x, y, tw, th).lineStyle(1, UI_C.line, 1).strokeRect(x, y, tw, th);
        texts.forEach((t, i) => t.setPosition(x + 8, y + 5 + i * 17));
        this.tipLayer.add([bg, ...texts]);
    }

    // ---------- Legenda mapy ---------------------------------------------------------
    drawLegend(scene) {
        const on = scene === 'map' && LEG && !this.dlg;
        if (on === !!this.sig.leg) return;
        this.sig.leg = on;
        this.legLayer.removeAll(true);
        if (!on) return;
        const F = [0, 1, 2, 3, 4, 5, 7, 8, 9, 6], x = 8, y = 56, h = F.length * 21 + 130, items = [];
        const bg = this.add.graphics().fillStyle(0x120e0c, .93).fillRect(x, y, 230, h).lineStyle(1, UI_C.line, 1).strokeRect(x, y, 230, h);
        items.push(bg);
        F.forEach((f, k) => {
            items.push(Art.image(this, x + 12, y + 6 + k * 21, Art.banner(this, f)).setScale((Art.scale['banner_' + f] || 1 / RES) * .65));
            items.push(this.add.text(x + 34, y + 9 + k * 21, FN[f], txtStyle(13, UI_C.ink)));
        });
        let yy = y + 14 + F.length * 21;
        const row = (s, draw) => { const gg = this.add.graphics(); draw(gg, x + 18, yy + 4); items.push(gg, this.add.text(x + 34, yy - 3, s, txtStyle(13, UI_C.ink))); yy += 22; };
        items.push(Art.image(this, x + 18, yy + 4, Art.crown(this)));
        items.push(this.add.text(x + 34, yy - 3, 'Panovník frakcie', txtStyle(13, UI_C.ink))); yy += 22;
        row('Nazgûl', (g, a, b) => g.fillStyle(0xa00000, .7).fillCircle(a, b, 8));
        row('Silnejší nepriateľ', (g, a, b) => g.lineStyle(2, 0xe0442a, 1).strokeEllipse(a, b, 18, 8));
        row('Slabší nepriateľ', (g, a, b) => g.lineStyle(2, 0x6fbf5a, 1).strokeEllipse(a, b, 18, 8));
        items.push(this.add.text(x + 8, yy - 3, '★★', txtStyle(13, '#ffd24a')), this.add.text(x + 34, yy - 3, 'Úroveň prosperity hradu', txtStyle(13, UI_C.ink))); yy += 22;
        row('Vypálená dedina', (g, a, b) => g.fillStyle(0xff7a22, 1).fillCircle(a, b, 4));
        this.legLayer.add(items);
    }
}
