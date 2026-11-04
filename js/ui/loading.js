/*
 * Načítavacia obrazovka pred bitkou: kreslená kódom (žiadne cudzie obrázky) – súmrak nad horami, sopka alebo hrad,
 * dve vojská so zástavami frakcií proti sebe, salva šípov na oblohe, iskry, zlatý prsteň nad nadpisom.
 * Kým je zobrazená, v pozadí sa stavia bojisko, vojaci a predkompilujú sa shadery (aby boj potom nesekal).
 * LoadScr.show(info) · LoadScr.set(podiel 0–1, text) · LoadScr.hide(hotovo)
 */
const LoadScr = (() => {
    let el = null, cv = null, bg = null, raf = 0, t0 = 0, pct = 0, pctShown = 0, stage = '', info = null, embers = [], arrows = [], tip = '';
    const TIPS = [
        'Úder zboku zraní o štvrtinu viac, zozadu o polovicu. Obíď nepriateľa, kým ho drží tvoja pechota.',
        'Kryt tesne pred úderom nepriateľa ho zapotáca – vtedy udri.',
        'Štítový val (G) drží šíp aj nápor. Lukostrelci za ním strieľajú bezpečne.',
        'Kopijníci v šíku zastavia nápor jazdy. Jazdou útoč na lukostrelcov a do bokov.',
        'Zásah do hlavy obyčajného vojaka zabije. Mier vyššie a napni luk naplno.',
        'Padlý veliteľ (zlatý kruh) zlomí morálku jeho vojska.',
        'V daždi a v búrke luky dostrelia menej ďaleko; v noci ešte menej.',
        'Kolieskom myši prepneš medzi zbraňou na blízko a strelnou zbraňou.',
        'Šípy zapichnuté v zemi môžeš zdvihnúť – stačí cez ne prejsť.',
        'Tabulátor prepne pohľad z prvej a tretej osoby. P je fotorežim.',
        'Bojový pokrik (V) dvihne morálku tvojich mužov a vystraší nepriateľa.',
        'Keď hra seká, skús v Nastaveniach menšiu veľkosť bitiek alebo nižšiu grafiku. Automatická kvalita pomáha sama.',
        'Na koni rovný cval znamená nápor – čím rýchlejšie, tým silnejší úder sklopenou kopijou.',
        'Ranených mužov vylieči čas a dobrý tábor. Pestrá strava dvíha morálku.'
    ];
    const WXN = { clear: 'jasno', rain: 'dážď', storm: 'búrka', fog: 'hmla', snow: 'sneh', ash: 'popol Mordoru' };
    const rnd0 = s => () => (s = s * 16807 % 2147483647) / 2147483647;
    const shade = (hex, k) => { const n = parseInt((hex || '#888888').slice(1), 16), r = Math.min(255, (n >> 16) * k | 0), g = Math.min(255, (n >> 8 & 255) * k | 0), b = Math.min(255, (n & 255) * k | 0); return 'rgb(' + r + ',' + g + ',' + b + ')'; };

    /** Statická scéna (raz): obloha, hory, sopka alebo hrad, dve vojská, zem. */
    function paint(W, H) {
        const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), r = rnd0(7 + (info.seed || 1) * 131);
        const pal = { a: ['#120404', '#5a1408', '#e0601c'], s: ['#0a1020', '#34465e', '#c8a888'], d: ['#160c04', '#6a3a14', '#f0a040'], g: ['#0c0a18', '#4a2a3a', '#f08a3a'] }[info.bi] || ['#0c0a18', '#4a2a3a', '#f08a3a'];
        const hz = H * .62;
        let g = x.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, pal[0]); g.addColorStop(.62, pal[1]); g.addColorStop(1, pal[2]); x.fillStyle = g; x.fillRect(0, 0, W, hz + 2);
        // slnko alebo žiara nízko nad obzorom
        g = x.createRadialGradient(W * .68, hz - H * .04, 4, W * .68, hz - H * .04, H * .45); g.addColorStop(0, 'rgba(255,220,150,.75)'); g.addColorStop(.25, 'rgba(255,140,60,.35)'); g.addColorStop(1, 'rgba(255,100,40,0)'); x.fillStyle = g; x.fillRect(0, 0, W, hz);
        // mraky
        for (let i = 0; i < 26; i++) { const cx = r() * W, cy = H * (.06 + r() * .38), rw = W * (.08 + r() * .18); g = x.createRadialGradient(cx, cy, 2, cx, cy, rw); g.addColorStop(0, 'rgba(10,6,8,' + (.25 + r() * .3) + ')'); g.addColorStop(1, 'rgba(10,6,8,0)'); x.fillStyle = g; x.beginPath(); x.ellipse(cx, cy, rw, rw * .28, 0, 0, 6.283); x.fill(); }
        // hory: dve vrstvy štítov
        const ridge = (base, amp, col, n, snow) => { x.fillStyle = col; x.beginPath(); x.moveTo(0, H); let px = 0; x.lineTo(0, base); const peaks = []; while (px < W) { const w = W / n * (.6 + r() * .8), h = amp * (.4 + r() * .9); peaks.push([px + w / 2, base - h, w]); x.lineTo(px + w / 2, base - h); x.lineTo(px + w, base - amp * .15 * r()); px += w; } x.lineTo(W, H); x.fill();
            if (snow) { x.fillStyle = snow; for (const [cx, cy, w] of peaks) if (cy < base - amp * .6) { x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx - w * .12, cy + amp * .16); x.lineTo(cx - w * .03, cy + amp * .11); x.lineTo(cx + w * .05, cy + amp * .17); x.lineTo(cx + w * .12, cy + amp * .14); x.fill(); } }
            return peaks; };
        ridge(hz - H * .02, H * .22, 'rgba(40,24,30,.85)', 7, info.bi === 'a' || info.bi === 'd' ? null : 'rgba(230,220,230,.35)');
        if (info.bi === 'a') {   // sopka so žeravým kráterom a dymom
            const vx = W * .8, vy = hz - H * .3; x.fillStyle = '#1c0e0c'; x.beginPath(); x.moveTo(vx - W * .2, hz); x.lineTo(vx - W * .025, vy); x.lineTo(vx + W * .025, vy); x.lineTo(vx + W * .22, hz); x.fill();
            g = x.createRadialGradient(vx, vy, 2, vx, vy, H * .14); g.addColorStop(0, 'rgba(255,120,30,.9)'); g.addColorStop(1, 'rgba(255,60,10,0)'); x.fillStyle = g; x.fillRect(vx - H * .2, vy - H * .2, H * .4, H * .3);
            for (let i = 0; i < 14; i++) { const k = i / 14; x.fillStyle = 'rgba(30,18,16,' + (.5 - k * .3) + ')'; x.beginPath(); x.ellipse(vx - k * W * .12 + Math.sin(i) * 10, vy - k * H * .3, 20 + k * 90, 12 + k * 40, 0, 0, 6.283); x.fill(); }
        }
        ridge(hz + H * .02, H * .12, 'rgba(22,14,18,.95)', 11, null);
        // pevnosť na kopci (vľavo) – pri obliehaní veľká
        { const fx = W * (info.siege ? .2 : .14), fy = hz + H * .01, k = info.siege ? 1.5 : 1; x.fillStyle = '#120a0c';
            x.beginPath(); x.ellipse(fx, fy + 10 * k, 120 * k, 26 * k, 0, Math.PI, 0); x.fill();
            x.fillRect(fx - 70 * k, fy - 34 * k, 140 * k, 40 * k);
            for (const [dx, h] of [[-78, 58], [74, 62], [-8, 92]]) { x.fillRect(fx + (dx - 9) * k, fy - h * k, 18 * k, h * k); x.beginPath(); x.moveTo(fx + (dx - 12) * k, fy - h * k); x.lineTo(fx + dx * k, fy - (h + 22) * k); x.lineTo(fx + (dx + 12) * k, fy - h * k); x.fill(); }
            for (let i = -66; i < 66; i += 10) x.fillRect(fx + i * k, fy - 40 * k, 6 * k, 7 * k);
            x.fillStyle = 'rgba(255,190,90,.75)'; for (const [dx, dy] of [[-30, -20], [12, -22], [-6, -66], [44, -14]]) x.fillRect(fx + dx * k, fy + dy * k, 3 * k, 5 * k);
        }
        // zem
        g = x.createLinearGradient(0, hz, 0, H); g.addColorStop(0, '#1a1210'); g.addColorStop(1, '#070504'); x.fillStyle = g; x.fillRect(0, hz, W, H - hz);
        // dve vojská: rady siluet s kopijami, štítmi a zástavami (vľavo tvoje, vpravo nepriateľ)
        const army = (side, col, n) => {
            for (let row = 0; row < 6; row++) {
                const k = .45 + row * .2, y = hz + H * .02 + row * H * .045 * (1 + row * .2), cnt = Math.round(n * (1 - row * .08));
                for (let i = 0; i < cnt; i++) {
                    const sx = side < 0 ? W * (.02 + r() * .4) : W * (.58 + r() * .4), s = 7 * k * (H / 640) * (.9 + r() * .2), yy = y + r() * 6 * k;
                    x.fillStyle = '#0a0607';
                    x.beginPath(); x.arc(sx, yy - s * 4.2, s * .7, 0, 6.283); x.fill();
                    x.fillRect(sx - s * .8, yy - s * 3.5, s * 1.6, s * 2.4); x.fillRect(sx - s * .6, yy - s * 1.2, s * .45, s * 1.3); x.fillRect(sx + s * .15, yy - s * 1.2, s * .45, s * 1.3);
                    x.strokeStyle = '#0a0607'; x.lineWidth = Math.max(1, s * .22); x.beginPath(); x.moveTo(sx + side * -s, yy - s * .5); x.lineTo(sx + side * -s * 1.6 + (r() - .5) * s, yy - s * 9); x.stroke();
                    if (r() < .5) { x.fillStyle = shade(col, .35); x.beginPath(); x.ellipse(sx + side * -s * 1.0, yy - s * 2.4, s * .9, s * 1.2, 0, 0, 6.283); x.fill(); }
                    if (r() < .045 * (6 - row)) {   // zástava vo farbe frakcie
                        const px = sx + side * -s * .3, top = yy - s * 13; x.lineWidth = Math.max(1, s * .2); x.strokeStyle = '#0a0607'; x.beginPath(); x.moveTo(px, yy); x.lineTo(px, top); x.stroke();
                        x.fillStyle = shade(col, .9); x.beginPath(); x.moveTo(px, top); x.lineTo(px + side * -s * 4.2, top + s * .6); x.lineTo(px + side * -s * 3.4, top + s * 2.2); x.lineTo(px + side * -s * 4.2, top + s * 3.8); x.lineTo(px, top + s * 3.4); x.fill();
                    }
                    if (row > 2 && r() < .05) {   // jazdec
                        x.fillStyle = '#0a0607'; x.beginPath(); x.ellipse(sx, yy - s * 2.2, s * 2.6, s * 1.2, 0, 0, 6.283); x.fill(); x.fillRect(sx - s * 2, yy - s * 2, s * .5, s * 2); x.fillRect(sx + s * 1.5, yy - s * 2, s * .5, s * 2);
                        x.beginPath(); x.moveTo(sx + side * -s * 2.2, yy - s * 2.6); x.lineTo(sx + side * -s * 3.4, yy - s * 4.6); x.lineTo(sx + side * -s * 2.6, yy - s * 5); x.fill();
                    }
                }
            }
        };
        army(-1, info.myC, Math.min(60, 14 + info.mine / 6)); army(1, info.foeC, Math.min(60, 14 + info.foes / 6));
        // hmla a vinetácia
        g = x.createLinearGradient(0, hz - H * .05, 0, hz + H * .12); g.addColorStop(0, 'rgba(120,70,60,0)'); g.addColorStop(.5, 'rgba(120,70,60,.18)'); g.addColorStop(1, 'rgba(120,70,60,0)'); x.fillStyle = g; x.fillRect(0, hz - H * .05, W, H * .17);
        g = x.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .95); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.75)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
        return c;
    }
    /** Zlatý prsteň so žiarou (otáča sa ako na svetle). */
    function ring(x, cx, cy, R, t) {
        const tilt = .32 + Math.sin(t * .7) * .05, glow = .55 + Math.sin(t * 2.1) * .2;
        let g = x.createRadialGradient(cx, cy, R * .4, cx, cy, R * 2.6); g.addColorStop(0, 'rgba(255,200,90,' + (.35 * glow) + ')'); g.addColorStop(1, 'rgba(255,160,60,0)'); x.fillStyle = g; x.fillRect(cx - R * 3, cy - R * 3, R * 6, R * 6);
        x.save(); x.translate(cx, cy);
        for (const [w, col] of [[R * .34, '#5a3a08'], [R * .26, '#c89428'], [R * .12, '#ffe7a0']]) {
            x.lineWidth = w; const sh = x.createLinearGradient(-R, 0, R, 0); sh.addColorStop(0, col); sh.addColorStop(.5 + Math.sin(t * 1.3) * .35, '#fff6d0'); sh.addColorStop(1, col);
            x.strokeStyle = w < R * .2 ? 'rgba(255,240,200,.55)' : sh; x.beginPath(); x.ellipse(0, 0, R, R * tilt, 0, 0, 6.283); x.stroke();
        }
        x.restore();
    }
    function draw() {
        if (!el) return;
        const x = cv.getContext('2d'), W = cv.width, H = cv.height, t = (performance.now() - t0) / 1000;
        x.drawImage(bg, 0, 0);
        // salva šípov ponad bojisko
        if (arrows.length < 70 && Math.random() < .5) { const L = Math.random() < .5; arrows.push({ x: L ? W * (.1 + Math.random() * .25) : W * (.65 + Math.random() * .25), y: H * .58, vx: (L ? 1 : -1) * W * (.0045 + Math.random() * .002), vy: -H * (.011 + Math.random() * .004), l: 0 }); }
        x.lineCap = 'round';
        for (let i = arrows.length - 1; i >= 0; i--) { const a = arrows[i]; a.x += a.vx; a.y += a.vy; a.vy += H * .00022; a.l++; if (a.y > H * .66 || a.l > 300) { arrows.splice(i, 1); continue; } x.strokeStyle = 'rgba(20,12,10,.85)'; x.lineWidth = Math.max(1, H / 500); x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(a.x - a.vx * 3, a.y - a.vy * 3); x.stroke(); }
        // iskry stúpajú z bojiska
        if (embers.length < 90) embers.push({ x: Math.random() * W, y: H * (.7 + Math.random() * .3), v: .3 + Math.random() * .9, s: 1 + Math.random() * 2.2, p: Math.random() * 6 });
        for (let i = embers.length - 1; i >= 0; i--) { const e = embers[i]; e.y -= e.v * H / 640; e.x += Math.sin(t * 2 + e.p) * .5; if (e.y < H * .2) { embers.splice(i, 1); continue; } x.fillStyle = 'rgba(255,' + (140 + (e.p * 20 | 0)) + ',60,' + Math.min(1, (e.y / H - .2) * 1.6) + ')'; x.beginPath(); x.arc(e.x, e.y, e.s * H / 640, 0, 6.283); x.fill(); }
        // nadpis s prsteňom
        const S = H / 640; ring(x, W / 2, H * .14, 34 * S, t);
        x.textAlign = 'center'; x.shadowColor = 'rgba(0,0,0,.9)'; x.shadowBlur = 12 * S;
        x.fillStyle = '#f3dc9a'; x.font = Math.round(46 * S) + 'px "Uncial Antiqua", Georgia, serif'; x.fillText(info.title, W / 2, H * .27);
        x.fillStyle = '#e8d8b8'; x.font = 'italic ' + Math.round(20 * S) + 'px "IM Fell English", Georgia, serif'; x.fillText(info.sub, W / 2, H * .33);
        x.font = Math.round(15 * S) + 'px "IM Fell English", Georgia, serif'; x.fillStyle = '#c8b890'; x.fillText(info.line, W / 2, H * .375);
        x.shadowBlur = 0;
        // rada a priebeh
        const bw = W * .56, bx = (W - bw) / 2, by = H * .84; pctShown += (pct - pctShown) * .15;
        x.fillStyle = 'rgba(8,5,4,.82)'; x.fillRect(bx - 14 * S, H * .725, bw + 28 * S, H * .145);
        x.strokeStyle = 'rgba(217,164,65,.5)'; x.lineWidth = 1; x.strokeRect(bx - 14 * S, H * .725, bw + 28 * S, H * .145);
        x.fillStyle = '#d9c8a0'; x.font = Math.round(13 * S) + 'px Georgia, serif'; wrap(x, 'Rada: ' + tip, W / 2, H * .757, bw, 17 * S);
        x.fillStyle = '#2a1a10'; x.fillRect(bx, by, bw, 8 * S); const pg = x.createLinearGradient(bx, 0, bx + bw, 0); pg.addColorStop(0, '#8a5a18'); pg.addColorStop(1, '#ffd27a'); x.fillStyle = pg; x.fillRect(bx, by, bw * pctShown, 8 * S);
        x.strokeStyle = '#d9a441'; x.strokeRect(bx, by, bw, 8 * S);
        x.fillStyle = '#e8d8a8'; x.font = 'italic ' + Math.round(13 * S) + 'px "IM Fell English", Georgia, serif'; x.fillText(stage, W / 2, by + 24 * S);
        x.fillStyle = '#8a7a5a'; x.font = Math.round(11 * S) + 'px Georgia, serif'; x.fillText('Autor a vývojár hry: Dávid Mucha', W / 2, H - 10 * S);
        raf = requestAnimationFrame(draw);
    }
    function wrap(x, s, cx, y, w, lh) { const words = s.split(' '); let line = ''; for (const wd of words) { const tst = line ? line + ' ' + wd : wd; if (x.measureText(tst).width > w && line) { x.fillText(line, cx, y); line = wd; y += lh; } else line = tst; } x.fillText(line, cx, y); }
    return {
        get on() { return !!el; },
        /** info: { title, sub, line, bi, siege, myC, foeC, mine, foes, seed } */
        show(i) {
            this.kill(); info = i; pct = pctShown = 0; stage = 'Vojská sa zoraďujú…'; tip = TIPS[Math.floor(Math.random() * TIPS.length)]; embers = []; arrows = []; t0 = performance.now();
            // celé okno hry prekryje pevná vrstva nad všetkým (aj nad tlačidlami rozkazov a mapkou)
            const host = (typeof game !== 'undefined' && game.canvas) || document.getElementById('game') || document.body, rc = host.getBoundingClientRect(), W = Math.max(320, Math.round(rc.width) || innerWidth), H = Math.max(240, Math.round(rc.height) || innerHeight);
            el = document.createElement('div'); el.id = 'loadScr'; el.style.cssText = 'position:fixed;left:' + rc.left + 'px;top:' + rc.top + 'px;width:' + W + 'px;height:' + H + 'px;z-index:100000;background:#000;opacity:1;transition:opacity .35s;pointer-events:auto';
            cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.style.cssText = 'width:100%;height:100%;display:block'; el.appendChild(cv); document.body.appendChild(el);
            bg = paint(W, H); draw();
        },
        set(p, s) { pct = Math.max(pct, p); if (s) stage = s; },
        /** Plynulé zmiznutie; cb sa zavolá, keď je obraz preč. */
        hide(cb) { if (!el) { if (cb) cb(); return; } pct = 1; const e = el; e.style.opacity = '0'; setTimeout(() => { if (el === e) this.kill(); if (cb) cb(); }, 380); },
        kill() { if (raf) cancelAnimationFrame(raf); raf = 0; if (el) el.remove(); el = null; },
        get elapsed() { return el ? performance.now() - t0 : 1e9; }
    };
})();
/** Údaje pre načítavaciu obrazovku podľa práve začínajúcej bitky (LB, U, SGB, WX, BI). */
function loadInfo() {
    const en = typeof LB !== 'undefined' && LB || {}, mine = U.filter(u => !u.t).length, foes = U.filter(u => u.t).length;
    let near = null, bd = 1e9; if (typeof TW !== 'undefined' && G) for (const t of TW) { const d = Math.hypot(t.x - G.x, t.y - G.y); if (d < bd) { bd = d; near = t; } }
    const place = en.siege && en.t ? en.t.n : near ? near.n : 'Stredozem';
    const title = en.boss ? 'Boj s legendou' : en.siege ? (en.def != null ? 'Obrana hradu' : 'Obliehanie') : 'Bitka';
    const who = en.nm || (typeof FN !== 'undefined' && FN[en.f]) || 'nepriateľ';
    const wx = { clear: 'jasno', rain: 'dážď', storm: 'búrka', fog: 'hmla', snow: 'sneh', ash: 'popol' }[WX && WX.n] || 'jasno';
    return { title, sub: (en.siege ? place : 'pri ' + place) + ' – proti: ' + who, line: 'Tvoje vojsko: ' + mine + '   ·   Nepriatelia: ' + foes + '   ·   ' + (WX && WX.night ? 'noc, ' : '') + wx,
        bi: typeof BI !== 'undefined' ? BI : 'g', siege: !!(en.siege || SGB), myC: (typeof FC !== 'undefined' && FC[G.fac]) || '#d9a441', foeC: (typeof FC !== 'undefined' && FC[en.f]) || '#8a2a2a', mine, foes, seed: Math.floor((G.x || 1) + (G.y || 1) * 7 + (G.day || 1) * 13) };
}
