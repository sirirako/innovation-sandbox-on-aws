// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { retryAsync } from "ts-retry/lib/esm/index.js";
import { beforeAll, describe, expect, inject, test } from "vitest";

import { LeaseStore } from "@amzn/innovation-sandbox-commons/data/lease/lease-store.js";
import {
  ExpiredLeaseSchema,
  LeaseKeySchema,
  LeaseSchema,
  MonitoredLeaseSchema,
  PendingLeaseSchema,
} from "@amzn/innovation-sandbox-commons/data/lease/lease.js";
import { IsbServices } from "@amzn/innovation-sandbox-commons/isb-services/index.js";
import { generateSchemaData } from "@amzn/innovation-sandbox-commons/test/generate-schema-data.js";

let leaseStore: LeaseStore;
beforeAll(async () => {
  leaseStore = IsbServices.leaseStore({
    LEASE_TABLE_NAME: inject("testConfiguration").leaseTable,
    USER_AGENT_EXTRA: "InnovationSandbox-E2E",
  });
});

describe("lease-store", () => {
  test("unable to update lease that doesn't exist", async () => {
    await expect(async () => {
      await leaseStore.update(
        generateSchemaData(LeaseSchema, {
          status: "PendingApproval",
          meta: undefined,
        }),
      );
    }).rejects.toThrowError("Unknown Lease.");
  });

  test("unable to create lease that already exists", async () => {
    const lease = generateSchemaData(LeaseSchema, {
      status: "PendingApproval",
      meta: undefined,
    });
    try {
      await leaseStore.create(lease);
      await expect(async () => {
        await leaseStore.create(lease);
      }).rejects.toThrowError("Lease already exists.");
    } finally {
      await leaseStore.delete(LeaseKeySchema.parse(lease));
    }
  });

  test("lease rollback detects concurrent modification", async () => {
    const lease = await leaseStore.create(
      generateSchemaData(LeaseSchema, {
        status: "PendingApproval",
        meta: undefined,
      }),
    );
    try {
      lease.comments = "a new comment!";
      const transaction = leaseStore.transactionalUpdate(lease);
      await transaction.complete();

      await leaseStore.update({
        ...lease,
        comments: "overridden comment",
      });
      await expect(async () => {
        await transaction.rollbackTransaction();
      }).rejects.toThrowError(
        "Transaction rollback failed: [ConcurrentDataModificationException: The lease has been modified from the expected value.",
      );
    } finally {
      await leaseStore.delete(LeaseKeySchema.parse(lease));
    }
  });

  test("find by status", async () => {
    let activeLease = generateSchemaData(MonitoredLeaseSchema, {
      status: "Active",
      meta: undefined,
    });
    let expiredLease = generateSchemaData(ExpiredLeaseSchema, {
      status: "Expired",
      meta: undefined,
    });
    let pendingApprovalLease = generateSchemaData(PendingLeaseSchema, {
      status: "PendingApproval",
      meta: undefined,
    });

    try {
      activeLease = await leaseStore.create(activeLease);
      expiredLease = await leaseStore.create(expiredLease);
      pendingApprovalLease = await leaseStore.create(pendingApprovalLease);

      await retryAsync(
        async () => {
          const fetchedActiveLeases = (
            await leaseStore.findByStatus({ status: "Active" })
          ).result;
          const fetchedExpiredLeases = (
            await leaseStore.findByStatus({ status: "Expired" })
          ).result;
          const fetchedPendingLeases = (
            await leaseStore.findByStatus({ status: "PendingApproval" })
          ).result;

          expect(fetchedActiveLeases).toContainEqual(activeLease);
          expect(fetchedActiveLeases).not.toContainEqual(expiredLease);
          expect(fetchedActiveLeases).not.toContainEqual(pendingApprovalLease);

          expect(fetchedExpiredLeases).not.toContainEqual(activeLease);
          expect(fetchedExpiredLeases).toContainEqual(expiredLease);
          expect(fetchedExpiredLeases).not.toContainEqual(pendingApprovalLease);

          expect(fetchedPendingLeases).not.toContainEqual(activeLease);
          expect(fetchedPendingLeases).not.toContainEqual(expiredLease);
          expect(fetchedPendingLeases).toContainEqual(pendingApprovalLease);
        },
        {
          delay: 200,
          maxTry: 10,
        },
      );
    } finally {
      await leaseStore.delete(LeaseKeySchema.parse(activeLease));
      await leaseStore.delete(LeaseKeySchema.parse(expiredLease));
      await leaseStore.delete(LeaseKeySchema.parse(pendingApprovalLease));
    }
  });

  test("find by statusAndAccountId", async () => {
    let activeLease = generateSchemaData(MonitoredLeaseSchema, {
      status: "Active",
      awsAccountId: "222233334444",
      meta: undefined,
    });
    let expiredLease = generateSchemaData(ExpiredLeaseSchema, {
      status: "Expired",
      awsAccountId: "222233334444",
      meta: undefined,
    });
    let otherActiveLease = generateSchemaData(MonitoredLeaseSchema, {
      status: "Active",
      awsAccountId: "123456789012",
      meta: undefined,
    });

    try {
      activeLease = await leaseStore.create(activeLease);
      expiredLease = await leaseStore.create(expiredLease);
      otherActiveLease = await leaseStore.create(otherActiveLease);

      await retryAsync(
        async () => {
          const fetchedLeases = (
            await leaseStore.findByStatusAndAccountID({
              status: "Active",
              awsAccountId: "222233334444",
            })
          ).result;

          expect(fetchedLeases).toContainEqual(activeLease);
          expect(fetchedLeases).not.toContainEqual(expiredLease);
          expect(fetchedLeases).not.toContainEqual(otherActiveLease);
        },
        {
          delay: 200,
          maxTry: 10,
        },
      );
    } finally {
      await leaseStore.delete(LeaseKeySchema.parse(activeLease));
      await leaseStore.delete(LeaseKeySchema.parse(expiredLease));
      await leaseStore.delete(LeaseKeySchema.parse(otherActiveLease));
    }
  });

  test("find by key", async () => {
    let lease = generateSchemaData(LeaseSchema, { meta: undefined });

    try {
      lease = await leaseStore.create(lease);

      await retryAsync(
        async () => {
          const fetchedLease = (
            await leaseStore.get(LeaseKeySchema.parse(lease))
          ).result;
          expect(fetchedLease).toEqual(lease);
        },
        {
          delay: 200,
          maxTry: 10,
        },
      );
    } finally {
      await leaseStore.delete(LeaseKeySchema.parse(lease));
    }
  });

  test("find by userEmail", async () => {
    let lease1 = generateSchemaData(LeaseSchema, {
      userEmail: "john.smith@example.com",
      meta: undefined,
    });
    let lease2 = generateSchemaData(LeaseSchema, {
      userEmail: "john.smith@example.com",
      meta: undefined,
    });
    let lease3 = generateSchemaData(LeaseSchema, { meta: undefined });

    try {
      lease1 = await leaseStore.create(lease1);
      lease2 = await leaseStore.create(lease2);
      lease3 = await leaseStore.create(lease3);

      await retryAsync(
        async () => {
          const fetchedLeases = (
            await leaseStore.findByUserEmail({
              userEmail: "john.smith@example.com",
            })
          ).result;

          expect(fetchedLeases).toContainEqual(lease1);
          expect(fetchedLeases).toContainEqual(lease2);
          expect(fetchedLeases).not.toContainEqual(lease3);
        },
        {
          delay: 200,
          maxTry: 10,
        },
      );
    } finally {
      await leaseStore.delete(LeaseKeySchema.parse(lease1));
      await leaseStore.delete(LeaseKeySchema.parse(lease2));
      await leaseStore.delete(LeaseKeySchema.parse(lease3));
    }
  });

  test("find by leaseTemplateUuid", async () => {
    const originalLeaseTemplateUuid = crypto.randomUUID();
    const originalLeaseTemplateName = "test";
    const leaseDurationInHours = 24;

    let lease1 = generateSchemaData(MonitoredLeaseSchema, {
      originalLeaseTemplateUuid,
      originalLeaseTemplateName,
      leaseDurationInHours,
      status: "Active",
      meta: undefined,
    });
    let lease2 = generateSchemaData(PendingLeaseSchema, {
      originalLeaseTemplateUuid,
      originalLeaseTemplateName,
      leaseDurationInHours,
      status: "PendingApproval",
      meta: undefined,
    });
    let lease3 = generateSchemaData(ExpiredLeaseSchema, {
      status: "Expired",
      meta: undefined,
    });

    try {
      lease1 = await leaseStore.create(lease1);
      lease2 = await leaseStore.create(lease2);
      lease3 = await leaseStore.create(lease3);

      await retryAsync(
        async () => {
          const fetchedLeases = (
            await leaseStore.findByLeaseTemplateUuid({
              status: "Active",
              uuid: originalLeaseTemplateUuid,
            })
          ).result;

          expect(fetchedLeases).toContainEqual(lease1);
          expect(fetchedLeases).not.toContainEqual(lease2);
          expect(fetchedLeases).not.toContainEqual(lease3);
        },
        {
          delay: 200,
          maxTry: 10,
        },
      );
    } finally {
      await leaseStore.delete(LeaseKeySchema.parse(lease1));
      await leaseStore.delete(LeaseKeySchema.parse(lease2));
      await leaseStore.delete(LeaseKeySchema.parse(lease3));
    }
  });

  test("findAll then delete", async () => {
    let lease1 = generateSchemaData(LeaseSchema, { meta: undefined });
    let lease2 = generateSchemaData(LeaseSchema, { meta: undefined });

    try {
      lease1 = await leaseStore.create(lease1);
      lease2 = await leaseStore.create(lease2);

      await retryAsync(
        async () => {
          const fetchedLeases = (await leaseStore.findAll({})).result;

          expect(fetchedLeases).toContainEqual(lease1);
          expect(fetchedLeases).toContainEqual(lease2);
        },
        {
          delay: 200,
          maxTry: 10,
        },
      );
    } finally {
      await leaseStore.delete(LeaseKeySchema.parse(lease1));
      await leaseStore.delete(LeaseKeySchema.parse(lease2));

      await retryAsync(
        async () => {
          const postDeleteLeases = await leaseStore.findAll({});

          expect(postDeleteLeases).not.toContainEqual(lease1);
          expect(postDeleteLeases).not.toContainEqual(lease2);
        },
        {
          delay: 200,
          maxTry: 10,
        },
      );
    }
  });

  test("finds return empty when none exist", async () => {
    await retryAsync(
      async () => {
        expect(
          (await leaseStore.findByUserEmail({ userEmail: "non-exist" })).result,
        ).toEqual([]);
        expect(
          (await leaseStore.findByStatus({ status: "BudgetExceeded" })).result,
        ).toEqual([]);
        expect(
          (
            await leaseStore.findByLeaseTemplateUuid({
              status: "Active",
              uuid: "non-exist",
            })
          ).result,
        ).toEqual([]);
      },
      { delay: 200, maxTry: 10 },
    );
  });
});
