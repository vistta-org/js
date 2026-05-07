import { Component, Context, Ref } from "@vistta/js";
import { TEXT_UPDATE_VALUE, TEXT_VALUE, TIMEOUT } from "../defaults.js";

export class ComponentLifecycle extends Component {
  toggle = false;
  output;
  render() {
    const root = this;
    return (
      <>
        <button id="toggle" onClick={() => (this.toggle = !this.toggle)}>
          toggle
        </button>
        <p id="output">{this.output}</p>
        {this.toggle &&
          (() => ({
            onConnect() {
              root.output = "connected";
            },
            onDisconnect() {
              root.output = "disconnected";
            },
            render() {
              return <p></p>;
            },
          }))}
      </>
    );
  }
}

export class ConditionalRender extends Component {
  toggle = false;
  render() {
    return (
      <>
        <button id="toggle" onClick={() => (this.toggle = !this.toggle)}>
          toggle
        </button>
        {this.toggle && <input id="inputWithoutKey" />}
        {this.toggle && <input id="inputWithKey" key="input" />}
      </>
    );
  }
}

export const FunctionalComponent = () => ({
  counter: 0,
  defaultValue: TEXT_VALUE,
  render() {
    return (
      <>
        <input id="input" value={this.defaultValue} />
        <span id="output">{this.counter}</span>
        <button id="increment" onClick={() => this.counter++}>
          increment
        </button>
        <button id="decrement" onClick={() => this.counter--}>
          decrement
        </button>
      </>
    );
  },
});

export class ListRender extends Component {
  list = [1, 2, 3, 4, 5];

  render() {
    return (
      <>
        <button
          id="sort"
          onClick={() => {
            const reverse = this.list[0] == 1;
            this.list = this.list.toSorted((a, b) => (reverse ? b - a : a - b));
          }}
        >
          sort
        </button>
        <div id="containerWithoutKeys">
          {this.list.map((value) => (
            <input value={value} />
          ))}
        </div>
        <div id="containerWithKeys">
          {this.list.map((value) => (
            <input key={"input-" + value} value={value} />
          ))}
        </div>
      </>
    );
  }
}

export class Promises extends Component {
  content1 = new Promise((resolve) => setTimeout(() => resolve(TEXT_UPDATE_VALUE), TIMEOUT));
  content2 = new Promise((resolve) => setTimeout(() => resolve(TEXT_UPDATE_VALUE), TIMEOUT * 2));
  render() {
    return (
      <span id="output">
        {this.content1}/{this.content2}
      </span>
    );
  }
}

export class StateCounter extends Component {
  counter = 0;
  render() {
    return (
      <>
        <span id="output">{this.counter}</span>
        <button id="increment" onClick={() => this.counter++}>
          increment
        </button>
        <button id="decrement" onClick={() => this.counter--}>
          decrement
        </button>
      </>
    );
  }
}

export class StateText extends Component {
  defaultValue = TEXT_VALUE;
  outputValue;
  render() {
    return (
      <>
        <input
          id="input"
          value={this.defaultValue}
          onChange={(event) => (this.outputValue = /** @type {HTMLInputElement} */ (event.target).value)}
        />
        <span id="output">{this.outputValue || this.defaultValue}</span>
      </>
    );
  }
}

export class ComponentChildrenUpdate extends Component {
  count = 1;
  open = false;

  render() {
    return (
      <>
        <button id="toggle" onClick={() => (this.open = !this.open)}>
          toggle
        </button>
        <button id="increment" onClick={() => this.count++}>
          increment
        </button>
        <p id="count">{this.count}</p>
        <ComponentChildrenTest content={this.open && `${this.count}`} />
      </>
    );
  }
}

class ComponentChildrenDisplay extends Component {
  open = false;

  render() {
    return this.open ? <div id="display">{this.children}</div> : null;
  }
}

class ComponentChildrenTest extends Component {
  content;

  render() {
    return (
      <ComponentChildrenDisplay open={!!this.content}>
        <div id="content">{this.content}</div>
      </ComponentChildrenDisplay>
    );
  }
}

export class ComputedGetters extends Component {
  items = [1, 2, 3, 4, 5];
  filter = 3;
  computeCount = 0;

  get filtered() {
    this.computeCount++;
    return this.items.filter((i) => i <= this.filter);
  }

  render() {
    return (
      <>
        <button id="increment" onClick={() => this.filter++}>
          increment
        </button>
        <button id="decrement" onClick={() => this.filter--}>
          decrement
        </button>
        <button id="noop" onClick={() => (this.filter = this.filter)}>
          noop
        </button>
        <div id="filtered">{this.filtered}</div>
        <div id="filtered-length">{this.filtered.length}</div>
        <div id="compute-count">{this.computeCount}</div>
      </>
    );
  }
}

export class ComputedDependencyTracking extends Component {
  items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  filter = 5;
  multiplier = 1;

  get filtered() {
    return this.items.filter((i) => i <= this.filter);
  }

  get total() {
    return this.filtered.reduce((sum, i) => sum + i, 0) * this.multiplier;
  }

  render() {
    return (
      <>
        <button id="increment-filter" onClick={() => this.filter++}>
          increment filter
        </button>
        <button id="increment-multiplier" onClick={() => this.multiplier++}>
          increment multiplier
        </button>
        <div id="filtered">{this.filtered.length}</div>
        <div id="total">{this.total}</div>
      </>
    );
  }
}

export class RefExample extends Component {
  ref = new Ref();
  render() {
    return (
      <>
        <input id="input" ref={(node) => node && (node.value = TEXT_UPDATE_VALUE)} />
        <button
          id="update"
          onClick={() => {
            if (this.ref.node) this.ref.node.value = TEXT_UPDATE_VALUE;
          }}
        >
          update
        </button>
        <input id="output" ref={this.ref} readOnly />
      </>
    );
  }
}
const contextBasic = new Context("context_basic_test", { counter: 0 });
export class ContextBasic extends Component {
  context = contextBasic();
  render() {
    return (
      <>
        <p id="output">{this.context.counter}</p>
        <button id="increment" onClick={() => this.context.counter++}>
          increment
        </button>
        <button id="decrement" onClick={() => this.context.counter--}>
          decrement
        </button>
      </>
    );
  }
}

const contextActions = new Context(
  "context_actions_test",
  { counter: 0 },
  {
    actions: {
      increment: (prev) => ((prev.counter += 1), prev),
      decrement: (prev) => ((prev.counter -= 1), prev),
    },
  },
);
export class ContextActions extends Component {
  context = contextActions();
  render() {
    return (
      <>
        <p id="output">{this.context.counter}</p>
        <button id="increment" onClick={() => /** @type {any} */ (contextActions).increment()}>
          increment
        </button>
        <button id="decrement" onClick={() => /** @type {any} */ (contextActions).decrement()}>
          decrement
        </button>
      </>
    );
  }
}

const contextCached = new Context("context_cached_test", { counter: 0 }, { cache: "session" });
export class ContextCached extends Component {
  context = contextCached();
  render() {
    return (
      <>
        <p id="output">{this.context.counter}</p>
        <button id="increment" onClick={() => this.context.counter++}>
          increment
        </button>
      </>
    );
  }
}
