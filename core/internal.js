const RENDER = {
  UPDATE: 0,
  ACTIVE: false,
  IS_ACTIVE(target) {
    if (!this.ACTIVE && "production" !== process.env.NODE_ENV) console.warn(`Cannot use ${target} outside of the render.`);
    return this.ACTIVE
  }
}

export { RENDER };