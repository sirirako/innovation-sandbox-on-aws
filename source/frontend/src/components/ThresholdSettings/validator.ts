// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  BudgetThreshold,
  DurationThreshold,
} from "@amzn/innovation-sandbox-commons/data/lease-template/lease-template";
import { ThresholdTypes } from "@amzn/innovation-sandbox-frontend/components/ThresholdSettings/constants";
import { validateNumber } from "@amzn/innovation-sandbox-frontend/helpers/validators";

// Validate the list of thresholds - either return an error message or null if no errors
export const thresholdValidator = (type: "budget" | "duration") => {
  return (
    thresholds: BudgetThreshold[] | DurationThreshold[] | undefined,
    form: any,
  ): string | null => {
    const { maxValueAttributeName, maxValueEnabledAttributeName } =
      ThresholdTypes[type];

    const maxValue = form[maxValueEnabledAttributeName]
      ? form[maxValueAttributeName]
      : undefined;

    return validateAllThresholds(thresholds, maxValue);
  };
};

export const validateAllThresholds = (
  thresholds: BudgetThreshold[] | DurationThreshold[] | undefined,
  maxValue?: number,
): string | null => {
  // undefined thresholds mean unlimited budget / time
  if (thresholds === undefined) {
    return null;
  }

  for (let index = 0; index < (thresholds ?? []).length; index++) {
    const { valueError, actionError } = validateThreshold(
      thresholds,
      index,
      maxValue,
    );

    if (valueError || actionError) {
      return "Please fix the above errors";
    }
  }

  return null;
};

export const getThresholdValue = (
  threshold: BudgetThreshold | DurationThreshold,
) => {
  // extract value depending on whether it is a budget or duration threshold
  const value =
    "dollarsSpent" in threshold
      ? threshold.dollarsSpent
      : threshold.hoursRemaining;

  return value;
};

// Validate an individual item in the list of thresholds
// This function is used to determine whether or not to highlight the percentage/action form fields
export const validateThreshold = (
  thresholds: (BudgetThreshold | DurationThreshold)[],
  index: number,
  maxValue?: number,
): { valueError: string | null; actionError: string | null } => {
  const threshold = thresholds[index];
  const { action } = threshold;

  // extract value depending on whether it is a budget or duration threshold
  const value = getThresholdValue(threshold);

  const valueError: string | null = (() => {
    // not a number
    const invalidNumber = validateNumber(value);
    if (invalidNumber) {
      return invalidNumber;
    }

    // check if number is between 0 and max value
    if (maxValue && maxValue > 0) {
      if (value <= 0 || value >= maxValue) {
        return `Value must be between 1 and ${maxValue}`;
      }
    }

    // same percentage appears more than once
    if (thresholds.filter((t) => getThresholdValue(t) === value).length > 1) {
      return "The same value was defined multiple times.";
    }

    return null;
  })();

  const actionError: string | null = (() => {
    if (!action) {
      return "Please select an action";
    }

    // freeze actions
    if (action === "FREEZE_ACCOUNT") {
      // check for duplicate  freeze actions
      if (thresholds.filter((t) => t.action === "FREEZE_ACCOUNT").length > 1) {
        return "You can only have one Freeze Account action";
      }
    }

    return null;
  })();

  return { valueError, actionError };
};
