// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  SandboxAccount,
  SandboxAccountSchema,
} from "@amzn/innovation-sandbox-commons/data/sandbox-account/sandbox-account.js";
import { generateSchemaData } from "@amzn/innovation-sandbox-commons/test/generate-schema-data.js";
import { UnregisteredAccount } from "@amzn/innovation-sandbox-frontend/domains/accounts/types";

export function createSandboxAccount(
  overrides?: Partial<SandboxAccount>,
): SandboxAccount {
  return generateSchemaData(SandboxAccountSchema, overrides);
}

export const mockAvailableAccount = createSandboxAccount({
  status: "Available",
});
export const mockActiveAccount = createSandboxAccount({ status: "Active" });
export const mockQuarantineAccount = createSandboxAccount({
  status: "Quarantine",
});
export const mockCleanUpAccount = createSandboxAccount({
  status: "CleanUp",
});

export const mockUnregisteredAccounts: UnregisteredAccount[] = [
  {
    Id: "123456789012",
    Email: "test1@example.com",
    Name: "Test Account 1",
  },
  {
    Id: "210987654321",
    Email: "test2@example.com",
    Name: "Test Account 2",
  },
];
