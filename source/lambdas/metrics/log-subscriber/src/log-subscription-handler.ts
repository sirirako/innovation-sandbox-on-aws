// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { Logger } from "@aws-lambda-powertools/logger";
import { Tracer } from "@aws-lambda-powertools/tracer";
import type { CloudWatchLogsEvent, Context } from "aws-lambda";

import {
  LogSubscriberLambdaEnvironment,
  LogSubscriberLambdaEnvironmentSchema,
} from "@amzn/innovation-sandbox-commons/lambda/environments/log-subscriber-lambda-environment.js";
import baseMiddlewareBundle from "@amzn/innovation-sandbox-commons/lambda/middleware/base-middleware-bundle.js";
import { ValidatedEnvironment } from "@amzn/innovation-sandbox-commons/lambda/middleware/environment-validator.js";
import {
  AnonymizedAWSMetricData,
  sendAnonymizedMetricToAWS,
} from "@amzn/innovation-sandbox-commons/observability/anonymized-metric.js";
import {
  SubscribableLog,
  SubscribableLogSchema,
} from "@amzn/innovation-sandbox-commons/observability/log-types.js";
import * as zlib from "node:zlib";
import z from "zod";

const tracer = new Tracer();
const logger = new Logger({ serviceName: "LogMetricForwarder" });

export const handler = baseMiddlewareBundle({
  logger,
  tracer,
  environmentSchema: LogSubscriberLambdaEnvironmentSchema,
  moduleName: "metrics",
}).handler(forwardLogBatchToAWS);

//partial schema only, the rest of the event can be ignored
export const CloudwatchLogEventSchema = z.object({
  logEvents: z.array(z.object({ message: z.string() })),
});

async function forwardLogBatchToAWS(
  event: CloudWatchLogsEvent,
  context: Context & ValidatedEnvironment<LogSubscriberLambdaEnvironment>,
) {
  // Decode and decompress the data
  const decompressed = zlib
    .gunzipSync(Buffer.from(event.awslogs.data, "base64"))
    .toString("utf-8");

  const eventParser = z
    .string()
    .transform((str) => JSON.parse(str))
    .pipe(CloudwatchLogEventSchema)
    .safeParse(decompressed);

  if (!eventParser.success) {
    logger.warn(
      `failed to parse CW Log event: ${JSON.stringify(eventParser.error)}`,
      {
        failedEvent: decompressed,
      },
    );
    return;
  }

  const parsedEvent = eventParser.data;

  for (const structuredLog of parsedEvent.logEvents) {
    const logParser = z
      .string()
      .transform((str) => JSON.parse(str))
      .pipe(SubscribableLogSchema)
      .safeParse(structuredLog.message);

    if (!logParser.success) {
      logger.warn(
        `failed to parse CW Log: ${JSON.stringify(logParser.error)}`,
        {
          failedLog: structuredLog,
        },
      );
      continue;
    }

    const awsMetric = extractAwsMetric(logParser.data);
    if (awsMetric) {
      await sendAnonymizedMetricToAWS(awsMetric, {
        logger,
        tracer,
        env: context.env,
      });
    }
  }
}

function extractAwsMetric(
  log: SubscribableLog,
): AnonymizedAWSMetricData | undefined {
  switch (log.logDetailType) {
    case "LeaseApproved":
      return {
        event_name: "LeaseApproved",
        context_version: 1,
        context: {
          maxBudget: log.maxBudget,
          maxDurationHours: log.maxDurationHours,
          autoApproved: log.autoApproved,
        },
      };
    case "LeaseTerminated":
      return {
        event_name: "LeaseTerminated",
        context_version: 1,
        context: {
          maxBudget: log.maxBudget,
          actualSpend: log.actualSpend,
          maxDurationHours: log.maxDurationHours,
          actualDurationHours: log.actualDurationHours,
          reasonForTermination: log.reasonForTermination,
        },
      };
    case "DeploymentSummary":
      return {
        event_name: "DeploymentSummary",
        context_version: 1,
        context: {
          numLeaseTemplates: log.numLeaseTemplates,
          activeAccounts: log.accountPool.active,
          availableAccounts: log.accountPool.available,
          cleanupAccounts: log.accountPool.cleanup,
          quarantineAccounts: log.accountPool.quarantine,
          frozenAccounts: log.accountPool.frozen,
        },
      };
    case "CostReporting":
      return {
        event_name: "CostReporting",
        context_version: 1,
        context: {
          startDate: log.startDate,
          endDate: log.endDate,
          sandboxAccountsCost: log.sandboxAccountsCost,
          solutionOperatingCost: log.solutionOperatingCost,
        },
      };
    case "AccountCleanupSuccess":
      return {
        event_name: "AccountCleanupSuccess",
        context_version: 1,
        context: {
          durationMinutes: log.durationMinutes,
        },
      };
    case "AccountCleanupFailure":
      return {
        event_name: "AccountCleanupFailure",
        context_version: 1,
        context: {
          durationMinutes: log.durationMinutes,
        },
      };
    default: {
      return undefined;
    }
  }
}
