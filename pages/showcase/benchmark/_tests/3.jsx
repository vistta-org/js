const Test = ({ run, iterations }) => {
  return run((n) => {
    let children = [];
    if (n % 2 == 0) {
      for (let i = 0; i < iterations; i++) children.push(<input placeholder="even" key={"Test3.0." + i} />);
    } else {
      for (let i = 0; i < iterations; i++) children.push(<input placeholder="odd" key={"Test3.1." + i} />);
    }
    return children;
  });
};

Test.ignore = true;

export default Test;
