import { Component } from "../component.js";

export class Suspense extends Component {
  fallback;

  /** @returns {JSX.Node|JSX.Node[]} */
  render() {
    return this.children;
  }
}
