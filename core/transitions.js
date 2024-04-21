const INTERVAL = 10;

export function applyTransition(dom, transition, render) {
  const { name, target, direction = "right", duration = 500 } = typeof transition === "object" ? transition : { name: transition };
  const element = () => typeof target === "string" ? dom.querySelector(target) : dom.node;
  const amount = INTERVAL / duration;
  switch (name) {
    case "fade":
      // eslint-disable-next-line sonarjs/no-use-of-empty-return-value
      return fadeOut(element(), amount, () => (render(), fadeIn(element(), amount)));
    case "slide":
      // eslint-disable-next-line sonarjs/no-use-of-empty-return-value
      return slideOut(element(), direction, amount, () => (render(), slideIn(element(), direction, amount)));
    case "rotate":
      // eslint-disable-next-line sonarjs/no-use-of-empty-return-value
      return rotateOut(element(), direction, amount, () => (render(), rotateIn(element(), direction, amount)));
    default:
      return render();
  }
}

//

function fadeOut(element, amount, callback) {
  let opacity = 1;
  const interval = setInterval(() => {
    opacity -= amount;
    element.style.opacity = opacity;
    if (opacity <= 0) clearInterval(interval), callback();
  }, INTERVAL);
}

function fadeIn(element, amount) {
  let opacity = 0;
  const interval = setInterval(() => {
    opacity += amount;
    element.style.opacity = opacity;
    if (opacity >= 1) clearInterval(interval);
  }, INTERVAL);
}

//

function slideOut(element, direction, amount, callback) {
  const axis = direction === "top" | direction === "bottom" ? "Y" : "X";
  const converter = direction === "right" | direction === "bottom" ? 100 : -100;
  let translate = 0;
  const interval = setInterval(() => {
    translate += amount;
    element.style.transform = `translate${axis}(${translate * converter}%)`;
    if (translate >= 1) clearInterval(interval), callback();
  }, INTERVAL);
}

function slideIn(element, direction, amount) {
  const axis = direction === "top" | direction === "bottom" ? "Y" : "X";
  const converter = direction === "right" | direction === "bottom" ? 100 : -100;
  let translate = -1;
  const interval = setInterval(() => {
    translate += amount;
    element.style.transform = `translate${axis}(${translate * converter}%)`;
    if (translate >= 0) clearInterval(interval), element.style.transform = "";
  }, INTERVAL);
}

//

function rotateOut(element, direction, amount, callback) {
  const axis = direction === "top" | direction === "bottom" ? "X" : "Y";
  const converter = direction === "right" | direction === "bottom" ? -90 : 90;
  let rotate = 0;
  const interval = setInterval(() => {
    rotate += amount;
    element.style.transform = `rotate${axis}(${rotate * converter}deg)`;
    if (rotate >= 1) clearInterval(interval), callback();
  }, INTERVAL);
}

function rotateIn(element, direction, amount) {
  const axis = direction === "top" | direction === "bottom" ? "X" : "Y";
  const converter = direction === "right" | direction === "bottom" ? -90 : 90;
  let rotate = -1;
  const interval = setInterval(() => {
    rotate += amount;
    element.style.transform = `rotate${axis}(${rotate * converter}deg)`;
    if (rotate >= 0) clearInterval(interval), element.style.transform = "";
  }, INTERVAL);
}