const Test = ({ run, iterations }) => {
  let children = [];
  for (let i = 0; i < iterations; i++) children.push(<div key={"Test2." + i}>{run((v) => "" + v)}</div>);
  return children;
};

export default Test;
