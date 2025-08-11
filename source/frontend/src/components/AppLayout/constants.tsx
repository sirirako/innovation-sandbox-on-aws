// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { SideNavigationProps } from "@cloudscape-design/components";

import { ApprovalsBadge } from "@amzn/innovation-sandbox-frontend/domains/leases/components/ApprovalsBadge";

export const commonNavItems: SideNavigationProps.Item[] = [
  { type: "divider" },
  {
    external: true,
    href: "https://docs.aws.amazon.com/solutions/latest/innovation-sandbox-on-aws/use-the-solution.html",
    text: "Documentation",
    type: "link",
  },
];

export const userNavItems: SideNavigationProps.Item[] = [
  { href: "/", text: "Home", type: "link" },
];

export const managerNavItems: SideNavigationProps.Item[] = [
  ...userNavItems,
  { type: "divider" },
  {
    href: "/approvals",
    text: "Approvals",
    type: "link",
    info: <ApprovalsBadge />,
  },
  { href: "/leases", text: "Leases", type: "link" },
  { href: "/lease_templates", text: "Lease Templates", type: "link" },
];

export const adminNavItems: SideNavigationProps.Item[] = [
  ...managerNavItems,
  { type: "divider" },
  {
    type: "section",
    text: "Administration",
    items: [
      { href: "/accounts", text: "Accounts", type: "link" },
      { href: "/settings", text: "Settings", type: "link" },
    ],
  },
];

export const spacerSvg = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  ></svg>
);
