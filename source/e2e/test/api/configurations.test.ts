// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { beforeAll, describe, expect, inject, it } from "vitest";

import { GlobalConfigForUISchema } from "@amzn/innovation-sandbox-commons/data/global-config/global-config.js";
import {
  getSignedJwt,
  userAgentHeader,
} from "@amzn/innovation-sandbox-e2e/test/utils/fixtures.js";

let apiBaseUrl: string;
let token: string;

beforeAll(async () => {
  const { applicationUrl, jwtSecret } = inject("testConfiguration");
  apiBaseUrl = `${applicationUrl}/api`;
  token = getSignedJwt(jwtSecret);
});

describe("configurations api", () => {
  describe("authorization", () => {
    it("should return 401 when bearer token is not provided", async () => {
      const response = await fetch(`${apiBaseUrl}/configurations`, {
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

  it("should return 200 and get global configurations", async () => {
    const response = await fetch(`${apiBaseUrl}/configurations`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": userAgentHeader,
      },
    });

    const jsonResponseBody: any = await response.json();

    expect(response.status).toBe(200);
    expect(
      GlobalConfigForUISchema.safeParse(jsonResponseBody.data).success,
    ).toBe(true);
  });
});
