// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { z } from "zod";

import { BaseLambdaEnvironmentSchema } from "@amzn/innovation-sandbox-commons/lambda/environments/base-lambda-environment.js";

export const EmailNotificationEnvironmentSchema =
  BaseLambdaEnvironmentSchema.extend({
    ISB_EVENT_BUS: z.string(),
    APP_CONFIG_APPLICATION_ID: z.string(),
    APP_CONFIG_PROFILE_ID: z.string(),
    APP_CONFIG_ENVIRONMENT_ID: z.string(),
    ISB_NAMESPACE: z.string(),
    IDENTITY_STORE_ID: z.string(),
    SSO_INSTANCE_ARN: z.string(),
    INTERMEDIATE_ROLE_ARN: z.string(),
    IDC_ROLE_ARN: z.string(),
    AWS_APPCONFIG_EXTENSION_PREFETCH_LIST: z.string(),
  });

export type EmailNotificationEnvironment = z.infer<
  typeof EmailNotificationEnvironmentSchema
>;
