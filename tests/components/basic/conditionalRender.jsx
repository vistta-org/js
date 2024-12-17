import { Component } from "@vistta/js";

export default class extends Component {
  toggle = false;
  render() {
    return (
      <>
        <button id="toggle" onClick={() => (this.toggle = !this.toggle)}>
          toggle
        </button>
        {this.toggle && <input id="inputWithoutKey" />}
        {this.toggle && <input id="inputWithKey" key="input" />}
      </>
    );
  }
}
