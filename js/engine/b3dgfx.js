/*
 * ENGINE: grafika 3D bitky (pomocník pre js/engine/b3d.js) – všetko kreslené kódom, bez cudzích obrázkov:
 *   – textúry z plátna: šum pre detail terénu (tráva, hlina, skala), erby frakcií na štíty a zástavy (z js/render/heraldry.js),
 *   – materiály: postavy (látka, koža, kov s odleskami), vlniaca sa látka plášťov a zástav, terén s detailom, blatom, spáleninou a mokrom,
 *     stromy hojdajúce sa vo vetre, tráva s kvetmi okolo kamery (ohýba sa pod vojakmi), voda s vlnami, odleskom oblohy a penou,
 *   – obloha s mrakmi, slnkom podľa dennej doby, hviezdami a mesiacom; odraz oblohy pre kovy (PMREM),
 *   – dodatočné spracovanie obrazu: žiara (bloom), lúče slnka, filmové tónovanie (ACES), farebné ladenie podľa kraja, vinetácia.
 * Kvalita (OPT.gfx): low = jednoduché tieňovanie bez dodatočného spracovania, med, high (predvolená), ultra (viac trávy, ostrejšie tiene, lúče).
 */
const B3G = (() => {
    const T = () => window.THREE;
    const U_TIME = { value: 0 }, U_WET = { value: 0 }, U_SUN = { value: null }, U_PUSH = { value: null };
    const Q = () => (typeof OPT !== 'undefined' && OPT.gfx) || 'high';
    const QN = () => ({ low: 0, med: 1, high: 2, ultra: 3 })[Q()] ?? 2;

    // ---------- šum a textúry z plátna ----------
    /** Hladký opakovateľný šum (hodnotový, s oktávami) do poľa n×n. */
    function noise(n, oct, seed) {
        let s = seed; const rnd = () => (s = s * 16807 % 2147483647) / 2147483647, out = new Float32Array(n * n);
        let amp = 1, tot = 0;
        for (let o = 0; o < oct; o++) {
            const g = 4 << o, G = new Float32Array(g * g); for (let i = 0; i < G.length; i++) G[i] = rnd();
            for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
                const fx = x / n * g, fy = y / n * g, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
                const v = (i, j) => G[((j % g) * g) + (i % g)];
                out[y * n + x] += amp * ((v(x0, y0) * (1 - sx) + v(x0 + 1, y0) * sx) * (1 - sy) + (v(x0, y0 + 1) * (1 - sx) + v(x0 + 1, y0 + 1) * sx) * sy);
            }
            tot += amp; amp *= .55;
        }
        for (let i = 0; i < out.length; i++) out[i] /= tot;
        return out;
    }
    let DET = null;
    /** Detailová textúra terénu: R = drobná tráva, G = hrudy hliny, B = žily kameňa, A = veľké škvrny. */
    function detailTex() {
        if (DET) return DET;
        const t = T(), n = 256, a = noise(n, 5, 7), b = noise(n, 4, 31), c = noise(n, 3, 97), d = noise(n, 2, 151), px = new Uint8Array(n * n * 4);
        for (let i = 0; i < n * n; i++) { px[i * 4] = a[i] * 255; px[i * 4 + 1] = b[i] * 255; px[i * 4 + 2] = Math.pow(c[i], 1.6) * 255; px[i * 4 + 3] = d[i] * 255; }
        DET = new t.DataTexture(px, n, n, t.RGBAFormat); DET.wrapS = DET.wrapT = t.RepeatWrapping; DET.magFilter = t.LinearFilter; DET.minFilter = t.LinearMipmapLinearFilter; DET.generateMipmaps = true; DET.anisotropy = 4; DET.needsUpdate = true;
        return DET;
    }
    const EMB = {};
    /** Erb frakcie f (z heraldry.js) na priehľadnom pozadí – na štíty a zástavy. full = s podkladom farby frakcie (zástava). */
    function emblemTex(f, full) {
        const k = f + (full ? 'f' : ''); if (EMB[k]) return EMB[k];
        const t = T(), c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
        try {
            if (full) { x.fillStyle = BF[f] || '#3a3028'; x.fillRect(0, 0, 128, 128); x.strokeStyle = '#d9a441'; x.lineWidth = 6; x.strokeRect(3, 3, 122, 122); }
            if (typeof embBase === 'function' && typeof ctx !== 'undefined') {   // erb sa nakreslí na skryté hlavné plátno a prenesie sa
                ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 128, 128); emb(64, 64, 44, f); ctx.restore();
                x.drawImage(ctx.canvas, 0, 0, 128, 128, 0, 0, 128, 128); ctx.clearRect(0, 0, 128, 128);
            }
        } catch (e) { }
        const tx = new t.CanvasTexture(c); tx.colorSpace = t.SRGBColorSpace; tx.anisotropy = 4;
        return (EMB[k] = tx);
    }
    let SOFT = null;
    /** Mäkký kruh (tieň pod vojakom, kaluže). */
    function softTex() {
        if (SOFT) return SOFT;
        const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 2, 32, 32, 31);
        g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.55, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
        return (SOFT = new (T().CanvasTexture)(c));
    }

    // ---------- materiály ----------
    const MATS = {};
    /** Vlnenie látky (plášte, zástavy): vrcholy s atribútom aCloth sa vlnia podľa času a polohy postavy. */
    function clothPatch(sh) {
        sh.uniforms.uTime = U_TIME;
        sh.vertexShader = 'uniform float uTime;\nattribute float aCloth;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
            if (aCloth > 0.0) { float ph = modelMatrix[3].x * 0.07 + modelMatrix[3].z * 0.05;
                transformed.x -= aCloth * (0.55 + 0.45 * sin(uTime * 3.1 + position.y * 0.45 + ph)) * 1.4;
                transformed.z += aCloth * sin(uTime * 2.3 + position.y * 0.7 + ph * 1.7) * 0.5; }`);
    }
    /** Materiál postáv: m = 'c' látka a koža, 'm' kov (lesk a odraz oblohy). Na nízkej kvalite jednoduché ploché tieňovanie. */
    function chrMat(m) {
        const k = 'chr' + m + QN(); if (MATS[k]) return MATS[k];
        const t = T(), low = QN() === 0;
        const mt = low ? new t.MeshLambertMaterial({ vertexColors: true, flatShading: true })
            : new t.MeshStandardMaterial({ vertexColors: true, roughness: m === 'm' ? .34 : .82, metalness: m === 'm' ? .78 : 0, envMapIntensity: m === 'm' ? 1.1 : .6 });
        mt.onBeforeCompile = clothPatch; mt.customProgramCacheKey = () => 'chr' + m;
        return (MATS[k] = mt);
    }
    /** Látka s obrázkom (zástava s erbom). */
    function bannerMat(f) {
        const k = 'ban' + f; if (MATS[k]) return MATS[k];
        const t = T(), mt = new t.MeshStandardMaterial({ map: emblemTex(f, 1), side: t.DoubleSide, roughness: .9 }); mt.onBeforeCompile = clothPatch; mt.customProgramCacheKey = () => 'ban';
        return (MATS[k] = mt);
    }
    /** Erb na štíte (priehľadný obrázok nad farbou štítu). */
    function emblemMat(f) {
        const k = 'emb' + f; if (MATS[k]) return MATS[k];
        const t = T(); return (MATS[k] = new t.MeshStandardMaterial({ map: emblemTex(f), transparent: true, alphaTest: .35, roughness: .6, polygonOffset: true, polygonOffsetFactor: -2 }));
    }
    /** Stromy a kríky: hojdanie vo vetre (podľa výšky vrcholu) a rozplynutie pri kamere. */
    function foliageMat() {
        const k = 'fol' + QN(); if (MATS[k]) return MATS[k];
        const t = T(), low = QN() === 0, mt = low ? new t.MeshLambertMaterial({ vertexColors: true, flatShading: true }) : new t.MeshStandardMaterial({ vertexColors: true, roughness: .92, flatShading: QN() < 2 });
        mt.onBeforeCompile = sh => {
            sh.uniforms.uTime = U_TIME;
            sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
                #ifdef USE_INSTANCING
                vec4 ip = instanceMatrix[3];
                #else
                vec4 ip = vec4(0.0);
                #endif
                float hh = max(0.0, transformed.y - 8.0) / 40.0, ww = hh * hh;
                transformed.x += (sin(uTime * 1.3 + ip.x * 0.05 + ip.z * 0.03) + 0.4 * sin(uTime * 3.7 + ip.z * 0.2)) * ww * 1.8;
                transformed.z += cos(uTime * 1.1 + ip.x * 0.04) * ww * 1.1;`);
            sh.fragmentShader = sh.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n float dC = length(vViewPosition); if (dC < 45.0) discard; if (dC < 95.0 && mod(floor(gl_FragCoord.x) + floor(gl_FragCoord.y), 2.0) < 1.0) discard;');
        };
        mt.customProgramCacheKey = () => 'fol' + QN();
        return (MATS[k] = mt);
    }
    /** Terén: farby vrcholov × detail (tráva, hlina, kameň na svahoch), rozdupané blato a spálenina (mapa tTr), mokrá zem v daždi. */
    function terrainMat(trTex, biome) {
        const t = T(), low = QN() === 0, mt = low ? new t.MeshLambertMaterial({ vertexColors: true }) : new t.MeshStandardMaterial({ vertexColors: true, roughness: .95, metalness: 0, envMapIntensity: .35 });
        const U = { tDet: { value: detailTex() }, tTr: { value: trTex }, uMud: { value: new t.Color(biome.mud) }, uRock: { value: new t.Color(biome.rock) }, uWet: U_WET, uSize: { value: new t.Vector2(BW, BH) } };
        mt.onBeforeCompile = sh => {
            Object.assign(sh.uniforms, U);
            sh.vertexShader = 'varying vec3 vW; varying vec3 vNw;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vW = (modelMatrix * vec4(transformed, 1.0)).xyz; vNw = normal;');
            sh.fragmentShader = 'uniform sampler2D tDet; uniform sampler2D tTr; uniform vec3 uMud; uniform vec3 uRock; uniform float uWet; uniform vec2 uSize;\nvarying vec3 vW; varying vec3 vNw;\n' + sh.fragmentShader
                .replace('#include <color_fragment>', `#include <color_fragment>
                    vec4 d1 = texture2D(tDet, vW.xz * 0.047), d2 = texture2D(tDet, vW.xz * 0.0113 + 0.37);
                    float nz = d1.r * 0.55 + d2.a * 0.45;
                    diffuseColor.rgb *= 0.72 + 0.56 * nz;
                    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.08, 1.0, 0.82), smoothstep(0.55, 0.8, d2.g));
                    float slope = smoothstep(0.18, 0.42, 1.0 - clamp(normalize(vNw).y, 0.0, 1.0));
                    diffuseColor.rgb = mix(diffuseColor.rgb, uRock * (0.65 + 0.7 * d1.b + 0.2 * d2.r), slope);
                    vec4 tr = texture2D(tTr, vW.xz / uSize);
                    float mud = clamp(tr.r * 1.15, 0.0, 1.0);
                    diffuseColor.rgb = mix(diffuseColor.rgb, uMud * (0.75 + 0.45 * d1.g), mud * 0.9);
                    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.045, 0.04, 0.035) * (0.7 + 0.6 * d1.r), clamp(tr.g, 0.0, 1.0) * 0.85);
                    diffuseColor.rgb *= 1.0 - uWet * (0.12 + 0.12 * mud);`)
                .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
                    roughnessFactor = mix(roughnessFactor, 0.22 + 0.35 * (1.0 - d1.r), uWet * (0.55 + 0.45 * mud));`);
        };
        mt.customProgramCacheKey = () => 'ter' + QN();
        return mt;
    }

    // ---------- tráva okolo kamery ----------
    /** Trs trávy: päť steblových trojuholníkov, atribút aH = výška na steble (0 koreň, 1 špička). */
    function tuftGeo() {
        const t = T(), P = [], H = [];
        for (let i = 0; i < 5; i++) {
            const a = i / 5 * 6.283 + Math.random(), r = .6 + Math.random() * .9, h = 3 + Math.random() * 2.6, lx = Math.cos(a) * r, lz = Math.sin(a) * r, lean = .6 + Math.random() * .8, w = .38;
            const bx = lx + Math.cos(a) * lean * 1.4, bz = lz + Math.sin(a) * lean * 1.4;
            P.push(lx - Math.sin(a) * w, 0, lz + Math.cos(a) * w, lx + Math.sin(a) * w, 0, lz - Math.cos(a) * w, bx, h, bz); H.push(0, 0, 1);
        }
        const g = new t.BufferGeometry(); g.setAttribute('position', new t.Float32BufferAttribute(P, 3)); g.setAttribute('aH', new t.Float32BufferAttribute(H, 1)); return g;
    }
    /** Tráva: tisíce trsov v štvorci okolo kamery, ktorý sa posúva s ňou; výška a hustota z mapy hTex (R výška terénu, G hustota trávy). */
    function grass(hTex, biome, count) {
        const t = T(), S = 420, geo = new t.InstancedBufferGeometry().copy(tuftGeo()), off = new Float32Array(count * 4), col = new Float32Array(count * 4);
        const FL = biome.flowers || [];
        for (let i = 0; i < count; i++) {
            off[i * 4] = Math.random() * S; off[i * 4 + 1] = Math.random() * S; off[i * 4 + 2] = .7 + Math.random() * .7; off[i * 4 + 3] = Math.random() * 6.283;
            const c = new t.Color(biome.grass[Math.floor(Math.random() * biome.grass.length)]).multiplyScalar(.82 + Math.random() * .3), fl = FL.length && Math.random() < .045 ? new t.Color(FL[Math.floor(Math.random() * FL.length)]) : null;
            col[i * 4] = c.r; col[i * 4 + 1] = c.g; col[i * 4 + 2] = c.b; col[i * 4 + 3] = fl ? (Math.round(fl.r * 15) * 256 + Math.round(fl.g * 15) * 16 + Math.round(fl.b * 15) + 1) : 0;
        }
        geo.setAttribute('aOff', new t.InstancedBufferAttribute(off, 4)); geo.setAttribute('aCol', new t.InstancedBufferAttribute(col, 4)); geo.instanceCount = count;
        const mt = new t.ShaderMaterial({
            side: t.DoubleSide, fog: true,
            uniforms: t.UniformsUtils.merge([t.UniformsLib.fog, { hTex: { value: hTex }, uCam: { value: new t.Vector2() }, uS: { value: S }, uSize: { value: new t.Vector2(BW, BH) }, uPush: { value: Array.from({ length: 12 }, () => new t.Vector3(-999, -999, 0)) }, uSunC: { value: new t.Color(1, 1, 1) }, uAmb: { value: new t.Color(.4, .45, .5) }, uTip: { value: new t.Color(biome.tip) } }]),
            vertexShader: `uniform sampler2D hTex; uniform vec2 uCam; uniform float uS; uniform vec2 uSize; uniform vec3 uPush[12]; uniform float uTime;
                attribute vec4 aOff; attribute vec4 aCol; attribute float aH; varying vec3 vC; varying float vH; varying float vFl; varying vec3 vFlC;
                #include <fog_pars_vertex>
                vec4 hs(vec2 p) { vec2 uv = p / uSize * vec2(${'288.0'}, ${'192.0'}); vec2 f = fract(uv); vec2 b = (floor(uv) + 0.5) / vec2(289.0, 193.0); vec2 e = 1.0 / vec2(289.0, 193.0);
                    return mix(mix(texture2D(hTex, b), texture2D(hTex, b + vec2(e.x, 0.0)), f.x), mix(texture2D(hTex, b + vec2(0.0, e.y)), texture2D(hTex, b + e), f.x), f.y); }
                void main() {
                    vec2 p = uCam + mod(aOff.xy - uCam, uS) - uS * 0.5;
                    vec4 H = hs(p);
                    float edge = 1.0 - smoothstep(uS * 0.22, uS * 0.5, length(p - uCam));
                    float sc = aOff.z * H.g * edge * step(0.0, p.x) * step(p.x, uSize.x) * step(0.0, p.y) * step(p.y, uSize.y);
                    float c = cos(aOff.w), s = sin(aOff.w);
                    vec3 lp = vec3(c * position.x - s * position.z, position.y, s * position.x + c * position.z) * sc;
                    float w = sin(uTime * 1.7 + p.x * 0.05 + p.y * 0.07) * 0.6 + sin(uTime * 3.1 + p.x * 0.13 - p.y * 0.05) * 0.25;
                    lp.x += w * aH * 1.3 * sc; lp.z += w * aH * 0.5 * sc;
                    for (int i = 0; i < 12; i++) { vec2 d = p - uPush[i].xy; float L = length(d); float k = (1.0 - smoothstep(0.0, uPush[i].z, L)) * step(0.01, uPush[i].z); lp.xz += (d / max(L, 0.01)) * k * aH * 3.4 * sc; lp.y *= 1.0 - k * 0.65 * aH; }
                    vec3 wp = vec3(p.x, H.r - 0.3, p.y) + lp;
                    vC = aCol.rgb; vH = aH; vFl = aCol.a; vFlC = vec3(floor(aCol.a / 256.0), mod(floor(aCol.a / 16.0), 16.0), mod(aCol.a - 1.0, 16.0)) / 15.0;
                    vec4 mvPosition = viewMatrix * vec4(wp, 1.0); gl_Position = projectionMatrix * mvPosition;
                    #include <fog_vertex>
                }`,
            fragmentShader: `uniform vec3 uSunC; uniform vec3 uAmb; uniform vec3 uTip; varying vec3 vC; varying float vH; varying float vFl; varying vec3 vFlC;
                #include <fog_pars_fragment>
                void main() {
                    vec3 c = mix(vC * 0.45, mix(vC, uTip, 0.35), vH);
                    if (vFl > 0.5 && vH > 0.8) c = vFlC * 0.75;
                    gl_FragColor = vec4(c * (uAmb + uSunC * (0.35 + 0.65 * vH)), 1.0);
                    #include <tonemapping_fragment>
                    #include <colorspace_fragment>
                    #include <fog_fragment>
                }`
        });
        mt.uniforms.uTime = U_TIME;
        const m = new t.Mesh(geo, mt); m.frustumCulled = false; m.renderOrder = 1;
        return m;
    }

    // ---------- voda ----------
    function water(hTex, x0, x1, level, sky) {
        const t = T(), g = new t.PlaneGeometry(x1 - x0, BH, 24, 160); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, level, BH / 2);
        const mt = new t.ShaderMaterial({
            transparent: true, fog: true, depthWrite: false,
            uniforms: t.UniformsUtils.merge([t.UniformsLib.fog, { hTex: { value: hTex }, uSize: { value: new t.Vector2(BW, BH) }, uLevel: { value: level }, uSky: { value: new t.Color(sky.hor) }, uZen: { value: new t.Color(sky.zen) }, uDeep: { value: new t.Color(sky.deep || '#2e5a68') }, uSunDir: { value: new t.Vector3(0, 1, 0) }, uSunC: { value: new t.Color(1, 1, 1) } }]),
            vertexShader: `uniform float uTime; varying vec3 vW;
                #include <fog_pars_vertex>
                void main() { vec3 p = position; p.y += sin(p.z * 0.09 + uTime * 1.6) * 0.25 + sin(p.x * 0.21 + p.z * 0.05 + uTime * 2.2) * 0.15; vW = p;
                    vec4 mvPosition = viewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mvPosition;
                    #include <fog_vertex>
                }`,
            fragmentShader: `uniform sampler2D hTex; uniform vec2 uSize; uniform float uLevel; uniform float uTime; uniform vec3 uSky; uniform vec3 uZen; uniform vec3 uDeep; uniform vec3 uSunDir; uniform vec3 uSunC; varying vec3 vW;
                #include <fog_pars_fragment>
                float hb(vec2 p) { vec2 uv = p / uSize * vec2(288.0, 192.0); vec2 f = fract(uv); vec2 b = (floor(uv) + 0.5) / vec2(289.0, 193.0); vec2 e = 1.0 / vec2(289.0, 193.0);
                    return mix(mix(texture2D(hTex, b).r, texture2D(hTex, b + vec2(e.x, 0.0)).r, f.x), mix(texture2D(hTex, b + vec2(0.0, e.y)).r, texture2D(hTex, b + e).r, f.x), f.y); }
                void main() {
                    float h = hb(vW.xz), depth = uLevel - h;
                    if (depth < -0.3) discard;
                    vec2 q = vW.xz; float t = uTime;
                    vec3 n = normalize(vec3(cos(q.x * 0.21 + q.y * 0.05 + t * 2.2) * 0.04 + cos(q.x * 0.7 - t * 3.0) * 0.02, 1.0, cos(q.y * 0.09 + t * 1.6) * 0.03 + sin(q.y * 0.43 + q.x * 0.3 + t * 2.7) * 0.02));
                    vec3 v = normalize(cameraPosition - vW);
                    float fr = 0.22 + 0.78 * pow(1.0 - max(dot(n, v), 0.0), 3.0);
                    vec3 r = reflect(-v, n);
                    vec3 sky = mix(uSky, uZen, clamp(r.y * 1.4, 0.0, 1.0));
                    float sp = pow(max(dot(r, normalize(uSunDir)), 0.0), 220.0) * 6.0;
                    vec3 c = mix(uDeep, sky, fr) + uSunC * sp;
                    float foam = (1.0 - smoothstep(0.0, 1.6, depth)) * (0.55 + 0.45 * sin(q.y * 0.6 + t * 2.0 + q.x * 0.4));
                    c = mix(c, vec3(0.86, 0.9, 0.92), clamp(foam, 0.0, 1.0) * 0.75);
                    float a = clamp(0.38 + depth * 0.09 + fr * 0.4 + foam * 0.4, 0.0, 0.93) * smoothstep(-0.3, 0.25, depth);
                    gl_FragColor = vec4(c, a);
                    #include <tonemapping_fragment>
                    #include <colorspace_fragment>
                    #include <fog_fragment>
                }`
        });
        mt.uniforms.uTime = U_TIME;
        const m = new t.Mesh(g, mt); m.renderOrder = 4; return m;
    }

    // ---------- obloha ----------
    /** Klenba oblohy: prechod farieb, slnko s žiarou, mraky (fbm), hviezdy a mesiac v noci. Ide s kamerou. */
    function sky(o) {
        const t = T(), g = new t.SphereGeometry(2400, 32, 16);
        const mt = new t.ShaderMaterial({
            side: t.BackSide, depthWrite: false, fog: false,
            uniforms: { uZen: { value: new t.Color(o.zen) }, uHor: { value: new t.Color(o.hor) }, uGnd: { value: new t.Color(o.gnd) }, uSunDir: { value: o.sunDir.clone() }, uSunC: { value: new t.Color(o.sunC) }, uCloud: { value: o.cloud }, uCloudC: { value: new t.Color(o.cloudC) }, uNight: { value: o.night }, uTime: U_TIME },
            vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }',
            fragmentShader: `uniform vec3 uZen; uniform vec3 uHor; uniform vec3 uGnd; uniform vec3 uSunDir; uniform vec3 uSunC; uniform float uCloud; uniform vec3 uCloudC; uniform float uNight; uniform float uTime; varying vec3 vD;
                float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
                float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
                float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * n2(p); p *= 2.03; a *= 0.5; } return s; }
                void main() {
                    vec3 d = normalize(vD); float e = d.y;
                    vec3 c = e > 0.0 ? mix(uHor, uZen, pow(clamp(e, 0.0, 1.0), 0.55)) : mix(uHor, uGnd, clamp(-e * 6.0, 0.0, 1.0));
                    vec3 sd = normalize(uSunDir); float sdot = max(dot(d, sd), 0.0);
                    c += uSunC * (pow(sdot, 900.0) * 18.0 * (1.0 - uNight * 0.85) + pow(sdot, 8.0) * 0.35 + pow(sdot, 64.0) * 0.6);
                    if (uNight > 0.0 && e > 0.0) {   // hviezdy a mesiac
                        vec2 g = floor(d.xz / (d.y + 0.3) * 260.0); float st = step(0.9965, h2(g)) * (0.6 + 0.4 * sin(uTime * 3.0 + h2(g + 7.0) * 30.0));
                        c += vec3(st) * uNight * smoothstep(0.0, 0.25, e);
                        vec3 md = normalize(vec3(-sd.x, abs(sd.y) * 0.6 + 0.35, -sd.z)); float m = max(dot(d, md), 0.0);
                        c += vec3(0.85, 0.9, 1.0) * (smoothstep(0.9993, 0.9996, m) * 1.6 + pow(m, 40.0) * 0.12) * uNight;
                    }
                    if (e > 0.0 && uCloud > 0.0) {   // mraky
                        vec2 p = d.xz / (e + 0.12) * 1.6 + vec2(uTime * 0.012, uTime * 0.004);
                        float cl = smoothstep(1.0 - uCloud, 1.0 - uCloud + 0.35, fbm(p));
                        float lit = 0.75 + 0.35 * pow(sdot, 4.0);
                        c = mix(c, uCloudC * lit, cl * smoothstep(0.0, 0.18, e) * 0.92);
                    }
                    gl_FragColor = vec4(c, 1.0);
                }`
        });
        const m = new t.Mesh(g, mt); m.frustumCulled = false; m.renderOrder = -10; return m;
    }

    // ---------- dodatočné spracovanie obrazu ----------
    const FSQ = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
    /** Skladač: scéna do textúry (HDR, vyhladenie), žiara z jasných miest, lúče slnka, ACES, ladenie farieb, vinetácia → obrazovka. */
    function Composer(R) {
        const t = T(), q = QN(), quad = new t.Mesh(new t.PlaneGeometry(2, 2)), qs = new t.Scene(), qc = new t.OrthographicCamera(-1, 1, 1, -1, 0, 1); qs.add(quad); quad.frustumCulled = false;
        const rtOpt = { type: t.HalfFloatType, depthBuffer: false };
        let main = null, bright = null, blurA = [], blurB = [], w = 0, h = 0;
        const mk = (fs, U) => new t.ShaderMaterial({ vertexShader: FSQ, fragmentShader: fs, uniforms: U, depthTest: false, depthWrite: false });
        const mBright = mk('uniform sampler2D tex; uniform float th; varying vec2 vUv; void main(){ vec3 c = texture2D(tex, vUv).rgb; float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); gl_FragColor = vec4(c * smoothstep(th, th + 0.6, l), 1.0); }', { tex: { value: null }, th: { value: 1.0 } });
        const mBlur = mk('uniform sampler2D tex; uniform vec2 dir; varying vec2 vUv; void main(){ vec3 c = texture2D(tex, vUv).rgb * 0.227; c += (texture2D(tex, vUv + dir * 1.385).rgb + texture2D(tex, vUv - dir * 1.385).rgb) * 0.316; c += (texture2D(tex, vUv + dir * 3.23).rgb + texture2D(tex, vUv - dir * 3.23).rgb) * 0.07; gl_FragColor = vec4(c, 1.0); }', { tex: { value: null }, dir: { value: new t.Vector2() } });
        const mFin = mk(`uniform sampler2D tex; uniform sampler2D b0; uniform sampler2D b1; uniform sampler2D b2; uniform float bloom; uniform float expo; uniform vec3 lift; uniform vec3 gain; uniform float sat; uniform float vig; uniform vec2 sunUv; uniform float rays; uniform float con; varying vec2 vUv;
            vec3 aces(vec3 x) { x *= 0.6; return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
            vec3 toS(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
            void main() {
                vec3 c = texture2D(tex, vUv).rgb;
                vec3 bl = texture2D(b0, vUv).rgb * 0.5 + texture2D(b1, vUv).rgb * 0.8 + texture2D(b2, vUv).rgb * 1.1;
                c += bl * bloom;
                if (rays > 0.0) { vec2 dl = (vUv - sunUv) / 24.0; vec2 p = vUv; float il = 1.0; vec3 r = vec3(0.0); for (int i = 0; i < 24; i++) { p -= dl; r += texture2D(b1, p).rgb * il; il *= 0.93; } c += r * rays * 0.05; }
                c = aces(c * expo);
                c = lift + c * gain;
                float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = mix(vec3(l), c, sat);
                c = (c - 0.5) * con + 0.5;
                vec2 v = vUv - 0.5; c *= 1.0 - dot(v, v) * vig;
                gl_FragColor = vec4(toS(clamp(c, 0.0, 1.0)), 1.0);
            }`, { tex: { value: null }, b0: { value: null }, b1: { value: null }, b2: { value: null }, bloom: { value: .5 }, expo: { value: 1 }, lift: { value: new t.Vector3() }, gain: { value: new t.Vector3(1, 1, 1) }, sat: { value: 1 }, vig: { value: .9 }, sunUv: { value: new t.Vector2(.5, .5) }, rays: { value: 0 }, con: { value: 1 } });
        function size(W2, H2) {
            if (W2 === w && H2 === h) return; w = W2; h = H2;
            [main, bright, ...blurA, ...blurB].forEach(r => r && r.dispose());
            main = new t.WebGLRenderTarget(w, h, { type: t.HalfFloatType, samples: q >= 2 ? 4 : 0 });
            bright = new t.WebGLRenderTarget(w >> 1, h >> 1, rtOpt);
            blurA = [1, 2, 3].map(k => new t.WebGLRenderTarget(Math.max(1, w >> k + 1), Math.max(1, h >> k + 1), rtOpt));
            blurB = [1, 2, 3].map(k => new t.WebGLRenderTarget(Math.max(1, w >> k + 1), Math.max(1, h >> k + 1), rtOpt));
        }
        const pass = (m, target) => { quad.material = m; R.setRenderTarget(target); R.render(qs, qc); };
        return {
            fin: mFin.uniforms,
            render(scene, cam) {
                const s = R.getDrawingBufferSize(new t.Vector2()); size(s.x, s.y);
                R.setRenderTarget(main); R.render(scene, cam);
                mBright.uniforms.tex.value = main.texture; pass(mBright, bright);
                let src = bright.texture;
                for (let i = 0; i < 3; i++) {
                    mBlur.uniforms.tex.value = src; mBlur.uniforms.dir.value.set(1 / blurA[i].width, 0); pass(mBlur, blurA[i]);
                    mBlur.uniforms.tex.value = blurA[i].texture; mBlur.uniforms.dir.value.set(0, 1 / blurA[i].height); pass(mBlur, blurB[i]);
                    src = blurB[i].texture;
                }
                Object.assign(mFin.uniforms, {}); mFin.uniforms.tex.value = main.texture; mFin.uniforms.b0.value = blurB[0].texture; mFin.uniforms.b1.value = blurB[1].texture; mFin.uniforms.b2.value = blurB[2].texture;
                pass(mFin, null);
            },
            dispose() { [main, bright, ...blurA, ...blurB].forEach(r => r && r.dispose()); w = h = 0; }
        };
    }
    /** Odraz oblohy pre kovy a látky (PMREM z klenby oblohy). */
    function envFrom(R, skyMesh) {
        const t = T(), pm = new t.PMREMGenerator(R), sc = new t.Scene(), m = skyMesh.clone(); m.scale.setScalar(.04); sc.add(m);
        const rt = pm.fromScene(sc, 0, .1, 200); pm.dispose(); return rt.texture;
    }
    return { U_TIME, U_WET, Q, QN, noise, detailTex, emblemTex, softTex, chrMat, bannerMat, emblemMat, foliageMat, terrainMat, grass, water, sky, Composer, envFrom };
})();
