// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import createWrapper from "@cloudscape-design/components/test-utils/dom";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { BrowserRouter as Router } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";

import { LeaseTemplate } from "@amzn/innovation-sandbox-commons/data/lease-template/lease-template.js";
import { RequestLease } from "@amzn/innovation-sandbox-frontend/domains/leases/pages/RequestLease";
import { config } from "@amzn/innovation-sandbox-frontend/helpers/config";
import {
  mockAdvancedLeaseTemplate,
  mockBasicLeaseTemplate,
} from "@amzn/innovation-sandbox-frontend/mocks/handlers/leaseTemplateHandlers";
import { server } from "@amzn/innovation-sandbox-frontend/mocks/server";
import { renderWithQueryClient } from "@amzn/innovation-sandbox-frontend/setupTests";
import {
  ApiPaginatedResult,
  ApiResponse,
} from "@amzn/innovation-sandbox-frontend/types";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("RequestLease", () => {
  const renderComponent = () =>
    renderWithQueryClient(
      <Router>
        <RequestLease />
      </Router>,
    );

  test("renders the request lease form with correct title", async () => {
    renderComponent();
    expect(await screen.findByText("Request lease")).toBeInTheDocument();
  });

  test("correctly renders the wizard", async () => {
    renderComponent();
    await waitFor(() => {
      const wizard = createWrapper().findWizard();
      expect(wizard?.findMenuNavigationLink(1, "active")).not.toBeNull();
      expect(wizard?.findMenuNavigationLink(2, "active")).toBeNull();
      expect(wizard?.findMenuNavigationLink(3, "active")).toBeNull();
    });
  });

  test("displays the lease templates", async () => {
    renderComponent();
    await waitFor(() => {
      const cards = createWrapper().findCards();
      expect(cards?.findItems()).toHaveLength(2);

      const cardHeaders = cards
        ?.findItems()
        .map((item) => item.findCardHeader()?.getElement().textContent);
      expect(cardHeaders).toContain(mockBasicLeaseTemplate.name);
      expect(cardHeaders).toContain(mockAdvancedLeaseTemplate.name);
    });
  });

  test("submits the form successfully and navigates", async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${config.ApiUrl}/leases`, async ({ request }) => {
        const body = (await request.json()) as {
          userEmail: string;
          originalLeaseTemplateUuid: string;
        };
        return HttpResponse.json({
          status: "success",
          data: {
            uuid: "new-lease-uuid",
            userEmail: body.userEmail,
            status: "Active",
            awsAccountId: "123456789012",
          },
        });
      }),
    );
    renderComponent();

    // Select a lease template
    await waitFor(() => {
      expect(screen.getByText(mockBasicLeaseTemplate.name)).toBeInTheDocument();
    });
    const leaseTemplateCard = screen.getByText(mockBasicLeaseTemplate.name);
    await user.click(leaseTemplateCard);

    // Navigate to Terms of Service
    const nextButton = await screen.findByRole("button", { name: /next/i });
    await user.click(nextButton);

    // Accept Terms of Service
    const termsCheckbox = await screen.findByLabelText(
      "I accept the above terms of service.",
    );
    await user.click(termsCheckbox);
    await user.click(await screen.findByRole("button", { name: /next/i }));

    // Submit the form
    const submitButtons = await screen.findAllByRole("button", {
      name: /submit/i,
    });
    const submitButton = submitButtons[submitButtons.length - 1];
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  test("handles form submission error", async () => {
    vi.clearAllMocks();
    const user = userEvent.setup();

    server.use(
      http.post(`${config.ApiUrl}/leases`, () => {
        return HttpResponse.json(
          { status: "error", message: "API Error" },
          { status: 500 },
        );
      }),
    );

    renderComponent();

    // Select a lease template
    await waitFor(() => {
      expect(screen.getByText(mockBasicLeaseTemplate.name)).toBeInTheDocument();
    });
    const leaseTemplateCard = screen.getByText(mockBasicLeaseTemplate.name);
    await user.click(leaseTemplateCard);

    // Navigate to Terms of Service
    const nextButton = await screen.findByRole("button", { name: /next/i });
    await user.click(nextButton);

    // Accept Terms of Service
    const termsCheckbox = await screen.findByLabelText(
      "I accept the above terms of service.",
    );
    await user.click(termsCheckbox);
    await user.click(await screen.findByRole("button", { name: /next/i }));

    // Submit the form
    const submitButtons = await screen.findAllByRole("button", {
      name: /submit/i,
    });
    const submitButton = submitButtons[submitButtons.length - 1];
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  test("displays error when no lease templates are available", async () => {
    server.use(
      http.get(`${config.ApiUrl}/leaseTemplates`, () => {
        const response: ApiResponse<ApiPaginatedResult<LeaseTemplate>> = {
          status: "success",
          data: {
            result: [],
            nextPageIdentifier: null,
          },
        };
        return HttpResponse.json(response);
      }),
    );

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText("No lease templates configured."),
      ).toBeInTheDocument();
    });
  });
});
