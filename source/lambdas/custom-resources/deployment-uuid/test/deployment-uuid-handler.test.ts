// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import type { CdkCustomResourceEvent } from "aws-lambda";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DeploymentUuidLambdaEnvironmentSchema } from "@amzn/innovation-sandbox-commons/lambda/environments/deployment-uuid-lambda-environment.js";
import { EnvironmentValidatorError } from "@amzn/innovation-sandbox-commons/lambda/middleware/environment-validator.js";
import { generateSchemaData } from "@amzn/innovation-sandbox-commons/test/generate-schema-data.js";
import { mockContext } from "@amzn/innovation-sandbox-commons/test/lambdas/fixtures.js";
import { bulkStubEnv } from "@amzn/innovation-sandbox-commons/test/lambdas/utils.js";
import { handler } from "@amzn/innovation-sandbox-deployment-uuid/deployment-uuid-handler.js";

const testEnv = generateSchemaData(DeploymentUuidLambdaEnvironmentSchema);

beforeEach(() => {
  bulkStubEnv(testEnv);
  vi.resetAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("handler", () => {
  it("should throw error when environment variables are misconfigured", async () => {
    const event: CdkCustomResourceEvent = {
      LogicalResourceId: "LogicalResourceId",
      RequestId: "RequestId",
      RequestType: "Create",
      ResourceProperties: { ServiceToken: "ServiceToken" },
      ResourceType: "Custom::DeploymentUUID",
      ResponseURL: "ResponseURL",
      ServiceToken: "ServiceToken",
      StackId: "StackId",
    };

    vi.unstubAllEnvs();

    await expect(handler(event, mockContext(testEnv))).rejects.toThrow(
      EnvironmentValidatorError,
    );
  });

  it("should return new UUID on create event", async () => {
    const event: CdkCustomResourceEvent = {
      LogicalResourceId: "LogicalResourceId",
      RequestId: "RequestId",
      RequestType: "Create",
      ResourceProperties: { ServiceToken: "ServiceToken" },
      ResourceType: "Custom::DeploymentUUID",
      ResponseURL: "ResponseURL",
      ServiceToken: "ServiceToken",
      StackId: "StackId",
    };

    const uuidRegex =
      /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/;

    expect(await handler(event, mockContext(testEnv))).toMatchObject({
      PhysicalResourceId: expect.stringMatching(uuidRegex),
      Data: {
        DeploymentUUID: expect.stringMatching(uuidRegex),
      },
    });
  });

  it("should return physicalID as UUID on update event", async () => {
    const event: CdkCustomResourceEvent = {
      LogicalResourceId: "LogicalResourceId",
      OldResourceProperties: { ServiceToken: "ServiceToken" },
      PhysicalResourceId: "PhysicalResourceId",
      RequestId: "RequestId",
      RequestType: "Update",
      ResourceProperties: { ServiceToken: "ServiceToken" },
      ResourceType: "Custom::DeploymentUUID",
      ResponseURL: "ResponseURL",
      ServiceToken: "ServiceToken",
      StackId: "StackId",
    };
    expect(await handler(event, mockContext(testEnv))).toEqual({
      PhysicalResourceId: "PhysicalResourceId",
      Data: {
        DeploymentUUID: "PhysicalResourceId",
      },
    });
  });

  it("should return physicalID as UUID on delete event", async () => {
    const event: CdkCustomResourceEvent = {
      LogicalResourceId: "LogicalResourceId",
      RequestId: "RequestId",
      RequestType: "Delete",
      ResourceProperties: { ServiceToken: "ServiceToken" },
      ResourceType: "Custom::DeploymentUUID",
      ResponseURL: "ResponseURL",
      ServiceToken: "ServiceToken",
      StackId: "StackId",
      PhysicalResourceId: "PhysicalResourceId",
    };
    expect(await handler(event, mockContext(testEnv))).toEqual({
      PhysicalResourceId: "PhysicalResourceId",
      Data: {
        DeploymentUUID: "PhysicalResourceId",
      },
    });
  });
});
