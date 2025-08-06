import { Component, Context } from "@vistta/js";

const context = new Context("context", { basic: { counter: 0 } }, "none");

export default class extends Component {
  context = context();
  render() {
    return (
      <>
        <p id="output">{this.context.basic.counter}</p>
        <button id="increment" onClick={() => this.context.basic.counter++}>
          increment
        </button>
        <button id="decrement" onClick={() => this.context.basic.counter--}>
          decrement
        </button>
      </>
    );
  }
}
