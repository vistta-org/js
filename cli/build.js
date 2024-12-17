import { default as DefaultCLI } from "./default.js";

export default class extends DefaultCLI {
  async main() {
    if (process.env.NODE_ENV === "development") await this.outdated();
    console.log("here");
  }
}