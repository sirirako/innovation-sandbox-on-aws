// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { StatusIndicator } from "@cloudscape-design/components";

import { formatCurrency } from "@amzn/innovation-sandbox-frontend/helpers/util";

interface BudgetStatusProps {
  maxSpend?: number;
}

export const BudgetStatus = ({ maxSpend }: BudgetStatusProps) => {
  return (
    <>
      {maxSpend ? (
        formatCurrency(maxSpend)
      ) : (
        <StatusIndicator type="info">No max budget</StatusIndicator>
      )}
    </>
  );
};
