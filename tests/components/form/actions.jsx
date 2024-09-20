import { Component, Form } from "@vistta/js";

export default class extends Component {
  toggle = false;
  form = new Form.Ref();
  output = 0;
  submitted;
  value;
  validation;

  update({ target }) {
    this.output = target.value;
  }

  render() {
    return (
      <>
        <button id="toggle" onClick={() => (this.toggle = !this.toggle)}>
          toggle
        </button>
        <button
          id="values"
          onClick={() => (this.value = this.form?.values?.()?.number)}
        >
          values
        </button>
        <button
          id="watch"
          onClick={() => this.form?.watch?.("number", this.update)}
        >
          watch
        </button>
        <button
          id="unwatch"
          onClick={() => this.form?.unwatch?.("number", this.update)}
        >
          unwatch
        </button>
        <button id="clear" onClick={() => this.form?.clear?.()}>
          clear
        </button>
        <button id="reset" onClick={() => this.form?.reset?.()}>
          reset
        </button>
        <button
          id="validate"
          onClick={() => (this.validation = this.form?.validate?.())}
        >
          validate
        </button>
        <button id="submit" onClick={() => this.form?.submit?.()}>
          submit
        </button>
        {this.toggle && (
          <Form
            ref={this.form}
            onSubmit={({ values: { number } }) => (this.submitted = number)}
          >
            <input id="input" name="number" type="number" value={this.output} />
          </Form>
        )}
        <p id="output">{this.output}</p>
        <p id="value">{this.value}</p>
        <p id="validation">{this.validation && "valid"}</p>
        <p id="submitted">{this.submitted}</p>
      </>
    );
  }
}
