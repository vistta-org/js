// import Context from "./_hooks/useContext";
// import Style from "./_hooks/useStyle";
// import Effect from "./_hooks/useEffect";
import { useEffect, useRef } from "@vistta/js";
import Store from "./_hooks/useStore";
import Form from "./_components/form";

export default function Showcase() {
  let ref = useRef();
  useEffect(() => {
    console.log(ref);
  }, []);
  return (
    <>
      <div ref={ref}>Docs</div>
      <Form />
      <Store />
    </>
  );
}

export const config = { title: "Vision JS - Docs" };
