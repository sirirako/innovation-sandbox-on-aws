// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { Construct } from "constructs";

import { ParameterWithLabel } from "@amzn/innovation-sandbox-infrastructure/helpers/cfn-utils";

export class NamespaceParam extends Construct {
  readonly namespace: ParameterWithLabel;
  constructor(scope: Construct) {
    super(scope, "Namespace");
    const namespace = new ParameterWithLabel(this, "Namespace", {
      label: "Namespace",
      description:
        "The namespace for this deployment of Innovation Sandbox (must be the same for all member stacks)." +
        " Alphanumeric characters of length between 3 and 8",
      default: "myisb",
      allowedPattern: "^[0-9a-zA-Z]{3,8}$",
    });
    namespace.overrideLogicalId("Namespace");
    this.namespace = namespace;
  }
}
