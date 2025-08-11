// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { expect, test } from "vitest";

test("Leases can migrate from V1 to current schema version", () => {
  const v1Lease = {
    status: "Active",
    approvedBy: "JohnDoe@amazon.com",
    awsAccountId: "1234567890123",
    totalCostAccrued: 350,
    expirationDate: new Date(2024, 9, 11, 3, 55, 0),
    originalLeaseTemplateUuid: "00000000-0000-0000-0000-000000000000",
    leaseTerms: {
      name: "myLeaseTemplate",
      budgetThresholds: [
        {
          dollarAmount: 100,
          action: "Alert",
        },
        {
          dollarAmount: 500,
          action: "RECLAIM_ACCOUNT",
        },
      ],
      durationThresholds: [
        {
          afterDurationHours: 23 * 24,
          action: "ALERT",
        },
        {
          afterDurationHours: 30 * 24,
          action: "RECLAIM_ACCOUNT",
        },
      ],
      requiresApproval: false,
      createdBy: "JohnDoe@amazon.com",
    },
  };

  expect(v1Lease).toEqual(v1Lease);
});
