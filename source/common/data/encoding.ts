// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
export function base64EncodeCompositeKey(
  key: Record<string, any> | undefined,
): string | null {
  if (key === undefined) {
    return null;
  }

  const jsonStr = JSON.stringify(key);
  return Buffer.from(jsonStr, "utf8").toString("base64");
}

export function base64DecodeCompositeKey(
  encodedKey: string | undefined,
): Record<string, any> | undefined {
  if (encodedKey === undefined) {
    return undefined;
  }

  const jsonStr = Buffer.from(encodedKey, "base64").toString("utf8");
  return JSON.parse(jsonStr);
}
