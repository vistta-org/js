import { Component, Suspense } from "@vistta/js";
import { LOADING_VALUE, LOADED_VALUE, TIMEOUT } from "../../defaults.js";

export default class extends Component {
  toggle = true;
  content = new Promise((resolve) =>
    setTimeout(() => resolve(LOADED_VALUE), TIMEOUT)
  );
  render() {
    return (
      <>
        <button id="toggle" onClick={() => (this.toggle = !this.toggle)}>
          toggle
        </button>
        <div id="output">
          {this.toggle && (
            <Suspense fallback={LOADING_VALUE}>{this.content}</Suspense>
          )}
        </div>
      </>
    );
  }
}
