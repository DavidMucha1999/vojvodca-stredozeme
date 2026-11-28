/*
 * ENGINE: štartovacia scéna s načítacou obrazovkou (ilustrácia assets/nacitanie.webp, citáty, zlatá lišta).
 * Pripraví svet, načíta textúry mapy s priebehom, zvuky a písma a spustí úvod (Intro).
 */
class BootScene extends Phaser.Scene {
    constructor() { super('Boot'); }
    /** Najkratšie trvanie načítavacej obrazovky (ms): pri prvom spustení aspoň chvíľa na Prsteň, pri návrate do menu bez čakania. */
    static get MIN_LOAD() { return BootScene.again ? 0 : 4000; }

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
            'Tip: červený oblúk nad nepriateľom znamená nápriah – vtedy sa kry (pravé tlačidlo alebo Shift).', 'Tip: padlý veliteľ v zlatom kruhu zlomí morálku celého nepriateľského vojska.', 'Tip: na koni sa rozbehni rovno – nápor s kopijou zrazí aj ťažkého bojovníka.',
            'Tip: hladná družina dezertuje – zásoby jedla kúpiš na trhu v hrade aj v dedine.', 'Tip: chlieb, mäso, syr a pivo spolu dvíhajú morálku viac než štyri vrecia chleba.',
            'Tip: Kronika hrdinu zapisuje tvoje skutky – na konci príbehu ťa čaká jeden zo šiestich koncov.', 'Tip: obťažnosť, hlasitosť a kvalitu grafiky zmeníš v Nastaveniach aj počas hry.'];
        let qi = Math.floor(Math.random() * QUOTES.length);
        this.quote.setText(QUOTES[qi]);
        this.time.addEvent({ delay: 4000, loop: true, callback: () => { qi = (qi + 1 + Math.floor(Math.random() * 3)) % QUOTES.length; this.quote.setText(QUOTES[qi]); } });
        const steps = [
            ['Kreslím mapu Stredozeme…', () => new Promise(r => setTimeout(r, 30))],
            ['Staviam hrady a dediny…', () => Art.loadTextures(this, (d, n) => { this.target = .1 + .6 * d / n; })],
            ['Ladím rohy a bubny…', () => new Promise(r => { SoundFX.init(this); setTimeout(r, 50); })],
            ['Čakám na pisárov (písma)…', () => document.fonts && document.fonts.load
                ? Promise.race([Promise.all([document.fonts.load('15px "IM Fell English"'), document.fonts.load('26px "Uncial Antiqua"')]), new Promise(r => setTimeout(r, 2500))])
                : Promise.resolve()]
        ];
        const ends = [.1, .7, .8, 1];
        steps.reduce((acc, [name, fn], i) => acc.then(() => { this.step = name; return fn().then(() => { this.target = ends[i]; }); }), Promise.resolve()).then(() => {
            this.step = 'Brána sa otvára…'; this.target = 1;
            const go = () => { if ((this.prog < .97 || performance.now() - this.t0 < BootScene.MIN_LOAD) && this.scene.isActive()) return this.time.delayedCall(60, go); this.time.delayedCall(150, () => {
                this.scene.launch('UI');   // formulár úvodu ukáže až IntroScene po prvom snímku (nie nad načítavacou obrazovkou)
                this.scene.start('Intro');
            }); };
            go();
        });
    }

    /** Obrazovka: tmavé pozadie s názvom, kým sa nenačíta ilustrácia; text kroku, citát a lišta. */
    buildScreen() {
        const S = RES, cx = W * S / 2, cy = H * S / 2 - 30 * S;
        this.cameras.main.setBackgroundColor('#0b0806');
        const font = '"IM Fell English", Georgia, serif';
        this.title = this.add.text(cx, cy - 150 * S, 'Vojvodca Stredozeme', { fontFamily: '"Uncial Antiqua", Georgia, serif', fontSize: 30 * S + 'px', color: '#e8c060', stroke: '#2a1a08', strokeThickness: 4 * S }).setOrigin(.5);
        this.sub = this.add.text(cx, cy - 122 * S, 'Vojna o Stredozem v duchu Pána prsteňov', { fontFamily: font, fontSize: 12 * S + 'px', color: '#b8a070' }).setOrigin(.5);
        this.quote = this.add.text(cx, (H - 78) * S, '', { fontFamily: font, fontSize: 12 * S + 'px', color: '#c8b890', fontStyle: 'italic', align: 'center', wordWrap: { width: 560 * S } }).setOrigin(.5);
        this.bar = this.add.graphics();
        this.stepTxt = this.add.text(cx, (H - 42) * S, '', { fontFamily: font, fontSize: 11 * S + 'px', color: '#d9a441' }).setOrigin(.5);
        this.add.text(cx, H * S - 14 * S, 'Autor a vývojár hry: Dávid Mucha', { fontFamily: 'Georgia, serif', fontSize: 10 * S + 'px', color: '#8a7a5a' }).setOrigin(.5);
        this.t = 0; this.barY = H - 58;
        const img = new Image();
        img.onload = () => {
            if (!this.scene.isActive()) return;
            this.textures.addImage('nacitanie', img);
            const sc = Math.max(W * S / img.width, H * S / img.height);
            this.add.image(W * S / 2, H * S / 2, 'nacitanie').setScale(sc).setDepth(-2);
            const sh = this.add.graphics().setDepth(-1);   // tmavý prechod dole, aby bol text čitateľný
            for (let k = 0; k < 40; k++) sh.fillStyle(0x050302, .022 + k * .0016).fillRect(0, (H - 150 + k * 3.75) * S, W * S, 3.75 * S);
            sh.fillStyle(0x050302, .6).fillRect(0, (H - 26) * S, W * S, 26 * S);
            this.title.setVisible(false); this.sub.setVisible(false);
        };
        img.src = 'assets/nacitanie.webp';
    }

    /** Tenká zlatá lišta so zapálenou špičkou a text kroku. */
    drawBar() {
        const S = RES, cx = W * S / 2, t = this.t, b = this.bar; b.clear();
        const bw = 380 * S, bh = 4 * S, bx = cx - bw / 2, by = this.barY * S, pw = Math.max(4 * S, bw * this.prog);
        b.fillStyle(0x120c06, .85).fillRect(bx - 2 * S, by - 2 * S, bw + 4 * S, bh + 4 * S); b.lineStyle(1 * S, 0x6a4a18, 1).strokeRect(bx - 2 * S, by - 2 * S, bw + 4 * S, bh + 4 * S);
        b.fillStyle(0xd9a441, 1).fillRect(bx, by, pw, bh); b.fillStyle(0xffe6a0, .55).fillRect(bx, by, pw, bh * .4);
        b.fillStyle(0xff9a30, .35 + .2 * Math.sin(t * 6)).fillCircle(bx + pw, by + bh / 2, 8 * S); b.fillStyle(0xffd070, .9).fillCircle(bx + pw, by + bh / 2, 2.5 * S);
        this.stepTxt.setText(this.step + '  ' + Math.round(this.prog * 100) + ' %');
    }

    update(time, delta) {
        this.t += delta / 1000;
        const cap = Math.min(1, (performance.now() - this.t0) / BootScene.MIN_LOAD);   // lišta nepredbehne najkratší čas načítania
        this.prog += (Math.min(this.target, cap) - this.prog) * .3;   // po snímkach, nie podľa času – na pomalom stroji Phaser skracuje delta
        this.drawBar();
    }
}
