/* eslint-disable react/prop-types */
import { useEffect } from "@vistta/vistta.js";

const Test = ({ run, iterations }) => {
  return useEffect(() => {
      let children = [];
      if (run.value % 2 == 0) {
        for (let i = 0; i < iterations; i++)
          children.push(<input placeholder="even" key={"Test3.0." + i} />);
      } else {
        for (let i = 0; i < iterations; i++)
          children.push(<input placeholder="odd" key={"Test3.1." + i} />);
      }
      return children;
    }, [run]);
};

export default Test;
