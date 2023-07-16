import { useRoute } from "@vistta/vistta.js";
import Template from "../_template";
import Style from "./style.scss";

export default function Showcase() {
  return (
    <Template>
      <Style>
        <div className="container">
          <Card title={"Benchmark"} description={"Performance measuring example"} path={"./benchmark"} />
          <Card title={"Chat"} description={"Socket Synced chat example"} path={"./chat"} />
        </div>
      </Style>
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
