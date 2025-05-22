// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import {
  AwsAccountId,
  OptionalItem,
  PaginatedQueryResult,
  PutResult,
  SingleItemResult,
} from "@amzn/innovation-sandbox-commons/data/common-types.js";
import {
  SandboxAccount,
  SandboxAccountStatus,
} from "@amzn/innovation-sandbox-commons/data/sandbox-account/sandbox-account.js";
import { Transaction } from "@amzn/innovation-sandbox-commons/utils/transactions.js";

export abstract class SandboxAccountStore {
  abstract put(account: SandboxAccount): Promise<PutResult<SandboxAccount>>;

  transactionalPut(
    account: SandboxAccount,
  ): Transaction<PutResult<SandboxAccount>> {
    return new Transaction({
      beginTransaction: async () => {
        return this.put(account);
      },
      rollbackTransaction: async (putResult) => {
        if (putResult.oldItem) {
          await this.put(putResult.oldItem as SandboxAccount);
        } else {
          await this.delete(account.awsAccountId);
        }
      },
    });
  }

  abstract delete(accountId: AwsAccountId): Promise<OptionalItem>;

  abstract findByStatus(args: {
    status: SandboxAccountStatus;
    pageIdentifier?: string;
    pageSize?: number;
  }): Promise<PaginatedQueryResult<SandboxAccount>>;

  abstract findAll(args: {
    pageIdentifier?: string;
    pageSize?: number;
  }): Promise<PaginatedQueryResult<SandboxAccount>>;

  abstract get(
    accountId: AwsAccountId,
  ): Promise<SingleItemResult<SandboxAccount>>;
}
