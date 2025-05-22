// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  ItemWithMetadata,
  withUpdatedMetadata,
} from "@amzn/innovation-sandbox-commons/data/metadata.js";

describe("withUpdatedMeta function", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("creates new meta when none exists", () => {
    const date = new Date(2024, 9, 16, 12);
    vi.setSystemTime(date);

    expect(
      withUpdatedMetadata(
        {
          prop1: "prop",
          prop2: "prop2",
        } as ItemWithMetadata,
        2,
      ),
    ).toEqual({
      prop1: "prop",
      prop2: "prop2",
      meta: {
        schemaVersion: 2,
        createdTime: date.toISOString(),
        lastEditTime: date.toISOString(),
      },
    });
  });

  test("updates LastEditTime when meta already exists", () => {
    const createdDate = new Date(2024, 9, 16, 12);
    const editDate = new Date(2024, 9, 20, 12);
    vi.setSystemTime(editDate);

    expect(
      withUpdatedMetadata(
        {
          prop1: "prop",
          prop2: "prop2",
          meta: {
            schemaVersion: 2,
            createdTime: createdDate.toISOString(),
            lastEditTime: createdDate.toISOString(),
          },
        } as ItemWithMetadata,
        2,
      ),
    ).toEqual({
      prop1: "prop",
      prop2: "prop2",
      meta: {
        schemaVersion: 2,
        createdTime: createdDate.toISOString(),
        lastEditTime: editDate.toISOString(),
      },
    });
  });
});
