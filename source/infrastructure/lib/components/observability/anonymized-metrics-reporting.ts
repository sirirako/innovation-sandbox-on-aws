// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { Construct } from "constructs";

import { DeploymentSummaryLambda } from "@amzn/innovation-sandbox-infrastructure/components/observability/deployment-summary-lambda";
import { LogMetricsSubscriber } from "@amzn/innovation-sandbox-infrastructure/components/observability/log-subscription-lambda";
import { getContextFromMapping } from "@amzn/innovation-sandbox-infrastructure/helpers/cdk-context";
import { ConditionAspect } from "@amzn/innovation-sandbox-infrastructure/helpers/cfn-utils";
import { Aspects, CfnCondition, Fn } from "aws-cdk-lib";

export type AnonymizedMetricsProps = {
  namespace: string;
  metricsUrl: string;
  solutionId: string;
  solutionVersion: string;
  deploymentUUID: string;
  orgManagementAccountId: string;
};

export class AnonymizedMetricsReporting extends Construct {
  constructor(scope: Construct, id: string, props: AnonymizedMetricsProps) {
    const sendAnonymizedMetricsCondition = new CfnCondition(
      scope,
      "SendAnonymizedMetricsCondition",
      {
        expression: Fn.conditionEquals(
          getContextFromMapping(scope, "sendAnonymizedUsageMetrics"),
          "true",
        ),
      },
    );
    super(scope, id);
    Aspects.of(this).add(new ConditionAspect(sendAnonymizedMetricsCondition));

    new DeploymentSummaryLambda(this, "HeartbeatMetrics", props);
    new LogMetricsSubscriber(this, "LogMetrics", props);
  }
}
