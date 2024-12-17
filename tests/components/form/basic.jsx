import { Component, Form } from "@vistta/js";

export default class extends Component {
  output;
  render() {
    return (
      <>
        <Form
          onSubmit={({ values: { email } }) => (this.output = email)}
          autocomplete={true}
        >
          <input id="input" name="email" />
          <input id="submit" type="submit" />
        </Form>
        <p id="output">{this.output}</p>
      </>
    );
  }
}
