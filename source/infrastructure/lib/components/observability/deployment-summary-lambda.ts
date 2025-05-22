// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { CfnSchedule } from "aws-cdk-lib/aws-scheduler";
import { Construct } from "constructs";
import path from "path";

import { DeploymentSummaryLambdaEnvironmentSchema } from "@amzn/innovation-sandbox-commons/lambda/environments/deployment-summary-lambda-environment";
import { IsbLambdaFunction } from "@amzn/innovation-sandbox-infrastructure/components/isb-lambda-function";
import { AnonymizedMetricsProps } from "@amzn/innovation-sandbox-infrastructure/components/observability/anonymized-metrics-reporting";
import {
  getOrgMgtRoleArn,
  IntermediateRole,
} from "@amzn/innovation-sandbox-infrastructure/helpers/isb-roles";
import { grantIsbDbReadOnly } from "@amzn/innovation-sandbox-infrastructure/helpers/policy-generators";
import { IsbComputeResources } from "@amzn/innovation-sandbox-infrastructure/isb-compute-resources";
import { IsbComputeStack } from "@amzn/innovation-sandbox-infrastructure/isb-compute-stack";

export class DeploymentSummaryLambda extends Construct {
  constructor(scope: Construct, id: string, props: AnonymizedMetricsProps) {
    super(scope, id);
    const lambda = new IsbLambdaFunction(scope, "ReportingFunction", {
      description:
        "Periodic heartbeat lambda for summarizing the solution deployment",
      entry: path.join(
        __dirname,
        "..",
        "..",
        "..",
        "..",
        "lambdas",
        "metrics",
        "deployment-summary-heartbeat",
        "src",
        "deployment-summary-handler.ts",
      ),
      handler: "handler",
      namespace: props.namespace,
      environment: {
        METRICS_URL: props.metricsUrl,
        SOLUTION_ID: props.solutionId,
        SOLUTION_VERSION: props.solutionVersion,
        METRICS_UUID: props.deploymentUUID,
        ACCOUNT_TABLE_NAME: IsbComputeStack.sharedSpokeConfig.data.accountTable,
        LEASE_TEMPLATE_TABLE_NAME:
          IsbComputeStack.sharedSpokeConfig.data.leaseTemplateTable,
        ISB_NAMESPACE: props.namespace,
        SANDBOX_OU_ID:
          IsbComputeStack.sharedSpokeConfig.accountPool.sandboxOuId,
        ORG_MGT_ROLE_ARN: getOrgMgtRoleArn(
          scope,
          props.namespace,
          props.orgManagementAccountId,
        ),
        INTERMEDIATE_ROLE_ARN: IntermediateRole.getRoleArn(),
      },
      logGroup: IsbComputeResources.globalLogGroup,
      envSchema: DeploymentSummaryLambdaEnvironmentSchema,
      reservedConcurrentExecutions: 1,
    });

    grantIsbDbReadOnly(
      scope,
      lambda,
      IsbComputeStack.sharedSpokeConfig.data.leaseTemplateTable,
      IsbComputeStack.sharedSpokeConfig.data.accountTable,
    );
    IntermediateRole.addTrustedRole(lambda.lambdaFunction.role! as Role);

    const role = new Role(scope, "LambdaInvokeRole", {
      description:
        "allows EventBridgeScheduler to invoke Innovation Sandbox's heartbeat metrics lamdba",
      assumedBy: new ServicePrincipal("scheduler.amazonaws.com"),
    });

    lambda.lambdaFunction.grantInvoke(role);

    new CfnSchedule(scope, "ScheduledEvent", {
      description: "triggers heartbeat metrics lambda to execute once per day",
      scheduleExpression: "rate(1 day)",
      flexibleTimeWindow: {
        mode: "FLEXIBLE",
        maximumWindowInMinutes: 60,
      },
      target: {
        input: JSON.stringify({
          action: "gather-metrics",
        }),
        retryPolicy: {
          maximumRetryAttempts: 2,
        },
        arn: lambda.lambdaFunction.functionArn,
        roleArn: role.roleArn,
      },
    });
  }
}
