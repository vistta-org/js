import { equals } from "../../utils/index.js";
import { Component } from "../component.js";
import { Context } from "../context.js";
import { Element } from "../element.js";
import { Mutation } from "../mutation.js";
import { spreadProps } from "../props.js";
import { Ref } from "../ref.js";
import { Fragment } from "../symbols.js";

/**
 * @typedef {{
 *   type: string,
 *   attributes: Record<string, any>,
 *   node: any,
 * }} FormRegisterTarget
 */

/**
 * Form component with validation, watch APIs and optional shared context.
 */
export class Form extends Component {
  /** Reference helper exposed for convenience. */
  static Ref = Ref;

  /**
   * Context specialized for form values where updates are path-based.
   */
  static Context = class extends Context {
    form;
    /**
     * @param {string} key
     * @param {"none"|"session"|"local"|"storage"} [cache]
     */
    constructor(key, cache) {
      super(
        key,
        {},
        {
          cache,
          actions: { update: (prev, path, field) => copyFieldValue(prev, path, field) },
        },
      );
    }

    /**
     * Watches one or all form fields for changes, receiving the field path and new value.
     * @param {string | ((e: Event) => void)} arg1
     * @param {(e: Event) => void} arg2
     * @return {void}
     */
    watch(arg1, arg2) {
      if (!this.form) return;
      this.form.watch(arg1, arg2);
    }

    /**
     * Removes a field watcher previously registered with `watch`.
     * @param {string | ((e: Event) => void)} arg1
     * @param {(e: Event) => void} arg2
     * @return {void}
     */
    unwatch(arg1, arg2) {
      if (!this.form) return;
      this.form.unwatch(arg1, arg2);
    }

    /**
     * Returns an object containing only the fields whose current value differs from their default value.
     * Returns `null` if no fields have changed.
     * @param {string} [path] - Optional dot-separated path pattern (supports `*` wildcard) to filter fields.
     * @returns {Object|null}
     */
    changed(path) {
      if (!this.form) return;
      return this.form.changed(path);
    }

    /**
     * Sets the default value of one or all form fields to their current value.
     * @param {string} [path="*"]
     * @returns {void}
     */
    snapshot(path) {
      if (!this.form) return;
      this.form.snapshot(path);
    }

    /**
     * Resets the value of a form field to its initial state.
     * @param {string} [path="*"]
     * @returns {void}
     */
    reset(path) {
      if (!this.form) return;
      this.form.reset(path);
    }

    /**
     * Clears the value of a form field.
     * @param {string} [path="*"]
     * @returns {void}
     */
    clear(path) {
      if (!this.form) return;
      this.form.clear(path);
    }

    /**
     * Validates one field or the full form.
     * @param {string} [path="*"]
     * @returns {null|Array<{ field: any, error: string }>}
     */
    validate(path) {
      if (!this.form) return;
      return this.form.validate(path);
    }

    /**
     * Submits the form programmatically.
     * @returns {void}
     */
    submit() {
      if (!this.form) return;
      this.form.submit();
    }

    /**
     * Returns an object with the current values of all form fields.
     * @returns {Record<string, any>}
     */
    values() {
      if (!this.form) return {};
      return this.form.values();
    }

    /**
     * Returns a specific form field.
     * @param {string} name
     * @returns {{
     *  value: any,
     *  clear: () => void,
     *  reset: () => void,
     *  validate: () => null|string,
     * } | null}
     */
    field(name) {
      if (!this.form) return;
      return this.form.field(name);
    }
  };

  /**
   * Browser default required-field message. Empty on server.
   * @returns {string}
   */
  static get DEFAULT_ERROR_MESSAGE() {
    if (window.platform === "server") return "";
    if (!this._defaultErrorMessage) {
      const inputElement = document.createElement("input");
      inputElement.type = "text";
      inputElement.required = true;
      this._defaultErrorMessage = inputElement.validationMessage;
    }
    return this._defaultErrorMessage;
  }

  ref;
  name;
  id;
  context;
  class;
  autocomplete;
  onsubmit;
  onSubmit;
  oninvalid;
  onInvalid;
  style;

  #node;
  #path = [];
  #parent;
  #fields = {};
  #listeners = {};
  #invalidEvent;

  /** Path of this form when nested inside another form. */
  get path() {
    return this.#path;
  }

  /** @returns {Element} */
  render() {
    if (this.context && !(this.context instanceof Form.Context)) {
      console.warn("Form 'context' needs to be an instance of Form.Context.");
      this.context = null;
    }
    if (this.#parent) {
      if (!this.name) {
        if ("production" !== process.env.NODE_ENV) console.warn("Nested Forms require a 'name' property to be specified.");
        return null;
      }
      if (this.class || this.style) return new Element("div", { class: this.class, style: this.style }, ...this.children);
      return new Element(Fragment, {}, ...this.children);
    }
    this.#invalidEvent = typeof this.oninvalid === "function" || typeof this.onInvalid === "function";
    return new Element(
      "form",
      {
        ref: Ref.forward(this.ref, (element) => {
          if (this.#parent || !element) return;
          this.#node = element;
          const form = {
            watch: (arg1, arg2) => this.watch(arg1, arg2),
            unwatch: (arg1, arg2) => this.unwatch(arg1, arg2),
            changed: (name) => this.changed(name),
            snapshot: (name) => this.snapshot(name),
            reset: (name) => this.reset(name),
            clear: (name) => this.clear(name),
            submit: () => this.submit(),
            values: () => this.values(),
            field: (name) => this.field(name),
            validate: (name) => this.validate(name),
          };
          if (this.context) this.context.form = form;
          Object.assign(element, form);
        }),
        onreset: () => this.reset(),
        onsubmit: (event) => {
          event.preventDefault();
          if (this.validate()) return;
          event.values = this.values();
          if (typeof this.onsubmit === "function") this.onsubmit?.(event);
          else if (typeof this.onSubmit === "function") this.onSubmit?.(event);
        },
        ...spreadProps(() => this.props("ref", "onsubmit", "onSubmit", "onreset", "onReset", "context")),
      },
      ...this.children,
    );
  }

  /**
   * Registers either a parent form (for nesting) or a field target.
   * @param {Form|FormRegisterTarget} target
   * @returns {void}
   */
  register(target) {
    if (target instanceof Form) {
      this.#parent = target;
      this.#path = [...this.#parent.path, this.name || this.id];
      return;
    }

    const { type, attributes, node } = target || {};

    if (
      !node ||
      attributes.role === "part" ||
      (type !== "input" &&
        type !== "textarea" &&
        type !== "select" &&
        attributes.role !== "input" &&
        attributes.role !== "select") ||
      attributes.type === "submit"
    )
      return;
    const path = attributes.name || attributes.id;
    if (!path) {
      if ("production" !== process.env.NODE_ENV)
        console.warn(`Missing either "id" or "name" attribute on ${type} inside of form.`);
      return;
    }
    const isNew = !this.#fields[path];
    const field = isNew ? {} : this.#fields[path];
    if (isNew) {
      this.#fields[path] = field;
      field.type = node.type || attributes.role;
      field.node = field.type === "radio" ? [node] : node;
      field.value = getFieldValue(field);
      field.defaultValue = field.value;
    } else if (type === "radio") field.node.push(node);
    else field.node = node;
    field.required = attributes.required === true || attributes.required === "true";
    field.validator = attributes.validator instanceof Mutation ? attributes.validator() : attributes.validator;
    if (isNew) this.context?.update?.(path, field);
    else updateFieldNodeValue(field, field.value);
    node.addEventListener(field.type === "select" ? "change" : "input", (e) => {
      if (!this.#invalidEvent) node.setCustomValidity?.("");
      const prevValue = field.value;
      field.value = getFieldValue(field);
      this.context?.update?.(path, field);
      for (let i = 0, len = this.#listeners[path]?.length; i < len; i++) this.#listeners[path][i](e, prevValue, field.value);
      for (let i = 0, len = this.#listeners["*"]?.length; i < len; i++) this.#listeners["*"][i](e, prevValue, field.value);
    });
  }

  /**
   * Watches one or all form fields for changes, receiving the field path and new value.
   * @param {string | ((e: Event) => void)} arg1
   * @param {(e: Event) => void} arg2
   * @return {void}
   */
  watch(arg1, arg2) {
    if (!arg1 || this.#parent) return;
    if (typeof arg1 === "function") {
      arg2 = arg1;
      arg1 = "*";
    } else if (typeof arg2 !== "function") return;
    if (!this.#listeners[arg1]) {
      this.#listeners[arg1] = [arg2];
      return;
    }
    for (let i = 0, len = this.#listeners[arg1]?.length; i < len; i++) {
      if (this.#listeners[arg1][i] === arg2) return;
    }
    this.#listeners[arg1].push(arg2);
  }

  /**
   * Removes a field watcher previously registered with `watch`.
   * @param {string | ((e: Event) => void)} arg1
   * @param {(e: Event) => void} arg2
   * @return {void}
   */
  unwatch(arg1, arg2) {
    if (!arg1 || this.#parent) return;
    if (typeof arg1 === "function") {
      arg2 = arg1;
      arg1 = "*";
    } else if (typeof arg2 !== "function") return;
    for (let i = 0, len = this.#listeners[arg1]?.length; i < len; i++) {
      if (this.#listeners[arg1][i] === arg2) {
        this.#listeners[arg1].splice(i, 1);
        return;
      }
    }
  }

  /**
   * Returns an object containing only the fields whose current value differs from their default value.
   * Returns `null` if no fields have changed.
   * @param {string} [path] - Optional dot-separated path pattern (supports `*` wildcard) to filter fields.
   * @returns {boolean}
   */
  changed(path = "*") {
    if (path === "*" || path.endsWith(".*")) {
      const inputs = Object.keys(this.#fields);
      path = path === "*" ? "" : path.slice(0, -2) + ".";
      for (let i = 0, len = inputs.length; i < len; i++) {
        if (path && !inputs[i].startsWith(path)) continue;
        if (this.field(inputs[i]).changed()) return true;
      }
      return false;
    }
    return this.field(path)?.changed();
  }

  /**
   * Sets the default value of one or all form fields to their current value.
   * @param {string} [path="*"]
   * @returns {void}
   */
  snapshot(path = "*") {
    if (path === "*" || path.endsWith(".*")) {
      const inputs = Object.keys(this.#fields);
      path = path === "*" ? "" : path.slice(0, -2) + ".";
      for (let i = 0, len = inputs.length; i < len; i++) {
        if (path && !inputs[i].startsWith(path)) continue;
        this.field(inputs[i]).snapshot();
      }
    } else this.field(path)?.snapshot();
  }

  /**
   * Resets the value of a form field to its initial state.
   * @param {string} [path="*"]
   * @returns {void}
   */
  reset(path = "*") {
    if (path === "*" || path.endsWith(".*")) {
      const inputs = Object.keys(this.#fields);
      path = path === "*" ? "" : path.slice(0, -2) + ".";
      for (let i = 0, len = inputs.length; i < len; i++) {
        if (path && !inputs[i].startsWith(path)) continue;
        this.field(inputs[i]).reset();
      }
    } else this.field(path)?.reset();
  }

  /**
   * Clears one field or all fields.
   * @param {string} [path="*"]
   */
  clear(path = "*") {
    if (path === "*" || path.endsWith(".*")) {
      const inputs = Object.keys(this.#fields);
      path = path === "*" ? "" : path.slice(0, -2) + ".";
      for (let i = 0, len = inputs.length; i < len; i++) {
        if (path && !inputs[i].startsWith(path)) continue;
        this.field(inputs[i]).clear();
      }
    } else this.field(path)?.clear();
  }

  /**
   * Validates one, all or a set of fields from the form.
   * @param {string} [path = "*"]
   * @returns {null|Array<{ field: any, error: string }>}
   */
  validate(path = "*") {
    let errors = [];
    const inputs = path === "*" || path.endsWith(".*") ? Object.keys(this.#fields) : [path];
    path = !path.endsWith(".*") ? "" : path.slice(0, -2) + ".";
    for (let i = 0, len = inputs.length; i < len; i++) {
      if (path && !inputs[i].startsWith(path)) continue;
      const field = this.field(inputs[i]);
      const error = field.validate();
      if (error) errors.push({ field, error });
    }
    if (!this.#invalidEvent && !this.#node?.reportValidity?.())
      errors.push({ field: null, error: Form.DEFAULT_ERROR_MESSAGE });
    if (errors.length === 0) return null;
    const invalidEvent = new Event("invalid");
    /** @type {any} */ (invalidEvent).errors = errors;
    this.#node.dispatchEvent(invalidEvent);
    return errors;
  }

  /**
   * Submits the form programmatically.
   * @returns {void}
   */
  submit() {
    this.#node.requestSubmit();
  }

  /**
   * Returns an object with the current values of all form fields.
   * @returns {Record<string, any>}
   */
  values() {
    const values = {};
    const inputs = Object.keys(this.#fields);
    for (let i = 0, len = inputs.length; i < len; i++) copyFieldValue(values, inputs[i], this.#fields[inputs[i]]);
    return values;
  }

  /**
   * Returns a specific form field.
   * @param {string} name
   * @returns {{
   *  value: any,
   *  changed: () => boolean,
   *  snapshot: () => void,
   *  reset: () => void,
   *  clear: () => void,
   *  validate: () => null|string,
   * } | null}
   */
  field(name) {
    const field = this.#fields[name];
    if (!field) return undefined;
    const invalid = () => !!this.#invalidEvent;
    return {
      get value() {
        return field.value;
      },
      set value(value) {
        if (field.value === value) return;
        updateFieldNodeValue(field, value, true);
      },
      changed() {
        return !equals(field.value, field.defaultValue);
      },
      snapshot() {
        field.defaultValue = field.value;
      },
      reset() {
        if (field.value === field.defaultValue) return;
        updateFieldNodeValue(field, field.defaultValue, true);
        if (!invalid()) setFieldValidity(field, "");
      },
      clear() {
        if (field.value === undefined) return;
        updateFieldNodeValue(field, undefined, true);
      },
      validate() {
        const value = getFieldValue(field);
        if (field.required === true && !value) {
          if (!invalid()) setFieldValidity(field, Form.DEFAULT_ERROR_MESSAGE);
          return Form.DEFAULT_ERROR_MESSAGE;
        }
        const error = typeof field.validator === "function" ? field.validator(value) : null;
        if (typeof error === "string") {
          if (!invalid()) setFieldValidity(field, error);
          return error;
        } else if (error === false) {
          if (!invalid()) setFieldValidity(field, Form.DEFAULT_ERROR_MESSAGE);
          return Form.DEFAULT_ERROR_MESSAGE;
        } else if (!invalid()) setFieldValidity(field, "");
        return null;
      },
    };
  }
}

function copyFieldValue(obj, path, field) {
  if (path.includes(".")) {
    let cur = obj;
    const paths = path.split(".");
    for (let n = 0, pathsLen = paths.length; n < pathsLen; n++) {
      const key = paths[n];
      if (n === pathsLen - 1) cur[key] = getFieldValue(field);
      else {
        if (!cur[key]) cur[key] = {};
        cur = cur[key];
      }
    }
  } else obj[path] = getFieldValue(field);
  return obj;
}

// @ts-ignore
function getFieldValue({ node } = {}) {
  if (!node) return undefined;
  if (Array.isArray(node)) {
    for (let i = 0, len = node.length; i < len; i++) {
      if (node[i].checked) return node[i].value;
    }
    return null;
  }
  if (node.type === "file") return node.files;
  if (node.type === "checkbox") return node.checked;
  if (node.type === "number" || node.type === "range") return node.value === "" ? null : node.valueAsNumber;
  return node.value;
}

// @ts-ignore
function updateFieldNodeValue({ node, type } = {}, value, dispatch) {
  if (!node) return undefined;
  if (Array.isArray(node)) {
    for (let i = 0, len = node.length; i < len; i++) {
      if (node[i].value == value) node[i].checked = true;
      else node[i].checked = false;
      if (dispatch) node[i].dispatchEvent(new Event(type === "select" ? "change" : "input"));
    }
    return;
  }
  if (node.type === "file") {
    if (value instanceof FileList) node.files = value;
  } else if (node.type === "checkbox") node.checked = !!value;
  else node.value = value;
  if (dispatch) node.dispatchEvent(new Event(type === "select" ? "change" : "input"));
}

// @ts-ignore
function setFieldValidity({ node } = {}, message) {
  if (!node) return;
  if (Array.isArray(node)) {
    for (let i = 0, len = node.length; i < len; i++) node[i].setCustomValidity?.(message);
  } else node.setCustomValidity?.(message);
}
