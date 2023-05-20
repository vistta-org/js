/* eslint-disable react/prop-types */

const Test = ({ run, iterations }) => {
  return (<>
    {run.compute((value) => {
      let children = [];
      for (let i = 0; i < iterations; i++) children.push(<div key={"Test2."+i}>{value}</div>);
      return children;
    })}
  </>);
};

export default Test;
