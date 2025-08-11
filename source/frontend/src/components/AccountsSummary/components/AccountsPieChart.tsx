// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from "react";

import {
  SandboxAccount,
  SandboxAccountStatus,
} from "@amzn/innovation-sandbox-commons/data/sandbox-account/sandbox-account";
import { convertAccountsToSummary } from "@amzn/innovation-sandbox-frontend/components/AccountsSummary/helpers";
import { PieChart } from "@cloudscape-design/components";

interface AccountsPieChartProps {
  accounts: SandboxAccount[];
  filter?: SandboxAccountStatus;
  onClick?: (status?: SandboxAccountStatus) => void;
}

export const AccountsPieChart = ({ accounts }: AccountsPieChartProps) => {
  const summary = useMemo(() => {
    return convertAccountsToSummary(accounts).filter((item) => item.value > 0);
  }, [accounts]);

  return (
    <PieChart
      data={summary}
      variant="donut"
      segmentDescription={(datum, sum) =>
        `${datum.value} accounts, ${((datum.value / sum) * 100).toFixed(0)}%`
      }
      hideFilter={true}
      hideLegend
    />
  );
};
