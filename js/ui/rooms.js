/*
 * Miestnosti (nádvorie, sieň, krčma, dedina, pamätihodnosť): jeden vstup a výstup pre všetky scény, po ktorých chodí hráč.
 * ROOM = { room, i (hrad), vi (dedina), pi (miesto), from } hovorí, kde hráč práve je; okná otvorené z miestnosti sa po
 * „Späť“ vracajú do nej (roomReturn). mode v miestnosti je 'castle' (nádvorie, sieň), 'tavern' alebo 'room' (dedina, miesto);
 * ROOM_MODES ich zoskupuje pre kontroly typu „sme vnútri“. Bez Phaseru (testy) sa miestnosti nepoužívajú (roomsOk je false).
 */
let ROOM = null;
const ROOM_SCENES = { yard: 'Castle', hall: 'Castle', tavern: 'Tavern', village: 'Village', place: 'Place' };
const ROOM_MODES = new Set(['castle', 'tavern', 'room']);
const roomModeOf = room => room === 'tavern' ? 'tavern' : room === 'yard' || room === 'hall' ? 'castle' : 'room';
const roomSceneOk = k => typeof game !== 'undefined' && game.scene && !!game.scene.getScene(k);
const roomsOk = () => roomSceneOk('Castle');
const inRoom = () => !!ROOM;
/** Vstup do miestnosti room s dátami ({ i } hrad, { vi } dedina, { pi } miesto). Vráti false, ak scény nie sú k dispozícii. */
function enterRoom(room, data = {}) {
    const key = ROOM_SCENES[room];
    if (!roomSceneOk(key)) return false;
    ov.classList.add('hide');
    mode = roomModeOf(room);
    G.dest = -1; G.vd = -1; G.pd = -1;
    ROOM = { room, ...data, from: ROOM && ROOM.i != null && ROOM.i === data.i ? ROOM.room : null };
    if (game.scene.isActive('Map')) game.scene.sleep('Map');            // mapa pod miestnosťou spí (čas stojí)
    for (const k of new Set(Object.values(ROOM_SCENES))) if (k !== key && game.scene.isActive(k)) game.scene.stop(k);
    const sc = game.scene.getScene(key), init = room === 'village' ? { v: data.vi } : room === 'place' ? { p: data.pi } : { i: data.i, room };
    if (sc.scene.isActive()) sc.scene.restart(init); else game.scene.start(key, init);
    return true;
}
/** Odchod z ktorejkoľvek miestnosti na mapu. */
function leaveRoom() {
    ROOM = null;
    ov.classList.add('hide');
    mode = 'map';
    if (typeof game === 'undefined' || !game.scene) return;
    for (const k of new Set(Object.values(ROOM_SCENES))) if (game.scene.isActive(k)) game.scene.stop(k);
    if (game.scene.isSleeping('Map')) game.scene.wake('Map');
}
/** Zavrie okno a vráti hráča do miestnosti, v ktorej bol (ak scéna medzitým skončila, znova ju spustí). */
function roomReturn() {
    if (!ROOM) return;
    ov.classList.add('hide');
    mode = roomModeOf(ROOM.room);
    const key = ROOM_SCENES[ROOM.room];
    if (roomSceneOk(key) && !game.scene.isActive(key)) enterRoom(ROOM.room, ROOM);
}
// vstupy podľa druhu miesta (s náhradným oknom, ak scény nie sú)
const enterCastle = (i, room = 'yard') => enterRoom(room, { i }) || town(i);
const leaveCastle = leaveRoom;
const enterTavern = i => enterRoom('tavern', { i }) || tavern(i);
const enterVillage = i => enterRoom('village', { vi: i, i: VL[i].t }) || vill(i);
const enterPlace = i => enterRoom('place', { pi: i }) || place(i, true);
const leaveRoomScene = leaveRoom;
