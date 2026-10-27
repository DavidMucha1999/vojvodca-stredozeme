/*
 * ENGINE: pečenie textúr.
 * Dočasný most medzi starým kreslením na plátno (js/render) a Phaserom:
 * staré kresliace funkcie nakreslia objekt na skryté plátno `cv` a z výsledku
 * vznikne textúra pre Phaser. Keď budú hotové skutočné obrázky (sprity),
 * stačí nahradiť obsah týchto funkcií načítaním obrázkov – scény sa nemenia.
 */
const Bake = {
    /** Nakreslí fn() do plochy w×h so stredom (ox, oy) a uloží ako textúru `key`. */
    tex(scene, key, w, h, ox, oy, fn) {
        if (scene.textures.exists(key)) scene.textures.remove(key);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const label0 = label;
        label = () => { };                    // popisky kreslí Phaser ako Text
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, W, H);
        ctx.translate(ox, oy);
        try { fn(); } catch (e) { console.warn('Bake', key, e); }
        ctx.restore();
        label = label0;
        c.getContext('2d').drawImage(cv, 0, 0, w, h, 0, 0, w, h);
        scene.textures.addCanvas(key, c);
        return key;
    },

    /** Mapa sveta rozdelená na dlaždice (bezpečné pre limity textúr na mobiloch). */
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

    castle(scene, f) {
        const key = 'castle_' + f;
        if (!scene.textures.exists(key)) Bake.tex(scene, key, 120, 110, 52, 80, () => drawCastle({ n: '', x: 0, y: 0, f, g: 0 }));
        return key;
    },

    village(scene, f, burned) {
        const key = 'village_' + f + (burned ? '_b' : '');
        if (!scene.textures.exists(key)) Bake.tex(scene, key, 44, 30, 22, 20, () => {
            for (const [dx, dy] of [[-10, 0], [4, -5], [8, 4]]) {
                ctx.fillStyle = burned ? '#2a2420' : VW[f] || '#a08060';
                ctx.fillRect(dx - 4, dy - 3, 8, 6);
                ctx.fillStyle = burned ? '#1a1410' : VR[f] || '#7a3a22';
                ctx.beginPath(); ctx.moveTo(dx - 5, dy - 3); ctx.lineTo(dx, dy - 8); ctx.lineTo(dx + 5, dy - 3); ctx.fill();
            }
        });
        return key;
    },

    /** Jazdec so zástavou: velitelia na mape (body tmavé) a hrdina (body zelené). */
    rider(scene, f, hero) {
        const key = (hero ? 'hero_' : 'army_') + f + (hero ? '_' + (G.kn || '') + (G.ke ?? '') + G.eq.m : '');
        if (!scene.textures.exists(key)) Bake.tex(scene, key, 60, 70, 22, 52, () => rider(0, 0, 0, f, hero ? '#5a6b55' : '#2c2a26'));
        return key;
    },

    crown(scene) {
        if (!scene.textures.exists('crown')) Bake.tex(scene, 'crown', 24, 18, 12, 9, () => crown(0, 0));
        return 'crown';
    },

    /** Jednotka v bitke otočená doprava (rotáciu robí Phaser). */
    unit(scene, u) {
        const key = 'u_' + (u.h ? 'hero_' + G.eq.w + '_' + G.eq.s + '_' + G.fac + (G.king ? 'k' : '') : (u.uk || u.k)) + '_' + (u.t ? 1 : 0) + '_' + u.fc + (u.bn ? '_b' : '');
        if (!scene.textures.exists(key)) {
            const f = { ...u, x: 0, y: 0, f: 0, c: 0, hp: u.mh || 1, mh: u.mh || 1 };
            Bake.tex(scene, key, 112, 112, 56, 56, () => drawU(f));
        }
        return key;
    },

    dot(scene, key, r, color) {
        if (!scene.textures.exists(key)) Bake.tex(scene, key, r * 2 + 2, r * 2 + 2, r + 1, r + 1, () => {
            ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
        });
        return key;
    }
};

/** Pomocné prepočty farieb pre Phaser. */
const hex = s => Phaser.Display.Color.HexStringToColor(s).color;
