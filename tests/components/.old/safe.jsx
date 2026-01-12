import { Component, Safe } from "@vistta/js";
import { FALLBACK_VALUE, TEXT_VALUE } from "../../defaults.js";

class ChildComponent extends Component {
  input;
  render() {
    if (this.input % 2 == 1) throw new Error("Dummy Error");
    return <span>{TEXT_VALUE}</span>;
  }
}

class Fallback extends Component {
  render() {
    console.error(this.error);
    return <>{FALLBACK_VALUE}</>;
  }
}

export default class extends Component {
  visible = true;
  counter = 0;
  render() {
    return (
      <>
        <button id="toggle" onClick={() => (this.visible = !this.visible)}>
          toggle
        </button>
        <button id="increment" onClick={() => this.counter++}>
          increment
        </button>
        <div id="counter">{this.counter}</div>
        <div id="output">
          {this.visible && (
            <Safe fallback={<Fallback />}>
              <ChildComponent input={this.counter} />
            </Safe>
          )}
        </div>
      </>
    );
  }
}
