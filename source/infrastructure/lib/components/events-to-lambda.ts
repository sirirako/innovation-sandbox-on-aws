// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Duration } from "aws-cdk-lib";
import { EventBus, Rule, RuleProps } from "aws-cdk-lib/aws-events";
import {
  LambdaFunctionProps,
  LambdaFunction as TargetLambdaFunction,
} from "aws-cdk-lib/aws-events-targets";
import { ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { IFunction } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

interface EventsToLambdaProps {
  lambdaFunction: IFunction;
  eventBus: EventBus;
  lambdaFunctionProps: LambdaFunctionProps;
  ruleProps: RuleProps;
}

export class EventsToLambda extends Construct {
  constructor(scope: Construct, id: string, props: EventsToLambdaProps) {
    super(scope, id);

    const rule = new Rule(this, "EmailEventsToLambda", props.ruleProps);
    rule.addTarget(
      new TargetLambdaFunction(props.lambdaFunction, {
        maxEventAge: Duration.hours(6),
        retryAttempts: 3,
        ...props.lambdaFunctionProps,
      }),
    );

    props.lambdaFunction.addPermission("AllowEventBridgeToTriggerLambda", {
      principal: new ServicePrincipal("events.amazonaws.com"),
      sourceArn: props.eventBus.eventBusArn,
    });
  }
}
