let id = 0;

export default async function (source, { path, warnings }) {
  try {
    return { code: transform(source), warnings };
  } catch (e) {
    return { errors: [`${path}(0,0): json error: ${e.message}.`] };
  }
}

function transform(code) {
  const start = code.search(/<(>|\w+)/g);
  if (start == -1) return code;
  const [element, end] = transformElement(code.slice(start));
  return code.slice(0, start) + element + transform(code.slice(start + end));
}

function transformElement(code) {
  const len = code.length
  let end = len;
  let tagName = "";
  let props = "";
  let children = "";
  const context = { progress: 0, depth: 0 };
  let i = 1;
  let done = false;
  while (!done && i < len) {
    if (context.progress == 0) {
      if (code[i] === "/" && code[i + 1] === ">") {
        end = i + 2;
        done = true;
      }
      if (code[i] === ">") {
        context.progress = 2;
        context.child = "";
      }
      else if (!isWhitespace(code[i])) tagName += code[i];
      else (context.progress = 1, context.prop = "");
    }
    else if (context.progress == 1) {
      if (code[i] === "/" && code[i + 1] === ">") {
        end = i + 2;
        if (context.prop !== "") props += `"${context.prop}": true, `;
        done = true;
      }
      if (code[i] === ">") {
        context.progress = 2;
        context.child = "";
        if (context.prop !== "") props += `"${context.prop}": true, `;
      }
      else if (code[i] === "=") {
        if (!context.prop || context.prop === "") throw new Error("Error while parsing JSX. [Code: 2]");
        const [value, propsEnd, isQuote] = transformProps(code.slice(i + 1));
        if (isQuote) props += `"${context.prop}": ${value}, `;
        else props += `"${context.prop}": _Prop(() => ${value}), `;
        context.prop = "";
        i += propsEnd;
      }
      else if (code[i] === "{") {
        const [value, expressionEnd] = transformJSExpression(code.slice(i));
        props += `${value}, `;
        i += expressionEnd - 1;
      }
      else if (isWhitespace(code[i])) {
        if (context.prop !== "") {
          props += `"${context.prop}": true, `;
          context.prop = "";
        }
      }
      else context.prop += code[i];
    }
    else if (context.progress == 2) {
      if (code[i] === "<") {
        if (context.child && !isWhitespace(context.child)) {
          children += `"${format(context.child)}", `;
          context.child = "";
        }
        const endTag = `</${tagName}>`;
        if (code.slice(i, i + endTag.length) === endTag) {
          end = i + endTag.length;
          done = true;
        }
        else {
          const [child, childEnd] = transformElement(code.slice(i));
          children += `${child}, `;
          i += childEnd - 1;
        }
      }
      else if (code[i] === "{") {
        if (context.child && !isWhitespace(context.child)) {
          children += `"${format(context.child)}", `;
          context.child = "";
        }
        const [value, expressionEnd] = transformJSExpression(code.slice(i));
        if ((value[0] === "\"" || value[0] === "'" || value[0] === "`") && value[0] === value[value.length - 1]) children += `${value}, `;
        else children += `_Child(() => ${value}), `;
        i += expressionEnd - 1;
      }
      else context.child += code[i];
    }
    else throw new Error("Error while parsing JSX. [Code: 0]");

    i++;
  }
  if (!done) throw new Error("Error while parsing JSX. [Code: 1] " + tagName);
  if (tagName === "") tagName = "_Fragment";
  else if (tagName[0] !== tagName[0].toUpperCase()) tagName = `"${tagName}"`;
  if (props.length == 0) props = "null";
  else props = `{ ${props.slice(0, -2)} }`;
  if (children.length > 0) children = ", " + children;
  return [`_Element("#${id++}", ${tagName}, ${props}${children.slice(0, -2)})`, end];
}

function transformProps(code) {
  if (code[0] === "\"" || code[0] === "'") {
    const quote = code[0];
    const len = code.length;
    let end = len;
    let i = 1;
    let done = false;
    while (!done && i < len) {
      if (code[i] === quote) {
        end = i + 1;
        done = true;
      }
      i++;
    }
    if (!done) throw new Error("Error while parsing JSX. [Code: 3]");
    return [code.slice(0, end), end, true];
  }
  return transformJSExpression(code);
}

function transformJSExpression(code) {
  const len = code.length;
  let end = len;
  let i = 1;
  let done = false;
  const context = { depth: 0 };
  while (!done && i < len) {
    if (context.quote) {
      if (isQuoteEnd(code, context.quote, i)) context.quote = null;
    }
    else if (code[i] === "\"" || code[i] === "'" || code[i] === "`") context.quote = code[i];
    else if (code[i] === "}") {
      if (context.depth == 0) {
        end = i + 1;
        done = true;
      }
      else context.depth--;
    }
    else if (code[i] === "{") context.depth++;
    i++;
  }
  if (!done) throw new Error("Error while parsing JSX. [Code: 4]");
  const value = transform(code.slice(1, end - 1));
  if (value[0] === "{" && value[value.length - 1] === "}") return [`(${value})`, end];
  return [value, end];
}

function format(str) {
  return str.replace(/[\r\n]+/g, '').replace(/\s+/g, ' ').trim();
}

function isWhitespace(char) {
  return char.trim() === '';
}

function isQuoteEnd(str, type, index) {
  if (str[index] === type) {
    let count = 0;
    index--;
    while (str[index] === "\\") {
      count++;
      index--;
    }
    return count % 2 === 0;
  }
  return false;
}