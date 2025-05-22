// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  AccessAnalyzerClient,
  ValidatePolicyCommand,
} from "@aws-sdk/client-accessanalyzer";
import * as fs from "fs";
import * as path from "path";
import { beforeAll, describe, expect, inject, it } from "vitest";

interface ValidationResult {
  isValid: boolean;
  findings: Array<{
    findingType: string;
    findingDetails: string;
  }>;
}

let accessAnalyzerClient: AccessAnalyzerClient;
let sandboxAccountId: string;
let awsManagedRegions: string[];

describe("SCP Policy Validation", function () {
  const SCP_DIRECTORY = path.join(
    __dirname,
    "..",
    "..",
    "..",
    "infrastructure/lib/components/service-control-policies",
  );

  beforeAll(async function () {
    const testConfiguration = inject("testConfiguration");
    sandboxAccountId = testConfiguration.sandboxAccountId;
    awsManagedRegions = ["us-east-1", "eu-west-1"];
    accessAnalyzerClient = new AccessAnalyzerClient();

    // Verify client setup
    expect(accessAnalyzerClient).toBeDefined();
    expect(sandboxAccountId).toBeDefined();
  });

  async function validatePolicy(
    policyDocument: string,
  ): Promise<ValidationResult> {
    try {
      const command = new ValidatePolicyCommand({
        policyDocument: JSON.stringify(JSON.parse(policyDocument)),
        policyType: "SERVICE_CONTROL_POLICY",
      });

      const response = await accessAnalyzerClient.send(command);
      const findings = response.findings || [];

      const hasErrors = findings.some(function (finding) {
        return finding.findingType === "ERROR";
      });

      return {
        isValid: !hasErrors,
        findings: findings.map(function (finding) {
          return {
            findingType: finding.findingType || "UNKNOWN",
            findingDetails: finding.findingDetails || "No details provided",
          };
        }),
      };
    } catch (error) {
      console.error("Error validating policy:", error);
      throw error;
    }
  }

  it("should validate all SCP policies in the directory", async function () {
    // Verify test directory exists
    expect(fs.existsSync(SCP_DIRECTORY)).toBe(true);

    const files = fs.readdirSync(SCP_DIRECTORY).filter(function (file) {
      return file.endsWith(".json");
    });

    expect(files.length, "No policy files found in directory").toBeGreaterThan(
      0,
    );

    for (const file of files) {
      const filePath = path.join(SCP_DIRECTORY, file);
      let policyContent = fs.readFileSync(filePath, "utf8");

      // Replace template variables
      policyContent = policyContent
        .replace(/\${namespace}/g, "test-namespace")
        .replace(/\${accountId}/g, sandboxAccountId)
        .replace(
          /\"\${isbManagedRegions}\"/g,
          awsManagedRegions
            .map((managedRegion) => `"${managedRegion}"`)
            .join(", "),
        );

      const result = await validatePolicy(policyContent);

      expect(
        result.isValid,
        `Policy ${file} validation failed with findings: ${JSON.stringify(result.findings, null, 2)}`,
      ).toBe(true);
    }
  });
});
