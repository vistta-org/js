import { Component, Context } from "@vistta/js";

const context = new Context("context", { actions: { counter: 0 } }, "none", {
  increment: (prev) => ((prev.actions.counter += 1), prev),
  decrement: (prev) => ((prev.actions.counter -= 1), prev),
});

export default class extends Component {
  context = context();
  render() {
    return (
      <>
        <p id="output">{this.context.actions.counter}</p>
        <button id="increment" onClick={() => context.increment()}>
          increment
        </button>
        <button id="decrement" onClick={() => context.decrement()}>
          decrement
        </button>
      </>
    );
  }
}
