import { Component } from "../component.js";

export class Safe extends Component {
  error;
  fallback;

  /** @returns {JSX.Node|JSX.Node[]|null} */
  render() {
    if (this.error) return typeof this.fallback === "function" ? this.fallback(this.error) : this.fallback;
    return this.children;
  }
}
