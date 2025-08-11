// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { GlobalConfig } from "@amzn/innovation-sandbox-commons/data/global-config/global-config.js";

export abstract class GlobalConfigStore {
  abstract put(globalConfig: GlobalConfig): Promise<GlobalConfig>;

  abstract get(): Promise<GlobalConfig>;
}
