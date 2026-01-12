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
    const time = document.querySelector("#time");
    let runs = document.querySelector("#runs");

    const initial = round(parseFloat(time.innerText));
    await document.wait(100);
    document.querySelector("#start").click();
    await document.wait(DURATION_SECS * 1_000);
    document.querySelector("#stop").click();
    await document.wait(100);
    runs = parseInt(runs.innerText);
    const average = round(parseFloat(time.innerText) / runs);
    console.log(
      `Attribute Update: Total (runs/sec): ${runs / DURATION_SECS}; Average Time (ms): ${average}; Initial Time (ms): ${initial};`,
    );
    expect(initial < 5).toEqual(true);
    expect(average < 1).toEqual(true);
  });

  await test("Benchmark: Content Update", async () => {
    await document.mount(ContentUpdate);
    const time = document.querySelector("#time");
    let runs = document.querySelector("#runs");

    const initial = round(parseFloat(time.innerText));
    await document.wait(100);
    document.querySelector("#start").click();
    await document.wait(DURATION_SECS * 1_000);
    document.querySelector("#stop").click();
    await document.wait(100);
    runs = parseInt(runs.innerText);
    const average = round(parseFloat(time.innerText) / runs);
    console.log(
      `Content Update: Total (runs/sec): ${runs / DURATION_SECS}; Average Time (ms): ${average}; Initial Time (ms): ${initial};`,
    );
    expect(initial < 5).toEqual(true);
    expect(average < 1).toEqual(true);
  });

  await test("Benchmark: Element Update With Keys", async () => {
    await document.mount(ElementUpdateWithKeys);
    const time = document.querySelector("#time");
    let runs = document.querySelector("#runs");

    const initial = round(parseFloat(time.innerText));
    await document.wait(100);
    document.querySelector("#start").click();
    await document.wait(DURATION_SECS * 1_000);
    document.querySelector("#stop").click();
    await document.wait(100);
    runs = parseInt(runs.innerText);
    const average = round(parseFloat(time.innerText) / runs);
    console.log(
      `Element Update With Key: Total (runs/sec): ${runs / DURATION_SECS}; Average Time (ms): ${average}; Initial Time (ms): ${initial};`,
    );
    expect(initial < 5).toEqual(true);
    expect(average < 15).toEqual(true);
  });

  await test("Benchmark: Element Update Without Keys", async () => {
    await document.mount(ElementUpdateWithoutKeys);
    const time = document.querySelector("#time");
    let runs = document.querySelector("#runs");

    const initial = round(parseFloat(time.innerText));
    await document.wait(100);
    document.querySelector("#start").click();
    await document.wait(DURATION_SECS * 1_000);
    document.querySelector("#stop").click();
    await document.wait(100);
    runs = parseInt(runs.innerText);
    const average = round(parseFloat(time.innerText) / runs);
    console.log(
      `Element Update Without Key: Total (runs/sec): ${runs / DURATION_SECS}; Average Time (ms): ${average}; Initial Time (ms): ${initial};`,
    );
    expect(initial < 5).toEqual(true);
    expect(average < 15).toEqual(true);
  });

  await test("Benchmark: Recursive Update", async () => {
    await document.mount(RecursiveUpdate);
    const time = document.querySelector("#time");
    let runs = document.querySelector("#runs");

    const initial = round(parseFloat(time.innerText));
    await document.wait(100);
    document.querySelector("#start").click();
    await document.wait(DURATION_SECS * 1_000);
    document.querySelector("#stop").click();
    await document.wait(100);
    runs = parseInt(runs.innerText);
    const average = round(parseFloat(time.innerText) / runs);
    console.log(
      `Recursive Update: Total (runs/sec): ${runs / DURATION_SECS}; Average Time (ms): ${average}; Initial Time (ms): ${initial};`,
    );
    expect(initial < 10).toEqual(true);
    expect(average < 1).toEqual(true);
  });
});

function round(num) {
  if (num === 0) return 0;
  if (Math.abs(num) >= 1) return Math.round(num * 100) / 100;
  const precision = Math.pow(10, Math.abs(Math.floor(Math.log10(Math.abs(num)))));
  return Math.round(num * precision) / precision;
}
