// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import {
  CloudControlClient,
  ListResourcesCommand,
  ResourceDescription,
} from "@aws-sdk/client-cloudcontrol";
import {
  DescribeExecutionCommand,
  ExecutionStatus,
  SFNClient,
  StartExecutionCommand,
} from "@aws-sdk/client-sfn";
import { fromTemporaryCredentials } from "@aws-sdk/credential-providers";
import { App, DefaultStackSynthesizer } from "aws-cdk-lib";
import { retryAsync } from "ts-retry/lib/esm/index.js";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import { IsbAccountCleanerTestResourcesStack } from "@amzn/innovation-sandbox-e2e/test/account-cleaner/sandbox-account-test-resources-stack.js";

let sfnClient: SFNClient;
let cloudControlClient: CloudControlClient;
let sandboxAccountId: string;
let accountCleanerStateMachineArn: string;
let testResourceStack: IsbAccountCleanerTestResourcesStack;

beforeAll(
  async () => {
    const testConfiguration = inject("testConfiguration");

    const sandboxAccountAdminRoleName =
      testConfiguration.sandboxAccountAdminRoleName;
    sandboxAccountId = testConfiguration.sandboxAccountId;

    const roleArn = `arn:aws:iam::${sandboxAccountId}:role/${sandboxAccountAdminRoleName}`;

    accountCleanerStateMachineArn =
      testConfiguration.accountCleanerStateMachineArn;

    sfnClient = new SFNClient();
    cloudControlClient = new CloudControlClient({
      credentials: fromTemporaryCredentials({
        params: {
          RoleArn: roleArn,
          RoleSessionName: "e2e-test",
        },
      }),
    });

    // Deploy test stack
    const app = new App();
    testResourceStack = new IsbAccountCleanerTestResourcesStack(
      app,
      "IsbAccountCleanerTestResourcesStack",
      {
        synthesizer: new DefaultStackSynthesizer({
          generateBootstrapVersionRule: false,
        }),
        roleArn,
      },
    );
    await testResourceStack.deploy();
  },
  1_000 * 60 * 15,
);

afterAll(
  async () => {
    // Destroy test stack if still exists
    await testResourceStack.destroy();
  },
  1_000 * 60 * 15,
);

describe.runIf(process.env.RUN_SLOW_TESTS === "true")(
  "account-cleaner",
  { timeout: 1_000 * 60 * 30 }, // 30 minutes
  () => {
    it("should invoke the account cleaner state machine and complete with a successful status", async () => {
      const getSandboxAccountResources = async (typeNames: string[]) => {
        const resourceDescriptions = await Promise.all(
          typeNames.map(async (typeName) => {
            const { ResourceDescriptions } = await cloudControlClient.send(
              new ListResourcesCommand({
                TypeName: typeName,
              }),
            );
            return { typeName, resourceDescriptions: ResourceDescriptions! };
          }),
        );

        return resourceDescriptions.reduce(
          (acc, { typeName, resourceDescriptions }) => {
            acc[typeName] = resourceDescriptions;
            return acc;
          },
          {} as Record<string, ResourceDescription[]>,
        );
      };

      const typeNames = [
        "AWS::KMS::Key",
        "AWS::EC2::VPC",
        "AWS::EC2::SecurityGroup",
        "AWS::EC2::Instance",
        "AWS::RDS::DBCluster",
        "AWS::S3::Bucket",
        "AWS::Lambda::Function",
        "AWS::DynamoDB::Table",
      ];
      const sandboxAccountResourcesBeforeCleanup =
        await getSandboxAccountResources(typeNames);

      const startExecutionCommandResult = await sfnClient.send(
        new StartExecutionCommand({
          stateMachineArn: accountCleanerStateMachineArn,
          input: JSON.stringify({ detail: { accountId: sandboxAccountId } }),
        }),
      );

      expect(
        sandboxAccountResourcesBeforeCleanup["AWS::KMS::Key"],
      ).toHaveLength(2); // un-deletable AWS Manged Key
      // expect(
      //   sandboxAccountResourcesBeforeCleanup["AWS::EC2::VPC"],
      // ).toHaveLength(1);
      // expect(
      //   sandboxAccountResourcesBeforeCleanup["AWS::EC2::SecurityGroup"],
      // ).toHaveLength(3);
      // expect(
      //   sandboxAccountResourcesBeforeCleanup["AWS::EC2::Instance"],
      // ).toHaveLength(1);
      // expect(
      //   sandboxAccountResourcesBeforeCleanup["AWS::RDS::DBCluster"],
      // ).toHaveLength(1);
      expect(
        sandboxAccountResourcesBeforeCleanup["AWS::S3::Bucket"],
      ).toHaveLength(1);
      // expect(
      //   sandboxAccountResourcesBeforeCleanup["AWS::Lambda::Function"],
      // ).toHaveLength(1);
      // expect(
      //   sandboxAccountResourcesBeforeCleanup["AWS::DynamoDB::Table"],
      // ).toHaveLength(1);

      await retryAsync(
        async () => {
          const describeExecutionCommandResult = await sfnClient.send(
            new DescribeExecutionCommand({
              executionArn: startExecutionCommandResult.executionArn,
            }),
          );

          if (describeExecutionCommandResult.status == ExecutionStatus.FAILED) {
            throw new Error("Failed.");
          }

          expect(describeExecutionCommandResult.status).toEqual(
            ExecutionStatus.SUCCEEDED,
          );
        },
        {
          delay: 1_000 * 60,
          maxTry: 30,
          onError: (err) => {
            if (err.message == "Failed") {
              throw err;
            }
          },
        },
      );

      const sandboxAccountResourcesAfterCleanup =
        await getSandboxAccountResources(typeNames);

      expect(sandboxAccountResourcesAfterCleanup["AWS::KMS::Key"]).toHaveLength(
        1,
      ); // un-deletable AWS Manged Key
      // expect(sandboxAccountResourcesAfterCleanup["AWS::EC2::VPC"]).toHaveLength(
      //   0,
      // );
      // expect(
      //   sandboxAccountResourcesAfterCleanup["AWS::EC2::SecurityGroup"],
      // ).toHaveLength(0);
      // expect(
      //   sandboxAccountResourcesAfterCleanup["AWS::EC2::Instance"],
      // ).toHaveLength(0);
      // expect(
      //   sandboxAccountResourcesAfterCleanup["AWS::RDS::DBCluster"],
      // ).toHaveLength(0);
      expect(
        sandboxAccountResourcesAfterCleanup["AWS::S3::Bucket"],
      ).toHaveLength(0);
      // expect(
      //   sandboxAccountResourcesAfterCleanup["AWS::Lambda::Function"],
      // ).toHaveLength(0);
      // expect(
      //   sandboxAccountResourcesAfterCleanup["AWS::DynamoDB::Table"],
      // ).toHaveLength(0);
    });
  },
);
