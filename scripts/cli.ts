import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import moment from "moment";
import { Command } from "commander";
import { PlaywrightTestConfig } from "@playwright/test";
import testConfig from "playwright-config";
import { ReporterOptions, Report } from "simple-json-reporter";

const hasReporterConfig = (config: PlaywrightTestConfig) => {
  return "reporter" in config;
};

const getReporterConfig = (config: PlaywrightTestConfig) => {
  if (hasReporterConfig(config)) {
    return config.reporter;
  } else {
    throw new Error("The reporter is not defined in the config of Playwright");
  }
};

const getSimpleJsonReporterOptions = (
  config: PlaywrightTestConfig,
): ReporterOptions => {
  const reporterConfig = getReporterConfig(config);
  if (reporterConfig === "simple-json-reporter") {
    return {};
  }
  if (typeof reporterConfig === "object") {
    const config = reporterConfig.find(
      (c) => c[0] === "simple-json-reporter" || c[0] === "./src/index.ts",
    );
    if (!config) {
      throw new Error(
        "The reporter is not defined in the config of Playwright",
      );
    } else {
      if (config.length === 2) {
        return config[1];
      } else {
        return {};
      }
    }
  }
  throw new Error("The reporter is not defined in the config of Playwright");
};

const linkLatestReport = () => {
  const reporterOptions = getSimpleJsonReporterOptions(testConfig);
  const reportFolder = reporterOptions.outputFolder ?? "report";
  const latestReport = path.join(reportFolder, "latest.json");
  const reportRegex = /^report-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}).json$/;
  const reports: string[] = fs.readdirSync(reportFolder).filter((file) => {
    return file.match(reportRegex);
  });
  if (reports.length === 0) {
    console.error(`No report found in ${reportFolder}`);
    process.exit(1);
  } else {
    const latest = reports
      .map((report) => {
        const match = report.match(reportRegex);
        if (!match) {
          throw new Error(`The report name is invalid: ${report}`);
        }
        return moment(match[1], "YYYY-MM-DD[T]HH-mm-ss");
      })
      .reduce((latest, current) => {
        return current.isAfter(latest) ? current : latest;
      }, moment("2000-01-01"));

    if (fs.existsSync(latestReport)) {
      fs.unlinkSync(latestReport);
    }

    fs.symlinkSync(
      path.join(".", `report-${latest.format("YYYY-MM-DD[T]HH-mm-ss")}.json`),
      latestReport,
    );
    console.info(
      `The report of ${latest.format(
        "YYYY-MM-DD[T]HH-mm-ss",
      )} is linked to latest.`,
    );
  }
};

const runLatestFailedTests = (options: string[]) => {
  const reporterOptions = getSimpleJsonReporterOptions(testConfig);
  const reportFilePath = path.join(
    reporterOptions.outputFolder ?? "report",
    "latest.json",
  );
  if (!fs.existsSync(reportFilePath))
    throw new Error(`${reportFilePath} does not exist`);

  const report: Report = JSON.parse(fs.readFileSync(reportFilePath).toString());
  const targets: string[] = report.results
    .filter((result) => result.outcome === "unexpected")
    .map((result) => result.location);
  if (targets.length) {
    execSync(`npx playwright test ${options.join(" ")} ${targets.join(" ")}`, {
      stdio: "inherit",
    });
  } else {
    console.info(
      "There is no test case resulted as unexpected in the latest report",
    );
  }
};

// 親コマンド
const program = new Command();
program.enablePositionalOptions();
program
  .command("test:latest-failed [options...]")
  .description("Run the latest failed test cases")
  .passThroughOptions()
  .action((options) => {
    runLatestFailedTests(options);
  });
program
  .command("report:link")
  .description("Link the report of latest-run tests to the latest")
  .action(() => {
    linkLatestReport();
  });

program.parse(process.argv);
