import { Component, Suspense } from "@vistta/js";
import { LOADING_VALUE, LOADED_VALUE, TIMEOUT } from "../../defaults.js";

export default class extends Component {
  content1 = new Promise((resolve) =>
    setTimeout(() => resolve(LOADED_VALUE), TIMEOUT)
  );
  content2 = new Promise((resolve) =>
    setTimeout(() => resolve(LOADED_VALUE), TIMEOUT * 2)
  );
  render() {
    return (
      <span id="output">
        <Suspense fallback={LOADING_VALUE}>
          {this.content1}/{this.content2}
        </Suspense>
      </span>
    );
  }
}
