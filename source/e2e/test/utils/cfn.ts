// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import * as cfn from "@aws-sdk/client-cloudformation";

export class CfnStackReader {
  readonly resources: cfn.StackResourceSummary[];
  readonly parameters: cfn.Parameter[];
  constructor(options: {
    resources: cfn.StackResourceSummary[];
    parameters: cfn.Parameter[];
  }) {
    const { resources, parameters } = options;
    this.resources = resources;
    this.parameters = parameters;
  }

  static async fromStackName(stackName: string) {
    const cfnClient = new cfn.CloudFormationClient();

    const paginatorConfig = {
      client: cfnClient,
      pageSize: 20,
    };

    const listStackResourcesPaginator = cfn.paginateListStackResources(
      paginatorConfig,
      {
        StackName: stackName,
      },
    );

    const resources: cfn.StackResourceSummary[] = [];
    for await (const {
      StackResourceSummaries,
    } of listStackResourcesPaginator) {
      if (StackResourceSummaries) {
        resources.push(...StackResourceSummaries);
      }
    }

    const describeStacksCommandResponse = await cfnClient.send(
      new cfn.DescribeStacksCommand({ StackName: stackName }),
    );
    const parameters = describeStacksCommandResponse.Stacks![0]?.Parameters!;

    return new CfnStackReader({ resources, parameters });
  }

  findResourceByPartialId(partialId: string, resourceType?: string) {
    return this.resources.find((resource: cfn.StackResourceSummary) => {
      return (
        resource.LogicalResourceId?.startsWith(partialId) &&
        (resource.ResourceType == resourceType || resourceType === undefined)
      );
    });
  }

  findParameterByName(parameterName: string) {
    return this.parameters.find((parameter: cfn.Parameter) => {
      return parameter.ParameterKey == parameterName;
    });
  }
}
