import { Component, Suspense } from "@vistta/js";
import { LOADING_VALUE, LOADED_VALUE } from "../../defaults.js";

export default class extends Component {
  render() {
    return (
      <span id="output">
        <Suspense fallback={LOADING_VALUE}>{LOADED_VALUE}</Suspense>
      </span>
    );
  }
}
