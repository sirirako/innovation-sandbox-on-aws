// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { beforeAll, describe, expect, inject, it } from "vitest";

import { SandboxAccountStore } from "@amzn/innovation-sandbox-commons/data/sandbox-account/sandbox-account-store.js";
import { SandboxAccountSchema } from "@amzn/innovation-sandbox-commons/data/sandbox-account/sandbox-account.js";
import { IsbServices } from "@amzn/innovation-sandbox-commons/isb-services/index.js";
import { generateSchemaData } from "@amzn/innovation-sandbox-commons/test/generate-schema-data.js";
import {
  getSignedJwt,
  userAgentHeader,
} from "@amzn/innovation-sandbox-e2e/test/utils/fixtures.js";

let apiBaseUrl: string;
let sandboxAccountStore: SandboxAccountStore;
let token: string;

beforeAll(async () => {
  const { applicationUrl, sandboxAccountTable, jwtSecret } =
    inject("testConfiguration");
  apiBaseUrl = `${applicationUrl}/api`;
  sandboxAccountStore = IsbServices.sandboxAccountStore({
    ACCOUNT_TABLE_NAME: sandboxAccountTable,
    USER_AGENT_EXTRA: "InnovationSandbox-E2E",
  });
  token = getSignedJwt(jwtSecret);
});

describe("accounts api", () => {
  describe("authorization", () => {
    it("should return 401 when bearer token is not provided", async () => {
      const response = await fetch(`${apiBaseUrl}/accounts`, {
        method: "GET",
        headers: {
          // No Authorization header containing bearer token present
          "User-Agent": userAgentHeader,
        },
      });

      const jsonResponseBody: any = await response.json();

      expect(response.status).toBe(401);
      expect(jsonResponseBody).toEqual({
        message: "Unauthorized",
      });
    });
  });

  it("should return 200 and get accounts", async () => {
    const sandboxAccount = generateSchemaData(
      SandboxAccountSchema.omit({ meta: true }),
    );
    const sandboxAccountStoreResponse =
      await sandboxAccountStore.put(sandboxAccount);

    const response = await fetch(`${apiBaseUrl}/accounts`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": userAgentHeader,
      },
    });

    const jsonResponseBody: any = await response.json();

    expect(response.status).toBe(200);
    expect(jsonResponseBody.data.result).toEqual(
      expect.arrayContaining([
        expect.objectContaining(sandboxAccountStoreResponse.newItem),
      ]),
    );

    await sandboxAccountStore.delete(sandboxAccount.awsAccountId);
  });

  it("should return 200 and get sandbox account by id", async () => {
    const sandboxAccount = generateSchemaData(
      SandboxAccountSchema.omit({ meta: true }),
    );
    const sandboxAccountStoreResponse =
      await sandboxAccountStore.put(sandboxAccount);

    const response = await fetch(
      `${apiBaseUrl}/accounts/${sandboxAccount.awsAccountId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": userAgentHeader,
        },
      },
    );

    const jsonResponseBody: any = await response.json();

    expect(response.status).toBe(200);
    expect(jsonResponseBody.data).toMatchObject(
      sandboxAccountStoreResponse.newItem,
    );

    await sandboxAccountStore.delete(sandboxAccount.awsAccountId);
  });
});
