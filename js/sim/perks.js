/*
 * Strom perkov hrdinu: 5 vetiev po 3 stupňoch. Za každú novú úroveň hrdina dostane 1 bod perku (G.pp).
 * Perk vyššieho stupňa vyžaduje predchádzajúci v tej istej vetve a úroveň hrdinu (2, 4, 6).
 * Získané perky: G.perk = { id: 1 }. Účinky sú v combat.js, battle.js, hero.js, supply.js a trade.js (perk(id)).
 */
const PERKS = [
    ['bojovnik', 'Bojovník', 'sword', [
        ['sermiar', 'Šermiar', 'údery +10 % zranenie'],
        ['neunavny', 'Neúnavný', 'výdrž +40 %, útoky menej unavia'],
        ['stit', 'Štítonosič', 'štít vydrží +60 %, širší kryt']]],
    ['jazdec', 'Jazdec', 'horse', [
        ['jazda', 'Sedlo', 'na koni +10 % rýchlosť'],
        ['kopija', 'Kopijník', 'nápor +40 %, kratší rozbeh'],
        ['konilu', 'Lukostrelec z koňa', 'presná streľba z koňa, +6 šípov']]],
    ['velitel', 'Veliteľ', 'flag', [
        ['taktik', 'Taktik', 'vojaci +10 % zranenie'],
        ['zastava', 'Zástava', 'vojaci utekajú až pod 25'],
        ['vojvodca', 'Vojvodca', 'o polovicu viac vojakov v bitke']]],
    ['vodca', 'Vodca', 'crown', [
        ['vodca', 'Charizma', 'morálka +8, odvaha v bitke'],
        ['nabor', 'Náborár', 'zajatci sa pridajú +15 %'],
        ['slavny', 'Slávny', 'víťazstvo +1 sláva']]],
    ['hospodar', 'Hospodár', 'coins', [
        ['zasobovac', 'Zásobovač', 'družina zje o 25 % menej'],
        ['ranhojic', 'Ranhojič', 'viac ranených, hoja sa rýchlejšie'],
        ['kupec', 'Kupec', 'trh a jedlo o 8 % výhodnejšie']]]
];
const PERK_LV = [2, 4, 6];
/** Stav perku: 'has' (získaný), 'ok' (dá sa vziať), alebo dôvod, prečo nie. */
function perkState(bi, ti) {
    const id = PERKS[bi][3][ti][0];
    if (perk(id)) return 'has';
    if (ti > 0 && !perk(PERKS[bi][3][ti - 1][0])) return 'najprv ' + PERKS[bi][3][ti - 1][1];
    if ((G.lv || 1) < PERK_LV[ti]) return 'úr. ' + PERK_LV[ti];
    if (!(G.pp > 0)) return 'bez bodu';
    return 'ok';
}
function takePerk(bi, ti) {
    if (perkState(bi, ti) !== 'ok') return false;
    G.perk = G.perk || {}; G.perk[PERKS[bi][3][ti][0]] = 1; G.pp--;
    lg('Nový perk: ' + PERKS[bi][3][ti][1] + '.');
    return true;
}
