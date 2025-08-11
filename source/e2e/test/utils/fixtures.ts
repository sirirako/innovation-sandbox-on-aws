// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import jwt from "jsonwebtoken";

import { IsbUser } from "@amzn/innovation-sandbox-commons/types/isb-types.js";

export const userAgentHeader =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36";

export const testIsbUser: IsbUser = {
  email: "test@example.com",
  userId: "testUserId",
  roles: ["Admin", "Manager", "User"],
};

export function getSignedJwt(
  jwtSecret: string,
  user: IsbUser = testIsbUser,
): string {
  return jwt.sign({ user: user }, jwtSecret);
}
