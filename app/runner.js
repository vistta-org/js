import App from "./index.js";

global.app = new App(...process.argv.slice(2));
global.app.start();
