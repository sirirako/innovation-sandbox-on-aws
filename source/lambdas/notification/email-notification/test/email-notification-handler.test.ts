// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  GlobalConfig,
  GlobalConfigSchema,
} from "@amzn/innovation-sandbox-commons/data/global-config/global-config.js";
import { AccountCleanupFailureEventSchema } from "@amzn/innovation-sandbox-commons/events/account-cleanup-failure-event.js";
import { AccountDriftEventSchema } from "@amzn/innovation-sandbox-commons/events/account-drift-detected-alert.js";
import { EventDetailTypes } from "@amzn/innovation-sandbox-commons/events/index.js";
import { LeaseApprovedEventSchema } from "@amzn/innovation-sandbox-commons/events/lease-approved-event.js";
import { LeaseBudgetThresholdTriggeredEventSchema } from "@amzn/innovation-sandbox-commons/events/lease-budget-threshold-breached-alert.js";
import { LeaseDeniedEventSchema } from "@amzn/innovation-sandbox-commons/events/lease-denied-event.js";
import { LeaseExpirationAlertEventSchema } from "@amzn/innovation-sandbox-commons/events/lease-duration-threshold-breached-alert.js";
import { LeaseFrozenEventSchema } from "@amzn/innovation-sandbox-commons/events/lease-frozen-event.js";
import { LeaseRequestedEventSchema } from "@amzn/innovation-sandbox-commons/events/lease-requested-event.js";
import { LeaseTerminatedEventSchema } from "@amzn/innovation-sandbox-commons/events/lease-terminated-event.js";
import { EmailEventName } from "@amzn/innovation-sandbox-commons/isb-services/notification/email-events.js";
import { EmailService } from "@amzn/innovation-sandbox-commons/isb-services/notification/email-service.js";
import {
  EmailNotificationEnvironment,
  EmailNotificationEnvironmentSchema,
} from "@amzn/innovation-sandbox-commons/lambda/environments/email-notification-lambda-environment.js";
import { ValidatedEnvironment } from "@amzn/innovation-sandbox-commons/lambda/middleware/environment-validator.js";
import { ContextWithConfig } from "@amzn/innovation-sandbox-commons/lambda/middleware/isb-config-middleware.js";
import { generateSchemaData } from "@amzn/innovation-sandbox-commons/test/generate-schema-data.js";
import {
  createEventBridgeEvent,
  mockContext,
} from "@amzn/innovation-sandbox-commons/test/lambdas/fixtures.js";
import {
  bulkStubEnv,
  mockAppConfigMiddleware,
} from "@amzn/innovation-sandbox-commons/test/lambdas/utils.js";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { z } from "zod";

const testEnv = generateSchemaData(EmailNotificationEnvironmentSchema);

let mockedGlobalConfig: GlobalConfig;
let mockedContext: ContextWithConfig &
  ValidatedEnvironment<EmailNotificationEnvironment>;
let handler: typeof import("@amzn/innovation-sandbox-email-notification/email-notification-handler.js").handler;

const emailServiceSpy = vi
  .spyOn(EmailService.prototype, "sendNotificationEmail")
  .mockReturnValue(Promise.resolve());

beforeAll(async () => {
  bulkStubEnv(testEnv);
  mockedGlobalConfig = generateSchemaData(GlobalConfigSchema);
  mockedContext = mockContext(testEnv, mockedGlobalConfig);
  handler = (
    await import(
      "@amzn/innovation-sandbox-email-notification/email-notification-handler.js"
    )
  ).handler;
});
beforeEach(() => {
  mockAppConfigMiddleware(mockedGlobalConfig);
});
afterEach(() => {
  vi.clearAllMocks();
});
afterAll(() => {
  vi.unstubAllEnvs();
});

describe("email-notification-handler", () => {
  type TestInput = { eventName: EmailEventName; schema: z.ZodSchema<any> };
  type RequiredTestCases = {
    [K in EmailEventName]: {
      eventName: K;
      schema: z.ZodSchema<any>;
    };
  };

  const testCases: RequiredTestCases = {
    [EventDetailTypes.LeaseRequested]: {
      eventName: EventDetailTypes.LeaseRequested,
      schema: LeaseRequestedEventSchema,
    },
    [EventDetailTypes.LeaseApproved]: {
      eventName: EventDetailTypes.LeaseApproved,
      schema: LeaseApprovedEventSchema,
    },
    [EventDetailTypes.LeaseDenied]: {
      eventName: EventDetailTypes.LeaseDenied,
      schema: LeaseDeniedEventSchema,
    },
    [EventDetailTypes.LeaseTerminated]: {
      eventName: EventDetailTypes.LeaseTerminated,
      schema: LeaseTerminatedEventSchema,
    },
    [EventDetailTypes.LeaseFrozen]: {
      eventName: EventDetailTypes.LeaseFrozen,
      schema: LeaseFrozenEventSchema,
    },
    [EventDetailTypes.AccountCleanupFailure]: {
      eventName: EventDetailTypes.AccountCleanupFailure,
      schema: AccountCleanupFailureEventSchema,
    },
    [EventDetailTypes.AccountDriftDetected]: {
      eventName: EventDetailTypes.AccountDriftDetected,
      schema: AccountDriftEventSchema,
    },
    [EventDetailTypes.LeaseBudgetThresholdBreachedAlert]: {
      eventName: EventDetailTypes.LeaseBudgetThresholdBreachedAlert,
      schema: LeaseBudgetThresholdTriggeredEventSchema,
    },
    [EventDetailTypes.LeaseDurationThresholdBreachedAlert]: {
      eventName: EventDetailTypes.LeaseDurationThresholdBreachedAlert,
      schema: LeaseExpirationAlertEventSchema,
    },
  };

  const testInputs = Object.values(testCases);
  it.each(testInputs)(
    "should send email for all subscribed events, $eventName",
    async ({ eventName, schema }: TestInput) => {
      const isbEvent = generateSchemaData(schema);
      const emailEvent = createEventBridgeEvent(eventName, isbEvent);
      await handler(emailEvent, mockedContext);
      expect(emailServiceSpy).toHaveBeenCalled();
    },
  );

  it("should not send email for unsubscribed event", async () => {
    const emailEvent = createEventBridgeEvent("InvalidEvent", {});
    await expect(handler(emailEvent, mockedContext)).rejects.toThrow(Error);
    expect(emailServiceSpy).not.toHaveBeenCalled();
  });
});
