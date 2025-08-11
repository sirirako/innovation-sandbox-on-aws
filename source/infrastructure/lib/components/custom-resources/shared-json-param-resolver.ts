// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { Construct } from "constructs";
import path from "path";

import { SharedJsonParamEnvironmentSchema } from "@amzn/innovation-sandbox-commons/lambda/environments/shared-json-param-parser-environment.js";
import { IsbLambdaFunctionCustomResource } from "@amzn/innovation-sandbox-infrastructure/components/isb-lambda-function-custom-resource";
import { SharedJsonParamArns } from "@amzn/innovation-sandbox-shared-json-param-parser/src/shared-json-param-parser-handler.js";
import { Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";

export type SharedJsonParamResolverProps = SharedJsonParamArns & {
  namespace: string;
};

export class SharedJsonParamResolver extends Construct {
  //Idc
  public readonly identityStoreId: string;
  public readonly ssoInstanceArn: string;
  public readonly idcSolutionVersion: string;
  public readonly idcSupportedSchemas: string;
  //AccountPool
  public readonly sandboxOuId: string;
  public readonly accountPoolSolutionVersion: string;
  public readonly accountPoolSupportedSchemas: string;
  public readonly isbManagedRegions: string;
  //Data
  public readonly configApplicationId: string;
  public readonly configEnvironmentId: string;
  public readonly globalConfigConfigurationProfileId: string;
  public readonly nukeConfigConfigurationProfileId: string;
  public readonly accountTable: string;
  public readonly leaseTemplateTable: string;
  public readonly leaseTable: string;
  public readonly tableKmsKeyId: string;
  public readonly dataSolutionVersion: string;
  public readonly dataSupportedSchemas: string;

  constructor(
    scope: Construct,
    id: string,
    props: SharedJsonParamResolverProps,
  ) {
    super(scope, id);

    const sharedJsonParamCR = new IsbLambdaFunctionCustomResource(
      this,
      "ParseJsonConfiguration",
      {
        description: "Parses configuration passed in JSON format",
        entry: path.join(
          __dirname,
          "..",
          "..",
          "..",
          "..",
          "lambdas",
          "custom-resources",
          "shared-json-param-parser",
          "src",
          "shared-json-param-parser-handler.ts",
        ),
        handler: "handler",
        namespace: props.namespace,
        envSchema: SharedJsonParamEnvironmentSchema,
        environment: {},
        customResourceType: "Custom::ParseJsonConfiguration",
        customResourceProperties: {
          ...props,
          forceUpdate: new Date().getTime(), // forces the custom resource to run on all updates
        },
      },
    );

    const ssmReadPolicy = new Policy(scope, "SharedParamReaderSsmReadPolicy", {
      statements: [
        new PolicyStatement({
          actions: ["ssm:GetParameter"],
          resources: [
            props.idcConfigParamArn,
            props.accountPoolConfigParamArn,
            props.dataConfigParamArn,
          ],
        }),
      ],
    });

    sharedJsonParamCR.lambdaFunction.role?.attachInlinePolicy(ssmReadPolicy);

    //Idc
    this.identityStoreId =
      sharedJsonParamCR.customResource.getAttString("identityStoreId");
    this.ssoInstanceArn =
      sharedJsonParamCR.customResource.getAttString("ssoInstanceArn");
    this.idcSolutionVersion =
      sharedJsonParamCR.customResource.getAttString("idcSolutionVersion");
    this.idcSupportedSchemas = sharedJsonParamCR.customResource.getAttString(
      "idcSupportedSchemas",
    );
    //AccountPool
    this.sandboxOuId =
      sharedJsonParamCR.customResource.getAttString("sandboxOuId");
    this.accountPoolSolutionVersion =
      sharedJsonParamCR.customResource.getAttString(
        "accountPoolSolutionVersion",
      );
    this.accountPoolSupportedSchemas =
      sharedJsonParamCR.customResource.getAttString(
        "accountPoolSupportedSchemas",
      );
    this.isbManagedRegions =
      sharedJsonParamCR.customResource.getAttString("isbManagedRegions");
    //Data
    this.configApplicationId = sharedJsonParamCR.customResource.getAttString(
      "configApplicationId",
    );
    this.configEnvironmentId = sharedJsonParamCR.customResource.getAttString(
      "configEnvironmentId",
    );
    this.globalConfigConfigurationProfileId =
      sharedJsonParamCR.customResource.getAttString(
        "globalConfigConfigurationProfileId",
      );
    this.nukeConfigConfigurationProfileId =
      sharedJsonParamCR.customResource.getAttString(
        "nukeConfigConfigurationProfileId",
      );
    this.accountTable =
      sharedJsonParamCR.customResource.getAttString("accountTable");
    this.leaseTemplateTable =
      sharedJsonParamCR.customResource.getAttString("leaseTemplateTable");
    this.leaseTable =
      sharedJsonParamCR.customResource.getAttString("leaseTable");
    this.tableKmsKeyId =
      sharedJsonParamCR.customResource.getAttString("tableKmsKeyId");
    this.dataSolutionVersion = sharedJsonParamCR.customResource.getAttString(
      "dataSolutionVersion",
    );
    this.dataSupportedSchemas = sharedJsonParamCR.customResource.getAttString(
      "dataSupportedSchemas",
    );
  }
}
