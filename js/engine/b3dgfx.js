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
    /** Vzdialený zástup (inštancie): chôdza, beh, úder, jazdec v sedle a kroky koňa sa počítajú v shaderi z reťazí končatín (aCls, kĺby aP1/aP2) a aAnim inštancie. */
    const CROWD_V = `#ifdef USE_INSTANCING
        attribute vec4 aAnim; attribute vec3 aP1; attribute vec3 aP2; attribute float aCls;
        vec3 rotZ(vec3 p, vec3 c, float a) { vec3 d = p - c; float s = sin(a), k = cos(a); return c + vec3(d.x * k - d.y * s, d.x * s + d.y * k, d.z); }
        #endif
        `;
    const CROWD_A = `
        #ifdef USE_INSTANCING
        if (aCls > 0.5) {
            float ch = floor((aCls - 1.0) / 2.0), seg = aCls - 1.0 - ch * 2.0, ph = aAnim.x, amt = aAnim.y, atk = aAnim.z, a1 = 0.0, a2 = 0.0;
            if (ch < 1.5) { if (amt < -0.5) { a1 = 1.15; a2 = -1.45; } else { float p = ph + ch * 3.14159; a1 = sin(p) * 0.62 * amt; a2 = -(max(0.0, cos(p)) * 1.15 * amt + 0.06); } }
            else if (ch < 2.5) { float ak = atk > 0.0 ? sin(atk * 3.14159) : 0.0; a1 = 0.2 - sin(ph) * 0.45 * max(amt, 0.0) + ak * 2.0; a2 = 0.5 + ak * 0.8; }
            else if (ch < 3.5) { a1 = 0.3 + sin(ph) * 0.4 * max(amt, 0.0); a2 = 0.5; }
            else { float off = ch < 4.5 ? 0.0 : ch < 5.5 ? 0.5 : ch < 6.5 ? 0.75 : 0.25; float p = (aAnim.w + off) * 6.2832; bool fr = ch < 5.5;
                a1 = sin(p) * amt * (fr ? 1.0 : 0.85); a2 = fr ? -max(0.0, cos(p)) * (1.1 * amt + 0.05) : max(0.0, cos(p)) * (0.9 * amt + 0.05); }
            if (seg > 0.5) transformed = rotZ(transformed, aP2, a2);
            transformed = rotZ(transformed, aP1, a1);
        }
        #endif
        `;
    function clothPatch(sh) {
        sh.uniforms.uTime = U_TIME;
        sh.vertexShader = 'uniform float uTime;\nattribute float aCloth;\n' + CROWD_V + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>` + CROWD_A + `
            if (aCloth > 0.0) { float ph = modelMatrix[3].x * 0.07 + modelMatrix[3].z * 0.05;
                transformed.x -= aCloth * (0.55 + 0.45 * sin(uTime * 3.1 + position.y * 0.45 + ph)) * 1.4;
                transformed.z += aCloth * sin(uTime * 2.3 + position.y * 0.7 + ph * 1.7) * 0.5; }`);
    }
    /** Postupné materiály postáv: 1 krúžková košeľa, 2 tkanina, 3 koža, 4 doškrabaný plát, 5 hrdzavé orkské železo, 6 elfský ornament; špina a vlhkosť. */
    const U_DIRT = { value: 0 }, U_TINT = { value: null }, U_MUD = { value: null }, U_SNOW = { value: 0 };
    const NOISE3 = `float hh3(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
        float n3(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
            return mix(mix(mix(hh3(i), hh3(i + vec3(1, 0, 0)), f.x), mix(hh3(i + vec3(0, 1, 0)), hh3(i + vec3(1, 1, 0)), f.x), f.y), mix(mix(hh3(i + vec3(0, 0, 1)), hh3(i + vec3(1, 0, 1)), f.x), mix(hh3(i + vec3(0, 1, 1)), hh3(i + vec3(1, 1, 1)), f.x), f.y), f.z); }`;
    function chrPatch(sh, own) {
        clothPatch(sh);
        if (!U_TINT.value) { U_TINT.value = new (T().Color)(1, 1, 1); U_MUD.value = new (T().Color)('#3e3020'); }
        sh.uniforms.uDirt = own ? own.dirt : U_DIRT; sh.uniforms.uTint = own ? own.tint : U_TINT; sh.uniforms.uMud = U_MUD; sh.uniforms.uWet = U_WET; sh.uniforms.uSnow = U_SNOW;
        sh.vertexShader = 'attribute float aMat;\nvarying float vMat;\nvarying vec3 vOP;\nvarying vec3 vON;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vMat = aMat; vOP = position; vON = normal;');
        sh.fragmentShader = 'uniform float uDirt; uniform vec3 uTint; uniform vec3 uMud; uniform float uWet; uniform float uSnow; varying float vMat; varying vec3 vOP; varying vec3 vON;\n' + NOISE3 + '\n' + sh.fragmentShader
            .replace('#include <color_fragment>', `#include <color_fragment>
                float fwd = length(fwidth(vOP)); float dk = 1.0 - smoothstep(0.3, 1.2, fwd);
                int mt = int(vMat + 0.5); float mR = 1.0, mM = 1.0, bh = 0.0; vec3 dc = diffuseColor.rgb;
                if (mt == 1) { vec2 g = vec2((vOP.x + vOP.z) * 2.4, vOP.y * 2.4); g.x += step(0.5, fract(g.y * 0.5)) * 0.5;
                    float rg = 1.0 - smoothstep(0.06, 0.16, abs(length(fract(g) - 0.5) - 0.3)); dc *= mix(1.0, 0.55 + 0.6 * rg, dk); mR = mix(1.0, mix(1.5, 0.75, rg), dk); bh = rg * 0.5 * dk; }
                else if (mt == 2) { float w = sin((vOP.x + vOP.z) * 9.0) * sin(vOP.y * 9.0); dc *= 1.0 + (0.07 * w - 0.05 * n3(vOP * 3.0)) * dk; mR = 1.05; bh = w * 0.15 * dk; }
                else if (mt == 3) { float n = n3(vOP * 1.4) * 0.6 + n3(vOP * 5.0) * 0.4; float stc = step(0.55, fract(vOP.y * 2.6)) * (1.0 - smoothstep(0.0, 0.07, abs(fract((vOP.z + vOP.x) * 0.7) - 0.5))) * dk; dc *= (0.82 + 0.3 * n) * (1.0 - stc * 0.35); mR = 0.75 + 0.35 * n; bh = n * 0.4 - stc * 0.3; }   // koža so švami
                else if (mt == 4) { float sc = smoothstep(0.8, 0.95, n3(vec3((vOP.x + vOP.z) * 0.5, vOP.y * 10.0, vOP.z * 0.3))) * dk; float dn = n3(vOP * 0.9); float eng = (1.0 - smoothstep(0.0, 0.09, abs(sin(vOP.y * 2.2 + sin(vOP.z * 3.1 + vOP.x) * 1.3)))) * dk * step(0.55, n3(vOP * 0.35)); dc *= (0.9 + 0.18 * dn + sc * 0.45) * (1.0 - eng * 0.3); mR = 0.8 + 0.5 * dn - sc * 0.45; bh = sc * 0.3 - eng * 0.5 + dn * 0.2; }   // plát s rytinami
                else if (mt == 5) { float r = smoothstep(0.4, 0.62, n3(vOP * 0.8) * 0.7 + n3(vOP * 3.1) * 0.3); dc = mix(dc * 0.85, vec3(0.3, 0.14, 0.06), r * 0.8); mR = mix(1.1, 2.4, r); mM = 1.0 - r * 0.8; }
                else if (mt == 6) { float f = 1.0 - smoothstep(0.0, 0.2, abs(sin(vOP.y * 3.0 + sin((vOP.x + vOP.z) * 4.0) * 1.6))); dc *= 1.0 + f * 0.5 * dk; mR = 0.6 - f * 0.3; bh = f * 0.5 * dk; }
                else if (mt == 7) { float pl = abs(fract(vOP.z * 0.42 + 0.5) - 0.5), seam = 1.0 - smoothstep(0.0, 0.05, pl); vec2 sg = fract(vec2(vOP.y * 0.32, vOP.z * 0.42 + 0.5)) - 0.5; float nail = 1.0 - smoothstep(0.08, 0.12, length(sg * vec2(1.0, 1.0)));
                    float gr = n3(vec3(vOP.y * 0.4, vOP.z * 6.0, vOP.x)); dc *= (0.82 + 0.3 * gr) * (1.0 - seam * 0.45 * dk); dc = mix(dc, vec3(0.32, 0.32, 0.34), nail * dk); mR = mix(0.9, 0.35, nail); mM = mix(1.0, 4.0, nail * dk); bh = gr * 0.3 - seam * 0.6 + nail * 0.8; }   // štít z dosiek s kovanými klincami
                float dm = clamp(uDirt * ((1.0 - smoothstep(2.0, 15.0, vOP.y)) * 0.85 + 0.22) * (0.5 + 0.8 * n3(vOP * 0.45)), 0.0, 0.85);
                #ifdef USE_MAP
                dm *= 0.45;   // textúrované telo (model): blato len jemne, textúra má vlastné tiene
                #endif
                dc = mix(dc, uMud * (0.8 + 0.4 * n3(vOP * 2.0)), dm); mR = mix(mR, 1.7, dm); mM *= 1.0 - dm * 0.7;
                float rs = uWet > 0.05 ? smoothstep(0.62, 0.95, n3(vec3(vOP.x * 4.0, vOP.y * 0.35, vOP.z * 4.0))) * uWet : 0.0; mR *= 1.0 - rs * 0.55; dc *= 1.0 - rs * 0.18;   // stružky dažďa
                float snw = uSnow > 0.01 ? smoothstep(0.45, 0.85, normalize(vON).y) * uSnow * (0.55 + 0.45 * n3(vOP * 1.6)) : 0.0;
                diffuseColor.rgb = mix(dc * uTint * (1.0 - uWet * 0.12), vec3(0.9, 0.93, 0.97), snw); mR = mix(mR, 1.4, snw); mM *= 1.0 - snw;`)
            .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = clamp(roughnessFactor * mR * (1.0 - uWet * 0.35), 0.05, 1.0);')
            .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n metalnessFactor = clamp(metalnessFactor * mM, 0.0, 1.0);')
            .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
                { vec3 dpx = dFdx(-vViewPosition), dpy = dFdy(-vViewPosition); float hx = dFdx(bh), hy = dFdy(bh); vec3 r1 = cross(dpy, normal), r2 = cross(normal, dpx); float det = dot(dpx, r1);   // reliéf: krúžky, švy, rytiny, dosky
                  if (abs(det) > 1e-8) normal = normalize(abs(det) * normal - sign(det) * (hx * r1 + hy * r2) * 0.9); }`);
    }
    /** Materiál postáv: m = 'c' látka a koža, 'm' kov (lesk a odraz oblohy). own = vlastná špina a odtieň vojaka (inak spoločný materiál pre vzdialené zástupy).
     *  Na nízkej kvalite jednoduché ploché tieňovanie. */
    const TEXC = {};
    function chrMat(m, own, texUrl) {
        const k = 'chr' + m + QN(); if (!own && MATS[k]) return MATS[k];
        if (own && QN() === 0) return chrMat(m);
        const t = T(), low = QN() === 0, tex = m === 't';
        let map = null; if (tex && texUrl) { if (typeof texUrl === 'object') map = texUrl; else { map = TEXC[texUrl] || (TEXC[texUrl] = new t.TextureLoader().load(texUrl)); map.colorSpace = t.SRGBColorSpace; map.flipY = false; } }   // textúra modelu (GLB: UV bez prevrátenia)
        const mt = low ? new t.MeshLambertMaterial({ vertexColors: !tex, flatShading: !tex, map })
            : new t.MeshStandardMaterial({ vertexColors: !tex, map, roughness: m === 'm' ? .34 : tex ? .9 : .82, metalness: m === 'm' ? .78 : 0, envMapIntensity: m === 'm' ? 1.1 : .6 });
        if (low) { mt.onBeforeCompile = clothPatch; mt.customProgramCacheKey = () => 'chr' + m; }
        else { mt.onBeforeCompile = sh => chrPatch(sh, own); mt.customProgramCacheKey = () => 'chrP' + m; mt.extensions = { derivatives: true }; }
        return own ? mt : (MATS[k] = mt);
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
            uniforms: t.UniformsUtils.merge([t.UniformsLib.fog, { hTex: { value: hTex }, uCam: { value: new t.Vector2() }, uS: { value: S }, uSize: { value: new t.Vector2(BW, BH) }, tTr: { value: null }, uPush: { value: Array.from({ length: 12 }, () => new t.Vector3(-999, -999, 0)) }, uSunC: { value: new t.Color(1, 1, 1) }, uAmb: { value: new t.Color(.4, .45, .5) }, uTip: { value: new t.Color(biome.tip) } }]),
            vertexShader: `uniform sampler2D hTex; uniform sampler2D tTr; uniform vec2 uCam; uniform float uS; uniform vec2 uSize; uniform vec3 uPush[12]; uniform float uTime;
                attribute vec4 aOff; attribute vec4 aCol; attribute float aH; varying vec3 vC; varying float vH; varying float vFl; varying vec3 vFlC; varying float vTr;
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
                    vec4 trm = texture2D(tTr, p / uSize); float flt = clamp(trm.r * 1.4 + trm.g * 1.6, 0.0, 1.0); lp.y *= 1.0 - flt * 0.78; lp.xz *= 1.0 + flt * 0.7; vTr = flt;   // pošliapaná a spálená tráva ostane ležať
                    vec3 wp = vec3(p.x, H.r - 0.3, p.y) + lp;
                    vC = aCol.rgb; vH = aH; vFl = aCol.a; vFlC = vec3(floor(aCol.a / 256.0), mod(floor(aCol.a / 16.0), 16.0), mod(aCol.a - 1.0, 16.0)) / 15.0;
                    vec4 mvPosition = viewMatrix * vec4(wp, 1.0); gl_Position = projectionMatrix * mvPosition;
                    #include <fog_vertex>
                }`,
            fragmentShader: `uniform vec3 uSunC; uniform vec3 uAmb; uniform vec3 uTip; varying vec3 vC; varying float vH; varying float vFl; varying vec3 vFlC; varying float vTr;
                #include <fog_pars_fragment>
                void main() {
                    vec3 c = mix(vC * 0.45, mix(vC, uTip, 0.35), vH);
                    if (vFl > 0.5 && vH > 0.8 && vTr < 0.3) c = vFlC * 0.75;
                    c = mix(c, c * vec3(0.72, 0.62, 0.42), vTr * 0.7);
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

    // ---------- kameň hradieb ----------
    /** Murivo: kvádre s maltou podľa svetovej polohy (striedané rady), každý kameň iný odtieň, mach a vlhko pri zemi. Farebné diely (strechy, drevo) ostávajú hladké. */
    function stoneMat() {
        const k = 'stone' + QN(); if (MATS[k]) return MATS[k];
        const t = T(), mt = new t.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .9, metalness: 0, envMapIntensity: .4 });
        mt.onBeforeCompile = sh => {
            sh.uniforms.uWet = U_WET;
            sh.vertexShader = 'varying vec3 vWP; varying vec3 vWN;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);');
            sh.fragmentShader = 'uniform float uWet; varying vec3 vWP; varying vec3 vWN;\n' + NOISE3 + '\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
                vec3 c0 = diffuseColor.rgb; float sat = max(max(c0.r, c0.g), c0.b) - min(min(c0.r, c0.g), c0.b);
                if (sat < 0.1) {
                    vec3 an = abs(vWN); vec2 uv = an.x > an.z && an.x > an.y ? vWP.zy : (an.z > an.y ? vWP.xy : vWP.xz);
                    uv /= vec2(8.0, 4.2); float row = floor(uv.y); uv.x += mod(row, 2.0) * 0.5; vec2 id = floor(uv), f = fract(uv);
                    float mortar = smoothstep(0.0, 0.05, f.x) * smoothstep(1.0, 0.95, f.x) * smoothstep(0.0, 0.1, f.y) * smoothstep(1.0, 0.9, f.y);
                    float h = hh3(vec3(id, 3.0)); vec3 st = c0 * (0.82 + 0.34 * h) * (0.88 + 0.24 * n3(vWP * 0.35));
                    vec3 c = mix(c0 * 0.5, st, mortar);
                    float low = (1.0 - smoothstep(0.0, 9.0, vWP.y)) * n3(vWP * 0.2); c = mix(c, vec3(0.2, 0.26, 0.12), low * 0.45);
                    diffuseColor.rgb = c * (1.0 - uWet * 0.15);
                }`);
        };
        mt.customProgramCacheKey = () => 'stone';
        return (MATS[k] = mt);
    }
    /** Kaluž: odraz oblohy a krúžky od kvapiek; v suchu je neviditeľná (priehľadnosť podľa vlhkosti U_WET). */
    function puddleMat(sky) {
        const t = T();
        return new t.ShaderMaterial({
            transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
            uniforms: { uTime: U_TIME, uWet: U_WET, uSky: { value: new t.Color(sky.hor) }, uZen: { value: new t.Color(sky.zen) } },
            vertexShader: 'varying vec3 vW; varying vec2 vUv; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
            fragmentShader: `uniform float uTime; uniform float uWet; uniform vec3 uSky; uniform vec3 uZen; varying vec3 vW; varying vec2 vUv;
                void main() {
                    float e = length(vUv - 0.5) * 2.0; if (e > 1.0) discard;
                    vec2 rp = vW.xz * 0.45; vec2 ci = floor(rp); float r = 0.0;
                    for (int k = 0; k < 4; k++) { vec2 cc = ci + vec2(mod(float(k), 2.0), floor(float(k) / 2.0)); float h = fract(sin(dot(cc, vec2(12.9898, 78.233))) * 43758.5453); float tt = fract(uTime * 1.1 + h); vec2 cp = cc + vec2(fract(h * 13.7), fract(h * 7.3)); r += (1.0 - tt) * smoothstep(0.07, 0.0, abs(length(rp - cp) - tt * 0.6)); }
                    vec3 v = normalize(cameraPosition - vW); float fr = 0.3 + 0.7 * pow(1.0 - v.y, 3.0);
                    vec3 c = mix(uSky, uZen, 0.35) * (0.75 + fr * 0.35) + r * 0.25;
                    gl_FragColor = vec4(c, uWet * 0.55 * smoothstep(1.0, 0.75, e));
                    #include <tonemapping_fragment>
                    #include <colorspace_fragment>
                }`
        });
    }

    // ---------- voda ----------
    function water(hTex, x0, x1, level, sky) {
        const t = T(), g = new t.PlaneGeometry(x1 - x0, BH, 24, 160); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, level, BH / 2);
        const mt = new t.ShaderMaterial({
            transparent: true, fog: true, depthWrite: false,
            uniforms: t.UniformsUtils.merge([t.UniformsLib.fog, { hTex: { value: hTex }, uSize: { value: new t.Vector2(BW, BH) }, uLevel: { value: level }, uSky: { value: new t.Color(sky.hor) }, uZen: { value: new t.Color(sky.zen) }, uDeep: { value: new t.Color(sky.deep || '#2e5a68') }, uSunDir: { value: new t.Vector3(0, 1, 0) }, uSunC: { value: new t.Color(1, 1, 1) }, uRefl: { value: null }, uTM: { value: new t.Matrix4() }, uUseR: { value: 0 }, uFoam: { value: Array.from({ length: 8 }, () => new t.Vector3(-999, -999, 0)) } }]),
            vertexShader: `uniform float uTime; varying vec3 vW;
                #include <fog_pars_vertex>
                void main() { vec3 p = position; p.y += sin(p.z * 0.09 + uTime * 1.6) * 0.25 + sin(p.x * 0.21 + p.z * 0.05 + uTime * 2.2) * 0.15; vW = p;
                    vec4 mvPosition = viewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mvPosition;
                    #include <fog_vertex>
                }`,
            fragmentShader: `uniform sampler2D hTex; uniform vec2 uSize; uniform float uLevel; uniform float uTime; uniform vec3 uSky; uniform vec3 uZen; uniform vec3 uDeep; uniform vec3 uSunDir; uniform vec3 uSunC; uniform float uRain; uniform sampler2D uRefl; uniform mat4 uTM; uniform float uUseR; uniform vec3 uFoam[8]; varying vec3 vW;
                float ripple(vec2 p, float t) { vec2 rp = p * 0.3; vec2 ci = floor(rp); float r = 0.0;
                    for (int k = 0; k < 4; k++) { vec2 cc = ci + vec2(mod(float(k), 2.0), floor(float(k) / 2.0)); float h = fract(sin(dot(cc, vec2(12.9898, 78.233))) * 43758.5453);
                        float tt = fract(t * 0.9 + h); vec2 cp = cc + vec2(fract(h * 13.7), fract(h * 7.3)); float d = length(rp - cp); r += (1.0 - tt) * smoothstep(0.07, 0.0, abs(d - tt * 0.7)); }
                    return r; }
                #include <fog_pars_fragment>
                float hb(vec2 p) { vec2 uv = p / uSize * vec2(288.0, 192.0); vec2 f = fract(uv); vec2 b = (floor(uv) + 0.5) / vec2(289.0, 193.0); vec2 e = 1.0 / vec2(289.0, 193.0);
                    return mix(mix(texture2D(hTex, b).r, texture2D(hTex, b + vec2(e.x, 0.0)).r, f.x), mix(texture2D(hTex, b + vec2(0.0, e.y)).r, texture2D(hTex, b + e).r, f.x), f.y); }
                void main() {
                    float h = hb(vW.xz), depth = uLevel - h;
                    if (depth < -0.3) discard;
                    vec2 q = vW.xz; float t = uTime;
                    float rip = uRain > 0.01 ? ripple(q, t) * uRain : 0.0;   // krúžky od kvapiek dažďa
                    q.y -= t * 3.2;   // prúd vody
                    vec3 n = normalize(vec3(cos(q.x * 0.21 + q.y * 0.05 + t * 2.2) * 0.04 + cos(q.x * 0.7 - t * 3.0) * 0.02 + rip * 0.12, 1.0, cos(q.y * 0.09 + t * 1.6) * 0.03 + sin(q.y * 0.43 + q.x * 0.3 + t * 2.7) * 0.02 + rip * 0.1));
                    vec3 v = normalize(cameraPosition - vW);
                    float fr = 0.22 + 0.78 * pow(1.0 - max(dot(n, v), 0.0), 3.0);
                    vec3 r = reflect(-v, n);
                    vec3 sky = mix(uSky, uZen, clamp(r.y * 1.4, 0.0, 1.0));
                    if (uUseR > 0.0) { vec4 rp = uTM * vec4(vW, 1.0); vec2 ruv = rp.xy / rp.w + n.xz * 0.35; sky = mix(sky, texture2D(uRefl, ruv).rgb, uUseR); }   // odraz brehu, vojakov a oblohy
                    float sp = pow(max(dot(r, normalize(uSunDir)), 0.0), 220.0) * 6.0;
                    vec3 c = mix(uDeep, sky, fr) + uSunC * sp + vec3(rip * 0.12);
                    float foam = (1.0 - smoothstep(0.0, 1.6, depth)) * (0.55 + 0.45 * sin(q.y * 0.6 + t * 2.0 + q.x * 0.4));
                    for (int i = 0; i < 8; i++) { vec3 F = uFoam[i]; if (F.z > 0.0) { vec2 dd = vW.xz - F.xy; dd.y *= 0.6; float L = length(dd); foam += (1.0 - smoothstep(F.z * 0.5, F.z * 1.7, L)) * (0.55 + 0.45 * sin(L * 1.6 - t * 7.0)) * 0.8; } }   // pena a vlny okolo nôh a koní
                    c = mix(c, vec3(0.86, 0.9, 0.92), clamp(foam, 0.0, 1.0) * 0.75);
                    float a = clamp(0.38 + depth * 0.09 + fr * 0.4 + foam * 0.4, 0.0, 0.93) * smoothstep(-0.3, 0.25, depth);
                    gl_FragColor = vec4(c, a);
                    #include <tonemapping_fragment>
                    #include <colorspace_fragment>
                    #include <fog_fragment>
                }`
        });
        mt.uniforms.uTime = U_TIME; mt.uniforms.uRain = U_WET;
        const m = new t.Mesh(g, mt); m.renderOrder = 4; return m;
    }

    // ---------- obloha ----------
    /** Klenba oblohy: prechod farieb, slnko s žiarou, mraky (fbm), hviezdy a mesiac v noci. Ide s kamerou. */
    function sky(o) {
        const t = T(), g = new t.SphereGeometry(2400, 32, 16);
        const mt = new t.ShaderMaterial({
            side: t.BackSide, depthWrite: false, fog: false,
            uniforms: { uZen: { value: new t.Color(o.zen) }, uHor: { value: new t.Color(o.hor) }, uGnd: { value: new t.Color(o.gnd) }, uSunDir: { value: o.sunDir.clone() }, uSunC: { value: new t.Color(o.sunC) }, uCloud: { value: o.cloud }, uCloudC: { value: new t.Color(o.cloudC) }, uNight: { value: o.night }, uTime: U_TIME, uVol: { value: o.vol ? 1 : 0 } },
            vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }',
            fragmentShader: `uniform vec3 uZen; uniform vec3 uHor; uniform vec3 uGnd; uniform vec3 uSunDir; uniform vec3 uSunC; uniform float uCloud; uniform vec3 uCloudC; uniform float uNight; uniform float uTime; uniform float uVol; varying vec3 vD;
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
                    if (e > 0.0 && uCloud > 0.0 && uVol > 0.5) {   // objemové mraky: pochod lúča vrstvou mrakov, tieň vnútri mraku, presvetlenie od slnka
                        float t0 = 1.0 / max(e, 0.05), t1 = 1.75 / max(e, 0.05), st = (t1 - t0) / 10.0, Tr = 1.0; vec3 acc = vec3(0.0);
                        for (int i = 0; i < 10; i++) { vec3 p = d * (t0 + st * (float(i) + 0.5)); float hg = clamp((p.y - 1.0) / 0.75, 0.0, 1.0); vec2 uv = p.xz * 1.2 + vec2(uTime * 0.012, uTime * 0.004);
                            float den = clamp((fbm(uv) * (1.0 - abs(hg * 2.0 - 1.0) * 0.8) - (1.0 - uCloud) * 0.85) * 2.6, 0.0, 1.0);
                            if (den > 0.01) { float sh = fbm(uv + sd.xz * 0.22); float lit = mix(1.05, 0.42, clamp(sh * 1.5 - 0.25, 0.0, 1.0)) * (0.72 + 0.5 * pow(sdot, 5.0)) + hg * 0.22; float a = clamp(den * st * 2.4, 0.0, 1.0); acc += Tr * a * uCloudC * lit; Tr *= 1.0 - a; if (Tr < 0.03) break; } }
                        float fe = smoothstep(0.0, 0.16, e); c = mix(c, c * Tr + acc, fe);
                    } else if (e > 0.0 && uCloud > 0.0) {   // mraky
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
    /** Skladač: scéna do textúry (HDR, vyhladenie, hĺbka) → zatienenie v kútoch (SSAO) → prízemná hmla so svetlom slnka, rozmazanie pohybu,
     *  hĺbka ostrosti → žiara z jasných miest, lúče slnka, prispôsobenie oka jasu, ACES, ladenie farieb, vinetácia, filmové zrno → obrazovka. */
    function Composer(R) {
        const t = T(), q = QN(), quad = new t.Mesh(new t.PlaneGeometry(2, 2)), qs = new t.Scene(), qc = new t.OrthographicCamera(-1, 1, 1, -1, 0, 1); qs.add(quad); quad.frustumCulled = false;
        const rtOpt = { type: t.HalfFloatType, depthBuffer: false };
        let taaA = null, taaB = null, taaN = 0, main = null, comb = null, aoA = null, aoB = null, bright = null, blurA = [], blurB = [], lumNow = null, adA = null, adB = null, base = null, w = 0, h = 0, fN = 0;
        const mk = (fs, U) => new t.ShaderMaterial({ vertexShader: FSQ, fragmentShader: fs, uniforms: U, depthTest: false, depthWrite: false });
        const VPOS = 'vec3 vpos(vec2 uv, float d) { vec4 p = uIP * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); return p.xyz / p.w; }';
        const K = []; for (let i = 0; i < 12; i++) { const v = new t.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * .9 + .1).normalize(); const k = i / 12; v.multiplyScalar(.12 + .88 * k * k); K.push(v); }
        const mAO = mk(`uniform sampler2D tDepth; uniform mat4 uP; uniform mat4 uIP; uniform vec2 uRes; uniform vec3 uK[12]; uniform float uR; varying vec2 vUv;
            ${VPOS}
            void main() {
                float d = texture2D(tDepth, vUv).x; if (d >= 0.9999) { gl_FragColor = vec4(1.0); return; }
                vec3 P = vpos(vUv, d); vec2 px = 1.0 / uRes;
                vec3 N = normalize(cross(vpos(vUv + vec2(px.x, 0.0), texture2D(tDepth, vUv + vec2(px.x, 0.0)).x) - P, vpos(vUv + vec2(0.0, px.y), texture2D(tDepth, vUv + vec2(0.0, px.y)).x) - P));
                float a = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) * 6.2832; vec3 rv = vec3(cos(a), sin(a), 0.0);
                vec3 T1 = normalize(rv - N * dot(rv, N)); vec3 B1 = cross(N, T1); mat3 TBN = mat3(T1, B1, N);
                float occ = 0.0, R = uR * clamp(-P.z / 120.0, 0.6, 3.0);
                for (int i = 0; i < 12; i++) {
                    vec3 sp = P + TBN * uK[i] * R; vec4 o = uP * vec4(sp, 1.0); vec2 suv = o.xy / o.w * 0.5 + 0.5;
                    if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) continue;
                    float sz = vpos(suv, texture2D(tDepth, suv).x).z;
                    occ += step(sp.z + 0.35, sz) * smoothstep(0.0, 1.0, R / abs(P.z - sz));
                }
                gl_FragColor = vec4(vec3(1.0 - occ / 12.0), 1.0);
            }`, { tDepth: { value: null }, uP: { value: new t.Matrix4() }, uIP: { value: new t.Matrix4() }, uRes: { value: new t.Vector2() }, uK: { value: K }, uR: { value: 5 } });
        const mBlurAO = mk('uniform sampler2D tex; uniform vec2 dir; varying vec2 vUv; void main(){ float c = texture2D(tex, vUv).r * 0.38; c += (texture2D(tex, vUv + dir).r + texture2D(tex, vUv - dir).r) * 0.22; c += (texture2D(tex, vUv + dir * 2.0).r + texture2D(tex, vUv - dir * 2.0).r) * 0.09; gl_FragColor = vec4(vec3(c), 1.0); }', { tex: { value: null }, dir: { value: new t.Vector2() } });
        const mComb = mk(`uniform sampler2D tex; uniform sampler2D tDepth; uniform sampler2D tAO; uniform mat4 uIP; uniform mat4 uCW; uniform mat4 uPVP; uniform vec3 uCam; uniform vec2 uRes;
            uniform float uAO; uniform float uFogA; uniform float uFogB; uniform vec3 uFogC; uniform vec3 uSunDir; uniform vec3 uSunC; uniform float uMB; uniform float uDof; uniform float uFocus; varying vec2 vUv;
            uniform float uCS; uniform vec2 uCO; uniform float uSSR; uniform mat4 uP; uniform vec4 uHz[4]; uniform float uTime;
            ${VPOS}
            float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
            float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
            void main() {
                vec2 uv = vUv;
                for (int i = 0; i < 4; i++) { vec4 hz = uHz[i]; if (hz.w > 0.0) { vec2 dd = (vUv - hz.xy) * vec2(uRes.x / uRes.y, 1.0); float r = length(dd); if (r < hz.z && vUv.y > hz.y - hz.z * 0.2) { float k = (1.0 - r / hz.z) * hz.w; uv += vec2(sin(vUv.y * 160.0 + uTime * 9.0), cos(vUv.x * 130.0 + uTime * 7.0)) * 0.0025 * k; } } }   // horúci vzduch nad ohňom
                float d = texture2D(tDepth, vUv).x; bool sky = d >= 0.9999;
                vec3 V = vpos(vUv, min(d, 0.99999)); vec3 W = (uCW * vec4(V, 1.0)).xyz; float dist = length(V);
                vec3 rd = normalize(W - uCam); if (sky) { W = uCam + rd * 2400.0; dist = 2400.0; }
                vec3 c = texture2D(tex, uv).rgb;
                if (uSSR > 0.0 && !sky && dist < 500.0) {   // odraz na mokrej zemi (v obraze)
                    vec2 px = 1.0 / uRes; vec3 N = normalize(cross(vpos(vUv + vec2(px.x, 0.0), texture2D(tDepth, vUv + vec2(px.x, 0.0)).x) - V, vpos(vUv + vec2(0.0, px.y), texture2D(tDepth, vUv + vec2(0.0, px.y)).x) - V));
                    vec3 Nw = normalize(mat3(uCW) * N);
                    if (Nw.y > 0.9) {
                        vec3 R = reflect(normalize(V), N); vec3 P = V; float st = 3.0; vec3 hit = vec3(0.0); float found = 0.0;
                        for (int i = 0; i < 20; i++) { P += R * st; st *= 1.18; vec4 o = uP * vec4(P, 1.0); vec2 suv = o.xy / o.w * 0.5 + 0.5; if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) break;
                            float sd = texture2D(tDepth, suv).x; float sz = vpos(suv, sd).z; if (sz > P.z && sz - P.z < st * 2.5) { hit = texture2D(tex, suv).rgb; found = 1.0 - smoothstep(0.75, 1.0, max(abs(suv.x - 0.5), abs(suv.y - 0.5)) * 2.0); break; } }
                        float fr = 0.2 + 0.8 * pow(1.0 - max(dot(-normalize(V), N), 0.0), 4.0);
                        c = mix(c, hit, found * fr * uSSR * (0.6 + 0.4 * n2(W.xz * 0.05)));
                    }
                }
                if (uCS > 0.0 && !sky) { float cs = smoothstep(0.42, 0.78, n2(W.xz * 0.0018 + uCO) * 0.65 + n2(W.xz * 0.0051 + uCO * 1.7) * 0.35); c *= 1.0 - cs * uCS; }   // tiene mrakov
                if (uMB > 0.0) {   // rozmazanie pohybu kamery
                    vec4 pp = uPVP * vec4(W, 1.0); vec2 vel = (vUv - (pp.xy / pp.w * 0.5 + 0.5)) * uMB; float L = length(vel); if (L > 0.035) vel *= 0.035 / L;
                    if (L > 0.0005) { vec3 acc = c; for (int i = 1; i < 8; i++) acc += texture2D(tex, vUv - vel * (float(i) / 7.0)).rgb; c = acc / 8.0; }
                }
                if (uDof > 0.0) {   // hĺbka ostrosti: ostrý cieľ, rozmazané popredie a pozadie
                    float fc = uFocus > 0.0 ? uFocus : length(vpos(vec2(0.5), min(texture2D(tDepth, vec2(0.5)).x, 0.99999)));   // záporné = zaostrenie na stred obrazu
                    float coc = clamp(abs(dist - fc) / max(fc, 20.0) * 0.8, 0.0, 1.0) * uDof;
                    if (coc > 0.04) { vec3 acc = c; for (int i = 0; i < 16; i++) { float a = float(i) * 2.39996; float r = sqrt(float(i) + 0.5) / 4.0; acc += texture2D(tex, vUv + vec2(cos(a), sin(a)) * r * coc * 9.0 / uRes).rgb; } c = acc / 17.0; }
                }
                if (uAO > 0.0 && !sky) c *= mix(1.0, texture2D(tAO, vUv).r, uAO * (1.0 - smoothstep(350.0, 800.0, dist)));
                if (uFogA > 0.0) {   // prízemná hmla, ktorú presvetľuje slnko
                    float k = rd.y * uFogB, e = uFogA * exp(-max(uCam.y, 0.0) * uFogB);
                    float fam = abs(k) < 1e-4 ? e * dist : e * (1.0 - exp(-dist * k)) / k;
                    if (!sky) fam *= 0.55 + 0.9 * n2(W.xz * 0.006 + uCO * 2.5) * (0.6 + 0.4 * n2(W.xz * 0.02 - uCO * 4.0));   // hmla v chuchvalcoch, ktoré sa pohybujú
                    vec3 fc = uFogC + uSunC * pow(max(dot(rd, uSunDir), 0.0), 6.0) * 0.7;
                    c = mix(c, fc, clamp(1.0 - exp(-fam), 0.0, sky ? 0.45 : 0.92));
                }
                gl_FragColor = vec4(c, 1.0);
            }`, { tex: { value: null }, tDepth: { value: null }, tAO: { value: null }, uIP: { value: new t.Matrix4() }, uCW: { value: new t.Matrix4() }, uPVP: { value: new t.Matrix4() }, uCam: { value: new t.Vector3() }, uRes: { value: new t.Vector2() },
                uAO: { value: 0 }, uFogA: { value: 0 }, uFogB: { value: .03 }, uFogC: { value: new t.Color() }, uSunDir: { value: new t.Vector3(0, 1, 0) }, uSunC: { value: new t.Color() }, uMB: { value: 0 }, uDof: { value: 0 }, uFocus: { value: 100 }, uCS: { value: 0 }, uCO: { value: new t.Vector2() }, uSSR: { value: 0 }, uP: { value: new t.Matrix4() }, uHz: { value: [0, 1, 2, 3].map(() => new t.Vector4()) }, uTime: U_TIME });
        // časové vyhladenie (TAA): obraz sa každú snímku posunie o zlomok pixelu a skladá s predošlými (prepočítanými podľa pohybu kamery), farba strážená okolím
        const mTAA = mk(`uniform sampler2D tCur; uniform sampler2D tHist; uniform sampler2D tDepth; uniform mat4 uIP; uniform mat4 uCW; uniform mat4 uPVP; uniform vec3 uCam; uniform vec2 uRes; uniform float uFirst; varying vec2 vUv;
            ${VPOS}
            void main() {
                vec3 c = texture2D(tCur, vUv).rgb; float d = texture2D(tDepth, vUv).x; vec3 W = (uCW * vec4(vpos(vUv, min(d, 0.99999)), 1.0)).xyz; if (d >= 0.9999) W = uCam + normalize(W - uCam) * 2400.0;
                vec4 pp = uPVP * vec4(W, 1.0); vec2 puv = pp.xy / pp.w * 0.5 + 0.5;
                vec3 mn = c, mx = c; vec2 px = 1.0 / uRes;
                for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) { vec3 q = texture2D(tCur, vUv + vec2(float(i), float(j)) * px).rgb; mn = min(mn, q); mx = max(mx, q); }
                vec3 h = clamp(texture2D(tHist, puv).rgb, mn, mx);
                float w = uFirst > 0.5 || puv.x < 0.0 || puv.x > 1.0 || puv.y < 0.0 || puv.y > 1.0 ? 1.0 : 0.14;
                gl_FragColor = vec4(mix(h, c, w), 1.0);
            }`, { tCur: { value: null }, tHist: { value: null }, tDepth: { value: null }, uIP: { value: new t.Matrix4() }, uCW: { value: new t.Matrix4() }, uPVP: { value: new t.Matrix4() }, uCam: { value: new t.Vector3() }, uRes: { value: new t.Vector2() }, uFirst: { value: 1 } });
        const mBright = mk('uniform sampler2D tex; uniform float th; varying vec2 vUv; void main(){ vec3 c = texture2D(tex, vUv).rgb; float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); gl_FragColor = vec4(c * smoothstep(th, th + 0.6, l), 1.0); }', { tex: { value: null }, th: { value: 1.0 } });
        const mBlur = mk('uniform sampler2D tex; uniform vec2 dir; varying vec2 vUv; void main(){ vec3 c = texture2D(tex, vUv).rgb * 0.227; c += (texture2D(tex, vUv + dir * 1.385).rgb + texture2D(tex, vUv - dir * 1.385).rgb) * 0.316; c += (texture2D(tex, vUv + dir * 3.23).rgb + texture2D(tex, vUv - dir * 3.23).rgb) * 0.07; gl_FragColor = vec4(c, 1.0); }', { tex: { value: null }, dir: { value: new t.Vector2() } });
        // prispôsobenie oka: priemerný jas (log) → plynulé dobiehanie; porovnáva sa so začiatkom bitky, takže sa ladenie kraja nezmení
        const mLum = mk('uniform sampler2D tex; varying vec2 vUv; void main(){ float s = 0.0; for (int i = 0; i < 6; i++) for (int j = 0; j < 6; j++) { vec3 c = texture2D(tex, vec2((float(i) + 0.5) / 6.0, (float(j) + 0.5) / 6.0)).rgb; s += log(dot(c, vec3(0.2126, 0.7152, 0.0722)) + 0.001); } gl_FragColor = vec4(vec3(exp(s / 36.0)), 1.0); }', { tex: { value: null } });
        const mAd = mk('uniform sampler2D tPrev; uniform sampler2D tNow; uniform float k; varying vec2 vUv; void main(){ gl_FragColor = vec4(mix(texture2D(tPrev, vec2(0.5)).rgb, texture2D(tNow, vec2(0.5)).rgb, k), 1.0); }', { tPrev: { value: null }, tNow: { value: null }, k: { value: 1 } });
        const mCopy = mk('uniform sampler2D tex; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tex, vec2(0.5)); }', { tex: { value: null } });
        const mFin = mk(`uniform sampler2D tex; uniform sampler2D b0; uniform sampler2D b1; uniform sampler2D b2; uniform sampler2D tAd; uniform sampler2D tBase; uniform float uAdapt; uniform float bloom; uniform float expo; uniform vec3 lift; uniform vec3 gain; uniform float sat; uniform float vig; uniform vec2 sunUv; uniform float rays; uniform float con; uniform float uGrain; uniform float uTime; uniform vec3 uShT; uniform vec3 uHiT; uniform float uBars; varying vec2 vUv;
            vec3 aces(vec3 x) { x *= 0.6; return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
            vec3 toS(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
            void main() {
                vec3 c = texture2D(tex, vUv).rgb;
                vec3 bl = texture2D(b0, vUv).rgb * 0.5 + texture2D(b1, vUv).rgb * 0.8 + texture2D(b2, vUv).rgb * 1.1;
                c += bl * bloom;
                if (rays > 0.0) { vec2 dl = (vUv - sunUv) / 24.0; vec2 p = vUv; float il = 1.0; vec3 r = vec3(0.0); for (int i = 0; i < 24; i++) { p -= dl; r += texture2D(b1, p).rgb * il; il *= 0.93; } c += r * rays * 0.05; }
                float ad = uAdapt > 0.0 ? clamp(pow(texture2D(tBase, vec2(0.5)).r / max(texture2D(tAd, vec2(0.5)).r, 0.0005), 0.5), 0.72, 1.45) : 1.0;
                c = aces(c * expo * mix(1.0, ad, uAdapt));
                c = lift + c * gain;
                float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = mix(vec3(l), c, sat);
                c += uShT * (1.0 - l) * (1.0 - l) + uHiT * l * l;   // ladenie tieňov a svetiel podľa dennej doby
                c = (c - 0.5) * con + 0.5;
                vec2 v = vUv - 0.5; c *= 1.0 - dot(v, v) * vig;
                if (uGrain > 0.0) { float g = fract(sin(dot(gl_FragCoord.xy + fract(uTime * 7.13) * 91.7, vec2(12.9898, 78.233))) * 43758.5453) - 0.5; c += g * uGrain * (0.35 + 0.65 * (1.0 - l)); }
                if (uBars > 0.0 && abs(vUv.y - 0.5) > 0.5 - 0.11 * uBars) c = vec3(0.0);   // širokouhlé filmové pásy
                gl_FragColor = vec4(toS(clamp(c, 0.0, 1.0)), 1.0);
            }`, { tex: { value: null }, b0: { value: null }, b1: { value: null }, b2: { value: null }, tAd: { value: null }, tBase: { value: null }, uAdapt: { value: 0 }, bloom: { value: .5 }, expo: { value: 1 }, lift: { value: new t.Vector3() }, gain: { value: new t.Vector3(1, 1, 1) }, sat: { value: 1 }, vig: { value: .9 }, sunUv: { value: new t.Vector2(.5, .5) }, rays: { value: 0 }, con: { value: 1 }, uGrain: { value: 0 }, uTime: U_TIME, uShT: { value: new t.Vector3() }, uHiT: { value: new t.Vector3() }, uBars: { value: 0 } });
        function size(W2, H2) {
            if (W2 === w && H2 === h) return; w = W2; h = H2;
            [main, comb, aoA, aoB, bright, ...blurA, ...blurB].forEach(r => r && r.dispose());
            main = new t.WebGLRenderTarget(w, h, { type: t.HalfFloatType, samples: q >= 2 ? 4 : 0 }); main.depthTexture = new t.DepthTexture(w, h); main.depthTexture.type = t.UnsignedIntType;
            comb = new t.WebGLRenderTarget(w, h, rtOpt); [taaA, taaB].forEach(r => r && r.dispose()); taaA = new t.WebGLRenderTarget(w, h, rtOpt); taaB = new t.WebGLRenderTarget(w, h, rtOpt); taaN = 0;
            aoA = new t.WebGLRenderTarget(Math.max(1, w >> 1), Math.max(1, h >> 1), rtOpt); aoB = new t.WebGLRenderTarget(Math.max(1, w >> 1), Math.max(1, h >> 1), rtOpt);
            bright = new t.WebGLRenderTarget(w >> 1, h >> 1, rtOpt);
            blurA = [1, 2, 3].map(k => new t.WebGLRenderTarget(Math.max(1, w >> k + 1), Math.max(1, h >> k + 1), rtOpt));
            blurB = [1, 2, 3].map(k => new t.WebGLRenderTarget(Math.max(1, w >> k + 1), Math.max(1, h >> k + 1), rtOpt));
            if (!lumNow) { lumNow = new t.WebGLRenderTarget(1, 1, rtOpt); adA = new t.WebGLRenderTarget(1, 1, rtOpt); adB = new t.WebGLRenderTarget(1, 1, rtOpt); base = new t.WebGLRenderTarget(1, 1, rtOpt); fN = 0; }
        }
        const pass = (m, target) => { quad.material = m; R.setRenderTarget(target); R.render(qs, qc); };
        const prevVP = new t.Matrix4(), vp = new t.Matrix4(), V0 = new t.Vector4(), V3 = new t.Vector3();
        /** Voľby na snímku: ao (0–1), fog {a, b, c, sun, sunC}, mb (rozmazanie), dof (0–1), focus (vzdialenosť), grain, adapt. */
        const opt = { ao: 0, fogA: 0, fogB: .03, mb: 0, dof: 0, focus: 100, grain: 0, adapt: 1 };
        return {
            fin: mFin.uniforms, comb: mComb.uniforms, opt,
            render(scene, cam) {
                const s = R.getDrawingBufferSize(new t.Vector2()); size(s.x, s.y);
                R.setRenderTarget(main); R.render(scene, cam);
                const CU = mComb.uniforms, ip = cam.projectionMatrixInverse;
                if (opt.ao > 0) {
                    mAO.uniforms.tDepth.value = main.depthTexture; mAO.uniforms.uP.value.copy(cam.projectionMatrix); mAO.uniforms.uIP.value.copy(ip); mAO.uniforms.uRes.value.set(aoA.width, aoA.height); pass(mAO, aoA);
                    mBlurAO.uniforms.tex.value = aoA.texture; mBlurAO.uniforms.dir.value.set(1.5 / aoA.width, 0); pass(mBlurAO, aoB);
                    mBlurAO.uniforms.tex.value = aoB.texture; mBlurAO.uniforms.dir.value.set(0, 1.5 / aoA.height); pass(mBlurAO, aoA);
                }
                vp.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
                CU.tex.value = main.texture; CU.tDepth.value = main.depthTexture; CU.tAO.value = aoA.texture; CU.uIP.value.copy(ip); CU.uCW.value.copy(cam.matrixWorld); CU.uPVP.value.copy(fN ? prevVP : vp); CU.uCam.value.copy(cam.position); CU.uRes.value.set(w, h);
                CU.uAO.value = opt.ao; CU.uFogA.value = opt.fogA; CU.uFogB.value = opt.fogB; CU.uMB.value = opt.mb; CU.uDof.value = opt.dof; CU.uFocus.value = opt.focus;
                CU.uCS.value = opt.cs || 0; CU.uCO.value.copy(opt.co || CU.uCO.value); CU.uSSR.value = opt.ssr || 0; CU.uP.value.copy(cam.projectionMatrix); for (let i = 0; i < 4; i++) CU.uHz.value[i].copy((opt.hz && opt.hz[i]) || V0);
                pass(mComb, comb);
                let cur = comb;
                if (opt.taa) { const TU = mTAA.uniforms; TU.tCur.value = comb.texture; TU.tHist.value = taaB.texture; TU.tDepth.value = main.depthTexture; TU.uIP.value.copy(ip); TU.uCW.value.copy(cam.matrixWorld); TU.uPVP.value.copy(fN ? prevVP : vp); TU.uCam.value.copy(cam.position); TU.uRes.value.set(w, h); TU.uFirst.value = taaN++ < 2 ? 1 : 0; pass(mTAA, taaA); cur = taaA; [taaA, taaB] = [taaB, taaA]; } else taaN = 0;
                prevVP.copy(vp);
                mBright.uniforms.tex.value = cur.texture; pass(mBright, bright);
                let src = bright.texture;
                for (let i = 0; i < 3; i++) {
                    mBlur.uniforms.tex.value = src; mBlur.uniforms.dir.value.set(1 / blurA[i].width, 0); pass(mBlur, blurA[i]);
                    mBlur.uniforms.tex.value = blurA[i].texture; mBlur.uniforms.dir.value.set(0, 1 / blurA[i].height); pass(mBlur, blurB[i]);
                    src = blurB[i].texture;
                }
                // jas scény pre prispôsobenie oka (z najmenšej rozmazanej kópie celej scény, nie len jasných miest)
                mBlur.uniforms.tex.value = cur.texture; mBlur.uniforms.dir.value.set(0, 0); pass(mBlur, blurA[2]);
                mLum.uniforms.tex.value = blurA[2].texture; pass(mLum, lumNow);
                mAd.uniforms.tPrev.value = adA.texture; mAd.uniforms.tNow.value = lumNow.texture; mAd.uniforms.k.value = fN < 3 ? 1 : .035; pass(mAd, adB); [adA, adB] = [adB, adA];
                if (fN === 25) { mCopy.uniforms.tex.value = adA.texture; pass(mCopy, base); }
                fN++;
                const F = mFin.uniforms; F.tex.value = cur.texture; F.uShT.value.copy(opt.shT || V3); F.uHiT.value.copy(opt.hiT || V3); F.uBars.value = opt.bars || 0; F.b0.value = blurB[0].texture; F.b1.value = blurB[1].texture; F.b2.value = blurB[2].texture; F.tAd.value = adA.texture; F.tBase.value = base.texture; F.uAdapt.value = fN > 26 ? opt.adapt : 0; F.uGrain.value = opt.grain;
                pass(mFin, null);
            },
            dispose() { [taaA, taaB, main, comb, aoA, aoB, bright, ...blurA, ...blurB, lumNow, adA, adB, base].forEach(r => r && r.dispose()); w = h = 0; lumNow = null; }
        };
    }
    /** Odraz oblohy pre kovy a látky (PMREM z klenby oblohy). */
    function envFrom(R, skyMesh) {
        const t = T(), pm = new t.PMREMGenerator(R), sc = new t.Scene(), m = skyMesh.clone(); m.scale.setScalar(.04); sc.add(m);
        const rt = pm.fromScene(sc, 0, .1, 200); pm.dispose(); return rt.texture;
    }
    return { U_TIME, U_WET, U_DIRT, U_SNOW, U_MUD: () => (U_MUD.value || (U_MUD.value = new (T().Color)('#3e3020'))), U_TINT, Q, QN, noise, detailTex, emblemTex, softTex, chrMat, bannerMat, emblemMat, foliageMat, terrainMat, grass, water, sky, Composer, envFrom, stoneMat, puddleMat };
})();
