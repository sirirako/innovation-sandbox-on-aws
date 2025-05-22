// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { KeyValuePairs, StatusIndicator } from "@cloudscape-design/components";

import { ErrorPanel } from "@amzn/innovation-sandbox-frontend/components/ErrorPanel";
import { Loader } from "@amzn/innovation-sandbox-frontend/components/Loader";
import { SettingsContainer } from "@amzn/innovation-sandbox-frontend/domains/settings/components/SettingsContainer";
import { useGetConfigurations } from "@amzn/innovation-sandbox-frontend/domains/settings/hooks";

export const CleanupSettings = () => {
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
        columns={2}
        items={[
          {
            label: "Wait before Rerun Successful Attempt",
            value: config.cleanup.waitBeforeRerunSuccessfulAttemptSeconds ? (
              <>
                {config.cleanup.waitBeforeRerunSuccessfulAttemptSeconds} seconds
              </>
            ) : (
              <StatusIndicator type="warning">Not set</StatusIndicator>
            ),
          },

          {
            label: "Number of failed attempts to cancel cleanup",
            value: config.cleanup.numberOfFailedAttemptsToCancelCleanup ? (
              <>{config.cleanup.numberOfFailedAttemptsToCancelCleanup}</>
            ) : (
              <StatusIndicator type="warning">Not set</StatusIndicator>
            ),
          },
          {
            label: "Wait before retrying failed attempt",
            value: config.cleanup.waitBeforeRetryFailedAttemptSeconds ? (
              <>{config.cleanup.waitBeforeRetryFailedAttemptSeconds} seconds</>
            ) : (
              <StatusIndicator type="warning">Not set</StatusIndicator>
            ),
          },
          {
            label: "Number of successful attempts to finish cleanup",
            value: config.cleanup.numberOfSuccessfulAttemptsToFinishCleanup ? (
              <>{config.cleanup.numberOfSuccessfulAttemptsToFinishCleanup}</>
            ) : (
              <StatusIndicator type="warning">Not set</StatusIndicator>
            ),
          },
        ]}
      />
    </SettingsContainer>
  );
};
