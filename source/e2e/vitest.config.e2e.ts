// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import path from "path";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
process.env = loadEnv("", path.join(process.cwd(), "..", ".."), "");
export default defineConfig({
  test: {
    coverage: {
      include: ["*.ts"],
    },
    globalSetup: ["./test/global-setup.ts"],
    testTimeout: 30 * 1000,
    env: loadEnv("", path.join(process.cwd(), "..", ".."), ""),
  },
  resolve: {
    alias: {
      "@amzn/innovation-sandbox-e2e/test": path.resolve(__dirname, "./test"),
    },
  },
});
