// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { EventDetailTypes } from "@amzn/innovation-sandbox-commons/events/index.js";
import { LeaseFrozenEventSchema } from "@amzn/innovation-sandbox-commons/events/lease-frozen-event.js";
import { IsbEvent } from "@amzn/innovation-sandbox-commons/sdk-clients/event-bridge-client.js";
import z from "zod";

export const LeaseFreezingEventSchema = LeaseFrozenEventSchema;

export class LeaseFreezingThresholdBreachedAlert implements IsbEvent {
  readonly DetailType = EventDetailTypes.LeaseFreezingThresholdBreachedAlert;
  readonly Detail: z.infer<typeof LeaseFreezingEventSchema>;

  constructor(eventData: z.infer<typeof LeaseFreezingEventSchema>) {
    this.Detail = eventData;
  }

  public static parse(eventDetail: unknown) {
    return new LeaseFreezingThresholdBreachedAlert(
      LeaseFreezingEventSchema.parse(eventDetail),
    );
  }
}
