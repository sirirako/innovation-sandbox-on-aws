// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { AssumeRoleCommand, STSClient } from "@aws-sdk/client-sts";

const stsClient = new STSClient();

export async function getClientCredentials(props: {
  accountId: string;
  roleName: string;
}) {
  const { accountId, roleName } = props;
  const { Credentials } = await stsClient.send(
    new AssumeRoleCommand({
      RoleArn: `arn:aws:iam::${accountId}:role/${roleName}`,
      RoleSessionName: "isb-e2e-tests",
    }),
  );
  return {
    accountId,
    accessKeyId: Credentials?.AccessKeyId!,
    secretAccessKey: Credentials?.SecretAccessKey!,
    sessionToken: Credentials?.SessionToken!,
  };
}
