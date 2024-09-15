import { Component } from "@vistta/js";

export default class extends Component {
  counter = 0;
  render() {
    return (
      <>
        <span id="output">{this.counter}</span>
        <button id="increment" onClick={() => this.counter++}>
          increment
        </button>
        <button id="decrement" onClick={() => this.counter--}>
          decrement
        </button>
      </>
    );
  }
}
