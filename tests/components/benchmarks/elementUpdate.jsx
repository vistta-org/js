import { Component } from "@vistta/js";
import { ITERATIONS, Runner } from "./default.jsx";

class Test extends Component {
  run;

  render() {
    let children = []; //
    const target = this.run % 2 == 0 ? "even" : "odd";
    for (let i = 0; i < ITERATIONS; i++) children.push(<input key={`test.${target}.${i}`} placeholder={target} />);
    return children;
  }
}

export default class extends Component {
  render() {
    return <Runner Test={Test} />;
  }
}
