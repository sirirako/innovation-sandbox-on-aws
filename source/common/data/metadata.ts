// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { nowAsIsoDatetimeString } from "@amzn/innovation-sandbox-commons/utils/time-utils.js";
import { z } from "zod";

export class SchemaMismatchException extends Error {}

export const MetadataSchema = z.object({
  createdTime: z.string().datetime().optional(),
  lastEditTime: z.string().datetime().optional(),
  schemaVersion: z.number().int(),
});

export const ItemWithMetadataSchema = z.object({
  meta: MetadataSchema.optional(),
});

export type Metadata = z.infer<typeof MetadataSchema>;
export type ItemWithMetadata = z.infer<typeof ItemWithMetadataSchema>;

export function checkSchema<T extends ItemWithMetadata>(
  item: T,
  schemaVersion: number,
): void {
  if (item.meta?.schemaVersion && item.meta?.schemaVersion !== schemaVersion) {
    throw new SchemaMismatchException();
  }
}

export function withUpdatedMetadata<T extends ItemWithMetadata>(
  item: T,
  schemaVersion: number,
): T {
  const now = nowAsIsoDatetimeString();

  return {
    ...item,
    meta: {
      schemaVersion,
      createdTime: item.meta?.createdTime ?? now,
      lastEditTime: now,
    },
  };
}
