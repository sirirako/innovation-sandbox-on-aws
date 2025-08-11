// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { expect } from "vitest";

import { config } from "@amzn/innovation-sandbox-frontend/helpers/config";
import { createConfiguration } from "@amzn/innovation-sandbox-frontend/mocks/factories/configurationFactory";
import { server } from "@amzn/innovation-sandbox-frontend/mocks/server";

export const testLoadingState = async (renderComponent: () => void) => {
  server.use(
    http.get(`${config.ApiUrl}/configurations`, async () => {
      await delay(100);
      return HttpResponse.json({
        status: "success",
        data: createConfiguration(),
      });
    }),
  );

  renderComponent();

  expect(screen.getByText("Loading...")).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });
};

export const testErrorState = async (renderComponent: () => void) => {
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
      screen.getByText("There was a problem loading settings."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
  });
};

export const testRefetchOnError = async (renderComponent: () => void) => {
  let requestCount = 0;

  server.use(
    http.get(`${config.ApiUrl}/configurations`, () => {
      requestCount++;
      if (requestCount === 1) {
        return HttpResponse.json(
          { status: "error", message: "Failed to fetch configurations" },
          { status: 500 },
        );
      } else {
        return HttpResponse.json({
          status: "success",
          data: createConfiguration(),
        });
      }
    }),
  );

  renderComponent();

  await waitFor(() => {
    expect(
      screen.getByText("There was a problem loading settings."),
    ).toBeInTheDocument();
  });

  const retryButton = screen.getByRole("button", { name: /try again/i });
  await userEvent.click(retryButton);

  await waitFor(() => {
    expect(
      screen.queryByText("There was a problem loading settings."),
    ).not.toBeInTheDocument();
  });
};
