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
    rider_: [60, 70, 22, 52], herorider_: [60, 70, 22, 52], figure_: [72, 104, 36, 88], bigfig_: [216, 312, 108, 264],
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
        const o = out.getContext('2d'), tm0 = tm, outl = /^(figure_|bigfig_)/.test(key);   // postavičky: obrys a tieňovanie
        frames.forEach((fn, i) => {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, pw, ph);
            ctx.setTransform(RES, 0, 0, RES, 0, 0);
            ctx.translate(ox, oy);
            try { fn(); } catch (e) { console.warn('Art', key, i, e); }
            ctx.restore();
            if (outl) Art.outline(o, i * pw, pw, ph, /^bigfig_/.test(key) ? 1.4 : .9);
            else o.drawImage(cv, 0, 0, pw, ph, i * pw, 0, pw, ph);
        });
        tm = tm0;
        return out;
    },

    /** Snímka z pomocného plátna s tmavým obrysom (čitateľnosť na mape) a tieňovaním: svetlo zľava hore, tieň vpravo dole. */
    outline(o, x, pw, ph, w) {
        const t = Art._ol || (Art._ol = document.createElement('canvas')), s = Art._ol2 || (Art._ol2 = document.createElement('canvas'));
        t.width = s.width = pw; t.height = s.height = ph;
        const tc = t.getContext('2d'), sc = s.getContext('2d');
        tc.drawImage(cv, 0, 0, pw, ph, 0, 0, pw, ph);
        tc.globalCompositeOperation = 'source-atop';
        const g = tc.createLinearGradient(0, 0, pw, ph); g.addColorStop(0, 'rgba(255,240,210,.16)'); g.addColorStop(.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,5,20,.26)');
        tc.fillStyle = g; tc.fillRect(0, 0, pw, ph); tc.globalCompositeOperation = 'source-over';
        sc.drawImage(t, 0, 0); sc.globalCompositeOperation = 'source-in'; sc.fillStyle = 'rgba(18,10,6,.8)'; sc.fillRect(0, 0, pw, ph); sc.globalCompositeOperation = 'source-over';
        const d = w * RES;
        o.save(); o.beginPath(); o.rect(x, 0, pw, ph); o.clip();   // obrys nesmie pretiecť do susednej snímky
        for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; o.drawImage(s, x + Math.cos(a) * d, Math.sin(a) * d); }
        o.drawImage(t, x, 0); o.restore();
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

    /** Načíta textúry z tools/generate_art.py (terén, hory, vojaci, bojisko). Vráti Promise.
     *  group: 'map' (mapa, hrady, dediny, hory – potrebné hneď), 'battle' (bojisko a vojaci – dočítavajú sa na pozadí po úvode)
     *  alebo nič = všetko. onProgress(hotové, celkom) hlási postup pre načítaciu obrazovku. */
    loadTextures(scene, group, onProgress) {
        const T = (typeof ASSETS !== 'undefined' && ASSETS.textures) || {};
        const isBattle = k => /^(unit_|ground_|tree_|deadtree|rock|water|cobble|wall|tower|keep)/.test(k);
        const keys = Object.keys(T).filter(k => group === 'map' ? !isBattle(k) : group === 'battle' ? isBattle(k) : true);
        let done = 0;
        const one = key => new Promise(ok => {
            if (scene.textures.exists(key) || Art.img[key]) { done++; onProgress && onProgress(done, keys.length); return ok(); }
            const img = new Image();
            const fin = () => { done++; onProgress && onProgress(done, keys.length); ok(); };
            img.onload = () => { if (!scene.textures.exists(key)) scene.textures.addImage(key, img); Art.img[key] = img; fin(); };
            img.onerror = () => { console.warn('Textúra sa nenačítala:', key); fin(); };
            img.src = T[key];
        });
        // po menších dávkach, aby prehliadač medzitým stihol prekresliť priebeh
        const batches = []; for (let i = 0; i < keys.length; i += group === 'battle' ? 2 : 6) batches.push(keys.slice(i, i + (group === 'battle' ? 2 : 6)));
        const p = batches.reduce((acc, b) => acc.then(() => Promise.all(b.map(one))).then(() => new Promise(r => setTimeout(r, group === 'battle' ? 30 : 0))), Promise.resolve());   // medzi dávkami sa pustí k slovu vykresľovanie
        if (group) Art.loading[group] = p.then(() => { Art.loaded[group] = 1; });
        return group ? Art.loading[group] : p;
    },
    loaded: {}, loading: {},
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
        // objem: svetlo zhora zľava a tieň zdola sprava na každej snímke (zbroj prestane byť plochá), jemný odlesk kovu
        const fw = base.height, n = Math.max(1, Math.round(base.width / fw));
        o.globalCompositeOperation = 'source-atop';
        for (let i = 0; i < n; i++) {
            const x0 = i * fw, gr = o.createLinearGradient(x0 + fw * .25, fw * .2, x0 + fw * .8, fw * .85);
            gr.addColorStop(0, 'rgba(255,255,255,.2)'); gr.addColorStop(.45, 'rgba(255,255,255,0)'); gr.addColorStop(.6, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.32)');
            o.fillStyle = gr; o.fillRect(x0, 0, fw, fw);
            const rg = o.createRadialGradient(x0 + fw * .42, fw * .4, 2, x0 + fw * .42, fw * .4, fw * .22);
            rg.addColorStop(0, 'rgba(255,255,255,.14)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
            o.fillStyle = rg; o.fillRect(x0, 0, fw, fw);
        }
        o.globalCompositeOperation = 'source-over';
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
        if (u.cp) { const c = compDef(u.cp); return c.eq ? 'hero_cp_' + u.cp + '_' + G.fac + '_' + (u.mnt || 0) : 'u_' + c.art + '_0_' + G.fac; }
        return 'u_' + (u.uk || u.k) + '_' + (u.t ? 1 : 0) + '_' + (u.t ? u.fc : G.fac) + (u.bn ? '_b' : '');
    },

    /** Vojak: 12 snímok (státie, chôdza, útok, pád). */
    unit(scene, u) {
        const key = Art.unitKey(u), kind = Art.unitArt(u), base = Art.img['unit_' + kind];
        // hrdina sa kreslí podľa výbavy: každá zbraň, brnenie, štít, prilba a kôň vyzerá inak
        if ((u.h || (u.cp && compDef(u.cp).eq)) && !scene.textures.exists(key) && typeof Soldiers !== 'undefined') {
            const sp = Soldiers.heroSpec(u.h ? G.eq : { ...compDef(u.cp).eq, m: u.mnt || compDef(u.cp).eq.m || 0 });
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
        if (!scene.textures.exists(key) && !base && typeof Soldiers !== 'undefined' && Soldiers.UNITS[kind]) {   // druh bez obrázka (ent, ťažké jednotky): nakreslí sa kódom
            const color = u.h || !u.t ? FC[G.fac] : FC[u.fc] || '#888888';
            Art.register(scene, key, Art.tinted(Soldiers.sheet(kind, 'base'), Soldiers.sheet(kind, 'team'), color));
            Art.anims(scene, key);
            return key;
        }
        if (scene.textures.exists(key)) { Art.anims(scene, key); return key; }
        // druh bez obrázka aj bez popisu: nakreslí sa ako pešiak vo farbe frakcie
        const color2 = u.h || !u.t ? FC[G.fac] : FC[u.fc] || '#888888';
        Art.register(scene, key, Art.tinted(Soldiers.sheet('i', 'base'), Soldiers.sheet('i', 'team'), color2));
        Art.anims(scene, key);
        return key;
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
        const evil = heroSide() === 1;
        return Art.figure(scene, G.eq, { flag: G.fac, king: !!G.king, cape: evil ? '#2a1414' : '#6a2a2a', ...Figures.lookOpts(Portraits.hero()) });
    },

    banner(scene, f) { return Art.ensure(scene, 'banner_' + f, () => [() => { tm = 0; bnr(0, 0, f, 20, 26); }]); },
    crown(scene) { return Art.ensure(scene, 'crown', () => [() => crown(0, 0)]); },
    spark(scene) { return Art.ensure(scene, 'spark', () => [() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, 7); ctx.fill(); }]); },

    /** Pridá obrázok so správnou mierkou a stredom podľa kľúča. */
    image(scene, x, y, key, frame = 0, sprite = false) {
        const [fw, fh, ox, oy] = artSize(key);
        const o = sprite ? scene.add.sprite(x, y, key, frame) : scene.add.image(x, y, key, frame);
        return o.setOrigin(ox / fw, oy / fh).setScale(Art.scale[key] || 1 / RES);
    }
};

/** Prevod farby "#rrggbb" na číslo pre Phaser. */
const hex = s => Phaser.Display.Color.HexStringToColor(s).color;
