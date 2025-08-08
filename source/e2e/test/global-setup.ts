// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
// No longer need CloudFront client imports
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";
import type { GlobalSetupContext } from "vitest/node";

import { AppConfigGlobalConfigStore } from "@amzn/innovation-sandbox-commons/data/global-config/appconfig-global-config-store.js";
import { GlobalConfig } from "@amzn/innovation-sandbox-commons/data/global-config/global-config.js";
import { CfnStackReader } from "@amzn/innovation-sandbox-e2e/test/utils/cfn.js";

export type TestConfiguration = {
  hubAccountId: string;
  sandboxAccountId: string;
  sandboxAccountTable: string;
  leaseTemplateTable: string;
  leaseTable: string;
  applicationUrl: string;
  appConfig: {
    applicationId: string;
    environmentId: string;
    globalConfigConfigurationProfileId: string;
    nukeConfigConfigurationProfileId: string;
    deploymentStrategyId: string;
    lambdaEnv: {
      USER_AGENT_EXTRA: string;
    };
  };
  accountCleanerStateMachineArn: string;
  jwtSecret: string;
  namespace: string;
  sandboxAccountAdminRoleName: string;
};

let testConfiguration: TestConfiguration;

declare module "vitest" {
  export interface ProvidedContext {
    testConfiguration: TestConfiguration;
  }
}

const StsClient = new STSClient();
const secretsManagerClient = new SecretsManagerClient();

let originalGlobalConfig: GlobalConfig;

export async function setup({ provide }: GlobalSetupContext): Promise<void> {
  console.log("Running e2e test suite setup...");
  const dataStackName = process.env["DATA_STACK"];
  const computeStackName = process.env["COMPUTE_STACK"];
  const emailFrom = process.env["EMAIL_FROM"];
  const sandboxAccountAdminRoleName =
    process.env["SANDBOX_ACCOUNT_ADMIN_ROLE_NAME"];

  if (dataStackName == null) {
    throw new Error(`Missing required environment variable: DATA_STACK.`);
  }

  if (computeStackName == null) {
    throw new Error(`Missing required environment variable: COMPUTE_STACK.`);
  }

  if (emailFrom == null) {
    throw new Error(`Missing required environment variable: EMAIL_FROM.`);
  }

  if (sandboxAccountAdminRoleName == null) {
    throw new Error(
      `Missing required environment variable: SANDBOX_ACCOUNT_ADMIN_ROLE_NAME.`,
    );
  }

  const dataStackReader = await CfnStackReader.fromStackName(dataStackName);
  const computeStackReader =
    await CfnStackReader.fromStackName(computeStackName);

  const dataStackNameSpace =
    dataStackReader.findParameterByName("Namespace")?.ParameterValue;
  const computeStackNameSpace =
    computeStackReader.findParameterByName("Namespace")?.ParameterValue;

  if (!dataStackNameSpace || dataStackNameSpace != computeStackNameSpace) {
    throw new Error(
      `Namespace mismatch between data stack and compute stack: ${dataStackNameSpace} != ${computeStackNameSpace}.`,
    );
  }

  testConfiguration = {
    hubAccountId: (await StsClient.send(new GetCallerIdentityCommand()))
      .Account!,

    sandboxAccountId: process.env.SANDBOX_ACCOUNT_ID!,

    sandboxAccountTable: dataStackReader.findResourceByPartialId(
      "SandboxAccountTable",
    )?.PhysicalResourceId!,

    leaseTemplateTable:
      dataStackReader.findResourceByPartialId("LeaseTemplateTable")
        ?.PhysicalResourceId!,

    leaseTable:
      dataStackReader.findResourceByPartialId("LeaseTable")
        ?.PhysicalResourceId!,

    applicationUrl: `https://${
      computeStackReader.findResourceByPartialId(
        "AlbUiApiIsbApplicationLoadBalancer",
      )?.PhysicalResourceId!
    }`,

    accountCleanerStateMachineArn: computeStackReader.findResourceByPartialId(
      "AccountCleanerStepFunctionStateMachine",
      "AWS::StepFunctions::StateMachine",
    )?.PhysicalResourceId!,

    appConfig: {
      applicationId:
        dataStackReader.findResourceByPartialId("ConfigApplication")
          ?.PhysicalResourceId!,

      environmentId:
        dataStackReader.findResourceByPartialId("ConfigEnvironment")
          ?.PhysicalResourceId!,

      globalConfigConfigurationProfileId:
        dataStackReader.findResourceByPartialId(
          "ConfigGlobalConfigHostedConfigurationConfigurationProfile",
        )?.PhysicalResourceId!,

      nukeConfigConfigurationProfileId: dataStackReader.findResourceByPartialId(
        "ConfigNukeConfigHostedConfigurationConfigurationProfile",
      )?.PhysicalResourceId!,

      deploymentStrategyId: dataStackReader.findResourceByPartialId(
        "ConfigDeploymentStrategy",
      )?.PhysicalResourceId!,

      lambdaEnv: {
        USER_AGENT_EXTRA: "ISB-E2E-Test",
      },
    },

    jwtSecret: (
      await secretsManagerClient.send(
        new GetSecretValueCommand({
          SecretId: (() => {
            const resId = computeStackReader.findResourceByPartialId(
              "JwtSecret",
              "AWS::SecretsManager::Secret",
            )?.PhysicalResourceId!;
            return resId.substring(
              resId.indexOf("secret:") + "secret:".length,
              resId.lastIndexOf("-"),
            );
          })(),
        }),
      )
    ).SecretString!,
    namespace: dataStackNameSpace,
    sandboxAccountAdminRoleName,
  };

  console.log("Running tests with the following configurations:");
  console.log(testConfiguration);

  console.log("Disabling maintenance mode ...");
  const globalConfigStore = new AppConfigGlobalConfigStore(
    testConfiguration.appConfig,
  );

  originalGlobalConfig = await globalConfigStore.get();

  await globalConfigStore.put({
    ...(originalGlobalConfig as GlobalConfig),
    maintenanceMode: false,
    cleanup: {
      numberOfSuccessfulAttemptsToFinishCleanup: 2,
      numberOfFailedAttemptsToCancelCleanup: 3,
      waitBeforeRerunSuccessfulAttemptSeconds: 30,
      waitBeforeRetryFailedAttemptSeconds: 5,
    },
    notification: {
      emailFrom: emailFrom,
    },
  });

  provide("testConfiguration", testConfiguration);
}

export async function teardown(): Promise<void> {
  console.log("Running e2e test suite teardown...");
  console.log("Restoring original global config...");
  const globalConfigStore = new AppConfigGlobalConfigStore(
    testConfiguration.appConfig,
  );
  await globalConfigStore.put(originalGlobalConfig as GlobalConfig);
}
