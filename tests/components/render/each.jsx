import { Component, Render } from "@vistta/js";
import { TEXT_UPDATE_VALUE } from "../../defaults.js";

export default class extends Component {
  list = [1, 2, 3, 4, 5];
  object = createObject([1, 2, 3, 4, 5]);

  toggle() {
    const reverse = this.list[0] == 1;
    this.list = this.list.toSorted((a, b) => (reverse ? b - a : a - b));
    this.object = createObject(this.list, reverse);
  }

  render() {
    return (
      <>
        <button id="toggle" onClick={() => this.toggle()}>
          toggle
        </button>
        <div id="list">
          <Render.Each of={this.list} as={(value) => <input value={value} />} />
        </div>
        <div id="object">
          <Render.Each of={this.object} as={(v, k) => <input value={`${k}: ${v}`} />} />
        </div>
      </>
    );
  }
}

function createObject(list, reverse) {
  return list.reduce((acc, value) => {
    acc[value] = TEXT_UPDATE_VALUE[reverse ? list.length - Number(value) + 1 : Number(value)];
    return acc;
  }, {});
}
