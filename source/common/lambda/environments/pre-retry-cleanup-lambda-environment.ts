// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { z } from "zod";

import { BaseLambdaEnvironmentSchema } from "@amzn/innovation-sandbox-commons/lambda/environments/base-lambda-environment.js";

export const PreRetryCleanupLambdaEnvironmentSchema =
  BaseLambdaEnvironmentSchema.extend({
    APP_CONFIG_APPLICATION_ID: z.string(),
    APP_CONFIG_PROFILE_ID: z.string(),
    APP_CONFIG_ENVIRONMENT_ID: z.string(),
  });

export type PreRetryCleanupLambdaEnvironment = z.infer<
  typeof PreRetryCleanupLambdaEnvironmentSchema
>;
