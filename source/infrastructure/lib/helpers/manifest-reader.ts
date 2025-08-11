// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import fs from "fs";
import yaml from "js-yaml";
import path from "path";

export interface SolutionManifest {
  name: string;
  id: string;
  version: string;
}

export function readManifest(): SolutionManifest {
  const filePath = path.join(
    __dirname,
    "..",
    "..",
    "..",
    "..",
    "solution-manifest.yaml",
  );
  const fileContents = fs.readFileSync(filePath, "utf8");
  const data = yaml.load(fileContents) as SolutionManifest;
  return {
    name: data.name,
    id: data.id,
    version: data.version,
  };
}

export function getCustomUserAgent(): string {
  const manifest = readManifest();
  return `AwsSolution/${manifest.id}/${manifest.version}`;
}
