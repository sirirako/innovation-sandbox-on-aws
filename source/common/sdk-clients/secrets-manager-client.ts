// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

export class IsbSecretsManagerClient extends SecretsManagerClient {
  constructor(...args: ConstructorParameters<typeof SecretsManagerClient>) {
    super(...args);
  }

  async getStringSecret(secretName: string): Promise<string> {
    const response = await this.send(
      new GetSecretValueCommand({
        SecretId: secretName,
      }),
    );
    if ("SecretString" in response && response.SecretString) {
      return response.SecretString;
    } else {
      throw new Error("Secret is empty or not found.");
    }
  }

  /**
   * returns the <secretName, secretValue> pairs
   * @param secretNames
   */
  async getStringSecrets(
    ...secretNames: string[]
  ): Promise<{ [key: string]: string | null }> {
    const results: Awaited<{ name: string; value: string }>[] =
      await Promise.all(
        secretNames.map((name) =>
          this.getStringSecret(name).then((value) => ({ name, value })),
        ),
      );

    return results.reduce(
      (acc, result) => {
        acc[result.name] = result.value;
        return acc;
      },
      {} as { [key: string]: string | null },
    );
  }
}
