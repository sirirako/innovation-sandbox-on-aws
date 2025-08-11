// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import {
  Account,
  ConcurrentModificationException,
  DescribeAccountCommand,
  ListAccountsForParentCommand,
  MoveAccountCommand,
  OrganizationalUnit,
  OrganizationsClient,
  paginateListAccountsForParent,
  paginateListOrganizationalUnitsForParent,
  TooManyRequestsException,
} from "@aws-sdk/client-organizations";

import { SandboxAccountStore } from "@amzn/innovation-sandbox-commons/data/sandbox-account/sandbox-account-store.js";
import {
  IsbOu,
  SandboxAccount,
  SandboxAccountStatus,
} from "@amzn/innovation-sandbox-commons/data/sandbox-account/sandbox-account.js";
import { Transaction } from "@amzn/innovation-sandbox-commons/utils/transactions.js";
import { backOff } from "exponential-backoff";

export class SandboxOuService {
  readonly orgsClient: OrganizationsClient;
  readonly namespace: string;
  readonly sandboxAccountStore: SandboxAccountStore;
  readonly sandboxOuId: string;

  constructor(props: {
    namespace: string;
    sandboxAccountStore: SandboxAccountStore;
    sandboxOuId: string;
    orgsClient: OrganizationsClient;
  }) {
    this.orgsClient = props.orgsClient;
    this.sandboxAccountStore = props.sandboxAccountStore;
    this.namespace = props.namespace;
    this.sandboxOuId = props.sandboxOuId;
  }

  private async listChildrenOus(
    parentId: string,
  ): Promise<OrganizationalUnit[]> {
    const listChildrenPaginator = paginateListOrganizationalUnitsForParent(
      {
        client: this.orgsClient,
      },
      {
        ParentId: parentId,
      },
    );
    const children: OrganizationalUnit[] = [];
    for await (const page of listChildrenPaginator) {
      if (page.OrganizationalUnits) {
        children.push(...page.OrganizationalUnits);
      }
    }
    return children;
  }

  async getIsbOu(ouName: IsbOu): Promise<OrganizationalUnit> {
    const sandboxOus = await this.listChildrenOus(this.sandboxOuId);
    for (const ou of sandboxOus) {
      if (ou.Name === ouName) {
        return ou;
      }
    }
    throw new Error(`Requested OU not found in Innovation Sandbox.`);
  }

  public async performAccountMoveAction(
    accountId: string,
    sourceOu: IsbOu,
    destinationOu: IsbOu,
  ) {
    const sourceOuId = (await this.getIsbOu(sourceOu))!.Id;
    const destinationOuId = (await this.getIsbOu(destinationOu))!.Id;

    await backOff(
      () =>
        this.orgsClient.send(
          new MoveAccountCommand({
            AccountId: accountId,
            SourceParentId: sourceOuId,
            DestinationParentId: destinationOuId,
          }),
        ),
      {
        numOfAttempts: 5,
        jitter: "full",
        startingDelay: 1000,
        retry(error) {
          if (
            error instanceof ConcurrentModificationException ||
            error instanceof TooManyRequestsException
          ) {
            return true;
          }
          return false;
        },
      },
    );
  }

  public async moveAccount(
    account: SandboxAccount,
    sourceOu: IsbOu,
    destinationOu: IsbOu,
  ) {
    await this.performAccountMoveAction(
      account.awsAccountId,
      sourceOu,
      destinationOu,
    );
    return this.sandboxAccountStore.put({
      ...account,
      status: destinationOu as SandboxAccountStatus,
    });
  }

  public transactionalMoveAccount(
    account: SandboxAccount,
    sourceOu: IsbOu,
    destinationOu: IsbOu,
  ) {
    return new Transaction({
      beginTransaction: () =>
        this.moveAccount(account, sourceOu, destinationOu),
      rollbackTransaction: async () => {
        await this.moveAccount(account, destinationOu, sourceOu); // NOSONAR typescript:S2234 - function parameters not matching the parameter names is intentional
      },
    });
  }

  public async listAllAccountsInOU(ouName: IsbOu) {
    const listAccountsPaginator = paginateListAccountsForParent(
      {
        client: this.orgsClient,
      },
      {
        ParentId: (await this.getIsbOu(ouName)).Id,
      },
    );

    const accounts: Account[] = [];
    for await (const page of listAccountsPaginator) {
      if (page.Accounts) {
        accounts.push(...page.Accounts);
      }
    }
    return accounts;
  }

  public async listAccountsInOU(options: {
    ouName: IsbOu;
    pageSize?: number;
    pageIdentifier?: string;
  }) {
    const { ouName, pageIdentifier, pageSize } = options;
    const { Accounts, NextToken } = await this.orgsClient.send(
      new ListAccountsForParentCommand({
        ParentId: (await this.getIsbOu(ouName)).Id,
        NextToken: pageIdentifier,
        MaxResults: pageSize,
      }),
    );

    return {
      accounts: Accounts,
      nextPageIdentifier: NextToken,
    };
  }

  public async describeAccount(options: { accountId: string }) {
    const { accountId } = options;
    const { Account } = await this.orgsClient.send(
      new DescribeAccountCommand({ AccountId: accountId }),
    );

    return (
      Account && {
        accountId: Account.Id,
        name: Account.Name,
        email: Account.Email,
      }
    );
  }
}
