import { useRoute } from "@vistta/js";
import style from "./style.scss";
import icon from "../logo.png";

export default function Home() {
  const { navigate } = useRoute();
  return (
    <>
      <h1>Vistta.JS</h1>
      <h2>Vistta.js Javascript Framework</h2>
      <button onClick={() => navigate("/docs")}>Get Started</button>
    </>
  );
}

export const config = {
  icon: icon,
  theme: "#b87333",
  styles: [style],
  transition: { name: "slide", target: "main" }, // "fade", "slide", "rotate"
};
