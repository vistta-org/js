import { Component, Form } from "@vistta/js";

const tests = {
  "Component: Form: Basic": {
    Component: class extends Component {
      output;
      render() {
        return (
          <>
            <Form onSubmit={({ values: { email } }) => (this.output = email)} autocomplete={true}>
              <input id="input" name="email" />
              <input id="submit" type="submit" />
            </Form>
            <p id="output">{this.output}</p>
          </>
        );
      }
    },
    test: async (page, { equal }) => {
      const output = await page.querySelector("#output", { wait: true });
      equal(await output.evaluate((el) => el.textContent), "");
      const email = "hello@world.com";
      await page.type("#input", email, { clear: true, submit: false });
      await page.click("#submit");
      equal(await output.evaluate((el) => el.textContent), email);
    },
  },
  "Component: Form: Actions": {
    Component: class extends Component {
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
            <button id="values" onClick={() => (this.value = this.form?.values?.()?.number)}>
              values
            </button>
            <button id="watch" onClick={() => this.form?.watch?.("number", this.update)}>
              watch
            </button>
            <button id="unwatch" onClick={() => this.form?.unwatch?.("number", this.update)}>
              unwatch
            </button>
            <button id="clear" onClick={() => this.form?.clear?.()}>
              clear
            </button>
            <button id="reset" onClick={() => this.form?.reset?.()}>
              reset
            </button>
            <button id="validate" onClick={() => (this.validation = this.form?.validate?.())}>
              validate
            </button>
            <button id="submit" onClick={() => this.form?.submit?.()}>
              submit
            </button>
            {this.toggle && (
              <Form ref={this.form} onSubmit={({ values: { number } }) => (this.submitted = number)}>
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
    },
    test: async (page, { equal }) => {
      const output = await page.querySelector("#output", { wait: true });
      equal(await output.evaluate((el) => el.textContent), "0");

      await page.click("#toggle");
      await page.press("#input", "ArrowUp");
      equal(await output.evaluate((el) => el.textContent), "0");
      await page.click("#values");
      equal(await (await page.querySelector("#value", { wait: true })).evaluate((el) => el.textContent), "1");

      await page.click("#watch");
      await page.press("#input", "ArrowUp");
      equal(await output.evaluate((el) => el.textContent), "2");
      await page.click("#unwatch");
      await page.press("#input", "ArrowUp");
      equal(await output.evaluate((el) => el.textContent), "2");

      await page.click("#clear");
      equal(await output.evaluate((el) => el.textContent), "2");
      await page.click("#reset");
      equal(await output.evaluate((el) => el.textContent), "2");

      await page.click("#watch");
      await page.press("#input", "ArrowUp");
      equal(await output.evaluate((el) => el.textContent), "1");
      await page.click("#clear");
      equal(await output.evaluate((el) => el.textContent), "");
      await page.click("#reset");
      equal(await output.evaluate((el) => el.textContent), "0");

      await page.click("#validate");
      equal(await (await page.querySelector("#validation", { wait: true })).evaluate((el) => el.textContent), "valid");

      await page.press("#input", "ArrowUp");
      const submitted = await page.querySelector("#submitted", { wait: true });
      equal(await submitted.evaluate((el) => el.textContent), "");
      await page.click("#submit");
      equal(await submitted.evaluate((el) => el.textContent), "1");
    },
  },
  "Component: Form: Validation": {
    Component: class extends Component {
      output;
      render() {
        return (
          <>
            <Form onSubmit={() => (this.output = "valid")} onInvalid={() => (this.output = "invalid")}>
              <input id="name" name="name" required />
              <input id="email" name="email" validator={(value) => /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(value)} />
              <input id="password" name="password" type="password" validator={(value) => value.length > 7} />
              <input id="submit" type="submit" />
            </Form>
            <p id="output">{this.output}</p>
          </>
        );
      }
    },
    test: async (page, { equal }) => {
      const output = await page.querySelector("#output", { wait: true });
      equal(await output.evaluate((el) => el.textContent), "");

      await page.click("#submit");
      equal(await output.evaluate((el) => el.textContent), "");

      await page.type("#name", "name");
      await page.click("#submit");
      equal(await output.evaluate((el) => el.textContent), "invalid");

      await page.type("#email", "email@mail.com");
      await page.click("#submit");
      equal(await output.evaluate((el) => el.textContent), "invalid");

      await page.type("#password", "987654321");
      await page.click("#submit");
      equal(await output.evaluate((el) => el.textContent), "valid");
    },
  },
};

/**
 * oninvalid?: (event: any) => any;
 *
 */

export default tests;
