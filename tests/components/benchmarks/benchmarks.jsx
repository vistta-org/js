import { Component, Profiler } from "@vistta/js";

const ITERATIONS = 1000;
const BENCHMARK_MAX = { render: 10, update: 1 };

const tests = {
  Benchmarks: {
    Component: class extends Component {
      counter = 0;

      render() {
        return (
          <>
            <Benchmark id="1" run={this.counter} test={Test1} />
            <Benchmark id="2" run={this.counter} test={Test2} />
            <Benchmark id="3" run={this.counter} test={Test3} />
            <Benchmark id="4" run={this.counter} test={Test4} />
            <button id="increment" onClick={() => this.counter++}>
              increment
            </button>
          </>
        );
      }
    },
    test: async (page, { equal }) => {},
  },
};

class Benchmark extends Component {
  id;
  run;
  test;
  result;

  render() {
    const Test = this.test;
    return (
      <>
        <Profiler callback={(time) => (this.result = time)}>
          <Test run={this.run} />
        </Profiler>
        <div id={"result-" + this.id}>{this.result}</div>
      </>
    );
  }
}

class Test1 extends Component {
  run = 0;

  render() {
    let children = [];
    for (let i = 0; i < ITERATIONS; i++) children.push(<div data-content={this.run} />);
    return children;
  }
}

class Test2 extends Component {
  run;

  render() {
    let children = [];
    for (let i = 0; i < ITERATIONS; i++) children.push(<div>{this.run}</div>);
    return children;
  }
}

class Test3 extends Component {
  run;

  render() {
    let children = []; //
    if (this.run % 2 == 0) {
      for (let i = 0; i < ITERATIONS; i++) children.push(<input key={"test3.even." + i} placeholder="even" />);
    } else {
      for (let i = 0; i < this.iterations; i++) children.push(<input key={"test3.odd." + i} placeholder="odd" />);
    }
    return children;
  }
}

class Test4 extends Component {
  static ignore = true;
  run;
  iterations;

  render() {
    let children = [];
    for (let i = 0; i < 10; i++) {
      children.push(
        <Recursive iterations={ITERATIONS / 10}>
          <div>{this.run}</div>
        </Recursive>,
      );
    }
    return children;
  }
}

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

export default tests;
