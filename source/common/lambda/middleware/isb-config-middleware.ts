// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { MiddlewareObj } from "@middy/core";
import { Context } from "aws-lambda";

import {
  GlobalConfig,
  GlobalConfigSchema,
} from "@amzn/innovation-sandbox-commons/data/global-config/global-config.js";
import yaml from "js-yaml";

export type ContextWithConfig = Context & {
  globalConfig: GlobalConfig;
};

export class InvalidGlobalConfiguration extends Error {}

export function isbConfigMiddleware(): MiddlewareObj<
  unknown,
  any,
  Error,
  ContextWithConfig
> {
  const isbConfigMiddlewareBefore = async (request: any) => {
    const response = await fetch(
      `http://localhost:2772/applications/${process.env.APP_CONFIG_APPLICATION_ID}/environments/${process.env.APP_CONFIG_ENVIRONMENT_ID}/configurations/${process.env.APP_CONFIG_PROFILE_ID}`,
    );
    if (!response.ok) {
      throw new Error(
        `Error retrieving global configuration: ${response.status}`,
      );
    }

    const config = yaml.load(await response.text());
    const parsedGlobalConfig = GlobalConfigSchema.strict().safeParse(config);
    if (!parsedGlobalConfig.success) {
      throw new InvalidGlobalConfiguration(
        `Incorrect global configuration: ${parsedGlobalConfig.error}`,
      );
    }
    const globalConfig: GlobalConfig = parsedGlobalConfig.data;
    Object.assign(request.context, { globalConfig });
  };

  return {
    before: isbConfigMiddlewareBefore,
  };
}
