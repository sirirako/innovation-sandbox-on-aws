// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MonitoredLease } from "@amzn/innovation-sandbox-commons/data/lease/lease";
import { createActiveLease } from "@amzn/innovation-sandbox-frontend/mocks/factories/leaseFactory";
import { mockLeaseApi } from "@amzn/innovation-sandbox-frontend/mocks/mockApi";

export const mockLease: MonitoredLease = createActiveLease();
mockLeaseApi.returns([mockLease]);

export const leaseHandlers = [
  mockLeaseApi.getHandler(),
  mockLeaseApi.getHandler("/:id"),
  mockLeaseApi.patchHandler("/:id"),
  mockLeaseApi.postHandler("/request"),
  mockLeaseApi.reviewHandler("/review"),
];
