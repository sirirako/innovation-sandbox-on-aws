// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { EventDetailTypes } from "@amzn/innovation-sandbox-commons/events/index.js";

export const SubscribedEmailEvents = [
  EventDetailTypes.LeaseRequested,
  EventDetailTypes.LeaseApproved,
  EventDetailTypes.LeaseDenied,
  EventDetailTypes.LeaseTerminated,
  EventDetailTypes.LeaseFrozen,
  EventDetailTypes.AccountCleanupFailure,
  EventDetailTypes.AccountDriftDetected,
  EventDetailTypes.LeaseBudgetThresholdBreachedAlert,
  EventDetailTypes.LeaseDurationThresholdBreachedAlert,
];

export type EmailEventName = (typeof SubscribedEmailEvents)[number];

export function isSubscribedEmailEvent(eventName: string): boolean {
  return SubscribedEmailEvents.includes(eventName as EmailEventName);
}
