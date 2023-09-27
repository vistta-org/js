import { useStyle, useRoute, fetch } from "@vistta/vistta.js";
import Template from "../_template";
import style from "./style.scss";

export default function Showcase() {
  useStyle(style);
  return (
    <Template>
      <div className="container">
        <Card title={"Benchmark"} description={"Performance measuring example"} path={"./benchmark"} />
        <Card title={"Chat"} description={"Socket Synced chat example"} path={"./chat"} />
      </div>
      <button onClick={() => fetch("/api/dummy").then(({ data }) => alert(data))}>test</button>
    </Template>
  );
}

const Card = ({ title, description, path }) => {
  const { navigate } = useRoute();
  return (
    <div className="card">
      <h2>{title}</h2>
      <p>{description}</p>
      <button onClick={() => navigate(path)}>View</button>
    </div>
  );
};
