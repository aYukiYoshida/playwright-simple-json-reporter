# playwright-simple-json-reporter

[![Build Status on GitHub Actions](https://github.com/aYukiYoshida/playwright-simple-json-reporter/actions/workflows/build.yml/badge.svg)](BUILD)[![MIT License](http://img.shields.io/badge/license-MIT-blue.svg?style=flat)](LICENSE)[![npm version](https://badge.fury.io/js/playwright-simple-json-reporter.svg)](https://badge.fury.io/js/playwright-simple-json-reporter)

## Installation

```bash
npm install -D playwright-simple-json-reporter
```

## Usage

```bash
npx playwright test --reporter=playwright-simple-json-reporter
```

## Format

The sample of the JSON format is as follows.

```JSON
{
  "startedAt": 1713507478073,
  "durationInMs": 27545.525999999998,
  "status": "passed",
  "results": [
    {
      "id": "308f7d0e05acf652cf55-dff0c71519df34ca7ba8",
      "project": "setup",
      "location": "setup/login.setup.ts:22:5",
      "title": "Login and Setup as Bob",
      "outcome": "expected",
      "durationInMs": 5113
    },
    {
      "id": "884fc53766d15c58cb3b-f843d31e795e7fc28ff0",
      "project": "chrome",
      "location": "tests/chat.spec.ts:129:7",
      "title": "Send a chat message",
      "outcome": "expected",
      "durationInMs": 6602
    },
    {
      "id": "269790c8a8e01a6a79d9-a66c0172f374246b12a5",
      "project": "teardown",
      "location": "teardown/chat.teardown.ts:77:7",
      "title": "Delete chat messages",
      "outcome": "expected",
      "durationInMs": 10126
    }
  ]
}
```

The description of each field is as follows.

- `startedAt` (number): The unix time in milliseconds of test start wall time.
- `durationInMs` (number): The duration of the whole of test in milliseconds.
- `status` (string): The status of the test. It is one of `passed`, `failed`, `timedout`, `interrupted`.
- `results` (object): The array of test results.
  - `id` (string): Unique identifier of test case.
  - `project` (string): Project name of test case. Note that it is [the project name of Playwright](https://playwright.dev/docs/api/class-testproject).
  - `location` (string): Location of test case.
  - `title` (string): Title of test case.
  - `outcome` (string): Testing outcome of test case. It is one of `expected`, `unexpected`, `skipped` of `flaky`.
  - `durationInMs` (number): Duration of test case in milliseconds.
