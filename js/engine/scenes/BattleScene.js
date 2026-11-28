/*
 * ENGINE: bitka.
 * Boj, AI vojakov, šípy, rozkazy a obliehanie beží v js/sim cez updBattle(dt).
 * Bojisko aj vojakov kreslí 3D vrstva B3 (js/engine/3d/b3d.js) pod priehľadným plátnom Phaseru;
 * scéna sa stará o načítanie, ovládanie (myš, klávesy), pevný krok simulácie a počítadlo FPS.
 * Bitka vyžaduje WebGL; bez neho sa bitka vzdá (viď prepBattle).
 */

/** Pohyb myši pre smer úderu a krytu (js/sim/combat.js mouseDir). */
const mouseDelta = p => { CMB.mdx = (CMB.mdx || 0) + (p.x - p.prevPosition.x) / RES; CMB.mdy = (CMB.mdy || 0) + (p.y - p.prevPosition.y) / RES; };
class BattleScene extends Phaser.Scene {
    constructor() { super('Battle'); }

    create() {
        this.ready = false;
        const fast = OPT.loadScr === false;
        if (!fast) LoadScr.show(loadInfo());   // načítavacia obrazovka (js/ui/loading.js): kým je hore, stavia sa bojisko a kompilujú shadery
        this.events.once('shutdown', () => { if (!this.ready) LoadScr.kill(); });
        this.prepBattle(fast);
    }

    /** Postupná príprava bitky po snímkach, aby sa načítavacia obrazovka hýbala; potom plynulý prechod do boja. */
    async prepBattle(fast) {
        const alive = () => mode === 'battle' && this.sys && this.sys.isActive();
        const step = (p, txt) => { LoadScr.set(p, txt); return new Promise(r => requestAnimationFrame(() => setTimeout(r, 0))); };
        await step(.08, 'Zem sa chveje pod krokmi vojsk…'); if (!alive()) return;
        if (!B3.want() || !B3.start()) {   // bez WebGL sa bitka nedá zobraziť: vzdáme ju, nech hra nezostane visieť
            LoadScr.kill(); console.error('Bitka vyžaduje WebGL a Three.js.');
            alert('Bitku sa nepodarilo zobraziť: prehliadač nepodporuje WebGL.'); endBattle(false); return;
        }
        await step(.38, 'Kováči dokúvajú zbroj a vojaci si navliekajú brnenie…'); if (!alive()) return B3.stop();
        B3.prep();
        await step(.66, 'Zástavy sa dvíhajú nad šíkmi…'); if (!alive()) return B3.stop();
        await B3.warm(); if (!alive()) return B3.stop();
        await step(.94, 'Rohy zvolávajú do boja…'); if (!alive()) return B3.stop();
        const wait = fast ? 0 : Math.max(0, 1200 - LoadScr.elapsed);
        if (wait) await new Promise(r => setTimeout(r, wait));
        if (!alive()) { B3.stop(); LoadScr.kill(); return; }
        this.build();
        LoadScr.hide();
    }

    /** Phaser kreslí len rozhranie (UIScene); ovládanie: myš zamkne kurzor a otáča hrdinu, P fotorežim, Tab prvá/tretia osoba. */
    build() {
        this.ready = true; this.bAcc = 0;
        if (this.sys.game.device.input.mouse !== false) CMB.km = 1;   // myš mieri od začiatku
        this.cameras.main.transparent = true;
        let last = null;
        const set = p => { last = { x: p.x, y: p.y }; const q = B3.pick(p.x, p.y); if (q) { ptr.x = q.x - bc.x; ptr.y = q.y - bc.y; } };
        this.repick = () => { if (last) set(last); };
        if (this.input.mouse) this.input.mouse.disableContextMenu();
        // fotorežim (P): hra stojí, myš otáča voľnou kamerou; nálet kamery na začiatku preskočí klik alebo kláves
        // mierenie ako vo Warbande: prvý klik zamkne kurzor, myš potom otáča hrdinu a kameru (Esc kurzor uvoľní)
        const M = this.input.mouse, locked = () => !!(M && M.locked);
        this.input.on('pointerdown', p => {
            B3.skipIntro(); if (B3.photo || p.middleButtonDown()) { B3.dragStart(p.x, p.y); return; }
            if (B3.look && M && !locked()) { M.requestPointerLock(); return; }
            if (!B3.look) set(p);
            if (p.rightButtonDown()) { CMB.rmb = 1; CMB.km = 1; } else { ptr.down = true; if (CMB.km) CMB.lmb = 1; }
        });
        this.input.on('pointermove', p => {
            if (B3.photo) { B3.dragMove(p.x, p.y); return; }
            if (B3.look) { if (locked()) { B3.lookMove(p.movementX || 0, p.movementY || 0); CMB.mdx = (CMB.mdx || 0) + (p.movementX || 0) / RES; CMB.mdy = (CMB.mdy || 0) + (p.movementY || 0) / RES; } return; }
            B3.dragMove(p.x, p.y); set(p); if (!p.middleButtonDown()) mouseDelta(p);
        });
        this.input.on('pointerup', p => { if (B3.photo || p.middleButtonReleased()) { B3.dragEnd(); if (B3.photo) return; } if (p.middleButtonReleased()) return; if (p.rightButtonReleased()) CMB.rmb = 0; else { ptr.down = false; CMB.lmb = 0; } });
        let wl = 0; this.input.on('wheel', (p, o, dx, dy) => { if (B3.photo) { B3.wheel(dy); return; } const n = performance.now(); if (n - wl > 220 && Math.abs(dy) > 1) { wl = n; wpnSwitch(); } });   // koliesko: zbraň na blízko / strelná
        this.keyH = e => {
            if (mode !== 'battle') return; const k = (e.key || '').toLowerCase();
            if (k === 'p' && !e.repeat) B3.photoToggle(); else if (k === 'escape' && B3.photo) B3.photoToggle();
            else if (e.key === KB().cam) { e.preventDefault(); if (!e.repeat) B3.toggleFP(); }
            else if (k === '+' || k === '=' || k === 'pageup') B3.wheel(-160); else if (k === '-' || k === 'pagedown') B3.wheel(160);
            else B3.skipIntro();
        };
        addEventListener('keydown', this.keyH);
        this.events.once('shutdown', () => {
            if (locked()) M.releasePointerLock();
            removeEventListener('keydown', this.keyH);
            this.input.removeAllListeners(); ptr.down = false; CMB.lmb = CMB.rmb = 0; B3.stop();
        });
    }

    update(time, delta) {
        if (!this.ready) { if (mode !== 'battle') this.scene.start('Map'); return; }
        if (mode === 'battle') {   // pevný krok simulácie; zastavenie obrazu len pri ťažkom údere, spomalenie a fotorežim v 3D
            const k = B3.timeK();
            if (HITSTOP > 0 && !OPT.hitstop) HITSTOP = 0;
            if (HITSTOP > 0) { HITSTOP -= delta / 16.67; this.bAcc = 0; }
            // tempo boja (Nastavenia): všetko v boji beží pomalšie, ako vo Warbande
            else if (k > 0) { this.bAcc = (this.bAcc || 0) + Math.min(2.5, delta / 16.67) * k * ({ s: .6, n: .72, r: 1 }[OPT.tempo] || .72); let n = 0; while (this.bAcc >= 1 && n < 3) { updBattle(1); this.bAcc -= 1; n++; } }
        }
        if (mode !== 'battle') { if (this.input.mouse && this.input.mouse.locked) this.input.mouse.releasePointerLock(); fpsBox(null); this.scene.start('Map'); return; }
        fpsBox(this.game.loop.actualFps);
        if (!B3.look) this.repick();
        B3.frame(Math.min(3, delta / 16.67));
    }
}
/** Počítadlo snímok v bitke aj na mape (Nastavenia → Počítadlo FPS): FPS, priemer a najhorší 1 % za ~10 s, počet vojakov, zníženie kvality automatikou. */
function fpsBox(fps) {
    let el = document.getElementById('fpsBox');
    if (fps == null || !OPT.fps) { if (el) el.style.display = 'none'; return; }
    if (!el) { el = document.createElement('div'); el.id = 'fpsBox'; el.style.cssText = 'position:absolute;right:8px;top:6px;z-index:30;font:12px monospace;color:#e8e0c8;background:rgba(0,0,0,.45);padding:2px 6px;border-radius:3px;pointer-events:none'; (document.getElementById('game') || document.body).appendChild(el); }
    el.style.display = 'block';
    const H = fpsBox.h = fpsBox.h || []; H.push(fps); if (H.length > 600) H.shift();   // posledných ~10 s: priemer a najhorší 1 % snímok
    const now = performance.now(); if (fpsBox.t && now - fpsBox.t < 400) return; fpsBox.t = now;
    const bt = typeof mode !== 'undefined' && mode === 'battle', alive = bt ? U.filter(u => u.hp > 0 && !u.fled).length : 0, aq = bt && typeof B3 !== 'undefined' && B3.isOn() ? B3.aq : 0;
    const S = H.slice().sort((p, q) => p - q), low = S[Math.floor(S.length * .01)] || fps, avg = H.reduce((s, v) => s + v, 0) / H.length;
    el.textContent = Math.round(fps) + ' FPS (ø ' + Math.round(avg) + ', min ' + Math.round(low) + ')' + (bt ? ' · ' + alive + ' vojakov' : ' · mapa') + (aq ? ' · auto −' + aq : '');
}
