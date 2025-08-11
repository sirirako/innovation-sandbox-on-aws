// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { SSM_PARAM_NAME_PREFIX } from "@amzn/innovation-sandbox-commons/types/isb-types.js";
import {
  GetParameterCommand,
  ParameterNotFound,
  SSMClient,
  paginateGetParametersByPath,
} from "@aws-sdk/client-ssm";

export class IsbSSMClient extends SSMClient {
  constructor(...args: ConstructorParameters<typeof SSMClient>) {
    super(...args);
  }

  async getIsbParameter(name: string): Promise<string> {
    const response = await this.send(
      new GetParameterCommand({
        Name: name,
      }),
    );
    if (!response.Parameter || !response.Parameter.Value) {
      throw ParameterNotFound;
    }
    return response.Parameter.Value;
  }

  /**
   * fetches all parameters with the ISB common prefix and returns the requested parameters as key value pairs
   * @param names
   */
  async getIsbParameters(
    ...names: string[]
  ): Promise<{ [key: string]: string | null }> {
    const paginator = paginateGetParametersByPath(
      { client: this },
      {
        Path: SSM_PARAM_NAME_PREFIX + "/",
        Recursive: true,
      },
    );

    const parameters: { [key: string]: string | null } = {};
    for await (const { Parameters } of paginator) {
      if (Parameters) {
        Parameters.forEach((param) => {
          if (param.Name && param.Value && names.includes(param.Name)) {
            parameters[param.Name] = param.Value;
          }
        });
      }
    }
    return parameters;
  }
}
