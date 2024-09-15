import { Component } from "@vistta/js";
import style from "./style.css";
import { SIZE } from "../defaults.js";

export default class extends Component {
  render() {
    return (
      <div
        id="target"
        className="centered"
        {...style}
        style={{ "--size": SIZE + "px" }}
      />
    );
  }
}
