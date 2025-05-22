// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  mockActiveAccount,
  mockAvailableAccount,
  mockCleanUpAccount,
  mockQuarantineAccount,
  mockUnregisteredAccounts,
} from "@amzn/innovation-sandbox-frontend/mocks/factories/accountFactory";
import {
  mockAccountApi,
  mockUnregisteredAccountApi,
} from "@amzn/innovation-sandbox-frontend/mocks/mockApi";

export const mockAccounts = [
  mockAvailableAccount,
  mockActiveAccount,
  mockQuarantineAccount,
  mockCleanUpAccount,
];

// Set up the mock data
mockAccountApi.returns(mockAccounts);
mockUnregisteredAccountApi.returns(mockUnregisteredAccounts);

export const accountHandlers = [
  mockUnregisteredAccountApi.getHandler(),
  mockAccountApi.getHandler(),
  mockAccountApi.getHandler("/:id"),
  mockAccountApi.postHandler(),
  mockAccountApi.deleteHandler("/:id"),
  mockAccountApi.putHandler("/:id"),
];
