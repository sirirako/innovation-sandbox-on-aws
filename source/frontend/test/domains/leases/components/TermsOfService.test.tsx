// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, test } from "vitest";

import { TermsOfService } from "@amzn/innovation-sandbox-frontend/domains/leases/components/TermsOfService";
import { config } from "@amzn/innovation-sandbox-frontend/helpers/config";
import { mockConfiguration } from "@amzn/innovation-sandbox-frontend/mocks/handlers/configurationHandlers";
import { server } from "@amzn/innovation-sandbox-frontend/mocks/server";
import { renderWithQueryClient } from "@amzn/innovation-sandbox-frontend/setupTests";
import { MemoryRouter } from "react-router-dom";

describe("TermsOfService", () => {
  const renderComponent = () =>
    renderWithQueryClient(
      <MemoryRouter>
        <TermsOfService />
      </MemoryRouter>,
    );

  test("renders terms of service when data is fetched successfully", async () => {
    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText(mockConfiguration.termsOfService),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        "Before continuing, please review the terms of service below.",
      ),
    ).toBeInTheDocument();
  });

  test("displays loading state", async () => {
    server.use(
      http.get(`${config.ApiUrl}/configurations`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json({
          status: "success",
          data: mockConfiguration,
        });
      }),
    );

    renderComponent();
    expect(screen.getByText("Loading terms of service...")).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText(mockConfiguration.termsOfService),
      ).toBeInTheDocument();
    });
  });

  test("handles error when fetching terms of service fails", async () => {
    server.use(
      http.get(`${config.ApiUrl}/configurations`, () => {
        return HttpResponse.json(
          { status: "error", message: "Failed to fetch configurations" },
          { status: 500 },
        );
      }),
    );

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText("Could not retrieve terms of service."),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
  });

  test("displays correctly when terms of service are not configured", async () => {
    server.use(
      http.get(`${config.ApiUrl}/configurations`, () => {
        return HttpResponse.json({
          status: "success",
          data: { ...mockConfiguration, termsOfService: "" },
        });
      }),
    );

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText(
          "Before continuing, please review the terms of service below.",
        ),
      ).toBeInTheDocument();

      expect(
        screen.getByText("Terms of Service have not been configured yet."),
      ).toBeInTheDocument();

      expect(
        screen.getByText("Please contact your administrator!"),
      ).toBeInTheDocument();
    });
  });

  test("handles long terms of service text", async () => {
    const longTerms = "A".repeat(1000);
    server.use(
      http.get(`${config.ApiUrl}/configurations`, () => {
        return HttpResponse.json({
          status: "success",
          data: { ...mockConfiguration, termsOfService: longTerms },
        });
      }),
    );

    renderComponent();

    await waitFor(() => {
      const termsElement = screen.getByText(longTerms);
      expect(termsElement).toBeInTheDocument();
      expect(termsElement.textContent).toHaveLength(1000);
    });
  });
});
