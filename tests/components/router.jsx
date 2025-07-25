import { Component, route } from "@vistta/js";
import { URL } from "../defaults.js";

export default class extends Component {
  counter = 0;
  onConnect() {
    route.on("increment", () => this.counter++);
  }

  render() {
    return (
      <>
        <button id="update" onClick={() => route.emit("increment")}>
          update
        </button>
        <button id="refresh" onClick={() => route.refresh()}>
          refresh
        </button>
        <button id="navigate" onClick={() => route.navigate(URL)}>
          navigate
        </button>
        <div id="output">{this.counter || route.location.pathname}</div>
      </>
    );
  }
}
