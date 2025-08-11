// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { MiddlewareFn } from "@aws-lambda-powertools/commons/types";
import { Logger } from "@aws-lambda-powertools/logger";
import { MiddlewareObj } from "@middy/core";
import { Context } from "aws-lambda";
import { Schema, z } from "zod";

interface EnvironmentValidatorOptions<T extends Schema> {
  schema: T;
  logger: Logger;
}

export type ValidatedEnvironment<T> = {
  env: T;
};

export class EnvironmentValidatorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvironmentValidatorError";
  }
}

export default function environmentValidatorMiddleware<T extends Schema>(
  opts: EnvironmentValidatorOptions<T>,
): MiddlewareObj<
  unknown,
  any,
  Error,
  Context & ValidatedEnvironment<z.infer<T>>
> {
  const environmentValidatorBefore: MiddlewareFn = (request) => {
    const { schema, logger } = opts;

    const schemaParseResponse = schema.safeParse(process.env);
    if (!schemaParseResponse.success) {
      const errorMessage = `Environment variables are incorrectly configured: ${schemaParseResponse.error}`;
      logger.critical(errorMessage);
      throw new EnvironmentValidatorError(errorMessage);
    }
    Object.assign(request.context, { env: schemaParseResponse.data });
  };
  return {
    before: environmentValidatorBefore,
  };
}
