import fs from "fs";
import path from "path";
import z from "zod";
import {
  TestCase,
  TestResult,
  Reporter,
  FullResult,
} from "@playwright/test/reporter";

const resultSchema = z.object({
  id: z.string(),
  project: z.string(),
  location: z.string(),
  title: z.string(),
  outcome: z.union([
    z.literal("skipped"),
    z.literal("expected"),
    z.literal("unexpected"),
    z.literal("flaky"),
  ]),
  durationInMs: z.number(),
});

const reportSchema = z.object({
  startedAt: z.number(),
  durationInMs: z.number(),
  results: z.array(resultSchema),
  status: z.union([
    z.literal("passed"),
    z.literal("failed"),
    z.literal("timedout"),
    z.literal("interrupted"),
    z.literal("unknown"),
  ]),
});

export type Report = z.infer<typeof reportSchema>;
export type Result = z.infer<typeof resultSchema>;
export type ReporterOptions = {
  name?: string;
  outputFolder?: string;
  projects?: string[];
  testMatch?: RegExp;
};

class SimpleJsonReporter implements Reporter {
  startedAt: number = 0;
  durationInMs: number = 0;
  status: Report["status"] = "unknown";
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
    this.startedAt = fullResult.startTime.getTime();
    this.durationInMs = fullResult.duration;
    this.status = fullResult.status;

    // removing duplicate tests from results array
    this.results = this.results.filter((result, index) => {
      return this.results.indexOf(result) === index;
    });

    const report: Report = {
      startedAt: this.startedAt,
      durationInMs: this.durationInMs,
      results: this.results,
      status: this.status,
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
