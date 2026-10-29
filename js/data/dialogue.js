/*
 * Rozhovory s veliteľmi na mape.
 * Každý veliteľ má povahu (TR: 0 čestný, 1 chamtivý, 2 zbabelý, 3 ambiciózny, 4 krutý, 5 múdry) a frakciu.
 * Odpovede sú zoradené podľa povahy, takže ten istý pán odpovedá stále v rovnakom duchu.
 * Funkcie dostávajú kontext c = { e (veliteľ), f (frakcia), same (tvoja frakcia), war (vojna s tebou),
 *   rl (vzťah), evil (strana zla), king (je panovník), you (tvoje meno), ren (sláva), ring (nesieš Prsteň) }.
 * Texty sa dajú ľubovoľne dopĺňať: stačí pridať ďalší reťazec do zoznamu, hra z neho náhodne vyberá.
 */
const DLG = (() => {
    const pick = a => a[Math.floor(Math.random() * a.length)];
    // ako frakcie vnímajú svet (nezávisle od povahy)
    const WORLD = {
        0: ['Tieň na východe rastie každým rokom. Gondor stojí na stráži, ako stál vždy, ale naše rady rednú.', 'Minas Tirith ešte stojí a kým stojí, Západ má nádej. Správca však nespí dobre.', 'Osgiliath je v troskách a Ithilien patrí hliadkam. Dlho to tak nezostane, jedným či druhým smerom.'],
        1: ['Kone sú nepokojné a to býva znamenie. V Riddermarku hovoríme, že vietor od východu nosí vojnu.', 'Théoden je starý, ale Rohan je mladý. Keď zaznie roh, Eorlingovia pôjdu.', 'Orkovia pália dediny pri Fangorne. Hliadky jazdia vo dne v noci.'],
        2: ['Oko všetko vidí. Všetko. Aj teba, aj mňa. Slobodné národy sú len dobytok, ktorý ešte nevie, že ide na porážku.', 'Pán Mordoru zhromažďuje vojská. Deň, keď Západ padne, je bližšie, než si myslíš.', 'Minas Morgul sa znova rozsvietila. To nie je mesiac, to je naša sila.'],
        3: ['Saruman má plán a Isengard má Uruk-hai. Starý svet sa láme a nový sa kuje v našich jamách.', 'Mordor nás potrebuje viac, než si Sauron priznáva. Biela ruka má vlastné cesty.', 'Rohan je slabý a Gondor ďaleko. Isengard to vidí a koná.'],
        4: ['Juh je horúci a bohatý. Sever je studený a chudobný, ale Pán nám ho sľúbil.', 'Naše olifanty prejdú cez Ithilien ako cez trávu. Gondor ešte nevidel skutočnú vojnu.', 'Harad slúži Sauronovi, lebo Sauron víťazí. To je celá múdrosť juhu.'],
        5: ['Osamelá hora stojí a kováčske vyhne horia. Trpaslíci si pamätajú Smauga aj Azoga, nezabúdame nikdy.', 'Dol Guldur bol vyčistený, ale tiene sa vracajú do Temného hvozdu. Dáin drží stráž.', 'Zlato Ereboru nie je na míňanie, ale na zbrane. Prichádza vojna a my budeme pripravení.'],
        7: ['Východ je veľký a ľudia Rhûnu sú mnohí. Sauron nám sľúbil polovicu Západu, a Sauron svoje sľuby plní.', 'Ľudia zo severu nás volajú divochmi. Uvidíme, kto bude divoch, keď naše vozy prejdú cez Dale.', 'Khamûl vidí ďaleko. Rhûn pôjde tam, kam ukáže.'],
        8: ['Zlatý les si pamätá vek, keď ešte nebolo Mordoru. Pamätá si aj to, že nič netrvá večne. Ani Tieň.', 'Pani Galadriel vidí ďalej než my všetci. Hovorí, že prichádza rozhodnutie.', 'Elfovia odchádzajú na Západ, ale Lothlórien ešte stojí. Kým stojí, Tieň neprejde cez Anduin.']
    };
    // vlastné plány podľa povahy
    const PLAN = [
        c => pick([`Môj plán je jednoduchý: slúžiť ${FN[c.f]} verne a padnúť s mečom v ruke, ak to osud bude chcieť.`, 'Dal som slovo svojmu pánovi a slovo držím. Kam ma pošle, tam pôjdem.', 'Chcem brániť tých, ktorí sa brániť nevedia. Nič viac a nič menej.']),
        c => pick(['Vojna je drahá, ale korisť je lacná. Každý hrad má pokladnicu a každá pokladnica má dvere.', `Plánujem zbohatnúť. ${FN[c.f]} mi platí, nepriateľ mi platí korisťou. Výborný obchod.`, 'Keď skončí vojna, kúpim si léno pri rieke. Kým neskončí, beriem všetko, čo sa dá.']),
        c => pick(['Plán? Prežiť. Hrdinovia ležia pod kopcami, ja mienim ležať v posteli.', 'Držím sa veľkých vojsk a ďaleko od prvého radu. Nehanbím sa za to, mám deti.', 'Pôjdem tam, kde nás bude viac. Nikde inde ma neuvidíš.']),
        c => pick(['Chcem léno. Potom druhé. Raz budú hovoriť o mojom rode tak, ako dnes hovoria o Správcoch.', `Môj pán je starý a trón neostane prázdny. ${FN[c.f]} potrebuje silnú ruku a ja mám dve.`, 'Každá bitka je schod. Rátam schody, nie mŕtvych.']),
        c => pick(['Spálim každú dedinu, ktorá nás nenakŕmi. Strach je lacnejší než posádka.', 'Zajatcov neberiem. Kto raz zdvihol zbraň proti mne, už ju nezdvihne.', 'Plánujem, aby sa moje meno šeptalo. Potom ho nebude treba kričať.']),
        c => pick(['Vojny vyhráva ten, kto vie, kedy nebojovať. Čakám na svoj čas a zbieram správy.', 'Mapa hovorí viac než meč. Kto ovláda cesty a brody, ovláda krajinu.', 'Plánujem spojenectvá. Osamelý hrad padne, desať hradov spolu nie.'])
    ];
    // názor na teba podľa povahy a vzťahu
    const YOU = [
        c => c.rl > 30 ? `Si človek cti, ${c.you}. Takých je málo a ja si ich vážim.` : c.rl < -10 ? 'Počul som o tebe veci, ktoré sa mi nepáčia. Česť sa nedá kúpiť späť.' : 'Zatiaľ o tebe viem málo. Česť sa ukáže v skutkoch, nie v slovách.',
        c => c.rl > 30 ? 'Si môj priateľ, kým máš plný mešec. A ty ho máš plný, však?' : c.ren > 15 ? 'Slávny vojvodca. Sláva sa síce nedá jesť, ale priťahuje zlato.' : 'Nemáš veľa a nemáš meno. Zatiaľ.',
        c => c.ren > 15 ? 'Prosím, nehnevaj sa na mňa. Nič proti tebe nemám. Naozaj.' : 'Vyzeráš nebezpečne. Ale nie až tak, aby som utekal. Zatiaľ.',
        c => c.ren > c.e.n ? 'Stúpaš rýchlo. Dúfam, že si pamätáš, kto stál vedľa teba.' : 'Si ambiciózny, to vidím. Len si daj pozor, aby si nepredbehol mňa.',
        c => c.ren > 20 ? 'Máš silu, to rešpektujem. Slabí ma nezaujímajú.' : 'Nie si nič. Dokáž mi opak, alebo mi nestoj v ceste.',
        c => c.rl > 20 ? `Veľa som o tebe premýšľal, ${c.you}. Myslím, že vieš, kam ideš. To je vzácne.` : 'Pozorujem ťa. Každý človek je kniha, len treba čítať pomaly.'
    ];
    // vojna a mier podľa povahy
    const WAR = [
        c => c.war ? 'Stojíme proti sebe, ale ak sa stretneme v boji, bude to čestný boj. To ti sľubujem.' : 'Mier je dar, ktorý si málokto váži. Ja si ho vážim.',
        c => c.war ? 'Vojna s tebou mi zatiaľ nepriniesla nič. Ak chceš mier, vieš, ako sa kupuje.' : 'Mier je dobrý pre obchod a obchod je dobrý pre mňa.',
        c => c.war ? 'Vojna? Áno, vraj sme vo vojne. Dúfam, že ju vedú iní.' : 'Som rád, že sme v mieri. Veľmi rád.',
        c => c.war ? 'Táto vojna niekoho vynesie hore. Postarám sa, aby som to bol ja.' : 'Mier dlho nevydrží. Nikdy nevydrží. Buď pripravený.',
        c => c.war ? 'Dobre. Nenávidím mier. V mieri hrdzavejú meče a mäknú ľudia.' : 'Mier je len prestávka medzi dvoma bitkami.',
        c => c.war ? 'Vojny sa začínajú ľahko a končia ťažko. Dúfam, že obaja prežijeme, aby sme videli, kto mal pravdu.' : 'Mier treba udržiavať každý deň, ako oheň. Nechaj ho a vyhasne.'
    ];
    // Prsteň
    const RING = [
        c => 'Nesieš niečo temné. Cítim to. Zbav sa toho, kým to nezbaví teba.',
        c => 'Niečo cenné máš pri sebe, cítim to v kostiach. Predáš to?',
        c => 'Máš... niečo. Niečo, čo ma desí. Prosím, odíď.',
        c => 'Taká moc v rukách jedného človeka. Zaujímavé. Veľmi zaujímavé.',
        c => 'Ak je to to, čo si myslím, patrí to Pánovi. Alebo mne.',
        c => 'Ten predmet je starší než naše kráľovstvá. Nikto ho neovládne, ani ty. Vráť ho ohňu.'
    ];
    // pozdrav podľa vzťahu, vojny a povahy
    function greet(c) {
        if (c.war) return pick([`Ty. ${c.you}. Nemáme si čo povedať, ale nech je po tvojom.`, 'Sme vo vojne. Hovor rýchlo, kým sa moji muži neznudia.', 'Prišiel si vyjednávať, alebo zomrieť? Rozhodni sa.'])[c.e.tr === 2 ? 0 : 1 + (c.e.tr % 2)] ?? 'Sme vo vojne. Hovor.';
        if (c.rl > 40) return pick([`Priateľ ${c.you}! Rád ťa vidím. Čo ťa privádza?`, `Vitaj, ${c.you}. Moji muži ťa poznajú a ja tiež. Poď, porozprávajme sa.`]);
        if (c.rl < -10) return pick(['Čo chceš? Nemám na teba čas ani náladu.', 'Hovor a potom choď. Nestojím o tvoju spoločnosť.']);
        return [
            `Buď pozdravený, ${c.you}. Hovor otvorene, mám rád priame slová.`,
            `${c.you}, však? Počul som o tebe. Ak máš obchod, počúvam.`,
            'Och. To si ty. Nemáš so sebou veľa mužov, však?',
            `Vojvodca ${c.you}. Tvoje meno sa šíri. Buď opatrný, komu to vadí.`,
            'Hovor. A nemrhaj mojím časom.',
            `Zdravím ťa, ${c.you}. Sadni si, cesty sú dlhé a slová krátke.`
        ][c.e.tr];
    }
    // reakcia na kompliment / urážku
    const FLATTER = [
        c => ({ t: 'Lichôtky mi nič nehovoria. Skutky áno. Ale ďakujem za zdvorilosť.', d: 2 }),
        c => ({ t: 'Pekné slová sú lacné. Ale lacné veci mám rád.', d: 4 }),
        c => ({ t: 'Naozaj? Ty si o mne počul dobré veci? To... to ma teší.', d: 6 }),
        c => ({ t: 'Vieš, s kým hovoríš. To je dobré. Pamätaj si to.', d: 4 }),
        c => ({ t: 'Lichotíš mi, lebo sa ma bojíš. To je správne.', d: 3 }),
        c => ({ t: 'Zdvorilosť ťa nič nestojí a mňa poteší. Múdry ťah.', d: 3 })
    ];
    const INSULT = [
        c => ({ t: 'Také slová sa medzi mužmi cti nehovoria. Zapamätám si to.', d: -8 }),
        c => ({ t: 'Urážky nič nestoja, preto ich nepočúvam. Vráť sa, keď budeš mať zlato.', d: -4 }),
        c => ({ t: 'Ne... nemusíš byť hrubý. Odchádzam.', d: -5 }),
        c => ({ t: 'Pamätaj si: ja si pamätám všetko. A raz budem mať moc ti to vrátiť.', d: -10 }),
        c => ({ t: 'Ha! Konečne niekto, kto má odvahu. Páčiš sa mi. Ale nabudúce to oľutuješ.', d: -2 }),
        c => ({ t: 'Hnev je zlý radca. Ale dobre, chápem, čo si chcel povedať.', d: -5 })
    ];
    // o vlastnom panovníkovi
    const LIEGE = [
        c => c.king ? 'Ja som panovník. Moji ľudia sú moja zodpovednosť a moje bremeno.' : `${KN[c.f]} je môj pán a ja mu slúžim bez otázok. Tak to má byť.`,
        c => c.king ? 'Vládnuť znamená mať plnú pokladnicu. Moja je plná.' : `${KN[c.f]} platí málo a žiada veľa. Ale platí.`,
        c => c.king ? 'Byť panovníkom je nebezpečné. Všetci chcú môj trón.' : `${KN[c.f]} je mocný a ja stojím v jeho tieni. Je tam bezpečne.`,
        c => c.king ? 'Vládnem, lebo som to chcel viac než ostatní. Taký je svet.' : `${KN[c.f]}... je starý. Raz bude trón potrebovať niekoho mladšieho.`,
        c => c.king ? 'Vládnem strachom a vládnem dobre. Nikto sa nebúri.' : `${KN[c.f]} je silný. Keď prestane byť silný, prestane byť mojím pánom.`,
        c => c.king ? 'Vládnuť je ťažšie než bojovať. Každé rozhodnutie má cenu.' : `${KN[c.f]} načúva radám, aspoň niekedy. To je viac, než sa dá povedať o väčšine vládcov.`
    ];
    // o strane dobra a zla
    const SIDE = [
        c => c.evil ? 'Slúžim Tieňu, lebo moji otcovia mu slúžili. Česť je aj v tom, dodržať prísahu, ktorú by si radšej nedal.' : 'Dobro nie je slabosť. Dobro je stáť, keď ostatní utekajú.',
        c => c.evil ? 'Sauron platí lepšie. To je celé. Keby platil Gondor, slúžil by som Gondoru.' : 'Dobro a zlo? Ja poznám len dlžníkov a veriteľov.',
        c => c.evil ? 'Som na strane, ktorá vyhráva. Zatiaľ to vyzerá na Mordor.' : 'Som na strane dobra, lebo tu je menej orkov. Orkovia hryzú.',
        c => c.evil ? 'Tieň ponúka moc tým, ktorí si ju vezmú. Ja si ju vezmem.' : 'Západ potrebuje nových vodcov. Starí zlyhali. Ja nezlyhám.',
        c => c.evil ? 'Zlo? Volaj to, ako chceš. Ja to volám sila a sila má vždy pravdu.' : 'Bojujem za dobro, ale bojujem tvrdo. Dobrý človek nemusí byť mäkký.',
        c => c.evil ? 'Tieň víťazí trpezlivosťou. Slobodné národy sa hádajú, kým my pochodujeme.' : 'Svetlo a tieň sa striedajú ako deň a noc. Dôležité je nebyť sám, keď príde tma.'
    ];
    return { WORLD, PLAN, YOU, WAR, RING, FLATTER, INSULT, LIEGE, SIDE, greet, pick };
})();
