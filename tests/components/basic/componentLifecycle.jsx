import { Component } from "@vistta/js";

export default class extends Component {
  toggle = false;
  output;
  render() {
    const root = this;
    return (
      <>
        <button id="toggle" onClick={() => (this.toggle = !this.toggle)}>
          toggle
        </button>
        <p id="output">{this.output}</p>
        {this.toggle &&
          (() => ({
            onConnect() {
              root.output = "connected";
            },
            onDisconnect() {
              root.output = "disconnected";
            },
            render() {
              return <p></p>;
            },
          }))}
      </>
    );
  }
}
