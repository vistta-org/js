import { Store } from "@vistta/js";

export default new Store([
  Store.createPartition("counter", 1, "storage", {
    "increment": (prev) => prev + 1,
    "decrement": (prev) => prev - 1,
    "alert": (prev, message) => window.alert(message + " " + prev),
    "test": (prev) => new Promise((resolve) => setTimeout(() => resolve(prev + 100), 5000))
  }, console.log),
  Store.createPartition("theme", null, "storage", {
    "set": (_, theme) => theme
  })
]);
