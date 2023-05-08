import { useState } from "@vistta/visttajs";

const Check = () => {
  const toggle = useState(false);
  return (
    <button onClick={() => toggle.value = !toggle.value}>
      <input type="checkbox" disabled checked={toggle}/>
    </button>
  );
};

export default Check;