// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, test } from "vitest";

import {
  base64DecodeCompositeKey,
  base64EncodeCompositeKey,
} from "@amzn/innovation-sandbox-commons/data/encoding.js";

describe("lastEvaluatedKey Encording", () => {
  test("multi-part key can be encoded and decoded", () => {
    const key = {
      somePK: "partitionKey",
      someSK: "sortKey",
    };

    const encodedKey = base64EncodeCompositeKey(key);
    const decodedKey = base64DecodeCompositeKey(encodedKey!);

    expect(key).toEqual(decodedKey);
  });

  test("encoding undefined key returns null", () => {
    expect(base64EncodeCompositeKey(undefined)).toBeNull();
  });

  test("decoding undefined key returns undefined", () => {
    expect(base64DecodeCompositeKey(undefined)).toBeUndefined();
  });
});
