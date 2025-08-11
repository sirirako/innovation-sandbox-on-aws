// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from "vitest/config";

import { commonConfig } from "./vite.config.js";

export default defineConfig({
  ...commonConfig,
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/setupTests.tsx"],
    include: ["test/**/*.test.tsx"],
    coverage: {
      reporter: ["lcov", "text"],
      include: ["src/domains/**/*.{ts,tsx}"],
    },
  },
});
