import fs from "fs";
import path from "path";
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
  if (reporterConfig === "playwright-simple-json-reporter") {
    return {};
  }
  if (typeof reporterConfig === "object") {
    const config = reporterConfig.find(
      (c) =>
        c[0] === "playwright-simple-json-reporter" || c[0] === "./src/index.ts",
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

const getFormattedDate = (value: string | number | Date, format: string) => {
  const date = new Date(value);
  const symbol = {
    M: date.getMonth() + 1,
    d: date.getDate(),
    h: date.getHours(),
    m: date.getMinutes(),
    s: date.getSeconds(),
  };

  const formatted = format.replace(/(M+|d+|h+|m+|s+)/g, (v) =>
    (
      (v.length > 1 ? "0" : "") + symbol[v.slice(-1) as keyof typeof symbol]
    ).slice(-2),
  );

  return formatted.replace(/(y+)/g, (v) =>
    date.getFullYear().toString().slice(-v.length),
  );
};

const backupLatestReport = () => {
  const reporterOptions = getSimpleJsonReporterOptions(testConfig);
  const reportFolder = reporterOptions.outputFolder ?? "report";
  const reportFilePath = path.join(
    reportFolder,
    reporterOptions.name ?? "report.json",
  );
  if (fs.existsSync(reportFilePath)) {
    const report: Report = JSON.parse(
      fs.readFileSync(reportFilePath).toString(),
    );
    const startedAt = getFormattedDate(report.startedAt, "yyyy-MM-ddThh-mm-ss");
    const backupReportFolder = path.join(
      path.dirname(reportFolder),
      `report-${startedAt}`,
    );
    if (!fs.existsSync(backupReportFolder)) {
      fs.mkdirSync(backupReportFolder);
      fs.readdirSync(reportFolder).forEach((file) => {
        fs.cpSync(
          path.join(reportFolder, file),
          path.join(backupReportFolder, file),
          { recursive: true },
        );
      });
    }
  }
};

// 親コマンド
const program = new Command();
program.enablePositionalOptions();
program
  .command("report:backup")
  .description("Link the report of latest-run tests to the latest")
  .action(() => {
    backupLatestReport();
  });

program.parse(process.argv);
