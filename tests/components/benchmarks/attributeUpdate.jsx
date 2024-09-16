import { Component } from "@vistta/js";
import { ITERATIONS, Runner } from "./default.jsx";

class Test extends Component {
  run;

  render() {
    let children = [];
    for (let i = 0; i < ITERATIONS; i++)
      children.push(<div data-content={this.run} />);
    return children;
  }
}

export default class extends Component {
  render() {
    return <Runner Test={Test} />;
  }
}
