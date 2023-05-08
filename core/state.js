import { dom } from "./dom";

class State {
  #value;
  #listeners = new Set();
  get type() {
    return Symbol("State");
  }

  constructor(initialValue) {
    this.#value = initialValue;
  }

  get value() {
    this.#subscribe(dom.context.element, dom.context.attribute, () => this.#value);
    return this.#value;
  }

  set value(x) {
    this.#value = x;
    this.#listeners.forEach((l) => l());
  }

  compute(callback) {
    const value = () => callback(this.#value);
    const subscribe = (element, attribute) => this.#subscribe(element, attribute, value);
    return  {
      get type() {
        return Symbol("State");
      },
      get value() {
        subscribe(dom.context.element, dom.context.attribute);
        return value();
      },
      valueOf() {
        return this.value;
      },
      toString() {
        return `${this.value}`;
      },
    }
  }

  valueOf() {
    return this.value;
  }

  toString() {
    return `${this.value}`;
  }

  #subscribe(element, attribute, value) {
    if(!element) return;
    if(attribute) return this.#listeners.add(() => attribute(value()));
    this.#listeners.add(() => {
      const _value = value();
      console.dir(element.node);
      console.log(typeof _value);
      //(element.node.nodeValue = value())
    });
    
  }
}

export function useState(initialValue) {
  return new State(initialValue);
}

//