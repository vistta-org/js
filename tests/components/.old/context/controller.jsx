import { Component, Context } from "@vistta/js";
import { TIMEOUT } from "../../../defaults.js";

const context = new Context(
  "context",
  { counter: 0 },
  "none",
  {
    update: (prev) =>
      new Promise((resolve) =>
        setTimeout(() => {
          resolve(((prev.counter += 1), prev));
        }, TIMEOUT),
      ),
  },
  {
    update: (status, value) => ((value.status = status), console.log(status)),
  },
);

export default class extends Component {
  context = context();
  render() {
    return (
      <>
        <p id="output">{this.context.counter}</p>
        <button id="update" onClick={() => context.update()}>
          update
        </button>
        <p id="status">{this.context.status}</p>
      </>
    );
  }
}
