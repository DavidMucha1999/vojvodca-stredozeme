/*
 * ENGINE: štartovacia scéna s načítacou obrazovkou v duchu Pána prsteňov.
 * Pripraví svet (mapu, bojisko), načíta textúry mapy s priebehom (Prsteň, zlatá lišta, citáty), zvuky a písma,
 * spustí úvod a textúry bojiska a vojakov dočíta na pozadí (Art.loadTextures(scene, 'battle')).
 */
class BootScene extends Phaser.Scene {
    constructor() { super('Boot'); }
    /** Najkratšie trvanie načítavacej obrazovky (ms): 5 s len pri prvom spustení hry; pri návrate do menu (znovunačítanie stránky v tom istom okne) bez čakania. */
    static get MIN_LOAD() { return BootScene.again ? 0 : 5000; }

    create() {
        ov.classList.add('intro'); ov.classList.add('hide');   // úvodný formulár sa ukáže až po načítaní
        const pre = document.getElementById('boot'); if (pre) pre.remove();   // statická obrazovka z HTML (kým sa načítali skripty)
        tb.style.display = 'none';
        hud.style.visibility = 'hidden';
        tb.id = 'tb'; od.id = 'od';
        cv.width = W * RES; cv.height = H * RES;          // pomocné plátno pre kreslenie vo vysokom rozlíšení
        this.buildScreen();
        this.prog = 0; this.target = 0; this.step = 'Kreslím mapu Stredozeme…';
        try { BootScene.again = sessionStorage.getItem('vsBooted') === '1'; sessionStorage.setItem('vsBooted', '1'); } catch (e) { BootScene.again = false; }
        this.t0 = performance.now();   // načítanie trvá aspoň MIN_LOAD ms, aby si hráč stihol pozrieť obrazovku
        // vlastné vety v duchu Stredozeme a tipy k hre; striedajú sa každé 4 sekundy
        const QUOTES = ['„Kto drží meč, nech nezabudne, za koho ho drží.“', '„Aj najdlhšia noc nad Tieňom sa raz skončí pri brieždení.“', '„Hrad nepadá, keď sa zrúti brána, ale keď sa jeho ľudia vzdajú.“',
            '„Na každej ceste je krčma a v každej krčme niekto, kto pozná cestu.“', '„Prsteň šepká každému iné meno. Múdry nepočúva žiadne.“', '„Zástavy sa menia, kopce ostávajú.“',
            'Tip: v tábore podrž medzerník a čas pobeží osemkrát rýchlejšie.', 'Tip: obliehanie potrebuje rebríky alebo vežu – pri pevných hradbách sa oplatí aj baranidlo.',
            'Tip: keď zaútočíš pri spojencoch, pridajú sa k tebe do bitky.', 'Tip: obliehaná posádka žije zo zásob – čakanie ju oslabí, no hrozí výpad.',
            'Tip: v krčme nájdeš spoločníkov a krčmár vie, čo sa deje vo svete.', 'Tip: zajatého veliteľa môžeš prepustiť za výkupné alebo pre česť.',
            'Tip: červený oblúk nad nepriateľom znamená nápriah – vtedy sa kry (pravé tlačidlo alebo Shift).', 'Tip: padlý veliteľ v zlatom kruhu zlomí morálku celého nepriateľského vojska.', 'Tip: na koni sa rozbehni rovno – nápor s kopijou zrazí aj ťažkého bojovníka.'];
        let qi = Math.floor(Math.random() * QUOTES.length);
        this.quote.setText(QUOTES[qi]);
        this.time.addEvent({ delay: 4000, loop: true, callback: () => { qi = (qi + 1 + Math.floor(Math.random() * 3)) % QUOTES.length; this.quote.setText(QUOTES[qi]); } });
        const steps = [
            ['Kreslím mapu Stredozeme…', () => new Promise(r => setTimeout(r, 30))],
            ['Staviam hrady a dediny…', () => Art.loadTextures(this, 'map', (d, n) => { this.target = .1 + .6 * d / n; })],
            ['Ladím rohy a bubny…', () => new Promise(r => { SoundFX.init(this); setTimeout(r, 50); })],
            ['Maľujem erby a zástavy…', () => Art.loadOverrides(this)],
            ['Čakám na pisárov (písma)…', () => document.fonts && document.fonts.load
                ? Promise.race([Promise.all([document.fonts.load('15px "IM Fell English"'), document.fonts.load('26px "Uncial Antiqua"')]), new Promise(r => setTimeout(r, 2500))])
                : Promise.resolve()]
        ];
        const ends = [.1, .7, .78, .88, 1];
        steps.reduce((acc, [name, fn], i) => acc.then(() => { this.step = name; return fn().then(() => { this.target = ends[i]; }); }), Promise.resolve()).then(() => {
            this.step = 'Brána sa otvára…'; this.target = 1;
            const go = () => { if ((this.prog < .97 || performance.now() - this.t0 < BootScene.MIN_LOAD) && this.scene.isActive()) return this.time.delayedCall(60, go); this.time.delayedCall(150, () => {
                this.scene.launch('UI');   // formulár úvodu ukáže až IntroScene po prvom snímku (nie nad načítavacou obrazovkou)
                this.scene.start('Intro');
            }); };
            go();
        });
    }

    /** Obrazovka: tmavé pozadie, veľký Prsteň s ohnivým nápisom, názov, lišta a text kroku. */
    buildScreen() {
        const S = RES, cx = W * S / 2, cy = H * S / 2 - 30 * S;
        this.cameras.main.setBackgroundColor('#0b0806');
        const bg = this.add.graphics();
        for (let k = 0; k < 8; k++) bg.fillStyle(0x3a2410, .06).fillCircle(cx, cy, (220 - k * 24) * S);   // teplá žiara za prsteňom
        for (let k = 0; k < 140; k++) { const a = Math.random() * 6.283, r = (60 + Math.random() * 330) * S; bg.fillStyle(0xffd080, Math.random() * .35).fillCircle(cx + Math.cos(a) * r, cy + Math.sin(a) * r * .6, Math.random() * 1.6 * S); }   // iskry
        this.ring = this.add.graphics();
        this.title = this.add.text(cx, cy - 150 * S, 'Vojvodca Stredozeme', { fontFamily: '"Uncial Antiqua", Georgia, serif', fontSize: 30 * S + 'px', color: '#e8c060', stroke: '#2a1a08', strokeThickness: 4 * S }).setOrigin(.5);
        this.sub = this.add.text(cx, cy - 122 * S, 'Vojna o Stredozem v duchu Pána prsteňov', { fontFamily: '"IM Fell English", Georgia, serif', fontSize: 12 * S + 'px', color: '#b8a070' }).setOrigin(.5);
        this.quote = this.add.text(cx, cy + 118 * S, '', { fontFamily: '"IM Fell English", Georgia, serif', fontSize: 12 * S + 'px', color: '#c8b890', fontStyle: 'italic', align: 'center', wordWrap: { width: 520 * S } }).setOrigin(.5);
        this.bar = this.add.graphics();
        this.stepTxt = this.add.text(cx, cy + 170 * S, '', { fontFamily: '"IM Fell English", Georgia, serif', fontSize: 11 * S + 'px', color: '#d9a441' }).setOrigin(.5);
        this.add.text(cx, H * S - 14 * S, 'Autor a vývojár hry: Dávid Mucha', { fontFamily: 'Georgia, serif', fontSize: 10 * S + 'px', color: '#8a7a5a' }).setOrigin(.5);
        this.t = 0;
    }

    update(time, delta) {
        this.t += delta / 1000;
        const cap = Math.min(1, (performance.now() - this.t0) / BootScene.MIN_LOAD);   // lišta nepredbehne najkratší čas načítania
        this.prog += (Math.min(this.target, cap) - this.prog) * .3;   // po snímkach, nie podľa času – na pomalom stroji Phaser skracuje delta
        const S = RES, cx = W * S / 2, cy = H * S / 2 - 30 * S, t = this.t;
        // Prsteň: vznáša sa, pomaly sa natáča okolo zvislej osi (mení sa šírka elipsy), ohnivé písmo beží po obvode
        const g = this.ring; g.clear();
        const bob = Math.sin(t * 1.15) * 6 * S, ry0 = cy + bob, spin = Math.cos(t * .55), R0 = 78 * S, th = 15 * S;
        const rx = R0 * (.78 + .22 * Math.abs(spin)), ry = R0 * .65 * (1 + .04 * Math.sin(t * .8)), tilt = Math.sin(t * .4) * 3 * S;
        g.fillStyle(0x000000, .35 - bob / S * .02).fillEllipse(cx, cy + 112 * S, rx * 1.6 * (1 - bob / S * .02), 14 * S);   // tieň pod prsteňom
        for (let k = 0; k < 4; k++) g.fillStyle(0xff8a30, (.05 + .025 * Math.sin(t * 2 + k)) * (1 - k * .2)).fillEllipse(cx, ry0, rx * (2.2 + k * .35), ry * (2.6 + k * .35));   // pulzujúca žiara
        g.lineStyle(th + 4 * S, 0x2a1a08, 1).strokeEllipse(cx, ry0 + tilt * .2, rx * 2, ry * 2);
        g.lineStyle(th, 0xd9a441, 1).strokeEllipse(cx, ry0 + tilt * .2, rx * 2, ry * 2);
        const sx = spin * 3 * S;   // odlesk sa posúva s natočením
        g.lineStyle(th * .45, 0xffe6a0, .55 + .3 * Math.abs(spin)).strokeEllipse(cx - sx, ry0 - 3 * S, rx * 2 - 6 * S, ry * 2 - 6 * S);
        g.lineStyle(th * .3, 0x8a5a10, .7).strokeEllipse(cx + sx, ry0 + 4 * S, rx * 2 - 4 * S, ry * 2 - 4 * S);
        for (let k = 0; k < 34; k++) {   // ohnivé znaky
            const a = t * .5 + k * 6.283 / 34, px = cx + Math.cos(a) * rx, py = ry0 + Math.sin(a) * ry, front = Math.sin(a) > -.2;
            if (!front) continue;
            const h = (3 + ((k * 7) % 4)) * S, w = 1.6 * S * (.6 + .4 * Math.abs(spin)), al = (.55 + .45 * Math.sin(t * 3 + k)) * (.6 + .4 * Math.abs(spin));
            g.fillStyle(0xff7a20, al).fillRect(px - w / 2, py - h / 2, w, h);
            if (k % 3 === 0) g.fillStyle(0xffb040, al).fillCircle(px + 2 * S, py - h / 2, .9 * S);
            if (k % 4 === 1) g.fillStyle(0xff9030, al).fillRect(px - 2.5 * S, py + h / 2, 5 * S, .8 * S);
        }
        // iskry stúpajú zo žiary
        for (let k = 0; k < 18; k++) {
            const life = (t * .35 + k * .37) % 1, ex = cx + Math.sin(k * 12.9 + t * .3) * (rx * 1.1) * (1 - life * .3), ey = ry0 + ry * .8 - life * 150 * S;
            g.fillStyle(k % 3 ? 0xffb050 : 0xff7020, (1 - life) * .7).fillCircle(ex, ey, (1.6 - life) * S);
        }
        // lišta
        const b = this.bar; b.clear();
        const bw = 420 * S, bh = 10 * S, bx = cx - bw / 2, by = cy + 148 * S;
        b.fillStyle(0x1a1208, 1).fillRoundedRect(bx - 2 * S, by - 2 * S, bw + 4 * S, bh + 4 * S, 5 * S);
        b.lineStyle(1.5 * S, 0x6a4a18, 1).strokeRoundedRect(bx - 2 * S, by - 2 * S, bw + 4 * S, bh + 4 * S, 5 * S);
        const pw2 = Math.max(8 * S, bw * this.prog);
        b.fillStyle(0xd9a441, 1).fillRoundedRect(bx, by, pw2, bh, 4 * S);
        b.fillStyle(0xffe6a0, .55).fillRoundedRect(bx, by, pw2, bh * .4, 3 * S);
        b.fillStyle(0xff9a30, .5 + .3 * Math.sin(t * 6)).fillCircle(bx + pw2, by + bh / 2, 5 * S);
        this.stepTxt.setText(this.step + '  ' + Math.round(this.prog * 100) + ' %');
    }
}
