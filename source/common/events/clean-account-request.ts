// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import z from "zod";

import { AwsAccountIdSchema } from "@amzn/innovation-sandbox-commons/data/common-schemas.js";
import { EventDetailTypes } from "@amzn/innovation-sandbox-commons/events/index.js";
import { IsbEvent } from "@amzn/innovation-sandbox-commons/sdk-clients/event-bridge-client.js";

export const CleanAccountRequestSchema = z.object({
  accountId: AwsAccountIdSchema,
  reason: z.string(),
});

export class CleanAccountRequest implements IsbEvent {
  readonly DetailType = EventDetailTypes.CleanAccountRequest;
  readonly Detail: z.infer<typeof CleanAccountRequestSchema>;

  constructor(eventData: z.infer<typeof CleanAccountRequestSchema>) {
    this.Detail = eventData;
  }

  public static parse(eventDetail: unknown) {
    return new CleanAccountRequest(
      CleanAccountRequestSchema.parse(eventDetail),
    );
  }
}
