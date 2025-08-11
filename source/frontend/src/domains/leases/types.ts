// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  LeaseWithLeaseId,
  MonitoredLease,
} from "@amzn/innovation-sandbox-commons/data/lease/lease";

export type NewLeaseRequest = {
  leaseTemplateUuid: string;
  comments?: string;
};

export type LeasePatchRequest = {
  leaseId: LeaseWithLeaseId["leaseId"];
  maxSpend?: MonitoredLease["maxSpend"] | null;
  budgetThresholds?: MonitoredLease["budgetThresholds"];
  expirationDate?: MonitoredLease["expirationDate"] | null;
  durationThresholds?: MonitoredLease["durationThresholds"];
};

export type LeaseFormData = LeasePatchRequest & {
  maxBudgetEnabled?: boolean;
  maxDurationEnabled?: boolean;
};

export type MonitoredLeaseWithLeaseId = MonitoredLease & LeaseWithLeaseId;
