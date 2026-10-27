/*
 * Výbava u kováča: zbrane, brnenie, štíty, prilby a kone (aj legendárne).
 */
const SH = [
    { k: 'w', l: 'Zbraň', it: [{ n: "Železný meč", v: 15, p: 0 }, { n: "Oceľový meč", v: 20, p: 90 }, { n: "Rohanská kopija", v: 24, p: 160, r: 46 }, { n: "Dúnadanský meč", v: 31, p: 320 }] },
    { k: 'a', l: 'Brnenie', it: [{ n: "Kožený odev", v: 0, p: 0 }, { n: "Kolčuha", v: .25, p: 110 }, { n: "Gondorský plát", v: .45, p: 300 }] },
    { k: 's', l: 'Štít', it: [{ n: "Bez štítu", v: 0, p: 0 }, { n: "Drevený štít", v: .1, p: 50 }, { n: "Gondorský štít", v: .2, p: 140 }] },
    { k: 'h', l: 'Prilba', it: [{ n: "Kožená čiapka", v: 0, p: 0 }, { n: "Oceľová prilba", v: .06, p: 70 }, { n: "Gondorská prilba", v: .12, p: 200 }] },
    { k: 'm', l: 'Kôň', it: [{ n: "Pešo", v: 1.9, p: 0 }, { n: "Poník", v: 2.3, p: 80 }, { n: "Rohanský kôň", v: 2.9, p: 260 }] }
];
SH.find(s => s.k === 'w').it.push({ n: 'Elfský dlhý meč', v: 34, p: 450 }, { n: 'Trpasličia sekera z Ereboru', v: 37, p: 620 }, { n: 'Glamdring', v: 42, p: 900, fx: 'glow' }, { n: 'Plameňový meč', v: 46, p: 1300, fx: 'fire' }, { n: 'Andúril', v: 50, p: 1800, fx: 'glow' });
SH.find(s => s.k === 'a').it.push({ n: 'Elfská šupinová zbroj', v: .47, p: 550 }, { n: 'Trpasličí plát', v: .49, p: 800 }, { n: 'Mithrilová košeľa', v: .51, p: 1500, fx: 'glow' });
SH.find(s => s.k === 's').it.push({ n: 'Elfský štít', v: .21, p: 300 }, { n: 'Štít z Ereboru', v: .23, p: 600, fx: 'glow' });
SH.find(s => s.k === 'h').it.push({ n: 'Elfská prilba', v: .13, p: 350 }, { n: 'Prilba strážcu Citadely', v: .14, p: 700, fx: 'glow' });
SH.find(s => s.k === 'm').it.push({ n: 'Obrnený bojový kôň', v: 3.2, p: 500 }, { n: 'Mearas', v: 3.6, p: 1200, fx: 'glow' });
