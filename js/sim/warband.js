/*
 * Boj ako v Mount & Blade: Warband – ďalšia vrstva nad js/sim/combat.js (miesto zásahu, typy poškodenia, šípy v 3D, techniky):
 *   – Miesto zásahu: hlava, trup, ruka, noha (u jazdca aj kôň). Šípy letia v 3D oblúku s gravitáciou a zasiahnu tú časť tela, do ktorej trafia;
 *     pri údere na blízko rozhoduje smer (zhora skôr hlava, bod podľa výšky mierenia, sek zboku trup a ruky).
 *   – Zásah do hlavy: obyčajný vojak padne na mieste, prilba dá šancu prežiť (lepšia prilba väčšiu); hrdina, spoločníci, bossovia a obri
 *     dostanú trojnásobné zranenie (prilba hrdinu ho znižuje).
 *   – Typy poškodenia: sečné (meče, sekery) – silné proti nechráneným, slabé proti plátu; bodné (kopije, šípy, bod) – prejde brnením;
 *     tupé (kyjaky, palcáty, kopnutie) – nepriateľa často len omráči (po víťazstve ho zajmeš).
 *   – Luk: šípy padajú (na diaľku treba mieriť vyššie), zapichnú sa do tiel, štítov aj zeme; šípy zo zeme sa dajú pozbierať prechodom cez ne.
 *     Kuša sa nabíja len postojačky. Štít zachytáva šípy a pomaly sa láme; zlomený štít nahradí štít zdvihnutý zo zeme.
 *   – Techniky: kopnutie (Y) zapotáca a prerazí kryt; kryt útokom (chamber) – útok v rovnakom smere ako prichádzajúci úder v pravú chvíľu
 *     ho odrazí; príliš blízko zasiahne zbraň len rúčkou; sek zboku sa zarazí o hradby alebo o vlastného vojaka; koliesko myši mení zbraň
 *     (na blízko / strelná); kôň sa vzopne pred šíkom kopijníkov, má zotrvačnosť a obratnosť podľa plemena; jazdeckí lukostrelci krúžia okolo nepriateľa.
 *   – Hlásenia ako vo Warbande (zásahy, zabitia, omráčenia), krátke zastavenie obrazu pri ťažkom údere.
 */
const ARG = .1;                         // gravitácia šípov (jednotky za snímok²)
let HITSTOP = 0;                        // krátke zastavenie obrazu pri ťažkom údere (snímky)
let GA = [];
let WB_SND = '';                        // zvuk zásahu podľa materiálu: kov (sw) alebo telo (hb)                            // šípy a štíty na zemi (zbierajú sa prechodom)
const ZONE_N = { head: 'do hlavy', torso: 'do trupu', arm: 'do ruky', legs: 'do nohy', horse: 'do koňa' };
/** Výška hradieb a terénu v simulácii (len hradby – zvyšok terénu je pre zásahy rovný). */
function elevSim(x, y) { return SGB && x >= 1000 && x <= 1048 && !(y > 440 && y < 520) ? 40 : 0; }
const specU = u => (typeof Soldiers !== 'undefined' && typeof Art !== 'undefined' && !u.h && !u.boss) ? Soldiers.UNITS[Art.unitArt(u)] || null : null;
/** Je jednotka na koni (alebo vlku)? */
const onMount = u => u.h ? heroMounted() : !!(mounted(u) || u.mnt || (specU(u) && specU(u).mount));
/** Výška postavy (bez koňa) podľa rasy. */
function bodyH(u) {
    if (u.boss) return 70;
    if (u.h) return G.race === 'dwarf' ? 20 : G.race === 'hobbit' ? 18 : G.race === 'elf' ? 28 : 26;
    const s = specU(u); if (!s) return heavy(u) ? 42 : 26;
    if (s.big || s.beast) return 42;
    return { dwarf: 20, orc: 23, uruk: 27, troll: 40, elf: 28 }[s.skin] || 26;
}
const seatH = u => onMount(u) ? 20 : 0;
/** Kvalita prilby (šanca prežiť zásah do hlavy). */
function helmQ(u) {
    const k = u.h ? (G.eq.h != null && it('h') ? (it('h').v >= .1 ? 'heavy' : it('h').v > 0 ? 'helm' : 'cap') : 'none') : (specU(u) || {}).helm;
    if (!k || k === 'none') return 0; if (k === 'cap' || k === 'hood' || k === 'turban') return .1;
    if (['gondor', 'winged', 'citadel', 'dwarf', 'uruk', 'mask', 'heavy'].includes(k)) return .5; return .3;
}
const hexHsl = h => { const n = parseInt(String(h || '#888888').slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, s = mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1)); return { s, l }; };
/** Plátové (kovové) brnenie? */
function plated(u) { if (u.h) return !!(it('a') && it('a').v >= .4); if (u.cp || u.boss || heavy(u)) return true; const s = specU(u), F = u.uk && FU[u.uk]; const c = (F && F.col) || (s && s.armor); const q = hexHsl(c); return q.s < .2 && q.l > .3; }
/** Typ poškodenia útočníka: c sečné, p bodné, b tupé. */
function dmgType(att, kind, dir) {
    if (dir === 't' || kind === 'thrust') return 'p';
    if (kind === 'charge') return att.h && it('w') && it('w').r ? 'p' : 'b';
    if (kind === 'kick') return 'b';
    if (att.h) { const t = typeof Soldiers !== 'undefined' && Soldiers.GEAR.w[G.eq.w] ? Soldiers.GEAR.w[G.eq.w].t : 'sword'; return t === 'mace' || t === 'club' ? 'b' : t === 'spear' ? 'p' : 'c'; }
    const s = specU(att), w = s ? s.weapon : 'sword', F = att.uk && FU[att.uk];
    return w === 'club' || heavy(att) ? 'b' : w === 'spear' || (F && F.wp === 'sp') ? 'p' : 'c';
}
const TYPE_ARM = { c: [1.15, .75], p: [1, .95], b: [.95, 1.08] };
/**
 * Vlastnosti zbrane ako vo Warbande: sp = rýchlosť (nápriah a zotavenie), len = dosah, sw = sila seku, th = sila bodu.
 * Druh sa pozná podľa vlastností a mena predmetu v js/data/equipment.js (obojručná, kopija, sekera, palcát, nôž, inak meč).
 */
const WSTAT = {
    sword: { sp: 1, len: 1, sw: 1, th: 1 },
    two: { sp: .8, len: 1.15, sw: 1.1, th: 1 },
    spear: { sp: .95, len: 1, sw: .75, th: 1.1 },
    axe: { sp: .88, len: .95, sw: 1.15, th: .5 },
    mace: { sp: .9, len: .9, sw: 1.1, th: .6 },
    knife: { sp: 1.25, len: .75, sw: .85, th: .9 }
};
function wkind(w) {
    if (!w) return 'sword';
    if (w.t2) return 'two';
    if (w.r) return 'spear';
    const n = String(w.n || '').toLowerCase();
    if (/kopij|oštep/.test(n)) return 'spear';
    if (/sekera|sekern/.test(n)) return 'axe';
    if (/palcát|kyj|búch/.test(n)) return 'mace';
    if (/nôž|dýk/.test(n)) return 'knife';
    return 'sword';
}
const wstat = w => WSTAT[wkind(w)];
/** Hmotnosť výbavy hrdinu 0 – 1 (ako vo Warbande): ťažké brnenie, štít, prilba a obojručná zbraň spomalia pohyb pešo aj údery.
 *  Mithril a elfská výbava sú ľahké; Obratnosť (G.s.ob) postih zmierňuje. Na koni sa hmotnosť takmer neprejaví. */
function heroLoad() {
    if (typeof G === 'undefined' || !G || !G.eq) return 0;
    const lt = x => x && /mithril|galadrim|elfsk/i.test(x.n || '') ? .35 : 1, t2 = twoHand();
    const a = it('a'), s = t2 ? null : it('s'), h = it('h');
    const raw = (a ? a.v * lt(a) : 0) + (s ? s.v * 1.2 * lt(s) : 0) + (h ? h.v * 1.5 * lt(h) : 0) + (t2 ? .1 : 0);
    return Math.max(0, Math.min(1, raw)) * Math.max(.4, 1 - .1 * ((G.s && G.s.ob) || 0));
}
/** Násobok rýchlosti pohybu (pešo až −22 %, na koni −5 %) a času nápriahu (až +15 %) podľa hmotnosti výbavy. */
const loadSpeed = () => 1 - (heroMounted() ? .05 : .22 * (1 - .1 * csLv('at'))) * heroLoad();   // Atletika zmenšuje postih
const loadSwing = () => 1 + .15 * heroLoad();
/** Hodnota brnenia cieľa (0 – .5): odráta sa od zranenia ako pevná hodnota (hrdina má vlastné zníženie red()). */
function armV(b) { if (b.cp) return .3; if (b.boss || heavy(b)) return .5; return plated(b) ? .4 : .1; }
var SOAK = 5, SOAK_T = { c: 1, p: .8, b: .55 }, SOAK_MIN = { c: .3, p: .4, b: .5 }, SOAK_Z = { head: .8, arm: .6, legs: .5, horse: .3, torso: 1 };
/** Miesto zásahu pri údere na blízko: podľa smeru úderu (z pohľadu útočníka), výšky mierenia a toho, či je útočník na koni. */
function meleeZone(att, def, dir, pitch) {
    const r = Math.random(), up = (onMount(att) && !onMount(def) ? .2 : 0) - (!onMount(att) && onMount(def) ? .15 : 0);
    if (onMount(def) && !onMount(att) && Math.random() < .2) return 'horse';
    if (dir === 't') { if (pitch != null) return pitch > .12 ? 'head' : pitch < -.2 ? 'legs' : r < .2 ? 'arm' : 'torso'; return r < .15 + up ? 'head' : r < .3 + up ? 'legs' : 'torso'; }
    if (dir === 'u') return r < (def.h ? .25 : .4) + up ? 'head' : 'torso';
    return r < .15 + up ? 'head' : r < .4 + up ? 'arm' : 'torso';
}
/** Zásah s miestom a typom: o = { zone, type, ranged, pow }. Zásah do hlavy obyčajného vojaka je smrteľný (prilba dá šancu). */
function hitZ(b, d, from, o) {
    if (b.fly > 0) return;
    const zone = o.zone || 'torso', big = b.h || b.cp || b.boss || heavy(b);
    const ty = o.type || 'c';
    if (b.h) { const ta = TYPE_ARM[ty] || TYPE_ARM.c; d *= plated(b) ? ta[1] : ta[0]; }
    else if (o.wb !== false) { const soak = armV(b) * SOAK * (SOAK_T[ty] || 1) * (SOAK_Z[zone] || 1); d = Math.max(d * (SOAK_MIN[ty] || .3), d - soak); }   // brnenie odráta pevnú hodnotu (silný úder prejde, slabý sa stratí)
    else { const ta = TYPE_ARM[ty] || TYPE_ARM.c; d *= plated(b) ? ta[1] : ta[0]; }
    let lethal = false;
    if (zone === 'head') {
        if (big) d *= b.h ? Math.max(1.6, 3 - (it('h') ? it('h').v : 0) * 8) : 3;
        else { const save = Math.min(.85, helmQ(b) + (o.ranged ? 0 : .35)); if (Math.random() < save) d *= 2.5; else lethal = true; }
    } else d *= { arm: .75, legs: .8, horse: .6, torso: 1 }[zone] || 1;
    const was = b.hp > 0, hp0 = b.hp;
    b.lz = zone; if (from) b.lhA = Math.atan2(b.y - from.y, b.x - from.x);
    if (lethal) d = Math.max(d, b.hp / ((b.t ? 1 : DIFF_MUL() * (!b.t && temple() ? .9 : 1)) || 1) + 1);
    if (zone === 'horse' && b.h && CMB.horse > 0) { CMB.horse -= d; if (CMB.horse <= 0) horseDown(b); else horseHurt(d); d *= .2; }
    WB_SND = plated(b) ? 'sw' : 'hb'; hit(b, d, from); WB_SND = '';
    const dealt = Math.max(0, hp0 - Math.max(0, b.hp));
    if (from && from.h && !o.noWp && typeof wpGain === 'function') wpGain(o.ranged ? wpRanged((rangedW() || {}).rt) : wpMelee(), dealt, was && b.hp <= 0);   // zdatnosť rastie používaním (js/sim/mastery.js)
    if (b.hp > 0 && (b.wu > 0 || (b.as && !b.as.done)) && !b.h && !big && typeof aiSkill === 'function' && Math.random() > aiSkill(b) * .6 && dealt > 0) { b.wu = 0; b.wt = null; b.as = null; b.c = Math.max(b.c || 0, 16); }   // zásah preruší nápriah aj rozbehnutý úder (zručný vojak vydrží)
    if (was && b.hp <= 0 && o.type === 'b' && !big && Math.random() < .7) b.ko = 1;   // tupá zbraň: omráčený (zajatie po bitke)
    if (from && from.h) {
        if (was && b.hp <= 0) { wbMsg((zone === 'head' ? 'Zásah do hlavy! ' : '') + (b.ko ? 'Omráčil si: ' : 'Zabil si: ') + unitName(b), zone === 'head' ? '#ffd24a' : '#e8d8a8'); if (zone === 'head' && o.ranged) fx3({ k: 'headshot', u: b }); }
        else wbMsg('Zásah ' + ZONE_N[zone] + ': ' + Math.round(dealt) + ' zranenia', '#e8d8a8');
        if (was && (b.hp <= 0 || zone === 'head' || (o.pow || 1) > 1.3)) HITSTOP = Math.max(HITSTOP, o.ranged ? 2 : 4);
    }
    if (b.h) wbMsg('Dostal si zásah ' + ZONE_N[zone] + ': ' + Math.round(dealt) + ' zranenia', '#ff9a80');
    if (b.cp && was && b.hp <= 0) wbMsg(unitName(b) + ' padol!', '#ff9a80');
}
/** Zásahy vlastných (ako vo Warbande): šípy zasiahnu aj vlastných v ceste a úder zhora či bod hrdinu aj vlastného vojaka pred ním. Nastavenia → Zásahy vlastných. */
const ffOn = () => typeof OPT === 'undefined' || OPT.ff !== false;
/** Hlásenie v rohu obrazovky (ako vo Warbande). */
function wbMsg(s, c) { const L = CMB.msgs = CMB.msgs || []; L.push({ s, c: c || '#e8d8a8', t: 260 }); if (L.length > 7) L.shift(); }

// ---------- šípy v 3D ----------
/** Uhol výstrelu, aby strela s rýchlosťou v doletela do vzdialenosti d s výškovým rozdielom dh (nízka dráha). */
function ballistic(d, dh, v) {
    const v2 = v * v, disc = v2 * v2 - ARG * (ARG * d * d + 2 * dh * v2);
    if (disc < 0 || d < 1) return .75;
    return Math.atan((v2 - Math.sqrt(disc)) / (ARG * d));
}
/** Výstrel: z výšky ramena strelca, smer (yaw) a náklon (pitch), rýchlosť sp. */
function fireArrow(u, yaw, pitch, sp, o) {
    const z = elevSim(u.x, u.y) + seatH(u) + bodyH(u) * .72;
    const a = { x: u.x + Math.cos(yaw) * 4, y: u.y + Math.sin(yaw) * 4, z, vx: Math.cos(yaw) * Math.cos(pitch) * sp, vy: Math.sin(yaw) * Math.cos(pitch) * sp, vz: Math.sin(pitch) * sp, l: o.l || 600, t: u.t, by: u, sx: u.x, sy: u.y, ...o };
    AR.push(a); return a;
}
/** Výstrel vojaka AI na cieľ b. Presnosť klesá so vzdialenosťou, s behom cieľa a pri streľbe z koňa; elfovia a zručnejší strieľajú presnejšie.
 *  Vedenie pred cieľ je nepresné (strelec odhaduje, kam sa cieľ pohne), takže bežiaceho hrdinu nezasiahne každý šíp. */
function aiShoot(u, b, sp = 7) {
    const d = Math.hypot(b.x - u.x, b.y - u.y), z0 = elevSim(u.x, u.y) + seatH(u) + bodyH(u) * .72, zt = elevSim(b.x, b.y) + seatH(b) + bodyH(b) * .6;
    const lead = d / sp * (.3 + Math.random() * .55), tx = b.x + (b.vx3 || 0) * lead, ty = b.y + (b.vy3 || 0) * lead;
    const yaw = Math.atan2(ty - u.y, tx - u.x), sk = typeof aiSkill === 'function' ? aiSkill(u) : .3, mvN = Math.min(2, Math.hypot(b.vx3 || 0, b.vy3 || 0));
    const sig = (u.k === 'e' ? .03 : .058 + .045 * (1 - sk)) * (.7 + d / 110) * (1 + mvN * .3) * (onMount(u) ? 1.8 : 1);   // rozptyl (rad)
    const g = () => (Math.random() + Math.random() + Math.random() - 1.5) / .75;   // ≈ normálne rozdelenie v rozsahu -2 … 2
    const p = ballistic(Math.hypot(tx - u.x, ty - u.y), zt - z0, sp);
    fireArrow(u, yaw + g() * sig, p + g() * sig * .45, sp, { d: u.k === 'e' ? 7 : 4.5 });
    snd('ar');
}
/** Dosah zbrane vojaka v útoku (kopija ďalej, sekera bližšie) a vzdialenosť, na ktorej sa pri chôdzi zastaví. */
const aiLen = u => { const w = aiWpn(u); return w === 'spear' ? 1.3 : w === 'axe' ? .95 : 1; };
const aiStop = u => 13 * aiLen(u) * .95;
/** Pohyb v dosahu zbrane ako vo Warbande: kopijník sa pri príliš malom odstupe cúva (drží súpera na dĺžku kopije),
 *  zručnejší vojak pri dobíjaní úkrokom do strany nestojí na mieste. */
function aiSpacing(u, b, bd, dt) {
    if (u.wu > 0 || u.stun > 0 || u.rout) return;
    const a = dirTo(u, b), len = aiLen(u), sk = aiSkill(u), stop = aiStop(u);
    if (aiWpn(u) === 'spear' && bd < 13 * len * .62) { u.x -= Math.cos(a) * u.sp * .5 * dt; u.y -= Math.sin(a) * u.sp * .5 * dt; return; }
    if (mounted(u)) return;
    // po údere krok späť (ako vo Warbande bojovníci nestoja ako stĺpy): zručnejší ustupuje častejšie
    if (u.atkSeen !== u.atkN) { u.atkSeen = u.atkN; if (u.atkN && Math.random() < .35 + sk * .5) u.bk = 10 + Math.random() * 12; }
    if (u.bk > 0) { u.bk -= dt; const k = .55 * u.sp * dt; u.x -= Math.cos(a) * k; u.y -= Math.sin(a) * k; return; }
    if (u.c > 0) {   // pri dobíjaní krúži okolo súpera po oblúku a drží odstup
        if (!u.sd) u.sd = Math.random() < .5 ? 1 : -1;
        if ((u.sdT = (u.sdT || 0) - dt) <= 0) { u.sdT = 70 + Math.random() * 90; u.sd = -u.sd; }
        const k = (.28 + sk * .3) * u.sp * dt, rad = Math.max(-1, Math.min(1, (bd - stop * .92) / 8)) * .25 * u.sp * dt;
        u.x += -Math.sin(a) * u.sd * k + Math.cos(a) * rad; u.y += Math.cos(a) * u.sd * k + Math.sin(a) * rad;
    }
}
/** Telesná kolízia (ako vo Warbande): vojaci sa neprekrývajú – dvojica bližšie než súčet polomerov (× .72) sa odtlačí; ťažší (kôň, obri, boss, hrdina)
 *  ustupujú menej. Mriežka 26 jednotiek, pri obliehaní slabšie (rebríky a brána). Volá updBattle raz za snímok. */
function sepUnits(dt) {
    const CS = 26, g = new Map(), L = [];
    for (const u of U) if (u.hp > 0 && !u.fled && !(u.ride > 0)) { u._sx = u._sy = 0; u._i = L.length; L.push(u); const k = (u.x / CS | 0) * 4096 + (u.y / CS | 0); const a = g.get(k); if (a) a.push(u); else g.set(k, [u]); }
    const str = (SGB ? .35 : .5) * Math.min(2, dt), mass = u => (u.r || 7) * (u.r || 7) * (onMount(u) ? 2 : 1) * (u.h ? 2.5 : 1);
    for (const a of L) {
        const cx = a.x / CS | 0, cy = a.y / CS | 0;
        for (let i = cx - 1; i <= cx + 1; i++) for (let j = cy - 1; j <= cy + 1; j++) {
            const c = g.get(i * 4096 + j); if (!c) continue;
            for (const b of c) {
                if (b._i <= a._i) continue;   // každá dvojica raz
                const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = ((a.r || 7) + (b.r || 7)) * .72; if (d >= m) continue;
                const ang = a._i * 2.399 + b._i * 1.618, nx = d > .01 ? dx / d : Math.cos(ang), ny = d > .01 ? dy / d : Math.sin(ang), ov = (m - d) * str, ma = mass(a), mb = mass(b), wa = mb / (ma + mb);
                a._sx -= nx * ov * wa; a._sy -= ny * ov * wa; b._sx += nx * ov * (1 - wa); b._sy += ny * ov * (1 - wa);
            }
        }
    }
    for (const u of L) { u.x += Math.max(-2.5, Math.min(2.5, u._sx)); u.y += Math.max(-2.5, Math.min(2.5, u._sy)); }
}
/** Lukostrelec AI: najprv mieri (napína asi pol sekundy, hrdina to vidí v ukazovateli útokov), potom vystrelí a dlhšie dobíja. */
function aiBow(u, b, sp, dt = 1) {
    if (!(u.aim > 0)) { u.aim = u.aim0 = 30 + Math.random() * 20; u.at = b; return; }
    u.aim -= dt; if (u.aim > 0) return;
    u.aim = 0; u.c = 80 + Math.random() * 40; aiShoot(u, u.at && u.at.hp > 0 ? u.at : b, sp);
}
const segD = (ax, ay, bx, by, px, py) => { const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy, k = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)) : 0; return Math.hypot(ax + dx * k - px, ay + dy * k - py); };
/** Pohyb šípov: gravitácia, zásah do časti tela, do štítu, do hradieb, do zeme (tam ostane a dá sa zdvihnúť). */
function stepArrows(dt) {
    for (const a of AR) {
        if (a.z == null) { a.z = 16; a.vz = 0; }
        const px = a.x, py = a.y;
        a.x += a.vx * dt; a.y += a.vy * dt; a.z += a.vz * dt; a.vz -= ARG * dt; a.l -= dt;
        const ev = elevSim(a.x, a.y);
        if (SGB && ev > 0 && elevSim(px, py) === 0 && a.z < 48) { a.l = 0; a.wall = 1; continue; }   // do múru
        if (a.z <= ev) { a.l = 0; a.land = 1; if (GA.length < 400) { a.ga = { x: a.x, y: a.y, k: a.jav ? 'jav' : a.bolt ? 'bolt' : 'arrow' }; GA.push(a.ga); } continue; }
        for (const v of U) {
            if (v.hp <= 0 || v.fled || v === a.by) continue;
            const fr = v.t === a.t;   // vlastný vojak v ceste (zásahy vlastných, Nastavenia)
            if (fr && (!ffOn() || Math.hypot(v.x - a.sx, v.y - a.sy) < 30 || (a.ps && a.ps.has(v)))) continue;
            if (segD(px, py, a.x, a.y, v.x, v.y) > (v.r || 6) * .85 + 1.5) continue;
            const base = elevSim(v.x, v.y), seat = seatH(v), H = bodyH(v), zr = a.z - base;
            if (zr < 0 || zr > seat + H * 1.02) continue;   // preletel nad hlavou
            let zone;
            if (seat && zr < seat) zone = 'horse';
            else { const k = (zr - seat) / H, sv = Math.hypot(a.vx, a.vy) || 1, lat = Math.abs((v.x - a.x) * a.vy - (v.y - a.y) * a.vx) / sv; zone = k > .83 ? 'head' : k > .42 ? (lat > (v.r || 6) * .55 ? 'arm' : 'torso') : 'legs'; }   // bočná odchýlka od stredu → ruka
            if (fr && Math.random() < .5) { (a.ps = a.ps || new Set()).add(v); continue; }   // polovica šípov tesne minie vlastných (prikrčia sa)
            if (arrowBlocked(v, a)) { a.l = 0; a.shield = v; a.hz = zr; break; }
            if (SGB && v.t !== (SGB.att ?? 0) && v.x >= 1000 && v.x <= 1050 && zone !== 'head' && Math.random() < .55) { a.l = 0; a.wall = 1; break; }   // cimburie kryje obrancov
            let d = (a.d || 4.5) + (a.t ? 0 : G.s.ls);
            if (SGB && a.by && a.by.t !== (SGB.att ?? 0) && a.by.x >= 1000 && a.by.x <= 1050) d *= 1.3;   // výstrel z hradieb
            d *= Math.min(1.3, .55 + Math.hypot(a.vx, a.vy, a.vz) / 14);   // rýchlejšia strela zraní viac
            if (zone === 'horse' && !v.h) { d *= .6; zone = Math.random() < .5 ? 'legs' : 'horse'; }
            if (fr) { hitZ(v, d, null, { zone, type: 'p', ranged: 1 }); if (a.by && a.by.h) wbMsg(v.hp > 0 ? 'Trafil si vlastného vojaka!' : 'Zabil si vlastného vojaka!', '#ff9a80'); a.l = 0; a.hitU = v; a.hz = zr; break; }
            hitZ(v, d, a.by, { zone, type: 'p', ranged: 1 });
            a.l = 0; a.hitU = v; a.hz = zr; break;
        }
    }
    AR = AR.filter(a => a.l > 0);
}

// ---------- techniky ----------
/** Kryt útokom (chamber): hrdina práve začal úder v smere, odkiaľ ide úder nepriateľa → úder odrazí a jeho úder prejde. */
function chamber(att, def) {
    const C = CMB, sw = C.swing;
    if (!def.h || !sw || !att.lwd || sw.t < 6 || sw.d !== att.lwd) return false;
    att.stun = 45; att.wu = 0; att.as = null; blockFx(def, dirTo(def, att), 0, att); fx3({ k: 'chamber', x: def.x, y: def.y });
    wbMsg('Kryt útokom! Úder si odrazil vlastným úderom.', '#9fe08a'); HITSTOP = Math.max(HITSTOP, 5);
    return true;
}
/** Kopnutie (kláves Y): zapotáca nepriateľa pred tebou a prerazí jeho kryt. */
function heroKick(u) {
    const C = CMB; if (!kd('kick') || (C.kick || 0) > 0 || heroMounted() || C.blk || C.st < 8) return;
    C.kick = 60; C.kickT = 16; C.st -= 8;
    const t = U.filter(v => v.t && v.hp > 0 && !v.boss && Math.hypot(v.x - u.x, v.y - u.y) < 18 + (v.r || 6) * .5 && angD(u.f, dirTo(u, v)) < .7).sort((a, b) => Math.hypot(a.x - u.x, a.y - u.y) - Math.hypot(b.x - u.x, b.y - u.y))[0];
    if (!t) return;
    if (heavy(t)) { wbMsg('Kopnúť trolla? Ani sa nepohol.', '#ff9a80'); return; }
    const a = dirTo(u, t); t.x += Math.cos(a) * 7; t.y += Math.sin(a) * 7; t.stun = 34; t.wu = 0;
    hitZ(t, 2, u, { zone: 'torso', type: 'b', noWp: 1 });
    wbMsg('Kopnutie! Nepriateľ sa zapotácal – kryt má prelomený.', '#e8d8a8');
}
/** Sek zboku sa zarazí o hradby alebo o vlastného vojaka v ceste. */
function swingBlocked(u, d, reach) {
    if (d !== 'l' && d !== 'r') return null;
    const side = u.f + (d === 'l' ? -1 : 1) * .9, sx = u.x + Math.cos(side) * reach * .6, sy = u.y + Math.sin(side) * reach * .6;
    if (SGB && elevSim(sx, sy) !== elevSim(u.x, u.y)) return 'múr';
    for (const v of U) if (!v.t && !v.h && v.hp > 0 && Math.hypot(v.x - sx, v.y - sy) < (v.r || 6) + 2 && Math.hypot(v.x - u.x, v.y - u.y) < reach * .8) return 'vlastného vojaka';
    return null;
}
/** Koliesko myši: zbraň na blízko ↔ strelná zbraň (ak ju máš a máš strely). */
function wpnSwitch() {
    const C = CMB; if (mode !== 'battle') return;
    if (C.wpn === 'r') { C.wpn = 'm'; C.draw = 0; wbMsg('Zbraň na blízko', '#e8d8a8'); return; }
    if (!C.ammo0) { wbMsg('Nemáš strelnú zbraň.', '#ff9a80'); return; }
    if (!C.ammo) { wbMsg('Došli ti strely.', '#ff9a80'); return; }
    C.wpn = 'r'; C.rd = null; const RW = rangedW(); wbMsg(RW ? RW.n : 'Lovecký luk', '#e8d8a8');
}
/** Zbieranie šípov a štítu zo zeme prechodom. */
function pickups(u) {
    const C = CMB, RW = rangedW(), want = RW ? (RW.rt === 'xbow' ? 'bolt' : RW.rt === 'jav' ? 'jav' : 'arrow') : 'arrow';
    for (let i = GA.length - 1; i >= 0; i--) {
        const g = GA[i]; if (Math.hypot(g.x - u.x, g.y - u.y) > 8) continue;
        if (g.k === 'shield' && C.shMax && C.shp <= 0) { C.shp = C.shMax * .6; g.picked = 1; GA.splice(i, 1); wbMsg('Zdvihol si štít zo zeme.', '#9fe08a'); continue; }
        if (g.k === want && C.ammo0 && C.ammo < C.ammo0) { C.ammo++; g.picked = 1; GA.splice(i, 1); if (!C.pkMsg || C.pkMsg < tm) { C.pkMsg = tm + 120; wbMsg('Zbieraš strely zo zeme.', '#9fe08a'); } }
    }
}
/** Kôň hrdinu: zotrvačnosť (rozbeh, dobeh) a obratnosť podľa plemena. Vráti smer pohybu alebo null. */
function horseMove(u, mx, my, k, dt) {
    const C = CMB, H = typeof Soldiers !== 'undefined' ? Soldiers.GEAR.m[G.eq.m] || {} : {}, ri = 1 + .08 * csLv('ri'), man = (.11 - (H.s || 1) * .04) * ri, acc = (.013 + it('m').v * .004) * ri;   // Jazda: obratnejší kôň   // obratnosť a rozbeh: kôň sa rozbieha asi 1 s a v plnom cvale zatáča pomalšie
    if (C.rear > 0) { C.rear -= dt; C.mvS = 0; return null; }
    if (C.mvA == null) C.mvA = u.f;
    if (mx || my) {
        const want = Math.atan2(my, mx); let d = want - C.mvA; d = Math.atan2(Math.sin(d), Math.cos(d));
        C.mvA += Math.max(-man * dt, Math.min(man * dt, d)) * (Math.abs(d) > 2.4 && C.mvS < .4 ? 3 : 1) * (1 - .45 * Math.min(1, (C.mvS || 0) / Math.max(.6, u.sp)));
        C.mvS = Math.min(u.sp * k, (C.mvS || 0) + acc * dt * (Math.abs(d) > 1.6 ? .3 : 1));
    } else C.mvS = Math.max(0, (C.mvS || 0) - .05 * dt);
    if (C.mvS < .02) return null;
    u.x = Math.max(8, Math.min(BW - 8, u.x + Math.cos(C.mvA) * C.mvS * dt));
    u.y = Math.max(20, Math.min(BH - 8, u.y + Math.sin(C.mvA) * C.mvS * dt));
    return C.mvA;
}
/** Kôň hrdinu ako vo Warbande: thr = plyn (W +1, S -1), trn = otáčanie (A -1, D +1). Kôň ide len smerom svojej hlavy, cúva pomaly, myš otáča iba jazdca. Vráti smer pohybu alebo null. */
function horseDrive(u, thr, trn, dt) {
    const C = CMB, H = typeof Soldiers !== 'undefined' ? Soldiers.GEAR.m[G.eq.m] || {} : {}, ri = 1 + .08 * csLv('ri'), man = (.075 - (H.s || 1) * .02) * ri, acc = (.013 + it('m').v * .004) * ri;
    if (C.rear > 0) { C.rear -= dt; C.mvS = 0; return null; }
    if (C.mvA == null) C.mvA = u.f;
    let v = C.mvS || 0; const top = u.sp, back = -.22 * u.sp;
    if (thr > 0) v = v < 0 ? Math.min(0, v + .06 * dt) : Math.min(top, v + acc * dt * thr);   // rozbeh asi za sekundu
    else if (thr < 0) v = v > 0 ? Math.max(0, v - .045 * dt) : Math.max(back, v - .012 * dt);   // brzda, potom pomalé cúvanie
    else v = v > 0 ? Math.max(0, v - .012 * dt) : Math.min(0, v + .03 * dt);   // bez plynu kôň dobieha
    if (trn) { const f = Math.min(1, Math.abs(v) / Math.max(.6, u.sp)); C.mvA += trn * man * dt * (.55 + .45 * Math.min(1, f * 3)) * (1 - .4 * f); }   // na mieste a v cvale sa otáča pomalšie ako v kluse
    C.mvA = Math.atan2(Math.sin(C.mvA), Math.cos(C.mvA)); C.mvS = v;
    if (Math.abs(v) < .02) return null;
    u.x = Math.max(8, Math.min(BW - 8, u.x + Math.cos(C.mvA) * v * dt));
    u.y = Math.max(20, Math.min(BH - 8, u.y + Math.sin(C.mvA) * v * dt));
    return v > 0 ? C.mvA : C.mvA + Math.PI;
}
/** Kôň vojaka AI: krok, ktorý AI urobila (z x0, y0), premení na jazdu dopredu – kôň sa otáča obmedzene, necúva ani neide bokom. */
function horseAI(u, x0, y0, dt) {
    if (u.hd == null) u.hd = u.f;
    const dx = u.x - x0, dy = u.y - y0, d = Math.hypot(dx, dy);
    if (d < .01) return;
    let df = Math.atan2(dy, dx) - u.hd; df = Math.atan2(Math.sin(df), Math.cos(df));
    u.hd += Math.max(-.065 * dt, Math.min(.065 * dt, df));
    const s = d * Math.max(.3, Math.cos(df));   // pri ostrej otočke kôň spomalí a zatáča oblúkom
    u.x = Math.max(10, Math.min(BW - 10, x0 + Math.cos(u.hd) * s)); u.y = Math.max(20, Math.min(BH - 10, y0 + Math.sin(u.hd) * s));
}
/** Jazdecký lukostrelec: krúži okolo nepriateľa vo vzdialenosti streľby a strieľa z koňa. */
const isHA = u => !!(u.uk && FU[u.uk] && FU[u.uk].b === 'c' && FU[u.uk].wp === 'bow');
function haAI(u, b, bd, dt) {
    u.cw = u.cw || (Math.random() < .5 ? 1 : -1);
    const a = dirTo(b, u), want = 140, rad = bd < want - 30 ? .9 : bd > want + 40 ? -.9 : 0, mv = a + u.cw * (Math.PI / 2 - rad * .8);
    u.x = Math.max(10, Math.min(BW - 10, u.x + Math.cos(mv) * u.sp * dt)); u.y = Math.max(22, Math.min(BH - 10, u.y + Math.sin(mv) * u.sp * dt));
    if (u.x < 30 || u.x > BW - 30 || u.y < 40 || u.y > BH - 30) u.cw = -u.cw;
    u.f = dirTo(u, b);
    if (u.c <= 0 && bd < WX.r * 1.2) aiBow(u, b, 7.5); else u.aim = 0;
}
/** Rýchlosť jednotiek (pre mierenie pred bežiaceho). */
function trackVel(dt) { for (const u of U) { if (u.rear > 0) u.rear -= dt; if (u.px3 != null) { u.vx3 = (u.x - u.px3) / Math.max(.3, dt); u.vy3 = (u.y - u.py3) / Math.max(.3, dt); } u.px3 = u.x; u.py3 = u.y; } }
/** Po smrti: štít ostane ležať na zemi (dá sa zdvihnúť). */
function dropOnDeath(u) { const s = specU(u); if (s && s.shield && GA.length < 400) GA.push({ x: u.x + 4, y: u.y + 3, k: 'shield' }); }
