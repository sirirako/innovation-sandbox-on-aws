// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import createWrapper from "@cloudscape-design/components/test-utils/dom";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter as Router } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";

import { ListLeaseTemplates } from "@amzn/innovation-sandbox-frontend/domains/leaseTemplates/pages/ListLeaseTemplates";
import { renderWithQueryClient } from "@amzn/innovation-sandbox-frontend/setupTests";

const mockNavigate = vi.fn();
const mockSetBreadcrumb = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@amzn/innovation-sandbox-frontend/hooks/useBreadcrumb", () => ({
  useBreadcrumb: () => mockSetBreadcrumb,
}));

describe("ListLeaseTemplates", () => {
  const renderComponent = () =>
    renderWithQueryClient(
      <Router>
        <ListLeaseTemplates />
      </Router>,
    );

  test("renders the component with correct structure", async () => {
    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Lease Templates" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Manage the available templates to request leases from",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Add new lease template" }),
      ).toBeInTheDocument();
    });

    // Check if LeaseTemplatesTable is rendered
    const table = createWrapper().findTable();
    expect(table).not.toBeNull();
  });

  test("navigates to create page when clicking 'Add new lease template'", async () => {
    renderComponent();
    const user = userEvent.setup();

    const addButton = screen.getByRole("button", {
      name: "Add new lease template",
    });
    await user.click(addButton);

    expect(mockNavigate).toHaveBeenCalledWith("/lease_templates/new");
  });

  test("sets breadcrumb correctly", async () => {
    renderComponent();

    await waitFor(() => {
      expect(mockSetBreadcrumb).toHaveBeenCalledWith([
        { text: "Home", href: "/" },
        { text: "Lease Templates", href: "/lease_templates" },
      ]);
    });
  });
});
