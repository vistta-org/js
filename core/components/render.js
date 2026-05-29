import { Component } from "../component.js";

/**
 * Utility components for conditional and iterable rendering.
 */
export const Render = {
  If: class extends Component {
    condition;

    /** @returns {JSX.Node|JSX.Node[]|false|null|undefined} */
    render() {
      return this.condition && this.children;
    }
  },
  Each: class extends Component {
    of;
    as;

    /** @returns {JSX.Node[]|null} */
    render() {
      if (typeof this.of !== "object") {
        if ("production" !== process.env.NODE_ENV) console.warn("Render.Each 'of' needs to be either an object or an array");
        return null;
      }
      if (typeof this.as !== "function") {
        if ("production" !== process.env.NODE_ENV) console.warn("Render.Each 'as' needs to be a function");
        return null;
      }
      let result = [];
      if (!Array.isArray(this.of)) {
        const keys = Object.keys(this.of);
        for (let i = 0, len = keys.length; i < len; i++) result.push(this.as(this.of[keys[i]], keys[i]));
      } else for (let i = 0, len = this.of.length; i < len; i++) result.push(this.as(this.of[i], i));
      return result;
    }
  },
};
