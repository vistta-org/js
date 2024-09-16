
const DURATION_SECS = 40;

suite("VisttaJS Benchmarks", async () => {
  test("Benchmark: Attribute Update", async () => {
    const page = await browser.mount("./components/benchmarks/attributeUpdate.jsx");

    await page.click("#start");
    await page.wait(DURATION_SECS * 1_000);
    await page.click("#stop");
    const runs = parseInt(await page.get("#runs", "innerText"));
    const average = round((parseFloat(await page.get("#time", "innerText")) / runs));
    system.log(`Attribute Update: Total (runs/sec): ${runs / DURATION_SECS}; Average Time (ms): ${average};`);
    expect(average < 1).toEqual(true);
  });

  test("Benchmark: Content Update", async () => {
    const page = await browser.mount("./components/benchmarks/contentUpdate.jsx");

    await page.click("#start");
    await page.wait(DURATION_SECS * 1_000);
    await page.click("#stop");
    const runs = parseInt(await page.get("#runs", "innerText"));
    const average = round((parseFloat(await page.get("#time", "innerText")) / runs));
    system.log(`Content Update: Total (runs/sec): ${runs / DURATION_SECS}; Average Time (ms): ${average};`);
    expect(average < 1).toEqual(true);
  });

  test("Benchmark: Element Update", async () => {
    const page = await browser.mount("./components/benchmarks/elementUpdate.jsx");

    await page.click("#start");
    await page.wait(DURATION_SECS * 1_000);
    await page.click("#stop");
    const runs = parseInt(await page.get("#runs", "innerText"));
    const average = round((parseFloat(await page.get("#time", "innerText")) / runs));
    system.log(`Element Update: Total (runs/sec): ${runs / DURATION_SECS}; Average Time (ms): ${average};`);
    expect(average < 5).toEqual(true);
  });

  test("Benchmark: Recursive Update", async () => {
    const page = await browser.mount("./components/benchmarks/recursiveUpdate.jsx");

    await page.click("#start");
    await page.wait(DURATION_SECS * 1_000);
    await page.click("#stop");
    const runs = parseInt(await page.get("#runs", "innerText"));
    const average = round((parseFloat(await page.get("#time", "innerText")) / runs));
    system.log(`Recursive Update: Total (runs/sec): ${runs / DURATION_SECS}; Average Time (ms): ${average};`);
    expect(average < 1).toEqual(true);
  });
});

function round(num) {
  if (num === 0) return 0;
  if (Math.abs(num) >= 1) return Math.round(num * 100) / 100;
  const precision = Math.pow(10, Math.abs(Math.floor(Math.log10(Math.abs(num)))));
  return Math.round(num * precision) / precision;
}