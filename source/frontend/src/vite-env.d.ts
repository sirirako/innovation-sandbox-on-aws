// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/// <reference types="vite/client" />

// Needed by vite-plugin-markdown
declare module "*.md" {
  const attributes: {
    title: string;
  };
  const markdown: string;
  export { attributes, markdown };
}
