// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ThresholdAction } from "@amzn/innovation-sandbox-commons/data/lease-template/lease-template";

export interface Threshold {
  value?: number;
  action?: ThresholdAction;
}
