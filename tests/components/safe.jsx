import { Component, Safe } from "@vistta/js";
import { TEXT_VALUE, FALLBACK_VALUE } from "../defaults.js";

class ChildComponent extends Component {
  input;
  render() {
    if (this.input % 2 == 1) throw new Error("Dummy Error");
    return <span>{TEXT_VALUE}</span>;
  }
}

export default class extends Component {
  counter = 0;
  render() {
    return (
      <>
        <button id="increment" onClick={() => this.counter++}>
          increment
        </button>
        {this.counter}
        <div id="output">
          <Safe fallback={FALLBACK_VALUE}>
            <ChildComponent input={this.counter} />
          </Safe>
        </div>
      </>
    );
  }
}
