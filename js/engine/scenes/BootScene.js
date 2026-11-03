/*
 * ENGINE: štartovacia scéna s načítacou obrazovkou v duchu Pána prsteňov.
 * Pripraví svet (mapu, bojisko), načíta textúry mapy s priebehom (Prsteň, zlatá lišta, citáty), zvuky a písma,
 * spustí úvod a textúry bojiska a vojakov dočíta na pozadí (Art.loadTextures(scene, 'battle')).
 */
class BootScene extends Phaser.Scene {
    constructor() { super('Boot'); }

    create() {
        ov.classList.add('intro'); ov.classList.add('hide');   // úvodný formulár sa ukáže až po načítaní
        const pre = document.getElementById('boot'); if (pre) pre.remove();   // statická obrazovka z HTML (kým sa načítali skripty)
        tb.style.display = 'none';
        hud.style.visibility = 'hidden';
        tb.id = 'tb'; od.id = 'od';
        cv.width = W * RES; cv.height = H * RES;          // pomocné plátno pre kreslenie vo vysokom rozlíšení
        this.buildScreen();
        this.prog = 0; this.target = 0; this.step = 'Kreslím mapu Stredozeme…';
        const QUOTES = ['„Jeden prsteň vládne všetkým, jeden im všetkým káže…“', '„Aj ten najmenší človek môže zmeniť beh budúcnosti.“', '„Nie je všetko zlato, čo sa blyští, a nie každý, kto blúdi, je stratený.“', '„Stačí sa rozhodnúť, čo urobíme s časom, ktorý nám je daný.“', '„Mnohí, čo žijú, si zaslúžia smrť. A niektorí, čo zomreli, by si zaslúžili život.“', '„Dokonca aj tma musí pominúť. Príde nový deň.“', '„Cesta ide ďalej a ďalej, od dverí, kde sa začala.“'];
        this.quote.setText(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
        this.time.addEvent({ delay: 4200, loop: true, callback: () => { this.quote.setText(QUOTES[Math.floor(Math.random() * QUOTES.length)]); } });
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
            const go = () => { if (this.prog < .97 && this.scene.isActive()) return this.time.delayedCall(60, go); this.time.delayedCall(150, () => {
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
        this.prog += (this.target - this.prog) * .3;   // po snímkach, nie podľa času – na pomalom stroji Phaser skracuje delta
        const S = RES, cx = W * S / 2, cy = H * S / 2 - 30 * S, t = this.t;
        // Prsteň: zlatý prstenec s odleskom a ohnivým písmom, ktoré sa posúva po obvode
        const g = this.ring; g.clear();
        const R0 = 78 * S, th = 15 * S;
        g.lineStyle(th + 4 * S, 0x2a1a08, 1).strokeEllipse(cx, cy, R0 * 2, R0 * 1.3);
        g.lineStyle(th, 0xd9a441, 1).strokeEllipse(cx, cy, R0 * 2, R0 * 1.3);
        g.lineStyle(th * .45, 0xffe6a0, .8).strokeEllipse(cx - 3 * S, cy - 3 * S, R0 * 2 - 6 * S, R0 * 1.3 - 6 * S);
        g.lineStyle(th * .3, 0x8a5a10, .7).strokeEllipse(cx + 3 * S, cy + 4 * S, R0 * 2 - 4 * S, R0 * 1.3 - 4 * S);
        for (let k = 0; k < 34; k++) {   // „tengwar“: ohnivé znaky
            const a = t * .5 + k * 6.283 / 34, px = cx + Math.cos(a) * R0, py = cy + Math.sin(a) * R0 * .65, front = Math.sin(a) > -.2;
            if (!front) continue;
            const h = (3 + ((k * 7) % 4)) * S, w = 1.6 * S, al = .55 + .45 * Math.sin(t * 3 + k);
            g.fillStyle(0xff7a20, al).fillRect(px - w / 2, py - h / 2, w, h);
            if (k % 3 === 0) g.fillStyle(0xffb040, al).fillCircle(px + 2 * S, py - h / 2, .9 * S);
            if (k % 4 === 1) g.fillStyle(0xff9030, al).fillRect(px - 2.5 * S, py + h / 2, 5 * S, .8 * S);
        }
        g.fillStyle(0xff8a30, .08 + .04 * Math.sin(t * 2)).fillEllipse(cx, cy, R0 * 2.6, R0 * 1.9);
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
