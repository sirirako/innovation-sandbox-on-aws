// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { SandboxAccount } from "@amzn/innovation-sandbox-commons/data/sandbox-account/sandbox-account";

type GenerateAccountBreadcrumbArgs = {
  isLoading?: boolean;
  isError?: boolean;
  account?: SandboxAccount;
};

export const generateAccountBreadcrumb = ({
  isLoading,
  isError,
  account,
}: GenerateAccountBreadcrumbArgs) => {
  const breadcrumbItems = [
    { text: "Home", href: "/" },
    { text: "Accounts", href: "/accounts" },
  ];

  if (isLoading) {
    breadcrumbItems.push({ text: "Loading...", href: "#" });
  }

  if (isError) {
    breadcrumbItems.push({ text: "Error", href: "#" });
  }

  if (account) {
    breadcrumbItems.push({
      text: account.awsAccountId,
      href: `/accounts/${account?.awsAccountId}`,
    });
    breadcrumbItems.push({ text: "Add Account", href: "#" });
  }

  return breadcrumbItems;
};

export const accountStatusSortingComparator = (
  a: SandboxAccount,
  b: SandboxAccount,
): number => {
  const statusOrder = {
    Quarantine: 1,
    Frozen: 2,
    Active: 3,
    CleanUp: 4,
    Available: 5,
  };

  const statusA = statusOrder[a.status] || Number.MAX_VALUE;
  const statusB = statusOrder[b.status] || Number.MAX_VALUE;

  return statusA - statusB;
};
