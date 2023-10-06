//import { useRoute } from "@vistta/vistta.js";
import Template from "../../_template";
// import Context from "./_hooks/useContext";
// import Style from "./_hooks/useStyle";
import Effect from "./_hooks/useEffect";
import Store from "./_hooks/useStore";

export default function Showcase() {
  return (
    <Template>
      <div>Docs</div>
      <Store />
      <Effect />
    </Template>
  );
}

export const config = { title: "Vision JS - Docs" };
