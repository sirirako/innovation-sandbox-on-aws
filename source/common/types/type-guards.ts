// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

//useful for exhaustiveness checking
export function assertNever(_value: never): never {
  throw new Error(`Received unexpected value.`);
}
