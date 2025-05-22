// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  GlobalConfigForUI,
  GlobalConfigForUISchema,
} from "@amzn/innovation-sandbox-commons/data/global-config/global-config.js";
import { generateSchemaData } from "@amzn/innovation-sandbox-commons/test/generate-schema-data.js";

export function createConfiguration(
  overrides?: Partial<GlobalConfigForUI>,
): GlobalConfigForUI {
  return generateSchemaData(GlobalConfigForUISchema, overrides);
}
