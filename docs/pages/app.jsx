import { Component } from "@vistta/js";
import global from "../public/global.scss" with { as: "config" };
import icon from "../public/logo.png";

export default class Home extends Component {
  render() {
    return (
      <section>
        <h1>Vistta.JS</h1>
        <h2>Javascript Framework</h2>
      </section>
    );
  }
}

export const config = {
  icon: icon,
  theme: "#b87333",
  styles: [global],
};

export const gateway = (req, { next }) => {
  next({ version: process.env.APP_VERSION });
};
