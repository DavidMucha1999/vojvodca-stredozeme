/*
 * Príbehové kapitoly pre stranu dobra a zla.
 */
const QG = [
    { t: 'Gandalf ti posiela list: „Tieň sa vracia. Príď do Rivendellu na Elrondovu radu.“', k: 'v', a: 'Rivendell', r: 100 },
    { t: 'Elrond: „Saruman zradil a jeho Uruk-hai pália západné kraje. Poraž 2 armády Isengardu.“', k: 'k', a: 3, n: 2, r: 150 },
    { t: 'Aragorn: „Rohan je v nebezpečenstve. Choď do Edorasu a zjednoť jazdcov.“', k: 'v', a: 'Edoras', r: 150 },
    { t: 'Gandalf: „Minas Tirith obliehajú temné vojská. Poraž 3 armády Mordoru.“', k: 'k', a: 2, n: 3, r: 250 },
    { t: 'Aragorn: „Musíme odlákať Saurónovo oko, aby Frodo prešiel nepozorovane. Dobyj Morannon.“', k: 'c', a: 'Morannon', r: 300 },
    { t: 'Gandalf: „Prsteň je takmer pri Hore osudu. Dobyj Barad-dûr a zlom Saurónovu moc.“', k: 'c', a: 'Barad-dûr', r: 500 }
], QE = [
    { t: 'Ústa Saurona: „Oko ťa videlo. Príď do Barad-dûru a prijmi rozkazy.“', k: 'v', a: 'Barad-dûr', r: 100 },
    { t: 'Saruman: „Rohan musí padnúť. Poraž 2 armády Rohanu.“', k: 'k', a: 1, n: 2, r: 150 },
    { t: 'Gothmog: „Dobyj Helmov žľab, nech jazdci stratia svoje útočisko.“', k: 'c', a: 'Helmov žľab', r: 250 },
    { t: 'Ústa Saurona: „Gondor slabne. Poraž 3 armády Gondoru.“', k: 'k', a: 0, n: 3, r: 250 },
    { t: 'Gothmog: „Dobyj Osgiliath, bránu k Bielemu mestu.“', k: 'c', a: 'Osgiliath', r: 300 },
    { t: 'Ústa Saurona: „Nastal čas. Dobyj Minas Tirith a Stredozem sa skloní pred Okom.“', k: 'c', a: 'Minas Tirith', r: 500 }
];
let QS = QG;
