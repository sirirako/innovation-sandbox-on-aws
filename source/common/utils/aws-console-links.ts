// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export namespace AwsConsoleLink {
  export function cloudwatchLogInsights() {
    return "https://console.aws.amazon.com/cloudwatch/home#logsV2:logs-insights";
  }

  export function stateMachineExecution(cleanupExecutionArn: string) {
    return `https://console.aws.amazon.com/states/home#/v2/executions/details/${cleanupExecutionArn}`;
  }
}
