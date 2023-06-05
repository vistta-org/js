class Cache {
  #memory = {};

  exists(key) {
    return this.#memory[key];
  }

  set(key, value) {
    this.#memory[key] = value;
  }

  get(key) {
    if (!this.exists(key)) return null;
    return this.#memory[key];
  }

  clear(key) {
    if (!this.#memory[key]) return null;
    delete this.#memory[key];
  }
}

export default new Cache();
