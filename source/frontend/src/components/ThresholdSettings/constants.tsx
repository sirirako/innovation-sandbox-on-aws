// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { SelectProps } from "@cloudscape-design/components";

export const ThresholdTypes = {
  budget: {
    label: "is consumed",
    isCurrency: true,
    valueAttributeName: "dollarsSpent",
    maxValueAttributeName: "maxSpend",
    maxValueEnabledAttributeName: "maxBudgetEnabled",
    lastThresholdIsZero: false,
  },
  duration: {
    label: "hours remain",
    isCurrency: false,
    valueAttributeName: "hoursRemaining",
    maxValueAttributeName: "leaseDurationInHours",
    maxValueEnabledAttributeName: "maxDurationEnabled",
    lastThresholdIsZero: true,
  },
};

export const ThresholdActionOptions: SelectProps.Options = [
  { label: "Send Alert", value: "ALERT" },
  { label: "Freeze Account", value: "FREEZE_ACCOUNT" },
];
