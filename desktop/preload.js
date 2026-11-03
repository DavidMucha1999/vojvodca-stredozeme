/*
 * Most medzi hrou a počítačovou verziou: hra dostane window.desktop (js/core/store.js) – ukladanie do súborov,
 * import uložení, otvorenie priečinka s uloženiami, celá obrazovka a ukončenie hry. Nič iné z počítača hra nevidí.
 */
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop', {
    load: k => ipcRenderer.sendSync('save:load', k),
    save: (k, v) => ipcRenderer.sendSync('save:save', k, v),
    list: () => ipcRenderer.sendSync('save:list'),
    importSaves: () => ipcRenderer.sendSync('save:import'),
    openSaves: () => ipcRenderer.send('save:open'),
    fullscreen: () => ipcRenderer.send('app:fullscreen'),
    quit: () => ipcRenderer.send('app:quit')
});
