// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";

import { getContextFromMapping } from "@amzn/innovation-sandbox-infrastructure/helpers/cdk-context";
import {
  addParameterGroup,
  ParameterWithLabel,
} from "@amzn/innovation-sandbox-infrastructure/helpers/cfn-utils";
import { HubAccountIdParam } from "@amzn/innovation-sandbox-infrastructure/helpers/hub-account-id-param";
import { NamespaceParam } from "@amzn/innovation-sandbox-infrastructure/helpers/namespace-param";
import { applyIsbTag } from "@amzn/innovation-sandbox-infrastructure/helpers/tagging-helper";
import { IsbIdcResources } from "@amzn/innovation-sandbox-infrastructure/isb-idc-resources";

export class IsbIdcStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const namespaceParam = new NamespaceParam(this);
    const hubAccountIdParam = new HubAccountIdParam(this);

    const identityStoreId = new ParameterWithLabel(this, "IdentityStoreId", {
      label: "Identity Store Id",
      description:
        "The Identity Store Id of the Identity Source in IAM Identity Center (d-xxxxxxxxxx)",
      allowedPattern:
        "^d-[0-9a-f]{10}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    });

    const ssoInstanceArn = new ParameterWithLabel(this, "SsoInstanceArn", {
      label: "SSO Instance ARN",
      description:
        "The ARN of the SSO instance in IAM Identity Center (arn:aws:sso:::instance/ssoins-xxxxxxxxxxxxxxxx)",
      allowedPattern: "^arn:aws:sso:::instance/(sso)?ins-[a-zA-Z0-9-.]{16}$",
    });

    addParameterGroup(this, {
      label: "IDC Stack Configuration",
      parameters: [
        namespaceParam.namespace,
        hubAccountIdParam.hubAccountId,
        identityStoreId,
        ssoInstanceArn,
      ],
    });

    new IsbIdcResources(this, {
      hubAccountId: hubAccountIdParam.hubAccountId.valueAsString,
      identityStoreId: identityStoreId.valueAsString,
      ssoInstanceArn: ssoInstanceArn.valueAsString,
      namespace: namespaceParam.namespace.valueAsString,
      solutionVersion: getContextFromMapping(this, "version"),
    });

    applyIsbTag(this, `${namespaceParam.namespace.valueAsString}`);
  }
}
