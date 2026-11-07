/*
 * Prispôsobenie brnenia (odevu z modelu Meshy, import tools/model_import.py --kind=garment) telu postavy z modelu.
 * Odev je samostatný kus (bez tela) s rukami spustenými dole; tu sa nasadí na telo rasy (človek, elf, trpaslík, hobit):
 *  1. mierka a poloha podľa pliec, výstrihu a hrude (trpaslík má odev kratší, lebo má kratší trup),
 *  2. rukávy (vrcholy, ktorých najbližšie miesto tela je ruka) sa natočia okolo ramenného kĺbu na smer ruky a pritiahnu k zápästiu,
 *  3. odev sa odsadí od kože (nič z tela neprenikne),
 *  4. váhy kostí prevezme z najbližšieho vrcholu tela – odev sa hýbe presne s telom (ruky, nohy pod šosmi, trup).
 * Čisté výpočty nad poľami (bez Three.js); volá ich js/engine/b3d.js a výsledok si pamätá pre každú rasu a brnenie.
 */
const GarmentFit = (() => {
    /** Mriežka na hľadanie najbližšieho vrcholu tela. */
    function grid(P, cell, only) {
        const m = new Map(), key = (x, y, z) => ((x + 512) * 1024 + (y + 512)) * 1024 + (z + 512);
        for (const i of only || Array.from({ length: P.length / 3 }, (_, j) => j)) { const k = key(Math.floor(P[i * 3] / cell), Math.floor(P[i * 3 + 1] / cell), Math.floor(P[i * 3 + 2] / cell)); let a = m.get(k); if (!a) m.set(k, a = []); a.push(i); }
        return (x, y, z) => {
            const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell); let best = -1, bd = 1e18;
            for (let r = 1; r <= 6 && best < 0; r++) for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) for (let k = -r; k <= r; k++) {
                const a = m.get(key(cx + i, cy + j, cz + k)); if (!a) continue;
                for (const v of a) { const dx = P[v * 3] - x, dy = P[v * 3 + 1] - y, dz = P[v * 3 + 2] - z, d = dx * dx + dy * dy + dz * dz; if (d < bd) { bd = d; best = v; } }
            }
            return best;
        };
    }
    /** Rozmery tela z jeho vrcholov a kĺbov (land z importu): šírka pliec s rukami, výška krku (kúsok nad plecami – brada trpaslíka siaha nižšie), hĺbka a stred hrude, dĺžka trupu. */
    function bodyMeasures(B, L) {
        const P = B.P, n = P.length / 3, neck = L.shY + .4 * L.height / 25.5; let shW = 0, x0 = 1e9, x1 = -1e9;
        for (let i = 0; i < n; i++) { const y = P[i * 3 + 1], z = Math.abs(P[i * 3 + 2]); if (Math.abs(y - (L.shY - .3)) < 1.2) shW = Math.max(shW, z); if (Math.abs(y - (L.shY - 2.6)) < .6 && z < L.shZ * .5) { x0 = Math.min(x0, P[i * 3]); x1 = Math.max(x1, P[i * 3]); } }
        return { shW, neck, chD: x1 - x0, cx: (x0 + x1) / 2, torso: (neck - L.hipJY) / shW };
    }
    const ARM = { 1: ['shR', 'elR', 'hR', 'wp'], [-1]: ['shL', 'elL', 'hL', 'shd'] };
    /**
     * G: pozície odevu (Float32Array, výška 30, x vpred, y hore, z vpravo), GL: orientačné body z importu;
     * B: telo { P, N, si, sw, main (meno kosti pre vrchol) } v pokojovej póze; L: kĺby tela (land modelu); ref: miery ľudského tela (pre pomer trupu).
     * Vráti { P, si, sw } pre vrcholy odevu.
     */
    function fit(G, GL, B, L, ref) {
        const M = bodyMeasures(B, L), n = G.length / 3, out = new Float32Array(n * 3), k = M.shW / GL.shW;
        const ky = k * Math.max(.72, Math.min(1.15, ref ? M.torso / ref.torso : 1)), kx = Math.max(.75 * k, Math.min(1.35 * k, M.chD / GL.chD)), hs = L.height / 25.5;
        for (let i = 0; i < n; i++) { out[i * 3] = (G[i * 3] - GL.cx) * kx + M.cx; out[i * 3 + 1] = (G[i * 3 + 1] - GL.yT) * ky + M.neck; out[i * 3 + 2] = G[i * 3 + 2] * k; }
        const torso = []; for (let i = 0; i < B.P.length / 3; i++) if (B.main[i] !== 'hd') torso.push(i);   // bez hlavy a brady (spodok brady by tlačil odev do hrude)
        const near = grid(B.P, 1.2 * hs, torso), nb = new Int32Array(n), findAll = () => { for (let i = 0; i < n; i++) nb[i] = near(out[i * 3], out[i * 3 + 1], out[i * 3 + 2]); };
        findAll();
        // rukávy: natočiť okolo ramena na smer ruky (rameno → zápästie), dĺžku pritiahnuť k zápästiu
        for (const sd of [1, -1]) {
            const J = [L.shX, L.shY, sd * L.shZ], Wr = [L.wr[0], L.wr[1], sd * Math.abs(L.wr[2])], arm = [];
            for (let i = 0; i < n; i++) if (ARM[sd].includes(B.main[nb[i]]) && out[i * 3 + 1] < J[1] + .5 * hs && out[i * 3 + 2] * sd > 0) arm.push(i);
            if (arm.length < 8) continue;
            let yMin = 1e9, yMax = -1e9; for (const i of arm) { yMin = Math.min(yMin, out[i * 3 + 1]); yMax = Math.max(yMax, out[i * 3 + 1]); }
            const E = [0, 0, 0]; let c = 0; for (const i of arm) if (out[i * 3 + 1] < yMin + (yMax - yMin) * .15) { E[0] += out[i * 3]; E[1] += out[i * 3 + 1]; E[2] += out[i * 3 + 2]; c++; }
            E[0] /= c; E[1] /= c; E[2] /= c;
            const ag = [E[0] - J[0], E[1] - J[1], E[2] - J[2]], ab = [Wr[0] - J[0], Wr[1] - J[1], Wr[2] - J[2]], Lg = Math.hypot(...ag), Lb = Math.hypot(...ab);
            if (Lg < 1e-3) continue;
            const u = ag.map(v => v / Lg), w = ab.map(v => v / Lb), ax = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]], sn = Math.hypot(...ax), cs = u[0] * w[0] + u[1] * w[1] + u[2] * w[2];
            const kk = sn > 1e-6 ? ax.map(v => v / sn) : [1, 0, 0], ang = Math.atan2(sn, cs), sAx = Lg > .72 * Lb ? Math.max(.8, Math.min(1.3, .97 * Lb / Lg)) : 1;
            const rot = (d, a) => { const c2 = Math.cos(a), s2 = Math.sin(a), kd = kk[0] * d[0] + kk[1] * d[1] + kk[2] * d[2], cr = [kk[1] * d[2] - kk[2] * d[1], kk[2] * d[0] - kk[0] * d[2], kk[0] * d[1] - kk[1] * d[0]]; return [0, 1, 2].map(j => d[j] * c2 + cr[j] * s2 + kk[j] * kd * (1 - c2)); };
            for (const i of arm) {
                const y = out[i * 3 + 1], t = Math.max(0, Math.min(1, (J[1] - y) / (2.2 * hs))), wgt = t * t * (3 - 2 * t); if (wgt <= 0) continue;
                let d = [out[i * 3] - J[0], out[i * 3 + 1] - J[1], out[i * 3 + 2] - J[2]]; const du = d[0] * u[0] + d[1] * u[1] + d[2] * u[2], s2 = 1 + (sAx - 1) * wgt;
                d = d.map((v, j) => v + (s2 - 1) * du * u[j]); const r = rot(d, ang * wgt);
                for (let j = 0; j < 3; j++) out[i * 3 + j] = J[j] + r[j];
            }
        }
        findAll();
        // odsadenie od kože a váhy kostí z najbližšieho vrcholu tela
        const off = .2 * hs, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
        for (let pass = 0; pass < 2; pass++) {
            for (let i = 0; i < n; i++) {
                const b = nb[i], d = (out[i * 3] - B.P[b * 3]) * B.N[b * 3] + (out[i * 3 + 1] - B.P[b * 3 + 1]) * B.N[b * 3 + 1] + (out[i * 3 + 2] - B.P[b * 3 + 2]) * B.N[b * 3 + 2];
                if (d < off) for (let j = 0; j < 3; j++) out[i * 3 + j] += (off - d) * B.N[b * 3 + j];
            }
            findAll();
        }
        for (let i = 0; i < n; i++) { const b = nb[i]; for (let j = 0; j < 4; j++) { si[i * 4 + j] = B.si[b * 4 + j]; sw[i * 4 + j] = B.sw[b * 4 + j]; } }
        return { P: out, si, sw };
    }
    return { fit, bodyMeasures };
})();
