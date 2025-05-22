// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { Logger } from "@aws-lambda-powertools/logger";

const logger = new Logger();

export class TransactionFailedAndRolledBack extends Error {}
export class RollbackFailedError extends Error {}

export type TransactionStep<T> = {
  beginTransaction: () => Promise<T>;
  rollbackTransaction: (result: T) => Promise<void>;
};

type WrappedTransactionStep<T> = TransactionStep<T> & {
  result?: T;
  isComplete: boolean;
};

function wrapStep<T>(step: TransactionStep<T>) {
  return {
    isComplete: false,
    ...step,
  };
}

/**
 * Transaction represent a collection of actions that are performed ***in parallel*** and must all
 * complete successfully or will otherwise all be rolled back
 */
export class Transaction<T> implements TransactionStep<T> {
  readonly steps: WrappedTransactionStep<any>[];
  readonly resultProvider: WrappedTransactionStep<T>;
  readonly beginTransaction = this._beginTransaction;
  readonly rollbackTransaction = this._rollbackTransaction;

  constructor(
    primaryStep: TransactionStep<T>,
    ...additionalSteps: TransactionStep<any>[]
  ) {
    // Validate primary step
    if (
      !primaryStep ||
      typeof primaryStep.beginTransaction !== "function" ||
      typeof primaryStep.rollbackTransaction !== "function"
    ) {
      throw new Error("Invalid primary step: missing required methods.");
    }

    // Validate additional steps
    additionalSteps.forEach((step, index) => {
      if (
        !step ||
        typeof step.beginTransaction !== "function" ||
        typeof step.rollbackTransaction !== "function"
      ) {
        throw new Error(
          `Invalid step at index ${index}: missing required methods.`,
        );
      }
    });

    this.resultProvider = wrapStep(primaryStep);
    this.steps = [
      this.resultProvider,
      ...additionalSteps.map((step) => wrapStep(step)),
    ];
  }

  public async complete() {
    try {
      return await this.beginTransaction();
    } catch (error) {
      await this.rollbackTransaction();
      throw new TransactionFailedAndRolledBack(`Transaction Failed: ${error}`, {
        cause: error,
      });
    }
  }

  private async _beginTransaction() {
    for (const step of this.steps) {
      step.result = await step.beginTransaction();
      step.isComplete = true;
    }
    return this.resultProvider.result!;
  }

  private async _rollbackTransaction() {
    const rollbackErrors: Error[] = [];

    for (const step of [...this.steps].reverse()) {
      try {
        if (step.isComplete) {
          await step.rollbackTransaction(step.result);
        }
      } catch (rollbackError) {
        logger.error(`Error during rollback: ${rollbackError}`);
        rollbackErrors.push(rollbackError as Error);
      }
    }

    if (rollbackErrors.length > 0) {
      throw new RollbackFailedError(
        `Transaction rollback failed: [${rollbackErrors.map((error) => error.name + ": " + error.message).join(", ")}]`,
      );
    }
  }
}
