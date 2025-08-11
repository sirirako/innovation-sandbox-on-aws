// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { LogArchivingService } from "@amzn/innovation-sandbox-commons/isb-services/log-archiving-service.js";
import { LogArchivingEnvironmentSchema } from "@amzn/innovation-sandbox-commons/lambda/environments/log-archiving-lambda-environment.js";
import { generateSchemaData } from "@amzn/innovation-sandbox-commons/test/generate-schema-data.js";
import {
  createEventBridgeEvent,
  mockContext,
} from "@amzn/innovation-sandbox-commons/test/lambdas/fixtures.js";
import { bulkStubEnv } from "@amzn/innovation-sandbox-commons/test/lambdas/utils.js";
import { now } from "@amzn/innovation-sandbox-commons/utils/time-utils.js";
import { handler } from "@amzn/innovation-sandbox-log-archiving/log-archiving-handler.js";
import { DateTime } from "luxon";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const testExportPeriodDays = 7;
const testEnv = generateSchemaData(LogArchivingEnvironmentSchema, {
  EXPORT_PERIOD_DAYS: String(testExportPeriodDays),
});
const mockedContext = mockContext(testEnv);
const scheduleEvent = createEventBridgeEvent("Scheduled Event", {});
const createExportTaskSpy = vi
  .spyOn(LogArchivingService.prototype, "createExportTask")
  .mockResolvedValue(undefined);
const saveLastExportedDateTimeSpy = vi
  .spyOn(LogArchivingService.prototype, "saveLastExportedDateTime")
  .mockResolvedValue(undefined);

beforeAll(async () => {
  bulkStubEnv(testEnv);
});

afterAll(() => {
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("log-archiving-handler", () => {
  it("should create a successful export task when called the first time", async () => {
    const getLastExportedDateTimeSpy = vi
      .spyOn(LogArchivingService.prototype, "getLastExportedDateTime")
      .mockResolvedValue(undefined);
    await handler(scheduleEvent, mockedContext);
    expect(getLastExportedDateTimeSpy).toHaveBeenCalledWith();
    expect(createExportTaskSpy).toHaveBeenCalledWith({
      fromTime: expect.any(DateTime),
      toTime: expect.any(DateTime),
      currentExportTS: expect.any(String),
    });
    expect(saveLastExportedDateTimeSpy).toHaveBeenCalledTimes(1);
  });

  it("should create a successful export task when called at the right time", async () => {
    const getLastExportedDateTimeSpy = vi
      .spyOn(LogArchivingService.prototype, "getLastExportedDateTime")
      .mockResolvedValue(now().minus({ days: testExportPeriodDays }).toISO());
    await handler(scheduleEvent, mockedContext);
    expect(getLastExportedDateTimeSpy).toHaveBeenCalledWith();
    expect(createExportTaskSpy).toHaveBeenCalledWith({
      fromTime: expect.any(DateTime),
      toTime: expect.any(DateTime),
      currentExportTS: expect.any(String),
    });
    expect(saveLastExportedDateTimeSpy).toHaveBeenCalledTimes(1);
  });

  it("should not create an export task when called too frequently", async () => {
    const getLastExportedDateTimeSpy = vi
      .spyOn(LogArchivingService.prototype, "getLastExportedDateTime")
      .mockResolvedValue(now().minus({ days: 1 }).toISO());
    await handler(scheduleEvent, mockedContext);
    expect(getLastExportedDateTimeSpy).toHaveBeenCalledWith();
    expect(createExportTaskSpy).not.toHaveBeenCalled();
    expect(saveLastExportedDateTimeSpy).not.toHaveBeenCalled();
  });

  it("should create a successful export task with the default period when the last exported date is invalid", async () => {
    const getLastExportedDateTimeSpy = vi
      .spyOn(LogArchivingService.prototype, "getLastExportedDateTime")
      .mockResolvedValue("Invalid Date");
    await handler(scheduleEvent, mockedContext);
    expect(getLastExportedDateTimeSpy).toHaveBeenCalledWith();
    expect(createExportTaskSpy).toHaveBeenCalledWith({
      fromTime: expect.any(DateTime),
      toTime: expect.any(DateTime),
      currentExportTS: expect.any(String),
    });
    expect(saveLastExportedDateTimeSpy).toHaveBeenCalledTimes(1);
  });
});
