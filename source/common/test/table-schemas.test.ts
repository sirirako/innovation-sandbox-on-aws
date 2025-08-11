// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * maintaining accurate and consistent schema versions for all tables is critical to the update methodology
 * of the solution (described in ADR-0002)
 *
 * this file tests that all schemas match their specified schema version. if a test fails, the test should be
 * updated to pass ONLY after verifying that schema versions have been correctly maintained.
 *
 * rules for updating schema version:
 *   - if any fields have been added or changed since the last public release of the solution, the schema version
 *   must be incremented exactly once for the next release of the solution.
 *   - changes to any schema must also include a migration script and related migration test (under test/migration)
 *   that ensures data can be safely migrated.
 */
import objectHash from "object-hash";
import { expect, test } from "vitest";

import {
  LeaseTemplateSchema,
  LeaseTemplateSchemaVersion,
} from "@amzn/innovation-sandbox-commons/data/lease-template/lease-template.js";
import {
  ApprovalDeniedLeaseSchema,
  ExpiredLeaseSchema,
  LeaseSchemaVersion,
  MonitoredLeaseSchema,
  PendingLeaseSchema,
} from "@amzn/innovation-sandbox-commons/data/lease/lease.js";
import {
  SandboxAccountSchema,
  SandboxAccountSchemaVersion,
} from "@amzn/innovation-sandbox-commons/data/sandbox-account/sandbox-account.js";

test("LeaseTemplate Schema Version", () => {
  //Changes to this test have critical upgrade path implications as detailed at the top of this file
  expect(objectHash.sha1(LeaseTemplateSchema.shape)).toMatchInlineSnapshot(
    `"b87596d95cf3fe2c11a4b8623bf14bfa0bbbaf27"`,
  );
  expect(LeaseTemplateSchemaVersion).toEqual(1);
});

test("Lease Schema Version", () => {
  //Changes to this test have critical upgrade path implications as detailed at the top of this file
  expect(objectHash.sha1(PendingLeaseSchema.shape)).toMatchInlineSnapshot(
    `"3d1e785bdbe3321319eccbed7dd40ba7ef759ba3"`,
  );
  expect(
    objectHash.sha1(ApprovalDeniedLeaseSchema.shape),
  ).toMatchInlineSnapshot(`"4a9b009d83da7b5eae1c91582bed9f2d7e0d4987"`);
  expect(objectHash.sha1(MonitoredLeaseSchema.shape)).toMatchInlineSnapshot(
    `"92298a744f37340280b2fa502fed80077a757a98"`,
  );
  expect(objectHash.sha1(ExpiredLeaseSchema.shape)).toMatchInlineSnapshot(
    `"6afa4cf730e47c0eaa3e48e33eebcf40622df801"`,
  );
  expect(LeaseSchemaVersion).toEqual(1);
});

test("SandboxAccount Schema Version", () => {
  //Changes to this test have critical upgrade path implications as detailed at the top of this file
  expect(objectHash.sha1(SandboxAccountSchema.shape)).toMatchInlineSnapshot(
    `"9b93e663009c6ad7b1b9bc1e38be8b432da8f933"`,
  );
  expect(SandboxAccountSchemaVersion).toEqual(1);
});
