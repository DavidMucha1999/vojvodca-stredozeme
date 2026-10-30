/*
 * Rasy hrdinu. Hráč si najprv vyberie stranu (0 dobro, 1 zlo) a potom rasu tej strany.
 * Každá rasa má bonusy (fx upraví G na začiatku), predvolený vzhľad pre portrét (look) a mierku postavičky (sc).
 * skins: ponúkané odtiene pleti; hairs/beards: účesy a brady, ktoré rasa používa; ears: tvar uší pre portrét.
 */
const RACES = {
    human:  { n: 'Človek', side: 0, d: 'Dúnadan či Rohir – vyvážený bojovník. Presviedčanie +1, +25 zlata.', fx: G => { G.s.pr++; G.gold += 25; },
              look: { race: 'human' }, skins: [0, 1, 3], sc: 1 },
    elf:    { n: 'Elf', side: 0, d: 'Ľahký a presný. Obratnosť +1, lukostreľba +1, odolnosť −1; vidí ďaleko (dostrel lukostrelcov +10 %).', fx: G => { G.s.ob++; G.s.ls++; G.s.od = Math.max(0, G.s.od - 1); G.relf = 1; },
              look: { race: 'elf', skin: 3, hair: 'long', hcol: '#e8d8a0', beard: 'none', eyes: '#4a8ad0' }, skins: [0, 3], sc: 1.02 },
    dwarf:  { n: 'Trpaslík', side: 0, d: 'Pevný ako kameň. Sila +1, odolnosť +1, obratnosť −1, zdravie +15, +20 zlata z Ereboru.', fx: G => { G.s.st++; G.s.od++; G.s.ob = Math.max(0, G.s.ob - 1); G.hp += 15; G.gold += 20; },
              look: { race: 'dwarf', skin: 1, hair: 'long', hcol: '#b05a20', beard: 'braided', eyes: '#4a4a3a' }, skins: [0, 1], sc: .86 },
    hobbit: { n: 'Hobit', side: 0, d: 'Nenápadný a vytrvalý. Obratnosť +2, presviedčanie +1, sila −1, zdravie −10; jedlo a pivo lacnejšie (ceny −5 %).', fx: G => { G.s.ob += 2; G.s.pr++; G.s.st = Math.max(0, G.s.st - 1); G.hp -= 10; G.tmerc = 1; },
              look: { race: 'hobbit', skin: 0, hair: 'curly', hcol: '#8a5a30', beard: 'none', eyes: '#5a7a5a' }, skins: [0, 1], sc: .8 },
    orc:    { n: 'Ork', side: 1, d: 'Zrodený pre vojnu. Sila +1, strach +2, zdravie +10, presviedčanie −1.', fx: G => { G.s.st++; G.fear = (G.fear || 0) + 2; G.hp += 10; G.s.pr = Math.max(0, G.s.pr - 1); },
              look: { race: 'orc', hair: 'bald', beard: 'none', eyes: '#e8c040', angry: 1 }, skins: ['#5f7a4a', '#6a6a52', '#4a5a3a'], sc: 1 },
    uruk:   { n: 'Uruk-hai', side: 1, d: 'Sarumanov výtvor. Sila +2, odolnosť +1, zdravie +20, presviedčanie −2.', fx: G => { G.s.st += 2; G.s.od++; G.hp += 20; G.s.pr = Math.max(0, G.s.pr - 2); },
              look: { race: 'uruk', hair: 'lank', hcol: '#1a1410', beard: 'none', eyes: '#e8c040', angry: 1, paint: 1 }, skins: ['#3e4a34', '#4a3a30'], sc: 1.08 },
    dark:   { n: 'Haradčan', side: 1, d: 'Jazdec z juhu. Lukostreľba +1, obratnosť +1, +30 zlata z obchodu s korením.', fx: G => { G.s.ls++; G.s.ob++; G.gold += 30; },
              look: { race: 'dark', hair: 'short', hcol: '#1a1410', beard: 'full', eyes: '#2a1a10', turban: '#c84a2a' }, skins: ['#7a4a2e', '#5a3a22'], sc: 1 },
    east:   { n: 'Easterling', side: 1, d: 'Bojovník z Rhûnu. Odolnosť +1, sila +1, +20 zlata.', fx: G => { G.s.od++; G.s.st++; G.gold += 20; },
              look: { race: 'east', skin: 1, hair: 'tied', hcol: '#1a1410', beard: 'mustache', eyes: '#3a2a1a' }, skins: [1, 0], sc: 1 },
    numen:  { n: 'Čierny Númenorejec', side: 1, d: 'Pán z Umbaru v službách Tieňa. Presviedčanie +2, sila +1, strach +1.', fx: G => { G.s.pr += 2; G.s.st++; G.fear = (G.fear || 0) + 1; },
              look: { race: 'human', skin: 3, hair: 'long', hcol: '#1a1410', beard: 'goatee', eyes: '#6a7a7a' }, skins: [3, 0], sc: 1.02 }
};
const raceName = () => (G && G.race && RACES[G.race] ? RACES[G.race].n : 'Človek');
