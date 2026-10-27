/*
 * Náhrada Phaseru pre automatické testy bez internetu.
 * Nič nevykresľuje, ale spúšťa scény (create/update) a prechody medzi nimi,
 * takže odhalí chyby v logike scén. Skutočný vzhľad treba overiť v prehliadači.
 */
(function () {
    function mk(extra) { const o = Object.assign({ x: 0, y: 0, visible: true }, extra); const p = new Proxy(o, { get(t, k) { if (k in t) return t[k]; if (typeof k === 'symbol') return undefined; return (...a) => { if (k === 'setPosition') { t.x = a[0]; t.y = a[1] ?? a[0]; } if (k === 'setVisible') t.visible = a[0]; if (k === 'setText') t.text = a[0]; if (k === 'setTexture') { if (!STUB.tex.has(a[0])) throw new Error('Chýba textúra ' + a[0]); t.texture = { key: a[0] }; } return p; }; } }); return p; }
    const STUB = { tex: new Map(), log: [] };
    class Scene {
        constructor(key) { this.sys = { key: typeof key === 'string' ? key : key.key }; }
    }
    function bind(scene, game) {
        const tex = {
            exists: k => STUB.tex.has(k), remove: k => STUB.tex.delete(k),
            addCanvas: (k, c) => { if (!c || !c.getContext) throw new Error('addCanvas bez plátna'); STUB.tex.set(k, c); return { refresh() { } }; }
        };
        scene.textures = tex;
        scene.add = {
            image: (x, y, k) => { if (!STUB.tex.has(k)) throw new Error('Chýba textúra ' + k); return mk({ x, y, texture: { key: k } }); },
            text: (x, y, t) => mk({ x, y, text: t }), graphics: () => mk(), group: () => mk(),
            particles: (x, y, k) => { if (!STUB.tex.has(k)) throw new Error('Chýba textúra ' + k); return mk(); }
        };
        const camMain = mk({ getWorldPoint: (x, y) => ({ x: x / Z + cam.x, y: y / Z + cam.y }) });
        scene.cameras = { main: camMain, add: () => mk() };
        const handlers = {};
        scene.input = { on: (e, f) => (handlers[e] = handlers[e] || []).push(f), removeAllListeners: () => { for (const k in handlers) delete handlers[k]; }, _h: handlers };
        const ev = {};
        scene.events = { on: (e, f) => (ev[e] = ev[e] || []).push(f), once: (e, f) => (ev[e] = ev[e] || []).push(f), emit: e => { const l = ev[e] || []; ev[e] = []; l.forEach(f => f()); } };
        scene.scene = {
            start: k => game._start(k, scene), launch: k => game._launch(k),
            isActive: k => game.active.has(k)
        };
    }
    class Game {
        constructor(cfg) {
            this.cls = {}; this.active = new Map();
            for (const C of cfg.scene) { const s = new C(); this.cls[s.sys.key] = C; }
            window.__game = this;
            this._launch(cfg.scene.length && new cfg.scene[0]().sys.key);
            let last = performance.now();
            const tick = now => { const d = now - last; last = now; for (const [k, s] of [...this.active]) if (this.active.get(k) === s && s.update) { try { s.update(now, d); } catch (e) { STUB.log.push(k + ': ' + e.stack); throw e; } } requestAnimationFrame(tick); };
            requestAnimationFrame(tick);
        }
        _launch(k) { const s = new this.cls[k](); bind(s, this); this.active.set(k, s); s.preload && s.preload(); s.create && s.create(); return s; }
        _start(k, from) {
            if (from) { from.events.emit('shutdown'); this.active.delete(from.sys.key); }
            const rest = [...this.active]; this.active.clear();
            this._launch(k); for (const [kk, s] of rest) this.active.set(kk, s);
        }
    }
    window.Phaser = {
        Scene, Game, AUTO: 0, Scale: { FIT: 3, CENTER_BOTH: 1 },
        Display: { Color: { HexStringToColor: s => ({ color: parseInt(String(s).replace('#', '').slice(0, 6), 16) || 0 }) } }
    };
    window.__STUB = STUB;
})();
