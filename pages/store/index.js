import { Store } from "@vistta/js";

Store.createPartition("counter", 1, "storage", {
  "increment": (prev) => prev + 1,
  "decrement": (prev) => prev - 1,
  "alert": (prev, message) => window.alert(message + " " + prev),
  "test": (prev) => new Promise((resolve) => setTimeout(() => resolve(prev + 100), 5000))
}, console.log);

Store.createPartition("theme", null, "storage", {
  "set": (_, theme) => theme
});

export const useStore = (...arg) => Store.use(arg);
