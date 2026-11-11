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
const UI_C = { ink: '#ecdfc6', gold: '#d9a441', dim: '#9a8c78', panel: 0x1c1510, panel2: 0x2c2018, line: 0xd9a441, btn: 0x2e2012, btnHover: 0x4e3618, btnSel: 0x6a4818, btnOff: 0x241e18 };
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
        this.syncMinimap(scene);
        this.syncHud();
        this.syncBars();
        this.syncBigMap(scene);
        this.syncEvents(dt);
        this.syncDialog();
        this.drawTooltip(scene);
        this.drawLegend(scene);
    }

    // ---------- Prekryvné efekty ----------------------------------------------------
    drawOverlay(scene, dt) {
        const g = this.g; g.clear();
        if (TS && TS.l > 0 && G) { TS.l -= dt; this.toast.setVisible(!this.dlg).setText(TS.s).setAlpha(Math.min(1, TS.l / 40)).setY(scene === 'battle' ? (typeof bossAlive === 'function' && bossAlive() ? 172 : 114) : 70); }
        else this.toast.setVisible(false);
        this.pause.setVisible(scene === 'map' && mode === 'map' && !!PAUSE && !this.dlg && !this.menu && !this.big);
        if (scene === 'map') {
            const se = G ? season() : 0;
            if (se === 2) g.fillStyle(0xc86e1e, .1).fillRect(0, 0, W, H);
            if (se === 3) g.fillStyle(0xdce6ff, .14).fillRect(0, 0, W, H);
            this.drawWeather(g, MW.n, lowFx() ? .5 : 1);
            // noc: modré stmavenie, v hlbokej noci hviezdy
            const nn = nightness(), raw = .5 - .5 * Math.cos(dayT / DAY_LEN * 6.283), ph = dayT / DAY_LEN;
            // súmrak a úsvit: teplé oranžové svetlo zhora (súmrak) alebo ružové (úsvit), potom modrá noc
            const warm = Math.exp(-Math.pow((raw - .42) / .13, 2));
            if (warm > .02) { const dusk = ph < .5; for (let k = 0; k < 6; k++) g.fillStyle(dusk ? 0xff8a30 : 0xff9a70, warm * .07 * (1 - k / 6)).fillRect(0, k * H / 6, W, H / 6); g.fillStyle(dusk ? 0xffb060 : 0xffc0a0, warm * .05).fillRect(0, 0, W, H); }
            if (raw > .25 && raw < .42) g.fillStyle(0xffe0a0, (raw - .25) * .3).fillRect(0, 0, W, H);   // zlatá hodina
            g.fillStyle(0x080e28, .18 * raw + nn * .22).fillRect(0, 0, W, H);
            if (nn > .3 && MW.n === 'clear') { g.fillStyle(0xffffff, (nn - .3) * .9); for (let k = 0; k < 40; k++) g.fillRect((k * 173 + 31) % W, (k * 97 + 11) % (H * .6), 1.2, 1.2);
                const mx = W - 90 - (ph - .5) * 200, my = 60 + Math.abs(ph - .5) * 80;   // mesiac putuje po oblohe
                g.fillStyle(0xfff4d0, Math.min(.95, (nn - .3) * 1.4)).fillCircle(mx, my, 11); g.fillStyle(0x080e28, Math.min(.9, (nn - .3) * 1.4) * .8).fillCircle(mx + 5, my - 3, 9); g.fillStyle(0xfff4d0, (nn - .3) * .12).fillCircle(mx, my, 26); }
        }
        this.gateTxt.setVisible(false);
        if (this.cmbT) this.cmbT.forEach(t => t.setVisible(false)); if (this.msgT) this.msgT.forEach(t => t.setVisible(false));
        if (scene === 'battle' && U && U[0]) {
            if (!(typeof B3 !== 'undefined' && B3.isOn() && !lowFx())) this.drawWeather(g, WX.n, lowFx() ? .6 : 1.3);   // v 3D padá dážď a sneh priamo v scéne
            const h = U[0];
            g.fillStyle(0x000000, .55).fillRect(W / 2 - 82, 58, 164, 10);
            g.fillStyle(0xb8402a, 1).fillRect(W / 2 - 80, 60, 160 * Math.max(0, h.hp) / h.mh, 6);
            this.drawCombatHud(g);
            if (SGB) {
                g.fillStyle(0x000000, .6).fillRect(W / 2 - 82, 114, 164, 8);
                g.fillStyle(0xc08a3a, 1).fillRect(W / 2 - 80, 116, 160 * Math.max(0, SGB.gate) / SGB.mg, 4);
                this.gateTxt.setVisible(true).setText(SGB.gate > 0 ? 'Brána hradu' : 'Brána je zničená!');
            }
        }
    }

    /** Bitka: výdrž a štít hrdinu pod zdravím, morálka oboch strán, stav (nápor, šípy, pokrik, prelomený kryt). */
    drawCombatHud(g) {
        if (typeof CMB === 'undefined') return;
        const C = CMB, x = W / 2 - 80;
        if (!this.cmbT) { const t = (s, c, ox) => this.add.text(0, 0, s, txtStyle(10, c, { stroke: '#000', strokeThickness: 3 })).setOrigin(ox, .5).setDepth(5); this.cmbT = [t('Tvoje vojsko', '#e8d8a8', 0), t('Nepriateľ', '#ffb0a0', 1), t('', '#ffd24a', .5)]; }
        if (OPT.noStam === false) { g.fillStyle(0x000000, .5).fillRect(x - 2, 69, 164, 6);
        g.fillStyle(C.gb > 0 ? (Math.floor(tm / 4) % 2 ? 0xff5030 : 0x802010) : 0xd9b84a, 1).fillRect(x, 70, 160 * Math.max(0, C.st) / 100, 4); }   // výdrž (len ak je zapnutá)
        if (C.shMax) { g.fillStyle(0x000000, .5).fillRect(x - 2, 76, 164, 5); g.fillStyle(C.blk ? 0xd8e8ff : 0x8aa0c0, 1).fillRect(x, 77, 160 * C.shp / C.shMax, 3); }   // štít
        if (!C.noRout) {   // morálka: vľavo tvoja (zlatá), vpravo nepriateľa (červená)
            const mw = 120, y = 66, bar = (bx, v, col) => { g.fillStyle(0x000000, .55).fillRect(bx - 2, y - 2, mw + 4, 10); g.fillStyle(col, 1).fillRect(bx, y, mw * Math.max(0, v) / 100, 6); g.fillStyle(0xffffff, .5).fillRect(bx + mw * .35, y - 2, 1, 10); };
            bar(18, C.M[0], C.M[0] < 35 ? 0xd07030 : 0xd9a441); bar(W - 18 - mw, C.M[1], C.M[1] < 35 ? 0xd07030 : 0xc0392b);
            this.cmbT[0].setPosition(18, 81).setText('Morálka – tvoje vojsko').setVisible(true);
            this.cmbT[1].setPosition(W - 18, 81).setText('Morálka – nepriateľ').setVisible(true);
        }
        const bo = bossAlive();   // boss: veľká lišta zdravia s menom
        if (bo) { g.fillStyle(0x000000, .65).fillRect(W / 2 - 152, 102, 304, 12); g.fillStyle(0x8a1a10, 1).fillRect(W / 2 - 150, 104, 300 * bo.hp / bo.mh, 8); g.fillStyle(0xff8a40, .5).fillRect(W / 2 - 150, 104, 300 * bo.hp / bo.mh, 3); if (!this.cmbT[3]) this.cmbT[3] = this.add.text(0, 0, '', txtStyle(12, '#ffb090', { stroke: '#000', strokeThickness: 3 })).setOrigin(.5).setDepth(5); this.cmbT[3].setPosition(W / 2, 124).setText(BOSSES[bo.boss].n).setVisible(true); }
        // smer úderu: zlatá šípka = tvoj nápriah, červená = úder, ktorý ide na teba (ako vo Warbande)
        const chev = (d, col, k) => { const cx = W / 2, cy = H * .56, o = 34 * k, s = 9 * k; g.fillStyle(col, .85);
            if (d === 'l') g.fillTriangle(cx - o - s, cy, cx - o + s * .6, cy - s, cx - o + s * .6, cy + s); else if (d === 'r') g.fillTriangle(cx + o + s, cy, cx + o - s * .6, cy - s, cx + o - s * .6, cy + s);
            else if (d === 'u') g.fillTriangle(cx, cy - o - s, cx - s, cy - o + s * .6, cx + s, cy - o + s * .6); else g.fillTriangle(cx, cy + o + s, cx - s, cy + o - s * .6, cx + s, cy + o - s * .6); };
        if (C.rd) chev(C.rd.d, C.rd.t >= C.rd.ready ? 0xffd24a : 0xa08040, 1 + Math.min(.4, Math.max(0, C.rd.t - C.rd.ready) / 75));
        const h0 = U[0]; let inc = null, id = 1e9;
        for (const u of U) if (u.t && u.hp > 0 && u.wu > 0 && u.wt === h0 && u.wd) { const dd = Math.hypot(u.x - h0.x, u.y - h0.y); if (dd < id) { id = dd; inc = u; } }
        if (inc) chev(inc.wd, 0xff3020, .9 + .3 * (1 - inc.wu / inc.wu0));
        // ukazovateľ útokov zo všetkých strán: okolo zameriavača ukazuje, odkiaľ ide úder (červený trojuholník, rastie k dopadu) alebo mieri lukostrelec (oranžový, so spojnicou)
        if (C.perfT > 0) {   // dokonalý kryt: veľký zlatý nápis s odozvou
            C.perfT -= 1; if (!this.perfTx) this.perfTx = this.add.text(0, 0, 'DOKONALÝ KRYT', txtStyle(22, '#ffd24a', { stroke: '#2a1a00', strokeThickness: 5 })).setOrigin(.5).setDepth(6);
            const k = C.perfT / 50; this.perfTx.setPosition(W / 2, H * .36 - (1 - k) * 18).setAlpha(Math.min(1, k * 2.2)).setScale(1 + (1 - k) * .25).setVisible(true);
        } else if (this.perfTx) this.perfTx.setVisible(false);
        if (OPT.tell !== false && h0 && h0.hp > 0) {
            const cam = C.km && C.aim3 ? C.aim3.yaw : h0.f, cx = W / 2, cy = H * .5, R = Math.min(W, H) * .2, T = [];
            for (const u of U) if (u.t && u.hp > 0) {
                if (u.wu > 0 && u.wt === h0) T.push({ u, k: 1 - u.wu / u.wu0, a: 0 });
                else if (u.aim > 0 && u.at === h0) T.push({ u, k: 1 - u.aim / (u.aim0 || 40), a: 1 });
            }
            T.sort((p, q) => q.k - p.k);
            for (const t of T.slice(0, 5)) {
                const rel = Math.atan2(Math.sin(dirTo(h0, t.u) - cam), Math.cos(dirTo(h0, t.u) - cam)), r = R + (t.a ? 14 : 0), x = cx + Math.sin(rel) * r, y = cy - Math.cos(rel) * r, sz = (t.a ? 9 : 11) + 9 * t.k, ox = Math.sin(rel), oy = -Math.cos(rel);
                g.fillStyle(t.a ? 0xff9a30 : 0xff3020, .55 + .4 * t.k);
                g.fillTriangle(x + ox * sz, y + oy * sz, x - ox * sz * .4 - oy * sz * .75, y - oy * sz * .4 + ox * sz * .75, x - ox * sz * .4 + oy * sz * .75, y - oy * sz * .4 - ox * sz * .75);
                if (t.a && t.k > .55) { g.lineStyle(1.5, 0xff9a30, .5); g.lineBetween(cx + ox * (R - 10), cy + oy * (R - 10), cx + ox * 24, cy + oy * 24); }
            }
        }
        if (C.blk && OPT.blkDir === 'manual' && !(C.shp > 0)) chev(C.bd, 0xc8d8ff, .7);
        const st = [C.charging ? 'NÁPOR!' : '', C.couch ? 'Sklopená kopija!' : '', C.rd ? 'Nápriah ' + DIR_N[C.rd.d] + (C.rd.t > C.rd.ready + 4 ? ' ' + Math.round(100 + 45 * Math.min(1, (C.rd.t - C.rd.ready) / 30)) + ' %' : '') : '', C.draw > 0 ? 'Napínaš: ' + Math.round(Math.min(1, C.draw / 26) * 100) + ' %' : '', C.gb > 0 ? 'Kryt prelomený' : '', C.ammo0 ? 'Šípy: ' + C.ammo : '', C.ammo0 && C.km ? (C.wpn === 'r' ? 'V ruke: strelná zbraň' : 'V ruke: zbraň na blízko') : '', C.cry > 0 ? '' : 'Pokrik (V) pripravený', 'Skupina: ' + GRP_N[C.sel]].filter(Boolean).join('   ');
        this.cmbT[2].setPosition(W / 2, 90).setText(st).setVisible(true);
        // hlásenia ako vo Warbande (zásahy, zabitia) vľavo dole
        if (!this.msgT) this.msgT = Array.from({ length: 7 }, () => this.add.text(10, 0, '', txtStyle(10, '#e8d8a8', { stroke: '#000', strokeThickness: 3 })).setOrigin(0, 1).setDepth(5));
        const M = (C.msgs || []).filter(m => (m.t -= 1) > 0); C.msgs = M;
        this.msgT.forEach((t, i) => { const m = M[M.length - 1 - i]; if (!m) { t.setVisible(false); return; } t.setText(m.s); if (t._c !== m.c) { t._c = m.c; t.setColor(m.c); } t.setAlpha(Math.min(1, m.t / 60)).setPosition(10, H - 2 * 26 - 14 - i * 13).setVisible(true); });
        // zameriavač v strede (mierenie ako vo Warbande)
        if (typeof B3 !== 'undefined' && B3.isOn() && B3.look && !B3.photo) {
            const cx = W / 2, cy = H / 2, dr = C.draw > 0 ? Math.min(1, C.draw / 26) : 0, bow = C.wpn === 'r' || C.draw > 0;
            const gap = bow ? 3 + (1 - dr) * 13 + (C.draw > 110 ? Math.sin(tm * 1.7) * 2 + 2 : 0) : 2.5, L = bow ? 6 : 4;
            g.lineStyle(1.4, 0x000000, .55); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) g.lineBetween(cx + dx * gap, cy + dy * gap, cx + dx * (gap + L), cy + dy * (gap + L));
            g.lineStyle(1, bow && dr >= 1 ? 0xffd24a : 0xf4ead0, .95); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) g.lineBetween(cx + dx * gap, cy + dy * gap, cx + dx * (gap + L), cy + dy * (gap + L));
        }
        // málo zdravia: červený okraj obrazovky
        const hp = U[0] ? U[0].hp / U[0].mh : 1;
        if (hp < .35 && U[0].hp > 0) { const a = (.35 - hp) / .35 * (.55 + .15 * Math.sin(tm / 5)), w = 70, c = 0x8a0000;
            g.fillGradientStyle(c, c, c, c, a, a, 0, 0).fillRect(0, 0, W, w); g.fillGradientStyle(c, c, c, c, 0, 0, a, a).fillRect(0, H - w, W, w);
            g.fillGradientStyle(c, c, c, c, a, 0, a, 0).fillRect(0, 0, w, H); g.fillGradientStyle(c, c, c, c, 0, a, 0, a).fillRect(W - w, 0, w, H); }
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
                ['Kronika', 'book', ['Kronika hrdinu', 'Legenda', 'Trofeje', 'Úspechy', 'Encyklopédia', 'Návod']],
                ['Nastavenia', 'gear', ['Nastavenia hry', 'Zvuk', 'Celá obrazovka', 'Ukončiť hru']]];
    }

    syncBars() {
        const vis = el => el.style.display !== 'none' && !!G && !this.dlg && !ROOM_MODES.has(mode);
        if (this.dlg || !vis(tb)) this.menu = null;
        const sig = [vis(tb), vis(od), this.menu, this.big, ...[...tb.children, ...od.children].map(b => b.textContent + (b.style.opacity || '') + b.style.display)].join('|');
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
            all.filter(b => { const t = b.textContent.trim(); return b.style.display !== 'none' && !/^[−+]$/.test(t) && !/tábor|pobyt/i.test(t) && ![...grouped].some(n => t.startsWith(n)); })
               .forEach(b => put(b.textContent, Icons.forButton(b.textContent), () => b.click()));
            this.barLayer.add(out);
            if (this.pause) this.pause.y = y - 14;
        }
        if (vis(od)) {   // dolný rad rozkazy, nad ním skupiny vojska
            const all = [...od.children], rowOf = (bs, w, y, sz) => { const x0 = W / 2 - (bs.length * (w + 4)) / 2; bs.forEach((b, i) => { const ic = Icons.forButton(b.textContent.replace(/^\S+ /, '')); this.barLayer.add(this.button(x0 + i * (w + 4), y, w, b === bs[0] && sz ? BH - 4 : BH - (sz ? 4 : 0), b.textContent, () => b.click(), { size: sz || 11, sel: +(b.style.opacity || 1) === 1, icon: ic ? Icons.tex(this, ic) : null })); }); };
            rowOf(all.filter(b => !b.dataset.g), 92, H - BH - 4);
            rowOf(all.filter(b => b.dataset.g), 96, H - 2 * BH - 6, 10);
        }
    }

    // ---------- Oznámenie o dobytí hradu ---------------------------------------------
    syncEvents(dt) {
        if (!this.evLayer) this.evLayer = this.add.container(0, 0).setDepth(35);
        const ev = typeof EVENTS !== 'undefined' && G ? EVENTS[0] : null;
        if (!ev) { if (this.evSig) { this.evLayer.removeAll(true); this.evSig = null; } return; }
        ev.l -= dt;
        if (ev.l <= 0) { EVENTS.shift(); this.evLayer.removeAll(true); this.evSig = null; return; }
        const sig = ev.t + ev.oldF + ev.newF + ev.who;
        if (sig !== this.evSig) {
            this.evSig = sig; this.evLayer.removeAll(true);
            const PW2 = 300, PH2 = 58, px = W / 2 - PW2 / 2, py = 96;
            const g = this.add.graphics();
            g.fillStyle(0x120e0c, .92).fillRoundedRect(px, py, PW2, PH2, 6);
            g.lineStyle(1.5, UI_C.line, 1).strokeRoundedRect(px, py, PW2, PH2, 6);
            g.fillStyle(hex(FC[ev.oldF]), .85).fillRoundedRect(px + 5, py + 5, PW2 / 2 - 12, PH2 - 10, 4);
            g.fillStyle(hex(FC[ev.newF]), .85).fillRoundedRect(px + PW2 / 2 + 7, py + 5, PW2 / 2 - 12, PH2 - 10, 4);
            g.fillStyle(0x000000, .4).fillRoundedRect(px + 5, py + 5, PW2 / 2 - 12, PH2 - 10, 4).fillRoundedRect(px + PW2 / 2 + 7, py + 5, PW2 / 2 - 12, PH2 - 10, 4);
            const items = [g];
            const fl = (f, x) => items.push(this.add.image(x, py + 10, Art.banner(this, f)).setOrigin(.5, 0).setScale(1.3 / RES));
            fl(ev.oldF, px + 24); fl(ev.newF, px + PW2 / 2 + 26);
            items.push(this.add.text(px + 44, py + 9, FN[ev.oldF], txtStyle(11, FC[ev.oldF], { fontFamily: TITLE_FONT, stroke: '#000', strokeThickness: 2 })));
            items.push(this.add.text(px + 44, py + 25, 'stratil ' + ev.t, txtStyle(10, '#fff', { fontStyle: 'bold', stroke: '#000', strokeThickness: 2, wordWrap: { width: 96 } })));
            items.push(this.add.text(px + PW2 / 2 + 46, py + 9, FN[ev.newF], txtStyle(11, FC[ev.newF], { fontFamily: TITLE_FONT, stroke: '#000', strokeThickness: 2 })));
            items.push(this.add.text(px + PW2 / 2 + 46, py + 25, 'dobyl: ' + ev.who, txtStyle(10, '#ffd24a', { fontStyle: 'bold', stroke: '#000', strokeThickness: 2, wordWrap: { width: 96 } })));
            items.push(this.add.text(W / 2, py + PH2 / 2, '➜', txtStyle(16, UI_C.gold)).setOrigin(.5));
            this.evLayer.add(items);
        }
        this.evLayer.setAlpha(Math.min(1, ev.l / 40));
    }

    measure(s, size) { const t = this.add.text(0, 0, s, txtStyle(size, '#fff')); const w = t.width; t.destroy(); return w; }

    /** Tlačidlo v štýle hry; vráti pole objektov. */
    button(x, y, w, h, label, fn, o = {}) {
        const off = !!o.disabled, size = o.size || 14;
        // jednotný štýl okien (ako hlavné menu): tmavé drevo, zlatý rám, svetlé zlaté písmo; vybrané tlačidlo svieti
        const fill = off ? UI_C.btnOff : o.sel ? UI_C.btnSel : UI_C.btn, edge = off ? 0x5a4a3a : o.sel ? 0xffe08a : 0xb08a3a;
        const r = this.add.rectangle(x, y, w, h, fill).setOrigin(0).setStrokeStyle(1.5, edge, 1).setAlpha(o.alpha ?? 1);
        const deco = this.add.graphics().setAlpha(o.alpha ?? 1);
        deco.fillStyle(0xffe0a0, off ? .05 : .16).fillRect(x + 1.5, y + 1.5, w - 3, 1);          // svetlá horná hrana
        deco.fillStyle(0x000000, .35).fillRect(x + 1.5, y + h - 2.5, w - 3, 1);                 // tieň dole
        if (!off && h >= 20) deco.lineStyle(.8, 0xd9a441, .28).strokeRect(x + 3, y + 3, w - 6, h - 6);   // vnútorná linka
        if (!off && w >= 110 && !o.icon) { deco.fillStyle(0xd9a441, .75); for (const dx of [7, w - 7]) deco.fillTriangle(x + dx, y + h / 2 - 3, x + dx + 3, y + h / 2, x + dx, y + h / 2 + 3).fillTriangle(x + dx, y + h / 2 - 3, x + dx - 3, y + h / 2, x + dx, y + h / 2 + 3); }   // kosoštvorčeky
        const is = Math.min(h - 4, o.iconSize || 24), iw = o.icon ? (o.bare ? 0 : is + 6) : 0;
        const t = this.add.text(x + iw + (w - iw) / 2, y + h / 2, label, txtStyle(size, off ? UI_C.dim : o.sel ? '#fff4d0' : '#f3dc9a', { align: 'center', wordWrap: { width: Math.max(10, w - 12 - iw), useAdvancedWrap: true } })).setOrigin(.5);
        const out = [r, deco, t];
        if (o.icon) {
            const cx = o.bare ? x + w / 2 : x + 3 + is / 2;
            const im = this.add.image(cx, y + h / 2, o.icon).setDisplaySize(is - 2, is - 2).setAlpha(off ? .6 : 1);
            out.push(im);
        }
        if (!off && fn) {
            r.setInteractive({ useHandCursor: true });
            r.on('pointerover', () => { r.setFillStyle(UI_C.btnHover); r.setStrokeStyle(1.5, 0xffd890, 1); t.setColor('#fff4d0'); if (typeof uiSnd === 'function') uiSnd('hover'); });
            r.on('pointerout', () => { r.setFillStyle(fill); r.setStrokeStyle(1.5, edge, 1); t.setColor(o.sel ? '#fff4d0' : '#f3dc9a'); });
            r.on('pointerdown', () => { if (typeof uiSnd === 'function') uiSnd('click'); });
            r.on('pointerup', () => { if (!(this.drag && this.drag.moved)) fn(); });
        }
        return out;
    }

}
