// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { Construct } from "constructs";

import { ParameterWithLabel } from "@amzn/innovation-sandbox-infrastructure/helpers/cfn-utils";

export class HubAccountIdParam extends Construct {
  readonly hubAccountId: ParameterWithLabel;
  constructor(scope: Construct) {
    super(scope, "HubAccountId");
    const hubAccountId = new ParameterWithLabel(this, "HubAccountId", {
      label: "Hub Account Id",
      description:
        "The AWS Account Id where the Innovation Sandbox hub application is (to be) deployed",
      allowedPattern: "^[0-9]{12}$",
    });
    hubAccountId.overrideLogicalId("HubAccountId");
    this.hubAccountId = hubAccountId;
  }
}
