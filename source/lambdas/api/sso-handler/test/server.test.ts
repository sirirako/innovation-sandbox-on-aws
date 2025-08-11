// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { getSSOConfig } from "@amzn/innovation-sandbox-sso-handler/config.js";
import * as server from "@amzn/innovation-sandbox-sso-handler/server.js";

vi.mock("@amzn/innovation-sandbox-sso-handler/config.js", () => {
  return {
    getSSOConfig: vi.fn().mockReturnValue({
      sessionDuration: "1hr",
      webAppUrl: "https://example.com",
      idpSignInUrl: "https://example.com/saml/assertion",
      idpSignOutUrl: "https://example.com/logout",
      idpAudience: "test-audience",
      callBackPathFromRoot: "/prod/auth/login/callback",
      loginPath: "/auth/login",
      logoutPath: "/auth/logout",
      loginStatusPath: "/auth/login/status",
      loginCallbackPath: "/auth/login/callback",
      idpCert: "PLACE_HOLDER_CERT",
      jwtSecret: "MY_JWT_SECRET",
    }),
  };
});

describe("SSO Server Tests", async () => {
  const config = await getSSOConfig({} as any);

  it("should redirect to the SSO login page from GET /auth/login", async () => {
    console.log("test started");
    const response = await request(server.app).get(config.loginPath);
    expect(response.status).toBe(302);
    expect(response.headers["location"]).toMatch(
      new RegExp("" + config.idpSignInUrl + "\\?SAMLRequest="),
    );
  });

  it("should return 403 when GET /auth/login/status is called without a token", async () => {
    const response = await request(server.app).get(config.loginStatusPath);
    expect(response.status).toBe(200);
    expect(response.text).toBe(
      '{"authenticated":false,"message":"No token provided"}',
    );
  });

  it("should return 403 when GET /auth/login/status is called with an invalid token", async () => {
    const response = await request(server.app)
      .get(config.loginStatusPath)
      .set("Authorization", "Bearer SOME_TOKEN");
    expect(response.status).toBe(200);
    expect(response.text).toBe(
      '{"authenticated":false,"message":"Invalid token"}',
    );
  });

  it("cors should be enabled for OPTIONS /auth/login/status", async () => {
    const response = await request(server.app).options(config.loginStatusPath);
    expect(response.status).toBe(204);
  });

  it("should return 302 when POST /auth/login/callback ", async () => {
    const response = await request(server.app).post(config.loginCallbackPath);
    expect(response.status).toBe(302);
    expect(response.headers["location"]).toMatch(
      new RegExp("" + config.idpSignInUrl + "\\?SAMLRequest="),
    );
  });

  it("should return 302 for GET /auth/logout", async () => {
    const response = await request(server.app).get(config.logoutPath);
    expect(response.status).toBe(302);
    expect(response.headers["location"]).toEqual(config.idpSignOutUrl);
  });

  // any other route should return 403
  it("should return 403 for OPTION /", async () => {
    const response = await request(server.app).get("/");
    expect(response.status).toBe(403);
    expect(response.text).toBe('{"message":"Missing Authentication Token"}');
  });

  it("should return 403 for GET /abc", async () => {
    const response = await request(server.app).get("/");
    expect(response.status).toBe(403);
    expect(response.text).toBe('{"message":"Missing Authentication Token"}');
  });
});
