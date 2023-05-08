import { useState } from "@vistta/visttajs";

const Toggle = () => {
  const toggle = useState(false);
  //
  return (<>
    <button onClick={() => toggle.value = !toggle.value}>
      Toggle: {toggle.compute((x) => x ? "on" : "off")}
    </button>
    {toggle.compute((x) => x ? (<input placeholder="test" />) : null)}
  </>);
};

export default Toggle;