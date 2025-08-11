// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { GenerateMockOptions, generateMock } from "@anatine/zod-mock";
import { z } from "zod";

export const generateSchemaData = <T extends z.ZodTypeAny>(
  schema: T,
  overrides?: Partial<z.infer<T>>,
  options?: GenerateMockOptions,
): z.infer<T> => ({
  ...generateMock(schema, options),
  ...overrides,
});
