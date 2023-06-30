import { useRoute, useSocket } from "@vistta/vistta.js";
import Template from "../_template";

export default function Showcase() {
  const { navigate } = useRoute();
  const { on } = useSocket();
  on("message", console.log);
  return (
    <Template>
      <button onClick={() => navigate("./chat")}>Chat</button>
    </Template>
  );
}
