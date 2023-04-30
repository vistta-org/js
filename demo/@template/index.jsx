import { useRouter } from "@vision/visionjs";
import Template from "./template.html";
import style from "./style.scss";

const nav = ["home", "about", "contacts"];

const PageTemplate = ({ title, children }) => {
  const { navigate } = useRouter();
  return <Template
    styles={style}
    title={title}
    nav={nav.reduce((res, cur) => {
      if(cur !== title) res.push(<button key={cur} onClick={() => navigate("/" + (cur !== "home" ? cur : ""))} style={{ flex: "none" }}>{cur}</button>);
      return res;
    }, [])}
    footer="Demo"
  >
    {children}
  </Template>;
}

export default PageTemplate;