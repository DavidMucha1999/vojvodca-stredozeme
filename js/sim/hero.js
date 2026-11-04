/*
 * Hrdina: hodnosti, aktívna výbava, zdravie, útok a ochrana.
 */
const RK = [0, 2, 5, 9, 14], rank = () => G.king ? 'Kráľ' : ['Tulák', 'Rytier', 'Šľachtic', 'Barón', 'Gróf'][RK.filter(x => G.ren >= x).length - 1];
const it = k => SH.find(s => s.k === k).it[G.eq[k]];
const mh = () => 100 + 10 * (G.lv - 1) + 15 * G.s.od, dmg = () => (it('w').v + 2 * (G.lv - 1) + 3 * G.s.st + (G.tro ? G.tro.length : 0)) * (G.ring === 1 ? 1.4 : 1) * (G.perk && G.perk.sermiar ? 1.1 : 1), red = () => (1 - it('a').v - it('s').v - it('h').v) * (G.ring === 1 ? .7 : 1);
