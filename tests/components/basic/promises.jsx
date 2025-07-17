import { Component } from "@vistta/js";
import { TEXT_UPDATE_VALUE, TIMEOUT } from "../../defaults.js";

export default class extends Component {
  content1 = new Promise((resolve) => setTimeout(() => resolve(TEXT_UPDATE_VALUE), TIMEOUT));
  content2 = new Promise((resolve) => setTimeout(() => resolve(TEXT_UPDATE_VALUE), TIMEOUT * 2));
  render() {
    return (
      <span id="output">
        {this.content1}/{this.content2}
      </span>
    );
  }
}
