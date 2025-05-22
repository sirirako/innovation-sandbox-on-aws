// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import jwt, { JwtPayload } from "jsonwebtoken";
import { promisify } from "util";

import { IsbUser } from "@amzn/innovation-sandbox-commons/types/isb-types.js";

export interface JwtVerificationResult {
  message?: string;
  verified: boolean;
  session?: any;
}

const verifyAsync = promisify<
  string,
  string,
  jwt.VerifyOptions,
  jwt.JwtPayload | string
>(jwt.verify);

export async function verifyJwt(
  jwtSecret: string,
  token: string,
): Promise<JwtVerificationResult> {
  if (!token) {
    return {
      verified: false,
      message: "Missing token",
    };
  }

  try {
    const decoded = await verifyAsync(token, jwtSecret, {});
    return {
      verified: true,
      session: decoded,
    };
  } catch (err) {
    return {
      verified: false,
      message: "Invalid token",
    };
  }
}

export function decodeJwt(token: string): IsbUser | null {
  const decoded = jwt.decode(token);
  if (!decoded) {
    return null;
  }
  return (decoded as JwtPayload).user;
}
