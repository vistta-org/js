import { Component } from "@vistta/js";
import { TEXT_VALUE } from "../../defaults.js";

export default class extends Component {
  defaultValue = TEXT_VALUE;
  outputValue;
  render() {
    return (
      <>
        <input id="input" value={this.defaultValue} onChange={({ target: { value } }) => (this.outputValue = value)} />
        <span id="output">{this.outputValue || this.defaultValue}</span>
      </>
    );
  }
}
