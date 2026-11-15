/*
 * Výpravy: bossovia a súboj veliteľov.
 * Bossovia (BOSSES): Balrog pod Moriou (miesto Brána Morie), Kráľ trollov (Trollie lesy), Nazgûl na okrídlenej šelme
 *   (lieta po mape a útočí z neba; ukryť sa dá v hrade) a drak Hrôzozub zo Šedých hôr (miesto Dračia hora).
 *   Každý má vlastnú bitku s ohlásenými útokmi (červená plocha – uhni!), veľkú lištu zdravia a jedinečnú relikviu (G.relic):
 *   Plameň z hlbín (+8 % útok), Koruna trollieho kráľa (+30 zdravia), Pierko šelmy (nepriateľ začína s nižšou morálkou),
 *   Dračia šupina (−8 % prijaté zranenia).
 * Súboj veliteľov: lorda vo vojne môžeš na mape vyzvať na súboj. Výhra zlomí morálku jeho vojska v najbližšej bitke (a sláva +1),
 *   prehra zlomí tvoju.
 */
const BOSSES = {
    balrog: { n: 'Balrog z hlbín', hp: 3000, d: 30, sp: .85, r: 26, minions: 14, kind: 'orcs', gold: 600, ren: 5, relic: 'Plameň z hlbín', rd: '+8 % útok hrdinu' },
    trollking: { n: 'Kráľ trollov', hp: 1800, d: 26, sp: .8, r: 18, minions: 4, trolls: 1, gold: 400, ren: 3, relic: 'Koruna trollieho kráľa', rd: '+30 zdravia hrdinu' },
    fell: { n: 'Nazgûl na okrídlenej šelme', hp: 1500, d: 24, sp: 1.6, r: 20, minions: 4, kind: 'orcs', gold: 300, ren: 4, relic: 'Pierko okrídlenej šelmy', rd: 'nepriatelia začínajú bitku s nižšou morálkou' },
    dragon: { n: 'Drak Hrôzozub', hp: 4000, d: 34, sp: .9, r: 30, minions: 0, gold: 2000, ren: 6, relic: 'Dračia šupina', rd: 'o 8 % menšie zranenia' }
};
const relic = k => !!(G && G.relic && G.relic[k]);
/** Začne bitku s bossom k. */
function bossBattle(k) {
    const B = BOSSES[k];
    startBattle({ n: Math.max(1, B.minions), f: 9, nm: B.n, boss: k, kind: B.kind, trolls: B.trolls });
}
/** Boss na bojisku (volá startBattle). */
function makeBoss(k) {
    const B = BOSSES[k], u = mkBase(1, 't', 9);
    Object.assign(u, { boss: k, hp: B.hp, mh: B.hp, d: B.d, sp: B.sp * .88, bs: B.sp * .88, r: B.r, x: BW - 260, y: BH / 2, cd: 90, nAtk: 0, f: Math.PI });
    return u;
}
const bossAlive = () => U && U.find(u => u.boss && u.hp > 0);
/** AI bossa: pohyb k cieľu, ohlásené útoky (kužeľ, kruh, čiara), let draka a nálet šelmy. Vráti true (ťah je hotový). */
function bossAI(u, b, dt) {
    if (u.fly > 0) {   // vo vzduchu: nezraniteľný, letí nad cieľ a potom pristane
        u.fly -= dt;
        const h = b || U[0], dx = h.x - u.x, dy = h.y - u.y, d = Math.hypot(dx, dy) || 1;
        if (d > 8) { u.x += dx / d * Math.min(d, 4.5 * dt); u.y += dy / d * Math.min(d, 4.5 * dt); }
        if (u.fly <= 0) { u.fly = 0; u.atk = { k: 'circle', x: u.x, y: u.y, r: 90, t: 40, t0: 40, dmg: u.d * 1.4, kb: 18 }; }
        return true;
    }
    if (u.atk) {
        u.atk.t -= dt;
        if (u.atk.k === 'line' && u.atk.t <= 0) { u.x = u.atk.x2; u.y = u.atk.y2; }   // nálet šelmy: preletí čiaru
        if (u.atk.t <= 0) { bossStrike(u, u.atk); u.atk = null; u.cd = u.boss === 'dragon' ? 70 : 55; }
        return true;
    }
    if (!b) return true;
    const bd = Math.hypot(b.x - u.x, b.y - u.y), a = dirTo(u, b);
    u.f = a; u.cd -= dt;
    if (bd > u.r + 30) { u.x += Math.cos(a) * u.sp * .65 * dt; u.y += Math.sin(a) * u.sp * .65 * dt; }
    if (u.cd > 0) return true;
    u.nAtk++;
    const k = u.boss, T = (t, o) => { u.atk = { t, t0: t, ...o }; };
    if (k === 'balrog') { if (u.nAtk % 3 === 0) T(55, { k: 'circle', x: u.x, y: u.y, r: 95, dmg: u.d * 1.2, fire: 1 }); else T(42, { k: 'cone', x: u.x, y: u.y, a, len: 150, w: .45, dmg: u.d * 1.3, fire: 1 }); }
    else if (k === 'trollking') { if (bd < 90 || u.nAtk % 2) T(45, { k: 'circle', x: u.x, y: u.y, r: 85, dmg: u.d, kb: 22 }); else T(36, { k: 'cone', x: u.x, y: u.y, a, len: 95, w: .6, dmg: u.d * 1.3, kb: 12 }); }
    else if (k === 'fell') { const len = Math.min(320, bd + 80); T(48, { k: 'line', x: u.x, y: u.y, x2: Math.max(30, Math.min(BFW - 30, u.x + Math.cos(a) * len)), y2: Math.max(30, Math.min(BFH - 30, u.y + Math.sin(a) * len)), w: 34, dmg: u.d * 1.4, kb: 14 }); }
    else if (k === 'dragon') { if (u.nAtk % 4 === 0) { u.fly = 130; TS = { s: 'Drak vzlietol – sleduj, kam dopadne!', l: 140 }; } else if (u.nAtk % 2) T(50, { k: 'cone', x: u.x, y: u.y, a, len: 230, w: .32, dmg: u.d * 1.5, fire: 1 }); else T(38, { k: 'circle', x: u.x, y: u.y, r: 80, dmg: u.d, kb: 16 }); }
    return true;
}
/** Je bod v ploche útoku? */
function inAtk(A, x, y) {
    if (A.k === 'circle') return Math.hypot(x - A.x, y - A.y) < A.r;
    if (A.k === 'cone') { const d = Math.hypot(x - A.x, y - A.y); return d < A.len && angD(A.a, Math.atan2(y - A.y, x - A.x)) < A.w; }
    if (A.k === 'line') { const dx = A.x2 - A.x, dy = A.y2 - A.y, L = Math.hypot(dx, dy) || 1, t = Math.max(0, Math.min(1, ((x - A.x) * dx + (y - A.y) * dy) / (L * L))); return Math.hypot(x - (A.x + dx * t), y - (A.y + dy * t)) < A.w; }
    return false;
}
function bossStrike(u, A) {
    SHAKE = Math.max(SHAKE, 3);
    if (typeof fx3 === 'function') fx3({ k: 'boss', A: { ...A }, b: u.boss });
    snd('hb');
    for (let i = 0; i < 18; i++) { const px = A.k === 'line' ? A.x + (A.x2 - A.x) * i / 18 : A.x + (Math.random() - .5) * (A.r || A.len || 60), py = A.k === 'line' ? A.y + (A.y2 - A.y) * i / 18 : A.y + (Math.random() - .5) * (A.r || 60); PT.push({ x: px, y: py, vx: Math.random() * 2 - 1, vy: -1 - Math.random() * 2, g: .05, l: 26, c: A.fire ? '#ff7a20' : '#c8b48c' }); }
    for (const v of U) {
        if (v.t === u.t || v.hp <= 0 || v.fled || !inAtk(A, v.x, v.y)) continue;
        let d = A.dmg * (.85 + Math.random() * .3);
        if (v.h && CMB.blk && CMB.shp > 0 && !A.fire) { d *= .5; CMB.shp = Math.max(0, CMB.shp - 20); CMB.st = Math.max(0, CMB.st - 15); blockFx(v, dirTo(v, u), 1); }
        if (!v.h) d *= 1.5;   // obyčajní vojaci padajú rýchlo
        hit(v, d, u);
        if (A.kb && v.hp > 0) { const a = dirTo(u, v); v.x += Math.cos(a) * A.kb; v.y += Math.sin(a) * A.kb; if (!v.h) v.stun = 25; }
    }
}
/** Odmena za porazeného bossa (volá endBattle pri výhre). */
function bossReward(k) {
    const B = BOSSES[k]; G.relic = G.relic || {}; G.bossDone = G.bossDone || {};
    G.bossDone[k] = G.day; G.gold += B.gold; G.ren += B.ren;
    const nw = !G.relic[k]; G.relic[k] = 1;
    G.tro = G.tro || []; G.tro.push(B.relic);
    lg('Porazil si: ' + B.n + '! Relikvia: ' + B.relic + ' (' + B.rd + ').');
    return B.n + ' padol! Získal si ' + B.gold + ' zlata, slávu +' + B.ren + (nw ? ' a relikviu ' + B.relic + ' (' + B.rd + ')' : '') + '.';
}

// ---------- okrídlená šelma na mape ----------
/** Denne: Nazgûl na šelme vyletí z Minas Morgul (častejšie počas Ťaženia Nazgûlov) a hľadá hrdinu. */
function fellDaily() {
    if (G.fell) { if (G.day - G.fell.d0 > 4) { G.fell = null; lg('Okrídlená šelma sa vrátila do Mordoru.'); } return; }
    if (G.day < 25 || (G.bossDone && G.bossDone.fell && G.day - G.bossDone.fell < 40) || bloc(G.fac) === 1 && G.fac !== 6) return;
    if (Math.random() < (typeof worldEv === 'function' && worldEv('nazgul') ? .25 : .03)) {
        const t = TW.find(t => t.n === 'Minas Morgul') || TW.find(t => t.f === 2); if (!t) return;
        G.fell = { x: t.x, y: t.y - 60, d0: G.day };
        lg('Nad Mordorom vzlietla okrídlená šelma s Nazgûlom. Hľadá ťa.'); TS = { s: 'Okrídlená šelma ťa hľadá! Ukryť sa môžeš v hrade.', l: 320 };
    }
}
function fellTick(dt) {
    const F = G.fell; if (!F) return;
    const dx = G.x - F.x, dy = G.y - F.y, d = Math.hypot(dx, dy);
    if (G.camp && G.stay) { F.x -= dx / d * 2 * dt; F.y -= dy / d * 2 * dt; return; }   // hrdina v hrade: šelma krúži opodiaľ
    F.x += dx / d * 4.2 * dt; F.y += dy / d * 4.2 * dt;
    if (d < 80 && mode === 'map') { G.fell = null; mode = 'town'; show('Útok z neba!', 'Tieň zakryl slnko. Okrídlená šelma sa strmhlav vrhá na tvoju družinu a Nazgûl vytasil meč.'); btn('Postaviť sa (boj s bossom)', () => { ov.classList.add('hide'); bossBattle('fell'); }, 0, 'sword'); }
}

// ---------- súboj veliteľov ----------
/** Stretnutie s nepriateľským lordom na mape: rovno do boja, alebo ho vyzvať na súboj (raz za deň). */
function meetFoe(e, al) {
    if (!e.nm || e.nz || e.f === 9 || e.metD === G.day || typeof show !== 'function') return startBattle(e, al);
    e.metD = G.day; mode = 'town'; PORTRAIT = Portraits.forLord(e);
    show('Stretnutie: ' + e.nm + ' (' + FN[e.f] + ')', e.nm + ' zastavil svoje vojsko (' + Math.ceil(e.n) + ' mužov) na dohľad od tvojho.' + (e.mem && e.mem.length ? ' Pamätá si: ' + memText(e) : ''));
    btn('Do boja!', () => { ov.classList.add('hide'); startBattle(e, al); }, 0, 'attack');
    btn('Vyzvať ' + e.nm + ' na súboj (víťaz zlomí odvahu druhého vojska)', () => { ov.classList.add('hide'); duelLord(e); }, 0, 'sword');
}
/** Vyzve lorda e na súboj: hrdina sám proti nemu. */
function duelLord(e) {
    startBattle({ n: 1, f: e.f, nm: e.nm, ar: 1, duel: e.id, t: TW[e.home] || TW[0] });
    U = U.filter(u => !u.t);
    const u = mk(1, 'v', e.f); Object.assign(u, { hp: 160 + Math.min(240, e.n * 3), mh: 160 + Math.min(240, e.n * 3), d: 12 + Math.min(10, e.n / 6), cmd: 1, x: BW / 2 + 140, y: BH / 2, duelist: 1 });
    U.push(u); U[0].x = BW / 2 - 140; U[0].y = BH / 2;
    CMB.n0 = [1, 1];
}
/** Koniec súboja (volá endBattle). */
function duelEnd(win, L) {
    const e = E.find(o => o.id === L.duel);
    mode = 'over'; od.style.display = 'none'; tb.style.display = 'flex'; roar(0); G.safe = 120;
    G.hp = Math.max(20, U[0].hp);
    if (win) { G.duel = { id: L.duel, win: 1 }; G.ren++; if (e) lordMem(e, 'Porazil si ma v súboji.', -4); lg('Porazil si ' + L.nm + ' v súboji pred bitkou.'); show('Víťazstvo v súboji', L.nm + ' leží v prachu. Jeho muži stratili odvahu – ak teraz zaútočíš, budú utekať skôr. Sláva +1.'); if (e) btn('Zaútočiť na jeho zlomené vojsko', () => { ov.classList.add('hide'); mode = 'map'; startBattle(e); }, 0, 'attack'); btn('Nechať ho odísť', () => { ov.classList.add('hide'); mode = 'map'; }, 0, 'door'); }
    else { G.duel = { id: L.duel, win: 0 }; if (e) lordMem(e, 'Porazil som ťa v súboji.', 2); lg('Prehral si súboj s ' + L.nm + '.'); show('Prehra v súboji', L.nm + ' ťa zrazil k zemi a jeho muži jasajú. Tvoje vojsko bude v najbližšej bitke s ním neisté.'); btn('Pokračovať', () => { ov.classList.add('hide'); mode = 'map'; }, 0, 'door'); }
    upd();
}
