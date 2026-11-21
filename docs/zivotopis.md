# Podklady do životopisu a portfólia

Hotové texty na skopírovanie. Čísla sú k 21. 11. 2026 (130 commitov, od 27. 10. 2026).

## Odkazy

- Hra (spustí sa v prehliadači, bez inštalácie): https://davidmucha1999.github.io/vojvodca-stredozeme/
- Zdrojový kód: https://github.com/DavidMucha1999/vojvodca-stredozeme

## Jedna veta (do životopisu)

**SK:** Vojvodca Stredozeme – strategická hra v prehliadači (JavaScript, Phaser 3, Three.js) inšpirovaná Mount & Blade: Warband; 3D bitky so smerovým bojom a AI armád, mapa sveta, ekonomika a príbeh, automatizované testy simulácie.

**EN:** Vojvodca Stredozeme – a browser strategy game (JavaScript, Phaser 3, Three.js) inspired by Mount & Blade: Warband; 3D battles with directional melee and army AI, a world map, economy and story, with automated simulation tests.

## Odrážky (na výber 3 až 5)

- Navrhol a naprogramoval hru s mapou sveta, hradmi, frakciami, ekonomikou, úlohami a príbehom (ok. 18 000 riadkov JavaScriptu, 100+ modulov).
- Bitky až do 500+ jednotiek v reálnom čase v 3D (Three.js): smerový boj a kryt, jazda, lukostrelci, obliehanie hradieb, rieka s brodom, rozkazy vojsku.
- AI armád: taktika veliteľov (línia, obchvat jazdy, lukostrelci za pešiakmi), ranení vojaci ustupujú, vojaci sa otáčajú a rozbiehajú postupne, nie okamžite.
- Simulácia oddelená od vykresľovania, takže beží aj bez prehliadača; viac než 140 automatizovaných kontrol (`npm test`).
- Postavy, zbrane, hrady aj krajina sa generujú kódom, bez externých 3D modelov.
- Nasadenie na GitHub Pages, voliteľná verzia pre Windows cez Electron s ukladaním hier do súborov.
- Celý vývoj prebiehal s pomocou AI nástrojov (Claude Code); ja som určoval zadanie a pravidlá hry, kontroloval výsledok a rozhodoval o riešeniach.

## Čo povedať na pohovore

- **Najťažší problém:** udržať plynulú simuláciu stoviek vojakov a zároveň ich správanie, aby pôsobilo ako v Warbande (zotrvačnosť, otáčanie, zranení ustupujú). Riešenie: jednoduché pravidlá na jednotku a testy, ktoré strážia, aby sa nové pravidlo nerozbilo inde.
- **Čo som sa naučil:** rozdelenie na simuláciu a vykresľovanie, testovanie hernej logiky, práca s Git a nasadením.
- **Čo by som urobil ďalej:** zvuk a efekty zásahov, vyváženie celej bitky podľa hráčov, ďalšie príbehové úlohy.

## Pred odoslaním životopisu

- Otvor odkaz na hru v čistom okne prehliadača (Chrome alebo Edge) a skontroluj, že sa hra načíta.
- Hra je pre počítač s klávesnicou a myšou, nie pre telefón; napíš to k odkazu, aby recruiter neotvoril hru na mobile.
- Pri frázach o tom, čo si urobil sám a čo s AI, drž sa pravdy; v README je to uvedené rovnako.
