export const isObject = (object) => object != null && typeof object === "object";

export const stringify = (object, formatted = false) =>
  JSON.stringify(
    object,
    (() => {
      const seen = new WeakSet();
      return (key, value) => {
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) return;
          seen.add(value);
        }
        return value;
      };
    })(),
    !formatted ? null : formatted === true ? 4 : formatted
  );

export const parse = (object) => JSON.parse(object);

export const clone = (object, json) => (json ? parse(stringify(object)) : structuredClone(object));
