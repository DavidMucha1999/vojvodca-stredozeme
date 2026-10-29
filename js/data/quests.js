/*
 * Úlohy od pánov (vedľajšie úlohy s príbehom).
 * Každá úloha má viac krokov. Krok má druh:
 *   v = navštív hrad (a = názov alebo 'home' = hrad pána), vl = navštív dedinu,
 *   k = poraz n armád frakcie a (a = 'bandit' banditi, 'enemy' ľubovoľný nepriateľ, inak číslo frakcie),
 *   d = dovez tovar (a = kľúč tovaru, n = kusov) do hradu pána, t = porozprávaj sa s veliteľom frakcie a,
 *   r = vráť sa k pánovi (uzavretie).
 * side: 0 = len páni dobra, 1 = len páni zla, bez side = obe. tr: povahy, ktoré úlohu dávajú (TR index).
 * Odmena r (zlato), ren (sláva), rl (vzťah s pánom; od panovníka dvojnásobok).
 * Texty: intro (pán zadá úlohu), steps[i].s (čo robiť), done (pán pri uzavretí). {L} = meno pána, {T} = jeho hrad, {Y} = tvoje meno.
 */
const QUESTS = [
    {
        id: 'ithilien', n: 'Hliadky v Ithiliene', side: 0, tr: [0, 5],
        intro: 'Z Ithilienu prichádzajú zlé správy. Faramirove hliadky hlásia, že haradské karavány s olifantmi prechádzajú Južnou cestou k Čiernej bráne. Nemôžeme ich zastaviť všetky, ale môžeme Mordoru ukázať, že cesta nie je voľná. Poraz dve nepriateľské armády na ceste a vráť sa.',
        steps: [{ k: 'k', a: 'enemy', n: 2, s: 'Poraz 2 nepriateľské armády.' }, { k: 'r', s: 'Vráť sa za {L} do {T}.' }],
        done: 'Výborne. Každý zastavený oddiel znamená o niekoľko orkov menej pod hradbami Minas Tirith. Gondor ti ďakuje, {Y}.',
        r: 220, ren: 3, rl: 12
    },
    {
        id: 'palantir', n: 'Správa pre Správcu', side: 0, tr: [5, 0, 3],
        intro: 'Správca Denethor sa zamkol vo veži a hľadí do kameňa, ktorý by nemal mať. Potrebujem, aby sa k nemu dostala správa, ktorú sa jeho dvorania boja doručiť. Choď do Minas Tirith a potom mi prines odpoveď. Je to nebezpečnejšie, než to znie: v Bielom meste má Tieň svoje uši.',
        steps: [{ k: 'v', a: 'Minas Tirith', s: 'Choď do Minas Tirith a odovzdaj správu.' }, { k: 'r', s: 'Vráť sa s odpoveďou za {L} do {T}.' }],
        done: 'Denethor teda ešte počúva. To je viac, než som dúfal. Ďakujem ti. Pamätaj: kto hľadí do palantíru pridlho, vidí len to, čo mu Sauron dovolí.',
        r: 160, ren: 2, rl: 10
    },
    {
        id: 'edoras_grain', n: 'Hlad v Edorase', side: 0, tr: [0, 5, 1],
        intro: 'Zima bola dlhá a sýpky Edorasu sú prázdne. Kráľ Théoden ochorel a Gríma Červivý jazyk rozhoduje, komu sa chlieb dostane a komu nie. Dovez do môjho hradu 10 kusov obilia; rozdelím ho sám, bez Grímových rúk.',
        steps: [{ k: 'd', a: 'grain', n: 10, s: 'Dovez 10 kusov obilia do {T} (kúpiš ho v dedinách, Rohan a Gondor ho pestujú).' }],
        done: 'Obilie prišlo. Ľudia sa dnes najedia a Gríma sa dnes nenaje z ich hladu. To je dobrý deň, {Y}.',
        r: 180, ren: 2, rl: 12
    },
    {
        id: 'wargs', n: 'Vargovia pri Fangorne', side: 0, tr: [0, 4, 3],
        intro: 'Sarumanovi jazdci na vargoch pália osady na okraji Fangornu. Ľudia utekajú k nám a my nemáme kam ich dať. Nájdi a rozbi banditov a lupičov, ktorí sa pridali k drancovaniu, a potom poraz aspoň jednu armádu Isengardu.',
        steps: [{ k: 'k', a: 'bandit', n: 2, s: 'Poraz 2 bandy lupičov.' }, { k: 'k', a: 3, n: 1, s: 'Poraz 1 armádu Isengardu.' }, { k: 'r', s: 'Vráť sa za {L}.' }],
        done: 'Fangorn si dnes vydýchne. Stromy si to zapamätajú, a stromy majú dlhú pamäť. Aj ja.',
        r: 260, ren: 4, rl: 14
    },
    {
        id: 'dale', n: 'Obchodná cesta do Dale', side: 0, tr: [1, 5],
        intro: 'Trpaslíci z Ereboru kujú zbrane, ale železo im dochádza. Dovez do môjho hradu 8 kusov železa a ja zaplatím lepšie než ktorýkoľvek trh. Zisk si rozdelíme, povedzme... rozumne.',
        steps: [{ k: 'd', a: 'iron', n: 8, s: 'Dovez 8 kusov železa do {T}.' }],
        done: 'Železo ako z Modrých hôr. Tu je tvoja časť, a nie, nerátaj ju, je to správne. Takmer.',
        r: 240, ren: 1, rl: 10
    },
    {
        id: 'ents', n: 'Posolstvo do Lothlórienu', side: 0, tr: [5, 0],
        intro: 'Pani Galadriel vidí ďalej než ktokoľvek z nás a ja potrebujem jej radu skôr, než sa pohnú vojská. Zanes moje posolstvo do Lothlórienu. Les nepustí každého; ty máš meno, ktoré sa už šepká, možno ťa pustí.',
        steps: [{ k: 'v', a: 'Lothlórien', s: 'Choď do Lothlórienu.' }, { k: 'r', s: 'Prines odpoveď za {L} do {T}.' }],
        done: 'Takže Pani hovorí o troch dňoch a o Anduine. Rozumiem viac, než by som chcel. Ďakujem, {Y}, dnes si možno zachránil viac životov než v ktorejkoľvek bitke.',
        r: 200, ren: 3, rl: 12
    },
    // --- zlo ---
    {
        id: 'morannon', n: 'Daň pre Čiernu bránu', side: 1, tr: [4, 1, 3],
        intro: 'Pán Barad-dûru žiada železo pre kováčov Gorgorothu. Rozkaz prišiel ohňom a krvou, ako vždy. Dovez 8 kusov železa do môjho hradu. Kto nedodá, pôjde do jám sám.',
        steps: [{ k: 'd', a: 'iron', n: 8, s: 'Dovez 8 kusov železa do {T}.' }],
        done: 'Oko bude spokojné. A keď je spokojné Oko, spíme pokojnejšie všetci. Nezabudnem, kto dodal.',
        r: 220, ren: 2, rl: 12
    },
    {
        id: 'rohan_raid', n: 'Jazdci musia krvácať', side: 1, tr: [4, 3, 0],
        intro: 'Saruman chce, aby Rohan pocítil, že jeho hranice nie sú hranice. Poraz dve armády Rohanu a potom sa vráť. Chcem počuť, ako kričali ich kone.',
        steps: [{ k: 'k', a: 1, n: 2, s: 'Poraz 2 armády Rohanu.' }, { k: 'r', s: 'Vráť sa za {L} do {T}.' }],
        done: 'Dve armády jazdcov. Théoden to pocíti, ak mu to Gríma dovolí pocítiť. Dobrá práca, {Y}.',
        r: 260, ren: 4, rl: 14
    },
    {
        id: 'spy', n: 'Oči v Bielom meste', side: 1, tr: [5, 3, 2],
        intro: 'Mám človeka v Minas Tirith. Alebo som mal, posledné dve správy neprišli. Choď tam ako pocestný, vyzvedaj, čo sa dá, a vráť sa. Ak ťa chytia, nikdy sme sa nestretli.',
        steps: [{ k: 'v', a: 'Minas Tirith', s: 'Choď do Minas Tirith a vyzvedaj (stačí vstúpiť).' }, { k: 'r', s: 'Vráť sa za {L} do {T}.' }],
        done: 'Takže Denethor sa zamyká s kameňom a Faramir drží Osgiliath s polovicou mužov. To sú správy, za ktoré sa platí zlatom. Tu máš.',
        r: 200, ren: 2, rl: 12
    },
    {
        id: 'bandit_hire', n: 'Lupiči do služby', side: 1, tr: [1, 3, 4],
        intro: 'Banditi na cestách berú korisť, ktorá patrí nám. Rozbi dve ich bandy; tí, čo prežijú, sa pridajú k mojim oddielom. Mordor neplytvá ničím, ani lotrami.',
        steps: [{ k: 'k', a: 'bandit', n: 2, s: 'Poraz 2 bandy lupičov.' }, { k: 'r', s: 'Vráť sa za {L}.' }],
        done: 'Cesty sú naše a lotri tiež. Tak sa buduje vojsko, {Y}: zo všetkého, čo sa hýbe.',
        r: 180, ren: 2, rl: 10
    },
    {
        id: 'harad_salt', n: 'Soľ z juhu', side: 1, tr: [1, 5],
        intro: 'Haradské karavány vozia soľ a korenie a Mordor platí v zlate, ktoré ukradol. Dovez 6 kusov soli do môjho hradu, nech sa aj moji orkovia raz najedia niečoho, čo nie je surové.',
        steps: [{ k: 'd', a: 'salt', n: 6, s: 'Dovez 6 kusov soli a korenia do {T} (predávajú ju dediny na juhu).' }],
        done: 'Soľ. Konečne. Vieš, čo to znamená, keď má ork rád svoju večeru? Že zajtra bude poslúchať.',
        r: 200, ren: 1, rl: 10
    },
    // --- obe strany ---
    {
        id: 'bandits', n: 'Cesty bez lupičov', tr: [0, 1, 2, 3, 4, 5],
        intro: 'Kupci sa sťažujú a sťažnosti kupcov stoja zlato. Banditi prepadávajú karavány medzi dedinami. Rozbi tri bandy a cesty budú opäť moje.',
        steps: [{ k: 'k', a: 'bandit', n: 3, s: 'Poraz 3 bandy lupičov.' }, { k: 'r', s: 'Vráť sa za {L} do {T}.' }],
        done: 'Cesty sú čisté a kupci ticho. Tu je tvoja odmena.',
        r: 150, ren: 2, rl: 8
    },
    {
        id: 'ponies', n: 'Kone pre posádku', tr: [0, 3, 5, 1],
        intro: 'Moja posádka má kopije, ale nemá kone. Dovez mi 6 koní a budem ti dlžný viac než zlato.',
        steps: [{ k: 'd', a: 'horses', n: 6, s: 'Dovez 6 koní do {T} (chovajú ich najmä v Rohane).' }],
        done: 'Dobré kone. Moji muži budú jazdiť a ja si ťa zapamätám.',
        r: 260, ren: 2, rl: 12
    }
];
