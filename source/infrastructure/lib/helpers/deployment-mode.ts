// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { Construct } from "constructs";

export function getDeploymentMode(scope: Construct): string {
  return scope.node.tryGetContext("deploymentMode") ?? "prod";
}

export function isDevMode(scope: Construct) {
  return getDeploymentMode(scope) === "dev";
}
