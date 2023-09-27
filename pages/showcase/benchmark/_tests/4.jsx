const Test = ({ run, iterations }) => {
  iterations = iterations / 2;
  let children = [];
  for (let i = 0; i < 10; i++) {
    children.push(
      <RecursiveChild key={"Test4." + i} index={0} iterations={iterations}>
        <div>{run}</div>
      </RecursiveChild>,
    );
  }
  return children;
};

Test.ignore = true;

function RecursiveChild({ index, iterations, children }) {
  if (index === iterations) return children;
  return (
    <RecursiveChild index={index + 1} iterations={iterations}>
      <div>{children}</div>
    </RecursiveChild>
  );
}

RecursiveChild.ignore = true;

export default Test;
