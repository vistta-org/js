import { Component } from "@vistta/js";

export default class extends Component {
  list = [1, 2, 3, 4, 5];

  render() {
    return (
      <>
        <button
          id="sort"
          onClick={() => {
            const reverse = this.list[0] == 1;
            this.list = this.list.toSorted((a, b) => (reverse ? b - a : a - b));
          }}
        >
          sort
        </button>
        <div id="containerWithoutKeys">
          {this.list.map((value) => (
            <input value={value} />
          ))}
        </div>
        <div id="containerWithKeys">
          {this.list.map((value) => (
            <input key={"input-" + value} value={value} />
          ))}
        </div>
      </>
    );
  }
}
