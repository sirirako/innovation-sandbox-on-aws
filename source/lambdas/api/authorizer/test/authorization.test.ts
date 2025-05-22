// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { Logger } from "@aws-lambda-powertools/logger";
import { Tracer } from "@aws-lambda-powertools/tracer";
import jwt from "jsonwebtoken";
import { describe, expect, it, vi } from "vitest";

import {
  extractMethodAndPathFromArn,
  extractMethodAndPathFromArnWithPathParameterEnd,
  extractMethodAndPathFromArnWithPathParameterMiddle,
  isAuthorized,
} from "@amzn/innovation-sandbox-authorizer/authorization.js";
import { AuthorizerLambdaEnvironmentSchema } from "@amzn/innovation-sandbox-commons/lambda/environments/authorizer-lambda-environment.js";
import { IsbSecretsManagerClient } from "@amzn/innovation-sandbox-commons/sdk-clients/secrets-manager-client.js";
import { generateSchemaData } from "@amzn/innovation-sandbox-commons/test/generate-schema-data.js";
import { IsbUser } from "@amzn/innovation-sandbox-commons/types/isb-types.js";

const testEnv = generateSchemaData(AuthorizerLambdaEnvironmentSchema);
const testContext = {
  logger: new Logger(),
  tracer: new Tracer(),
  env: testEnv,
};

vi.mock(
  "@amzn/innovation-sandbox-authorizer/authorization-map.js",
  async () => {
    return {
      ...(await vi.importActual(
        "@amzn/innovation-sandbox-authorizer/authorization-map.js",
      )),
      authorizationMap: {
        "/leases": {
          GET: ["Manager", "Admin"],
          POST: ["Manager", "Admin"],
        },
        "/leases/{param}": {
          GET: ["User", "Manager", "Admin"],
        },
        "/leaseTemplates": {
          GET: ["Manager", "Admin"],
          POST: ["Admin"],
        },
        "/leaseTemplates/{param}": {
          PUT: ["Admin"],
          GET: ["Manager", "Admin"],
        },
        "/configurations": {
          ALL: ["Admin"],
        },
        "/accounts/{param}/eject": {
          POST: ["Admin"],
        },
      },
    };
  },
);

describe("authorization", () => {
  const methodArnPrefix =
    "arn:aws:execute-api:us-east-1:123456789012:aaaaaaaaaa/prod";
  const jwtSecret = "testJwtSecret";
  vi.spyOn(
    IsbSecretsManagerClient.prototype,
    "getStringSecret",
  ).mockReturnValue(Promise.resolve(jwtSecret));
  const testUserBase: IsbUser = {
    userId: "testUserId",
    email: "test@example.com",
    roles: [],
  };

  it("extract method and path from method ARN", () => {
    let result = extractMethodAndPathFromArn(methodArnPrefix + "/GET/leases");
    expect(result).toEqual({
      method: "GET",
      path: "/leases",
    });

    result = extractMethodAndPathFromArn(methodArnPrefix + "/GET/leases/");
    expect(result).toEqual({
      method: "GET",
      path: "/leases",
    });

    result = extractMethodAndPathFromArn(methodArnPrefix + "/POST/v2/leases");
    expect(result).toEqual({
      method: "POST",
      path: "/v2/leases",
    });

    result = extractMethodAndPathFromArn("Invalid value");
    expect(result).toBeNull();

    result = extractMethodAndPathFromArn(methodArnPrefix + "/GET/");
    expect(result).toBeNull();
  });

  it("extract method and path from method ARN with path parameter at the end", () => {
    let result = extractMethodAndPathFromArnWithPathParameterEnd(
      methodArnPrefix + "/PUT/leases/Lease101",
    );
    expect(result).toEqual({
      method: "PUT",
      path: "/leases/{param}",
    });
    result = extractMethodAndPathFromArnWithPathParameterEnd(
      methodArnPrefix + "/GET/v2/leases/Lease101",
    );
    expect(result).toEqual({
      method: "GET",
      path: "/v2/leases/{param}",
    });
    result = extractMethodAndPathFromArnWithPathParameterEnd(
      methodArnPrefix + "/GET/v2/accounts/1234/eject",
    );
    expect(result).toEqual({
      method: "GET",
      path: "/v2/accounts/1234/{param}",
    });
    result = extractMethodAndPathFromArnWithPathParameterEnd(
      methodArnPrefix + "/PUT/leases",
    );
    expect(result).toBeNull();
  });

  it("extract method and path from method ARN with path parameter in the middle", () => {
    let result = extractMethodAndPathFromArnWithPathParameterMiddle(
      methodArnPrefix + "/POST/accounts/1234/recyle",
    );
    expect(result).toEqual({
      method: "POST",
      path: "/accounts/{param}/recyle",
    });
    result = extractMethodAndPathFromArnWithPathParameterMiddle(
      methodArnPrefix + "/POST/V2/accounts/1234/recyle",
    );
    expect(result).toEqual({
      method: "POST",
      path: "/V2/accounts/{param}/recyle",
    });
    result = extractMethodAndPathFromArnWithPathParameterMiddle(
      methodArnPrefix + "/PUT/accounts",
    );
    expect(result).toBeNull();
  });

  it("should authorize GET /leases for Admin", async () => {
    const methodArn = methodArnPrefix + "/GET/leases";
    const testUser: IsbUser = {
      ...testUserBase,
      roles: ["Admin", "User"],
    };
    const authorizationToken = jwt.sign({ user: testUser }, jwtSecret);
    expect(
      await isAuthorized({ methodArn, authorizationToken }, testContext),
    ).toEqual(true);
  });

  it("should not authorize POST /leases for User", async () => {
    const methodArn = methodArnPrefix + "/GET/leases";
    const testUser: IsbUser = {
      ...testUserBase,
    };
    const authorizationToken = jwt.sign({ user: testUser }, jwtSecret);
    expect(
      await isAuthorized({ methodArn, authorizationToken }, testContext),
    ).toEqual(false);
  });

  it("should authorize GET /configurations for Admin", async () => {
    const methodArn = methodArnPrefix + "/GET/configurations";
    const testUser: IsbUser = {
      ...testUserBase,
      roles: ["Admin"],
    };
    const authorizationToken = jwt.sign({ user: testUser }, jwtSecret);
    expect(
      await isAuthorized({ methodArn, authorizationToken }, testContext),
    ).toEqual(true);
  });

  it("should not authorize GET /configurations for Manager / User", async () => {
    const methodArn = methodArnPrefix + "/GET/configurations";
    const testUser: IsbUser = {
      ...testUserBase,
      roles: ["Manager", "User"],
    };
    const authorizationToken = jwt.sign({ user: testUser }, jwtSecret);
    expect(
      await isAuthorized({ methodArn, authorizationToken }, testContext),
    ).toEqual(false);
  });

  it("should authorize GET /leases/{param} for User", async () => {
    const methodArn = methodArnPrefix + "/GET/leases/Lease101";
    const testUser: IsbUser = {
      ...testUserBase,
      roles: ["Admin"],
    };
    const authorizationToken = jwt.sign({ user: testUser }, jwtSecret);
    expect(
      await isAuthorized({ methodArn, authorizationToken }, testContext),
    ).toEqual(true);
  });

  it("should not authorize PUT /leases/{param} for User, Manager, Admin", async () => {
    const methodArn = methodArnPrefix + "/PUT/leases/Lease101";
    const testUser: IsbUser = {
      ...testUserBase,
      roles: ["User", "Manager", "Admin"],
    };
    const authorizationToken = jwt.sign({ user: testUser }, jwtSecret);
    expect(
      await isAuthorized({ methodArn, authorizationToken }, testContext),
    ).toEqual(false);
  });

  it("should authorize GET /leaseTemplates/{param} for Manager", async () => {
    const methodArn = methodArnPrefix + "/GET/leaseTemplates/Lease101";
    const testUser: IsbUser = {
      ...testUserBase,
      roles: ["Manager"],
    };
    const authorizationToken = jwt.sign({ user: testUser }, jwtSecret);
    expect(
      await isAuthorized({ methodArn, authorizationToken }, testContext),
    ).toEqual(true);
  });

  it("should not authorize PUT /leaseTemplates/{param} for User, Manager", async () => {
    const methodArn = methodArnPrefix + "/PUT/leaseTemplates/Lease101";
    const testUser: IsbUser = {
      ...testUserBase,
      roles: ["User", "Manager"],
    };
    const authorizationToken = jwt.sign({ user: testUser }, jwtSecret);
    expect(
      await isAuthorized({ methodArn, authorizationToken }, testContext),
    ).toEqual(false);
  });

  it("should authorize POST /accounts/{param}/eject for Admin", async () => {
    const methodArn = methodArnPrefix + "/POST/accounts/123456789012/eject";
    const testUser: IsbUser = {
      ...testUserBase,
      roles: ["Admin"],
    };
    const authorizationToken = jwt.sign({ user: testUser }, jwtSecret);
    expect(
      await isAuthorized({ methodArn, authorizationToken }, testContext),
    ).toEqual(true);
  });

  it("should not authorize PUT /accounts/{param}/eject for Admin", async () => {
    const methodArn = methodArnPrefix + "/PUT/accounts/123456789012/eject";
    const testUser: IsbUser = {
      ...testUserBase,
      roles: ["Admin"],
    };
    const authorizationToken = jwt.sign({ user: testUser }, jwtSecret);
    expect(
      await isAuthorized({ methodArn, authorizationToken }, testContext),
    ).toEqual(false);
  });

  it("should not authorize POST /accounts/{param}/eject for Manager", async () => {
    const methodArn = methodArnPrefix + "/POST/accounts/123456789012/eject";
    const testUser: IsbUser = {
      ...testUserBase,
      roles: ["Manager"],
    };
    const authorizationToken = jwt.sign({ user: testUser }, jwtSecret);
    expect(
      await isAuthorized({ methodArn, authorizationToken }, testContext),
    ).toEqual(false);
  });

  it("should not authorize if token is invalid", async () => {
    const methodArn = methodArnPrefix + "/GET/leases";
    const authorizationToken = "invalid token";
    expect(
      await isAuthorized({ methodArn, authorizationToken }, testContext),
    ).toEqual(false);
  });
});
