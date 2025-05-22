// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import createWrapper, {
  ButtonWrapper,
} from "@cloudscape-design/components/test-utils/dom";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ListLeases } from "@amzn/innovation-sandbox-frontend/domains/leases/pages/ListLeases";
import { config } from "@amzn/innovation-sandbox-frontend/helpers/config";
import { ModalProvider } from "@amzn/innovation-sandbox-frontend/hooks/useModal";
import { createConfiguration } from "@amzn/innovation-sandbox-frontend/mocks/factories/configurationFactory";
import {
  createActiveLease,
  createExpiredLease,
  createPendingLease,
} from "@amzn/innovation-sandbox-frontend/mocks/factories/leaseFactory";
import {
  mockConfigurationApi,
  mockLeaseApi,
} from "@amzn/innovation-sandbox-frontend/mocks/mockApi";
import { server } from "@amzn/innovation-sandbox-frontend/mocks/server";
import { renderWithQueryClient } from "@amzn/innovation-sandbox-frontend/setupTests";

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock the useBreadcrumb hook
vi.mock("@amzn/innovation-sandbox-frontend/hooks/useBreadcrumb", () => ({
  useBreadcrumb: () => vi.fn(),
}));

// Mock the navigate function
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock(
  "@amzn/innovation-sandbox-frontend/components/BudgetProgressBar",
  () => ({
    BudgetProgressBar: ({
      currentValue,
      maxValue,
    }: {
      currentValue: number;
      maxValue: number;
    }) => (
      <div
        data-testid="budget-progress-bar"
        data-current={currentValue}
        data-max={maxValue}
      />
    ),
  }),
);

describe("ListLeases", () => {
  const renderComponent = () =>
    renderWithQueryClient(
      <ModalProvider>
        <BrowserRouter>
          <ListLeases />
        </BrowserRouter>
      </ModalProvider>,
    );

  const mockActiveLease = createActiveLease({
    userEmail: "test@example.com",
    originalLeaseTemplateName: "Basic Template",
    status: "Active",
    awsAccountId: "123456789012",
    totalCostAccrued: 100,
    maxSpend: 1000,
  });

  const mockPendingLease = createPendingLease({
    userEmail: "pending@example.com",
    originalLeaseTemplateName: "Advanced Template",
    status: "PendingApproval",
  });

  const mockExpiredLease = createExpiredLease({
    userEmail: "expired@example.com",
    originalLeaseTemplateName: "Expired Template",
    status: "Expired",
    awsAccountId: "210987654321",
  });

  beforeEach(() => {
    const mockConfig = createConfiguration({
      auth: {
        awsAccessPortalUrl: "https://test.aws.amazon.com/access-portal",
        webAppUrl: "https://test.aws.amazon.com",
      },
    });
    mockConfigurationApi.returns(mockConfig);
    server.use(mockConfigurationApi.getHandler());
  });

  test("renders the header correctly", async () => {
    renderComponent();
    const wrapper = createWrapper();
    const header = wrapper.findHeader();
    expect(header?.findHeadingText()?.getElement()).toHaveTextContent("Leases");
    expect(header?.findDescription()?.getElement()).toHaveTextContent(
      "Manage sandbox account leases",
    );
  });

  test("displays active leases by default", async () => {
    const mockLeases = [mockActiveLease, mockPendingLease, mockExpiredLease];
    mockLeaseApi.returns(mockLeases);
    server.use(mockLeaseApi.getHandler());

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(mockActiveLease.userEmail)).toBeInTheDocument();
      expect(
        screen.getByText(mockActiveLease.originalLeaseTemplateName),
      ).toBeInTheDocument();
      expect(
        screen.getByText(mockActiveLease.awsAccountId),
      ).toBeInTheDocument();

      // Ensure pending and expired leases are not initially displayed
      expect(
        screen.queryByText(mockPendingLease.userEmail),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(mockExpiredLease.userEmail),
      ).not.toBeInTheDocument();
    });
  });

  test("displays 'No items to display' when no leases", async () => {
    mockLeaseApi.returns([]);
    server.use(mockLeaseApi.getHandler());

    renderComponent();

    await waitFor(() => {
      const wrapper = createWrapper();
      const table = wrapper.findTable();
      expect(table?.findEmptySlot()?.getElement()).toHaveTextContent(
        "No items to display",
      );
    });
  });

  test("allows filtering by status", async () => {
    const mockLeases = [mockActiveLease, mockPendingLease, mockExpiredLease];
    mockLeaseApi.returns(mockLeases);
    server.use(mockLeaseApi.getHandler());

    renderComponent();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByTestId("status-filter")).toBeInTheDocument();
    });

    const statusFilter = screen.getByTestId("status-filter");

    const chooseOptionsButton =
      within(statusFilter).getByText("Choose options");
    await user.click(chooseOptionsButton);

    await waitFor(() => {
      const dropdownButton = within(statusFilter).getByRole("button", {
        name: "Choose options",
      });
      expect(dropdownButton).toHaveAttribute("aria-expanded", "true");
    });

    const options = await screen.findAllByRole("option");

    const activeOption = options.find((option) =>
      option.textContent!.includes("Active"),
    );
    if (activeOption) await user.click(activeOption);

    const pendingOption = options.find((option) =>
      option.textContent!.includes("Pending Approval"),
    );
    if (pendingOption) await user.click(pendingOption);

    await waitFor(() => {
      expect(screen.getByText(mockPendingLease.userEmail)).toBeInTheDocument();
      expect(
        screen.queryByText(mockActiveLease.userEmail),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(mockExpiredLease.userEmail),
      ).not.toBeInTheDocument();
    });

    const selectedOptions = within(statusFilter).getAllByRole("group");
    expect(selectedOptions).toHaveLength(1);
    expect(selectedOptions[0]).toHaveTextContent("Pending Approval");
  });

  test("displays AWS account information and login link", async () => {
    mockLeaseApi.returns([mockActiveLease]);
    server.use(mockLeaseApi.getHandler());

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText(mockActiveLease.awsAccountId),
      ).toBeInTheDocument();
      expect(screen.getByText("Login to account")).toBeInTheDocument();
    });

    const loginButton = screen.getByText("Login to account");
    expect(loginButton).toBeInTheDocument();
  });

  test("allows selecting and deselecting leases", async () => {
    mockLeaseApi.returns([mockActiveLease, mockPendingLease]);
    server.use(mockLeaseApi.getHandler());

    renderComponent();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText(mockActiveLease.userEmail)).toBeInTheDocument();
    });

    const checkbox = screen.getAllByRole("checkbox")[1]; // First checkbox after "select all"
    await user.click(checkbox);

    const actionsButton = screen.getByText("Actions").closest("button");
    expect(actionsButton).not.toBeDisabled();

    await user.click(checkbox);

    expect(actionsButton).toBeDisabled();
  });

  test("opens terminate modal when 'Terminate' action is selected", async () => {
    mockLeaseApi.returns([mockActiveLease]);
    server.use(mockLeaseApi.getHandler());

    renderComponent();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText(mockActiveLease.userEmail)).toBeInTheDocument();
    });

    const checkbox = screen.getAllByRole("checkbox")[1];
    await user.click(checkbox);

    const actionsButton = screen.getByText("Actions");
    await user.click(actionsButton);

    const terminateOption = await screen.findByText("Terminate");
    await user.click(terminateOption);

    const modal = screen.getByRole("dialog");
    await waitFor(() => {
      expect(modal).toBeInTheDocument();
    });

    const modalContent = within(modal);

    expect(modalContent.getByText("Terminate Lease(s)")).toBeInTheDocument();

    await waitFor(() =>
      expect(
        modalContent.getByText(mockActiveLease.awsAccountId),
      ).toBeInTheDocument(),
    );
  });

  test("opens freeze modal when 'Freeze' action is selected", async () => {
    mockLeaseApi.returns([mockActiveLease]);
    server.use(mockLeaseApi.getHandler());

    renderComponent();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText(mockActiveLease.userEmail)).toBeInTheDocument();
    });

    const checkbox = screen.getAllByRole("checkbox")[1];
    await user.click(checkbox);

    const actionsButton = screen.getByText("Actions");
    await user.click(actionsButton);

    const freezeOption = await screen.findByText("Freeze");
    await user.click(freezeOption);

    const modal = screen.getByRole("dialog");
    await waitFor(() => {
      expect(modal).toBeInTheDocument();
    });

    const modalContent = within(modal);

    expect(modalContent.getByText("Freeze Lease(s)")).toBeInTheDocument();

    await waitFor(() =>
      expect(
        modalContent.getByText(mockActiveLease.awsAccountId),
      ).toBeInTheDocument(),
    );
  });

  test("refreshes lease data when refresh button is clicked", async () => {
    let requestCount = 0;
    server.use(
      http.get(`${config.ApiUrl}/leases`, () => {
        requestCount++;
        return HttpResponse.json({
          status: "success",
          data: {
            result:
              requestCount === 1
                ? [mockActiveLease, mockPendingLease]
                : [mockActiveLease],
            nextPageIdentifier: null,
          },
        });
      }),
    );

    renderComponent();

    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText(mockActiveLease.userEmail)).toBeInTheDocument();
      expect(
        screen.queryByText(mockPendingLease.userEmail),
      ).not.toBeInTheDocument();
    });

    const wrapper = createWrapper();
    const table = wrapper.findTable();
    const refreshButton = table?.findComponent(
      'button[aria-label="Refresh"]',
      ButtonWrapper,
    );

    expect(refreshButton).not.toBeNull();
    expect(refreshButton?.getElement()).not.toBeDisabled();
    await user.click(refreshButton!.getElement());

    await waitFor(() => {
      expect(screen.getByText(mockActiveLease.userEmail)).toBeInTheDocument();
      // The pending lease should still not be visible after refresh
      expect(
        screen.queryByText(mockPendingLease.userEmail),
      ).not.toBeInTheDocument();
    });
  });

  test("renders budget progress bar correctly for active leases", async () => {
    const mockLease = createActiveLease({
      totalCostAccrued: 500,
      maxSpend: 1000,
      userEmail: "test@example.com",
      originalLeaseTemplateName: "Test Template",
    });
    mockLeaseApi.returns([mockLease]);
    server.use(mockLeaseApi.getHandler());

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(mockLease.userEmail)).toBeInTheDocument();
    });

    // Find the mocked BudgetProgressBar
    const budgetProgressBar = screen.getByTestId("budget-progress-bar");
    expect(budgetProgressBar).toBeInTheDocument();

    // Check if the correct values are passed to the BudgetProgressBar
    expect(budgetProgressBar).toHaveAttribute("data-current", "500");
    expect(budgetProgressBar).toHaveAttribute("data-max", "1000");
  });

  test("renders expiry status correctly for active leases", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const mockLease = createActiveLease({
      expirationDate: futureDate.toISOString(),
      leaseDurationInHours: 168,
    });
    mockLeaseApi.returns([mockLease]);
    server.use(mockLeaseApi.getHandler());

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/in 7 days/i)).toBeInTheDocument();
    });
  });

  test("renders account login link for active leases", async () => {
    mockLeaseApi.returns([mockActiveLease]);
    server.use(mockLeaseApi.getHandler());

    renderComponent();

    await waitFor(() => {
      const loginLink = screen.getByText("Login to account");
      expect(loginLink).toBeInTheDocument();
    });
  });
});
