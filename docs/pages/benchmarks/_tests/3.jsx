import { Component } from "@vistta/js";

class Test extends Component {
  static ignore = true;
  run;
  iterations;

  render() {
    let children = []; //
    if (this.run % 2 == 0) {
      for (let i = 0; i < this.iterations; i++)
        children.push(<input key={"test3.even." + i} placeholder="even" />);
    } else {
      for (let i = 0; i < this.iterations; i++)
        children.push(<input key={"test3.odd." + i} placeholder="odd" />);
    }
    return children;
  }
}

export default Test;
