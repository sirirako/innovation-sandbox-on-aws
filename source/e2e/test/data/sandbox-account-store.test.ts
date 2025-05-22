// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { retryAsync } from "ts-retry/lib/esm/index.js";
import { beforeAll, describe, expect, inject, test } from "vitest";

import { SandboxAccountStore } from "@amzn/innovation-sandbox-commons/data/sandbox-account/sandbox-account-store.js";
import { SandboxAccountSchema } from "@amzn/innovation-sandbox-commons/data/sandbox-account/sandbox-account.js";
import { IsbServices } from "@amzn/innovation-sandbox-commons/isb-services/index.js";
import { generateSchemaData } from "@amzn/innovation-sandbox-commons/test/generate-schema-data.js";

let store: SandboxAccountStore;
beforeAll(async () => {
  store = IsbServices.sandboxAccountStore({
    ACCOUNT_TABLE_NAME: inject("testConfiguration").sandboxAccountTable,
    USER_AGENT_EXTRA: "InnovationSandbox-E2E",
  });
});

describe("sandbox-account-store", () => {
  test("create-read-delete of sandbox-account", async () => {
    let sampleSandboxAccount = generateSchemaData(SandboxAccountSchema, {
      meta: undefined,
    });

    try {
      sampleSandboxAccount = (await store.put(sampleSandboxAccount)).newItem;

      await retryAsync(
        async () => {
          const fetchedAccount = (
            await store.get(sampleSandboxAccount.awsAccountId)
          ).result;

          expect(fetchedAccount).toEqual(sampleSandboxAccount);
        },
        {
          delay: 200,
          maxTry: 10,
        },
      );
    } finally {
      await store.delete(sampleSandboxAccount.awsAccountId);

      await retryAsync(
        async () => {
          const fetchedAccount2 = (
            await store.get(sampleSandboxAccount.awsAccountId)
          ).result;

          expect(fetchedAccount2).toBeUndefined();
        },
        {
          delay: 200,
          maxTry: 10,
        },
      );
    }
  });

  test("find-all sandbox accounts", async () => {
    let sampleSandboxAccount1 = generateSchemaData(SandboxAccountSchema, {
      meta: undefined,
    });
    let sampleSandboxAccount2 = generateSchemaData(SandboxAccountSchema, {
      meta: undefined,
    });

    try {
      sampleSandboxAccount1 = (await store.put(sampleSandboxAccount1)).newItem;
      sampleSandboxAccount2 = (await store.put(sampleSandboxAccount2)).newItem;

      await retryAsync(
        async () => {
          const fetchedAccounts = (await store.findAll({})).result;

          expect(fetchedAccounts).toContainEqual(sampleSandboxAccount1);
          expect(fetchedAccounts).toContainEqual(sampleSandboxAccount2);
        },
        {
          delay: 200,
          maxTry: 10,
        },
      );
    } finally {
      await store.delete(sampleSandboxAccount1.awsAccountId);
      await store.delete(sampleSandboxAccount2.awsAccountId);
    }
  });

  test("find sandbox accounts by status", async () => {
    let availableAccount = generateSchemaData(SandboxAccountSchema, {
      meta: undefined,
      status: "Available",
    });
    let quarantinedAccount = generateSchemaData(SandboxAccountSchema, {
      meta: undefined,
      status: "Quarantine",
    });

    try {
      availableAccount = (await store.put(availableAccount)).newItem;
      quarantinedAccount = (await store.put(quarantinedAccount)).newItem;

      await retryAsync(
        async () => {
          const availableAccounts = (
            await store.findByStatus({ status: "Available" })
          ).result;
          const quarantinedAccounts = (
            await store.findByStatus({ status: "Quarantine" })
          ).result;

          expect(availableAccounts).toContainEqual(availableAccount);
          expect(quarantinedAccounts).toContainEqual(quarantinedAccount);

          expect(availableAccounts).not.toContainEqual(quarantinedAccount);
          expect(quarantinedAccounts).not.toContainEqual(availableAccount);
        },
        {
          delay: 200,
          maxTry: 10,
        },
      );
    } finally {
      await store.delete(availableAccount.awsAccountId);
      await store.delete(quarantinedAccount.awsAccountId);
    }
  });
});
