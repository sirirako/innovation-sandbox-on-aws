// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { BrowserRouter as Router } from "react-router-dom";
import { describe, expect, test } from "vitest";

import {
  testErrorState,
  testLoadingState,
  testRefetchOnError,
} from "@amzn/innovation-sandbox-frontend-test/utils/settingsTestUtils";
import { GeneralSettings } from "@amzn/innovation-sandbox-frontend/domains/settings/components/GeneralSettings";
import { config } from "@amzn/innovation-sandbox-frontend/helpers/config";
import { mockConfiguration } from "@amzn/innovation-sandbox-frontend/mocks/handlers/configurationHandlers";
import { server } from "@amzn/innovation-sandbox-frontend/mocks/server";
import { renderWithQueryClient } from "@amzn/innovation-sandbox-frontend/setupTests";

describe("GeneralSettings", () => {
  const renderComponent = () =>
    renderWithQueryClient(
      <Router>
        <GeneralSettings />
      </Router>,
    );

  test("renders general settings correctly", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Maintenance Mode")).toBeInTheDocument();
      expect(
        screen.getByText(
          mockConfiguration.maintenanceMode
            ? "Maintenance mode is ON"
            : "Maintenance mode is OFF",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Innovation Sandbox Managed Regions"),
      ).toBeInTheDocument();
      mockConfiguration.isbManagedRegions.forEach((region) => {
        expect(screen.getByText(region)).toBeInTheDocument();
      });
      expect(screen.getByText("Terms of Service")).toBeInTheDocument();
      expect(
        screen.getByText(mockConfiguration.termsOfService),
      ).toBeInTheDocument();
    });
  });

  test("handles loading state", async () => {
    await testLoadingState(renderComponent);
  });

  test("handles error state", async () => {
    await testErrorState(renderComponent);
  });

  test("refetches data on error retry", async () => {
    await testRefetchOnError(renderComponent);
  });

  test("handles maintenance mode ON", async () => {
    server.use(
      http.get(`${config.ApiUrl}/configurations`, () => {
        return HttpResponse.json({
          status: "success",
          data: { ...mockConfiguration, maintenanceMode: true },
        });
      }),
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Maintenance Mode")).toBeInTheDocument();
      expect(screen.getByText("Maintenance mode is ON")).toBeInTheDocument();
    });
  });

  test("handles minimum configuration values", async () => {
    server.use(
      http.get(`${config.ApiUrl}/configurations`, () => {
        return HttpResponse.json({
          status: "success",
          data: {
            ...mockConfiguration,
            maintenanceMode: false,
            termsOfService: "",
          },
        });
      }),
    );

    renderComponent();

    await waitFor(() => {
      // Check that the main labels are present
      expect(screen.getByText("Maintenance Mode")).toBeInTheDocument();
      expect(
        screen.getByText("Innovation Sandbox Managed Regions"),
      ).toBeInTheDocument();
      expect(screen.getByText("Terms of Service")).toBeInTheDocument();

      // Checking for appropriate default values
      expect(screen.getByText("Maintenance mode is OFF")).toBeInTheDocument();
      const preElement = screen.getByText("", { selector: "pre" });
      expect(preElement).toBeInTheDocument();
      expect(preElement).toBeEmptyDOMElement();
    });
  });
});
