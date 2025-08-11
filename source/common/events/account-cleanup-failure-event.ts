// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import z from "zod";

import { AwsAccountIdSchema } from "@amzn/innovation-sandbox-commons/data/common-schemas.js";
import { EventDetailTypes } from "@amzn/innovation-sandbox-commons/events/index.js";
import { IsbEvent } from "@amzn/innovation-sandbox-commons/sdk-clients/event-bridge-client.js";

export const AccountCleanupFailureEventSchema = z.object({
  accountId: AwsAccountIdSchema,
  cleanupExecutionContext: z.object({
    stateMachineExecutionArn: z.string(),
    stateMachineExecutionStartTime: z.string(),
  }),
});

export class AccountCleanupFailureEvent implements IsbEvent {
  readonly DetailType = EventDetailTypes.AccountCleanupFailure;
  readonly Detail: z.infer<typeof AccountCleanupFailureEventSchema>;

  constructor(eventData: z.infer<typeof AccountCleanupFailureEventSchema>) {
    this.Detail = eventData;
  }

  public static parse(eventDetail: unknown) {
    return new AccountCleanupFailureEvent(
      AccountCleanupFailureEventSchema.parse(eventDetail),
    );
  }
}
