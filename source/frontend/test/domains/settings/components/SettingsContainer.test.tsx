// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { screen, waitFor } from "@testing-library/react";
import { BrowserRouter as Router } from "react-router-dom";
import { describe, expect, test } from "vitest";

import { SettingsContainer } from "@amzn/innovation-sandbox-frontend/domains/settings/components/SettingsContainer";
import { renderWithQueryClient } from "@amzn/innovation-sandbox-frontend/setupTests";

describe("SettingsContainer", () => {
  const TestChild = () => (
    <div data-testid="test-child">Test Child Content</div>
  );

  const renderComponent = (children: React.ReactNode = <TestChild />) =>
    renderWithQueryClient(
      <Router>
        <SettingsContainer>{children}</SettingsContainer>
      </Router>,
    );

  test("renders children correctly", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("test-child")).toBeInTheDocument();
      expect(screen.getByText("Test Child Content")).toBeInTheDocument();
    });
  });

  test("renders info alert", async () => {
    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText("To change these settings, please go to"),
      ).toBeInTheDocument();
      expect(screen.getByText("AWS AppConfig")).toBeInTheDocument();
      expect(screen.getByText("AWS AppConfig").closest("a")).toHaveAttribute(
        "href",
        "https://console.aws.amazon.com/systems-manager/appconfig/applications",
      );
    });
  });

  test("applies correct CSS classes", async () => {
    renderComponent();

    await waitFor(() => {
      const container = screen
        .getByTestId("test-child")
        .closest("[data-settings-form]");
      expect(container).toHaveAttribute("data-top", "true");
      expect(container).toHaveAttribute("data-settings-form", "true");
    });
  });

  test("renders with empty children", async () => {
    renderComponent(<></>);

    await waitFor(() => {
      const container = screen
        .getByText("To change these settings, please go to")
        .closest("[data-settings-form]");
      expect(container).toBeInTheDocument();
    });
  });
});
