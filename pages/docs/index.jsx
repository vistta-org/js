//import { useRoute } from "@vistta/vistta.js";
import Template from "../_template";
import Context from "./_hooks/useContext";
import Style from "./_hooks/useStyle";

export default function Showcase() {
  return (
    <Template>
      <div>Docs</div>
      <Context />
      <Style />
    </Template>
  );
}
