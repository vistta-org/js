import { assign } from "../utils/index.js";
import { Component } from "./component.js";
import { Mutation, createDomMutation } from "./mutation.js";

/**
 * @template Props
 * @extends {JSX.Element}
 */
export class Element {
  /**
   * Represents a virtual DOM element.
   * @param {string|Symbol|Function} type - The type of the element, can be a string (HTML tag), a Symbol (custom element), or a Function (Component).
   * @param {Props} [props] - The properties of the element.
   * @param {JSX.Node[]} [children] - The children of the element, can be other Elements, strings, numbers, or any other type.
   */
  constructor(type, props, ...children) {
    this.props = /** @type {any} */ (groupProps(props || {}));
    this.children = children;
    const typeOf = typeof type;
    if (typeOf === "function") {
      this.type = Component.Node;
      this.props.children = children;
      this.Component = type;
      if (props?.["instance"] != null) {
        if (props["instance"] instanceof Mutation) {
          const prev = Mutation.current;
          Mutation.current = null;
          this.instance = props["instance"]();
          Mutation.current = prev;
        } else this.instance = props["instance"];
        delete this.props.instance;
      }
    } else if (typeOf !== "string" && typeOf !== "symbol") this.type = null;
    else {
      if (props?.["ref"] != null) {
        if (props["ref"] instanceof Mutation) {
          const prev = Mutation.current;
          Mutation.current = null;
          this.ref = props["ref"]();
          Mutation.current = prev;
        } else this.ref = props["ref"];
        delete this.props.ref;
      }
      this.type = type;
    }
    if (props?.["key"] != null) {
      if (props["key"] instanceof Mutation) {
        const prev = Mutation.current;
        Mutation.current = null;
        props["key"] = props["key"]();
        Mutation.current = prev;
      }
      if (typeof props["key"] === "number") this.key = "" + props["key"];
      else this.key = props["key"];
      delete this.props.key;
    }
  }

  /**
   * Creates a deep-cloned element with optional prop and children overrides.
   * @param {any} [props] - `false` keeps current props reference.
   * @param {any} [children] - `false` keeps current children reference.
   * @returns {Element}
   */
  clone(props, children) {
    if (props !== false) {
      if (props) {
        const { style, ...rest } = props || {};
        props = assign(cloneProps(this.props), rest);
        props.style = assign(props.style || {}, style || {});
      } else props = cloneProps(this.props);
    }
    if (this.Component) {
      if (children !== false) {
        const source = this.props.children || [];
        children = source.map((child) => (child instanceof Element ? child.clone(undefined, true) : child));
      }
      return new Element(this.Component, props, ...children);
    }
    if (children !== false)
      children = this?.children?.map((child) => (child instanceof Element ? child.clone(undefined, true) : child));
    const cloned = new Element(this.type, props, ...children);
    // @ts-ignore
    if (this.mutation) cloned.mutation = this.mutation;
    return cloned;
  }
}

function groupProps(props) {
  let groups;
  for (const key in props) {
    const split = key.indexOf(":");
    if (split < 1) continue;
    const name = key.slice(0, split);
    const value = props[key];
    delete props[key];
    if (name === "on") {
      const event = key.slice(split + 1);
      const handler = "on" + event.charAt(0).toUpperCase() + event.slice(1);
      if (handler in props) throw new Error(`Cannot combine "${handler}" with "${key}" props`);
      props[handler] = value;
      continue;
    }
    let group = groups?.get(name);
    if (!group) {
      if (name in props) throw new Error(`Cannot combine "${name}" with "${key}" props`);
      group = {};
      (groups ??= new Map()).set(name, group);
      props[name] = group;
    }
    group[key.slice(split + 1)] = value;
    // The mutation reads the group lazily, so keys added after the switch are still included.
    if (value instanceof Mutation && props[name] === group) props[name] = createDomMutation(() => resolveGroup(group));
  }
  return props;
}

function resolveGroup(group) {
  const result = {};
  for (const key in group) {
    const value = group[key];
    result[key] = value instanceof Mutation ? value() : value;
  }
  return result;
}

function cloneProps(props) {
  const clone = (value) => {
    if (typeof value === "object") {
      if (value === null || value instanceof Element) return value;
      if (Array.isArray(value)) {
        const cloned = [];
        for (let i = 0, len = value.length; i < len; i++) cloned[i] = clone(value[i]);
        return cloned;
      } else {
        const cloned = {};
        const keys = Object.keys(value);
        for (let i = 0, len = keys.length; i < len; i++) cloned[keys[i]] = clone(value[keys[i]]);
        return cloned;
      }
    } else return value;
  };
  return clone(props);
}
