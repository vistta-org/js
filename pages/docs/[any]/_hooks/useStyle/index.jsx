import { useStyle, useState } from "@vistta/vistta.js";
import style from "./style.scss";

export default function Context() {
  const toggle = useState(true);
  return (
    <div>
      <div>
        {toggle((v) => v && <WithStyle />)}
        <label>Label without style</label>
      </div>
      <button onclick={() => toggle.set((v) => !v)}>toggle</button>
    </div>
  );
}

function WithStyle() {
  useStyle(style);
  return (
    <>
      <label>Label without style</label>
    </>
  );
}
