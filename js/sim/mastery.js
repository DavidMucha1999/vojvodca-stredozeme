/*
 * Rozvoj bojovníka ako vo Warbande (etapa 3): zdatnosti so zbraňami, bojové schopnosti a kôň ako bojovník.
 *   – Zdatnosti so zbraňami (G.wp): jednoručné, obojručné, kopije, luky, kuše, vrhacie – od 40 do 300. Rastú používaním:
 *     každý zásah hrdinu danou zbraňou pridá podľa spôsobeného zranenia (zabitie dvojnásobne), čím je zdatnosť vyššia, tým pomalšie.
 *     Na blízko: zranenie až +30 %, nápriah a zotavenie až o 20 % rýchlejšie. Strelné: zranenie až +20 %, rozptyl až o 40 % menší,
 *     luk sa napne až o 30 % rýchlejšie.
 *   – Bojové schopnosti (G.cs, 0 – 5): Silný úder, Silný výstrel, Železná koža, Štít, Atletika, Jazda. Body (G.bk) – 1 za každú
 *     novú úroveň; staršie uloženie dostane body za doterajšie úrovne. Okno Družina → Schopnosti alebo v hrade Hrdina a schopnosti.
 *   – Kôň ako bojovník: kôň v rýchlom pohybe zrazí pešiaka v ceste (zranenie podľa rýchlosti, pešiak sa zvalí, kôň spomalí),
 *     pred kopijníkom v šíku sa vzopne; po silnom zásahu sa kôň môže vzopnúť a na chvíľu zastaviť.
 */
const WP_N = { one: 'Jednoručné zbrane', two: 'Obojručné zbrane', pole: 'Kopije a zbrane na žrdi', bow: 'Luky', xbow: 'Kuše', jav: 'Vrhacie zbrane' };
const WP0 = 40, WPMAX = 300, CS_MAX = 5;
const CS = [
    ['ps', 'Silný úder', '+8 % zranenie zbraňou na blízko za stupeň'],
    ['pd', 'Silný výstrel', '+10 % zranenie lukom a vrhacími zbraňami za stupeň'],
    ['ir', 'Železná koža', '+8 zdravia za stupeň'],
    ['sh', 'Štít', 'štít vydrží o 10 % viac, kryje šípy širšie, dokonalý kryt má dlhšie okno'],
    ['at', 'Atletika', 'pešo o 4 % rýchlejší, o 10 % menší postih za ťažkú výbavu'],
    ['ri', 'Jazda', 'kôň o 3 % rýchlejší a obratnejší, vydrží o 10 % viac, silnejší náraz']
];
/** Doplní chýbajúce zdatnosti a body (nová hra aj staršie uloženie). */
function wpInit() {
    if (typeof G === 'undefined' || !G) return;
    G.wp = G.wp || {}; for (const k in WP_N) if (G.wp[k] == null) G.wp[k] = WP0;
    G.cs = G.cs || {};
    if (G.bk == null) G.bk = Math.max(0, (G.lv || 1) - 1);
}
const csLv = k => (typeof G !== 'undefined' && G && G.cs && G.cs[k]) || 0;
/** Zdatnosť pre zbraň na blízko v ruke hrdinu. */
function wpMelee() { const k = wkind(it('w')); return twoHand() || k === 'two' ? 'two' : k === 'spear' ? 'pole' : 'one'; }
const wpRanged = rt => rt === 'xbow' ? 'xbow' : rt === 'jav' ? 'jav' : 'bow';
/** 0 – 1: ako ďaleko je zdatnosť od začiatku k maximu. */
const wpF = k => { const v = typeof G !== 'undefined' && G && G.wp && G.wp[k] != null ? G.wp[k] : WP0; return Math.max(0, Math.min(1, (v - WP0) / (WPMAX - WP0))); };
/** Zranenie hrdinu na blízko: útok výbavy a úrovne × zdatnosť × Silný úder. */
const heroMeleeDmg = () => dmg() * (1 + .3 * wpF(wpMelee())) * (1 + .08 * csLv('ps'));
/** Násobok času nápriahu a zotavenia podľa zdatnosti. */
const wpTimeK = () => 1 - .2 * wpF(wpMelee());
/** Strelné zbrane: násobok zranenia, rozptylu a času napínania. */
const wpShotDmgK = rt => (1 + .2 * wpF(wpRanged(rt))) * (rt !== 'xbow' ? 1 + .1 * csLv('pd') : 1);
const wpSpreadK = rt => 1 - .4 * wpF(wpRanged(rt));
const wpDrawK = rt => 1 - .3 * wpF(wpRanged(rt));
/** Rast zdatnosti používaním (ako vo Warbande). */
function wpGain(k, dealt, killed) {
    if (typeof G === 'undefined' || !G || !(dealt > 0)) return;
    wpInit();
    const v = G.wp[k], g = Math.max(.15, Math.min(4, dealt / 12)) * (killed ? 2 : 1) * (1 - v / (WPMAX + 20)), v2 = Math.min(WPMAX, v + g);
    G.wp[k] = Math.round(v2 * 10) / 10;
    if (Math.floor(v2 / 10) > Math.floor(v / 10) && typeof wbMsg === 'function') wbMsg(WP_N[k] + ': ' + Math.floor(v2), '#9fe08a');
}
/** Pridá stupeň bojovej schopnosti za voľný bod. */
function csTake(k) {
    wpInit();
    if (!(G.bk > 0) || csLv(k) >= CS_MAX || !CS.some(c => c[0] === k)) return false;
    G.cs[k] = csLv(k) + 1; G.bk--;
    if (k === 'ir') G.hp = Math.min(mh(), (G.hp || 0) + 8);
    return true;
}
/** Rýchlosť hrdinu: hmotnosť výbavy (Atletika postih zmenšuje), Atletika pešo, Jazda na koni. */
const heroSpeedK = () => loadSpeed() * (heroMounted() ? 1 + .03 * csLv('ri') : 1 + .04 * csLv('at'));

// ---------- kôň ako bojovník ----------
/** Kôň hrdinu schytal zásah hd: pri silnom zásahu sa môže vzopnúť a zastaviť; pri malom zdraví hlásenie. */
function horseHurt(hd) {
    const C = CMB;
    if (hd > 5 && Math.random() < .35 && !(C.rear > 0)) { C.rear = 28; C.mvS = 0; C.run = 0; wbMsg('Kôň sa po zásahu vzopol!', '#ff9a80'); }
    if (C.horse > 0 && C.horse0 && C.horse < C.horse0 * .3 && !C.horseLow) { C.horseLow = 1; wbMsg('Tvoj kôň je ťažko ranený.', '#ff9a80'); }
}
/** Náraz koňa (ako vo Warbande): kôň v rýchlom pohybe zrazí pešiaka v ceste. Kopijník v šíku koňa zastaví. */
function horseBump(u) {
    const C = CMB; if (!heroMounted() || C.charging || C.rear > 0) return;
    const sp = C.mvS || 0, top = Math.max(.5, u.bs || u.sp); if (sp < top * .45 || C.mvA == null) return;
    const now = U[0].tt || 0;
    for (const v of U) {
        if (!v.t || v.hp <= 0 || v.boss || heavy(v) || mounted(v) || (v.bmpT || 0) > now) continue;
        if (Math.hypot(v.x - u.x, v.y - u.y) > u.r + (v.r || 6) + 4 || angD(C.mvA, dirTo(u, v)) > .7) continue;
        v.bmpT = now + 40;
        if (braced(v, u)) { C.rear = 40; C.mvS = 0; C.run = 0; blockFx(v, dirTo(v, u), 0, u); wbMsg('Kôň sa vzopol pred kopijou!', '#ff9a80'); return; }
        const k = Math.min(1.3, sp / top);
        hitZ(v, (3 + 10 * k) * (1 + .1 * csLv('ri')), u, { zone: 'torso', type: 'b', noWp: 1 });
        if (v.hp > 0) { v.x += Math.cos(C.mvA) * 10; v.y += Math.sin(C.mvA) * 10; v.stun = Math.max(v.stun || 0, 26); v.wu = 0; v.as = null; }
        C.mvS = sp * .75; SHAKE = Math.max(SHAKE, .8);
        cmbSay('bump', 'Náraz koňa: v rýchlom pohybe kôň zrazí pešiaka, ktorý mu stojí v ceste – ale spomalí. Kopijník v šíku koňa zastaví.', 180);
        return;
    }
}
