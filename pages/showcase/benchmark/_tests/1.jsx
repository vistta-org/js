const Test = ({ run, iterations }) => {
  let children = [];
  for (let i = 0; i < iterations; i++) children.push(<div key={"Test1." + i} data-content={run((v) => "" + v)} />);
  return children;
};

export default Test;
