// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { BrowserRouter as Router } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";

import { showErrorToast } from "@amzn/innovation-sandbox-frontend/components/Toast";
import { BasicDetailsForm } from "@amzn/innovation-sandbox-frontend/domains/leaseTemplates/components/BasicDetailsForm";
import { config } from "@amzn/innovation-sandbox-frontend/helpers/config";
import { mockBasicLeaseTemplate } from "@amzn/innovation-sandbox-frontend/mocks/handlers/leaseTemplateHandlers";
import { server } from "@amzn/innovation-sandbox-frontend/mocks/server";
import { renderWithQueryClient } from "@amzn/innovation-sandbox-frontend/setupTests";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@amzn/innovation-sandbox-frontend/components/Toast", () => ({
  showErrorToast: vi.fn(),
}));

describe("BasicDetailsForm", () => {
  const renderComponent = () =>
    renderWithQueryClient(
      <Router>
        <BasicDetailsForm leaseTemplate={mockBasicLeaseTemplate} />
      </Router>,
    );

  test("renders the form with correct initial values", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toHaveValue(
        mockBasicLeaseTemplate.name,
      );
      expect(screen.getByLabelText("Description")).toHaveValue(
        mockBasicLeaseTemplate.description,
      );
      expect(screen.getByLabelText("Approval required")).not.toBeChecked();
    });
  });

  test("submits form with updated values", async () => {
    server.use(
      http.put(
        `${config.ApiUrl}/leaseTemplates/:${mockBasicLeaseTemplate.uuid}`,
        async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({ status: "success", data: body });
        },
      ),
    );

    renderComponent();
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Updated Template");
    await user.clear(screen.getByLabelText("Description"));
    await user.type(
      screen.getByLabelText("Description"),
      "Updated description",
    );
    await user.click(screen.getByLabelText("Approval required"));

    await user.click(
      screen.getByRole("button", { name: /update basic details/i }),
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/lease_templates");
    });
  });

  test("displays warning when approval is not required", async () => {
    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText(/When a user requests this lease template/i),
      ).toBeInTheDocument();
    });
  });

  test("cancels form submission and navigates back", async () => {
    renderComponent();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/lease_templates");
  });

  test("validates required fields before submission", async () => {
    renderComponent();
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText("Name"));
    await user.click(
      screen.getByRole("button", { name: /update basic details/i }),
    );
    await waitFor(() => {
      expect(
        screen.getByText("Please enter a name for this lease template"),
      ).toBeInTheDocument();
    });
  });

  test("toggles approval required switch", async () => {
    renderComponent();
    const user = userEvent.setup();
    const approvalSwitch = screen.getByLabelText("Approval required");

    expect(approvalSwitch).not.toBeChecked();
    await user.click(approvalSwitch);
    expect(approvalSwitch).toBeChecked();
    await user.click(approvalSwitch);
    expect(approvalSwitch).not.toBeChecked();
  });

  test("handles API error on form submission", async () => {
    server.use(
      http.put(
        `${config.ApiUrl}/leaseTemplates/:${mockBasicLeaseTemplate.uuid}`,
        () => {
          return HttpResponse.json(
            { status: "error", message: "API Error" },
            { status: 500 },
          );
        },
      ),
    );

    renderComponent();
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Updated Template");

    const submitButton = screen.getByRole("button", {
      name: /update basic details/i,
    });
    await user.click(submitButton);
    await waitFor(() => {
      expect(showErrorToast).toHaveBeenCalledWith(
        "HTTP error 500",
        "Whoops, something went wrong!",
      );
    });
  });
});
