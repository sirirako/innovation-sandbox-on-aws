// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { KeyValuePairs } from "@cloudscape-design/components";

import { ErrorPanel } from "@amzn/innovation-sandbox-frontend/components/ErrorPanel";
import { Loader } from "@amzn/innovation-sandbox-frontend/components/Loader";
import { SettingsContainer } from "@amzn/innovation-sandbox-frontend/domains/settings/components/SettingsContainer";
import { useGetConfigurations } from "@amzn/innovation-sandbox-frontend/domains/settings/hooks";

export const LeaseSettings = () => {
  const {
    data: config,
    isLoading,
    isError: loadingError,
    refetch,
    error,
  } = useGetConfigurations();

  if (isLoading) {
    return <Loader />;
  }

  if (loadingError || !config) {
    return (
      <ErrorPanel
        description="There was a problem loading settings."
        retry={refetch}
        error={error as Error}
      />
    );
  }

  return (
    <SettingsContainer>
      <KeyValuePairs
        columns={3}
        items={[
          {
            type: "group",
            title: "Budget",
            items: [
              {
                label: "Max Budget",
                value: `$${config.leases.maxBudget} USD`,
              },
              {
                label: "Require Max Budget",
                value: config.leases.requireMaxBudget.toString(),
              },
            ],
          },
          {
            type: "group",
            title: "Duration",
            items: [
              {
                label: "Max Lease Duration",
                value: `${config.leases.maxDurationHours} hours`,
              },
              {
                label: "Require Max Lease Duration",
                value: config.leases.requireMaxDuration.toString(),
              },
            ],
          },
          {
            type: "group",
            title: "User limits",
            items: [
              {
                label: "Max leases per user",
                value: config.leases.maxLeasesPerUser,
              },
            ],
          },
        ]}
      />
    </SettingsContainer>
  );
};
