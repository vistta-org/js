import Template from "../_template";

export default function Showcase() {
  return <Template>
    <div>useState</div>
  </Template>;
}

`useState
The useState hook is a function provided by the @vistta/vistta.js library that allows you to manage state in your components. It returns a stateful value and provides a way to update that value.

Syntax
javascript
Copy code
const state = useState(initialValue);
state: An object containing the current state value and a prop to update the state.
Properties
The state object returned by useState has the following properties:

value: The current value of the state.
value: A prop that can be used to update the state value.
Usage
Import the useState function from @vistta/vistta.js:

javascript
Copy code
import { useState } from "@vistta/vistta.js";
Define a component and use the useState function to initialize the state:

javascript
Copy code
export default function Counter() {
  const age = useState(42);
  // ...
}
Access the state value (age.value) and update the state value directly using the value prop:

javascript
Copy code
age.value = 43;
Note: In your example code, the state value is accessed directly as age without .value appended, so it can be updated by assigning a new value to age.

Render the state value within your component:

javascript
Copy code
return (
  <>
    <h1>Your age: {age}</h1>
    {/* ... */}
  </>
);
Note: In your example code, the state value is accessed directly as age without .value appended.

Example
Here's an updated version of your code with the corrections applied:

javascript
Copy code
import { useState } from "@vistta/vistta.js";

export default function Counter() {
  const age = useState(42);
  
  const increment = () => {
    age.value += 1;
  };

  return (
    <>
      <h1>Your age: {age}</h1>
      <button onClick={() => {
        increment();
        increment();
        increment();
      }}>+3</button>
      <button onClick={increment}>+1</button>
    </>
  );
}
In this example, the useState function is used to create a state variable age initialized with a value of 42. The age.value property is used to update the age state by assigning a new value. The increment function is defined to increase the age value by 1 when called. The state value is rendered within an <h1> element, and the increment function is called when the buttons are clicked.

Please note that this documentation assumes the functionality and usage of the useState function in your custom tool based on the given example. If your tool has additional features or variations, you may need to provide more specific details or update the documentation accordingly.`