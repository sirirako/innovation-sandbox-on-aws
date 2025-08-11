// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { vi } from "vitest";

import { GlobalConfig } from "@amzn/innovation-sandbox-commons/data/global-config/global-config.js";
import yaml from "js-yaml";

export const bulkStubEnv = (envVars: Record<string, string>) => {
  for (let [key, value] of Object.entries(envVars)) {
    vi.stubEnv(key, value);
  }
};

export const mockAppConfigMiddleware = (globalConfig: GlobalConfig) => {
  global.fetch = vi.fn().mockImplementation(() => {
    return Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve(yaml.dump({ ...globalConfig })),
    } as unknown as Response);
  });
};
