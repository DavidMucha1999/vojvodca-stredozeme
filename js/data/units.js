/*
 * Dáta jednotiek: elitné jednotky frakcií a zloženie nepriateľských armád.
 */
const ek = (f, i) => i % 4 === 3 ? 'a' : (f === 2 && i % 6 === 0) || (f === 3 && i % 7 === 0) ? 't' : (f === 3 || f === 7) && i % 5 === 1 ? 'w' : f === 4 && i % 9 === 0 ? 'x' : 'o';
const FU = {
    uG1: { n: 'Strážca Citadely', f: 0, p: 70, b: 'i', hp: 55, d: 8, sp: 1.15, r: 7, col: '#22222a', hel: '#c8ccd4', wp: 'sp' },
    uG2: { n: 'Ithilienský hraničiar', f: 0, p: 65, b: 'a', hp: 28, d: 6, sp: 1.3, r: 6, col: '#3a5a32', hel: '#4a3a2a', wp: 'bow' },
    roh: { n: 'Rohirim', f: 1, p: 90 },
    uR2: { n: 'Rohanský kopijník', f: 1, p: 40, b: 'i', hp: 42, d: 7, sp: 1.2, r: 7, col: '#4a6a2a', hel: '#c9a040', wp: 'sp' },
    uM1: { n: 'Mordorský ork', f: 2, p: 20, b: 'i', hp: 30, d: 5, sp: 1.2, r: 6, col: '#3a2a22', hel: '#2a2a2a', wp: 'sw' },
    uM2: { n: 'Olog-hai', f: 2, p: 120, b: 'i', hp: 140, d: 15, sp: .9, r: 11, col: '#4a4e44', hel: '#1a1a1a', wp: 'ax' },
    uI1: { n: 'Uruk-hai', f: 3, p: 60, b: 'i', hp: 60, d: 9, sp: 1.15, r: 8, col: '#1a1a1e', hel: '#e8e8e8', wp: 'sw' },
    uI2: { n: 'Jazdec na vlkovi', f: 3, p: 70, b: 'c', hp: 40, d: 7, sp: 2.3, r: 8, col: '#3a3028', hel: '#2a2a2a', wp: 'sw' },
    uH1: { n: 'Haradský bojovník', f: 4, p: 35, b: 'i', hp: 36, d: 6, sp: 1.25, r: 6, col: '#b0301a', hel: '#d0a050', wp: 'sp' },
    uH2: { n: 'Haradský lukostrelec', f: 4, p: 45, b: 'a', hp: 26, d: 5, sp: 1.2, r: 6, col: '#c06a20', hel: '#e0c080', wp: 'bow' },
    uE1: { n: 'Trpasličí sekerník', f: 5, p: 75, b: 'i', hp: 70, d: 10, sp: 1, r: 7, col: '#3a5a8a', hel: '#a0a8b0', wp: 'ax' },
    uE2: { n: 'Trpasličí kušiník', f: 5, p: 70, b: 'e', hp: 40, d: 7, sp: 1, r: 6, col: '#2a4a7a', hel: '#a0a8b0', wp: 'bow' },
    uN1: { n: 'Easterlingský kopijník', f: 7, p: 45, b: 'i', hp: 45, d: 7, sp: 1.2, r: 7, col: '#6a2a4a', hel: '#d0a040', wp: 'sp' },
    uN2: { n: 'Jazdec z Rhûnu', f: 7, p: 85, b: 'c', hp: 55, d: 8, sp: 2, r: 9, col: '#5a1f4a', hel: '#c09030', wp: 'sp' },
    uN3: { n: 'Jazdecký lukostrelec z Rhûnu', f: 7, p: 90, b: 'c', hp: 42, d: 6, sp: 2.1, r: 9, col: '#7a3a2a', hel: '#c09030', wp: 'bow' },
    elf: { n: 'Galadhrimský lukostrelec', f: 8, p: 60 },
    uL2: { n: 'Elfský šermiar', f: 8, p: 80, b: 'i', hp: 50, d: 10, sp: 1.4, r: 7, col: '#5a7a5a', hel: '#e8d870', wp: 'sw' },
    // ťažké jednotky z miest: jaskynný troll (Mordor), mûmak (Harad), rytier labute (Gondor), berserker (Isengard)
    uM3: { n: 'Jaskynný troll', f: 2, p: 240, b: 't', hp: 170, d: 18, sp: .85, r: 11, col: '#4e5446', hel: '#1a1a1a', wp: 'ax', heavy: 1 },
    uH3: { n: 'Mûmak s vežou', f: 4, p: 420, b: 'x', hp: 320, d: 26, sp: .7, r: 15, col: '#7a7670', hel: '#d0a050', wp: 'sp', heavy: 1 },
    uG3: { n: 'Rytier Dol Amrothu', f: 0, p: 150, b: 'c', hp: 75, d: 11, sp: 1.9, r: 8, col: '#2a3a6a', hel: '#c8ccd4', wp: 'sp', heavy: 1 },
    uI3: { n: 'Uruk berserker', f: 3, p: 130, b: 'i', hp: 90, d: 14, sp: 1.3, r: 8, col: '#1a1a1e', hel: '#e8e8e8', wp: 'sw', heavy: 1 }
};
const FK = [['uG1', 'uG2', 'uG3'], ['roh', 'uR2'], ['uM1', 'uM2', 'uM3'], ['uI1', 'uI2', 'uI3'], ['uH1', 'uH2', 'uH3'], ['uE1', 'uE2'], [], ['uN1', 'uN2', 'uN3'], ['elf', 'uL2']];
