import { Component, Render } from "@vistta/js";
import { TEXT_UPDATE_VALUE } from "../../defaults.js";

export default class extends Component {
  toggle = false;
  render() {
    return (
      <>
        <button id="toggle" onClick={() => (this.toggle = !this.toggle)}>
          toggle
        </button>
        <Render.If condition={this.toggle}>
          <div id="output">{TEXT_UPDATE_VALUE}</div>
        </Render.If>
      </>
    );
  }
}
