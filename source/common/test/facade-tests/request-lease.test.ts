// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { PaginatedQueryResult } from "@amzn/innovation-sandbox-commons/data/common-types.js";
import { GlobalConfigSchema } from "@amzn/innovation-sandbox-commons/data/global-config/global-config.js";
import { LeaseTemplateSchema } from "@amzn/innovation-sandbox-commons/data/lease-template/lease-template.js";
import {
  SandboxAccount,
  SandboxAccountSchema,
} from "@amzn/innovation-sandbox-commons/data/sandbox-account/sandbox-account.js";
import { LeaseApprovedEvent } from "@amzn/innovation-sandbox-commons/events/lease-approved-event.js";
import { LeaseRequestedEvent } from "@amzn/innovation-sandbox-commons/events/lease-requested-event.js";
import { InnovationSandbox } from "@amzn/innovation-sandbox-commons/innovation-sandbox.js";
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
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

function createMockContext() {
  const context = {
    isbEventBridgeClient: createMockOf(IsbEventBridgeClient),
    orgsService: mockedOrgsService(),
    idcService: mockedIdcService(),
    leaseStore: mockedLeaseStore(),
    sandboxAccountStore: mockedAccountStore(),
    globalConfig: generateSchemaData(GlobalConfigSchema),
    logger: new Logger(),
    tracer: new Tracer(),
  };

  context.globalConfig.leases.maxLeasesPerUser = 1;

  return context;
}

describe("InnovationSandbox.requestLease()", () => {
  let mockContext: ReturnType<typeof createMockContext>;
  let mockUser: IsbUser;

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

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ------------ Begin Tests ----------//
  test("HappyPath - Request lease requiring approval ", async () => {
    const result = await InnovationSandbox.requestLease(
      {
        leaseTemplate: generateSchemaData(LeaseTemplateSchema, {
          requiresApproval: true,
        }),
        forUser: mockUser,
      },
      mockContext,
    );

    //test is ordering sensitive on event content
    expect(mockContext.isbEventBridgeClient.sendIsbEvent).toHaveBeenCalledWith(
      mockContext.tracer,
      new LeaseRequestedEvent({
        leaseId: {
          userEmail: mockUser.email,
          uuid: result.uuid,
        },
        requiresManualApproval: true,
        userEmail: mockUser.email,
      }),
    );
  });

  test("HappyPath - Request lease auto-approved", async () => {
    const mockAvailableAccount = generateSchemaData(SandboxAccountSchema, {
      status: "Available",
    });

    mockContext.sandboxAccountStore.findByStatus.mockResolvedValueOnce({
      result: [mockAvailableAccount],
    } as PaginatedQueryResult<SandboxAccount>);

    const result = await InnovationSandbox.requestLease(
      {
        leaseTemplate: generateSchemaData(LeaseTemplateSchema, {
          requiresApproval: false,
        }),
        forUser: mockUser,
      },
      mockContext,
    );

    //approval event
    expect(mockContext.isbEventBridgeClient.sendIsbEvent).toHaveBeenCalledWith(
      mockContext.tracer,
      new LeaseApprovedEvent({
        leaseId: result.uuid,
        userEmail: mockUser.email,
        approvedBy: "AUTO_APPROVED",
      }),
    );
  });
});
