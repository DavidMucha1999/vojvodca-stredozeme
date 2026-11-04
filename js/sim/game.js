/*
 * Nová hra, uloženie a načítanie.
 */
/**
 * Uložené pozície: 'vs1' = pozícia 1 (pôvodná), 'vs2', 'vs3' = ďalšie ručné, 'vsauto' = automatická (na konci každého dňa).
 * slot = 1, 2, 3 alebo 'auto'.
 */
const SLOTS = [['1', 'Pozícia 1'], ['2', 'Pozícia 2'], ['3', 'Pozícia 3'], ['4', 'Pozícia 4'], ['5', 'Pozícia 5'], ['6', 'Pozícia 6'], ['auto', 'Automatická (koniec dňa)'], ['auto2', 'Automatická (deň predtým)'], ['auto3', 'Automatická (pred dvoma dňami)']];
const slotKey = slot => slot === 'auto' ? 'vsauto' : 'vs' + (slot || 1);
/** Popis uloženej pozície alebo null, ak je prázdna. */
function slotInfo(slot) { const d = slotData(slot); return d ? d.text : null; }
/** Náhľad uloženej pozície: text, vzhľad hrdinu (portrét), deň, frakcia… alebo null. */
function slotData(slot) {
    try {
        const s = JSON.parse(STORE.getItem(slotKey(slot)));
        if (!s || !s.G) return null;
        const g = s.G, castles = (s.T || []).filter(t => t.mine).length;
        const place = g.day != null && s.T ? (() => { let b = null, bd = 1e9; (MAPDATA.castles || []).forEach((c, i) => { const d = Math.hypot(c[1] * (s.K || K) - g.x, c[2] * (s.K || K) - g.y); if (d < bd) { bd = d; b = c[0]; } }); return b; })() : null;
        return { g, look: g.look, ts: s.ts || 0, text: g.name + ' · deň ' + g.day + ' · ' + (g.kn || FN[g.fac]) + ' · úroveň ' + (g.lv || 1) + (castles ? ' · hradov: ' + castles : '') + (place ? ' · pri ' + place : '') + (s.when ? ' · ' + s.when : '') };
    } catch (x) { return null; }
}
/** Verzia formátu uloženia; staršie uloženia prevedie migrateSave. */
const SAVE_VERSION = 2;
/** Dočasné polia, ktoré sa neukladajú (každý snímok sa prepočítajú). */
const SAVE_SKIP = { G: ['chase', 'talk'], E: ['vx', 'vy', 'fo', 'wp', 'wpd', 'inside', 'hold', 'ti', 'vi', 'wait', 'dead'] };
const strip = (o, skip) => { const r = {}; for (const k of Object.keys(o)) { const d = Object.getOwnPropertyDescriptor(o, k); if (!skip.includes(k) && d && !d.get && typeof o[k] !== 'function') r[k] = o[k]; } return r; };
/** Uloží celý stav sveta: hrdina, hrady, dediny, lordi, diplomacia, maršali, vzťahy lordov a nedoručené listy. */
function save(slot) {
    try {
        const data = {
            v: SAVE_VERSION, K, ts: Date.now(), when: new Date().toLocaleString('sk-SK', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }),
            G: strip(G, SAVE_SKIP.G), T: TW.map(t => strip(t, ['x', 'y', 'n'])), E: E.filter(e => !e.dead).map(e => strip(e, SAVE_SKIP.E)), VL,
            WR, REL, AL, CP, MW, MAR, MST, LRL, LETTERS, NID
        };
        STORE.setItem(slotKey(slot), JSON.stringify(data));
        return 1;
    }
    catch (x) {
        return 0;
    }
}
/** Prevedie staršie uloženie na súčasný formát (mierka mapy, výbava, domovské hrady lordov, zajatci). */
function migrateSave(s) {
    const G0 = s.G;
    if (!G0.fd) Object.assign(G0, { fd: { bread: 30 }, pm: 60, pmv: 0, wd: {}, pp: Math.max(0, (G0.lv || 1) - 1), perk: {} });   // staršie uloženie: zásoby a body perkov za doterajšie úrovne
    if (G0.eq && G0.eq.r == null) { G0.eq.r = 0; if (G0.own) G0.own.r = [0]; }   // strelná výbava (v39)
    if (!G0.own) G0.own = Object.fromEntries(Object.keys(G0.eq).map(k => [k, Array.from({ length: G0.eq[k] + 1 }, (_, i) => i)]));
    const q = s.K ? K / s.K : K / 4.5;
    if (q !== 1) { const sc = o => { o.x *= q; o.y *= q; if (o.tx != null) { o.tx *= q; o.ty *= q; } }; sc(G0); s.E.forEach(sc); (s.VL || []).forEach(sc); G0.sg = null; }
    s.G.pri = (s.G.pri || []).map(p => typeof p === 'string' ? { nm: p, f: 9, n: 6, day: s.G.day } : p);
    return s;
}
function newGame() {
    ov.classList.remove('intro');
    tb.style.display = 'flex';
    hud.style.visibility = '';
    {
        initA();
        setTimeout(help, 0);
        LOG = [];
        const pn = document.getElementById('pn'), fs = document.getElementById('fs'), nm = (pn && pn.value.trim()) || (G && G.name) || 'Vojvodca', f0 = fs ? +fs.value : 6;
        TW = mkTW();
        VL = nameVillages(mkVL());
        WR = mkWR();
        REL = mkREL();
        AL = mkAL();
        CP = {};
        MW = { n: 'clear', l: 0 };
        G = { name: nm, king: 0, arc: 0, elf: 0, roh: 0, pri: [], sk: 0, q: 0, qc: 0, qs: 0, qd: 0, cap: 0, vet: 0, txp: 0, wed: -1, heir: 0, s: { st: 0, od: 0, ob: 0, pr: 0, ls: 0 }, gold: 150, inf: 6, cav: 0, hp: 100, lv: 1, xp: 0, ren: 0, day: 1, x: 160 * K, y: 900 * K, tx: 160 * K, ty: 900 * K, dest: -1, pd: -1, fac: 6, chase: null, eq: { w: 0, a: 0, s: 0, m: 0, h: 0, r: 0 }, own: { w: [0], a: [0], s: [0], m: [0], h: [0], r: [0] } };
        E = [];
        sp = 150;
        QS = bloc(f0) ? QE : QG;
        G.st = { b: 0, w: 0, l: 0, k: 0, d: 0, c: 0, r: 0 };
        Object.assign(G, { fd: { bread: 30, ale: 10 }, pm: 65, pmv: 0, wd: {}, pp: 0, perk: {} });   // zásoby, morálka družiny, ranení, perky (supply.js, perks.js)
        for (let i = 0; i < 110; i++)
            spawnE();
        [0, 1, 2, 3, 4, 5, 7, 8].forEach(assignRoles);
        for (let i = 0; i < 4; i++)
            spawnX();
        if (bloc(f0))
            startGear(1);   // hrdina zla začína s orkskou výbavou
        if (typeof creatorResult === 'function') {   // tvorba postavy: vzhľad, povaha, schopnosti
            const cr = creatorResult();
            G.look = cr.look; G.trait = cr.trait; G.race = cr.race; Object.assign(G.s, cr.s);
            if (G.fac === 6) G.side = cr.side;                              // nezávislý hrdina: strana zvolená pri tvorbe postavy
            if (typeof RACES !== 'undefined' && RACES[cr.race]) RACES[cr.race].fx(G);
            if (TRAITS[cr.trait]) TRAITS[cr.trait].fx(G);
            if (G.trel) E.forEach(e => { if (!bloc(e.f)) e.rl = (e.rl || 0) + G.trel; });
        }
        if (f0 !== 6) {
            const t = TW.find(t => t.f === f0);
            G.fac = f0;
            G.x = G.tx = t.x;
            G.y = G.ty = t.y + 30;
            TW.forEach(x => {
                if (x.f === 6)
                    x.f = f0;
            });
        }
        dayT = 0;
        mode = 'map';
        ov.classList.add('hide');
        upd();
    }
}
function load(slot) {
    initA();
    try {
        const raw = JSON.parse(STORE.getItem(slotKey(slot)));
        if (raw) {
            const s = migrateSave(raw);
            TW = mkTW();
            s.T.forEach((o, i) => Object.assign(TW[i], o));
            G = s.G;
            E = s.E;
            QS = bloc(G.fac) ? QE : QG;
            WR = s.WR && s.WR.length >= 10 ? s.WR : mkWR();
            REL = s.REL && s.REL.length >= 10 ? s.REL : mkREL();
            AL = s.AL && s.AL.length >= 10 ? s.AL : mkAL();
            CP = s.CP || {};
            VL = s.VL || mkVL();
            MW = s.MW || { n: 'clear', l: 0 };
            if (s.MAR) { for (const k in MAR) delete MAR[k]; Object.assign(MAR, s.MAR); }
            if (s.MST) { for (const k in MST) delete MST[k]; Object.assign(MST, s.MST); }
            if (s.LRL) LRL = s.LRL;
            LETTERS = s.LETTERS || [];
            E.forEach(e => { e.vx = 0; e.vy = 0; e.w = 0; if (e.home == null && !e.nz && e.f !== 9) { const t = TW.map((x, i) => i).filter(i => TW[i].f === e.f).sort((a, b) => Math.hypot(TW[a].x - e.x, TW[a].y - e.y) - Math.hypot(TW[b].x - e.x, TW[b].y - e.y))[0]; e.home = t; e.role = e.role || 'army'; } });
            NID = Math.max(s.NID || 0, 1e5);
            sp = 100;
            dayT = 0;
            mode = 'map';
            ov.classList.add('hide');
            upd();
        }
    }
    catch (x) { console.warn('Načítanie zlyhalo', x); }
    if (G) {
        ov.classList.remove('intro');
        tb.style.display = 'flex';
        hud.style.visibility = '';
    }
}
