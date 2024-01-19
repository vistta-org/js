/* eslint-disable sonarjs/no-duplicate-string */
import { useState, useEffect } from "@vistta/js";
import { useStore } from "./store";
import icon from "../logo.png";
// import template from "./_template/template.html" assert { type: "template" };

export default function Template({ children }) {
  const theme = useStore("theme");
  const menu = useState(false);
  if (!theme.valueOf()) {
    if (document?.documentElement?.getAttribute("data-theme"))
      theme.set(document.documentElement.getAttribute("data-theme"));
    else if (typeof window !== "undefined" && window?.matchMedia("(prefers-color-scheme: dark)")?.matches) theme.set("dark");
    else theme.set("light");
  }
  useEffect(() => {
    document?.documentElement?.setAttribute("data-theme", theme);
  }, [theme]);
  //
  return (
    <>
      <header>
        <button className={menu((value) => "mobile-toggle" + (value ? " active" : ""))} onClick={() => menu.set((v) => !v)}>
          <div></div>
        </button>
        <h1>
          Vistta<span>.</span>JS
        </h1>
        <img src={icon} />
        <button className="theme" onClick={() => theme.set((v) => (v === "light" ? "dark" : "light"))}>
          {theme((v) => (v === "light" ? "dark" : "light"))}
        </button>
      </header>
      <menu className={menu((value) => (value ? "active" : ""))}>
        <li>
          <a href="/">home</a>
        </li>
        <li>
          <a href="/docs">docs</a>
        </li>
        <li>
          <a href="/showcase">showcase</a>
        </li>
      </menu>
      <main>{children}</main>
    </>
  );
}
