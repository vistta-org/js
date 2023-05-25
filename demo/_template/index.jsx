import { useRoute } from "@vistta/visttajs";
import Template from "./template.html";
import Style from "./style.scss";

const nav = ["home", "about", "benchmark"];

const PageTemplate = ({ title, children }) => {
  const { navigate } = useRoute();
  return <Style>
    <Template
      title={title}
      nav={nav.reduce((res, cur) => {
        if(cur !== title) res.push(<button key={cur} onClick={() => navigate("/" + (cur !== "home" ? cur : ""))} style={{ flex: "none" }}>{cur}</button>);
        return res;
      }, [])}
      footer="Demo"
    >
      {children}
    </Template>
  </Style>;
}

export default PageTemplate;