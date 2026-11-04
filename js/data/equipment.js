/*
 * Výbava u kováča: zbrane, brnenie, štíty, prilby a kone (aj legendárne).
 * Existuje len výbava dobra (veci bez z) a výbava zla (z: 1). Hrady dobra predávajú výbavu dobra,
 * hrady zla výbavu zla. Veci s cenou 0 sú základné: hrdina dobra začína s prvou vecou v zozname,
 * hrdina zla so základnou vecou zla. "Bez štítu" a "Pešo" nie sú výbava, majú ich obe strany.
 * Vzhľad každej veci je v js/render/soldiers.js (GEAR) v rovnakom poradí.
 * v = sila (útok / ochrana / rýchlosť), p = cena, r = dosah, fx = iskry v bitke (glow, light = svetlo dobra, fire, dark = temnota zla),
 * aura = žiarivá aura okolo hrdinu v bitke (len najlepšia zbraň).
 */
const SH = [
    { k: 'w', l: 'Zbraň', it: [{ n: "Železný meč", v: 15, p: 0 }, { n: "Meč Gondorskej stráže", v: 20, p: 90 }, { n: "Rohanská kopija", v: 24, p: 160, r: 46 }, { n: "Dúnadanský meč", v: 31, p: 320 }] },
    { k: 'a', l: 'Brnenie', it: [{ n: "Kožený odev", v: 0, p: 0 }, { n: "Rohanská krúžková zbroj", v: .25, p: 110 }, { n: "Gondorský plát", v: .45, p: 300 }] },
    { k: 's', l: 'Štít', it: [{ n: "Bez štítu", v: 0, p: 0 }, { n: "Rohanský štít", v: .1, p: 50 }, { n: "Gondorský štít", v: .2, p: 140 }] },
    { k: 'h', l: 'Prilba', it: [{ n: "Kožená čiapka", v: 0, p: 0 }, { n: "Rohanská prilba", v: .06, p: 70 }, { n: "Gondorská prilba", v: .12, p: 200 }] },
    { k: 'm', l: 'Kôň', it: [{ n: "Pešo", v: 1.9, p: 0 }, { n: "Poník zo Shiru", v: 2.3, p: 80 }, { n: "Rohanský kôň", v: 2.9, p: 260 }] }
];
const shOf = k => SH.find(s => s.k === k).it;
shOf('w').push({ n: 'Orcrist', v: 34, p: 450 }, { n: 'Trpasličia sekera z Ereboru', v: 37, p: 620 }, { n: 'Glamdring', v: 42, p: 900, fx: 'glow' }, { n: 'Plameň Anoru', v: 46, p: 1300, fx: 'fire' }, { n: 'Andúril', v: 50, p: 1800, fx: 'light', aura: 1 });
shOf('a').push({ n: 'Galadrimská šupinová zbroj', v: .47, p: 550 }, { n: 'Plát z Ereboru', v: .49, p: 800 }, { n: 'Mithrilová košeľa', v: .51, p: 1500, fx: 'glow' });
shOf('s').push({ n: 'Galadrimský štít', v: .21, p: 300 }, { n: 'Štít z Ereboru', v: .23, p: 600, fx: 'glow' });
shOf('h').push({ n: 'Galadrimská prilba', v: .13, p: 350 }, { n: 'Okrídlená koruna Gondoru', v: .14, p: 700, fx: 'light' });
shOf('m').push({ n: 'Gondorský bojový kôň', v: 3.2, p: 500 }, { n: 'Mearas', v: 3.6, p: 1200, fx: 'light' });

// --- výbava dobra (vyššie): len v hradoch Gondoru, Rohanu, Ereboru a Lothlórienu ---
// --- výbava zla: hrady Mordoru, Isengardu, Haradu a Rhûnu ---
shOf('w').push({ n: 'Orkská šabľa', v: 20, p: 90, z: 1 }, { n: 'Morgulská kopija', v: 24, p: 160, r: 46, z: 1 }, { n: 'Uruk-haiský meč', v: 31, p: 320, z: 1 }, { n: 'Sekera Olog-haia', v: 35, p: 480, z: 1 },
    { n: 'Morgulská čepeľ', v: 42, p: 900, fx: 'dark', z: 1 }, { n: 'Gothmogov ohnivý palcát', v: 46, p: 1300, fx: 'fire', z: 1 }, { n: 'Sauronov palcát', v: 50, p: 1800, fx: 'dark', z: 1 });
shOf('a').push({ n: 'Orkská krúžková zbroj', v: .25, p: 110, z: 1 }, { n: 'Čierny plát Uruk-haiov', v: .45, p: 300, z: 1 }, { n: 'Haradská šupinová zbroj', v: .47, p: 550, z: 1 },
    { n: 'Plát Čiernej veže', v: .49, p: 800, z: 1 }, { n: 'Zbroj nazgûla', v: .51, p: 1500, fx: 'dark', z: 1 });
shOf('s').push({ n: 'Orkský štít', v: .1, p: 50, z: 1 }, { n: 'Štít Bielej ruky', v: .2, p: 140, z: 1 }, { n: 'Haradský štít', v: .21, p: 300, z: 1 }, { n: 'Štít Oka', v: .23, p: 600, fx: 'dark', z: 1 });
shOf('h').push({ n: 'Orkská prilba', v: .06, p: 70, z: 1 }, { n: 'Prilba Bielej ruky', v: .12, p: 200, z: 1 }, { n: 'Maska z Rhûnu', v: .13, p: 350, z: 1 }, { n: 'Prilba Saurónových úst', v: .14, p: 700, fx: 'dark', z: 1 });
shOf('m').push({ n: 'Mladý varg', v: 2.3, p: 80, z: 1 }, { n: 'Varg', v: 2.9, p: 260, z: 1 }, { n: 'Čierny kôň Mordoru', v: 3.2, p: 500, z: 1 }, { n: 'Kôň nazgûla', v: 3.6, p: 1200, fx: 'dark', z: 1 });

// základná výbava zla (hrdina zla ju má od začiatku, nepredáva sa)
shOf('w').push({ n: 'Orkský nôž', v: 15, p: 0, z: 1 });
shOf('a').push({ n: 'Orkské kože', v: 0, p: 0, z: 1 });
shOf('h').push({ n: 'Orkská kukla', v: 0, p: 0, z: 1 });

// doplnené neskôr: nové veci sa pridávajú vždy na koniec, aby sedeli uložené hry (kováč ich zoradí podľa ceny)
shOf('w').push({ n: 'Haradský zahnutý meč', v: 37, p: 620, z: 1 });

/** Strana, ktorú hrdina zastáva: 1 = zlo, 0 = dobro. Kráľ si ju vyberá pri korunovácii (G.side, pozri bloc v diplomacy.js). */
const heroSide = () => bloc(G.fac);
/** Strana výbavy, ktorú predáva hrad frakcie f. Tvoje vlastné hrady predávajú výbavu tvojej strany. */
const shopSide = f => f === 6 ? heroSide() : bloc(f);
/** Názov strany. */
const sideName = z => z ? 'zla' : 'dobra';
/** Dá hrdinovi základnú výbavu strany z (na začiatku hry). */
function startGear(z) {
    for (const k of ['w', 'a', 'h']) { const i = shOf(k).findIndex(x => !x.p && !x.z === !z); G.eq[k] = i; G.own[k] = [i]; }
}
// --- „Bojisko“ update: obojručné zbrane (t2: bez štítu, širší sek) a strelná výbava (nová časť výbavy 'r': luk, kuša, vrhacie oštepy) ---
shOf('w').push({ n: 'Gondorský obojručný meč', v: 44, p: 760, t2: 1 }, { n: 'Uruk-haiská obojručná sekera', v: 46, p: 760, t2: 1, z: 1 });
SH.push({ k: 'r', l: 'Strelná zbraň', it: [{ n: 'Bez strelnej zbrane', v: 0, p: 0 },
    { n: 'Krátky luk', v: 6, p: 60, rt: 'bow', ammo: 16, cd: 42 }, { n: 'Elfský dlhý luk', v: 9, p: 280, rt: 'bow', ammo: 22, cd: 38 },
    { n: 'Kuša', v: 15, p: 240, rt: 'xbow', ammo: 10, cd: 80 }, { n: 'Vrhacie oštepy', v: 17, p: 90, rt: 'jav', ammo: 5, cd: 55 },
    { n: 'Orkský luk', v: 6, p: 60, rt: 'bow', ammo: 16, cd: 42, z: 1 }, { n: 'Haradský luk', v: 9, p: 280, rt: 'bow', ammo: 22, cd: 38, z: 1 },
    { n: 'Kuša z Rhûnu', v: 15, p: 240, rt: 'xbow', ammo: 10, cd: 80, z: 1 }, { n: 'Haradské vrhacie oštepy', v: 17, p: 90, rt: 'jav', ammo: 5, cd: 55, z: 1 }] });
/** Obojručná zbraň v ruke: štít sa v boji nepoužije. */
const twoHand = () => !!(G && G.eq && SH.find(s => s.k === 'w').it[G.eq.w] && SH.find(s => s.k === 'w').it[G.eq.w].t2);

