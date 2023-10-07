import { useStyle, useRoute } from "@vistta/vistta.js";
import Template from "./_template";
import style from "./style.scss";

export default function Home() {
  const scope = useStyle(style);
  const { navigate } = useRoute();
  return (
    <Template>
      <div className="container" {...scope}>
        <h1>Vistta.JS</h1>
        <h1>Vistta.JS</h1>
        <h2>Vistta.js Javascript Framework</h2>
        <button onClick={() => navigate("/docs")}>Get Started</button>
      </div>
    </Template>
  );
}

export { config } from "./_template";
