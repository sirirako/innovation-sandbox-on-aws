// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { Logger } from "@aws-lambda-powertools/logger";
import { Tracer } from "@aws-lambda-powertools/tracer";
import type {
  CdkCustomResourceEvent,
  CdkCustomResourceResponse,
  CloudFormationCustomResourceCreateEvent,
  CloudFormationCustomResourceDeleteEvent,
  CloudFormationCustomResourceUpdateEvent,
  Context,
} from "aws-lambda";

import { IdcService } from "@amzn/innovation-sandbox-commons/isb-services/idc-service.js";
import { IsbServices } from "@amzn/innovation-sandbox-commons/isb-services/index.js";
import {
  IdcConfigurerLambdaEnvironment,
  IdcConfigurerLambdaEnvironmentSchema,
} from "@amzn/innovation-sandbox-commons/lambda/environments/idc-configurer-lambda-environment.js";
import baseMiddlewareBundle from "@amzn/innovation-sandbox-commons/lambda/middleware/base-middleware-bundle.js";
import { ValidatedEnvironment } from "@amzn/innovation-sandbox-commons/lambda/middleware/environment-validator.js";

const tracer = new Tracer();
const logger = new Logger();

export const handler = baseMiddlewareBundle({
  logger,
  tracer,
  environmentSchema: IdcConfigurerLambdaEnvironmentSchema,
  moduleName: "idc-configurer",
}).handler(lambdaHandler);

async function lambdaHandler(
  event: CdkCustomResourceEvent,
  context: Context & ValidatedEnvironment<IdcConfigurerLambdaEnvironment>,
): Promise<CdkCustomResourceResponse> {
  const idcService = IsbServices.idcService(context.env);

  switch (event.RequestType) {
    case "Create":
    case "Update": {
      return onCreateOrUpdate(event, idcService);
    }
    case "Delete": {
      return onDelete(event);
    }
  }
}

async function onCreateOrUpdate(
  _event:
    | CloudFormationCustomResourceCreateEvent
    | CloudFormationCustomResourceUpdateEvent,
  idcService: IdcService,
): Promise<CdkCustomResourceResponse> {
  await idcService.createIsbGroups();
  await idcService.createIsbPermissionSets();
  return {
    Data: {
      status: "IDC groups and permission sets created / updated",
    },
  };
}

async function onDelete(
  _event: CloudFormationCustomResourceDeleteEvent,
): Promise<CdkCustomResourceResponse> {
  logger.info("Retaining IDC groups and permission sets");
  return {
    Data: {
      status: "IDC groups and permission sets retained",
    },
  };
}
