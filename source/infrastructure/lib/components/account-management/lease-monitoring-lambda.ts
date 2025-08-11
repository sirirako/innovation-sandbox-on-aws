// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { EventBus } from "aws-cdk-lib/aws-events";
import { Role } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import path from "path";

import { LeaseMonitoringEnvironmentSchema } from "@amzn/innovation-sandbox-commons/lambda/environments/lease-monitoring-environment.js";
import { IsbLambdaFunction } from "@amzn/innovation-sandbox-infrastructure/components/isb-lambda-function";
import {
  IntermediateRole,
  getOrgMgtRoleArn,
} from "@amzn/innovation-sandbox-infrastructure/helpers/isb-roles";
import { grantIsbDbReadWrite } from "@amzn/innovation-sandbox-infrastructure/helpers/policy-generators";
import { SchedulerHelper } from "@amzn/innovation-sandbox-infrastructure/helpers/scheduler-helper";
import { IsbComputeResources } from "@amzn/innovation-sandbox-infrastructure/isb-compute-resources";
import { IsbComputeStack } from "@amzn/innovation-sandbox-infrastructure/isb-compute-stack";

export interface LeaseMonitoringLambdaProps {
  isbEventBus: EventBus;
  readonly namespace: string;
  orgMgtAccountId: string;
}

export class LeaseMonitoringLambda extends Construct {
  constructor(scope: Construct, id: string, props: LeaseMonitoringLambdaProps) {
    super(scope, id);

    const lambda = new IsbLambdaFunction(this, id, {
      description:
        "Scans active leases periodically to trigger events when alerts or actions need to be taken",
      entry: path.join(
        __dirname,
        "..",
        "..",
        "..",
        "..",
        "lambdas",
        "account-management",
        "lease-monitoring",
        "src",
        "lease-monitoring-handler.ts",
      ),
      handler: "handler",
      namespace: props.namespace,
      environment: {
        ISB_EVENT_BUS: props.isbEventBus.eventBusName,
        LEASE_TABLE_NAME: IsbComputeStack.sharedSpokeConfig.data.leaseTable,
        ISB_NAMESPACE: props.namespace,
        INTERMEDIATE_ROLE_ARN: IntermediateRole.getRoleArn(),
        ORG_MGT_ROLE_ARN: getOrgMgtRoleArn(
          scope,
          props.namespace,
          props.orgMgtAccountId,
        ),
      },
      logGroup: IsbComputeResources.globalLogGroup,
      envSchema: LeaseMonitoringEnvironmentSchema,
      reservedConcurrentExecutions: 1,
    });

    props.isbEventBus.grantPutEventsTo(lambda.lambdaFunction);
    IntermediateRole.addTrustedRole(lambda.lambdaFunction.role! as Role);
    grantIsbDbReadWrite(
      scope,
      lambda,
      IsbComputeStack.sharedSpokeConfig.data.leaseTable,
    );

    // Use architecture-aware scheduler (EventBridge Scheduler for CloudFront, CloudWatch Events for ALB)
    SchedulerHelper.createScheduler(
      scope,
      "LeaseMonitoringScheduler",
      lambda.lambdaFunction,
      {
        description: "triggers LeaseMonitoring every hour",
        scheduleExpression: "rate(1 hour)", // Original EventBridge Scheduler format
        retryAttempts: 20,
        maximumWindowInMinutes: 5, // Original configuration
      },
    );
  }
}
