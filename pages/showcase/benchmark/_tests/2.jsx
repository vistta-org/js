const Test = ({ run, iterations }) => {
  let children = [];
  for (let i = 0; i < iterations; i++) children.push(<div key={"Test2." + i}>{run}</div>);
  return children;
};

export default Test;
