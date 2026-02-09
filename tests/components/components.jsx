import { Component, Form, Render, Safe, Suspense } from "@vistta/js";
import { FALLBACK_VALUE, LOADED_VALUE, LOADING_VALUE, TEXT_UPDATE_VALUE, TEXT_VALUE, TIMEOUT } from "../defaults.js";

export class RenderIf extends Component {
  toggle = false;
  render() {
    return (
      <>
        <button id="toggle" onClick={() => (this.toggle = !this.toggle)}>
          toggle
        </button>
        <Render.If condition={this.toggle}>
          <div id="output">{TEXT_UPDATE_VALUE}</div>
        </Render.If>
      </>
    );
  }
}

export class RenderEach extends Component {
  list = [1, 2, 3, 4, 5];
  object = createObject([1, 2, 3, 4, 5]);

  toggle() {
    const reverse = this.list[0] == 1;
    this.list = this.list.toSorted((a, b) => (reverse ? b - a : a - b));
    this.object = createObject(this.list, reverse);
  }

  render() {
    return (
      <>
        <button id="toggle" onClick={() => this.toggle()}>
          toggle
        </button>
        <div id="list">
          <Render.Each of={this.list} as={(value) => <input value={value} />} />
        </div>
        <div id="object">
          <Render.Each of={this.object} as={(value, key) => <input value={`${key}: ${value}`} />} />
        </div>
      </>
    );
  }
}

class SafeChild extends Component {
  input;
  render() {
    if (this.input % 2 == 1) throw new Error("Dummy Error");
    return <span>{TEXT_VALUE}</span>;
  }
}

class SafeFallback extends Component {
  render() {
    return <>{FALLBACK_VALUE}</>;
  }
}

export class SafeExample extends Component {
  visible = true;
  counter = 0;
  render() {
    return (
      <>
        <button id="toggle" onClick={() => (this.visible = !this.visible)}>
          toggle
        </button>
        <button id="increment" onClick={() => this.counter++}>
          increment
        </button>
        <div id="output">
          {this.visible && (
            <Safe fallback={<SafeFallback />}>
              <SafeChild input={this.counter} />
            </Safe>
          )}
        </div>
      </>
    );
  }
}

export class SuspenseBasic extends Component {
  render() {
    return (
      <span id="output">
        <Suspense fallback={LOADING_VALUE}>{LOADED_VALUE}</Suspense>
      </span>
    );
  }
}

export class SuspensePromises extends Component {
  content1 = new Promise((resolve) => setTimeout(() => resolve(LOADED_VALUE), TIMEOUT));
  content2 = new Promise((resolve) => setTimeout(() => resolve(LOADED_VALUE), TIMEOUT * 2));
  render() {
    return (
      <div id="output">
        <Suspense fallback={LOADING_VALUE}>
          {this.content1}/<span>{this.content2}</span>
        </Suspense>
      </div>
    );
  }
}

export class SuspenseToggle extends Component {
  count = 1;
  get content1() {
    const test = Date.now();
    console.log("content1 started");
    return new Promise((resolve) =>
      setTimeout(() => {
        console.log("content1 resolved in " + (Date.now() - test) + "ms");
        resolve(LOADED_VALUE);
      }, TIMEOUT * this.count),
    );
  }

  get content2() {
    const test = Date.now();
    console.log("content2 started");
    return new Promise((resolve) =>
      setTimeout(
        () => {
          console.log("content2 resolved in " + (Date.now() - test) + "ms");
          resolve(LOADED_VALUE);
        },
        TIMEOUT * 2 * this.count,
      ),
    );
  }

  render() {
    return (
      <>
        <button id="increment" onClick={() => this.count++}>
          increment
        </button>
        <div id="output">
          <Suspense fallback={LOADING_VALUE}>
            {this.content1}/<span>{this.content2}</span>
          </Suspense>
        </div>
      </>
    );
  }
}

export class FormBasic extends Component {
  output;
  render() {
    return (
      <>
        <Form onSubmit={({ values: { email } }) => (this.output = email)} autocomplete={true}>
          <input id="input" name="email" />
          <input id="submit" type="submit" />
        </Form>
        <p id="output">{this.output}</p>
      </>
    );
  }
}

export class FormValidation extends Component {
  output;
  render() {
    return (
      <>
        <Form onSubmit={() => (this.output = "valid")} onInvalid={() => (this.output = "invalid")}>
          <input id="name" name="name" required />
          <input id="email" name="email" validator={(value) => /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(value)} />
          <input id="password" name="password" type="password" validator={(value) => value.length > 7} />
          <input id="submit" type="submit" />
        </Form>
        <p id="output">{this.output}</p>
      </>
    );
  }
}

function createObject(list, reverse) {
  return list.reduce((acc, value) => {
    acc[value] = TEXT_UPDATE_VALUE[reverse ? list.length - Number(value) + 1 : Number(value)];
    return acc;
  }, {});
}
