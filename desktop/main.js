/*
 * Vojvodca Stredozeme – počítačová verzia (Electron). Autor a vývojár hry: Dávid Mucha.
 * Otvorí hru vo vlastnom okne bez prehliadača (predvolene na celú obrazovku, F11 alebo Alt+Enter prepína),
 * uložené hry ukladá ako súbory do Dokumenty\Vojvodca Stredozeme\Uloženia a pri prvom spustení prevezme
 * uloženia exportované z prehliadačovej verzie (súbor vojvodca-ulozenia.json v priečinku Stiahnuté súbory).
 * Hra sa načítava priamo z priečinka projektu (config.json → gameDir, inak priečinok nad desktop/),
 * takže každá úprava projektu sa v nainštalovanej hre prejaví bez preinštalovania.
 */
const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path'), fs = require('fs');
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';   // hra nenačítava cudzí obsah z internetu (okrem písma)

const GAME_FILE = 'Vojvodca Stredozeme.html';
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '')); } catch (e) { return d; } };
const CFG = readJson(path.join(__dirname, 'config.json'), {});
const GAME_DIR = [CFG.gameDir, path.join(__dirname, '..')].find(d => d && fs.existsSync(path.join(d, GAME_FILE)));
const HOME = path.join(app.getPath('documents'), 'Vojvodca Stredozeme');
const SAVES = path.join(HOME, 'Uloženia');
const SETTINGS = path.join(HOME, 'nastavenia.json');

/** Kľúč pozície v hre (vs1 … vs6, vsauto) ↔ meno súboru (Pozícia 1.json, Automatická.json). */
const fileOf = k => /^vs\d+$/.test(k) ? 'Pozícia ' + k.slice(2) + '.json' : k === 'vsauto' ? 'Automatická.json' : /^vsauto\d$/.test(k) ? 'Automatická ' + k.slice(6) + '.json' : k.replace(/[^\w.-]/g, '_') + '.json';
const keyOf = f => { let m = /^Pozícia (\d+)\.json$/.exec(f); if (m) return 'vs' + m[1]; if (f === 'Automatická.json') return 'vsauto'; m = /^Automatická (\d)\.json$/.exec(f); if (m) return 'vsauto' + m[1]; m = /^(.+)\.json$/.exec(f); return m ? m[1] : null; };
const savesList = () => { try { return fs.readdirSync(SAVES).map(keyOf).filter(Boolean); } catch (e) { return []; } };
function writeSave(k, v) {
    fs.mkdirSync(SAVES, { recursive: true });
    const f = path.join(SAVES, fileOf(k)), tmp = f + '.tmp';
    fs.writeFileSync(tmp, v, 'utf8'); fs.renameSync(tmp, f);   // najprv dočasný súbor: pri výpadku sa uloženie nepoškodí
}
/** Prevezme uloženia zo súboru exportovaného v prehliadači; vráti počet pozícií (−1 = súbor sa nedá prečítať). */
function importFrom(file) {
    const d = readJson(file, null);
    if (!d || !d.saves) return -1;
    let n = 0;
    for (const [k, v] of Object.entries(d.saves)) if (/^vs/.test(k) && typeof v === 'string') { writeSave(k, v); n++; }
    return n;
}

let win = null;
const settings = Object.assign({ fullscreen: true, w: 1440, h: 960 }, readJson(SETTINGS, {}));
const saveSettings = () => { try { fs.mkdirSync(HOME, { recursive: true }); fs.writeFileSync(SETTINGS, JSON.stringify(settings, null, 1)); } catch (e) { } };

function createWindow() {
    win = new BrowserWindow({
        width: settings.w, height: settings.h, minWidth: 960, minHeight: 640, show: false, fullscreen: settings.fullscreen,
        title: 'Vojvodca Stredozeme', backgroundColor: '#120e0c', icon: path.join(__dirname, 'ikona.png'), autoHideMenuBar: true,
        webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false, backgroundThrottling: false }
    });
    win.once('ready-to-show', () => win.show());
    win.on('page-title-updated', e => e.preventDefault());
    // F11 a Alt+Enter: celá obrazovka / okno (Esc patrí hre, preto celú obrazovku neruší)
    win.webContents.on('before-input-event', (e, inp) => {
        if (inp.type === 'keyDown' && (inp.key === 'F11' || (inp.key === 'Enter' && inp.alt))) { e.preventDefault(); toggleFull(); }
        if (inp.type === 'keyDown' && inp.key === 'F12' && inp.control && inp.shift) win.webContents.toggleDevTools();   // nástroje pre vývojára (Ctrl+Shift+F12)
    });
    win.on('resize', () => { if (!win.isFullScreen() && !win.isMaximized()) { [settings.w, settings.h] = win.getSize(); } });
    win.on('close', saveSettings);
    // odkazy von (napr. web) sa otvoria v bežnom prehliadači, okno hry nikam neodchádza
    win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
    win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); shell.openExternal(url); } });
    win.webContents.on('render-process-gone', (e, d) => { dialog.showErrorBox('Vojvodca Stredozeme', 'Hra neočakávane skončila (' + d.reason + '). Spusť ju prosím znova; automatické uloženie je z konca posledného dňa.'); });
    win.loadFile(path.join(GAME_DIR, GAME_FILE));
}
function toggleFull() { if (!win) return; settings.fullscreen = !win.isFullScreen(); win.setFullScreen(settings.fullscreen); saveSettings(); }

ipcMain.on('save:load', (e, k) => { try { e.returnValue = fs.readFileSync(path.join(SAVES, fileOf(k)), 'utf8'); } catch (x) { e.returnValue = null; } });
ipcMain.on('save:save', (e, k, v) => { try { writeSave(k, v); e.returnValue = true; } catch (x) { e.returnValue = false; } });
ipcMain.on('save:list', e => { e.returnValue = savesList(); });
ipcMain.on('save:import', e => {
    const f = dialog.showOpenDialogSync(win, { title: 'Vyber súbor s uloženými hrami', defaultPath: app.getPath('downloads'), filters: [{ name: 'Uložené hry', extensions: ['json'] }], properties: ['openFile'] });
    e.returnValue = f && f[0] ? importFrom(f[0]) : -2;
});
ipcMain.on('save:open', () => { fs.mkdirSync(SAVES, { recursive: true }); shell.openPath(SAVES); });
ipcMain.on('app:fullscreen', toggleFull);
ipcMain.on('app:quit', () => app.quit());

if (!app.requestSingleInstanceLock()) app.quit();   // hra beží len raz; druhé spustenie prenesie okno dopredu
else {
    app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
    app.setAppUserModelId('sk.dmucha.vojvodca-stredozeme');
    Menu.setApplicationMenu(null);
    app.whenReady().then(() => {
        if (!GAME_DIR) { dialog.showErrorBox('Vojvodca Stredozeme', 'Nenašiel som súbory hry (' + GAME_FILE + '). Spusti prosím znova „Nainštalovať hru.bat“ z priečinka hry.'); app.quit(); return; }
        // prvé spustenie: prevziať uloženia exportované z prehliadačovej verzie
        const exp = path.join(app.getPath('downloads'), 'vojvodca-ulozenia.json');
        if (!savesList().length && fs.existsSync(exp)) importFrom(exp);
        createWindow();
    });
    app.on('window-all-closed', () => app.quit());
}
