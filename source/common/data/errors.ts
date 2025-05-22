// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export class ConcurrentDataModificationException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConcurrentDataModificationException";
  }
}

export class UnknownItem extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnknownItem";
  }
}

export class ItemAlreadyExists extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ItemAlreadyExists";
  }
}
