import {
  AttributeUpdate,
  ContentUpdate,
  ElementUpdateWithKeys,
  ElementUpdateWithoutKeys,
  RecursiveUpdate,
} from "./components/benchmarks.jsx";

const DURATION_SECS = 20;

suite("VisttaJS Benchmarks", async () => {
  await test("Benchmark: Attribute Update", async () => {
    await document.mount(AttributeUpdate);

    document.querySelector("#start").click();
    await document.wait(DURATION_SECS * 1_000);
    document.querySelector("#stop").click();
    await document.wait(1000);

    const initial = parseFloat(document.querySelector("#initial").innerText);
    const average = parseFloat(document.querySelector("#average").innerText);
    const runs = parseInt(document.querySelector("#runs").innerText);

    console.log("Attribute Update");
    console.log(`Initial Time (ms): ${initial}; Average Time (ms): ${average}; Total (runs/sec): ${runs / DURATION_SECS}`);

    expect(parseFloat(initial) < 7.5).toEqual(true);
    expect(parseFloat(average) < 1).toEqual(true);
  });

  await test("Benchmark: Content Update", async () => {
    await document.mount(ContentUpdate);

    document.querySelector("#start").click();
    await document.wait(DURATION_SECS * 1_000);
    document.querySelector("#stop").click();
    await document.wait(1000);

    const initial = parseFloat(document.querySelector("#initial").innerText);
    const average = parseFloat(document.querySelector("#average").innerText);
    const runs = parseInt(document.querySelector("#runs").innerText);

    console.log("Content Update");
    console.log(`Initial Time (ms): ${initial}; Average Time (ms): ${average}; Total (runs/sec): ${runs / DURATION_SECS}`);

    expect(initial < 7.5).toEqual(true);
    expect(average < 5).toEqual(true);
  });

  await test("Benchmark: Element Update With Keys", async () => {
    await document.mount(ElementUpdateWithKeys);

    document.querySelector("#start").click();
    await document.wait(DURATION_SECS * 1_000);
    document.querySelector("#stop").click();
    await document.wait(1000);

    const initial = parseFloat(document.querySelector("#initial").innerText);
    const average = parseFloat(document.querySelector("#average").innerText);
    const runs = parseInt(document.querySelector("#runs").innerText);

    console.log("Element Update With Keys");
    console.log(`Initial Time (ms): ${initial}; Average Time (ms): ${average}; Total (runs/sec): ${runs / DURATION_SECS}`);

    expect(initial < 7.5).toEqual(true);
    expect(average < 5).toEqual(true);
  });

  await test("Benchmark: Element Update Without Keys", async () => {
    await document.mount(ElementUpdateWithoutKeys);

    document.querySelector("#start").click();
    await document.wait(DURATION_SECS * 1_000);
    document.querySelector("#stop").click();
    await document.wait(1000);

    const initial = parseFloat(document.querySelector("#initial").innerText);
    const average = parseFloat(document.querySelector("#average").innerText);
    const runs = parseInt(document.querySelector("#runs").innerText);

    console.log("Element Update Without Keys");
    console.log(`Initial Time (ms): ${initial}; Average Time (ms): ${average}; Total (runs/sec): ${runs / DURATION_SECS}`);

    expect(initial < 7.5).toEqual(true);
    expect(average < 5).toEqual(true);
  });

  await test("Benchmark: Recursive Update", async () => {
    await document.mount(RecursiveUpdate);

    document.querySelector("#start").click();
    await document.wait(DURATION_SECS * 1_000);
    document.querySelector("#stop").click();
    await document.wait(1000);

    const initial = parseFloat(document.querySelector("#initial").innerText);
    const average = parseFloat(document.querySelector("#average").innerText);
    const runs = parseInt(document.querySelector("#runs").innerText);

    console.log("Recursive Update");
    console.log(`Initial Time (ms): ${initial}; Average Time (ms): ${average}; Total (runs/sec): ${runs / DURATION_SECS}`);

    expect(initial < 20).toEqual(true);
    expect(average < 1).toEqual(true);
  });

  console.table(results);
});
