import fs from "fs";
import sjr from "simple-json-reporter";
import { Report, Result } from "simple-json-reporter";

test("レポートが正しく出力されること", () => {
  const file = "report/latest.json";
  expect(fs.existsSync(file)).toBeTruthy();
  const report = JSON.parse(fs.readFileSync(file, "utf-8"));
  for (const result of (report as Report).results) {
    expect(sjr.isValidResult(result)).toBeTruthy();
  }
  expect(sjr.isValidReport(report)).toBeTruthy();
  const skipped = (report as Report).results
    .filter((r: Result) => r.outcome === "skipped")
    .map((r: Result) => r.location);
  expect(skipped).toEqual(
    expect.arrayContaining([
      "playwright.setup.js:10:6",
      "playwright.setup.ts:10:6",
      "playwright.spec.js:10:6",
      "playwright.spec.ts:10:6",
      "playwright.test.js:10:6",
      "playwright.test.ts:10:6",
    ]),
  );
  const expected = (report as Report).results
    .filter((r: Result) => r.outcome === "expected")
    .map((r: Result) => r.location);
  expect(expected).toEqual(
    expect.arrayContaining([
      "playwright.setup.js:3:5",
      "playwright.setup.ts:3:5",
      "playwright.spec.js:3:5",
      "playwright.spec.ts:3:5",
      "playwright.test.js:3:5",
      "playwright.test.ts:3:5",
    ]),
  );
  const unexpected = (report as Report).results
    .filter((r: Result) => r.outcome === "unexpected")
    .map((r: Result) => r.location);
  expect(unexpected).toEqual(
    expect.arrayContaining([
      "playwright.setup.js:17:5",
      "playwright.setup.js:24:5",
      "playwright.setup.ts:17:5",
      "playwright.setup.ts:24:5",
      "playwright.spec.js:17:5",
      "playwright.spec.js:24:5",
      "playwright.spec.ts:17:5",
      "playwright.spec.ts:24:5",
      "playwright.test.js:17:5",
      "playwright.test.js:24:5",
      "playwright.test.ts:17:5",
      "playwright.test.ts:24:5",
    ]),
  );
  const flaky = (report as Report).results
    .filter((r: Result) => r.outcome === "flaky")
    .map((r: Result) => r.location);
  expect(flaky).toStrictEqual([]);
  expect(report.status).toStrictEqual("failed");
});
