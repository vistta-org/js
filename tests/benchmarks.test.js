/*
const DURATION_SECS = 40;

suite("VisttaJS Benchmarks", async () => {
  test("Benchmark: Attribute Update", async () => {
    const page = await browser.mount("./components/benchmarks/attributeUpdate.jsx");
    const time = await page.get("#time", { wait: true });

    const initial = round((parseFloat(await time.get("innerText"))));
    await page.click("#start");
    await page.wait(DURATION_SECS * 1_000);
    await page.click("#stop");
    const runs = parseInt(await page.get("#runs", "innerText"));
    const average = round((parseFloat(await page.get("#time", "innerText")) / runs));
    console.log(`Attribute Update: Total (runs/sec): ${runs / DURATION_SECS}; Average Time (ms): ${average}; Initial Time (ms): ${initial};`);
    expect(initial < 20).toEqual(true);
    expect(average < 1).toEqual(true);
  });

  test("Benchmark: Content Update", async () => {
    const page = await browser.mount("./components/benchmarks/contentUpdate.jsx");
    const time = await page.get("#time", { wait: true });

    const initial = round((parseFloat(await time.get("innerText"))));
    await page.click("#start");
    await page.wait(DURATION_SECS * 1_000);
    await page.click("#stop");
    const runs = parseInt(await page.get("#runs", "innerText"));
    const average = round((parseFloat(await page.get("#time", "innerText")) / runs));
    console.log(`Content Update: Total (runs/sec): ${runs / DURATION_SECS}; Average Time (ms): ${average}; Initial Time (ms): ${initial};`);
    expect(initial < 50).toEqual(true);
    expect(average < 1).toEqual(true);
  });

  test("Benchmark: Element Update", async () => {
    const page = await browser.mount("./components/benchmarks/elementUpdate.jsx");
    const time = await page.get("#time", { wait: true });

    const initial = round((parseFloat(await time.get("innerText"))));
    await page.click("#start");
    await page.wait(DURATION_SECS * 1_000);
    await page.click("#stop");
    const runs = parseInt(await page.get("#runs", "innerText"));
    const average = round((parseFloat(await page.get("#time", "innerText")) / runs));
    console.log(`Element Update: Total (runs/sec): ${runs / DURATION_SECS}; Average Time (ms): ${average}; Initial Time (ms): ${initial};`);
    expect(initial < 20).toEqual(true);
    expect(average < 3).toEqual(true);
  });

  test("Benchmark: Recursive Update", async () => {
    const page = await browser.mount("./components/benchmarks/recursiveUpdate.jsx");
    const time = await page.get("#time", { wait: true });

    const initial = round((parseFloat(await time.get("innerText"))));
    await page.click("#start");
    await page.wait(DURATION_SECS * 1_000);
    await page.click("#stop");
    const runs = parseInt(await page.get("#runs", "innerText"));
    const average = round((parseFloat(await page.get("#time", "innerText")) / runs));
    console.log(`Recursive Update: Total (runs/sec): ${runs / DURATION_SECS}; Average Time (ms): ${average}; Initial Time (ms): ${initial};`);
    expect(initial < 50).toEqual(true);
    expect(average < 1).toEqual(true);
  });
});

function round(num) {
  if (num === 0) return 0;
  if (Math.abs(num) >= 1) return Math.round(num * 100) / 100;
  const precision = Math.pow(10, Math.abs(Math.floor(Math.log10(Math.abs(num)))));
  return Math.round(num * precision) / precision;
}*/