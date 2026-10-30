/*
 * Zaujímavé miesta na mape (okrem hradov a dedín): súradnice v jednotkách mapy (1800 × 1200, násobia sa K).
 * kind určuje kresbu na mape (MapScene.drawPlaces), ev udalosť pri návšteve (js/ui/places.js), cd = dni medzi návštevami.
 */
const PLACES = [
    { id: 'amonsul', n: 'Amon Sûl (Vetrov)', x: 560, y: 560, kind: 'tower', cd: 3, d: 'Zrúcanina strážnej veže na vrchu Vetrov. Odtiaľto vidno ďaleko do kraja – a v noci sem chodia tiene.' },
    { id: 'argonath', n: 'Argonath', x: 795, y: 690, kind: 'statues', cd: 999, d: 'Dva obrovské kamenné králi strážia Anduinu. Kto popod nich prepláva, cíti tiaž starých prísah.' },
    { id: 'trolls', n: 'Trollie lesy', x: 620, y: 410, kind: 'cave', cd: 10, d: 'Kamenisté kopce s jaskyňami, kde kedysi traja trollovia hádali, ako uvariť trpaslíkov. Vraj tu ešte ostali.' },
    { id: 'bombadil', n: 'Starý les a dom Toma Bombadila', x: 300, y: 850, kind: 'house', cd: 5, d: 'Pokrútené vŕby pri Vrbovke a za nimi žltý dom, z ktorého sa ozýva spev. Tu nemá Tieň moc.' },
    { id: 'marshes', n: 'Mŕtve močiare', x: 1335, y: 610, kind: 'swamp', cd: 4, d: 'Bažiny plné mŕtvych tvárí pod hladinou a bludičiek. Kto sa zahľadí do vody, ťažko odvracia zrak.' },
    { id: 'spiders', n: 'Pavúčie húštiny Temného hvozdu', x: 1150, y: 470, kind: 'web', cd: 8, d: 'Čierne pavučiny medzi stromami a zámotky, v ktorých niečo ešte dýcha.' },
    { id: 'fangorn', n: 'Fangorn', x: 880, y: 790, kind: 'ents', cd: 6, d: 'Najstarší les sveta. Stromy tu šepkajú a niektoré sa hýbu, keď sa nepozeráš.' },
    { id: 'deadpaths', n: 'Cesty mŕtvych', x: 850, y: 1040, kind: 'door', cd: 999, d: 'Tmavá brána pod Dwimorbergom. Z hlbín sa ozýva hlas, ktorý čaká na dediča, čo zruší kliatbu.' },
    { id: 'carrock', n: 'Beornov dvor a Karrock', x: 985, y: 135, kind: 'homestead', cd: 6, d: 'Veľký drevený dom medzi úľmi a poliami. Gazda je zavalitý, mrzutý a v noci vraj chodí ako medveď.' },
    { id: 'isenfords', n: 'Brody na Isene', x: 650, y: 880, kind: 'ford', cd: 7, d: 'Plytký brod cez Isen, miesto starých bitiek. Hliadky Isengardu sem radi chodia na prepady.' },
    { id: 'minasithil', n: 'Mŕtvy strom na Pelennore', x: 1345, y: 995, kind: 'tree', cd: 999, d: 'Pole pred Bielym mestom, kde sa rozhodovalo o osude Západu. V tráve ešte ležia zlomené kopije.' }
];
