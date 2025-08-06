import { Component, Profiler } from "@vistta/js";

const ITERATIONS = 2000;

class Test extends Component {
  run;

  render() {
    let children = []; //
    const target = this.run % 2 == 0 ? "even" : "odd";
    for (let i = 0; i < ITERATIONS; i++)
      children.push(<input key={`test.${target}.${i}`} placeholder={target} style={{ position: "absolute", inset: "5px 50vw auto auto" }} />);
    return children;
  }
}

export default class extends Component {
  counter = 0;
  performance;

  render() {
    return (
      <>
        <button id="update" onClick={() => this.counter++}>
          update
        </button>
        <Profiler callback={(p) => (this.performance = p)}>
          <Test run={this.counter} />
        </Profiler>
        <div id="output">{this.performance}</div>
      </>
    );
  }
}
