import { Component, Ref } from "@vistta/js";
import { TEXT_UPDATE_VALUE } from "../../defaults.js";

export default class extends Component {
  ref = new Ref();
  render() {
    return (
      <>
        <input id="input" ref={(e) => (e.value = TEXT_UPDATE_VALUE)} />
        <button
          id="update"
          onClick={() => {
            if (this.ref.node) this.ref.node.value = TEXT_UPDATE_VALUE;
          }}
        >
          update
        </button>
        <input id="output" ref={this.ref} readOnly />
      </>
    );
  }
}
