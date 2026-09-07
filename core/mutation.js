import { FunctionClass } from "../utils/index.js";

const STATE = new WeakMap();

/**
 * Package-private: the renderer (`dom.js`) accesses VDOM-owned mutation state
 * exclusively through these operations. They are not re-exported from
 * `classes.js`/`index.js`, and deep imports (`@vistta/js/core/mutation.js`)
 * are blocked by the package `exports` map.
 */
export function getMutationCallback(mutation) {
  return STATE.get(mutation)?.callback;
}

export function setMutationCallback(mutation, callback) {
  const state = STATE.get(mutation);
  if (state) state.callback = callback;
}

export function getMutationDomUpdate(mutation) {
  return STATE.get(mutation)?.domUpdate;
}

export function setMutationDomUpdate(mutation, update) {
  const state = STATE.get(mutation);
  if (state) state.domUpdate = update;
}

export function getMutationElementUpdate(mutation) {
  return STATE.get(mutation)?.elementUpdate;
}

export function setMutationElementUpdate(mutation, update) {
  const state = STATE.get(mutation);
  if (state) state.elementUpdate = update;
}

export function isMutationDisabled(mutation) {
  return !!STATE.get(mutation)?.disabled;
}

export function setMutationDisabled(mutation, disabled) {
  const state = STATE.get(mutation);
  if (state) state.disabled = disabled;
}

export function getMutationTracked(mutation) {
  return STATE.get(mutation)?.tracked;
}

export function setMutationTracked(mutation, tracked) {
  const state = STATE.get(mutation);
  if (state) state.tracked = tracked;
}

/**
 * Package-private scheduler, installed by the renderer (`dom.js`) at module
 * load. Not exposed publicly: consumers cannot rewire framework scheduling.
 * @type {((mutations: Iterable<any>) => void) | undefined}
 */
let scheduler;

export function setMutationScheduler(schedule) {
  scheduler = schedule;
}

/**
 * Package-private: creates a DOM mutation — the renderer-internal kind that
 * re-evaluates its callback on every call (`prop()`/`child()` expressions,
 * render mutations, getter trackers). The public `new Mutation(...)`
 * constructor always creates a reactive value instead.
 */
const DOM = Symbol("vistta.mutation.dom");

export function createDomMutation(callback) {
  return new Mutation(callback, DOM);
}

/**
 * The mutation currently capturing reactive reads. Set by the renderer while
 * evaluating a mutation's callback so that property getters can link the
 * mutation to the sets they read from.
 * @type {Mutation|null}
 */
export class Mutation extends FunctionClass {
  static current = null;

  /**
   * Creates a standalone reactive value derived from explicit inputs.
   *
   * The factory runs lazily on first read and is re-derived whenever a
   * reactive input read during evaluation changes or `.update(...)` is
   * called. Mutations that read the value (DOM expressions, other Mutation
   * values) are re-run by the renderer when it changes. Calling the mutation
   * with arguments applies them to the value when it is a function. With no
   * inputs, the factory is re-derived only via `.update()` or reactive reads
   * inside it.
   *
   * DOM mutations (`prop()`/`child()` and renderer internals) are created
   * through the package-private `createDomMutation` and keep re-evaluating
   * their callback on every call.
   *
   * @param {Function} factory - Derives the value from the given inputs.
   * @param {any[]} [args] - Initial inputs, replaceable via `.update(...)`.
   */
  constructor(factory, ...args) {
    if (args[0] === DOM) {
      super(factory);
      STATE.set(this, {
        callback: factory,
        tracked: undefined,
        disabled: undefined,
        domUpdate: undefined,
        elementUpdate: undefined,
        computed: false,
      });
      return;
    }
    /** @type {Record<string, any>} */
    const state = {
      callback: undefined,
      tracked: undefined,
      disabled: undefined,
      domUpdate: undefined,
      elementUpdate: undefined,
      computed: true,
      args,
      value: undefined,
      dirty: true,
      dependents: new Set(),
    };
    const read = function (/** @type {any[]} */ ...callArgs) {
      const reader = Mutation.current;
      if (reader && reader !== mutation) {
        // Link the reading mutation as a dependent. The reverse index
        // (`reader.tracked`) lets the renderer unsubscribe it on unmount.
        const readerState = STATE.get(reader);
        if (readerState) {
          if (!readerState.tracked) readerState.tracked = new Set();
          readerState.tracked.add(state.dependents);
        }
        state.dependents.add(reader);
      }
      if (state.dirty) {
        const previous = Mutation.current;
        Mutation.current = mutation;
        // Reconcile inputs: drop registrations the previous evaluation made
        // for inputs the factory no longer reads.
        const tracked = state.tracked;
        if (tracked) {
          for (const set of tracked) set.delete(mutation);
          state.tracked = undefined;
        }
        state.dirty = false;
        try {
          state.value = factory(...state.args);
        } catch (error) {
          state.dirty = true;
          throw error;
        } finally {
          Mutation.current = previous;
        }
      }
      const value = state.value;
      return callArgs.length > 0 && typeof value === "function" ? value(...callArgs) : value;
    };
    super(read);
    const mutation = this;
    STATE.set(mutation, state);
    state.callback = read;
    state.domUpdate = () => {
      state.dirty = true;
      if (state.dependents.size > 0) scheduler?.(state.dependents);
    };
  }

  /**
   * Re-derives a computed mutation's value. With arguments, the inputs are
   * replaced first; a bare call re-derives with the current inputs. Mutations
   * reading the value re-evaluate on the next frame. Has no effect on DOM
   * mutations.
   * @param {any[]} args
   */
  update(...args) {
    const state = STATE.get(this);
    if (!state?.computed) return;
    if (args.length > 0) state.args = args;
    state.dirty = true;
    // Mark value dependents dirty so plain (non-renderer) reads are always
    // fresh; the scheduler re-runs the DOM expressions on the next frame.
    for (const dependent of state.dependents) {
      const dependentState = STATE.get(dependent);
      if (dependentState?.computed) dependentState.dirty = true;
    }
    // Raw-rendered computed mutations refresh their own element first, so
    // dependents re-read an already-fresh value.
    if (state.elementUpdate) scheduler?.([this]);
    if (state.dependents.size > 0) scheduler?.(state.dependents);
  }
}
