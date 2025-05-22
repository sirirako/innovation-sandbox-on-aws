// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { retryAsync } from "ts-retry/lib/esm/index.js";
import { beforeAll, describe, expect, inject, test } from "vitest";

import { AppConfigGlobalConfigStore } from "@amzn/innovation-sandbox-commons/data/global-config/appconfig-global-config-store.js";
import { GlobalConfigStore } from "@amzn/innovation-sandbox-commons/data/global-config/global-config-store.js";
import { GlobalConfigSchema } from "@amzn/innovation-sandbox-commons/data/global-config/global-config.js";
import { generateSchemaData } from "@amzn/innovation-sandbox-commons/test/generate-schema-data.js";

let store: GlobalConfigStore;
beforeAll(async () => {
  const { appConfig } = inject("testConfiguration");
  store = new AppConfigGlobalConfigStore(appConfig);
});

describe("sandbox-account-store", () => {
  test("write then read global config", async () => {
    const oldConfig = await store.get();
    const newConfig = generateSchemaData(GlobalConfigSchema, {
      maintenanceMode: false,
    });

    await store.put(newConfig);
    await retryAsync(
      async () => {
        const fetchedConfig = await store.get();
        expect(fetchedConfig).toEqual(newConfig);
      },
      {
        delay: 1000,
        maxTry: 10,
      },
    );
    await store.put(oldConfig);
  });
});
