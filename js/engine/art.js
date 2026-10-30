/*
 * ENGINE: grafika (sprity a animácie).
 *
 * Každý obrázok v hre má kľúč, napr. "u_uI1_1_3" = jednotka uI1 (Uruk-hai), strana 1 (nepriateľ),
 * frakcia 3 (Isengard). Strana 0 = tvoje vojsko vo farbe tvojej frakcie. Prípona _b = so zástavou.
 * 1. Ak existuje vlastný obrázok assets/sprites/<kľúč>.png (zbalený do js/engine/assets.js),
 *    použije sa ten.
 * 2. Inak sa obrázok nakreslí kódom v dvojnásobnom rozlíšení (RES).
 *
 * Pásy snímok (spritesheety) majú snímky vedľa seba zľava doprava:
 *   jednotky (96×96): 0 státie | 1–4 chôdza | 5–7 útok | 8–11 pád
 *   jazdci na mape (60×70) a hrady (120×110): 0–3 viatie zástavy
 * Šablóny na prekreslenie sú v assets/templates/.
 */
const RES = 2;

/** Rozmery snímok podľa predpony kľúča: [šírka, výška, stredX, stredY]. */
const ART_SIZES = {
    u_: [96, 96, 48, 48], hero_: [96, 96, 48, 48], unit_: [96, 96, 48, 48],
    rider_: [60, 70, 22, 52], herorider_: [60, 70, 22, 52], figure_: [72, 80, 36, 64], bigfig_: [216, 240, 108, 192],
    castle_: [120, 110, 52, 80], village_: [44, 30, 22, 20],
    banner_: [24, 30, 2, 2], crown: [24, 18, 12, 9], spark: [8, 8, 4, 4]
};
const artSize = key => ART_SIZES[Object.keys(ART_SIZES).find(p => key.startsWith(p))] || [64, 64, 32, 32];

const Art = {
    /** Mierka zobrazenia: koľko logických pixelov má jeden pixel obrázka. */
    scale: {},

    /** Nakreslí pás snímok; frames = pole funkcií, každá kreslí jednu snímku okolo bodu (0, 0). */
    sheet(key, frames) {
        const [fw, fh, ox, oy] = artSize(key), pw = fw * RES, ph = fh * RES;
        const out = document.createElement('canvas');
        out.width = pw * frames.length; out.height = ph;
        const o = out.getContext('2d'), label0 = label, tm0 = tm;
        label = () => { };
        frames.forEach((fn, i) => {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, pw, ph);
            ctx.setTransform(RES, 0, 0, RES, 0, 0);
            ctx.translate(ox, oy);
            try { fn(); } catch (e) { console.warn('Art', key, i, e); }
            ctx.restore();
            o.drawImage(cv, 0, 0, pw, ph, i * pw, 0, pw, ph);
        });
        label = label0; tm = tm0;
        return out;
    },

    /** Zaregistruje plátno ako textúru Phaseru so snímkami 0..n-1. */
    register(scene, key, canvas) {
        const [fw, fh] = artSize(key), tex = scene.textures.addCanvas(key, canvas);
        Art.addFrames(tex, key, canvas.width, canvas.height);
        Art.scale[key] = fh / canvas.height;
        return key;
    },

    addFrames(tex, key, w, h) {
        const [fw, fh] = artSize(key), pw = Math.round(h * fw / fh), n = Math.max(1, Math.round(w / pw));
        for (let i = 0; i < n; i++) tex.add(i, 0, i * pw, 0, pw, h);
        return n;
    },

    /** Vráti kľúč textúry; ak neexistuje, nakreslí ju funkciou build() -> pole snímok. */
    ensure(scene, key, build) {
        if (!scene.textures.exists(key)) Art.register(scene, key, Art.sheet(key, build()));
        Art.anims(scene, key);
        return key;
    },

    frames(scene, key) { return scene.textures.get(key).frameTotal - 1; },

    /** Animácie pre pás snímok (vytvoria sa raz pre celú hru). */
    anims(scene, key) {
        if (scene.anims.exists(key + ':idle')) return;
        const n = Art.frames(scene, key), fr = (a, b) => Array.from({ length: Math.max(1, Math.min(b, n - 1) - a + 1) }, (_, i) => ({ key, frame: Math.min(a + i, n - 1) }));
        scene.anims.create({ key: key + ':idle', frames: fr(0, 0), frameRate: 1 });
        if (n >= 12) {
            scene.anims.create({ key: key + ':walk', frames: fr(1, 4), frameRate: 9, repeat: -1 });
            scene.anims.create({ key: key + ':attack', frames: fr(5, 7), frameRate: 14 });
            scene.anims.create({ key: key + ':death', frames: fr(8, 11), frameRate: 9 });
        } else if (n >= 2) scene.anims.create({ key: key + ':wave', frames: fr(0, n - 1), frameRate: 6, repeat: -1 });
    },

    /** Načíta textúry z tools/generate_art.py (terén, hory, vojaci, bojisko). Vráti Promise. */
    loadTextures(scene) {
        const T = (typeof ASSETS !== 'undefined' && ASSETS.textures) || {};
        return Promise.all(Object.entries(T).map(([key, url]) => new Promise(ok => {
            const img = new Image();
            img.onload = () => {
                if (!scene.textures.exists(key)) scene.textures.addImage(key, img);
                Art.img[key] = img;
                ok();
            };
            img.onerror = () => { console.warn('Textúra sa nenačítala:', key); ok(); };
            img.src = url;
        })));
    },
    img: {},

    /** Druh kreslenia vojaka v assets/textures/unit_<druh>.png. */
    unitArt(u) {
        if (u.h) return it('w').r ? 'hero_spear' : 'hero';
        if (u.cp) return compDef(u.cp).art || 'hero';
        if (u.uk) return u.uk;
        if (u.k === 'o') return bloc(u.fc) ? 'orc' : 'i';
        if (u.k === 'a') return u.t && bloc(u.fc) ? 'orc_a' : 'a';
        return u.k;
    },

    /** Zloží pás snímok vojaka: podklad + tímová vrstva zafarbená farbou frakcie. */
    tinted(base, team, color) {
        const out = document.createElement('canvas'); out.width = base.width; out.height = base.height;
        const o = out.getContext('2d');
        o.drawImage(base, 0, 0);
        if (team) {
            const t = document.createElement('canvas'); t.width = team.width; t.height = team.height;
            const c = t.getContext('2d');
            c.drawImage(team, 0, 0);
            c.globalCompositeOperation = 'multiply'; c.fillStyle = color; c.fillRect(0, 0, t.width, t.height);
            c.globalCompositeOperation = 'destination-in'; c.drawImage(team, 0, 0);
            o.drawImage(t, 0, 0);
        }
        return out;
    },

    /** Načíta vlastné obrázky z js/engine/assets.js (ak nejaké sú). Vráti Promise. */
    loadOverrides(scene) {
        const S = (typeof ASSETS !== 'undefined' && ASSETS.sprites) || {};
        return Promise.all(Object.entries(S).map(([key, url]) => new Promise(ok => {
            const img = new Image();
            img.onload = () => {
                if (scene.textures.exists(key)) scene.textures.remove(key);
                const tex = scene.textures.addImage(key, img);
                Art.addFrames(tex, key, img.width, img.height);
                Art.scale[key] = artSize(key)[1] / img.height;
                ok();
            };
            img.onerror = () => { console.warn('Obrázok sa nenačítal:', key); ok(); };
            img.src = url;
        })));
    },

    // ----- Konkrétne obrázky -----------------------------------------------------------

    isMounted(u) { const F = FU[u.uk]; return ['c', 'r', 'w', 'x'].includes(u.k) || (F && F.b === 'c'); },
    isArcher(u) { const F = FU[u.uk]; return ['a', 'e'].includes(u.k) || (F && (F.b === 'a' || F.b === 'e')); },

    unitKey(u) {
        if (u.h) return 'hero_' + [G.eq.w, G.eq.a, G.eq.s, G.eq.h, G.eq.m, G.fac, G.king ? 1 : 0, G.ke ?? ''].join('_');
        if (u.cp) { const c = compDef(u.cp); return c.eq ? 'hero_cp_' + u.cp + '_' + G.fac : 'u_' + c.art + '_0_' + G.fac; }
        return 'u_' + (u.uk || u.k) + '_' + (u.t ? 1 : 0) + '_' + (u.t ? u.fc : G.fac) + (u.bn ? '_b' : '');
    },

    /** Vojak: 12 snímok (státie, chôdza, útok, pád). */
    unit(scene, u) {
        const key = Art.unitKey(u), kind = Art.unitArt(u), base = Art.img['unit_' + kind];
        // hrdina sa kreslí podľa výbavy: každá zbraň, brnenie, štít, prilba a kôň vyzerá inak
        if ((u.h || (u.cp && compDef(u.cp).eq)) && !scene.textures.exists(key) && typeof Soldiers !== 'undefined') {
            const sp = Soldiers.heroSpec(u.h ? G.eq : compDef(u.cp).eq);
            Art.register(scene, key, Art.tinted(Soldiers.sheet(sp, 'base'), Soldiers.sheet(sp, 'team'), FC[G.fac]));
            Art.anims(scene, key);
            return key;
        }
        if (!scene.textures.exists(key) && base) {
            const color = u.h || !u.t ? FC[G.fac] : FC[u.fc] || '#888888';
            Art.register(scene, key, Art.tinted(base, Art.img['unit_' + kind + '_team'], color));
            Art.anims(scene, key);
            return key;
        }
        return Art.ensure(scene, key, () => {
            const base = { ...u, x: 0, y: 0, f: 0, c: 0, hp: u.mh || 1, mh: u.mh || 1, px: undefined };
            const r = u.r, mounted = Art.isMounted(u), archer = Art.isArcher(u), strike = u.h ? 15 : 40;
            const legs = p => {
                ctx.fillStyle = 'rgba(30,22,16,.9)';
                if (mounted) for (const [lx, ly, ph] of [[1.15, -.55, 0], [1.15, .55, Math.PI], [-1.1, -.55, Math.PI], [-1.1, .55, 0]]) {
                    ctx.beginPath(); ctx.ellipse(r * lx + Math.sin(p + ph) * r * .35, r * ly, r * .22, r * .16, 0, 0, 7); ctx.fill();
                }
                else for (const [ly, ph] of [[-.42, 0], [.42, Math.PI]]) {
                    ctx.beginPath(); ctx.ellipse(Math.sin(p + ph) * r * .85, r * ly, r * .4, r * .24, 0, 0, 7); ctx.fill();
                }
            };
            const body = (c, extra) => () => { const v = { ...base, c }; extra && extra(); drawU(v); };
            const frames = [body(0, () => legs(0))];
            for (let k = 0; k < 4; k++) frames.push(() => { const p = k * Math.PI / 2; legs(p); ctx.translate(Math.sin(p) * .8, 0); ctx.rotate(Math.sin(p) * .07); drawU({ ...base }); });
            if (archer) {
                frames.push(body(0, () => { legs(0); ctx.translate(-1, 0); }), body(strike, () => legs(0)), body(0, () => { legs(0); ctx.translate(-2.5, 0); }));
            } else {
                frames.push(body(0, () => { legs(0); ctx.translate(-2, 0); ctx.rotate(-.35); }), body(strike, () => legs(.6)), body(0, () => { legs(0); ctx.translate(1.5, 0); ctx.rotate(.12); }));
            }
            for (let k = 0; k < 4; k++) frames.push(() => {
                ctx.fillStyle = 'rgba(110,18,18,.38)';
                ctx.beginPath(); ctx.ellipse(r * .3, 0, r * (1 + k * .35), r * (.7 + k * .22), 0, 0, 7); ctx.fill();
                ctx.save();
                ctx.rotate(.4 * (k + 1)); ctx.scale(1, 1 - .12 * (k + 1)); ctx.globalAlpha = 1 - .07 * k;
                drawU({ ...base });
                ctx.restore();
                ctx.globalCompositeOperation = 'source-atop';
                ctx.fillStyle = 'rgba(0,0,0,' + (.12 * (k + 1)) + ')';
                ctx.fillRect(-60, -60, 120, 120);
                ctx.globalCompositeOperation = 'source-over';
            });
            return frames;
        });
    },

    /** Jazdec so zástavou na mape: 4 snímky viatia zástavy. */
    rider(scene, f, hero) {
        const key = (hero ? 'herorider_' + [f, G.kn || '', G.ke ?? '', G.eq.m].join('_') : 'rider_' + f);
        return Art.ensure(scene, key, () => [0, 1, 2, 3].map(k => () => { tm = k * 14.1; rider(0, 0, 0, f, hero ? '#5a6b55' : '#2c2a26'); }));
    },

    /** Postavička na mape podľa výbavy (hrdina: eq = G.eq; lord: Figures.lordEq(e)). */
    figure(scene, eq, o) {
        const key = Figures.key(eq, o);
        return Art.ensure(scene, key, () => [0, 1, 2, 3].map(k => () => { tm = k * 14.1; Figures.draw(ctx, eq, o, k); }));
    },
    /** Trikrát väčšia postavička (krčma, rozhovory). */
    bigFigure(scene, eq, o) {
        const key = 'bigfig_' + Figures.key(eq, o).slice(7);
        return Art.ensure(scene, key, () => [0, 1, 2, 3, 4].map(k => () => { tm = 0; ctx.scale(3, 3); Figures.draw(ctx, eq, o, k); }));   // 0 = stojí, 1–4 = cyklus chôdze
    },
    heroFigure(scene) {
        const evil = typeof heroSide === 'function' && heroSide() === 1;
        return Art.figure(scene, G.eq, { flag: G.fac, king: !!G.king, cape: evil ? '#2a1414' : '#6a2a2a', ...Figures.lookOpts(Portraits.hero()) });
    },

    castle(scene, f) {
        return Art.ensure(scene, 'castle_' + f, () => [0, 1, 2, 3].map(k => () => { tm = k * 14.1; drawCastle({ n: '', x: 0, y: 0, f, g: 0 }); }));
    },

    village(scene, f, burned) {
        return Art.ensure(scene, 'village_' + f + (burned ? '_b' : ''), () => [() => {
            for (const [dx, dy] of [[-10, 0], [4, -5], [8, 4]]) {
                ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(dx + 1, dy + 3, 6, 2, 0, 0, 7); ctx.fill();
                ctx.fillStyle = burned ? '#2a2420' : VW[f] || '#a08060'; ctx.fillRect(dx - 4, dy - 3, 8, 6);
                ctx.fillStyle = burned ? '#1a1410' : VR[f] || '#7a3a22';
                ctx.beginPath(); ctx.moveTo(dx - 5, dy - 3); ctx.lineTo(dx, dy - 8); ctx.lineTo(dx + 5, dy - 3); ctx.fill();
                if (!burned) { ctx.fillStyle = '#ffd27a'; ctx.fillRect(dx - 1, dy - 1, 2, 2); }
            }
        }]);
    },

    banner(scene, f) { return Art.ensure(scene, 'banner_' + f, () => [() => { tm = 0; bnr(0, 0, f, 20, 26); }]); },
    crown(scene) { return Art.ensure(scene, 'crown', () => [() => crown(0, 0)]); },
    spark(scene) { return Art.ensure(scene, 'spark', () => [() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, 7); ctx.fill(); }]); },

    /** Mapa sveta rozdelená na dlaždice (bezpečné pre limity textúr). */
    worldTiles(scene) {
        const T = 1800, S = WW / MAP.width, out = [];
        for (let ty = 0; ty < MAP.height; ty += T)
            for (let tx = 0; tx < MAP.width; tx += T) {
                const key = 'world_' + tx + '_' + ty;
                if (!scene.textures.exists(key)) {
                    const c = document.createElement('canvas');
                    c.width = Math.min(T, MAP.width - tx); c.height = Math.min(T, MAP.height - ty);
                    c.getContext('2d').drawImage(MAP, tx, ty, c.width, c.height, 0, 0, c.width, c.height);
                    scene.textures.addCanvas(key, c);
                }
                out.push({ key, x: tx * S, y: ty * S, s: S });
            }
        return out;
    },

    /** Pridá obrázok so správnou mierkou a stredom podľa kľúča. */
    image(scene, x, y, key, frame = 0, sprite = false) {
        const [fw, fh, ox, oy] = artSize(key);
        const o = sprite ? scene.add.sprite(x, y, key, frame) : scene.add.image(x, y, key, frame);
        return o.setOrigin(ox / fw, oy / fh).setScale(Art.scale[key] || 1 / RES);
    }
};

/** Prevod farby "#rrggbb" na číslo pre Phaser. */
const hex = s => Phaser.Display.Color.HexStringToColor(s).color;
