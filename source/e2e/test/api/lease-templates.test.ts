// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { beforeAll, describe, expect, inject, it } from "vitest";

import { LeaseTemplateStore } from "@amzn/innovation-sandbox-commons/data/lease-template/lease-template-store.js";
import {
  LeaseTemplate,
  LeaseTemplateSchema,
} from "@amzn/innovation-sandbox-commons/data/lease-template/lease-template.js";
import { IsbServices } from "@amzn/innovation-sandbox-commons/isb-services/index.js";
import { generateSchemaData } from "@amzn/innovation-sandbox-commons/test/generate-schema-data.js";
import {
  getSignedJwt,
  userAgentHeader,
} from "@amzn/innovation-sandbox-e2e/test/utils/fixtures.js";

let apiBaseUrl: string;
let leaseTemplateStore: LeaseTemplateStore;
let token: string;

beforeAll(async () => {
  const { applicationUrl, leaseTemplateTable, jwtSecret } =
    inject("testConfiguration");
  apiBaseUrl = `${applicationUrl}/api`;

  leaseTemplateStore = IsbServices.leaseTemplateStore({
    LEASE_TEMPLATE_TABLE_NAME: leaseTemplateTable,
    USER_AGENT_EXTRA: "InnovationSandbox-E2E",
  });
  token = getSignedJwt(jwtSecret);
});

describe("lease templates api", () => {
  describe("authorization", () => {
    it("should return 401 when bearer token is not provided", async () => {
      const response = await fetch(`${apiBaseUrl}/leaseTemplates`, {
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

  it("should return 404 when attempting to put a lease template that does not exist", async () => {
    const leaseTemplate = generateSchemaData(
      LeaseTemplateSchema.omit({ meta: true }),
      {
        maxSpend: 50,
        leaseDurationInHours: 24,
      },
    );

    const uuid = leaseTemplate.uuid;
    // @ts-expect-error: TS2790
    delete leaseTemplate.uuid; //don't include uuid in put request

    const response = await fetch(`${apiBaseUrl}/leaseTemplates/${uuid}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "User-Agent": userAgentHeader,
      },
      body: JSON.stringify(leaseTemplate),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      data: {
        errors: [
          {
            message: "Lease Template not found.",
          },
        ],
      },
      status: "fail",
    });
  });

  it("should return 200 and get lease templates", async () => {
    const leaseTemplate = await leaseTemplateStore.create(
      generateSchemaData(LeaseTemplateSchema.omit({ meta: true })),
    );

    const response = await fetch(`${apiBaseUrl}/leaseTemplates`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": userAgentHeader,
      },
    });

    const jsonResponseBody: any = await response.json();

    expect(response.status).toBe(200);
    expect(jsonResponseBody.data.result).toEqual(
      expect.arrayContaining([expect.objectContaining(leaseTemplate)]),
    );

    await leaseTemplateStore.delete(leaseTemplate.uuid);
  });

  it("should return 201 and create lease template", async () => {
    const leaseTemplate = generateSchemaData(
      LeaseTemplateSchema.omit({ uuid: true, createdBy: true, meta: true }),
      { maxSpend: 50, leaseDurationInHours: 24 },
    );

    const response = await fetch(`${apiBaseUrl}/leaseTemplates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "User-Agent": userAgentHeader,
      },
      body: JSON.stringify(leaseTemplate),
    });

    const jsonResponseBody: any = await response.json();

    expect(response.status).toBe(201);
    expect(jsonResponseBody.data).toMatchObject(leaseTemplate);

    await leaseTemplateStore.delete(jsonResponseBody.data.uuid);
  });

  it("should return 200 and get lease template by id", async () => {
    const leaseTemplate = await leaseTemplateStore.create(
      generateSchemaData(LeaseTemplateSchema.omit({ meta: true })),
    );

    const response = await fetch(
      `${apiBaseUrl}/leaseTemplates/${leaseTemplate.uuid}`,
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
    expect(jsonResponseBody.data).toMatchObject(leaseTemplate);

    await leaseTemplateStore.delete(leaseTemplate.uuid);
  });

  it("should return 200 and should update lease template by id", async () => {
    const leaseTemplate = await leaseTemplateStore.create(
      generateSchemaData(LeaseTemplateSchema.omit({ meta: true }), {
        maxSpend: 50,
        leaseDurationInHours: 24,
      }),
    );

    const updatedTemplate: LeaseTemplate = {
      ...leaseTemplate,
      name: "UpdatedLeaseTemplate",
    };

    // @ts-expect-error: TS2790
    delete updatedTemplate.uuid; //don't include uuid in put request
    delete updatedTemplate.meta; //ignore meta in test comparisons

    const response = await fetch(
      `${apiBaseUrl}/leaseTemplates/${leaseTemplate.uuid}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "User-Agent": userAgentHeader,
        },
        body: JSON.stringify(updatedTemplate),
      },
    );

    const jsonResponseBody: any = await response.json();

    expect(response.status).toBe(200);
    expect(jsonResponseBody.data).toMatchObject(updatedTemplate);

    const fetchResponse = await leaseTemplateStore.get(leaseTemplate.uuid);
    const fetchedTemplate: LeaseTemplate = fetchResponse.result!;

    expect(fetchedTemplate).toMatchObject(updatedTemplate);

    await leaseTemplateStore.delete(leaseTemplate.uuid);
  });

  it("should return 200 and delete lease template by id", async () => {
    const leaseTemplate = await leaseTemplateStore.create(
      generateSchemaData(LeaseTemplateSchema.omit({ meta: true })),
    );

    const response = await fetch(
      `${apiBaseUrl}/leaseTemplates/${leaseTemplate.uuid}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": userAgentHeader,
        },
      },
    );

    expect(response.status).toBe(200);
    expect(await leaseTemplateStore.get(leaseTemplate.uuid)).toMatchObject({
      result: undefined,
    });
  });
});
