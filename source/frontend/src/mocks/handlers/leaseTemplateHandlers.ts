// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  createAdvancedLeaseTemplate,
  createLeaseTemplate,
} from "@amzn/innovation-sandbox-frontend/mocks/factories/leaseTemplateFactory";
import { mockLeaseTemplateApi } from "@amzn/innovation-sandbox-frontend/mocks/mockApi";

export const mockBasicLeaseTemplate = createLeaseTemplate();
export const mockAdvancedLeaseTemplate = createAdvancedLeaseTemplate();
export const mockLeaseTemplates = [
  mockBasicLeaseTemplate,
  mockAdvancedLeaseTemplate,
];

mockLeaseTemplateApi.returns(mockLeaseTemplates);

export const leaseTemplateHandlers = [
  mockLeaseTemplateApi.getHandler(),
  mockLeaseTemplateApi.getHandler("/:id"),
  mockLeaseTemplateApi.postHandler(),
  mockLeaseTemplateApi.deleteHandler("/:id"),
  mockLeaseTemplateApi.putHandler("/:id"),
];
