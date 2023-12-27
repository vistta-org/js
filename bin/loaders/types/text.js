export default async function (source, { path }) {
  try {
    return { code: `export default ${JSON.stringify(source)}` };
  } catch (e) {
    return { errors: [`${path}(0,0): json error: ${e.message}.`] };
  }
}
