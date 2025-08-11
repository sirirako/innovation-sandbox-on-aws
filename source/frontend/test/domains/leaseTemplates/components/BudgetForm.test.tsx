// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter as Router } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";

import { BudgetForm } from "@amzn/innovation-sandbox-frontend/domains/leaseTemplates/components/BudgetForm";
import { mockAdvancedLeaseTemplate } from "@amzn/innovation-sandbox-frontend/mocks/handlers/leaseTemplateHandlers";
import { renderWithQueryClient } from "@amzn/innovation-sandbox-frontend/setupTests";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("BudgetForm", () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  const renderComponent = () =>
    renderWithQueryClient(
      <Router>
        <BudgetForm
          maxSpend={mockAdvancedLeaseTemplate.maxSpend}
          budgetThresholds={mockAdvancedLeaseTemplate.budgetThresholds}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isUpdating={false}
        />
      </Router>,
    );

  test("renders the form with correct initial values", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByLabelText("Set a max budget")).toBeChecked();
      expect(screen.getByLabelText("Maximum Budget Amount")).toHaveValue(
        mockAdvancedLeaseTemplate.maxSpend?.toString(),
      );
    });
  });

  test("submits form with updated values", async () => {
    renderComponent();
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText("Maximum Budget Amount"));
    await user.type(screen.getByLabelText("Maximum Budget Amount"), "1000");

    await user.click(
      screen.getByRole("button", { name: /Update Budget Settings/i }),
    );

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  test("toggles max budget option", async () => {
    renderComponent();
    const user = userEvent.setup();

    const setMaxBudgetRadio = screen.getByLabelText("Set a max budget");
    const doNotSetBudgetRadio = screen.getByLabelText("Do not set a budget");
    const maxBudgetInput = screen.getByLabelText("Maximum Budget Amount");

    expect(setMaxBudgetRadio).toBeChecked();
    expect(maxBudgetInput).toBeInTheDocument();

    await user.click(doNotSetBudgetRadio);

    expect(doNotSetBudgetRadio).toBeChecked();
    await waitFor(() => {
      expect(
        screen.queryByLabelText("Maximum Budget Amount"),
      ).not.toBeInTheDocument();
    });

    await user.click(setMaxBudgetRadio);

    expect(setMaxBudgetRadio).toBeChecked();
    await waitFor(() => {
      expect(
        screen.getByLabelText("Maximum Budget Amount"),
      ).toBeInTheDocument();
    });
  });

  test("displays warning when no budget is set", async () => {
    renderComponent();
    const user = userEvent.setup();

    await user.click(screen.getByLabelText("Do not set a budget"));

    expect(
      screen.getByText(
        /If you don't set a max budget, there is a risk that these accounts may have cost overruns./i,
      ),
    ).toBeInTheDocument();
  });

  test("validates required fields before submission", async () => {
    renderComponent();
    const user = userEvent.setup();

    const budgetInput = screen.getByLabelText("Maximum Budget Amount");
    await user.clear(budgetInput);
    await user.click(
      screen.getByRole("button", { name: /Update Budget Settings/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByText("Please enter a valid number."),
      ).toBeInTheDocument();
    });
  });

  test("handles budget thresholds", async () => {
    renderComponent();
    const user = userEvent.setup();

    // Check initial state
    const initialThresholdInputs = screen.getAllByRole("textbox");
    expect(initialThresholdInputs).toHaveLength(3);

    const maxBudgetInput = screen.getByLabelText("Maximum Budget Amount");
    expect(maxBudgetInput).toHaveValue(
      mockAdvancedLeaseTemplate.maxSpend?.toString(),
    );

    const existingThresholdInput = screen.getByDisplayValue("250");
    expect(existingThresholdInput).toBeInTheDocument();

    const maxSpendThresholds = screen.getAllByDisplayValue(
      mockAdvancedLeaseTemplate.maxSpend?.toString() ?? "",
    );
    expect(maxSpendThresholds).toHaveLength(2);
    const readOnlyMaxSpendThreshold = maxSpendThresholds.find((input) =>
      input.hasAttribute("readonly"),
    );
    expect(readOnlyMaxSpendThreshold).toBeInTheDocument();

    const initialActionSelects = screen.getAllByRole("button", {
      name: /Send Alert/i,
    });
    expect(initialActionSelects).toHaveLength(1);

    // Add a new threshold
    await user.click(screen.getByRole("button", { name: /Add a threshold/i }));

    // Wait for the new threshold input to appear
    await waitFor(() => {
      const updatedThresholdInputs = screen.getAllByRole("textbox");
      expect(updatedThresholdInputs).toHaveLength(4);
    });

    // Fill in the new threshold
    const newThresholdInput = screen
      .getAllByRole("textbox")
      .find((input) => input.getAttribute("value") === "");
    expect(newThresholdInput).toBeInTheDocument();
    if (newThresholdInput) {
      await user.type(newThresholdInput, "50");
    }

    // Select the action for the new threshold
    const newActionSelect = screen
      .getAllByRole("button", { name: /Send Alert/i })
      .pop();
    expect(newActionSelect).toBeInTheDocument();
    if (newActionSelect) {
      await user.click(newActionSelect);
      await user.click(screen.getByRole("option", { name: /ALERT/i }));
    }

    // Submit the form
    await user.click(
      screen.getByRole("button", { name: /Update Budget Settings/i }),
    );

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  test("cancels form submission", async () => {
    renderComponent();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /Cancel/i }));

    expect(mockOnCancel).toHaveBeenCalled();
  });
});
