import { Component } from "@vistta/js";

/**
 * watch/unwatch
 * reset: (name?: string) => void;
 * clear: (name?: string) => void;
 * submit: () => void;
 * values: () => { [name: string]: any };
 * validate: (name?: string) => boolean;
 * ref?: FormRef;
 * autocomplete?: boolean;
 * onsubmit: (event: any) => any;
 * oninvalid?: (event: any) => any;
 */

const tests = {
  "Component Form:": {
    Component: class extends Component {},
    test: async (page, { equal }) => {},
  },
};

export default tests;
