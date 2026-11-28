/*
 * ENGINE: grafika kreslená kódom do plátna (2D prvky mimo 3D vrstiev): postavy v rozhraní a izometrických miestnostiach (Figures),
 * zástavy a koruny. Obrázky sa kreslia v dvojnásobnom rozlíšení (RES) a registrujú ako textúry Phaseru.
 *
 * Pásy snímok (spritesheety) majú snímky vedľa seba zľava doprava:
 *   postavičky (72×104, veľké 216×312): 0 státie | 1–4 chôdza;  zástavy: 0–3 viatie
 */
const RES = 2;

/** Rozmery snímok podľa predpony kľúča: [šírka, výška, stredX, stredY]. */
const ART_SIZES = {
    figure_: [72, 104, 36, 88], bigfig_: [216, 312, 108, 264],
    banner_: [24, 30, 2, 2], crown: [24, 18, 12, 9]
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

    /** Načíta textúry mapy zo zbalených assets (js/data/assets.js). Vráti Promise; onProgress(hotové, celkom) hlási postup pre načítaciu obrazovku. */
    loadTextures(scene, onProgress) {
        const T = (typeof ASSETS !== 'undefined' && ASSETS.textures) || {}, keys = Object.keys(T);
        let done = 0;
        const one = key => new Promise(ok => {
            const fin = () => { done++; onProgress && onProgress(done, keys.length); ok(); };
            if (scene.textures.exists(key) || Art.img[key]) return fin();
            const img = new Image();
            img.onload = () => { if (!scene.textures.exists(key)) scene.textures.addImage(key, img); Art.img[key] = img; fin(); };
            img.onerror = () => { console.warn('Textúra sa nenačítala:', key); fin(); };
            img.src = T[key];
        });
        // po menších dávkach, aby prehliadač medzitým stihol prekresliť priebeh
        const batches = []; for (let i = 0; i < keys.length; i += 6) batches.push(keys.slice(i, i + 6));
        return batches.reduce((acc, b) => acc.then(() => Promise.all(b.map(one))), Promise.resolve());
    },
    img: {},

    /** Druh (model) vojaka: kľúč do Soldiers.UNITS a do modelov 3D bitky. */
    unitArt(u) {
        if (u.h) return it('w').r ? 'hero_spear' : 'hero';
        if (u.cp) return compDef(u.cp).art || 'hero';
        if (u.uk) return u.uk;
        if (u.k === 'o') return bloc(u.fc) ? 'orc' : 'i';
        if (u.k === 'a') return u.t && bloc(u.fc) ? 'orc_a' : 'a';
        return u.k;
    },

    // ----- Konkrétne obrázky -----------------------------------------------------------


    /** Trikrát väčšia postavička (krčma, rozhovory). */
    bigFigure(scene, eq, o) {
        const key = 'bigfig_' + Figures.key(eq, o).slice(7);
        return Art.ensure(scene, key, () => [0, 1, 2, 3, 4].map(k => () => { tm = 0; ctx.scale(3, 3); Figures.draw(ctx, eq, o, k); }));   // 0 = stojí, 1–4 = cyklus chôdze
    },
    banner(scene, f) { return Art.ensure(scene, 'banner_' + f, () => [() => { tm = 0; bnr(0, 0, f, 20, 26); }]); },
    crown(scene) { return Art.ensure(scene, 'crown', () => [() => crown(0, 0)]); },

    /** Pridá obrázok so správnou mierkou a stredom podľa kľúča. */
    image(scene, x, y, key, frame = 0, sprite = false) {
        const [fw, fh, ox, oy] = artSize(key);
        const o = sprite ? scene.add.sprite(x, y, key, frame) : scene.add.image(x, y, key, frame);
        return o.setOrigin(ox / fw, oy / fh).setScale(Art.scale[key] || 1 / RES);
    }
};

/** Prevod farby "#rrggbb" na číslo pre Phaser. */
const hex = s => Phaser.Display.Color.HexStringToColor(s).color;
