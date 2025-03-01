import { app as electron } from 'electron/main';
import dom from './dom/index.js';

electron.whenReady().then(async() => {
    const main = (await import("file://" + process.argv[2]))?.default;
    console.log(main);
});

electron.on('window-all-closed', () => process.platform !== 'darwin' && electron.quit());