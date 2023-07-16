import { useRoute } from "@vistta/vistta.js";
import Template from "./_template";
import Style from "./style.scss";

export default function Home() {
  const { navigate } = useRoute();
  return (
    <Template>
      <Style>
        <div className="container">
          <h1>Vistta.JS</h1>
          <h2>Vistta.js Javascript Framework</h2>
          <button onClick={() => navigate("/docs")}>Get Started</button>
        </div>
      </Style>
    </Template>
  );
}

export { config } from "./_template";
