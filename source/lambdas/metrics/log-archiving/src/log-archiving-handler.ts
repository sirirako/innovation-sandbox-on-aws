// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { Logger } from "@aws-lambda-powertools/logger";
import { Tracer } from "@aws-lambda-powertools/tracer";
import { EventBridgeEvent } from "aws-lambda";

import { IsbServices } from "@amzn/innovation-sandbox-commons/isb-services/index.js";
import {
  LogArchivingEnvironment,
  LogArchivingEnvironmentSchema,
} from "@amzn/innovation-sandbox-commons/lambda/environments/log-archiving-lambda-environment.js";
import baseMiddlewareBundle, {
  IsbLambdaContext,
} from "@amzn/innovation-sandbox-commons/lambda/middleware/base-middleware-bundle.js";
import {
  now,
  nowAsIsoDatetimeString,
} from "@amzn/innovation-sandbox-commons/utils/time-utils.js";
import { DateTime } from "luxon";

const serviceName = "LogArchivingHandler";
const tracer = new Tracer();
const logger = new Logger({ serviceName });

export const handler = baseMiddlewareBundle({
  logger,
  tracer,
  environmentSchema: LogArchivingEnvironmentSchema,
  moduleName: "log-archiving",
}).handler(eventHandler);

async function eventHandler(
  _event: EventBridgeEvent<string, unknown>,
  context: IsbLambdaContext<LogArchivingEnvironment>,
) {
  const periodInDays = Number(context.env.EXPORT_PERIOD_DAYS);
  const logGroupName = context.env.LOG_GROUP_NAME;
  const destinationPrefix = context.env.DESTINATION_PREFIX;
  const destinationBucketName = context.env.DESTINATION_BUCKET_NAME;

  logger.info({
    message: "Log archiving invoked",
    logGroupName,
    archivingBucketName: destinationBucketName,
    periodInDays,
    destinationPrefix,
  });

  const logArchivingService = IsbServices.logArchivingService(context.env, {
    logger,
    logGroupName,
    destinationPrefix,
    destinationBucketName: destinationBucketName,
  });
  const toTime = now().minus({ days: 1 }); //logs will be available for export only after 12 hours

  const currentExportTS = nowAsIsoDatetimeString();
  const lastExportedTS = await logArchivingService.getLastExportedDateTime();
  const parsedLastExportTS = parseAndValidateLastExportedTS(
    lastExportedTS,
    periodInDays,
  );
  const fromTime = parsedLastExportTS
    ? parsedLastExportTS
    : toTime.minus({ days: periodInDays + 1 });
  logger.info({
    message: "Log export period",
    fromTime,
    toTime,
  });

  if (toTime.diff(fromTime, "day").days < Math.floor(periodInDays / 2)) {
    logger.warn({
      message: `Time range is less than half the export period ${periodInDays}, skipping export`,
    });
    return;
  }

  await logArchivingService.createExportTask({
    fromTime,
    toTime,
    currentExportTS,
  });
  await logArchivingService.saveLastExportedDateTime(toTime);
}

function parseAndValidateLastExportedTS(
  lastExportedTS: string | undefined,
  periodInDays: number,
): DateTime<true> | undefined {
  if (!lastExportedTS) {
    logger.info({
      message: `No last exported date found (probably first export), using default time period of ${periodInDays} days`,
    });
    return undefined;
  }

  logger.info({
    message: `Last exported date found: ${lastExportedTS}`,
  });

  const parsedDateTime = DateTime.fromISO(lastExportedTS);

  if (!parsedDateTime.isValid) {
    logger.warn({
      message: `Invalid date found in last exported date: ${lastExportedTS}, using default time period of ${periodInDays} days`,
    });
    return undefined;
  }

  return parsedDateTime;
}
