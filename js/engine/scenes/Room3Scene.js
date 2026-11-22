/*
 * ENGINE: 3D miestnosti (krčma, nádvorie, sieň) – spoločný základ ako IsoRoom, ale v Three.js na rovnakom vykresľovači ako bitka a mapa.
 * Rozmery miestnosti sú v „podlahových jednotkách“ ako v izometrii (FW × FD, výška stien WH), 3D svet = jednotky × K3, takže rozloženie
 * izometrických miestností (polohy stolov, dverí, postáv) sa dá prevziať a prekážky (blocks) fungujú rovnako.
 * Postavy sú rovnaké 3D telá ako v bitke (B3.kit.rig), hrdina a obyvatelia stoja na podlahe a hýbu sa chôdzou nôh a rúk.
 * Ovládanie: WASD chôdza, myš (klik zachytí myš) alebo šípky otáčajú kameru, koliesko mení vzdialenosť, Tab prepína prvú osobu,
 * E / medzerník = akcia pri najbližšej postave alebo mieste, Esc = odísť. Phaser (priehľadný) leží nad 3D a kreslí nadpis, nápovedu,
 * tlačidlo odchodu a štítky nad postavami a miestami.
 * Potomok postaví miestnosť (floor, walls, ceiling, box, cyl, quad, flame, person, spot) a zavolá setupRoom3({ title, leave, spawn, amb, floorSnd, mode }).
 */
const K3 = .65;
class Room3Scene extends Phaser.Scene {
    /** Vytvorí 3D scénu, kameru a svetlá pre miestnosť FW × FD × WH (podlahové jednotky). o: { bg, sky, ground, fog }. */
    setRoom3(FW, FD, WH, o = {}) {
        const t = THREE, k = B3.kit.ensure();
        this.FW = FW; this.FD = FD; this.WH = WH; this.R3 = k.R; this.cv3 = k.canvas;
        if (typeof M3 !== 'undefined' && M3.on) M3.stop();   // 3D mapa sa uvoľní (po návrate sa sama znova postaví)
        this.blocks = []; this.people = []; this.matC = new Map(); this.flames = []; this.skyQ = []; this.lights = []; this.tm3 = 0;
        this.S = new t.Scene(); this.S.background = new t.Color(o.bg || '#1a1410');
        if (o.fog) this.S.fog = new t.Fog(o.fog, 120, 420);
        this.cam3 = new t.PerspectiveCamera(62, 1.5, .5, 900);
        this.world = new t.Group(); this.world.scale.setScalar(K3); this.S.add(this.world);
        this.hemi = new t.HemisphereLight(o.sky || 0xfff0d8, o.ground || 0x5a4630, o.hemi ?? 1.5); this.S.add(this.hemi);
        this.yaw = 0; this.pitch = .3; this.dist = 52; this.fp = false; this.sp3 = 0; this.hpl = { x: FW / 2, y: FD / 2, f: 0 };
        const R = this.R3; R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); R.shadowMap.enabled = true; R.shadowMap.type = t.PCFSoftShadowMap; R.toneMapping = t.NoToneMapping; R.clippingPlanes = [];
        this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
    }
    // ---------- farby a materiály ----------
    hexc(c) { return typeof c === 'number' ? c : parseInt(c.slice(1), 16); }
    shade(c, k) { const n = this.hexc(c), f = v => Math.max(0, Math.min(255, Math.round(v * k))); return (f(n >> 16 & 255) << 16) | (f(n >> 8 & 255) << 8) | f(n & 255); }
    /** Materiál s textúrou z generátora Tex.pattern (dlaždica 256 jednotiek), opakovaná rx × ry krát. */
    texMat(kind, color, seed, rx, ry) {
        const key = Tex.pattern(this, kind, color, seed), img = this.textures.get(key).getSourceImage(), t = THREE, tx = new t.CanvasTexture(img);
        tx.wrapS = tx.wrapT = t.RepeatWrapping; tx.repeat.set(rx, ry); tx.anisotropy = 4; if ('colorSpace' in tx) tx.colorSpace = t.SRGBColorSpace;
        return new t.MeshStandardMaterial({ map: tx, roughness: .95, metalness: 0 });
    }
    mat(col, o = {}) { const k = col + '|' + (o.r ?? .9) + '|' + (o.e || 0); let m = this.matC.get(k); if (!m) { m = new THREE.MeshStandardMaterial({ color: this.hexc(col), roughness: o.r ?? .9, metalness: o.m ?? 0, emissive: o.e ? this.hexc(o.e) : 0x000000 }); this.matC.set(k, m); } return m; }
    add3(m, shadow = true) { m.castShadow = shadow; m.receiveShadow = true; this.world.add(m); return m; }
    // ---------- stavba miestnosti (jednotky ako v izometrii) ----------
    floor(kind, color, seed = 1) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(this.FW, this.FD), this.texMat(kind, color, seed, this.FW / 256, this.FD / 256)); m.rotation.x = -Math.PI / 2; m.position.set(this.FW / 2, 0, this.FD / 2); m.receiveShadow = true; this.world.add(m); return m;
    }
    ceiling(col, beams) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(this.FW, this.FD), this.mat(col, { r: 1 })); m.rotation.x = Math.PI / 2; m.position.set(this.FW / 2, this.WH, this.FD / 2); this.world.add(m);
        if (beams) for (let x = 30; x < this.FW; x += 70) this.box(x, 0, 8, this.FD, 8, beams, { z: this.WH - 8, block: false, shadow: false });
    }
    /** Štyri steny dovnútra miestnosti; skip = zoznam stien, ktoré sa nekreslia ('l', 'r', 'f', 'b'): l wx = 0, r wy = 0, b wx = FW, f wy = FD. */
    walls(kind, color, seed = 1, skip = []) {
        const W = [['l', this.FD, 0, this.FD / 2, Math.PI / 2], ['b', this.FD, this.FW, this.FD / 2, -Math.PI / 2], ['r', this.FW, this.FW / 2, 0, 0], ['f', this.FW, this.FW / 2, this.FD, Math.PI]];
        for (const [id, len, x, z, ry] of W) { if (skip.includes(id)) continue; const m = new THREE.Mesh(new THREE.PlaneGeometry(len, this.WH), this.texMat(kind, color, seed, len / 256, this.WH / 256)); m.position.set(x, this.WH / 2, z); m.rotation.y = ry; m.receiveShadow = true; this.world.add(m); }
    }
    /** Kváder na podlahe: x, y (zadný roh), w (po wx), d (po wy), h; o: { top, z, block, shadow }. */
    box(x, y, w, d, h, col, o = {}) {
        const side = this.mat(col), top = this.mat(o.top != null ? o.top : this.shade(col, 1.18)), z = o.z || 0;
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, top, side, side, side]); m.position.set(x + w / 2, z + h / 2, y + d / 2); this.add3(m, o.shadow !== false);
        if (o.block !== false) this.blocks.push([x, y, w, d]);
        return m;
    }
    /** Valec (sud, stĺp): stred x, y, polomer r, výška h; o.hoops = obruče sudu. */
    cyl(x, y, r, h, col, o = {}) {
        const z = o.z || 0, m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * (o.taper || 1), h, 18), this.mat(col)); m.position.set(x, z + h / 2, y); this.add3(m);
        if (o.hoops) for (const k of [.25, .75]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.02, .7, 5, 20), this.mat('#3a3a3a', { r: .5, m: .6 })); ring.rotation.x = Math.PI / 2; ring.position.set(x, z + h * k, y); this.world.add(ring); }
        if (o.block !== false) this.blocks.push([x - r, y - r, r * 2, r * 2]);
        return m;
    }
    /** Plochá plocha (zástava, okno, obraz) na stene alebo kdekoľvek: stred (x, y, z), šírka w, výška h, natočenie ry okolo zvislej osi (0 pozerá k +wy). */
    quad(x, y, z, w, h, ry, mat) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, z, y); m.rotation.y = ry; this.world.add(m); return m; }
    /** Textúra z Phaser kľúča (napr. zástava frakcie z Art.banner) ako materiál plochy. */
    keyMat(key) { const tx = new THREE.CanvasTexture(this.textures.get(key).getSourceImage()); if ('colorSpace' in tx) tx.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshStandardMaterial({ map: tx, roughness: .95, transparent: true, side: THREE.DoubleSide }); }
    /** Okno s oblohou (mení sa podľa dennej doby a počasia): obdĺžnik w × h v bode (x, y, z) na stene natočenej o ry; rám z farby frame. */
    windowAt(x, y, z, w, h, ry, frame) {
        const m = new THREE.MeshBasicMaterial({ color: 0x7fb0e8 }); this.skyQ.push(m); this.quad(x, y, z, w, h, ry, m);
        const dx = Math.cos(ry), dz = -Math.sin(ry), fm = this.mat(frame, { r: .8 });
        for (const [fx, fy, fw, fh] of [[0, h / 2, w + 5, 3], [0, -h / 2, w + 5, 3], [-w / 2, 0, 3, h + 5], [w / 2, 0, 3, h + 5], [0, 0, 2, h], [0, 0, w, 2]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 2), fm); b.position.set(x + dx * fx, z + fy, y + dz * fx); b.rotation.y = ry; this.world.add(b); }
    }
    /** Oheň (plameň + žiara): stred (x, y, z), farby col1 (vonkajšia) a col2 (jadro), veľkosť s, svetlo intenzity li. */
    flame(x, y, z, col1 = 0xff7a20, col2 = 0xffd060, s = 1, li = 2.2) {
        const g = new THREE.Group(); g.position.set(x, z, y);
        const a = new THREE.Mesh(new THREE.ConeGeometry(4 * s, 14 * s, 6), new THREE.MeshBasicMaterial({ color: col1, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false })); a.position.y = 7 * s;
        const b = new THREE.Mesh(new THREE.ConeGeometry(2.4 * s, 8 * s, 6), new THREE.MeshBasicMaterial({ color: col2, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false })); b.position.y = 4.5 * s;
        g.add(a, b); this.world.add(g);
        let L = null; if (li > 0) { L = new THREE.PointLight(col2, li, 170 / K3, 0); L.position.set(x, z + 14 * s, y); this.world.add(L); this.lights.push(L); }
        const f = { g, a, b, L, ph: Math.random() * 6, li }; this.flames.push(f); return f;
    }
    /** Mäkké svetlo bez plameňa (okno, lampáš). */
    glow3(x, y, z, col, li, dist) { const L = new THREE.PointLight(col, li, dist / K3, 0); L.position.set(x, z, y); this.world.add(L); this.lights.push(L); return L; }
    /** Slnko cez okná: smerové svetlo s tieňmi nad miestnosťou. */
    sun3(col, inten, dx = .4, dz = .25) {
        const L = new THREE.DirectionalLight(col, inten); L.position.set(this.FW / 2 + dx * 300, 260, this.FD / 2 + dz * 300); L.target.position.set(this.FW / 2, 0, this.FD / 2); this.world.add(L, L.target);
        L.castShadow = true; L.shadow.mapSize.set(1024, 1024); const c = L.shadow.camera, e = Math.max(this.FW, this.FD) * .75; c.left = -e; c.right = e; c.top = e; c.bottom = -e; c.near = 10; c.far = 700; L.shadow.bias = -.0006; this.sun = L; return L;
    }
    // ---------- postavy ----------
    /** Pseudo-jednotka pre B3.kit.rig: obyvateľ { eq, look, cape } alebo hrdina (h: 1). */
    rigOf(spec) {
        const u = spec === 'hero' ? { h: 1, t: 0, x: 0, y: 0, f: 0, hp: 1, c: 0 } : { npc: spec, t: 0, x: 0, y: 0, f: 0, hp: 1, c: 0, vr: .5 };
        const C = typeof CMB !== 'undefined' ? CMB : null, w0 = C && C.wpn, sh = C && C.shMax; if (C) { C.wpn = 'm'; C.shMax = 0; }   // po bitke by hrdina držal luk alebo rozbitý štít
        try { return B3.kit.rig(u); } finally { if (C) { C.wpn = w0; C.shMax = sh; } }
    }
    /** Pózy nôh a rúk podľa rýchlosti sp (jednotky na krok) a fázy ph – zjednodušená chôdza z bitky. */
    walkPose(o, sp, dt, face) {
        const B = o.B, H = o.H, amt = Math.min(1, sp / 1), br = Math.sin(this.tm3 * 2.2 + (o.id || 0)) * .5 + .5; o.ph += sp * dt * .2;
        [[B.lgR, B.knR, 0], [B.lgL, B.knL, Math.PI]].forEach(([lg, kn, off]) => { const p = o.ph + off; lg.rotation.set(0, 0, Math.sin(p) * .62 * amt + (1 - amt) * .04); kn.rotation.z = -(Math.max(0, Math.cos(p)) * 1.15 * amt + .06 + (1 - amt) * .05); });
        B.hip.position.y = H.hipY + Math.abs(Math.sin(o.ph)) * .55 * amt - br * .05;
        const sw = Math.sin(o.ph) * amt, aR = (H.spear ? .9 : .2) - sw * .45, aL = (H.bow ? .35 : .3) + sw * .4, eL = H.shield ? .9 : .45;
        B.shR.rotation.set(.12, 0, aR); B.elR.rotation.z = .5 + br * .05; B.shL.rotation.set(H.bow ? .15 : -.12, 0, aL); B.elL.rotation.z = eL; if (B.shd) B.shd.rotation.z = -(aL + eL) * .92;
        B.ch.rotation.set(0, 0, -((H.hunch || 0) + Math.min(.32, sp * .1))); B.ch.scale.set(1, 1 + br * .012, 1 + br * .008);
        if (B.cape) B.cape.rotation.z = -.12 - Math.min(.7, sp * .25);
        if (B.ey) B.ey.scale.y = ((this.tm3 * .55 + (o.id || 0) * .37) % 4) < .05 ? .15 : 1;
    }
    /** Postava v bode (x, y) podlahy; spec = { eq, look, cape }; fn sa vykoná pri akcii. Vráti záznam postavy. */
    person(x, y, spec, name, fn, sc = 1, face) {
        const o = this.rigOf(spec), root = o.root, f = face ?? Math.atan2(this.FD / 2 - y, this.FW / 2 - x);
        root.scale.setScalar(sc / .9 * .95); root.position.set(x * K3, 0, y * K3); root.rotation.y = -f; this.S.add(root);
        o.ph = Math.random() * 6; o.id = this.people.length + 1;
        const lbl = this.add.text(0, 0, name, txtStyle(10, '#f4e8d0', { backgroundColor: 'rgba(14,10,8,.72)', padding: { x: 5, y: 2 } })).setOrigin(.5, 1).setDepth(1900);
        const p = { o, root, lbl, name, x, y, fn, lz: 40 * sc, spot: 0 }; this.people.push(p); return p;
    }
    /** Miesto (dvere, stánok…): hráč k nemu dôjde a stlačí E; stojí pri (standAt) alebo kúsok pred ním. Štítok visí vo výške lz. */
    spot(x, y, w, h, name, fn, standAt, lz = 30) {
        const st = standAt || [x, y + 26], lbl = this.add.text(0, 0, name, txtStyle(10, '#ffe8b0', { backgroundColor: 'rgba(14,10,8,.72)', padding: { x: 5, y: 2 } })).setOrigin(.5, 1).setDepth(1900);
        const p = { lbl, name, x: st[0], y: st[1], lx: x, ly: y, fn, lz, spot: 1 }; this.people.push(p); return p;
    }
    clearPeople() { for (const p of this.people) { if (p.root) this.S.remove(p.root); p.lbl.destroy(); } this.people = []; }
    // ---------- rozhranie a vstup ----------
    /** Nadpis, nápoveda, tlačidlo odchodu, hrdina na mieste spawn, ovládanie a zvuky prostredia. r: { title, leave, hint, spawn, amb, floorSnd, mode }. */
    setupRoom3(r) {
        this.room = r;
        const ui = this.scene.get('UI'), pwid = Math.max(260, r.title.length * 11 + 70), plaque = this.add.graphics().setDepth(1999);
        ui.panelFrame(plaque, W / 2 - pwid / 2, 34, pwid, 32, false);
        plaque.fillStyle(0xd9a441, .9).fillTriangle(W / 2 - pwid / 2 - 8, 50, W / 2 - pwid / 2 + 2, 44, W / 2 - pwid / 2 + 2, 56).fillTriangle(W / 2 + pwid / 2 + 8, 50, W / 2 + pwid / 2 - 2, 44, W / 2 + pwid / 2 - 2, 56);
        this.add.text(W / 2, 50, r.title, txtStyle(17, '#f3dc9a', { fontFamily: TITLE_FONT, stroke: '#000', strokeThickness: 2 })).setOrigin(.5).setDepth(2000);
        const rail = this.add.graphics().setDepth(1998);
        rail.fillGradientStyle(0x1c140e, 0x1c140e, 0x0e0a08, 0x0e0a08, .72, .72, .92, .92).fillRect(0, H - 34, W, 34); rail.fillStyle(0xc9a24a, .7).fillRect(0, H - 34, W, 1);
        this.hint = this.add.text(W / 2 - 60, H - 17, r.hint || 'WASD = chôdza   ·   myš (klik) = pohľad   ·   E / medzerník = akcia   ·   Tab = pohľad   ·   Esc = odísť', txtStyle(11, '#e8dcc0')).setOrigin(.5).setDepth(2000);
        this.leaveBtn = ui.button.call(this, W - 150, H - 31, 142, 28, r.leave, () => this.leave(), { size: 11, icon: Icons.tex(this, 'door') }); this.leaveBtn.forEach(o => o.setDepth(2001));
        const [wx, wy] = r.spawn || [this.FW / 2, this.FD - 30]; this.hpl = { x: wx, y: wy, f: r.face ?? Math.atan2(this.FD / 2 - wy, this.FW / 2 - wx) };
        this.hero = this.rigOf('hero'); this.hero.ph = 0; this.hero.id = 0; this.S.add(this.hero.root); this.yaw = this.hpl.f; this.fl = this.hpl.f;
        this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,LEFT,DOWN,RIGHT,SHIFT');
        const dlg = () => !ov.classList.contains('hide'), kb = this.input.keyboard;
        kb.on('keydown-ESC', () => { if (!dlg()) this.leave(); });
        kb.on('keydown-SPACE', () => this.interact3()); kb.on('keydown-E', () => this.interact3());
        kb.on('keydown-TAB', e => { e.preventDefault(); this.fp = !this.fp; });
        const cv = this.game.canvas, lock = () => document.pointerLockElement === cv;
        this.input.on('pointerdown', p => { if (!dlg() && !lock() && cv.requestPointerLock) { try { cv.requestPointerLock(); } catch (e) { } } });
        this.input.on('pointermove', p => { if (dlg()) return; if (lock()) { this.yaw += (p.movementX || 0) * .0035; this.pitch = Math.max(-.5, Math.min(1.1, this.pitch + (p.movementY || 0) * .0035)); } else if (p.isDown) { this.yaw += (p.x - p.prevPosition.x) * .006; this.pitch = Math.max(-.5, Math.min(1.1, this.pitch + (p.y - p.prevPosition.y) * .005)); } });
        this.input.on('wheel', (p, o, dx, dy) => { this.dist = Math.max(26, Math.min(120, this.dist + dy * .06)); });
        this.events.once('shutdown', () => { this.input.keyboard.removeAllListeners(); this.input.removeAllListeners(); try { if (document.exitPointerLock) document.exitPointerLock(); } catch (e) { } RoomSnd.stop(); this.teardown3(); });
        if (r.amb) { RoomSnd.door(); RoomSnd.start(r.amb); }
        this.cv3.style.display = 'block';
    }
    blocked(x, y) { return x < 10 || y < 10 || x > this.FW - 10 || y > this.FD - 10 || this.blocks.some(([bx, by, bw, bd]) => x > bx - 6 && x < bx + bw + 6 && y > by - 6 && y < by + bd + 6); }
    interact3() {
        if (!ov.classList.contains('hide') || !this.hero) return;
        let best = null, bd = 70;
        for (const p of this.people) { const d = Math.hypot(p.x - this.hpl.x, p.y - this.hpl.y); if (d < bd && p.fn) { bd = d; best = p; } }
        if (best) { this.hpl.f = Math.atan2((best.ly ?? best.y) - this.hpl.y, (best.lx ?? best.x) - this.hpl.x); this.fl = this.hpl.f; best.fn(); }
    }
    leave() { }
    closeRoom() { this.scene.stop(); if (this.scene.isSleeping('Map')) this.scene.wake('Map'); }
    /** Vypne 3D (po zatvorení scény) a uvoľní geometriu. */
    teardown3() {
        if (this.cv3) this.cv3.style.display = 'none';
        if (this.S) this.S.traverse(o => { if (o.geometry && !(o.geometry.attributes && o.geometry.attributes.skinIndex)) o.geometry.dispose(); });
        this.S = null; this.hero = null; this.people = [];
    }
    /** Posun hrdinu podľa klávesov voči smeru kamery, kolízie s prekážkami. */
    moveHero(dt) {
        const k = this.keys, dlg = !ov.classList.contains('hide'), h = this.hpl;
        if (!dlg && k) { if (k.LEFT.isDown) this.yaw -= .035 * dt; if (k.RIGHT.isDown) this.yaw += .035 * dt; }
        let f = 0, s = 0; if (!dlg && k) { if (k.W.isDown || k.UP.isDown) f++; if (k.S.isDown || k.DOWN.isDown) f--; if (k.D.isDown) s++; if (k.A.isDown) s--; }
        let moved = 0;
        if (f || s) {
            const m = Math.hypot(f, s), fx = Math.cos(this.yaw), fz = Math.sin(this.yaw), rx = -fz, rz = fx, vx = (fx * f + rx * s) / m, vz = (fz * f + rz * s) / m, sp = (k.SHIFT.isDown ? 2.3 : 1.45) * dt, nx = h.x + vx * sp, ny = h.y + vz * sp;
            if (!this.blocked(nx, ny)) { h.x = nx; h.y = ny; moved = sp; } else if (!this.blocked(nx, h.y)) { h.x = nx; moved = sp * .6; } else if (!this.blocked(h.x, ny)) { h.y = ny; moved = sp * .6; }
            if (moved) this.fl = Math.atan2(vz, vx);
        }
        let d = this.fl - h.f; d = Math.atan2(Math.sin(d), Math.cos(d)); h.f += d * Math.min(1, .25 * dt);
        this.sp3 += (moved * K3 / Math.max(.3, dt) - this.sp3) * .2;
        if (moved && Math.floor(this.tm3 * 3.2) !== Math.floor((this.tm3 - dt / 60) * 3.2)) RoomSnd.step(this.room.floorSnd || 'stone');
    }
    /** Jedna snímka: pohyb, pózy, kamera, svetlá, štítky a vykreslenie. Potomok volá zo svojho update(). */
    step3(dt) {
        if (!this.S) return;
        this.tm3 += dt / 60; const hr = this.hero, h = this.hpl, t = THREE;
        this.moveHero(dt);
        hr.root.position.set(h.x * K3, 0, h.y * K3); hr.root.rotation.y = -h.f; this.walkPose(hr, this.sp3, dt);
        hr.B.hd.scale.setScalar(this.fp ? .001 : 1);
        for (const p of this.people) if (p.root) { this.walkPose(p.o, 0, dt); const dx = h.x - p.x, dy = h.y - p.y; if (Math.hypot(dx, dy) < 60) { let a = Math.atan2(dy, dx) + p.root.rotation.y; a = Math.atan2(Math.sin(a), Math.cos(a)); p.root.rotation.y -= a * .04 * dt; } }   // pri priblížení sa postava otočí k hrdinovi
        // kamera: tretia osoba (za hrdinom) alebo prvá osoba (z hlavy), v hraniciach miestnosti
        const cam = this.cam3, hx = h.x * K3, hz = h.y * K3, cp = Math.cos(this.pitch), sp = Math.sin(this.pitch), W3 = this.FW * K3, D3 = this.FD * K3, H3 = this.WH * K3;
        if (this.fp) { cam.position.set(hx + Math.cos(this.yaw) * 2, 28, hz + Math.sin(this.yaw) * 2); cam.lookAt(cam.position.x + Math.cos(this.yaw) * cp * 10, 28 - sp * 10, cam.position.z + Math.sin(this.yaw) * cp * 10); }
        else { const px = hx - Math.cos(this.yaw) * cp * this.dist, pz = hz - Math.sin(this.yaw) * cp * this.dist, py = 26 + sp * this.dist; const pd = this.camPad || 0; cam.position.set(Math.max(5 - pd, Math.min(W3 - 5 + pd, px)), Math.max(8, Math.min(H3 - 5 + (this.camUp || 0), py)), Math.max(5 - pd, Math.min(D3 - 5 + pd, pz))); cam.lookAt(hx, 24, hz); }
        // oheň, svetlá, obloha v oknách
        const nn = typeof nightness === 'function' ? nightness() : 0, day = 1 - nn;
        for (const f of this.flames) { const s = 1 + Math.sin(this.tm3 * 9 + f.ph) * .12 + Math.sin(this.tm3 * 5.3 + f.ph * 2) * .08; f.a.scale.set(1, s, 1); f.b.scale.set(1, 1 / s + Math.sin(this.tm3 * 12 + f.ph) * .08, 1); if (f.L) f.L.intensity = f.li * (.9 + (s - 1) * 1.4); }
        for (const m of this.skyQ) m.color.setRGB((40 + 100 * day) / 255, (60 + 120 * day) / 255, (95 + 140 * day) / 255);
        if (this.sun) this.sun.intensity = 1.6 * day + .1;
        this.hemi.intensity = (this.baseHemi ??= this.hemi.intensity) * (.55 + .45 * day);
        // štítky nad postavami a miestami
        const v = new t.Vector3();
        for (const p of this.people) {
            const wx = (p.lx ?? p.x) * K3, wz = (p.ly ?? p.y) * K3, near = Math.hypot(p.x - h.x, p.y - h.y) < 70;
            v.set(wx, p.lz * K3 + (p.spot ? 0 : 8), wz).project(cam);
            const vis = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
            p.lbl.setVisible(vis); if (!vis) continue;
            p.lbl.setPosition((v.x * .5 + .5) * W, (-v.y * .5 + .5) * H); p.lbl.setColor(near ? '#ffd24a' : p.spot ? '#ffe8b0' : '#f4e8d0');
            const txt = near ? p.name + ' ⎵' : p.name; if (p.lbl.text !== txt) p.lbl.setText(txt);
        }
        // veľkosť plátna podľa Phaseru a vykreslenie
        const pc = this.game.canvas, r = pc.getBoundingClientRect(), hr0 = this.cv3.parentNode.getBoundingClientRect(), w = Math.round(r.width) || 720, hh = Math.round(r.height) || 480, cv = this.cv3;
        cv.style.left = (r.left - hr0.left) + 'px'; cv.style.top = (r.top - hr0.top) + 'px'; cv.style.width = w + 'px'; cv.style.height = hh + 'px';
        if (this.fw !== w || this.fh !== hh) { this.fw = w; this.fh = hh; this.R3.setSize(w, hh, false); cam.aspect = w / hh; cam.updateProjectionMatrix(); }
        this.R3.setRenderTarget(null); this.R3.render(this.S, cam);
    }
}
