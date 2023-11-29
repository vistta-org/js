import { useRoute } from "@vistta/js";
import Template from "./template.html";
import global from "./global.scss";
import icon from "../../logo.png";

const nav = ["docs", "showcase"];

const PageTemplate = ({ children }) => {
  const { navigate } = useRoute();
  return (
    <Template
      logo={icon}
      home={() => navigate("/")}
      nav={nav.map((cur) => (
        <button key={cur} onClick={() => navigate("/" + cur)}>
          {cur}
        </button>
      ))}
    >
      {children}
    </Template>
  );
};

PageTemplate.ignore = true;

export default PageTemplate;

export const config = {
  icon: icon,
  theme: "#b87333",
  styles: [global],
  animation: "custom", // "fade", "slide", "custom"
  /*store: new Store([
    Store.createPartition("counter", {
      initialState: 0,
      cache: "storage",
      actions: [
        Store.createAction("increment", (prev) => prev + 1, console.log),
        Store.createAction("decrement", (prev) => prev - 1, console.log),
        Store.createAction("alert", (prev, message) => window.alert(message + " " + prev), console.log),
        Store.createAction("test", (prev) => new Promise((resolve) => setTimeout(() => resolve(prev + 100), 5000)), console.log),
      ]
    })
  ])*/
};
