// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export type Uuid = string;
export type EmailAddress = string;
export type AwsAccountId = string;

export type PaginatedQueryResult<T> = {
  error?: string;
  result: T[];
  nextPageIdentifier: string | null;
};

export type PutResult<T> = {
  oldItem?: Record<string, any>;
  newItem: T;
};

export type SingleItemResult<T> = {
  error?: string;
  result?: T;
};

export type OptionalItem = Record<string, any> | undefined;
