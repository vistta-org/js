import { Component } from "@vistta/js";

class Test extends Component {
  static ignore = true;
  run;
  iterations;

  render() {
    let children = [];
    for (let i = 0; i < this.iterations; i++)
      children.push(<div data-content={this.run} />);
    return children;
  }
}

export default Test;
