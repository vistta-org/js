/* eslint-disable react/prop-types */

const Test = ({ run, iterations }) => {
  return run.compute((value) => {
      let children = [];
      if (value % 2 == 0) {
        for (let i = 0; i < iterations; i++)
          children.push(<input placeholder="even" key={"Test3.0." + i} />);
      } else {
        for (let i = 0; i < iterations; i++)
          children.push(<input placeholder="odd" key={"Test3.1." + i} />);
      }
      return children;
    });
};

export default Test;
