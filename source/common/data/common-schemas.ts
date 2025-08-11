// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import z from "zod";

export const FreeTextSchema = z.string().max(1000);

export const AwsAccountIdSchema = z.string().regex(/^\d{12}$/, {
  message: "AWS Account ID must be exactly 12 digits",
});
