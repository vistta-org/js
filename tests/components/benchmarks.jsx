import { Component, Profiler } from "@vistta/js";

const ITERATIONS = 1000;
class Runner extends Component {
  running;
  run = 0;
  result = 0;
  #results = {};

  start() {
    this.#results.start = Date.now();
    this.#results.total = 0;
    this.run++;
    this.running = true;
  }

  stop() {
    this.#results.runs = this.run;
    this.running = false;
  }

  next(time) {
    if (!this.#results.initial) this.#results.initial = time;
    this.#results.total += time;
    if (this.running) setTimeout(() => this.run++, 0);
  }

  render() {
    const Test = this.Test;
    return (
      <>
        <Profiler callback={(time) => this.next(time)}>
          <Test run={this.run} />
        </Profiler>
        <button id="start" onClick={this.start}>
          start
        </button>
        <button id="stop" onClick={this.stop}>
          stop
        </button>
        {this.running === false && (
          <>
            <p>
              Initial Time (ms): <span id="initial">{round(this.#results.initial)}</span>
            </p>
            <p>
              Average Time (ms): <span id="average">{round(this.#results.total / this.#results.runs)}</span>
            </p>
            <p>
              Runs: <span id="runs">{this.#results.runs}</span>
            </p>
          </>
        )}
      </>
    );
  }
}

export class AttributeUpdate extends Component {
  render() {
    return (
      <Runner
        Test={
          class extends Component {
            run;

            render() {
              let children = [];
              for (let i = 0; i < ITERATIONS; i++) children.push(<div data-content={this.run} />);
              return children;
            }
          }
        }
      />
    );
  }
}

export class ContentUpdate extends Component {
  render() {
    return (
      <Runner
        Test={
          class extends Component {
            run;

            render() {
              let children = [];
              for (let i = 0; i < ITERATIONS; i++) children.push(<div>{this.run}</div>);
              return children;
            }
          }
        }
      />
    );
  }
}

export class ElementUpdateWithKeys extends Component {
  render() {
    return (
      <Runner
        Test={
          class extends Component {
            run;

            render() {
              let children = []; //
              const target = this.run % 2 == 0 ? "even" : "odd";
              for (let i = 0; i < ITERATIONS; i++) children.push(<input key={`test.${target}.${i}`} placeholder={target} />);
              return children;
            }
          }
        }
      />
    );
  }
}

export class ElementUpdateWithoutKeys extends Component {
  render() {
    return (
      <Runner
        Test={
          class extends Component {
            run;

            render() {
              let children = []; //
              const target = this.run % 2 == 0 ? "even" : "odd";
              for (let i = 0; i < ITERATIONS; i++) children.push(<input placeholder={target} />);
              return children;
            }
          }
        }
      />
    );
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

export class RecursiveUpdate extends Component {
  render() {
    return (
      <Runner
        Test={
          class extends Component {
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
        }
      />
    );
  }
}

function round(num) {
  if (num === 0) return 0;
  if (Math.abs(num) >= 1) return Math.round(num * 100) / 100;
  const precision = Math.pow(10, Math.abs(Math.floor(Math.log10(Math.abs(num)))));
  return Math.round(num * precision) / precision;
}
