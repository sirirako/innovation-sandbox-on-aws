// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Badge } from "@cloudscape-design/components";

import { useGetPendingApprovals } from "@amzn/innovation-sandbox-frontend/domains/leases/hooks";

export const ApprovalsBadge = () => {
  const { data: requests } = useGetPendingApprovals();

  if (requests && requests.length > 0) {
    return <Badge color="red">{requests.length}</Badge>;
  }

  return <></>;
};
