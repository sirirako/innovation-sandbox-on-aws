// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import type { CdkCustomResourceEvent } from "aws-lambda";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { IdcService } from "@amzn/innovation-sandbox-commons/isb-services/idc-service.js";
import { IdcConfigurerLambdaEnvironmentSchema } from "@amzn/innovation-sandbox-commons/lambda/environments/idc-configurer-lambda-environment.js";
import { EnvironmentValidatorError } from "@amzn/innovation-sandbox-commons/lambda/middleware/environment-validator.js";
import { generateSchemaData } from "@amzn/innovation-sandbox-commons/test/generate-schema-data.js";
import { mockContext } from "@amzn/innovation-sandbox-commons/test/lambdas/fixtures.js";
import { bulkStubEnv } from "@amzn/innovation-sandbox-commons/test/lambdas/utils.js";
import { handler } from "@amzn/innovation-sandbox-idc-configurer/idc-configurer-handler.js";

const testEnv = generateSchemaData(IdcConfigurerLambdaEnvironmentSchema);

beforeEach(() => {
  bulkStubEnv(testEnv);
  vi.resetAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Lambda Handler", () => {
  it("should throw error when environment variables are misconfigured", async () => {
    const event: CdkCustomResourceEvent = {
      RequestType: "Create",
      ServiceToken:
        "arn:aws:lambda:us-east-1:111111111111:function:CustomResourceProvider1",
      ResponseURL: "https://example.com",
      StackId: "Stack1",
      RequestId: "Request1",
      LogicalResourceId: "IdcConfigurerIDCCustomResourceAAAAAA",
      ResourceType: "Custom::IdcConfigurer",
      ResourceProperties: {
        ServiceToken:
          "arn:aws:lambda:us-east-1:111111111111:function:CustomResourceProvider1",
      },
    };
    vi.spyOn(IdcService.prototype, "createIsbGroups").mockReturnValue(
      Promise.resolve(),
    );
    vi.spyOn(IdcService.prototype, "createIsbPermissionSets").mockReturnValue(
      Promise.resolve(),
    );

    vi.unstubAllEnvs();

    await expect(handler(event, mockContext(testEnv))).rejects.toThrow(
      EnvironmentValidatorError,
    );
  });

  it("should call the ISB groups create method on on create event", async () => {
    const event: CdkCustomResourceEvent = {
      RequestType: "Create",
      ServiceToken:
        "arn:aws:lambda:us-east-1:111111111111:function:CustomResourceProvider1",
      ResponseURL: "https://example.com",
      StackId: "Stack1",
      RequestId: "Request1",
      LogicalResourceId: "IdcConfigurerIDCCustomResourceAAAAAA",
      ResourceType: "Custom::IdcConfigurer",
      ResourceProperties: {
        ServiceToken:
          "arn:aws:lambda:us-east-1:111111111111:function:CustomResourceProvider1",
      },
    };
    vi.spyOn(IdcService.prototype, "createIsbGroups").mockReturnValue(
      Promise.resolve(),
    );
    vi.spyOn(IdcService.prototype, "createIsbPermissionSets").mockReturnValue(
      Promise.resolve(),
    );
    expect(handler(event, mockContext(testEnv))).resolves.toEqual({
      Data: {
        status: "IDC groups and permission sets created / updated",
      },
    });
  });
  it("should call the ISB groups create method on on update event", async () => {
    const event: CdkCustomResourceEvent = {
      RequestType: "Update",
      ServiceToken:
        "arn:aws:lambda:us-east-1:111111111111:function:CustomResourceProvider1",
      ResponseURL: "https://example.com",
      StackId: "Stack1",
      RequestId: "Request1",
      LogicalResourceId: "IdcConfigurerIDCCustomResourceAAAAAA",
      ResourceType: "Custom::IdcConfigurer",
      ResourceProperties: {
        ServiceToken:
          "arn:aws:lambda:us-east-1:111111111111:function:CustomResourceProvider1",
      },
      PhysicalResourceId: "Resource1",
      OldResourceProperties: {
        ServiceToken:
          "arn:aws:lambda:us-east-1:111111111111:function:CustomResourceProvider1",
      },
    };
    vi.spyOn(IdcService.prototype, "createIsbGroups").mockReturnValue(
      Promise.resolve(),
    );
    vi.spyOn(IdcService.prototype, "createIsbPermissionSets").mockReturnValue(
      Promise.resolve(),
    );
    expect(handler(event, mockContext(testEnv))).resolves.toEqual({
      Data: {
        status: "IDC groups and permission sets created / updated",
      },
    });
  });
  it("should not call the ISB groups delete method on on delete event", async () => {
    const event: CdkCustomResourceEvent = {
      RequestType: "Delete",
      ServiceToken:
        "arn:aws:lambda:us-east-1:111111111111:function:CustomResourceProvider1",
      ResponseURL: "https://example.com",
      StackId: "Stack1",
      RequestId: "Request1",
      LogicalResourceId: "IdcConfigurerIDCCustomResourceAAAAAA",
      ResourceType: "Custom::IdcConfigurer",
      ResourceProperties: {
        ServiceToken:
          "arn:aws:lambda:us-east-1:111111111111:function:CustomResourceProvider1",
      },
      PhysicalResourceId: "Resource1",
    };
    const deleteGroupsSpy = vi
      .spyOn(IdcService.prototype, "deleteIsbGroups")
      .mockReturnValue(Promise.resolve());
    const deletePSSpy = vi
      .spyOn(IdcService.prototype, "deleteIsbPermissionSets")
      .mockReturnValue(Promise.resolve());
    expect(handler(event, mockContext(testEnv))).resolves.toEqual({
      Data: {
        status: "IDC groups and permission sets retained",
      },
    });
    expect(deleteGroupsSpy).not.toHaveBeenCalled();
    expect(deletePSSpy).not.toHaveBeenCalled();
  });
  it("should fail when service call fails", async () => {
    const event: CdkCustomResourceEvent = {
      RequestType: "Create",
      ServiceToken:
        "arn:aws:lambda:us-east-1:111111111111:function:CustomResourceProvider1",
      ResponseURL: "https://example.com",
      StackId: "Stack1",
      RequestId: "Request1",
      LogicalResourceId: "IdcConfigurerIDCCustomResourceAAAAAA",
      ResourceType: "Custom::IdcConfigurer",
      ResourceProperties: {
        ServiceToken:
          "arn:aws:lambda:us-east-1:111111111111:function:CustomResourceProvider1",
      },
    };
    vi.spyOn(IdcService.prototype, "createIsbGroups").mockImplementation(() => {
      throw new Error();
    });
    await expect(handler(event, mockContext(testEnv))).rejects.toThrow();
  });
});
