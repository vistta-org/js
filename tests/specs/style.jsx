import { Component } from "@vistta/js";
import style from "./style.css";

const tests = {
  Style: {
    Component: class extends Component {
      render() {
        return <div id="target" className="centered" {...style} />;
      }
    },
    test: async (page, { equal }) => {
      const target = await (
        await page.querySelector("#target", { wait: true })
      ).boundingBox();
      const { width, height } = await page.dimensions();
      equal(target.y * 2 + target.height, height);
      equal(target.x * 2 + target.width, width);
    },
  },
};

export default tests;
