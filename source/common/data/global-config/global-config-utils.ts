// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { GlobalConfig } from "@amzn/innovation-sandbox-commons/data/global-config/global-config.js";
import { LeaseTemplate } from "@amzn/innovation-sandbox-commons/data/lease-template/lease-template.js";
import {
  isMonitoredLease,
  Lease,
} from "@amzn/innovation-sandbox-commons/data/lease/lease.js";
import { DateTime } from "luxon";

export class ValidationException extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "ValidationException";
  }
}

export function validateLeaseCompliesWithGlobalConfig(
  lease: Lease,
  globalConfig: GlobalConfig,
) {
  validateMaxSpend(lease.maxSpend, globalConfig);

  if (isMonitoredLease(lease)) {
    //monitored leases consider expirationDate to be authoritative over leaseDuration, so this is the field we must validate
    const start = DateTime.fromISO(lease.startDate, { zone: "utc" });
    const expiration = lease.expirationDate
      ? DateTime.fromISO(lease.expirationDate, { zone: "utc" })
      : undefined;
    validateMaxDuration(
      computeDurationBetweenInHours(start, expiration),
      globalConfig,
    );
  } else {
    validateMaxDuration(lease.leaseDurationInHours, globalConfig);
  }
}

export function validateLeaseTemplateCompliesWithGlobalConfig(
  leaseTemplate: Pick<LeaseTemplate, "maxSpend" | "leaseDurationInHours">,
  globalConfig: GlobalConfig,
) {
  validateMaxSpend(leaseTemplate.maxSpend, globalConfig);
  validateMaxDuration(leaseTemplate.leaseDurationInHours, globalConfig);
}

function computeDurationBetweenInHours(
  startDate: DateTime,
  expirationDate?: DateTime,
) {
  if (!expirationDate) return undefined;
  return expirationDate.diff(startDate, "hours").hours;
}

function validateMaxSpend(
  maxSpend: number | undefined,
  globalConfig: GlobalConfig,
) {
  //maxSpend must be within global settings when used
  if (maxSpend && maxSpend > globalConfig.leases.maxBudget) {
    throw new ValidationException(
      `Max budget cannot be greater than the global max budget (${globalConfig.leases.maxBudget}).`,
    );
  }

  //unlimited spend is not allowed if not enabled in global config
  if (!maxSpend && globalConfig.leases.requireMaxBudget) {
    throw new ValidationException(
      "A max budget must be provided as required by administrator settings. Please contact your administrator if you need to create a lease without specifying a max budget.",
    );
  }
}

function validateMaxDuration(
  durationInHours: number | undefined,
  globalConfig: GlobalConfig,
) {
  if (
    durationInHours &&
    durationInHours > globalConfig.leases.maxDurationHours
  ) {
    throw new ValidationException(
      `Duration cannot be greater than the global max duration (${globalConfig.leases.maxDurationHours}).`,
    );
  }

  if (!durationInHours && globalConfig.leases.requireMaxDuration) {
    throw new ValidationException(
      "A duration must be provided as required by administrator settings. Please contact your administrator if you need to create a lease without specifying a duration.",
    );
  }
}
