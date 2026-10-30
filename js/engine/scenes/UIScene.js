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
        this.toast = t(W / 2, 70, '', 13, UI_C.gold, { backgroundColor: 'rgba(18,14,12,.88)', padding: { x: 12, y: 4 } }).setOrigin(.5).setDepth(50);
        this.pause = t(W / 2, H - 74, 'Pauza: klikni na mapu alebo sa utábor, aby čas plynul', 12, '#ffd24a', { backgroundColor: 'rgba(18,14,12,.85)', padding: { x: 10, y: 3 } }).setOrigin(.5).setDepth(5);
        this.gateTxt = t(W / 2, 132, '', 13, UI_C.ink, { fontFamily: 'sans-serif', stroke: '#000', strokeThickness: 3 }).setOrigin(.5).setDepth(5);
        this.hudLayer = this.add.container(0, 0).setDepth(10);
        this.barLayer = this.add.container(0, 0).setDepth(20);
        this.tipLayer = this.add.container(0, 0).setDepth(30);
        this.legLayer = this.add.container(0, 0).setDepth(25);
        this.bigLayer = this.add.container(0, 0).setDepth(28);
        this.dlg = null; this.sig = {}; this.menu = null; this.big = false;
        document.body.classList.add('phaser-ui');
        this.input.keyboard.on('keydown-ESC', () => { if (this.big) this.big = false; else if (this.menu) this.menu = null; else this.dialogKey('esc'); });
        this.input.keyboard.on('keydown-M', () => { if (G && mode === 'map' && !this.dlg && !ov.classList.contains('intro')) this.big = !this.big; });
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
        const scene = this.scene.isActive('Battle') ? 'battle' : this.scene.isActive('Tavern') || this.scene.isActive('Castle') ? 'tavern' : this.scene.isActive('Map') ? 'map' : 'intro';
        this.drawOverlay(scene, dt);
        this.syncHud();
        this.syncBars();
        this.syncBigMap(scene);
        this.syncDialog();
        this.drawTooltip(scene);
        this.drawLegend(scene);
    }

    // ---------- Prekryvné efekty ----------------------------------------------------
    drawOverlay(scene, dt) {
        const g = this.g; g.clear();
        if (TS && TS.l > 0 && G) { TS.l -= dt; this.toast.setVisible(!this.dlg).setText(TS.s).setAlpha(Math.min(1, TS.l / 40)); }
        else this.toast.setVisible(false);
        this.pause.setVisible(scene === 'map' && mode === 'map' && !!PAUSE && !this.dlg && !this.menu && !this.big);
        if (scene === 'map') {
            const se = G ? season() : 0;
            if (se === 2) g.fillStyle(0xc86e1e, .1).fillRect(0, 0, W, H);
            if (se === 3) g.fillStyle(0xdce6ff, .14).fillRect(0, 0, W, H);
            this.drawWeather(g, MW.n, 1);
            // noc: modré stmavenie, v hlbokej noci hviezdy
            const nn = nightness();
            g.fillStyle(0x080e28, .18 * (.5 - .5 * Math.cos(dayT / 600 * 6.283)) + nn * .22).fillRect(0, 0, W, H);
            if (nn > .3 && MW.n === 'clear') { g.fillStyle(0xffffff, (nn - .3) * .9); for (let k = 0; k < 40; k++) g.fillRect((k * 173 + 31) % W, (k * 97 + 11) % (H * .6), 1.2, 1.2); }
            g.lineStyle(3, UI_C.line, 1).strokeRect(MM.x - 1.5, MM.y - 1.5, MM.w + 3, MM.h + 3);
        }
        this.gateTxt.setVisible(false);
        if (scene === 'battle' && U && U[0]) {
            this.drawWeather(g, WX.n, 1.3);
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

    /** Počasie cez celú obrazovku: dážď, búrka s bleskom, hmla, sneh, popolový dážď Mordoru. k = hustota. */
    drawWeather(g, n, k) {
        if (n === 'rain' || n === 'storm') {
            const cnt = Math.round((n === 'storm' ? 170 : 100) * k), sp = n === 'storm' ? 22 : 16;
            if (n === 'storm') g.fillStyle(0x182030, .25).fillRect(0, 0, W, H);
            g.lineStyle(1, 0xb4c8e6, .4); for (let i = 0; i < cnt; i++) { const x = (i * 89 + tm * (sp / 2)) % W, y = (i * 61 + tm * sp) % H; g.lineBetween(x, y, x - (n === 'storm' ? 6 : 3), y + 11); }
            if (n === 'storm' && Math.floor(tm) % 160 < 3) g.fillStyle(0xffffff, .55).fillRect(0, 0, W, H);   // blesk
        }
        if (n === 'snow') { g.fillStyle(0xdce6ff, .12).fillRect(0, 0, W, H); g.fillStyle(0xffffff, 1); for (let i = 0; i < 110 * k; i++) g.fillRect((i * 97 + tm * .9 + Math.sin(tm / 25 + i) * 12) % W, (i * 59 + tm * 1.8) % H, 2, 2); }
        if (n === 'fog') { g.fillStyle(0xbec8d2, .38).fillRect(0, 0, W, H); for (let i = 0; i < 5; i++) g.fillStyle(0xd8dee6, .08).fillEllipse((i * 230 + tm * (.6 + i * .1)) % (W + 300) - 150, 90 + i * 85, 420, 70); }
        if (n === 'ash') { g.fillStyle(0x3a2a24, .22).fillRect(0, 0, W, H); g.fillStyle(0x6a5a52, .9); for (let i = 0; i < 90 * k; i++) g.fillRect((i * 101 + tm * .5 + Math.sin(tm / 20 + i) * 15) % W, (i * 67 + tm * 1.2) % H, 2, 2); g.fillStyle(0xff6a20, .7); for (let i = 0; i < 12; i++) g.fillRect((i * 331 + tm * .3) % W, (i * 211 + tm * 1.4) % H, 1.5, 1.5); }
    }

    // ---------- Horná lišta (zrkadlo #hud) -----------------------------------------
    syncHud() {
        const on = !!G && hud.style.visibility !== 'hidden' && !ov.classList.contains('intro');
        const sig = on ? hud.innerHTML : '';
        if (sig === this.sig.hud) return;
        this.sig.hud = sig;
        this.hudLayer.removeAll(true);
        if (!on) return;
        // Každá položka je „štítok“: ikona vo vysokom rozlíšení + hodnota a pod ňou drobný popis.
        const RH = 27, GAP = 12;
        let x = 10, y = 4;
        const items = [], seps = [];
        for (const span of hud.children) {
            const val = span.querySelector('b');                 // nulové položky (napr. Elfovia 0) lištu zbytočne zahlcujú
            if (val && val.textContent.trim() === '0' && !/Zlato|Sláva/.test(span.textContent)) continue;
            const full = span.textContent.replace(/\s+/g, ' ').trim();
            const icon = Icons.forHud(full, span === hud.children[0]);
            const vcol = span.style.color || UI_C.gold;
            let label = '', value = full;
            if (val && icon) {
                value = val.textContent.replace(/\s+/g, ' ').trim(); label = full.replace(value, '').replace(/^[,:\s]+|[:\s]+$/g, '').trim();
                const m = !label && value.match(/^([^:]+):\s*(.+)$/); if (m) { label = m[1]; value = m[2]; }   // „Body: 5“
            }
            const group = [];
            let w = 0;
            if (icon) { const im = this.add.image(0, 0, Icons.tex(this, icon)).setDisplaySize(20, 20).setOrigin(0, .5); group.push(im); w = 23; }
            const tv = this.add.text(0, 0, value, txtStyle(12, icon ? vcol : UI_C.ink, { fontStyle: icon ? 'bold' : 'normal' }));
            const tl = label ? this.add.text(0, 0, label, txtStyle(8, UI_C.dim)) : null;
            const tw = Math.max(tv.width, tl ? tl.width : 0);
            if (x + w + tw > W - 10 && x > 10) { x = 10; y += RH; }
            if (group[0]) group[0].setPosition(x, y + RH / 2 - 1);
            if (tl) { tv.setPosition(x + w, y + 1); tl.setPosition(x + w, y + 15); group.push(tv, tl); }
            else { tv.setPosition(x + w, y + RH / 2 - tv.height / 2 - 1); group.push(tv); }
            items.push(...group);
            x += w + tw + GAP;
            seps.push([x - GAP / 2, y]);
        }
        const hb = y + RH + 3;
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x2a1e14, 0x2a1e14, 0x120e0c, 0x120e0c, .94, .94, .9, .9).fillRect(0, 0, W, hb);
        bg.fillStyle(0xc9a24a, .9).fillRect(0, hb - 1, W, 1);          // zlatý lem
        bg.fillStyle(0x5a3a12, .9).fillRect(0, hb + 1, W, 1);
        bg.fillStyle(0xffffff, .05).fillRect(0, 0, W, 1);
        bg.fillStyle(0x6a5a46, .5);
        for (const [sx, sy] of seps.slice(0, -1)) bg.fillRect(sx, sy + 4, 1, RH - 8);   // jemné oddeľovače
        this.hudLayer.add([bg, ...items]);
    }

    // ---------- Panel tlačidiel a rozkazy (zrkadlo tb a od) --------------------------
    /** Skupiny tlačidiel spodného panela: [názov, ikona, texty HTML tlačidiel]. Ostatné (lupa, Tábor) sú vždy viditeľné. */
    static get GROUPS() {
        return [['Hrdina', 'helm', ['Prehľad', 'Denník', 'Úlohy', 'Družina', 'Inventár', 'Štatistiky']],
                ['Kronika', 'book', ['Legenda', 'Trofeje', 'Úspechy', 'Encyklopédia', 'Návod']],
                ['Nastavenia', 'gear', ['Zvuk', 'Celá obrazovka']]];
    }

    syncBars() {
        const vis = el => el.style.display !== 'none' && !!G && !this.dlg && mode !== 'tavern' && mode !== 'castle';
        if (this.dlg || !vis(tb)) this.menu = null;
        const sig = [vis(tb), vis(od), this.menu, this.big, ...[...tb.children, ...od.children].map(b => b.textContent + (b.style.opacity || ''))].join('|');
        if (sig === this.sig.bars) return;
        this.sig.bars = sig;
        this.barLayer.removeAll(true);
        const BH = 26;
        if (vis(tb)) {
            const y = H - BH - 4, all = [...tb.children], grouped = new Set(UIScene.GROUPS.flatMap(g => g[2]));
            const find = n => all.find(b => b.textContent.trim().startsWith(n));
            let x = 6;
            const out = [];
            const put = (label, ic, fn, o = {}) => {
                const zoom = !label, w = zoom ? BH : Math.max(20, this.measure(label, 11) + 14 + (ic ? BH + 2 : 0));
                out.push(...this.button(x, y, w, BH, label, fn, { size: 11, icon: ic ? Icons.tex(this, ic) : null, bare: zoom, ...o }));
                x += w + 3;
                return x - w - 3;
            };
            // lupa a Tábor ostávajú priamo na paneli
            all.filter(b => /^[−+]$/.test(b.textContent.trim())).forEach(b => put('', Icons.forButton(b.textContent), () => b.click()));
            const camp = find('Tábor') || find('Zrušiť tábor') || find('Zrušiť pobyt');
            if (camp) put(camp.textContent, 'tent', () => camp.click());
            put('Mapa (M)', 'map', () => { this.big = !this.big; });
            // skupinové tlačidlá, ktoré rozbalia ponuku
            for (const [name, ic, items] of UIScene.GROUPS) {
                const open = this.menu === name, bx = put(name + (open ? ' ▾' : ' ▴'), ic, () => { this.menu = open ? null : name; });
                if (!open) continue;
                const bs = items.map(find).filter(Boolean), iw = 150, ih = 26, ph = bs.length * (ih + 3) + 9, py = y - ph - 4;
                const panel = this.add.graphics();
                panel.fillStyle(0x1c1510, .96).fillRoundedRect(bx, py, iw + 10, ph, 5);
                panel.lineStyle(1.5, UI_C.line, 1).strokeRoundedRect(bx, py, iw + 10, ph, 5);
                const blocker = this.add.rectangle(bx, py, iw + 10, ph, 0, 0).setOrigin(0).setInteractive();
                out.push(panel, blocker);
                bs.forEach((b, i) => {
                    const t = b.textContent.trim(), bic = Icons.forButton(t);
                    out.push(...this.button(bx + 5, py + 5 + i * (ih + 3), iw, ih, t, () => { this.menu = null; b.click(); }, { size: 11, icon: bic ? Icons.tex(this, bic) : null }));
                });
            }
            // tlačidlá, ktoré nepatria do žiadnej skupiny ani nie sú vyššie (nové položky), ostanú viditeľné
            all.filter(b => { const t = b.textContent.trim(); return !/^[−+]$/.test(t) && !/tábor|pobyt/i.test(t) && ![...grouped].some(n => t.startsWith(n)); })
               .forEach(b => put(b.textContent, Icons.forButton(b.textContent), () => b.click()));
            this.barLayer.add(out);
            if (this.pause) this.pause.y = y - 14;
        }
        if (vis(od)) {
            const bs = [...od.children], w = 84, x0 = W / 2 - (bs.length * (w + 4)) / 2;
            bs.forEach((b, i) => { const ic = Icons.forButton(b.textContent); this.barLayer.add(this.button(x0 + i * (w + 4), H - BH - 4, w, BH, b.textContent, () => b.click(), { size: 11, alpha: +(b.style.opacity || 1), icon: ic ? Icons.tex(this, ic) : null })); });
        }
    }

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
        g.fillStyle(0x2a1e14, 1).fillRoundedRect(mx - 10, my - 30, mw + 20, mh + 46, 8);
        g.lineStyle(2, UI_C.line, 1).strokeRoundedRect(mx - 10, my - 30, mw + 20, mh + 46, 8);
        const items = [g];
        const shade = this.add.rectangle(mx, my, mw, mh, 0, 0).setOrigin(0).setInteractive({ useHandCursor: true });
        shade.on('pointerup', p => {                              // klik = cieľ cesty
            if (this.drag && this.drag.moved) return;
            const wx = (p.x / RES - mx) / sx, wy = (p.y / RES - my) / sy;
            G.dest = -1; G.vd = -1; G.chase = null; G.talk = null; G.tx = wx; G.ty = wy;
            TW.forEach((t, i) => { if (Math.hypot(t.x - wx, t.y - wy) < 160) { G.tx = t.x; G.ty = t.y; G.dest = i; } });
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
    }

    measure(s, size) { const t = this.add.text(0, 0, s, txtStyle(size, '#fff')); const w = t.width; t.destroy(); return w; }

    /** Tlačidlo v štýle hry; vráti pole objektov. */
    button(x, y, w, h, label, fn, o = {}) {
        const off = !!o.disabled, size = o.size || 14;
        const r = this.add.rectangle(x, y, w, h, off ? UI_C.btnOff : UI_C.btn).setOrigin(0).setStrokeStyle(1, 0x5a3a12, .8).setAlpha(o.alpha ?? 1);
        const deco = this.add.graphics().setAlpha(o.alpha ?? 1);          // svetlý horný okraj a tmavší spodok – plastické tlačidlo
        deco.fillStyle(0xffffff, off ? .08 : .22).fillRect(x + 1, y + 1, w - 2, 1);
        deco.fillStyle(0x3a2208, off ? .15 : .35).fillRect(x + 1, y + h - 2, w - 2, 1);
        const is = Math.min(h - 4, o.iconSize || 24), iw = o.icon ? (o.bare ? 0 : is + 6) : 0;
        const t = this.add.text(x + iw + (w - iw) / 2, y + h / 2, label, txtStyle(size, off ? UI_C.dim : '#1a120a', { align: 'center', wordWrap: { width: Math.max(10, w - 12 - iw), useAdvancedWrap: true } })).setOrigin(.5);
        const out = [r, deco, t];
        if (o.icon) {
            const cx = o.bare ? x + w / 2 : x + 3 + is / 2;
            const im = this.add.image(cx, y + h / 2, o.icon).setDisplaySize(is - 2, is - 2).setAlpha(off ? .6 : 1);
            out.push(im);
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
        const PW = 440, IW = PW - 32, root = this.add.container(0, 0).setDepth(40);
        const shade = this.add.rectangle(0, 0, W, H, 0x0c0907, .35).setOrigin(0).setInteractive();
        const h1 = ov.querySelector('h1'), title = h1 ? h1.textContent : '';
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
            if (title) { const t = this.add.text(pimg ? px0 : PW / 2, y, title, txtStyle(19, UI_C.gold, { fontFamily: TITLE_FONT, align: pimg ? 'left' : 'center', wordWrap: { width: pw0 } })).setOrigin(pimg ? 0 : .5, 0); items.push(t); y += t.height + 5; }
            ov.querySelectorAll(':scope > p').forEach(p => {
                if (!p.textContent.trim()) return;
                const t = this.add.text(pimg ? px0 : PW / 2, y, p.textContent, txtStyle(12, p.style.color ? UI_C.gold : UI_C.ink, { align: pimg ? 'left' : 'center', lineSpacing: 2, wordWrap: { width: pw0 } })).setOrigin(pimg ? 0 : .5, 0);
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
                    const t = this.add.text(16, y, k.textContent, txtStyle(k.style.color ? 12.5 : 11.5, k.style.color ? UI_C.gold : k.style.opacity && +k.style.opacity < 1 ? UI_C.dim : UI_C.ink, { wordWrap: { width: IW - 26 } }));
                    items.push(t); y += t.height + 3;
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
        this.drawFrame(panel, px, py, PW, PH);
        const content = this.add.container(0, 0);
        content.add(L.items);
        content.setPosition(px, py + 20 - scroll);
        root.add([shade, panel, content]);
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
    }

    /** Rám okna s ornamentom podľa strany: dobro elfské úponky a zlato, zlo ostré hroty a červeň. */
    drawFrame(panel, px, py, PW, PH) {
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
    }

    /** Tlačidlo okna podľa pôvodného HTML tlačidla k (aj s ikonkou výbavy). Vráti pole objektov s výškou .h. */
    dialogButton(k, x, y, w, allow) {
        const label = k.textContent.trim() || '•', dn = Icons.forDialog(label), icon = this.iconFor(k) || (dn && label !== '•' ? Icons.tex(this, dn) : null);
        const unit = icon && /^ico_u_/.test(icon), is = unit ? 34 : 24, iw = icon ? is + 6 : 0;   // ikonky vojakov sú väčšie
        const probe = this.add.text(0, 0, label, txtStyle(12, '#000', { wordWrap: { width: w - 12 - iw, useAdvancedWrap: true } }));
        const bh = Math.max(icon ? is + 4 : 24, probe.height + 8); probe.destroy();
        const swatch = k.style.background && k.textContent.trim() === '' ? k.style.background : null;
        const parts = this.button(x, y, w, bh, label, () => { if (allow()) k.click(); }, { disabled: k.disabled, icon, iconSize: is, size: 12 });
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
        const texts = L.map((l, i) => this.add.text(0, 0, l, txtStyle(i ? 11 : 12.5, i ? UI_C.ink : '#ffd24a', { fontFamily: i ? 'sans-serif' : FONT })));
        const tw = Math.max(...texts.map(t => t.width)) + 16, th = texts.length * 14 + 8;
        let x = s.x + 14, y = s.y + 14;
        if (x + tw > W) x = s.x - tw - 10;
        if (y + th > H) y = s.y - th - 10;
        const bg = this.add.graphics().fillStyle(0x120e0c, .93).fillRect(x, y, tw, th).lineStyle(1, UI_C.line, 1).strokeRect(x, y, tw, th);
        texts.forEach((t, i) => t.setPosition(x + 8, y + 5 + i * 14));
        this.tipLayer.add([bg, ...texts]);
    }

    // ---------- Legenda mapy ---------------------------------------------------------
    drawLegend(scene) {
        const on = scene === 'map' && LEG && !this.dlg;
        if (on === !!this.sig.leg) return;
        this.sig.leg = on;
        this.legLayer.removeAll(true);
        if (!on) return;
        // malá legenda v ľavom hornom rohu: frakcie v dvoch stĺpcoch, pod nimi značky
        const F = [0, 1, 5, 8, 6, 2, 3, 4, 7, 9], x = 6, y = 48, w = 196, RH = 14, items = [], ts = 10.5;
        const txt = (tx, ty, s, col) => this.add.text(tx, ty, s, txtStyle(ts, col || UI_C.ink));
        items.push(txt(x + 8, y + 5, 'Legenda', UI_C.gold));
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
        const bg = this.add.graphics().fillStyle(0x120e0c, .82).fillRoundedRect(x, y, w, yy - y + 4, 4).lineStyle(1, UI_C.line, .7).strokeRoundedRect(x, y, w, yy - y + 4, 4);
        items.unshift(bg);
        this.legLayer.add(items);
    }
}
