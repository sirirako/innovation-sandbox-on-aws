// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  RollbackFailedError,
  Transaction,
  TransactionFailedAndRolledBack,
  TransactionStep,
} from "@amzn/innovation-sandbox-commons/utils/transactions.js";

describe("transactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should complete all steps successfully", async () => {
    const step1: TransactionStep<void> = {
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      rollbackTransaction: vi.fn(),
    };
    const step2: TransactionStep<void> = {
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      rollbackTransaction: vi.fn(),
    };

    await new Transaction(step1, step2).complete();

    expect(step1.beginTransaction).toHaveBeenCalledTimes(1);
    expect(step2.beginTransaction).toHaveBeenCalledTimes(1);

    expect(step1.rollbackTransaction).not.toHaveBeenCalled();
    expect(step2.rollbackTransaction).not.toHaveBeenCalled();
  });

  it("should rollback successfully when a step fails", async () => {
    const step1: TransactionStep<void> = {
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      rollbackTransaction: vi.fn().mockResolvedValue(undefined),
    };
    const step2: TransactionStep<void> = {
      beginTransaction: vi.fn().mockRejectedValue(new Error("Step 2 failed")),
      rollbackTransaction: vi.fn().mockResolvedValue(undefined),
    };

    await expect(new Transaction(step1, step2).complete()).rejects.toThrow(
      TransactionFailedAndRolledBack,
    );

    expect(step1.beginTransaction).toHaveBeenCalledTimes(1);
    expect(step2.beginTransaction).toHaveBeenCalledTimes(1);

    expect(step1.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(step2.rollbackTransaction).not.toHaveBeenCalled();
  });

  it("should throw TransactionFailedToRollBackError a step and a rollback fail", async () => {
    const step1: TransactionStep<void> = {
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      rollbackTransaction: vi
        .fn()
        .mockRejectedValue(new Error("Step 1 rollback failed")),
    };
    const step2: TransactionStep<void> = {
      beginTransaction: vi.fn().mockRejectedValue(new Error("Step 2 failed")),
      rollbackTransaction: vi.fn().mockResolvedValue(undefined),
    };

    await expect(new Transaction(step1, step2).complete()).rejects.toThrow(
      RollbackFailedError,
    );

    expect(step1.beginTransaction).toHaveBeenCalledTimes(1);
    expect(step2.beginTransaction).toHaveBeenCalledTimes(1);

    expect(step1.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(step2.rollbackTransaction).toHaveBeenCalledTimes(0);
  });
});
