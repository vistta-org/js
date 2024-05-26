import { Component } from "@vistta/js";

class Test extends Component {
  static ignore = true;
  run;
  iterations;

  render() {
    let children = [];
    for (let i = 0; i < 10; i++) {
      children.push(
        <Recursive iterations={this.iterations / 2}>
          <div>{this.run}</div>
        </Recursive>,
      );
    }
    return children;
  }
}

export default Test;

class Recursive extends Component {
  static ignore = true;
  run;
  iterations;

  render() {
    if (this.iterations === 0) return this.children;
    return (
      <Recursive iterations={this.iterations - 1}>
        <div>{this.children}</div>
      </Recursive>
    );
  }
}
