// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { PaginatedQueryResult } from "@amzn/innovation-sandbox-commons/data/common-types.js";
import {
  MonitoredLease,
  PendingLeaseSchema,
} from "@amzn/innovation-sandbox-commons/data/lease/lease.js";
import {
  SandboxAccount,
  SandboxAccountSchema,
} from "@amzn/innovation-sandbox-commons/data/sandbox-account/sandbox-account.js";
import { InnovationSandbox } from "@amzn/innovation-sandbox-commons/innovation-sandbox.js";
import {
  searchableAccountProperties,
  searchableLeaseProperties,
} from "@amzn/innovation-sandbox-commons/observability/logging.js";
import { IsbEventBridgeClient } from "@amzn/innovation-sandbox-commons/sdk-clients/event-bridge-client.js";
import { generateSchemaData } from "@amzn/innovation-sandbox-commons/test/generate-schema-data.js";
import {
  mockedAccountStore,
  mockedIdcService,
  mockedLeaseStore,
  mockedOrgsService,
} from "@amzn/innovation-sandbox-commons/test/mocking/common-mocks.js";
import { createMockOf } from "@amzn/innovation-sandbox-commons/test/mocking/mock-utils.js";
import {
  IsbUser,
  IsbUserSchema,
} from "@amzn/innovation-sandbox-commons/types/isb-types.js";
import { Logger } from "@aws-lambda-powertools/logger";
import { Tracer } from "@aws-lambda-powertools/tracer";
import { DateTime } from "luxon";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

function createMockContext() {
  return {
    isbEventBridgeClient: createMockOf(IsbEventBridgeClient),
    orgsService: mockedOrgsService(),
    idcService: mockedIdcService(),
    leaseStore: mockedLeaseStore(),
    sandboxAccountStore: mockedAccountStore(),
    logger: createMockOf(Logger),
    tracer: new Tracer(),
  };
}

const currentDateTime = DateTime.fromISO("2024-12-20T08:45:00.000Z", {
  zone: "utc",
}) as DateTime<true>;

describe("InnovationSandbox.approveLease()", () => {
  let mockContext: ReturnType<typeof createMockContext>;
  let mockUser: IsbUser;

  const mockAvailableAccount = generateSchemaData(SandboxAccountSchema, {
    status: "Available",
  });

  beforeEach(() => {
    mockContext = createMockContext();
    mockUser = generateSchemaData(IsbUserSchema);

    mockContext.idcService.getUserFromEmail.mockImplementation(
      async (email) => {
        if (email === mockUser.email) {
          return mockUser;
        } else {
          throw new Error("Invalid ISB User.");
        }
      },
    );

    mockContext.sandboxAccountStore.findByStatus.mockResolvedValue({
      result: [mockAvailableAccount],
    } as PaginatedQueryResult<SandboxAccount>);

    vi.useFakeTimers();
    vi.setSystemTime(currentDateTime.toJSDate());
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  test("Writes approved lease to DB", async () => {
    const leaseToApprove = generateSchemaData(PendingLeaseSchema, {
      status: "PendingApproval",
      leaseDurationInHours: 100,
      userEmail: mockUser.email,
    });
    const approver = {
      email: "HappyManager@managers.com",
    };

    await InnovationSandbox.approveLease(
      {
        lease: leaseToApprove,
        approver: approver,
      },
      mockContext,
    );

    const expectedSavedLease: MonitoredLease = {
      ...leaseToApprove,
      status: "Active",
      approvedBy: approver.email,
      awsAccountId: mockAvailableAccount.awsAccountId,
      startDate: currentDateTime.toISO(),
      expirationDate: currentDateTime.plus({ hour: 100 }).toISO(),
      lastCheckedDate: currentDateTime.toISO(),
      totalCostAccrued: 0,
    };

    expect(mockContext.orgsService.moveAccount).toHaveBeenCalledWith(
      mockAvailableAccount,
      "Available",
      "Active",
    );
    expect(mockContext.leaseStore.update).toHaveBeenCalledWith(
      expectedSavedLease,
    );
  });

  test("Writes LeaseApproval metric correctly", async () => {
    const leaseToApprove = generateSchemaData(PendingLeaseSchema, {
      status: "PendingApproval",
      leaseDurationInHours: 100,
      userEmail: mockUser.email,
    });
    const approver = {
      email: "HappyManager@managers.com",
    };

    await InnovationSandbox.approveLease(
      {
        lease: leaseToApprove,
        approver: approver,
      },
      mockContext,
    );

    expect(mockContext.logger.info).toHaveBeenCalledWith(
      `(HappyManager@managers.com) approved lease for (${mockUser.email})`,
      {
        ...searchableLeaseProperties(leaseToApprove),
        ...searchableAccountProperties(mockAvailableAccount),
        logDetailType: "LeaseApproved",
        maxBudget: leaseToApprove.maxSpend,
        maxDurationHours: leaseToApprove.leaseDurationInHours,
        autoApproved: false,
      },
    );
  });
});
