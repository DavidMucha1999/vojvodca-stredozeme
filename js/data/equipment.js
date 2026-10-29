/*
 * Výbava u kováča: zbrane, brnenie, štíty, prilby a kone (aj legendárne).
 * Prvá vec v každom zozname je základná (máš ju od začiatku).
 * Ostatné predávajú len hrady jednej strany: veci bez z = hrady dobra, z: 1 = hrady zla (temná výbava).
 * Vzhľad každej veci je v js/render/soldiers.js (GEAR) v rovnakom poradí.
 * v = sila (útok / ochrana / rýchlosť), p = cena, r = dosah, fx = žiara (glow, fire, dark).
 */
const SH = [
    { k: 'w', l: 'Zbraň', it: [{ n: "Železný meč", v: 15, p: 0 }, { n: "Oceľový meč", v: 20, p: 90 }, { n: "Rohanská kopija", v: 24, p: 160, r: 46 }, { n: "Dúnadanský meč", v: 31, p: 320 }] },
    { k: 'a', l: 'Brnenie', it: [{ n: "Kožený odev", v: 0, p: 0 }, { n: "Kolčuha", v: .25, p: 110 }, { n: "Gondorský plát", v: .45, p: 300 }] },
    { k: 's', l: 'Štít', it: [{ n: "Bez štítu", v: 0, p: 0 }, { n: "Drevený štít", v: .1, p: 50 }, { n: "Gondorský štít", v: .2, p: 140 }] },
    { k: 'h', l: 'Prilba', it: [{ n: "Kožená čiapka", v: 0, p: 0 }, { n: "Oceľová prilba", v: .06, p: 70 }, { n: "Gondorská prilba", v: .12, p: 200 }] },
    { k: 'm', l: 'Kôň', it: [{ n: "Pešo", v: 1.9, p: 0 }, { n: "Poník", v: 2.3, p: 80 }, { n: "Rohanský kôň", v: 2.9, p: 260 }] }
];
const shOf = k => SH.find(s => s.k === k).it;
shOf('w').push({ n: 'Elfský dlhý meč', v: 34, p: 450 }, { n: 'Trpasličia sekera z Ereboru', v: 37, p: 620 }, { n: 'Glamdring', v: 42, p: 900, fx: 'glow' }, { n: 'Plameňový meč', v: 46, p: 1300, fx: 'fire' }, { n: 'Andúril', v: 50, p: 1800, fx: 'glow' });
shOf('a').push({ n: 'Elfská šupinová zbroj', v: .47, p: 550 }, { n: 'Trpasličí plát', v: .49, p: 800 }, { n: 'Mithrilová košeľa', v: .51, p: 1500, fx: 'glow' });
shOf('s').push({ n: 'Elfský štít', v: .21, p: 300 }, { n: 'Štít z Ereboru', v: .23, p: 600, fx: 'glow' });
shOf('h').push({ n: 'Elfská prilba', v: .13, p: 350 }, { n: 'Prilba strážcu Citadely', v: .14, p: 700, fx: 'glow' });
shOf('m').push({ n: 'Obrnený bojový kôň', v: 3.2, p: 500 }, { n: 'Mearas', v: 3.6, p: 1200, fx: 'glow' });

// --- temná výbava (len v hradoch Mordoru, Isengardu, Haradu a Rhûnu) ---
shOf('w').push({ n: 'Orkská šabľa', v: 20, p: 90, z: 1 }, { n: 'Morgulská kopija', v: 24, p: 160, r: 46, z: 1 }, { n: 'Uruk-haiský meč', v: 31, p: 320, z: 1 }, { n: 'Sekera Olog-haia', v: 35, p: 480, z: 1 },
    { n: 'Morgulská čepeľ', v: 42, p: 900, fx: 'dark', z: 1 }, { n: 'Gothmogov ohnivý palcát', v: 46, p: 1300, fx: 'fire', z: 1 }, { n: 'Sauronov palcát', v: 50, p: 1800, fx: 'dark', z: 1 });
shOf('a').push({ n: 'Orkská krúžková zbroj', v: .25, p: 110, z: 1 }, { n: 'Čierny plát Uruk-haiov', v: .45, p: 300, z: 1 }, { n: 'Haradská šupinová zbroj', v: .47, p: 550, z: 1 },
    { n: 'Plát Čiernej veže', v: .49, p: 800, z: 1 }, { n: 'Zbroj nazgûla', v: .51, p: 1500, fx: 'dark', z: 1 });
shOf('s').push({ n: 'Orkský štít', v: .1, p: 50, z: 1 }, { n: 'Štít Bielej ruky', v: .2, p: 140, z: 1 }, { n: 'Haradský štít', v: .21, p: 300, z: 1 }, { n: 'Štít Oka', v: .23, p: 600, fx: 'dark', z: 1 });
shOf('h').push({ n: 'Orkská prilba', v: .06, p: 70, z: 1 }, { n: 'Prilba Bielej ruky', v: .12, p: 200, z: 1 }, { n: 'Maska z Rhûnu', v: .13, p: 350, z: 1 }, { n: 'Prilba Saurónových úst', v: .14, p: 700, fx: 'dark', z: 1 });
shOf('m').push({ n: 'Mladý varg', v: 2.3, p: 80, z: 1 }, { n: 'Varg', v: 2.9, p: 260, z: 1 }, { n: 'Čierny kôň Mordoru', v: 3.2, p: 500, z: 1 }, { n: 'Kôň nazgûla', v: 3.6, p: 1200, fx: 'dark', z: 1 });

/** Strana výbavy, ktorú predáva hrad frakcie f: 1 = zlo, 0 = dobro. Tvoje vlastné hrady predávajú výbavu tvojej strany. */
const shopSide = f => bloc(f === 6 ? G.fac : f);
