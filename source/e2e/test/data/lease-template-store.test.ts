// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { retryAsync } from "ts-retry/lib/esm/index.js";
import { beforeAll, describe, expect, inject, test } from "vitest";

import { LeaseTemplateStore } from "@amzn/innovation-sandbox-commons/data/lease-template/lease-template-store.js";
import {
  LeaseTemplate,
  LeaseTemplateSchema,
} from "@amzn/innovation-sandbox-commons/data/lease-template/lease-template.js";
import { IsbServices } from "@amzn/innovation-sandbox-commons/isb-services/index.js";
import { generateSchemaData } from "@amzn/innovation-sandbox-commons/test/generate-schema-data.js";

let leaseTemplateStore: LeaseTemplateStore;
beforeAll(async () => {
  leaseTemplateStore = IsbServices.leaseTemplateStore({
    LEASE_TEMPLATE_TABLE_NAME: inject("testConfiguration").leaseTemplateTable,
    USER_AGENT_EXTRA: "InnovationSandbox-E2E",
  });
});

describe("lease-template-store", () => {
  test("unable to update lease template that doesn't exist", async () => {
    await expect(async () => {
      await leaseTemplateStore.update(
        generateSchemaData(LeaseTemplateSchema, {
          meta: undefined,
          maxSpend: 50,
          leaseDurationInHours: 48,
        }),
      );
    }).rejects.toThrowError("Unknown LeaseTemplate.");
  });

  test("unable to create lease template that already exists", async () => {
    const leaseTemplate = generateSchemaData(LeaseTemplateSchema, {
      meta: undefined,
      maxSpend: 50,
      leaseDurationInHours: 48,
    });
    try {
      await leaseTemplateStore.create(leaseTemplate);
      await expect(async () => {
        await leaseTemplateStore.create(leaseTemplate);
      }).rejects.toThrowError("LeaseTemplate already exists.");
    } finally {
      await leaseTemplateStore.delete(leaseTemplate.uuid);
    }
  });

  test("lease template rollback detects concurrent modification", async () => {
    const leaseTemplate = await leaseTemplateStore.create(
      generateSchemaData(LeaseTemplateSchema, {
        maxSpend: 50,
        leaseDurationInHours: 48,
        meta: undefined,
      }),
    );
    try {
      leaseTemplate.maxSpend = 20;
      const transaction = leaseTemplateStore.transactionalUpdate(leaseTemplate);
      await transaction.complete();

      await leaseTemplateStore.update({
        ...leaseTemplate,
        maxSpend: 40,
      });
      await expect(async () => {
        await transaction.rollbackTransaction();
      }).rejects.toThrowError(
        "Transaction rollback failed: [ConcurrentDataModificationException: The lease template has been modified from the expected value.]",
      );
    } finally {
      await leaseTemplateStore.delete(leaseTemplate.uuid);
    }
  });

  test("create-read-delete of lease-template", async () => {
    const sampleLeaseTemplate: LeaseTemplate = await leaseTemplateStore.create(
      generateSchemaData(LeaseTemplateSchema, {
        meta: undefined,
        maxSpend: 50,
        leaseDurationInHours: 48,
      }),
    );

    await retryAsync(
      async () => {
        const fetchedLease = (
          await leaseTemplateStore.get(sampleLeaseTemplate.uuid)
        ).result;

        expect(fetchedLease).toEqual(sampleLeaseTemplate);
      },
      {
        delay: 200,
        maxTry: 10,
      },
    );

    await leaseTemplateStore.delete(sampleLeaseTemplate.uuid);
    await retryAsync(
      async () => {
        const fetchedLease2 = (
          await leaseTemplateStore.get(sampleLeaseTemplate.uuid)
        ).result;

        expect(fetchedLease2).toBeUndefined();
      },
      {
        delay: 200,
        maxTry: 10,
      },
    );
  });

  test("find lease-template by manager", async () => {
    const template1: LeaseTemplate = await leaseTemplateStore.create(
      generateSchemaData(LeaseTemplateSchema, {
        createdBy: "mangler-1@amazon.com",
        meta: undefined,
      }),
    );

    const template2: LeaseTemplate = await leaseTemplateStore.create(
      generateSchemaData(LeaseTemplateSchema, {
        createdBy: "mangler-2@amazon.com",
        meta: undefined,
      }),
    );

    // retry to mitigate issues with eventual consistency
    await retryAsync(
      async () => {
        const fetchedLease = (
          await leaseTemplateStore.findByManager({
            manager: template1.createdBy,
          })
        ).result[0];

        expect(fetchedLease).toEqual(template1);
        expect(fetchedLease).not.toEqual(template2);

        const fetchedLease2 = (
          await leaseTemplateStore.findByManager({
            manager: template2.createdBy,
          })
        ).result[0];

        expect(fetchedLease2).not.toEqual(template1);
        expect(fetchedLease2).toEqual(template2);
      },
      {
        delay: 200,
        maxTry: 10,
      },
    );

    await leaseTemplateStore.delete(template1.uuid);
    await leaseTemplateStore.delete(template2.uuid);
  });

  test("find-all lease-template returns many templates", async () => {
    const template1 = await leaseTemplateStore.create(
      generateSchemaData(LeaseTemplateSchema, {
        meta: undefined,
        maxSpend: 50,
        leaseDurationInHours: 24,
      }),
    );
    const template2 = await leaseTemplateStore.create(
      generateSchemaData(LeaseTemplateSchema, {
        meta: undefined,
        maxSpend: 20,
        leaseDurationInHours: 48,
      }),
    );

    // retry to mitigate issues with eventual consistency
    retryAsync(
      async () => {
        const fetchedLeases = (await leaseTemplateStore.findAll()).result;

        expect(fetchedLeases).toContainEqual(template1);
        expect(fetchedLeases).toContainEqual(template2);
      },
      {
        delay: 200,
        maxTry: 10,
      },
    );

    await leaseTemplateStore.delete(template1.uuid);
    await leaseTemplateStore.delete(template2.uuid);
  });
});
