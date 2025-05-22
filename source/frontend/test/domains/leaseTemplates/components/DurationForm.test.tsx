// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter as Router } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";

import { DurationForm } from "@amzn/innovation-sandbox-frontend/domains/leaseTemplates/components/DurationForm";
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

describe("DurationForm", () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  const renderComponent = () =>
    renderWithQueryClient(
      <Router>
        <DurationForm
          leaseDurationInHours={mockAdvancedLeaseTemplate.leaseDurationInHours}
          durationThresholds={mockAdvancedLeaseTemplate.durationThresholds}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isUpdating={false}
        />
      </Router>,
    );

  test("renders the form with correct initial values", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByLabelText("Set a maximum duration")).toBeChecked();
      expect(
        screen.getByLabelText("Maximum Lease Duration (in hours)"),
      ).toHaveValue(mockAdvancedLeaseTemplate.leaseDurationInHours?.toString());
    });

    const durationThresholdInput = screen.getByDisplayValue(
      mockAdvancedLeaseTemplate.durationThresholds![0].hoursRemaining.toString(),
    );
    expect(durationThresholdInput).toBeInTheDocument();

    const actionSelect = screen.getByRole("button", { name: /Send Alert/i });
    expect(actionSelect).toBeInTheDocument();
  });

  test("submits form with updated values", async () => {
    renderComponent();
    const user = userEvent.setup();

    const durationInput = screen.getByLabelText(
      "Maximum Lease Duration (in hours)",
    );
    await user.clear(durationInput);
    await user.type(durationInput, "96");

    await user.click(
      screen.getByRole("button", { name: /Update Duration Settings/i }),
    );

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  test("toggles max duration option", async () => {
    renderComponent();
    const user = userEvent.setup();

    const setMaxDurationRadio = screen.getByLabelText("Set a maximum duration");
    const doNotSetDurationRadio = screen.getByLabelText(
      "Do not set a maximum duration",
    );
    const maxDurationInput = screen.getByLabelText(
      "Maximum Lease Duration (in hours)",
    );

    expect(setMaxDurationRadio).toBeChecked();
    expect(maxDurationInput).toBeInTheDocument();

    await user.click(doNotSetDurationRadio);

    expect(doNotSetDurationRadio).toBeChecked();
    await waitFor(() => {
      expect(
        screen.queryByLabelText("Maximum Lease Duration (in hours)"),
      ).not.toBeInTheDocument();
    });

    await user.click(setMaxDurationRadio);

    expect(setMaxDurationRadio).toBeChecked();
    await waitFor(() => {
      expect(
        screen.getByLabelText("Maximum Lease Duration (in hours)"),
      ).toBeInTheDocument();
    });
  });

  test("handles duration thresholds", async () => {
    renderComponent();
    const user = userEvent.setup();

    // Check initial state
    const initialThresholdInputs = screen.getAllByRole("textbox");
    expect(initialThresholdInputs).toHaveLength(3); // One for max duration, one for the initial threshold

    // Add a new threshold
    await user.click(screen.getByRole("button", { name: /Add a threshold/i }));

    // Wait for the new threshold input to appear
    await waitFor(() => {
      const updatedThresholdInputs = screen.getAllByRole("textbox");
      expect(updatedThresholdInputs).toHaveLength(4); // Max duration + original threshold + new threshold
    });

    // Fill in the new threshold
    const thresholdInputs = screen.getAllByRole("textbox");
    await user.type(thresholdInputs[thresholdInputs.length - 1], "48");

    // Select the action for the new threshold
    const actionSelects = screen.getAllByRole("button", {
      name: /Send Alert/i,
    });
    await user.click(actionSelects[actionSelects.length - 1]);
    await user.click(screen.getByRole("option", { name: /Freeze Account/i }));

    // Submit the form
    await user.click(
      screen.getByRole("button", { name: /Update Duration Settings/i }),
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

  test("validates required fields before submission", async () => {
    renderComponent();
    const user = userEvent.setup();

    const durationInput = screen.getByLabelText(
      "Maximum Lease Duration (in hours)",
    );
    await user.clear(durationInput);
    await user.click(
      screen.getByRole("button", { name: /Update Duration Settings/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByText("Please enter a valid number."),
      ).toBeInTheDocument();
    });
  });

  test("handles edge case: very large duration value", async () => {
    renderComponent();
    const user = userEvent.setup();

    const durationInput = screen.getByLabelText(
      "Maximum Lease Duration (in hours)",
    );
    await user.clear(durationInput);
    await user.type(durationInput, "999999999999999");

    await user.click(
      screen.getByRole("button", { name: /Update Duration Settings/i }),
    );

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });
});
