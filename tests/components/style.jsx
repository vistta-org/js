import { Component } from "@vistta/js";
import { SIZE } from "../defaults.js";
import style from "./style.css";

export default class extends Component {
  render() {
    return <div id="target" className="centered" {...style} style={{ "--size": SIZE + "px" }} />;
  }
}
