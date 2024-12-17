import { app as electron } from 'electron/main';
import { pathToFileURL } from 'url';
//import fs from "@vistta/fs";
// import { App as DefaultApp } from './index.js';
//import { default as CLI } from "../cli/default.js";
// import { Bundler } from '@vistta/cli';

electron.whenReady().then(async() => {
    global.window = { App: class {}};
    const App = (await import(pathToFileURL(process.argv[2])))?.default;
    console.log(App);
    /*const code = (await new Bundler(new CLI()).run({
        define: { "process.platform": JSON.stringify(process.platform) },
        filename: fs.resolve(process.cwd(), process.argv[2]),
        platform: "node",
        write: false
    }));
    console.log(code);
    const outdir = "build";
    if (!App || !Object.isPrototypeOf.call(DefaultApp, App))
        throw new Error(`Entry file needs to export a @vistta/electron App class.`);
    new App();*/
});
electron.on('window-all-closed', () => process.platform !== 'darwin' && electron.quit());