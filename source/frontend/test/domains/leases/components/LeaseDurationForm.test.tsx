// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter as Router } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";

import {
  LeaseDurationForm,
  LeaseDurationFormProps,
} from "@amzn/innovation-sandbox-frontend/domains/leases/components/LeaseDurationForm";
import { renderWithQueryClient } from "@amzn/innovation-sandbox-frontend/setupTests";

// Mock ResizeObserver
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserver;

describe("LeaseDurationForm", () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  const defaultProps: LeaseDurationFormProps = {
    expirationDate: undefined,
    durationThresholds: [],
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
    isUpdating: false,
  };

  const renderComponent = (props = {}) =>
    renderWithQueryClient(
      <Router>
        <LeaseDurationForm {...defaultProps} {...props} />
      </Router>,
    );

  test("renders the form with correct initial state", () => {
    renderComponent();

    expect(screen.getByText("Lease Duration")).toBeInTheDocument();
    expect(
      screen.getByText("This lease currently does not expire"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Do not set an expiry date")).toBeChecked();
    expect(screen.getByLabelText("Set an expiry date")).not.toBeChecked();
  });

  test("displays expiration date input when 'Set an expiry date' is selected", async () => {
    renderComponent();

    const setExpiryRadio = screen.getByLabelText("Set an expiry date");
    await userEvent.click(setExpiryRadio);

    expect(screen.getByText("Date")).toBeInTheDocument();
    expect(screen.getByText("Time")).toBeInTheDocument();
  });

  test("displays duration thresholds when expiry date is set", async () => {
    renderComponent();

    const setExpiryRadio = screen.getByLabelText("Set an expiry date");
    await userEvent.click(setExpiryRadio);

    expect(screen.getByText("Duration Thresholds")).toBeInTheDocument();
    expect(
      screen.getByText("Determine what happens as time passes."),
    ).toBeInTheDocument();
  });

  test("calls onCancel when cancel button is clicked", async () => {
    renderComponent();

    const cancelButton = screen.getByText("Cancel");
    await userEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });
});
