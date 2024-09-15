import { Component, Context } from "@vistta/js";

const context = new Context("context", { counter: 0 }, "storage");

export default class extends Component {
  context = context();
  render() {
    return (
      <>
        <p id="output">{this.context.counter}</p>
        <button id="update" onClick={() => this.context.counter++}>
          update
        </button>
      </>
    );
  }
}
