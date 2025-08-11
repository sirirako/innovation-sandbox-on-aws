// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { ArnFormat, Fn, Stack } from "aws-cdk-lib";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import path from "path";

import { IdcConfigurerLambdaEnvironmentSchema } from "@amzn/innovation-sandbox-commons/lambda/environments/idc-configurer-lambda-environment.js";
import { IsbLambdaFunctionCustomResource } from "@amzn/innovation-sandbox-infrastructure/components/isb-lambda-function-custom-resource";
import { IsbIdcResourcesProps } from "@amzn/innovation-sandbox-infrastructure/isb-idc-resources";

export class IdcConfigurer extends Construct {
  constructor(scope: Construct, id: string, props: IsbIdcResourcesProps) {
    super(scope, id);

    const idcCustomResource = new IsbLambdaFunctionCustomResource(
      this,
      "IdcConfigurerLambdaFunction",
      {
        description: "Custom resource lambda that configures the IDC instance",
        entry: path.join(
          __dirname,
          "..",
          "..",
          "..",
          "..",
          "lambdas",
          "custom-resources",
          "idc-configurer",
          "src",
          "idc-configurer-handler.ts",
        ),
        handler: "handler",
        namespace: props.namespace,
        environment: {
          POWERTOOLS_SERVICE_NAME: "IdcConfigurer",
          IDENTITY_STORE_ID: props.identityStoreId,
          SSO_INSTANCE_ARN: props.ssoInstanceArn,
          ISB_NAMESPACE: props.namespace,
        },
        envSchema: IdcConfigurerLambdaEnvironmentSchema,
        customResourceType: "Custom::IdcConfigurer",
      },
    );

    const identityStoreArn = Stack.of(scope).formatArn({
      service: "identitystore",
      resource: "identitystore",
      region: "",
      arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
      resourceName: props.identityStoreId,
    });

    idcCustomResource.lambdaFunction.addToRolePolicy(
      new PolicyStatement({
        actions: ["identitystore:CreateGroup"],
        resources: [identityStoreArn],
      }),
    );

    idcCustomResource.lambdaFunction.addToRolePolicy(
      new PolicyStatement({
        actions: ["identitystore:ListGroups"],
        resources: [
          identityStoreArn,
          Stack.of(scope).formatArn({
            service: "identitystore",
            region: "",
            account: "",
            resource: "group",
            arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
            resourceName: "*",
          }),
        ],
      }),
    );

    const instanceId = Fn.select(1, Fn.split("/", props.ssoInstanceArn));

    idcCustomResource.lambdaFunction.addToRolePolicy(
      new PolicyStatement({
        actions: ["sso:ListPermissionSets", "sso:DescribePermissionSet"],
        resources: [
          props.ssoInstanceArn,
          Stack.of(scope).formatArn({
            service: "sso",
            account: "",
            region: "",
            resource: "permissionSet",
            arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
            resourceName: `${instanceId}/*`,
          }),
        ],
      }),
    );

    idcCustomResource.lambdaFunction.addToRolePolicy(
      new PolicyStatement({
        actions: [
          "sso:CreatePermissionSet",
          "sso:AttachManagedPolicyToPermissionSet",
        ],
        resources: [
          props.ssoInstanceArn,
          Stack.of(scope).formatArn({
            service: "sso",
            account: "",
            region: "",
            resource: "permissionSet",
            arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
            resourceName: `${instanceId}/*`,
          }),
        ],
      }),
    );
  }
}
