import { Store } from "@vistta/vistta.js";

export default new Store([
  Store.createPartition({
    key: "counter",
    initialState: 1,
    cache: "storage",
    actions: [
      Store.createAction("increment", (prev) => prev + 1, console.log),
      Store.createAction("decrement", (prev) => prev - 1, console.log),
      Store.createAction("alert", (prev, message) => window.alert(message + " " + prev), console.log),
      Store.createAction(
        "test",
        (prev) => new Promise((resolve) => setTimeout(() => resolve(prev + 100), 5000)),
        console.log,
      ),
    ],
  }),
  Store.createPartition({
    key: "theme",
    initialState: null,
    cache: "storage",
    actions: [Store.createAction("set", (_, theme) => theme)],
  }),
]);
