/*
 * GENERÁTOR: zostaví nové obrázky hry a terén mapy.
 * Spúšťa ho tools/generate_art.py v prehliadači. Vráti zoznam súborov (PNG ako dataURL)
 * a dáta terénu, ktoré skript zapíše do mapy pre editor Tiled.
 */
function buildAll() {
    const out = [];
    const png = (path, cv) => out.push({ path, data: cv.toDataURL('image/png') });
    const draw = (w, h, fn) => { const cv = mkCanvas(w, h), c = cv.getContext('2d'); fn(c); return cv; };

    // --- terén ---
    const towns = TW.map(t => [t.n, t.x / K, t.y / K]);
    const world = buildWorld(towns);
    const sheet = terrainSheet();
    png('textures/terrain.png', sheet);
    png('maps/teren-tiled.png', terrainSheetSmall(sheet));
    for (const kind of ['snow', 'dark']) for (let v = 0; v < 3; v++)
        png(`textures/mtn_${kind}_${v}.png`, draw(560, 360, c => ART.mountain(c, 560, 360, kind, v * 31 + (kind === 'dark' ? 7 : 1))));
    png('textures/mtn_doom_0.png', draw(720, 600, c => ART.mountain(c, 720, 600, 'doom', 3)));

    // --- vojaci: pás 12 snímok + tímová vrstva (biela, hra ju zafarbí farbou frakcie) ---
    for (const key of Object.keys(ART.UNITS)) {
        png(`textures/unit_${key}.png`, ART.unitSheet(key, 'base'));
        png(`textures/unit_${key}_team.png`, ART.unitSheet(key, 'team'));
    }

    // --- mapa: hrady podľa frakcie, dediny, polia, skalky, most ---
    for (const [path, cv] of MAPART.buildAll()) png(path, cv);

    // --- bojisko ---
    for (const b of ['g', 'a', 'd', 's']) png(`textures/ground_${b}.png`, ART.groundTex(b));
    png('textures/water.png', ART.waterTex());
    png('textures/wall.png', ART.stoneTex('#8a8478'));
    png('textures/cobble.png', ART.stoneTex('#6e675c'));
    for (let v = 0; v < 3; v++) png(`textures/tree_${v}.png`, draw(80, 90, c => { c.scale(S, S); ART.tree(c, 20, 40, 1.5, v === 2 ? 1 : 0); }));
    png('textures/deadtree.png', draw(80, 90, c => { c.scale(S, S); ART.tree(c, 20, 40, 1.6, 2); }));
    png('textures/rock.png', ART.rock(60));
    png('textures/tower.png', draw(152, 152, c => { c.scale(S, S); c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(4, 10, 76, 70); c.fillStyle = '#7e786c'; c.fillRect(0, 6, 76, 70); c.fillStyle = '#a49e90'; for (let k = 0; k < 4; k++) c.fillRect(k * 20, 0, 12, 8); c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(56, 6, 20, 70); c.fillStyle = '#2a2420'; c.fillRect(32, 35, 8, 12); }));
    png('textures/keep.png', draw(340, 540, c => { c.scale(S, S); c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(14, 70, 160, 200); c.fillStyle = '#7a7266'; c.fillRect(10, 60, 140, 200); c.fillStyle = '#5a544a'; c.beginPath(); c.moveTo(0, 60); c.lineTo(80, 0); c.lineTo(160, 60); c.fill(); c.fillStyle = '#ffd27a'; [40, 80, 120].forEach(x => c.fillRect(x, 120, 8, 12)); c.fillStyle = 'rgba(0,0,0,.15)'; c.fillRect(110, 60, 40, 200); }));

    return { files: out, world };
}
