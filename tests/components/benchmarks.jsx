import { Component, Profiler } from "@vistta/js";

const ITERATIONS = 1000;
class Runner extends Component {
  running = false;
  run = 0;
  result = 0;

  start() {
    this.result = 0;
    this.run++;
    this.running = true;
  }

  stop() {
    this.running = false;
  }

  next(time) {
    this.result += time;
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
        {!this.running && (
          <div>
            <p key="runs" id="runs">
              {this.run}
            </p>
            <p key="time" id="time">
              {this.result}
            </p>
          </div>
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
