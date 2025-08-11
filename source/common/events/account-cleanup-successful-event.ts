// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import z from "zod";

import { AwsAccountIdSchema } from "@amzn/innovation-sandbox-commons/data/common-schemas.js";
import { EventDetailTypes } from "@amzn/innovation-sandbox-commons/events/index.js";
import { IsbEvent } from "@amzn/innovation-sandbox-commons/sdk-clients/event-bridge-client.js";

export const AccountCleanupSuccessfulEventSchema = z.object({
  accountId: AwsAccountIdSchema,
  cleanupExecutionContext: z.object({
    stateMachineExecutionArn: z.string(),
    stateMachineExecutionStartTime: z.string(),
  }),
});

export class AccountCleanupSuccessfulEvent implements IsbEvent {
  readonly DetailType = EventDetailTypes.AccountCleanupSuccessful;
  readonly Detail: z.infer<typeof AccountCleanupSuccessfulEventSchema>;

  constructor(eventData: z.infer<typeof AccountCleanupSuccessfulEventSchema>) {
    this.Detail = eventData;
  }

  public static parse(eventDetail: unknown) {
    return new AccountCleanupSuccessfulEvent(
      AccountCleanupSuccessfulEventSchema.parse(eventDetail),
    );
  }
}
