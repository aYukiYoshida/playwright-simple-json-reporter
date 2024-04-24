import fs from "fs";
import path from "path";
import z from "zod";
import {
  TestCase,
  TestResult,
  Reporter,
  FullResult,
} from "@playwright/test/reporter";

const outcomeSchema = z.union([
  z.literal("skipped"),
  z.literal("expected"),
  z.literal("unexpected"),
  z.literal("flaky"),
]);

const resultSchema = z.object({
  id: z.string(),
  project: z.string(),
  location: z.string(),
  title: z.string(),
  outcome: outcomeSchema,
  durationInMs: z.number(),
});

const reportSchema = z.object({
  startedAt: z.number(),
  durationInMs: z.number(),
  status: z.union([
    z.literal("passed"),
    z.literal("failed"),
    z.literal("timedout"),
    z.literal("interrupted"),
    z.literal("unknown"),
  ]),
  results: z.array(resultSchema),
});

export type Outcome = z.infer<typeof outcomeSchema>;
export type Report = z.infer<typeof reportSchema>;
export type Result = z.infer<typeof resultSchema>;
export type ReporterOptions = {
  name?: string;
  outputFolder?: string;
  projects?: string[];
  testMatch?: RegExp;
};

/**
 * Determine result from duplicate results of the same test case
 */
const determineResult = (results: Result[]): Result => {
  if (results.length === 1) {
    return results[0];
  }
  const outcome: Outcome[] = Array.from(
    new Set(results.map((result) => result.outcome)),
  );
  if (outcome.includes("expected")) {
    return results.filter((result) => result.outcome === "expected")[0];
  } else if (outcome.includes("flaky")) {
    return results.filter((result) => result.outcome === "flaky")[0];
  } else {
    return results.filter((result) => result.outcome === "unexpected")[0];
  }
};

/**
 * Remove duplicate results of the same test case
 */
const removeDuplicateResults = (results: Result[]): Result[] => {
  const testIds: string[] = Array.from(
    new Set(results.map((result) => result.id)),
  );
  return testIds.map((id) => {
    const intendResults: Result[] = results.filter((r) => r.id === id);
    return determineResult(intendResults);
  });
};

class SimpleJsonReporter implements Reporter {
  results: Result[] = [];
  private filename: string;
  private outputFolder: string;
  private testMatch: RegExp;
  private projects: string[];

  constructor(options: ReporterOptions = {}) {
    this.filename = options.name ?? "report.json";
    this.outputFolder = options.outputFolder ?? "report";
    this.projects = options.projects ?? [];
    this.testMatch = options.testMatch ?? /.*\.(spec|test|setup)\.(j|t|mj)s/;
  }

  onTestEnd(testCase: TestCase, testResult: TestResult): void {
    const project =
      testCase.titlePath().find((s) => this.projects.includes(s)) ?? "";
    const filename =
      testCase.titlePath().find((s) => this.testMatch.test(s)) ?? "";
    const title = testCase
      .titlePath()
      .filter((s) => s !== "" && s !== project && s !== filename);
    const result: Result = {
      id: testCase.id,
      project: project,
      location: `${filename}:${testCase.location.line}:${testCase.location.column}`,
      title: title.join(" > "),
      outcome: testCase.outcome(),
      durationInMs: testResult.duration,
    };
    this.results.push(result);
  }

  onEnd(fullResult: FullResult) {
    // removing duplicate tests from results array
    const results = removeDuplicateResults(this.results);

    const report: Report = {
      startedAt: fullResult.startTime.getTime(),
      durationInMs: fullResult.duration,
      status: fullResult.status,
      results: results,
    };
    if (!fs.existsSync(this.outputFolder))
      fs.mkdirSync(this.outputFolder, { recursive: true });
    fs.writeFileSync(
      path.join(this.outputFolder, this.filename),
      JSON.stringify(report, null, 2),
    );
  }

  public static isValidResult(obj: unknown): obj is Result {
    return resultSchema.safeParse(obj).success;
  }

  public static isValidReport(obj: unknown): obj is Report {
    return reportSchema.safeParse(obj).success;
  }
}

export default SimpleJsonReporter;
