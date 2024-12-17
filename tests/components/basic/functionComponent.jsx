import { TEXT_VALUE } from "../../defaults.js";

export default () => ({
  counter: 0,
  defaultValue: TEXT_VALUE,
  render() {
    return (
      <>
        <input id="input" value={this.defaultValue} />
        <span id="output">{this.counter}</span>
        <button id="increment" onClick={() => this.counter++}>
          increment
        </button>
        <button id="decrement" onClick={() => this.counter--}>
          decrement
        </button>
      </>
    );
  },
});
