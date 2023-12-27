const INTERNAL = { COMPONENT: {} };

INTERNAL.RENDER = {
  ACTIVE: false,
  IS_ACTIVE(warning) {
    if (!this.ACTIVE && "production" !== process.env.NODE_ENV) console.warn(warning);
    return this.ACTIVE
  }
}

INTERNAL.COMPONENT = {
  EFFECTS: [],
  CONTEXT: {},
  COPY_CONTEXT(reset) {
    if (reset) this.EFFECTS = [];
    return { ...this.CONTEXT };
  }
}

export { INTERNAL };