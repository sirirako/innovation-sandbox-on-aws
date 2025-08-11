// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { BrowserRouter as Router } from "react-router-dom";
import { describe, expect, test } from "vitest";

import { GlobalConfigForUI } from "@amzn/innovation-sandbox-commons/data/global-config/global-config.js";
import {
  testErrorState,
  testLoadingState,
  testRefetchOnError,
} from "@amzn/innovation-sandbox-frontend-test/utils/settingsTestUtils";
import { CleanupSettings } from "@amzn/innovation-sandbox-frontend/domains/settings/components/CleanupSettings";
import { config } from "@amzn/innovation-sandbox-frontend/helpers/config";
import { mockConfiguration } from "@amzn/innovation-sandbox-frontend/mocks/handlers/configurationHandlers";
import { server } from "@amzn/innovation-sandbox-frontend/mocks/server";
import { renderWithQueryClient } from "@amzn/innovation-sandbox-frontend/setupTests";

describe("CleanupSettings", () => {
  const renderComponent = () =>
    renderWithQueryClient(
      <Router>
        <CleanupSettings />
      </Router>,
    );

  test("renders cleanup settings correctly", async () => {
    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText("Wait before Rerun Successful Attempt"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          `${mockConfiguration.cleanup.waitBeforeRerunSuccessfulAttemptSeconds} seconds`,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Number of failed attempts to cancel cleanup"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          mockConfiguration.cleanup.numberOfFailedAttemptsToCancelCleanup.toString(),
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Wait before retrying failed attempt"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          `${mockConfiguration.cleanup.waitBeforeRetryFailedAttemptSeconds} seconds`,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Number of successful attempts to finish cleanup"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          mockConfiguration.cleanup.numberOfSuccessfulAttemptsToFinishCleanup.toString(),
        ),
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

  test("handles minimum configuration values", async () => {
    const minimalConfig: GlobalConfigForUI = {
      ...mockConfiguration,
      cleanup: {
        numberOfFailedAttemptsToCancelCleanup: 0,
        waitBeforeRetryFailedAttemptSeconds: 0,
        numberOfSuccessfulAttemptsToFinishCleanup: 0,
        waitBeforeRerunSuccessfulAttemptSeconds: 0,
      },
    };

    server.use(
      http.get(`${config.ApiUrl}/configurations`, () => {
        return HttpResponse.json({
          status: "success",
          data: minimalConfig,
        });
      }),
    );

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText("Wait before Rerun Successful Attempt"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Number of failed attempts to cancel cleanup"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Wait before retrying failed attempt"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Number of successful attempts to finish cleanup"),
      ).toBeInTheDocument();

      const notSetElements = screen.getAllByText("Not set");
      expect(notSetElements).toHaveLength(4); // All fields except AWS Regions should be "Not set"
    });
  });
});
