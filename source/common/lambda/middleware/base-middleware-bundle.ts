// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { Logger } from "@aws-lambda-powertools/logger";
import { injectLambdaContext } from "@aws-lambda-powertools/logger/middleware";
import { Tracer } from "@aws-lambda-powertools/tracer";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer/middleware";
import middy from "@middy/core";
import { Context } from "aws-lambda";
import { Schema, z } from "zod";

import environmentValidatorMiddleware, {
  ValidatedEnvironment,
} from "@amzn/innovation-sandbox-commons/lambda/middleware/environment-validator.js";

export interface BaseMiddlewareBundleOptions<T extends Schema> {
  logger: Logger;
  moduleName: string;
  tracer: Tracer;
  environmentSchema: T;
}

export type IsbLambdaContext<T> = Context & ValidatedEnvironment<T>;

export default function baseMiddlewareBundle<T extends Schema>(
  opts: BaseMiddlewareBundleOptions<T>,
): middy.MiddyfiedHandler<unknown, any, Error, IsbLambdaContext<z.infer<T>>> {
  const { logger, tracer, environmentSchema: schema } = opts;

  logger.appendKeys({
    module: opts.moduleName,
  });

  return middy()
    .use(environmentValidatorMiddleware<z.infer<T>>({ schema, logger }))
    .use(
      injectLambdaContext(logger, {
        logEvent: process.env.POWERTOOLS_LOG_LEVEL === "DEBUG",
        resetKeys: true,
      }),
    )
    .use(captureLambdaHandler(tracer));
}
