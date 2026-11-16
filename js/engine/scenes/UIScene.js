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
        this.pause = t(W / 2, H - 74, 'Pauza: klikni na mapu alebo sa utábor, aby čas plynul', 12, '#ffd24a', { backgroundColor: 'rgba(18,14,12,.7)', padding: { x: 12, y: 4 }, fontStyle: 'italic' }).setOrigin(.5).setDepth(5);
        this.gateTxt = t(W / 2, 140, '', 13, UI_C.ink, { fontFamily: 'sans-serif', stroke: '#000', strokeThickness: 3 }).setOrigin(.5).setDepth(5);
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
        this.drawDial(scene);
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
        if (TS && TS.l > 0 && G) { TS.l -= dt; this.toast.setVisible(!this.dlg).setText(TS.s).setAlpha(Math.min(1, TS.l / 40)).setY(scene === 'battle' ? (typeof bossAlive === 'function' && bossAlive() ? 104 : 84) : 70); }
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
            this.drawCombatHud(g);
            if (SGB) {
                g.fillStyle(0x000000, .6).fillRect(W / 2 - 82, 120, 164, 8);
                g.fillStyle(0xc08a3a, 1).fillRect(W / 2 - 80, 122, 160 * Math.max(0, SGB.gate) / SGB.mg, 4);
                this.gateTxt.setVisible(true).setText(SGB.gate > 0 ? 'Brána hradu' : 'Brána je zničená!');
            }
        }
    }

    /** Bitka: výdrž a štít hrdinu pod zdravím, morálka oboch strán, stav (nápor, šípy, pokrik, prelomený kryt). */
    drawCombatHud(g) {
        if (typeof CMB === 'undefined') return;
        const C = CMB, h = U[0], tx = (k, str, size, col, ox, oy) => { if (!this.cmbT[k]) this.cmbT[k] = this.add.text(0, 0, '', txtStyle(size, col, { stroke: '#000', strokeThickness: 3 })).setDepth(5); return this.cmbT[k].setOrigin(ox, oy).setText(str).setVisible(true); };
        if (!this.cmbT) this.cmbT = [];
        // horný pás: sila a morálka oboch strán (vľavo tvoja, vpravo nepriateľ)
        if (!this.cnt || (this.cntT = (this.cntT || 0) + 1) % 8 === 0) { let a = 0, b = 0; for (const u of U) if (u.hp > 0 && !u.fled) (u.t ? b++ : a++); this.cnt = [a, b]; }
        const cx0 = W / 2, sy = 6;
        g.fillStyle(0x0e0a08, .72).fillRoundedRect(cx0 - 250, sy, 500, 26, 6); g.lineStyle(1, 0xc9a24a, .55).strokeRoundedRect(cx0 - 250, sy, 500, 26, 6);
        const bar = (bx, v, col, right) => { const bw = 150, f = bw * Math.max(0, Math.min(100, v)) / 100; g.fillStyle(0x000000, .6).fillRect(bx, sy + 9, bw, 8); g.fillStyle(col, 1).fillRect(right ? bx + bw - f : bx, sy + 9, f, 8); g.fillStyle(0xffffff, .22).fillRect(right ? bx + bw - f : bx, sy + 9, f, 3); g.fillStyle(0xffffff, .5).fillRect(right ? bx + bw * .65 : bx + bw * .35, sy + 7, 1, 12); };
        if (!C.noRout) { bar(cx0 - 170, C.M[0], C.M[0] < 35 ? 0xd07030 : 0xd9a441, 0); bar(cx0 + 20, C.M[1], C.M[1] < 35 ? 0xd07030 : 0xc0392b, 1); }
        g.fillStyle(0xc9a24a, .7).fillRect(cx0 - 1, sy + 5, 2, 16);
        tx(0, 'Tvoji ' + this.cnt[0], 11, '#f3dc9a', 1, .5).setPosition(cx0 - 178, sy + 14);
        tx(1, this.cnt[1] + ' Nepriateľ', 11, '#ffb0a0', 0, .5).setPosition(cx0 + 178, sy + 14);
        // kompas ako vo Warbande: svetové strany a kde sú nepriatelia (červené) a tvoji (modré) vzhľadom na smer pohľadu
        const on3 = typeof B3 !== 'undefined' && B3.isOn && B3.isOn(), camY = on3 ? B3.yaw : C.km && C.aim3 ? C.aim3.yaw : h.f, wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
        if (OPT.compass !== false && h.hp > 0) {
            const ky = 38, KW = 170, HALF = Math.PI * .6, kx = a => { const r = wrap(a - camY); return Math.abs(r) > HALF ? null : cx0 + r / HALF * KW; };
            if (!this.kBin || (this.kT = (this.kT || 0) + 1) % 6 === 0) {
                const E = new Array(36).fill(0), A = new Array(36).fill(0); let nr = null, nd = 1e9;
                for (const u of U) { if (u.hp <= 0 || u.fled || u.h) continue; const d = Math.hypot(u.x - h.x, u.y - h.y), b = ((Math.round(Math.atan2(u.y - h.y, u.x - h.x) / (Math.PI / 18)) % 36) + 36) % 36; if (u.t) { E[b]++; if (!u.rout && d < nd) { nd = d; nr = u; } } else A[b]++; }
                this.kBin = [E, A]; this.kNear = nr; this.kNd = nd;
            }
            g.fillStyle(0x0e0a08, .6).fillRoundedRect(cx0 - KW - 10, ky - 2, KW * 2 + 20, 18, 5);
            g.lineStyle(1, 0xc9a24a, .35); for (let i = 0; i < 24; i++) { const x = kx(i * Math.PI / 12); if (x != null && i % 6) g.lineBetween(x, ky + 10, x, ky + 14); }
            const [E, A] = this.kBin;
            for (let i = 0; i < 36; i++) { const x = kx(i * Math.PI / 18); if (x == null) continue; if (A[i]) { const hh = Math.min(7, 2 + A[i] * .5); g.fillStyle(0x6aa8ff, .85).fillRect(x - 2, ky + 14 - hh, 4, hh); } if (E[i]) { const hh = Math.min(12, 3 + E[i] * .6); g.fillStyle(0xff4a30, .9).fillRect(x - 2.5, ky, 5, hh); } }
            [['S', -Math.PI / 2], ['V', 0], ['J', Math.PI / 2], ['Z', Math.PI]].forEach(([n, a], i) => { const x = kx(a); if (x == null) { if (this.cmbT[20 + i]) this.cmbT[20 + i].setVisible(false); } else tx(20 + i, n, 11, n === 'S' ? '#ffd24a' : '#e8d8a8', .5, .5).setPosition(x, ky + 7); });
            g.fillStyle(0xffd24a, .9).fillTriangle(cx0, ky + 13, cx0 - 4, ky + 18, cx0 + 4, ky + 18);
            // najbližší nepriateľ mimo záberu: šípka na okraji obrazovky
            const n = this.kNear;
            if (n && n.hp > 0 && this.kNd > 30) {
                const r = wrap(Math.atan2(n.y - h.y, n.x - h.x) - camY), pul = .55 + .3 * Math.sin(tm * .15);
                const nx = kx(r + camY); if (nx != null) { g.fillStyle(0xff4a30, 1).fillTriangle(nx, ky + 15, nx - 5, ky + 21, nx + 5, ky + 21); }
                if (Math.abs(r) > .8) {   // mimo zorného poľa
                    let ex, ey, ang;
                    if (Math.abs(r) > 2.5) { ex = W / 2; ey = H - 120; ang = Math.PI / 2; } else { const sd = Math.sign(r); ex = sd > 0 ? W - 34 : 34; ey = H / 2; ang = sd > 0 ? 0 : Math.PI; }
                    const s2 = 14, c = Math.cos(ang), si = Math.sin(ang);
                    g.fillStyle(0xff4a30, pul).fillTriangle(ex + c * s2, ey + si * s2, ex - c * s2 * .6 - si * s2 * .8, ey - si * s2 * .6 + c * s2 * .8, ex - c * s2 * .6 + si * s2 * .8, ey - si * s2 * .6 - c * s2 * .8);
                }
            }
        } else for (let i = 20; i < 24; i++) if (this.cmbT[i]) this.cmbT[i].setVisible(false);
        // panel hrdinu vľavo dole: zdravie, štít, kôň, výdrž, šípy
        const px = 10, py = H - 98, ph = 62;
        g.fillStyle(0x0e0a08, .74).fillRoundedRect(px, py, 188, ph, 6); g.lineStyle(1, 0xc9a24a, .55).strokeRoundedRect(px, py, 188, ph, 6);
        const pb = (y, v, max, col, hh) => { const f = 172 * Math.max(0, Math.min(1, v / max)); g.fillStyle(0x000000, .6).fillRect(px + 8, y, 172, hh); g.fillStyle(col, 1).fillRect(px + 8, y, f, hh); g.fillStyle(0xffffff, .2).fillRect(px + 8, y, f, Math.max(2, hh / 3)); };
        const hpv = Math.ceil(Math.max(0, h.hp)); pb(py + 8, h.hp, h.mh, h.hp < h.mh * .35 ? 0xd03020 : 0xb8402a, 12);
        tx(4, hpv + ' / ' + Math.round(h.mh), 10, '#fff', .5, .5).setPosition(px + 94, py + 14);
        let ry = py + 24;
        if (C.shMax) { pb(ry, C.shp, C.shMax, C.blk ? 0xd8e8ff : 0x8aa0c0, 6); ry += 9; }
        if (C.horse0) { pb(ry, C.horse, C.horse0, 0xa06a30, 6); ry += 9; }
        if (OPT.noStam === false) { pb(ry, C.st, 100, C.gb > 0 ? (Math.floor(tm / 4) % 2 ? 0xff5030 : 0x802010) : 0xd9b84a, 5); ry += 8; }
        tx(5, [C.ammo0 ? 'Šípy ' + C.ammo : '', C.ammo0 && C.km ? (C.wpn === 'r' ? 'v ruke: strelná' : 'v ruke: zbraň') : '', C.cry > 0 ? '' : 'pokrik (V)'].filter(Boolean).join('  ·  '), 9, '#c8b48a', 0, 0).setPosition(px + 8, py + ph - 14);
        const bo = bossAlive();   // boss: veľká lišta zdravia s menom
        if (bo) { g.fillStyle(0x000000, .65).fillRect(W / 2 - 152, 64, 304, 12); g.fillStyle(0x8a1a10, 1).fillRect(W / 2 - 150, 66, 300 * bo.hp / bo.mh, 8); g.fillStyle(0xff8a40, .5).fillRect(W / 2 - 150, 66, 300 * bo.hp / bo.mh, 3); tx(3, BOSSES[bo.boss].n, 12, '#ffb090', .5, 0).setPosition(W / 2, 78); }
        // cieľ pod zameriavačom: meno a zdravie (ako vo Warbande)
        if (h.hp > 0) {
            if (!this.tgSig || (this.tgT = (this.tgT || 0) + 1) % 3 === 0) {
                const ya = C.km && C.aim3 ? C.aim3.yaw : h.f; let best = null, bs = 1e9;
                for (const u of U) if (u.t && u.hp > 0 && !u.fled) { const dx = u.x - h.x, dy = u.y - h.y, d = Math.hypot(dx, dy); if (d > 160 || d < 1) continue; const da = angD(ya, Math.atan2(dy, dx)); if (da > .1 + 12 / d) continue; const sc = d + da * 220; if (sc < bs) { bs = sc; best = u; } }
                this.tgSig = 1; this.tgU = best; C.tgU = best;   // 3D: krúžok pod cieľom (js/engine/b3d.js)
            }
            const u = this.tgU;
            if (u && u.hp > 0) { const ty = H / 2 + 36; g.fillStyle(0x000000, .6).fillRect(W / 2 - 41, ty + 13, 82, 6); g.fillStyle(0xc0392b, 1).fillRect(W / 2 - 40, ty + 14, 80 * Math.max(0, u.hp) / u.mh, 4); tx(6, unitName(u), 10, '#f4e8d0', .5, 0).setPosition(W / 2, ty); }
        }
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
            const cam = C.km && C.aim3 ? C.aim3.yaw : h0.f, cx = W / 2, cy = H * .5, R = Math.min(W, H) * .15, T = [];
            for (const u of U) if (u.t && u.hp > 0) {
                if (u.wu > 0 && u.wt === h0) T.push({ u, k: 1 - u.wu / u.wu0, a: 0 });
                else if (u.aim > 0 && u.at === h0) T.push({ u, k: 1 - u.aim / (u.aim0 || 40), a: 1 });
            }
            T.sort((p, q) => q.k - p.k);
            for (const t of T.slice(0, 5)) {
                const rel = Math.atan2(Math.sin(dirTo(h0, t.u) - cam), Math.cos(dirTo(h0, t.u) - cam)), r = R + (t.a ? 14 : 0), x = cx + Math.sin(rel) * r, y = cy - Math.cos(rel) * r, sz = (t.a ? 7 : 8) + 7 * t.k, ox = Math.sin(rel), oy = -Math.cos(rel);
                g.fillStyle(t.a ? 0xff9a30 : 0xff3020, .55 + .4 * t.k);
                g.fillTriangle(x + ox * sz, y + oy * sz, x - ox * sz * .4 - oy * sz * .75, y - oy * sz * .4 + ox * sz * .75, x - ox * sz * .4 + oy * sz * .75, y - oy * sz * .4 - ox * sz * .75);
                if (t.a && t.k > .55) { g.lineStyle(1.5, 0xff9a30, .5); g.lineBetween(cx + ox * (R - 10), cy + oy * (R - 10), cx + ox * 24, cy + oy * 24); }
            }
        }
        if (C.blk && OPT.blkDir === 'manual' && !(C.shp > 0)) chev(C.bd, 0xc8d8ff, .7);
        const st = [C.charging ? 'NÁPOR!' : '', C.couch ? 'Sklopená kopija!' : '', C.rd ? 'Nápriah ' + DIR_N[C.rd.d] + (C.rd.t > C.rd.ready + 4 ? ' ' + Math.round(100 + 45 * Math.min(1, (C.rd.t - C.rd.ready) / 30)) + ' %' : '') : '', C.draw > 0 ? 'Napínaš: ' + Math.round(Math.min(1, C.draw / 26) * 100) + ' %' : '', C.gb > 0 ? 'Kryt prelomený' : ''].filter(Boolean).join('   ');
        if (st) tx(2, st, 12, '#ffd24a', .5, .5).setPosition(W / 2, H * .64);
        // hlásenia ako vo Warbande (zásahy, zabitia) vľavo dole
        if (!this.msgT) this.msgT = Array.from({ length: 7 }, () => this.add.text(10, 0, '', txtStyle(10, '#e8d8a8', { stroke: '#000', strokeThickness: 3 })).setOrigin(0, 1).setDepth(5));
        const M = (C.msgs || []).filter(m => (m.t -= 1) > 0); C.msgs = M;
        this.msgT.forEach((t, i) => { const m = M[M.length - 1 - i]; if (!m) { t.setVisible(false); return; } t.setText(m.s); if (t._c !== m.c) { t._c = m.c; t.setColor(m.c); } t.setAlpha(Math.min(1, m.t / 60)).setPosition(10, H - 102 - i * 13).setVisible(true); });
        // zameriavač v strede (mierenie ako vo Warbande): bodka a krátke čiarky; rozšíri sa v pohybe, pri dosahu zbrane zčervenie
        if (typeof B3 !== 'undefined' && B3.isOn() && B3.look && !B3.photo && OPT.xhair !== 'off') {
            const cx = W / 2, cy = H / 2, dr = C.draw > 0 ? Math.min(1, C.draw / 26) : 0, bow = C.wpn === 'r' || C.draw > 0, ks = OPT.xhair === 's' ? .75 : 1;
            const mvK = Math.min(1, Math.hypot(C.vx || 0, C.vy || 0) / 2.2), gap = (bow ? 3 + (1 - dr) * 13 + (C.draw > 110 ? Math.sin(tm * 1.7) * 2 + 2 : 0) : 2.5 + mvK * 3) * ks, L = (bow ? 6 : 4) * ks;
            let col = bow && dr >= 1 ? 0xffd24a : 0xf4ead0;
            const tgu = this.tgU;
            if (!bow && tgu && tgu.hp > 0 && typeof wpnTimes === 'function' && Math.hypot(tgu.x - h.x, tgu.y - h.y) < wpnTimes().reach + (tgu.r || 6)) col = 0xff7a50;
            g.fillStyle(0x000000, .55).fillCircle(cx, cy, 2.1 * ks); g.fillStyle(col, .95).fillCircle(cx, cy, 1.3 * ks);
            g.lineStyle(1.4, 0x000000, .55); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) g.lineBetween(cx + dx * gap, cy + dy * gap, cx + dx * (gap + L), cy + dy * (gap + L));
            g.lineStyle(1, col, .95); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) g.lineBetween(cx + dx * gap, cy + dy * gap, cx + dx * (gap + L), cy + dy * (gap + L));
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
        const on = !!G && hud.style.visibility !== 'hidden' && !ov.classList.contains('intro') && mode !== 'battle';
        const onMap = on && mode === 'map' && this.scene.isActive('Map');
        const sig = on ? hud.innerHTML + '|' + onMap + '|' + (G.hp | 0) : '';
        if (sig === this.sig.hud) return;
        this.sig.hud = sig;
        this.hudLayer.removeAll(true);
        if (!on) return;
        // ROZHRANIE „FILMOVÉ MINIMUM“: žiadne pásy, len stmavené okraje; hodnoty vľavo hore, deň vpravo hore,
        // hrdina s kruhom zdravia vľavo dole (drawHero), kolieso dňa a noci v strede (drawDial), tlačidlá vpravo dole (syncBars)
        const shadow = t => t.setShadow(0, 1.5, '#000', 4, true, true);
        const items = [], zones = [];
        const vg = this.add.graphics();
        vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, .62, .62, 0, 0).fillRect(0, 0, W, 64);
        if (onMap) { vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, .7, .7).fillRect(0, H - 110, W, 110);
            vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, .32, 0, .32, 0).fillRect(0, 0, 90, H); vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, .32, 0, .32).fillRect(W - 90, 0, 90, H); }
        items.push(vg);
        // rozober položky hornej lišty (HTML #hud) na skupiny
        const P = { army: [], rest: [] };
        [...hud.children].forEach((span, k) => {
            const val = span.querySelector('b'), full = span.textContent.replace(/\s+/g, ' ').trim();
            if (val && val.textContent.trim() === '0' && !/Zlato|Sláva/.test(full)) return;
            const col = span.style.color || '', warn = /255, 122, 90|ff7a5a/i.test(col) ? 2 : /255, 192, 112|ffc070/i.test(col) ? 1 : /255, 179, 71|ffb347/i.test(col) ? 1 : 0;
            let value = val ? val.textContent.replace(/\s+/g, ' ').trim() : full, label = full.replace(value, '').replace(/^[,:\s]+|[:\s]+$/g, '').trim() || full;
            const m = value.match(/^([^:]+):\s*(.+)$/); if (m) { label = m[1]; value = m[2]; }
            const it = { full, value, label, warn, icon: Icons.forHud(full, k === 0) };
            if (k === 0) P.name = { name: value, rank: full.replace(value, '').replace(/^[,\s]+/, '') };
            else if (/^Deň/.test(full)) P.day = { n: value, note: (full.match(/\(([^)]*)\)/) || [])[1] || '' };
            else if (/^Zdravie/.test(full)) P.hp = it;
            else if (/^Úroveň/.test(full)) P.lv = { n: value, xp: (full.match(/\(([^)]*)\)/) || [])[1] || '' };
            else if (/^(Pešiaci|Jazdci|Lukostrelci|Elfovia|Rohirimi|Veteráni|Elitné)/.test(full)) P.army.push(it);
            else P.rest.push(it);
        });
        const tip = (x, y, w, h, s2) => zones.push([x, y, w, h, s2]);
        // vľavo hore: hodnoty plávajú na stmavenom okraji (ikona + číslo), varovania farebne a ikona bliká
        let x = 14, y = 9;
        for (const it of P.rest) {
            const col = it.warn === 2 ? '#ff9c80' : it.warn === 1 ? '#ffc890' : '#f6ecd6';
            const tv = shadow(this.add.text(0, 0, it.icon ? it.value : it.full, txtStyle(13, col, { fontStyle: 'bold' })));
            const iw = (it.icon ? 18 : 0) + tv.width;
            if (x + iw > W - 150 && x > 14) { x = 14; y += 20; }
            if (it.icon) { const im = this.add.image(x, y + 9, Icons.tex(this, it.icon)).setDisplaySize(15, 15).setOrigin(0, .5); items.push(im); if (it.warn === 2) this.tweens.add({ targets: im, alpha: .25, duration: 550, yoyo: true, repeat: -1 }); }
            tv.setPosition(x + (it.icon ? 18 : 0), y + 9 - tv.height / 2); items.push(tv);
            tip(x - 3, y - 1, iw + 6, 20, it.label + (it.label !== it.value ? ': ' + it.value : ''));
            x += iw + 16;
        }
        // vpravo hore: deň veľkým písmom, ročné obdobie a počasie kurzívou
        if (P.day) {
            const d = shadow(this.add.text(W - 14, 5, 'Deň ' + P.day.n, txtStyle(19, '#f6ecd6', { fontFamily: TITLE_FONT }))).setOrigin(1, 0);
            const n = shadow(this.add.text(W - 15, 29, P.day.note, txtStyle(11, '#cdbb95', { fontStyle: 'italic' }))).setOrigin(1, 0);
            items.push(d, n);
        }
        // vľavo dole: hrdina (len na mape – v krčme a na hrade má miesto okno)
        if (onMap && P.name) items.push(...this.drawHero(P));
        this.hudLayer.add(items);
        for (const [zx, zy, zw, zh, t2] of zones) {   // popis položky po ukázaní myšou
            const z = this.add.rectangle(zx, zy, zw, zh, 0, 0).setOrigin(0).setInteractive();
            let tb2 = null;
            z.on('pointerover', () => {
                const t = this.add.text(0, 0, t2, txtStyle(11, '#f3dc9a')), tw = t.width + 14, tx = Math.max(4, Math.min(W - tw - 4, zx)), ty = zy > H / 2 ? zy - 24 : zy + zh + 3;
                const g = this.add.graphics().fillStyle(0x120e0c, .95).fillRoundedRect(tx, ty, tw, 20, 4).lineStyle(1, UI_C.line, .9).strokeRoundedRect(tx, ty, tw, 20, 4);
                t.setPosition(tx + 7, ty + 3); tb2 = this.add.container(0, 0, [g, t]); this.hudLayer.add(tb2);
            });
            z.on('pointerout', () => { if (tb2) { tb2.destroy(true); tb2 = null; } });
            this.hudLayer.add(z);
        }
    }

    /** Hrdina vľavo dole: portrét v kruhu, okolo neho červený oblúk zdravia, odznak úrovne, meno, hodnosť a vojsko. Klik = Prehľad. */
    drawHero(P) {
        const out = [], cx = 46, cy = H - 46, R = 32;
        const look = Portraits.hero(), key = 'hud_por_' + JSON.stringify(look).replace(/[^a-z0-9]/gi, '').slice(0, 120);
        if (!this.textures.exists(key)) {
            const src = Portraits.canvas(look, 128), cv = document.createElement('canvas'); cv.width = cv.height = 128;
            const c = cv.getContext('2d'); c.beginPath(); c.arc(64, 64, 64, 0, 6.283); c.clip(); c.fillStyle = '#2a1a10'; c.fillRect(0, 0, 128, 128); c.drawImage(src, 0, 4, 128, 128);
            this.textures.addCanvas(key, cv);
        }
        const g = this.add.graphics();
        g.fillStyle(0x000000, .45).fillCircle(cx, cy + 2, R + 6);
        g.lineStyle(4, 0x000000, .55).strokeCircle(cx, cy, R + 3);
        const m = /(\d+)\s*\/\s*(\d+)/.exec(P.hp ? P.hp.value : ''), f = m ? Math.max(0, Math.min(1, +m[1] / +m[2])) : 1;
        g.lineStyle(4, f < .35 ? 0xff5030 : 0xd84a3a, 1).beginPath().arc(cx, cy, R + 3, -Math.PI / 2, -Math.PI / 2 + f * 6.283).strokePath();
        g.lineStyle(1, 0xe6c37a, .75).strokeCircle(cx, cy, R - .5);
        out.push(g, this.add.image(cx, cy, key).setDisplaySize(R * 2 - 2, R * 2 - 2));
        if (P.lv) { const b = this.add.graphics().fillStyle(0x2a1c10, 1).fillCircle(cx + 24, cy + 24, 9).lineStyle(1.2, 0xe6c37a, 1).strokeCircle(cx + 24, cy + 24, 9); out.push(b, this.add.text(cx + 24, cy + 24, P.lv.n, txtStyle(10, '#f6ecd6', { fontStyle: 'bold' })).setOrigin(.5)); }
        const sh = t => t.setShadow(0, 1.5, '#000', 4, true, true);
        out.push(sh(this.add.text(cx + R + 12, cy - 30, P.name.name, txtStyle(16, '#f6ecd6', { fontFamily: TITLE_FONT }))));
        out.push(sh(this.add.text(cx + R + 13, cy - 10, P.name.rank.replace(/\s*\(/, ' · ').replace(/\)/, '') + (P.hp ? '  ·  ' + P.hp.value + ' zdravia' : ''), txtStyle(10.5, '#cdbb95', { fontStyle: 'italic' }))));
        let ax = cx + R + 13;
        for (const it of P.army) {
            if (it.icon) out.push(this.add.image(ax, cy + 15, Icons.tex(this, it.icon)).setDisplaySize(13, 13).setOrigin(0, .5));
            const t = sh(this.add.text(ax + (it.icon ? 15 : 0), cy + 15, it.icon ? it.value : it.full, txtStyle(12, '#f6ecd6', { fontStyle: 'bold' }))).setOrigin(0, .5); out.push(t);
            const z = this.add.rectangle(ax - 2, cy + 6, t.width + 19, 18, 0, 0).setOrigin(0).setInteractive(); z.on('pointerover', () => { this._armyTip = this.add.text(ax, cy - 52, it.label + ': ' + it.value, txtStyle(11, '#f3dc9a', { backgroundColor: 'rgba(18,14,12,.95)', padding: { x: 6, y: 3 } })); }); z.on('pointerout', () => { if (this._armyTip) this._armyTip.destroy(); this._armyTip = null; }); out.push(z);
            ax += (it.icon ? 15 : 0) + t.width + 12;
        }
        const hit = this.add.circle(cx, cy, R + 4, 0, 0).setInteractive({ useHandCursor: true });   // klik na portrét: prehľad hrdinu
        hit.on('pointerup', () => { const b = [...tb.children].find(x => x.textContent.trim().startsWith('Inventár')); if (b) b.click(); });
        out.push(hit);
        return out;
    }

    /** Kolieso dňa a noci v strede dole: slnko a mesiac sa otáčajú s časom dňa; pri čakaní pod ním rýchlosť času. */
    drawDial(scene) {
        if (!this.dialG) { this.dialG = this.add.graphics().setDepth(11); this.dialSpd = this.add.text(0, 0, '', txtStyle(11, '#fff3d0', { fontStyle: 'bold', backgroundColor: 'rgba(110,70,20,.85)', padding: { x: 7, y: 2 } })).setOrigin(.5).setDepth(12).setInteractive({ useHandCursor: true }); this.dialSpd.on('pointerup', () => timeBtn.click()); }
        const g = this.dialG; g.clear();
        const on = scene === 'map' && mode === 'map' && !!G && !this.dlg && !this.big && hud.style.visibility !== 'hidden' && !ov.classList.contains('intro');
        this.dialSpd.setVisible(on && waiting());
        if (!on) return;
        const cx = W / 2, cy = H - 38, R = 26, a = -(dayT / DAY_LEN) * 6.283;   // poludnie hore, polnoc dole
        g.fillStyle(0x0a0806, .55).fillCircle(cx, cy, R + 5); g.lineStyle(1, 0xe6c37a, .6).strokeCircle(cx, cy, R + 5);
        // obloha: horná polovica deň (zlatá), dolná noc (modrá) – kotúč sa otáča
        g.fillStyle(0xe8a850, 1).slice(cx, cy, R, a - Math.PI, a, false).fillPath();
        g.fillStyle(0x16204a, 1).slice(cx, cy, R, a, a + Math.PI, false).fillPath();
        g.fillStyle(0xffd27a, .55).slice(cx, cy, R * .7, a - Math.PI * .8, a - Math.PI * .2, false).fillPath();
        const sx = cx + Math.cos(a - Math.PI / 2) * R * .62, sy = cy + Math.sin(a - Math.PI / 2) * R * .62, mx = cx + Math.cos(a + Math.PI / 2) * R * .62, my = cy + Math.sin(a + Math.PI / 2) * R * .62;
        g.fillStyle(0xfff4c0, 1).fillCircle(sx, sy, 5.5); g.fillStyle(0xfff4c0, .3).fillCircle(sx, sy, 8);
        g.fillStyle(0xe8ecff, 1).fillCircle(mx, my, 4); g.fillStyle(0x16204a, 1).fillCircle(mx + 2, my - 1, 3.4);
        g.fillStyle(0xffffff, .8); for (let k = 0; k < 5; k++) { const sa = a + .5 + k * .45, sr = R * (.35 + (k % 3) * .18); g.fillRect(cx + Math.cos(sa) * sr, cy + Math.sin(sa) * sr, 1, 1); }
        g.lineStyle(1.5, 0x000000, .45).strokeCircle(cx, cy, R);
        g.fillStyle(0xe6c37a, 1).fillTriangle(cx, cy - R - 2, cx - 4, cy - R - 9, cx + 4, cy - R - 9);   // ručička: teraz
        this.dialSpd.setPosition(cx + R + 26, cy).setText('Čas ×' + (G.tmul || 1));
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
            // vpravo dole mriežka okrúhlych tlačidiel (2 × 4), nad ňou lupa; ponuky Hrdina, Kronika a Nastavenia sa otvárajú nahor
            const all = [...tb.children], grouped = new Set(UIScene.GROUPS.flatMap(g => g[2]));
            const find = n => all.find(b => b.textContent.trim().startsWith(n) && b.style.display !== 'none');
            const out = [], R = 16, GAP = 46, colX = c => W - 14 - R - (3 - c) * GAP, rowY = r => H - 34 - (1 - r) * 48;
            const round = (cx, cy, r, ic, label, fn, o = {}) => {
                const g = this.add.graphics(), draw = hov => { g.clear(); g.fillStyle(0x000000, .35).fillCircle(cx, cy + 2, r + 1); g.fillStyle(o.main ? 0x6e4614 : 0x0e0a06, o.main ? (hov ? .95 : .85) : (hov ? .8 : .58)).fillCircle(cx, cy, r); g.lineStyle(1.3, hov || o.on ? 0xffe0a0 : o.main ? 0xf0cf80 : 0xe6c37a, hov ? 1 : .6).strokeCircle(cx, cy, r); };
                draw(false); out.push(g);
                if (ic) out.push(this.add.image(cx, cy, Icons.tex(this, ic)).setDisplaySize(r * 1.15, r * 1.15));
                if (label) out.push(this.add.text(cx, cy + r + 1, label, txtStyle(9.5, o.on ? '#ffe7a0' : '#d8c8a4', { fontStyle: 'bold' })).setOrigin(.5, 0).setShadow(0, 1, '#000', 3, true, true));
                const z = this.add.circle(cx, cy, r, 0, 0).setInteractive({ useHandCursor: true });
                z.on('pointerover', () => { draw(true); if (typeof uiSnd === 'function') uiSnd('hover'); }); z.on('pointerout', () => draw(false));
                z.on('pointerdown', () => { if (typeof uiSnd === 'function') uiSnd('click'); }); z.on('pointerup', () => { if (!(this.drag && this.drag.moved)) fn(); });
                out.push(z);
            };
            const click = n => () => { const b = find(n); if (b) b.click(); };
            const camp = find('Tábor') || find('Zrušiť tábor') || find('Zrušiť pobyt');
            const menuOf = name => () => { this.menu = this.menu === name ? null : name; };
            const slots = [
                ['map', 'Mapa', () => { this.big = !this.big; }, { on: this.big }], ['group', 'Družina', click('Družina')], ['bag', 'Výbava', click('Inventár')], ['quest', 'Úlohy', click('Úlohy')],
                ['helm', 'Hrdina', menuOf('Hrdina'), { on: this.menu === 'Hrdina' }], ['book', 'Kronika', menuOf('Kronika'), { on: this.menu === 'Kronika' }], ['gear', 'Voľby', menuOf('Nastavenia'), { on: this.menu === 'Nastavenia' }],
                camp ? ['tent', /Zrušiť/.test(camp.textContent) ? 'Odísť' : 'Tábor', () => camp.click(), { main: 1, on: /Zrušiť/.test(camp.textContent) }] : null];
            slots.forEach((sl, i) => { if (sl) round(colX(i % 4), rowY(i >> 2), R, sl[0], sl[1], sl[2], sl[3] || {}); });
            // lupa nad mriežkou vpravo
            all.filter(b => /^[−+]$/.test(b.textContent.trim())).forEach((b, i) => round(W - 14 - 11 - (1 - i) * 28, rowY(0) - R - 26, 11, Icons.forButton(b.textContent), '', () => b.click()));
            // ďalšie tlačidlá (nové položky mimo skupín) ako malé okrúhle vľavo od lupy
            const extra = all.filter(b => { const t = b.textContent.trim(); return b.style.display !== 'none' && b !== timeBtn && !/^[−+]$/.test(t) && !/tábor|pobyt/i.test(t) && ![...grouped].some(n => t.startsWith(n)); });
            extra.forEach((b, i) => { const ic = Icons.forButton(b.textContent); round(W - 14 - 11 - (2 + i) * 30, rowY(0) - R - 26, 11, ic || 'help', '', () => b.click()); });
            // otvorená ponuka skupiny: panel nad mriežkou
            for (const [name, ic, list] of UIScene.GROUPS) {
                if (this.menu !== name) continue;
                const bs = list.map(find).filter(Boolean), iw = 150, ih = 24, ph = bs.length * (ih + 3) + 9, bx = W - 14 - iw - 10, py = rowY(0) - R - 40 - ph;
                const panel = this.add.graphics(); panel.fillStyle(0x140e0a, .95).fillRoundedRect(bx, py, iw + 10, ph, 6); panel.lineStyle(1.3, 0xe6c37a, .8).strokeRoundedRect(bx, py, iw + 10, ph, 6);
                out.push(panel, this.add.rectangle(bx, py, iw + 10, ph, 0, 0).setOrigin(0).setInteractive());
                bs.forEach((b, i) => { const t = b.textContent.trim(), bic = Icons.forButton(t); out.push(...this.button(bx + 5, py + 5 + i * (ih + 3), iw, ih, t, () => { this.menu = null; b.click(); }, { size: 11, icon: bic ? Icons.tex(this, bic) : null })); });
            }
            this.barLayer.add(out);
            if (this.pause) this.pause.setPosition(W / 2, H - 78);
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
    /** Rám okna: light = pergamen (tmavé písmo), inak tmavé drevo so zlatým rámom. */
    panelFrame(g, x, y, w, h, light) {
        if (light) {
            g.fillStyle(0x000000, .28).fillRoundedRect(x + 2, y + 3, w, h, 5);
            g.fillStyle(0xe6d2a6, .98).fillRoundedRect(x, y, w, h, 5);
            g.lineStyle(1.5, 0x8a6230, 1).strokeRoundedRect(x, y, w, h, 5);
            g.lineStyle(1, 0xb08a3a, .5).strokeRoundedRect(x + 3, y + 3, w - 6, h - 6, 3);
        } else {
            g.fillStyle(0x000000, .35).fillRoundedRect(x + 2, y + 3, w, h, 5);
            g.fillStyle(UI_C.panel, .96).fillRoundedRect(x, y, w, h, 5);
            g.lineStyle(1.5, UI_C.line, 1).strokeRoundedRect(x, y, w, h, 5);
            g.lineStyle(1, UI_C.line, .3).strokeRoundedRect(x + 3, y + 3, w - 6, h - 6, 3);
        }
        return g;
    }

    button(x, y, w, h, label, fn, o = {}) {
        const off = !!o.disabled, size = o.size || 14;
        // jednotný štýl okien (ako hlavné menu): tmavé drevo, zlatý rám, svetlé zlaté písmo; vybrané tlačidlo svieti
        const fill = off ? UI_C.btnOff : (o.sel || o.primary) ? UI_C.btnSel : UI_C.btn, edge = off ? 0x5a4a3a : (o.sel || o.primary) ? 0xffe08a : 0xb08a3a;
        const r = this.add.rectangle(x, y, w, h, fill).setOrigin(0).setStrokeStyle(1.5, edge, 1).setAlpha(o.alpha ?? 1);
        const deco = this.add.graphics().setAlpha(o.alpha ?? 1);
        deco.fillStyle(0xffe0a0, off ? .03 : .10).fillRect(x + 1.5, y + 1.5, w - 3, Math.max(2, (h - 3) * .45));   // lesk v hornej polovici
        deco.fillStyle(0x000000, .28).fillRect(x + 1.5, y + h - 3.5, w - 3, 2);                                   // tieň dole
        if (!off && h >= 22) deco.lineStyle(.8, 0xd9a441, .30).strokeRect(x + 3, y + 3, w - 6, h - 6);           // vnútorná linka
        const is = Math.min(h - 6, o.iconSize || 22), iw = o.icon ? (o.bare ? 0 : is + 10) : 0;
        if (o.icon && !o.bare) {   // ikonka v zapustenom rámčeku
            const sx = x + 4, sy = y + (h - is - 4) / 2;
            deco.fillStyle(0x0e0a06, off ? .35 : .55).fillRoundedRect(sx, sy, is + 4, is + 4, 3);
            deco.lineStyle(1, 0xb08a3a, off ? .25 : .6).strokeRoundedRect(sx, sy, is + 4, is + 4, 3);
        }
        if (!off && w >= 110 && !o.icon) { deco.fillStyle(0xd9a441, .75); for (const dx of [7, w - 7]) deco.fillTriangle(x + dx, y + h / 2 - 3, x + dx + 3, y + h / 2, x + dx, y + h / 2 + 3).fillTriangle(x + dx, y + h / 2 - 3, x + dx - 3, y + h / 2, x + dx, y + h / 2 + 3); }   // kosoštvorčeky
        const t = this.add.text(x + iw + (w - iw) / 2, y + h / 2, label, txtStyle(size, off ? UI_C.dim : o.sel ? '#fff4d0' : '#f3dc9a', { align: 'center', wordWrap: { width: Math.max(10, w - 12 - iw), useAdvancedWrap: true } })).setOrigin(.5);
        const out = [r, deco, t];
        if (o.icon) {
            const cx = o.bare ? x + w / 2 : x + 6 + is / 2;
            const im = this.add.image(cx, y + h / 2, o.icon).setDisplaySize(o.bare ? is : is - 2, o.bare ? is : is - 2).setAlpha(off ? .6 : 1);
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
