// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { IsbLambdaFunction } from "@amzn/innovation-sandbox-infrastructure/components/isb-lambda-function";
import { IsbComputeStack } from "@amzn/innovation-sandbox-infrastructure/isb-compute-stack";
import { ArnFormat, Stack } from "aws-cdk-lib";
import { Effect, Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export function grantIsbDbReadOnly(
  scope: Construct,
  isbLambda: IsbLambdaFunction<any>,
  ...tableNames: string[]
) {
  const policyStatements: PolicyStatement[] = tableNames.map(
    (tableName) => new DDBReadPolicy(scope, { tableName }),
  );

  policyStatements.push(
    new KmsKeyEncryptDecryptPolicyStatement(scope, {
      kmsKeyId: IsbComputeStack.sharedSpokeConfig.data.tableKmsKeyId,
    }),
  );

  const dbReadOnlyPolicy = new Policy(
    scope,
    isbLambda.node.id + "-IsbDbTableReadOnly",
    {
      policyName: "DynamoDBReadOnlyAccess",
      statements: policyStatements,
    },
  );

  isbLambda.lambdaFunction.role!.attachInlinePolicy(dbReadOnlyPolicy);
}

export function grantIsbDbReadWrite(
  scope: Construct,
  isbLambda: IsbLambdaFunction<any>,
  ...tableNames: string[]
) {
  const policyStatements: PolicyStatement[] = tableNames.map(
    (tableName) => new DDBReadWritePolicy(scope, { tableName }),
  );

  policyStatements.push(
    new KmsKeyEncryptDecryptPolicyStatement(scope, {
      kmsKeyId: IsbComputeStack.sharedSpokeConfig.data.tableKmsKeyId,
    }),
  );

  const dbReadWritePolicy = new Policy(
    scope,
    isbLambda.node.id + "-IsbDbTableReadWrite",
    {
      policyName: "DynamoDBReadWriteAccess",
      statements: policyStatements,
    },
  );

  isbLambda.lambdaFunction.role!.attachInlinePolicy(dbReadWritePolicy);
}

export function grantIsbAppConfigRead(
  scope: Construct,
  isbLambda: IsbLambdaFunction<any>,
  configurationProfileId: string,
) {
  const { configApplicationId, configEnvironmentId } =
    IsbComputeStack.sharedSpokeConfig.data;

  isbLambda.lambdaFunction.addToRolePolicy(
    new AppConfigReadPolicyStatement(scope, {
      configurations: [
        {
          applicationId: configApplicationId,
          environmentId: configEnvironmentId,
          configurationProfileId: configurationProfileId,
        },
      ],
    }),
  );
}

export class DDBReadPolicy extends PolicyStatement {
  constructor(
    scope: Construct,
    props: {
      tableName: string;
    },
  ) {
    const { tableName } = props;
    super({
      effect: Effect.ALLOW,
      actions: [
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:ConditionCheckItem",
        "dynamodb:BatchGetItem",
      ],
      resources: [
        Stack.of(scope).formatArn({
          service: "dynamodb",
          resource: "table",
          resourceName: tableName,
        }),
        Stack.of(scope).formatArn({
          service: "dynamodb",
          resource: "table",
          resourceName: `${tableName}/index/*`,
        }),
      ],
    });
  }
}

class DDBReadWritePolicy extends PolicyStatement {
  constructor(
    scope: Construct,
    props: {
      tableName: string;
    },
  ) {
    const { tableName } = props;
    super({
      effect: Effect.ALLOW,
      actions: [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:ConditionCheckItem",
        "dynamodb:BatchGetItem",
        "dynamodb:BatchWriteItem",
      ],
      resources: [
        Stack.of(scope).formatArn({
          service: "dynamodb",
          resource: "table",
          resourceName: tableName,
        }),
        Stack.of(scope).formatArn({
          service: "dynamodb",
          resource: "table",
          resourceName: `${tableName}/index/*`,
        }),
      ],
    });
  }
}

class KmsKeyEncryptDecryptPolicyStatement extends PolicyStatement {
  constructor(scope: Construct, props: { kmsKeyId: string }) {
    const { kmsKeyId } = props;
    super({
      effect: Effect.ALLOW,
      actions: [
        "kms:Decrypt",
        "kms:DescribeKey",
        "kms:Encrypt",
        "kms:GenerateDataKey",
        "kms:ReEncrypt*",
      ],
      resources: [
        Stack.of(scope).formatArn({
          service: "kms",
          resource: "key",
          resourceName: kmsKeyId,
        }),
      ],
    });
  }
}

export class AppConfigReadPolicyStatement extends PolicyStatement {
  constructor(
    scope: Construct,
    props: {
      configurations: {
        applicationId: string;
        environmentId: string;
        configurationProfileId: string;
      }[];
    },
  ) {
    const { configurations } = props;
    super({
      effect: Effect.ALLOW,
      actions: [
        "appconfig:StartConfigurationSession",
        "appconfig:GetLatestConfiguration",
      ],
      resources: configurations.map((configuration) => {
        const { applicationId, environmentId, configurationProfileId } =
          configuration;
        return Stack.of(scope).formatArn({
          service: "appconfig",
          resource: `application/${applicationId}/environment/${environmentId}/configuration/${configurationProfileId}`,
          arnFormat: ArnFormat.NO_RESOURCE_NAME,
        });
      }),
    });
  }
}
