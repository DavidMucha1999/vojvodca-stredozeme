/*
 * Test počítačovej verzie (Electron, priečinok desktop/) bez obrazovky.
 * Spustenie (Linux): ELECTRON=/cesta/k/electron xvfb-run -a node tests/desktop_test.js
 * Overí: okno a názov, window.desktop, tlačidlo Ukončiť hru, automatický prenos uložení z prehliadača (Stiahnuté súbory),
 * ukladanie do súborov v Dokumenty/Vojvodca Stredozeme/Uloženia, načítanie, prepnutie celej obrazovky a ukončenie.
 */
const { _electron } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.join(__dirname, '..'), T = fs.mkdtempSync(path.join(os.tmpdir(), 'vojvodca-desktop-'));
const HOME = path.join(T, 'home'), APP = path.join(T, 'app');
fs.mkdirSync(path.join(HOME, 'Downloads'), { recursive: true }); fs.mkdirSync(path.join(HOME, 'Documents'), { recursive: true }); fs.mkdirSync(path.join(HOME, '.config'), { recursive: true }); fs.mkdirSync(APP);
fs.writeFileSync(path.join(HOME, '.config', 'user-dirs.dirs'), 'XDG_DOCUMENTS_DIR="$HOME/Documents"\nXDG_DOWNLOAD_DIR="$HOME/Downloads"\n');
for (const f of ['main.js', 'preload.js', 'package.json', 'ikona.png']) fs.copyFileSync(path.join(ROOT, 'desktop', f), path.join(APP, f));
fs.writeFileSync(path.join(APP, 'config.json'), JSON.stringify({ gameDir: ROOT }));
const exp = { v: 2, K: 8, G: { name: 'Importovaný', day: 7, fac: 6, x: 100, y: 100, lv: 2 }, T: [], E: [] };
fs.writeFileSync(path.join(HOME, 'Downloads', 'vojvodca-ulozenia.json'), JSON.stringify({ app: 'vojvodca-stredozeme', saves: { vs3: JSON.stringify(exp) } }));
let fails = 0; const check = (n, ok, i = '') => { console.log((ok ? 'OK   ' : 'CHYBA') + ' ' + n + (i ? ' – ' + i : '')); if (!ok) fails++; };
(async () => {
    const app = await _electron.launch({ executablePath: process.env.ELECTRON, args: [APP, '--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], env: { ...process.env, HOME }, timeout: 120000 });
    const win = await app.firstWindow(), errs = [];
    win.on('pageerror', e => errs.push(String(e))); win.setDefaultTimeout(180000);
    await win.waitForFunction("typeof game !== 'undefined' && game.scene && game.scene.getScenes(true).some(s => s.scene.key === 'Intro')");
    const E = f => win.evaluate(f), docs = path.join(HOME, 'Documents', 'Vojvodca Stredozeme', 'Uloženia');
    check('Okno hry', await win.title() === 'Vojvodca Stredozeme' && await E("!!window.desktop && DESKTOP === window.desktop && document.documentElement.classList.contains('desktop')"));
    check('Tlačidlo Ukončiť hru na úvode', await E("[...document.querySelectorAll('#ov button')].some(b => b.textContent === 'Ukončiť hru')"));
    check('Prenos uložení z prehliadača', fs.existsSync(path.join(docs, 'Pozícia 3.json')) && /Importovaný/.test(await E("(slotData(3) || {}).text || ''")));
    await win.click('text=Nová hra'); await win.waitForTimeout(300); await win.click('text=Vyraziť do boja'); await win.waitForTimeout(800);
    await E("(() => { for (const t of ['Rozumiem', 'Na cestu']) { const b = [...document.querySelectorAll('#bt button')].find(b => b.textContent.trim().startsWith(t)); if (b) b.click(); } })()");
    await win.waitForTimeout(2000);
    check('Uloženie do súboru', await E("save(1)") === 1 && fs.existsSync(path.join(docs, 'Pozícia 1.json')));
    check('Načítanie zo súboru', await E("(() => { const d = G.day, n = G.name; G = null; load(1); return !!G && G.day === d && G.name === n; })()"));
    const bw = await app.browserWindow(win), f0 = await bw.evaluate(w => w.isFullScreen());
    await E("DESKTOP.fullscreen()"); await win.waitForTimeout(1500);
    check('Celá obrazovka sa prepína', f0 !== await bw.evaluate(w => w.isFullScreen()));
    check('Žiadne chyby na stránke', !errs.length, errs.slice(0, 2).join(' | '));
    await E("DESKTOP.quit()").catch(() => { });
    check('Ukončenie hry', await app.waitForEvent('close', { timeout: 15000 }).then(() => true).catch(() => false));
    console.log(fails ? '\n' + fails + ' testov zlyhalo.' : '\nVšetky testy prešli.');
    fs.rmSync(T, { recursive: true, force: true });
    process.exit(fails ? 1 : 0);
})().catch(e => { console.error('CHYBA', e); process.exit(1); });
