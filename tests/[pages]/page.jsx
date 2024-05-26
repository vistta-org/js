import { Component, route } from "@vistta/js";
import * as specs from "../specs";
const tests = Object.values(specs).reduce(
  (acc, _tests) => ({ ...acc, ..._tests }),
  {},
);

export default class Home extends Component {
  render() {
    const { Component } =
      tests[decodeURIComponent(route.location.pathname.slice(1))] || {};
    if (Component) return <Component />;
    return (
      <>
        {Object.keys(tests).map((test) => (
          <p>
            <a href={"/" + encodeURIComponent(test)}>{test}</a>
          </p>
        ))}
      </>
    );
  }
}
