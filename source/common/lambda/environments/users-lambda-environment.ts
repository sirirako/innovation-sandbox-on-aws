// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { z } from "zod";

import { BaseLambdaEnvironmentSchema } from "@amzn/innovation-sandbox-commons/lambda/environments/base-lambda-environment.js";

export const UsersLambdaEnvironmentSchema = BaseLambdaEnvironmentSchema.extend({
  IDENTITY_STORE_ID: z.string(),
  SSO_INSTANCE_ARN: z.string(),
  ISB_NAMESPACE: z.string(),
  INTERMEDIATE_ROLE_ARN: z.string(),
  IDC_ROLE_ARN: z.string(),
});

export type UsersLambdaEnvironment = z.infer<
  typeof UsersLambdaEnvironmentSchema
>;
