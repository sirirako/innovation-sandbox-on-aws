// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { BrowserRouter as Router } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { showErrorToast } from "@amzn/innovation-sandbox-frontend/components/Toast";
import { AddAccounts } from "@amzn/innovation-sandbox-frontend/domains/accounts/pages/AddAccounts";
import { config } from "@amzn/innovation-sandbox-frontend/helpers/config";
import { ModalProvider } from "@amzn/innovation-sandbox-frontend/hooks/useModal";
import { mockUnregisteredAccounts } from "@amzn/innovation-sandbox-frontend/mocks/factories/accountFactory";
import { server } from "@amzn/innovation-sandbox-frontend/mocks/server";
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

vi.mock("@amzn/innovation-sandbox-frontend/components/Toast", () => ({
  showErrorToast: vi.fn(),
}));

beforeEach(() => {
  mockNavigate.mockClear();
});

describe("AddAccounts", () => {
  const renderComponent = () =>
    renderWithQueryClient(
      <Router>
        <ModalProvider>
          <AddAccounts />
        </ModalProvider>
      </Router>,
    );

  test("renders the add accounts form with correct title", async () => {
    renderComponent();
    expect(await screen.findByText("Add Accounts")).toBeInTheDocument();
  });

  test("sets breadcrumb correctly", async () => {
    renderComponent();

    await waitFor(() => {
      expect(mockSetBreadcrumb).toHaveBeenCalledWith([
        { text: "Home", href: "/" },
        { text: "Accounts", href: "/accounts" },
        { text: "Add Accounts", href: "/accounts/new" },
      ]);
    });
  });

  test("displays unregistered accounts and allows selection", async () => {
    renderComponent();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(
        screen.getByText(mockUnregisteredAccounts[0].Id),
      ).toBeInTheDocument();
      expect(
        screen.getByText(mockUnregisteredAccounts[1].Id),
      ).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole("checkbox").slice(1);
    await user.click(checkboxes[0]);

    expect(checkboxes[0]).toBeChecked();
  });

  test("submits form and navigates on successful submission", async () => {
    renderComponent();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(
        screen.getByText(mockUnregisteredAccounts[0].Id),
      ).toBeInTheDocument();
    });
    const checkbox = screen.getAllByRole("checkbox")[1];
    await user.click(checkbox);

    const registerButton = await screen.findByRole("button", {
      name: "Register",
    });
    await user.click(registerButton);

    const modal = screen.getByRole("dialog");
    await waitFor(() => {
      expect(modal).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(
        screen.getByText("Review Accounts to Register"),
      ).toBeInTheDocument();
      expect(
        within(modal).getByText(mockUnregisteredAccounts[0].Id),
      ).toBeInTheDocument();
    });

    const submitButton = await screen.findByRole("button", { name: "Submit" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/accounts");
    });
  });

  test("displays error message on submission failure", async () => {
    server.use(
      http.post(`${config.ApiUrl}/accounts`, () => {
        return HttpResponse.json(
          { status: "error", message: "Failed to add accounts" },
          { status: 500 },
        );
      }),
    );

    renderComponent();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(
        screen.getByText(mockUnregisteredAccounts[0].Id),
      ).toBeInTheDocument();
    });
    const checkbox = screen.getAllByRole("checkbox")[1];
    await user.click(checkbox);

    const registerButton = await screen.findByRole("button", {
      name: "Register",
    });
    await user.click(registerButton);

    const modal = screen.getByRole("dialog");
    await waitFor(() => {
      expect(modal).toBeInTheDocument();
    });

    const submitButton = await screen.findByRole("button", { name: "Submit" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(showErrorToast).toHaveBeenCalledWith(
        "One or more accounts failed to register, try resubmitting registration.",
        "Failed to register accounts",
      );
    });
  });

  test("displays review information correctly", async () => {
    renderComponent();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(
        screen.getByText(mockUnregisteredAccounts[0].Id),
      ).toBeInTheDocument();
    });
    const checkbox = screen.getAllByRole("checkbox")[1];
    await user.click(checkbox);

    const nextButton = await screen.findByRole("button", { name: "Register" });
    await user.click(nextButton);

    const modal = screen.getByRole("dialog");
    await waitFor(() => {
      expect(modal).toBeInTheDocument();
    });

    const modalContent = within(modal);
    await waitFor(() => {
      expect(
        modalContent.getByText(
          "1 account(s) will be added to the account pool",
        ),
      ).toBeInTheDocument();
      expect(
        modalContent.getByText(mockUnregisteredAccounts[0].Id),
      ).toBeInTheDocument();
      expect(
        modalContent.getByText(mockUnregisteredAccounts[0].Email),
      ).toBeInTheDocument();
      expect(
        modalContent.getByText(/The accounts listed above will be nuked/i),
      ).toBeInTheDocument();
      expect(
        modalContent.getByText(/This action cannot be undone!/i),
      ).toBeInTheDocument();
    });
  });
});
