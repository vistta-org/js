import { Component, Form } from "@vistta/js";

export default class extends Component {
  output;
  render() {
    return (
      <>
        <Form
          onSubmit={() => (this.output = "valid")}
          onInvalid={() => (this.output = "invalid")}
        >
          <input id="name" name="name" required />
          <input
            id="email"
            name="email"
            validator={(value) =>
              /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(value)
            }
          />
          <input
            id="password"
            name="password"
            type="password"
            validator={(value) => value.length > 7}
          />
          <input id="submit" type="submit" />
        </Form>
        <p id="output">{this.output}</p>
      </>
    );
  }
}
