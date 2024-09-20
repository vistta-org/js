import { Component, Profiler } from "@vistta/js";

export const ITERATIONS = 1000;
export class Runner extends Component {
  running;
  run = 0;
  result = 0;
  Test;

  start() {
    this.result = 0;
    this.run = 0;
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
        <button id="start" onClick={() => this.start()}>
          start
        </button>
        <button id="stop" onClick={() => this.stop()}>
          stop
        </button>
        {!this.running && (
          <div>
            <p id="runs">{this.run}</p>
            <p id="time">{this.result}</p>
          </div>
        )}
      </>
    );
  }
}
