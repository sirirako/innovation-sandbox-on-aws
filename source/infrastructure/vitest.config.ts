// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 300_000,
    coverage: {
      include: ["*.ts"],
    },
  },
  resolve: {
    alias: {
      "@amzn/innovation-sandbox-infrastructure": path.resolve(
        __dirname,
        "./lib",
      ),
      "@amzn/innovation-sandbox-infrastructure/test": path.resolve(
        __dirname,
        "./test",
      ),
      "@amzn/innovation-sandbox-lambda/account-lifecycle-management":
        path.resolve(
          __dirname,
          "../lambdas/account-management/account-lifecycle-management/src",
        ),
      "@amzn/innovation-sandbox-lambda/email-notification": path.resolve(
        __dirname,
        "../lambdas/notification/email-notification/src",
      ),
    },
  },
});
