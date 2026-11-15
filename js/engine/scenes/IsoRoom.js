/*
 * ENGINE: izometrický základ miestností (krčma, nádvorie, sieň) – spoločný základ krčmy, nádvoria, siene, dedín a pamätihodností.
 * Svet miestnosti je obdĺžnik FW × FD „podlahových jednotiek“ (1 jednotka ≈ 1 px); premietanie 2:1 (dimetria):
 *   P(wx, wy, wz) = [OX + wx − wy, OY + (wx + wy) / 2 − wz]
 * Podlaha a steny sú textúry (Tex.pattern) premietnuté do izometrie cez transformáciu plátna (bez skreslenia dlaždíc),
 * nábytok a stavby sú kvádre s tromi stenami (box), prípadne vlastné kresby; všetko sa radí podľa hĺbky (wx + wy).
 * Postavy sú doterajšie veľké postavičky (Art.bigFigure) postavené na podlahu a otáčané podľa smeru chôdze.
 * Chôdza: klik na podlahu (prevod obrazovky na svet) alebo šípky/WASD v smere obrazovky; prekážky = obdĺžniky na podlahe.
 * Potomok nastaví rozmery (setIso), nakreslí miestnosť (floor/wallL/wallR/box/…), pridá postavy (person) a miesta (spot)
 * a zavolá setupRoom({ title, leave, amb, floorSnd, spawn: [wx, wy], mode }).
 */
class IsoRoom extends Phaser.Scene {
    /** Rozmery miestnosti (podlaha FW × FD, výška stien WH) a poloha počiatku na obrazovke. */
    setIso(FW, FD, WH, OX, OY) {
        this.FW = FW; this.FD = FD; this.WH = WH;
        this.OX = OX ?? W / 2 - (FW - FD) / 2; this.OY = OY ?? Math.max(WH + 60, (H - (FW + FD) / 2 + WH) / 2 + 20);
        this.blocks = []; this.people = []; this.props = [];
        this.glows = null; this.winPts = []; this.chimneys = []; this.waters = []; this.bgN = 0;   // scéna sa po reštarte používa znova, staré hodnoty nesmú ostať
    }
    /** Svet → obrazovka. */
    P(wx, wy, wz = 0) { return [this.OX + wx - wy, this.OY + (wx + wy) / 2 - wz]; }
    /** Obrazovka → svet (na podlahe). */
    W2(sx, sy) { const dx = sx - this.OX, dy = sy - this.OY; return [(dx + 2 * dy) / 2, (2 * dy - dx) / 2]; }
    depth(wx, wy) { return (wx + wy) / (this.FW + this.FD) * 1000 + 10; }

    /* ---------- plátno pozadia: podlaha a steny ---------- */
    /** Pripraví plátno pozadia v 2× rozlíšení; vráti 2D kontext so svetovou transformáciou podlahy. */
    bgCanvas() {
        if (!this.bgCv) { this.bgCv = document.createElement('canvas'); this.bgCv.width = W * RES; this.bgCv.height = H * RES; this.bgCtx = this.bgCv.getContext('2d'); }
        return this.bgCtx;
    }
    patternOf(kind, color, seed) {
        const key = Tex.pattern(this, kind, color, seed), img = this.textures.get(key).getSourceImage();
        const c = this.bgCanvas(), p = c.createPattern(img, 'repeat');
        const m = new DOMMatrix(); m.a = m.d = .5; p.setTransform(m);   // 512 px textúra = 256 jednotiek
        return p;
    }
    /** Podlaha: textúra kind vo farbe color premietnutá na kosoštvorec FW × FD, s jemným tieňom pri stenách. */
    floor(kind, color, seed = 1, edge = true) {
        const c = this.bgCanvas(), S = RES;
        c.save(); c.setTransform(S, .5 * S, -S, .5 * S, this.OX * S, this.OY * S);
        c.fillStyle = this.patternOf(kind, color, seed); c.fillRect(0, 0, this.FW, this.FD);
        if (!edge) { c.restore(); return; }
        const g1 = c.createLinearGradient(0, 0, 0, 60); g1.addColorStop(0, 'rgba(0,0,0,.35)'); g1.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g1; c.fillRect(0, 0, this.FW, 60);
        const g2 = c.createLinearGradient(0, 0, 60, 0); g2.addColorStop(0, 'rgba(0,0,0,.3)'); g2.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g2; c.fillRect(0, 0, 60, this.FD);
        c.restore();
    }
    /** Ľavá zadná stena (pozdĺž osi wy pri wx = 0). */
    wallL(kind, color, seed = 2) {
        const c = this.bgCanvas(), S = RES;
        c.save(); c.setTransform(-S, .5 * S, 0, -S, this.OX * S, this.OY * S);
        c.fillStyle = this.patternOf(kind, color, seed); c.fillRect(0, 0, this.FD, this.WH);
        c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(0, 0, this.FD, this.WH);                    // ľavá stena v tieni
        const g = c.createLinearGradient(0, this.WH, 0, this.WH * .55); g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, this.FD, this.WH);   // tmavší strop
        c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, 0, this.FD, 6);                           // sokel
        c.restore();
    }
    /** Pravá zadná stena (pozdĺž osi wx pri wy = 0). */
    wallR(kind, color, seed = 3) {
        const c = this.bgCanvas(), S = RES;
        c.save(); c.setTransform(S, .5 * S, 0, -S, this.OX * S, this.OY * S);
        c.fillStyle = this.patternOf(kind, color, seed); c.fillRect(0, 0, this.FW, this.WH);
        c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(0, 0, this.FW, this.WH);
        const g = c.createLinearGradient(0, this.WH, 0, this.WH * .55); g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, this.FW, this.WH);
        c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, 0, this.FW, 6);
        c.restore();
    }
    /** Kresba na ľavú stenu v jej súradniciach (u = pozdĺž wy, v = výška). */
    onWallL(fn) { const c = this.bgCanvas(), S = RES; c.save(); c.setTransform(-S, .5 * S, 0, -S, this.OX * S, this.OY * S); fn(c); c.restore(); }
    /** Kresba na pravú stenu (u = pozdĺž wx, v = výška). */
    onWallR(fn) { const c = this.bgCanvas(), S = RES; c.save(); c.setTransform(S, .5 * S, 0, -S, this.OX * S, this.OY * S); fn(c); c.restore(); }
    /** Kresba na podlahu vo svetových súradniciach. */
    onFloor(fn) { const c = this.bgCanvas(), S = RES; c.save(); c.setTransform(S, .5 * S, -S, .5 * S, this.OX * S, this.OY * S); fn(c); c.restore(); }
    /** Zobrazí pripravené plátno pozadia ako obrázok pod všetkým. */
    commitBg() {
        const key = 'isobg_' + this.scene.key + '_' + (this.bgN = (this.bgN || 0) + 1);
        if (this.textures.exists(key)) this.textures.remove(key);
        this.textures.addCanvas(key, this.bgCv);
        this.bg = this.add.image(0, 0, key).setOrigin(0).setScale(1 / RES).setDepth(0);
        this.bgCv = null; this.bgCtx = null;
    }

    /** Vonkajšok: obzor s kopcami a zem za kosoštvorcom (statická kresba pod podlahou); obloha sa kreslí do this.sky každý snímok. */
    outdoor(ground, hills = [], horizon) {
        const hz = horizon ?? this.OY - 30, R = n => { const x = Math.sin((this.OX + n) * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
        this.sky = this.add.graphics().setDepth(-1); this.skyRect = [0, 0, W, hz + 20];
        const g = this.add.graphics().setDepth(-.5);
        for (const [col, n, y0, h] of hills) { g.fillStyle(col, 1); for (let i = 0; i < n; i++) g.fillEllipse(i * (W / (n - 1)), hz + y0 + R(i + 40) * 10, W / n * 2.3, h + R(i + 50) * 20); }
        g.fillStyle(this.hexc(ground), 1).fillRect(0, hz, W, H - hz);
        g.fillStyle(0x000000, .12).fillRect(0, hz, W, 4);
        return g;
    }
    /** Dom: kváder so sedlovou (rh > 0) alebo plochou strechou, dvere na prednej ľavej stene, okná, komín. Vráti svetové súradnice dverí. */
    house(x, y, w, d, h, wall, roof, o = {}) {
        const rh = o.rh ?? h * .7, ov = o.ov ?? 6, g = this.add.graphics().setDepth(this.depth(x + w, y + d) + (o.dz || 0));
        const P = (a, b, c) => this.P(a, b, c);
        const poly = (pts, c, line = true) => { g.fillStyle(c, 1); g.beginPath(); pts.forEach(([a, b, cc], i) => { const [sx, sy] = P(a, b, cc); i ? g.lineTo(sx, sy) : g.moveTo(sx, sy); }); g.closePath(); g.fillPath(); if (line) { g.lineStyle(1, 0x000000, .3); g.strokePath(); } };
        const sh = this.add.graphics().setDepth(this.depth(x, y) - .5); sh.fillStyle(0x000000, .25).fillEllipse(...P(x + w * .55, y + d * .55).map((v, i) => v + (i ? 4 : 6)), (w + d) * .95, (w + d) * .45);
        poly([[x, y + d, 0], [x + w, y + d, 0], [x + w, y + d, h], [x, y + d, h]], this.shade(wall, .78));
        poly([[x + w, y, 0], [x + w, y + d, 0], [x + w, y + d, h], [x + w, y, h]], this.hexc(wall));
        if (o.logs) { g.lineStyle(1, 0x000000, .25); for (let z = 6; z < h; z += 7) { const [a1, b1] = P(x, y + d, z), [a2, b2] = P(x + w, y + d, z), [a3, b3] = P(x + w, y, z); g.lineBetween(a1, b1, a2, b2); g.lineBetween(a2, b2, a3, b3); } }
        if (o.beam) { g.lineStyle(2, this.hexc(o.beam), 1); const L = (a, b) => { const [p1, q1] = P(...a), [p2, q2] = P(...b); g.lineBetween(p1, q1, p2, q2); }; L([x, y + d, 0], [x, y + d, h]); L([x + w, y + d, 0], [x + w, y + d, h]); L([x + w, y, 0], [x + w, y, h]); L([x, y + d, h / 2], [x + w, y + d, h / 2]); L([x + w, y + d, h / 2], [x + w, y, h / 2]); L([x, y + d, h], [x + w, y + d, h]); L([x + w, y + d, h], [x + w, y, h]); L([x + w * .5, y + d, 0], [x + w * .5, y + d, h]); L([x, y + d, h], [x + w * .5, y + d, h / 2]); L([x + w, y + d, h], [x + w * .5, y + d, h / 2]); }
        if (rh > 0) {   // sedlová strecha s hrebeňom pozdĺž osi x
            const ym = y + d / 2;
            poly([[x - ov, y - ov, h], [x + w + ov, y - ov, h], [x + w + ov, ym, h + rh], [x - ov, ym, h + rh]], this.shade(roof, 1.12));
            poly([[x + w, y, h], [x + w, y + d, h], [x + w, ym, h + rh]], this.shade(wall, 1.05));
            poly([[x - ov, y + d + ov, h], [x + w + ov, y + d + ov, h], [x + w + ov, ym, h + rh], [x - ov, ym, h + rh]], this.hexc(roof));
            if (o.thatch) { g.lineStyle(1, 0x000000, .18); for (let k = 1; k < 6; k++) { const z = h + rh * k / 6, yy = y + d + ov - (d / 2 + ov) * k / 6; const [a1, b1] = P(x - ov, yy, z), [a2, b2] = P(x + w + ov, yy, z); g.lineBetween(a1, b1, a2, b2); } }
            if (o.chimney !== false) { const cx = x + w * .3, cy = ym + 8; poly([[cx, cy + 8, h + rh * .5], [cx + 8, cy + 8, h + rh * .5], [cx + 8, cy + 8, h + rh + 10], [cx, cy + 8, h + rh + 10]], this.shade(o.chimneyCol || 0x8a8a90, .8)); poly([[cx + 8, cy, h + rh * .5], [cx + 8, cy + 8, h + rh * .5], [cx + 8, cy + 8, h + rh + 10], [cx + 8, cy, h + rh + 10]], this.hexc(o.chimneyCol || 0x8a8a90)); poly([[cx, cy, h + rh + 10], [cx + 8, cy, h + rh + 10], [cx + 8, cy + 8, h + rh + 10], [cx, cy + 8, h + rh + 10]], this.shade(o.chimneyCol || 0x8a8a90, 1.15)); this.chimneys = this.chimneys || []; this.chimneys.push([cx + 4, cy + 4, h + rh + 10]); }
        } else {   // plochá strecha s nízkou atikou
            poly([[x, y, h], [x + w, y, h], [x + w, y + d, h], [x, y + d, h]], this.shade(roof, 1.1));
            poly([[x, y + d, h], [x + w, y + d, h], [x + w, y + d, h + 5], [x, y + d, h + 5]], this.shade(wall, .78)); poly([[x + w, y, h], [x + w, y + d, h], [x + w, y + d, h + 5], [x + w, y, h + 5]], this.hexc(wall));
        }
        const dw = o.doorW || 12, dh = o.doorH || 22, dx = x + (o.doorAt ?? .3) * w;   // dvere na prednej ľavej stene
        if (o.door !== false) { poly([[dx, y + d, 0], [dx + dw, y + d, 0], [dx + dw, y + d, dh], [dx, y + d, dh]], 0x15100c, false); if (o.doorCol) poly([[dx + 1.5, y + d, 0], [dx + dw - 1.5, y + d, 0], [dx + dw - 1.5, y + d, dh - 2], [dx + 1.5, y + d, dh - 2]], this.hexc(o.doorCol), false); }
        this.winPts = this.winPts || [];
        if (o.win !== false) {   // okná: na prednej ľavej stene vpravo od dverí a na pravej stene
            const wz = h * .45, ww = 10, wh = 9;
            for (const [a, b, c2, e] of [[x + w * .72, y + d, x + w * .72 + ww, y + d], [x + w, y + d * .35, x + w, y + d * .35 + ww]]) { poly([[a, b, wz], [c2, e, wz], [c2, e, wz + wh], [a, b, wz + wh]], 0x2a3a4a); this.winPts.push(this.P((a + c2) / 2, (b + e) / 2, wz + wh / 2)); }
        }
        this.blocks.push([x, y, w, d]); this.props.push(g);
        return [dx + dw / 2, y + d + 14];
    }
    /** Strom: kind round | pine | willow | dead | mallorn | palm. */
    tree(x, y, kind = 'round', sc = 1, col) {
        return this.prop(x, y, (g, sx, sy) => {
            g.fillStyle(0x000000, .22).fillEllipse(sx, sy + 2, 30 * sc, 12 * sc);
            if (kind === 'pine') { g.fillStyle(0x4a3220, 1).fillRect(sx - 3 * sc, sy - 30 * sc, 6 * sc, 30 * sc); g.fillStyle(col || 0x2a5a30, 1); for (let k = 0; k < 4; k++) g.fillTriangle(sx - (26 - k * 5) * sc, sy - (18 + k * 16) * sc, sx + (26 - k * 5) * sc, sy - (18 + k * 16) * sc, sx, sy - (46 + k * 16) * sc); g.fillStyle(0xffffff, .0); }
            else if (kind === 'dead') { g.fillStyle(0x4a4a44, 1).fillRect(sx - 4 * sc, sy - 60 * sc, 8 * sc, 60 * sc); g.lineStyle(4 * sc, 0x4a4a44, 1); for (const [dx, dy] of [[-26, -84], [22, -90], [-10, -98], [30, -66]]) g.lineBetween(sx, sy - 50 * sc, sx + dx * sc, sy + dy * sc); }
            else if (kind === 'willow') { g.fillStyle(0x4a3a2a, 1).fillRect(sx - 4 * sc, sy - 56 * sc, 8 * sc, 56 * sc); g.fillStyle(col || 0x6a9a4a, .95).fillEllipse(sx, sy - 60 * sc, 60 * sc, 30 * sc); g.lineStyle(2, col || 0x7aa050, .9); for (let b = 0; b < 9; b++) g.lineBetween(sx - 28 * sc + b * 7 * sc, sy - 56 * sc, sx - 30 * sc + b * 7.5 * sc, sy - 12 * sc); }
            else if (kind === 'mallorn') { g.fillStyle(0x8a7a60, 1).fillRect(sx - 6 * sc, sy - 100 * sc, 12 * sc, 100 * sc); g.fillStyle(col || 0xd8c870, .92).fillCircle(sx, sy - 112 * sc, 36 * sc); g.fillStyle(0xe8dc90, .8).fillCircle(sx - 10 * sc, sy - 124 * sc, 22 * sc); }
            else if (kind === 'palm') { g.fillStyle(0x8a6a3a, 1).fillRect(sx - 3 * sc, sy - 60 * sc, 6 * sc, 60 * sc); g.lineStyle(4 * sc, col || 0x4a8a3a, 1); for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283; g.lineBetween(sx, sy - 60 * sc, sx + Math.cos(a) * 24 * sc, sy - 60 * sc + Math.sin(a) * 10 * sc + 8 * sc); } }
            else { g.fillStyle(0x4a3a2a, 1).fillRect(sx - 4 * sc, sy - 34 * sc, 8 * sc, 34 * sc); g.fillStyle(col || 0x3a6a2a, 1).fillCircle(sx, sy - 48 * sc, 24 * sc).fillCircle(sx - 14 * sc, sy - 38 * sc, 16 * sc).fillCircle(sx + 14 * sc, sy - 40 * sc, 17 * sc); g.fillStyle(0xffffff, .12).fillCircle(sx - 6 * sc, sy - 56 * sc, 10 * sc); }
        });
    }
    /** Vodná plocha na podlahe (svetový obdĺžnik) s brehom; trblietanie kreslí waterFx(). */
    water(x, y, w, d, col = '#2c5b73') { this.onFloor(c => { c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x - 4, y - 4, w + 8, d + 8); c.fillStyle = col; c.fillRect(x, y, w, d); c.fillStyle = 'rgba(120,180,200,.35)'; c.fillRect(x + 3, y + 3, w - 6, d - 6); }); this.waters = this.waters || []; this.waters.push([x, y, w, d]); }
    waterFx(f) { const t = tm; f.fillStyle(0xffffff, .22); for (const [x, y, w, d] of this.waters || []) for (let i = 0; i < 14; i++) { const wx = x + (i * 53 + t * 1.2) % w, wy = y + (i * 37) % d; const [sx, sy] = this.P(wx, wy); f.fillRect(sx, sy, 10, 1.5); } }
    /** Plameň na mieste sveta (x, y, z) – do grafiky f. */
    flame(f, x, y, z, n = 5, col = 0xff7a20) { const [fx, fy] = this.P(x, y, z), t = tm; for (let k = 0; k < n; k++) { const ph = t / 3 + k * 1.9, h = 10 + Math.sin(ph) * 4; f.fillStyle(col, .9).fillTriangle(fx - (n - 1) * 2 + k * 4 - 3, fy, fx - (n - 1) * 2 + k * 4 + 3, fy, fx - (n - 1) * 2 + k * 4 + Math.sin(ph) * 2, fy - h); } f.fillStyle(0xffd060, .9).fillTriangle(fx - 4, fy, fx + 4, fy, fx, fy - 6 - Math.sin(t / 2) * 2); }
    /** Dym zo svetového bodu (x, y, z). */
    smokeFx(f, x, y, z, col = 0x8a8a90, a0 = .3) { const [sx, sy] = this.P(x, y, z), t = tm; for (let k = 0; k < 4; k++) { const a = (t * .4 + k * 20 + x) % 80; f.fillStyle(col, a0 - a / 320).fillCircle(sx + Math.sin(a * .1 + k) * 6, sy - a * .8, 4 + a * .12); } }

    /* ---------- kvádre a predmety ---------- */
    hexc(c) { return typeof c === 'number' ? c : parseInt(c.slice(1), 16); }
    shade(c, k) { const n = this.hexc(c), f = v => Math.max(0, Math.min(255, Math.round(v * k))); return (f(n >> 16 & 255) << 16) | (f(n >> 8 & 255) << 8) | f(n & 255); }
    /** Kváder na podlahe: x, y (ľavý zadný roh), šírka w (po wx), hĺbka d (po wy), výška h; col = farba; o: { top, left, right, z, block, line }. */
    box(x, y, w, d, h, col, o = {}) {
        const g = this.add.graphics().setDepth(this.depth(x + w, y + d) + (o.dz || 0));
        const z = o.z || 0, P = (a, b, c) => this.P(a, b, c + z);
        const top = o.top != null ? this.hexc(o.top) : this.shade(col, 1.18), left = o.left != null ? this.hexc(o.left) : this.shade(col, .72), right = o.right != null ? this.hexc(o.right) : this.hexc(col);
        const poly = (pts, c) => { g.fillStyle(c, 1); g.beginPath(); pts.forEach(([a, b, cc], i) => { const [sx, sy] = P(a, b, cc); i ? g.lineTo(sx, sy) : g.moveTo(sx, sy); }); g.closePath(); g.fillPath(); if (o.line !== false) { g.lineStyle(1, 0x000000, .35); g.strokePath(); } };
        if (!o.noShadow && !z) { const [sx, sy] = this.P(x + w * .55, y + d * .55); const sh = this.add.graphics().setDepth(this.depth(x, y) - .5); sh.fillStyle(0x000000, .25).fillEllipse(sx + 4, sy + 3, (w + d) * .9, (w + d) * .42); }
        poly([[x, y + d, 0], [x + w, y + d, 0], [x + w, y + d, h], [x, y + d, h]], left);      // predná ľavá stena
        poly([[x + w, y, 0], [x + w, y + d, 0], [x + w, y + d, h], [x + w, y, h]], right);     // predná pravá stena
        poly([[x, y, h], [x + w, y, h], [x + w, y + d, h], [x, y + d, h]], top);               // vrch
        if (o.block !== false) this.blocks.push([x, y, w, d]);
        this.props.push(g);
        return g;
    }
    /** Valec (sud, stĺp): stred x, y, polomer r, výška h. */
    cyl(x, y, r, h, col, o = {}) {
        const g = this.add.graphics().setDepth(this.depth(x + r, y + r) + (o.dz || 0)), z = o.z || 0;
        const [bx, by] = this.P(x, y, z), [tx, ty] = this.P(x, y, z + h);
        if (!z) { const sh = this.add.graphics().setDepth(this.depth(x - r, y - r) - .5); sh.fillStyle(0x000000, .25).fillEllipse(bx + 3, by + 2, r * 2.4, r * 1.2); }
        const gr = this.shade(col, .7), lt = this.shade(col, 1.15);
        g.fillStyle(gr, 1).fillRect(bx - r, ty, r * .5, by - ty); g.fillStyle(this.hexc(col), 1).fillRect(bx - r * .5, ty, r * 1.2, by - ty); g.fillStyle(this.shade(col, .85), 1).fillRect(bx + r * .7, ty, r * .3, by - ty);
        g.fillStyle(gr, 1).fillEllipse(bx, by, r * 2, r); g.fillStyle(this.hexc(col), 1).fillRect(bx - r, ty, r * 2, by - ty);
        g.fillStyle(this.shade(col, .72), 1).fillRect(bx - r, ty, r * .45, by - ty); g.fillStyle(this.shade(col, 1.08), 1).fillRect(bx - r * .3, ty, r * .5, by - ty);
        g.fillStyle(lt, 1).fillEllipse(bx, ty, r * 2, r); g.lineStyle(1, 0x000000, .35).strokeEllipse(bx, ty, r * 2, r);
        if (o.hoops) { g.lineStyle(1.5, 0x3a3a3a, .8); for (const k of [.25, .75]) g.strokeEllipse(bx, ty + (by - ty) * k, r * 2, r); }
        if (o.block !== false) this.blocks.push([x - r, y - r, r * 2, r * 2]);
        this.props.push(g);
        return g;
    }
    /** Vlastná kresba zoradená podľa hĺbky v bode (x, y): fn(g, sx, sy). */
    prop(x, y, fn, dz = 0) { const g = this.add.graphics().setDepth(this.depth(x, y) + dz); const [sx, sy] = this.P(x, y); fn(g, sx, sy); this.props.push(g); return g; }
    /** Obrázok (sprite) postavený na podlahu v bode (x, y). */
    sprite(x, y, key, sc = 1) { const [sx, sy] = this.P(x, y); return Art.image(this, sx, sy, key).setScale((Art.scale[key] || 1 / RES) * sc).setDepth(this.depth(x, y)); }

    /* ---------- postavy, miesta, hráč ---------- */
    setupRoom(r) {
        this.room = r;
        const ui = this.scene.get('UI');
        const plaque = this.add.graphics().setDepth(1999);
        const pwid = Math.max(260, r.title.length * 11 + 70);
        ui.panelFrame(plaque, W / 2 - pwid / 2, 34, pwid, 32, false);
        plaque.fillStyle(0xd9a441, .9).fillTriangle(W / 2 - pwid / 2 - 8, 50, W / 2 - pwid / 2 + 2, 44, W / 2 - pwid / 2 + 2, 56).fillTriangle(W / 2 + pwid / 2 + 8, 50, W / 2 + pwid / 2 - 2, 44, W / 2 + pwid / 2 - 2, 56);
        this.add.text(W / 2, 50, r.title, txtStyle(17, '#f3dc9a', { fontFamily: TITLE_FONT, stroke: '#000', strokeThickness: 2 })).setOrigin(.5).setDepth(2000);
        const rail = this.add.graphics().setDepth(1998);
        rail.fillGradientStyle(0x1c140e, 0x1c140e, 0x0e0a08, 0x0e0a08, .72, .72, .92, .92).fillRect(0, H - 34, W, 34);
        rail.fillStyle(0xc9a24a, .7).fillRect(0, H - 34, W, 1);
        this.hint = this.add.text(W / 2 - 60, H - 17, r.hint || 'Klik / WASD = chôdza   ·   klik na postavu alebo miesto = akcia   ·   medzerník = rozhovor   ·   Esc = odísť', txtStyle(11, '#e8dcc0')).setOrigin(.5).setDepth(2000);
        this.leaveBtn = ui.button.call(this, W - 150, H - 31, 142, 28, r.leave, () => this.leave(), { size: 11, icon: Icons.tex(this, 'door') });
        this.leaveBtn.forEach(o => o.setDepth(2001));
        const pk = Art.bigFigure(this, { ...G.eq, m: 0 }, { king: !!G.king, cape: heroSide() === 1 ? '#2a1414' : '#6a2a2a', ...Figures.lookOpts(Portraits.hero()) });
        const [wx, wy] = r.spawn || [this.FW / 2, this.FD - 30];
        this.pw = { x: wx, y: wy };
        const [sx, sy] = this.P(wx, wy);
        this.pl = Art.image(this, sx, sy, pk).setScale((Art.scale[pk] || 1 / RES) * (r.scale || .9));
        this.plT = null; this.plDo = null; this.plStep = 0;
        this.plLbl = this.add.text(sx, sy + 6, G.name, txtStyle(10, '#ffd24a', { backgroundColor: 'rgba(14,10,8,.72)', padding: { x: 5, y: 2 } })).setOrigin(.5, 0).setDepth(1900);
        // klik na podlahu: celá scéna; postavy a miesta majú vlastné plochy nad ňou
        this.input.on('pointerup', p => { if (!ov.classList.contains('hide') || this.hitPerson) { this.hitPerson = false; return; } const [x, y] = this.W2(p.x / RES, p.y / RES); if (x >= 0 && y >= 0 && x <= this.FW && y <= this.FD) this.goTo(x, y, null); });
        this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,LEFT,DOWN,RIGHT');
        this.input.keyboard.on('keydown-ESC', () => { if (ov.classList.contains('hide')) this.leave(); });
        this.input.keyboard.on('keydown-SPACE', () => this.interactNearest());
        this.input.keyboard.on('keydown-E', () => this.interactNearest());
        this.events.on('shutdown', () => { this.input.keyboard.removeAllListeners(); this.input.removeAllListeners(); RoomSnd.stop(); });
        if (r.amb) { RoomSnd.door(); RoomSnd.start(r.amb); }
        this.light = this.add.graphics().setDepth(1500);
        this.placePlayer();
    }
    placePlayer() { const [sx, sy] = this.P(this.pw.x, this.pw.y); this.pl.setPosition(sx, sy).setDepth(this.depth(this.pw.x, this.pw.y) + .2); this.plLbl.setPosition(sx, sy + 6); }
    /** Postava na podlahe v bode (x, y). */
    person(x, y, [eq, o], name, onClick, sc = 1) {
        const key = Art.bigFigure(this, eq, o), [sx, sy] = this.P(x, y);
        const spr = Art.image(this, sx, sy, key).setScale((Art.scale[key] || 1 / RES) * sc * .9).setDepth(this.depth(x, y));
        spr.setInteractive({ useHandCursor: true });
        const ring = this.add.graphics().setDepth(this.depth(x, y) - .3).setVisible(false);
        ring.lineStyle(2, 0xffd24a, .9).strokeEllipse(sx, sy + 2, 40 * sc, 20 * sc);
        const lbl = this.add.text(sx, sy + 6, name, txtStyle(10, '#f4e8d0', { backgroundColor: 'rgba(14,10,8,.72)', padding: { x: 5, y: 2 } })).setOrigin(.5, 0).setDepth(1900);
        spr.on('pointerover', () => ring.setVisible(true)); spr.on('pointerout', () => ring.setVisible(false));
        spr.on('pointerup', () => { if (!ov.classList.contains('hide')) return; this.hitPerson = true; this.approach(x, y, onClick); });
        this.people.push({ spr, ring, lbl, name, x, y, t0: Math.random() * 6, fn: onClick, sy });
        return spr;
    }
    /** Miesto (dvere, stánok…): neviditeľná plocha okolo (x, y) na podlahe; hráč k nemu dôjde a vykoná fn. */
    spot(x, y, w, h, name, fn, standAt) {
        const [sx, sy] = this.P(x, y);
        const z = this.add.rectangle(sx, sy - h / 2, w, h, 0xffd24a, 0).setInteractive({ useHandCursor: true }).setDepth(1800);
        const lbl = this.add.text(sx, sy + 4, name, txtStyle(10, '#ffe8b0', { backgroundColor: 'rgba(14,10,8,.72)', padding: { x: 5, y: 2 } })).setOrigin(.5, 0).setDepth(1900);
        z.on('pointerover', () => z.setFillStyle(0xffd24a, .12)); z.on('pointerout', () => z.setFillStyle(0xffd24a, 0));
        const st = standAt || [x, y + 26];
        z.on('pointerup', () => { if (!ov.classList.contains('hide')) return; this.hitPerson = true; this.goTo(st[0], st[1], fn); });
        this.people.push({ spr: z, ring: this.add.graphics(), lbl, name, x: st[0], y: st[1], t0: 0, spot: 1, fn });
        return z;
    }
    clearPeople() { this.people.forEach(p => { p.spr.destroy(); p.ring.destroy(); p.lbl.destroy(); }); this.people = []; }
    blocked(x, y) { return x < 10 || y < 10 || x > this.FW - 10 || y > this.FD - 10 || this.blocks.some(([bx, by, bw, bd]) => x > bx - 6 && x < bx + bw + 6 && y > by - 6 && y < by + bd + 6); }
    approach(x, y, fn) {
        const c = [[x, y + 34], [x + 34, y], [x - 34, y + 10], [x + 30, y + 30], [x, y - 34], [x - 30, y - 30], [x + 10, y + 50]].find(([cx, cy]) => !this.blocked(cx, cy)) || [x, y + 34];
        this.goTo(c[0], c[1], fn);
    }
    interactNearest() {
        if (!ov.classList.contains('hide')) return;
        let best = null, bd = 70;
        for (const p of this.people) { const d = Math.hypot(p.x - this.pw.x, p.y - this.pw.y); if (d < bd && p.fn) { bd = d; best = p; } }
        if (best) { this.plT = null; this.plDo = null; this.pl.setFlipX(this.P(best.x, best.y)[0] < this.pl.x); best.fn(); }
    }
    goTo(x, y, fn) { this.plT = { x: Math.max(10, Math.min(this.FW - 10, x)), y: Math.max(10, Math.min(this.FD - 10, y)) }; this.plDo = fn; }
    movePlayer(dt = 1) {
        const k = this.keys, dlgOpen = !ov.classList.contains('hide'), pw = this.pw;
        let dx = 0, dy = 0;   // v súradniciach obrazovky
        if (!dlgOpen && k) { if (k.A.isDown || k.LEFT.isDown) dx -= 1; if (k.D.isDown || k.RIGHT.isDown) dx += 1; if (k.W.isDown || k.UP.isDown) dy -= 1; if (k.S.isDown || k.DOWN.isDown) dy += 1; }
        let mx = 0, my = 0;
        if (dx || dy) { this.plT = null; this.plDo = null; mx = (dx + 2 * dy) / 2; my = (2 * dy - dx) / 2; }   // smer obrazovky → svet
        else if (this.plT) { const ddx = this.plT.x - pw.x, ddy = this.plT.y - pw.y, d = Math.hypot(ddx, ddy); if (d < 2.5 * dt) { const fn = this.plDo; this.plT = null; this.plDo = null; if (fn) fn(); } else { mx = ddx / d; my = ddy / d; } }
        if (mx || my) {
            const m = Math.hypot(mx, my), sp = 2.2 * dt, nx = pw.x + mx / m * sp, ny = pw.y + my / m * sp;
            if (!this.blocked(nx, ny)) { pw.x = nx; pw.y = ny; this.plSlide = 0; }
            else if (!this.blocked(nx, pw.y)) pw.x = nx;
            else if (!this.blocked(pw.x, ny)) pw.y = ny;
            else if (this.plT) {   // obídenie prekážky kolmo na smer, bližšie k cieľu
                const c = [[pw.x - my / m * sp, pw.y + mx / m * sp], [pw.x + my / m * sp, pw.y - mx / m * sp]].filter(([cx, cy]) => !this.blocked(cx, cy)).sort((p, q) => Math.hypot(p[0] - this.plT.x, p[1] - this.plT.y) - Math.hypot(q[0] - this.plT.x, q[1] - this.plT.y))[0];
                if (c && (this.plSlide = (this.plSlide || 0) + 1) < 90) { pw.x = c[0]; pw.y = c[1]; } else { this.plT = null; this.plSlide = 0; }
            }
            const sdx = mx - my;   // posun na obrazovke v x
            if (Math.abs(sdx) > .05) this.pl.setFlipX(sdx < 0);
            this.plStep += dt; this.pl.setFrame(1 + Math.floor(this.plStep / 5) % 4);
            if (Math.floor(this.plStep / 10) !== Math.floor((this.plStep - dt) / 10)) RoomSnd.step(this.room.floorSnd || 'stone');
        } else this.pl.setFrame(0);
        this.placePlayer();
        this.people.forEach(p => { const near = Math.hypot(p.x - pw.x, p.y - pw.y) < 70; p.lbl.setColor(near ? '#ffd24a' : p.spot ? '#ffe8b0' : '#f4e8d0'); if (p.lbl.text.endsWith(' ⎵') !== near) p.lbl.setText(near ? p.name + ' ⎵' : p.name); });
    }
    /** Obloha v obdĺžniku obrazovky (okno) podľa dennej doby a počasia. */
    drawSky(s, x, y, w, h) {
        const nn = nightness(), day = 1 - nn, t = tm;
        s.fillStyle(Phaser.Display.Color.GetColor(40 + 120 * day, 60 + 120 * day, 90 + 140 * day), 1).fillRect(x, y, w, h);
        if (nn > .4) { s.fillStyle(0xfff4d0, 1).fillCircle(x + w * .72, y + h * .25, Math.min(6, h / 8)); s.fillStyle(0xffffff, 1); for (let k = 0; k < 5 + w / 20; k++) s.fillRect(x + 4 + (k * 37) % (w - 8), y + 3 + (k * 29) % (h * .7), 1.5, 1.5); }
        else if (day > .6) { s.fillStyle(0xffffff, .55).fillEllipse(x + w * .3 + (t * .1) % (w * .6), y + h * .3, w * .22, h * .14); }
        if (MW.n === 'rain' || MW.n === 'storm') { s.lineStyle(1, 0xcfe0f0, .6); for (let k = 0; k < w / 6; k++) { const rx = x + (k * 37 + t * 2) % w, ry = y + (k * 53 + t * 6) % h; s.lineBetween(rx, ry, rx - 2, ry + 6); } }
        if (MW.n === 'snow') { s.fillStyle(0xffffff, .9); for (let k = 0; k < w / 7; k++) s.fillRect(x + (k * 41 + t) % w, y + (k * 29 + t * 2) % h, 2, 2); }
        if (MW.n === 'fog') s.fillStyle(0xbec8d2, .35).fillRect(x, y, w, h);
        if (MW.n === 'ash') s.fillStyle(0x3a2a24, .35).fillRect(x, y, w, h);
    }
    /** Mäkké svetlo v bode sveta (x, y) vo výške z. */
    glow(x, y, z, r, col, a) { const [sx, sy] = this.P(x, y, z); return Tex.light(this, sx, sy, r, col, a, 1600); }
    leave() { }
    closeRoom() { this.scene.stop(); if (this.scene.isSleeping('Map')) this.scene.wake('Map'); }
}
