// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { UseQueryResult } from "@tanstack/react-query";

import { LeaseTemplate } from "@amzn/innovation-sandbox-commons/data/lease-template/lease-template";

export const generateBreadcrumb = (
  query: UseQueryResult<LeaseTemplate | undefined, unknown>,
) => {
  const { data: leaseTemplate, isLoading, isError } = query;

  const breadcrumbItems = [
    { text: "Home", href: "/" },
    { text: "Lease Templates", href: "/lease_templates" },
  ];

  if (isLoading) {
    breadcrumbItems.push({ text: "Loading...", href: "#" });
    return breadcrumbItems;
  }

  if (isError || !leaseTemplate) {
    breadcrumbItems.push({ text: "Error", href: "#" });
    return breadcrumbItems;
  }

  breadcrumbItems.push({
    text: leaseTemplate.name,
    href: `/lease_templates/edit/${leaseTemplate?.uuid}`,
  });

  return breadcrumbItems;
};
