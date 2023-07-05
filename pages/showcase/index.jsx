import { useRoute } from "@vistta/vistta.js";
import Template from "../_template";

export default function Showcase() {
  const { navigate } = useRoute();
  return (
    <Template>
      <button onClick={() => navigate("./chat")}>Chat</button>
      <button onClick={() => navigate("./state")}>State</button>
    </Template>
  );
}
