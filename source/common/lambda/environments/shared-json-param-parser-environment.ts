// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { z } from "zod";

import { BaseLambdaEnvironmentSchema } from "@amzn/innovation-sandbox-commons/lambda/environments/base-lambda-environment.js";

export const SharedJsonParamEnvironmentSchema =
  BaseLambdaEnvironmentSchema.extend({});

export type SharedJsonParamEnvironment = z.infer<
  typeof SharedJsonParamEnvironmentSchema
>;
