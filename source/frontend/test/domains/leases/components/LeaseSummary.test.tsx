// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { screen } from "@testing-library/react";
import { BrowserRouter as Router } from "react-router-dom";
import { describe, expect, test } from "vitest";

import { LeaseStatus } from "@amzn/innovation-sandbox-commons/data/lease/lease";
import { LeaseSummary } from "@amzn/innovation-sandbox-frontend/domains/leases/components/LeaseSummary";
import { getLeaseStatusDisplayName } from "@amzn/innovation-sandbox-frontend/domains/leases/helpers";
import {
  createActiveLease,
  createLease,
  createPendingLease,
} from "@amzn/innovation-sandbox-frontend/mocks/factories/leaseFactory";
import { renderWithQueryClient } from "@amzn/innovation-sandbox-frontend/setupTests";

describe("LeaseSummary", () => {
  const renderComponent = (lease: any) =>
    renderWithQueryClient(
      <Router>
        <LeaseSummary lease={lease} />
      </Router>,
    );

  test("renders active lease details correctly", () => {
    const activeLease = createActiveLease({
      status: "Active",
      approvedBy: "approver@example.com",
      totalCostAccrued: 500,
      maxSpend: 1000,
    });

    renderComponent(activeLease);

    expect(screen.getByText("Lease Summary")).toBeInTheDocument();
    expect(screen.getByText(activeLease.uuid)).toBeInTheDocument();
    expect(screen.getByText(activeLease.awsAccountId)).toBeInTheDocument();
    expect(
      screen.getByText(activeLease.originalLeaseTemplateName),
    ).toBeInTheDocument();
    expect(screen.getByText(activeLease.userEmail)).toBeInTheDocument();
    expect(screen.getByText("approver@example.com")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  test("handles lease without max spend", () => {
    const leaseWithoutMaxSpend = createActiveLease({
      maxSpend: undefined,
      status: "Active",
    });
    renderComponent(leaseWithoutMaxSpend);

    expect(screen.getByText("No max budget")).toBeInTheDocument();
  });

  test("renders correctly for different lease statuses", () => {
    const statuses: LeaseStatus[] = [
      "Active",
      "Frozen",
      "Expired",
      "BudgetExceeded",
      "ManuallyTerminated",
    ];

    statuses.forEach((status) => {
      const lease = createLease({ status });
      const { unmount } = renderComponent(lease);

      expect(
        screen.getByText(getLeaseStatusDisplayName(status)),
      ).toBeInTheDocument();
      unmount();
    });
  });

  test("displays auto-approved status correctly", () => {
    const autoApprovedLease = createActiveLease({
      approvedBy: "AUTO_APPROVED",
    });
    renderComponent(autoApprovedLease);
    expect(screen.getByText("Auto approved")).toBeInTheDocument();
  });

  test("renders pending lease details correctly", () => {
    const pendingLease = createPendingLease({
      status: "PendingApproval",
      comments: "Please approve this lease",
    });

    renderComponent(pendingLease);

    expect(screen.getByText("Lease Summary")).toBeInTheDocument();
    expect(screen.getByText(pendingLease.uuid)).toBeInTheDocument();
    expect(
      screen.getByText(pendingLease.originalLeaseTemplateName),
    ).toBeInTheDocument();
    expect(screen.getByText(pendingLease.userEmail)).toBeInTheDocument();
    expect(screen.getByText("Pending Approval")).toBeInTheDocument();
    expect(screen.getByText("Please approve this lease")).toBeInTheDocument();
  });
});
