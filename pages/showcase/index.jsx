import { useStyle, useRoute } from "@vistta/vistta.js";
import Template from "../_template";
import style from "./style.scss";

export default function Showcase() {
  const scope = useStyle(style);
  return (
    <Template>
      <div className="container" {...scope}>
        <Card title={"Benchmark"} description={"Performance measuring example"} path={"./benchmark"} />
        <Card title={"Chat"} description={"Socket Synced chat example"} path={"./chat"} />
      </div>
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
