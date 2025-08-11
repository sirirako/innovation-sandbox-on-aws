// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { z } from "zod";

import { EventDetailTypes } from "@amzn/innovation-sandbox-commons/events/index.js";
import { IsbEvent } from "@amzn/innovation-sandbox-commons/sdk-clients/event-bridge-client.js";

export const AccountQuarantinedEventSchema = z.object({
  awsAccountId: z.string(),
  reason: z.string(),
});

export class AccountQuarantinedEvent implements IsbEvent {
  readonly DetailType = EventDetailTypes.AccountQuarantined;
  readonly Detail: z.infer<typeof AccountQuarantinedEventSchema>;

  constructor(eventData: z.infer<typeof AccountQuarantinedEventSchema>) {
    this.Detail = eventData;
  }

  public static parse(eventDetail: unknown) {
    return new AccountQuarantinedEvent(
      AccountQuarantinedEventSchema.parse(eventDetail),
    );
  }
}
