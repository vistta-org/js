export default async function (source, { path }) {
  try {
    return { code: `export default (${JSON.stringify(JSON.parse(source))});` };
  } catch (e) {
    return { errors: [`${path}(0,0): json error: ${e.message}.`] };
  }
}
