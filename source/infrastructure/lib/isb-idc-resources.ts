// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { ArnFormat, Fn, Stack, aws_ram, aws_ssm } from "aws-cdk-lib";
import {
  AccountPrincipal,
  Effect,
  Policy,
  PolicyStatement,
  PrincipalWithConditions,
  Role,
} from "aws-cdk-lib/aws-iam";
import { ParameterTier } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";

import { sharedIdcSsmParamName } from "@amzn/innovation-sandbox-commons/types/isb-types.js";
import { IdcConfigurer } from "@amzn/innovation-sandbox-infrastructure/components/custom-resources/idc-configurer";
import { addCfnGuardSuppression } from "@amzn/innovation-sandbox-infrastructure/helpers/cfn-guard";
import {
  getIdcRoleName,
  getIntermediateRoleName,
} from "@amzn/innovation-sandbox-infrastructure/helpers/isb-roles";
import { IdcConfig } from "@amzn/innovation-sandbox-shared-json-param-parser/src/shared-json-param-parser-handler.js";

const supportedSchemas = ["1"];

export interface IsbIdcResourcesProps {
  hubAccountId: string;
  identityStoreId: string;
  ssoInstanceArn: string;
  namespace: string;
  solutionVersion: string;
}

export class IsbIdcResources {
  constructor(scope: Construct, props: IsbIdcResourcesProps) {
    new IdcConfigurer(scope, "IdcConfigurer", props);

    const idcRole = new Role(scope, "IdcRole", {
      roleName: getIdcRoleName(props.namespace),
      description: "Role to be assumed for IDC operations",
      assumedBy: new PrincipalWithConditions(
        new AccountPrincipal(props.hubAccountId),
        {
          ArnEquals: {
            "aws:PrincipalArn": Stack.of(scope).formatArn({
              service: "iam",
              resource: "role",
              region: "",
              account: props.hubAccountId,
              resourceName: getIntermediateRoleName(props.namespace),
            }),
          },
        },
      ),
    });

    const identityStoreArn = Stack.of(scope).formatArn({
      service: "identitystore",
      resource: "identitystore",
      region: "",
      arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
      resourceName: props.identityStoreId,
    });
    const instanceId = Fn.select(1, Fn.split("/", props.ssoInstanceArn));

    idcRole.attachInlinePolicy(
      new Policy(scope, "IdcRolePolicy", {
        statements: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ["identitystore:GetUserId", "identitystore:DescribeUser"],
            resources: [
              identityStoreArn,
              Stack.of(scope).formatArn({
                service: "identitystore",
                region: "",
                account: "",
                resource: "user",
                arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
                resourceName: "*",
              }),
            ],
          }),
          new PolicyStatement({
            effect: Effect.ALLOW,
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
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              "identitystore:ListGroupMembershipsForMember",
              "identitystore:ListGroupMemberships",
            ],
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
              Stack.of(scope).formatArn({
                service: "identitystore",
                region: "",
                account: "",
                resource: "membership",
                arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
                resourceName: "*",
              }),
              Stack.of(scope).formatArn({
                service: "identitystore",
                region: "",
                account: "",
                resource: "user",
                arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
                resourceName: "*",
              }),
            ],
          }),
          new PolicyStatement({
            effect: Effect.ALLOW,
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
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              "sso:CreateAccountAssignment",
              "sso:DeleteAccountAssignment",
              "sso:ListAccountAssignments",
            ],
            resources: [
              props.ssoInstanceArn,
              Stack.of(scope).formatArn({
                service: "sso",
                account: "",
                region: "",
                resource: "account",
                arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
                resourceName: "*",
              }),
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
        ],
      }),
    );

    addCfnGuardSuppression(idcRole, ["CFN_NO_EXPLICIT_RESOURCE_NAMES"]);

    const ssmParamIdcConfiguration = new aws_ssm.StringParameter(
      scope,
      "IdcConfiguration",
      {
        parameterName: sharedIdcSsmParamName(props.namespace),
        description: "The IDC configuration for Innovation Sandbox",
        stringValue: JSON.stringify({
          identityStoreId: props.identityStoreId,
          ssoInstanceArn: props.ssoInstanceArn,
          solutionVersion: props.solutionVersion,
          supportedSchemas: JSON.stringify(supportedSchemas),
        } satisfies IdcConfig),
        tier: ParameterTier.ADVANCED,
        simpleName: true,
      },
    );

    new aws_ram.CfnResourceShare(scope, "IdcConfigParameterShare", {
      name: `Isb-${props.namespace}-IdcConfigShare`,
      principals: [props.hubAccountId],
      resourceArns: [ssmParamIdcConfiguration.parameterArn],
      allowExternalPrincipals: false,
      permissionArns: [
        "arn:aws:ram::aws:permission/AWSRAMDefaultPermissionSSMParameterReadOnly",
      ],
    });
  }
}
