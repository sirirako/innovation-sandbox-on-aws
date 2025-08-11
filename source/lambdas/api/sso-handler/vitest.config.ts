// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import path from "path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["*.ts"],
    },
    exclude: [...configDefaults.exclude, "build/**"],
  },
  resolve: {
    alias: {
      "@amzn/innovation-sandbox-sso-handler": path.resolve(__dirname, "./src"),
      "@amzn/innovation-sandbox-sso-handler/test": path.resolve(
        __dirname,
        "./test",
      ),
    },
  },
});
