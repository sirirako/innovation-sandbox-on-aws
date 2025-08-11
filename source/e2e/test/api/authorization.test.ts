// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import jwt from "jsonwebtoken";
import { beforeAll, describe, expect, inject, it } from "vitest";

import {
  testIsbUser,
  userAgentHeader,
} from "@amzn/innovation-sandbox-e2e/test/utils/fixtures.js";

let testUrl: string;
let validToken: string;
let validJwtSecret: string;

beforeAll(async () => {
  const { applicationUrl, jwtSecret } = inject("testConfiguration");
  testUrl = `${applicationUrl}/api/leaseTemplates`;
  validJwtSecret = jwtSecret;
  validToken = jwt.sign({ user: testIsbUser }, validJwtSecret);
});

describe("authorization", () => {
  it("should return 401 when bearer token is not provided", async () => {
    const response = await fetch(testUrl, {
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

  it("should return 403 when an incorrectly encoded bearer token is provided", async () => {
    const response = await fetch(testUrl, {
      method: "GET",
      headers: {
        Authorization: "Bearer invalid.auth.token",
        "User-Agent": userAgentHeader,
      },
    });
    const jsonResponseBody: any = await response.json();
    expect(response.status).toBe(403);
    expect(jsonResponseBody).toEqual({
      Message:
        "User is not authorized to access this resource with an explicit deny",
    });
  });

  it("should return 403 when an invalid bearer token is provided", async () => {
    const invalidToken = jwt.sign({ user: testIsbUser }, "Invalid Secret");
    const response = await fetch(testUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${invalidToken}`,
        "User-Agent": userAgentHeader,
      },
    });
    const jsonResponseBody: any = await response.json();
    expect(response.status).toBe(403);
    expect(jsonResponseBody).toEqual({
      Message:
        "User is not authorized to access this resource with an explicit deny",
    });
  });

  it("should return 200 when a valid bearer token is provided", async () => {
    const response = await fetch(testUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${validToken}`,
        "User-Agent": userAgentHeader,
      },
    });
    const jsonResponseBody: any = await response.json();
    expect(response.status).toBe(200);
    expect(jsonResponseBody).toEqual(
      expect.objectContaining({
        status: "success",
      }),
    );
  });

  it("should return 403 when an expired bearer token is provided", async () => {
    const isbUser = {
      email: "test@example.com",
      userId: "testUserId",
      roles: ["Admin", "Manager", "User"],
    };
    const token = jwt.sign({ user: isbUser }, validJwtSecret, {
      expiresIn: "0.1ms",
    });
    const response = await fetch(testUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": userAgentHeader,
      },
    });
    const jsonResponseBody: any = await response.json();
    expect(response.status).toBe(403);
    expect(jsonResponseBody).toEqual(
      expect.objectContaining({
        Message:
          "User is not authorized to access this resource with an explicit deny",
      }),
    );
  });
});
