// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { Logger } from "@aws-lambda-powertools/logger";
import { Tracer } from "@aws-lambda-powertools/tracer";
import {
  DescribeSecretCommand,
  GetRandomPasswordCommand,
  PutSecretValueCommand,
  UpdateSecretVersionStageCommand,
} from "@aws-sdk/client-secrets-manager";
import { SecretsManagerRotationEvent } from "aws-lambda";

import {
  BaseLambdaEnvironment,
  BaseLambdaEnvironmentSchema,
} from "@amzn/innovation-sandbox-commons/lambda/environments/base-lambda-environment.js";
import baseMiddlewareBundle from "@amzn/innovation-sandbox-commons/lambda/middleware/base-middleware-bundle.js";
import { ValidatedEnvironment } from "@amzn/innovation-sandbox-commons/lambda/middleware/environment-validator.js";
import { IsbClients } from "@amzn/innovation-sandbox-commons/sdk-clients/index.js";
import { IsbSecretsManagerClient } from "@amzn/innovation-sandbox-commons/sdk-clients/secrets-manager-client.js";

const tracer = new Tracer();
const logger = new Logger();

export const handler = baseMiddlewareBundle({
  logger,
  tracer,
  environmentSchema: BaseLambdaEnvironmentSchema,
  moduleName: "secret-rotator",
}).handler(lambdaHandler);

async function lambdaHandler(
  event: SecretsManagerRotationEvent,
  context: ValidatedEnvironment<BaseLambdaEnvironment>,
): Promise<void> {
  const secretsManager = IsbClients.secretsManager(context.env);

  if (!event.SecretId || !event.ClientRequestToken) {
    throw new Error("SecretId or ClientRequestToken is missing");
  }
  const { Step, SecretId, ClientRequestToken } = event;
  logger.info(`Received ${Step} for secret ${SecretId}`);
  try {
    switch (Step) {
      case "createSecret":
        await createSecret(SecretId, ClientRequestToken, secretsManager);
        break;
      case "setSecret":
        await setSecret(SecretId, secretsManager);
        break;
      case "testSecret":
        await testSecret(SecretId, secretsManager);
        break;
      case "finishSecret":
        await finishSecret(SecretId, secretsManager);
        break;
      default:
        throw new Error(`Invalid step.`);
    }
  } catch (error) {
    logger.error("Error rotating secret", error as Error);
    throw error;
  }
}

async function createSecret(
  secretArn: string,
  clientRequestToken: string,
  secretsManager: IsbSecretsManagerClient,
): Promise<void> {
  const randomPasswordCommand = new GetRandomPasswordCommand({
    PasswordLength: 32,
  });
  const newSecretValue = (await secretsManager.send(randomPasswordCommand))
    .RandomPassword;
  const putCommand = new PutSecretValueCommand({
    SecretId: secretArn,
    ClientRequestToken: clientRequestToken,
    SecretString: newSecretValue,
    VersionStages: ["AWSPENDING"],
  });
  await secretsManager.send(putCommand);
  logger.info("Successfully created new secret version");
}

async function setSecret(
  secretArn: string,
  _secretsManager: IsbSecretsManagerClient,
) {
  logger.info(`NOOP: setSecret for ARN: ${secretArn} received`);
}

async function testSecret(
  secretArn: string,
  _secretsManager: IsbSecretsManagerClient,
) {
  logger.info(`NOOP: testSecret for ARN: ${secretArn} received`);
}

async function finishSecret(
  secretArn: string,
  secretsManager: IsbSecretsManagerClient,
) {
  const describeSecretCommand = new DescribeSecretCommand({
    SecretId: secretArn,
  });
  const secretMetadata = await secretsManager.send(describeSecretCommand);

  const versionStages = secretMetadata.VersionIdsToStages;

  if (!versionStages) {
    throw new Error("No version stages found for the secret.");
  }

  let currentVersionId: string | undefined;
  let pendingVersionId: string | undefined;

  for (const [versionId, stages] of Object.entries(versionStages)) {
    if (stages.includes("AWSCURRENT")) {
      currentVersionId = versionId;
    }
    if (stages.includes("AWSPENDING")) {
      pendingVersionId = versionId;
    }
  }

  if (!pendingVersionId) {
    throw new Error("No pending version found for the secret.");
  }

  const updateCommand = new UpdateSecretVersionStageCommand({
    SecretId: secretArn,
    VersionStage: "AWSCURRENT",
    MoveToVersionId: pendingVersionId,
    RemoveFromVersionId: currentVersionId,
  });

  await secretsManager.send(updateCommand);
  logger.info(`Secret rotation completed successfully for ARN: ${secretArn}`);
}
