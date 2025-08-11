// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { z } from "zod";

import { BaseLambdaEnvironmentSchema } from "@amzn/innovation-sandbox-commons/lambda/environments/base-lambda-environment.js";

export const DeploymentSummaryLambdaEnvironmentSchema =
  BaseLambdaEnvironmentSchema.extend({
    METRICS_URL: z.string(),
    SOLUTION_ID: z.string(),
    SOLUTION_VERSION: z.string(),
    METRICS_UUID: z.string(),
    ACCOUNT_TABLE_NAME: z.string(),
    ISB_NAMESPACE: z.string(),
    SANDBOX_OU_ID: z.string(),
    LEASE_TEMPLATE_TABLE_NAME: z.string(),
    ORG_MGT_ROLE_ARN: z.string(),
    INTERMEDIATE_ROLE_ARN: z.string(),
  });

export type DeploymentSummaryLambdaEnvironment = z.infer<
  typeof DeploymentSummaryLambdaEnvironmentSchema
>;
