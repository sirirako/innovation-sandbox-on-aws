// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  Alert,
  Box,
  Container,
  SpaceBetween,
} from "@cloudscape-design/components";

import { ErrorPanel } from "@amzn/innovation-sandbox-frontend/components/ErrorPanel";
import { Loader } from "@amzn/innovation-sandbox-frontend/components/Loader";
import { useGetConfigurations } from "@amzn/innovation-sandbox-frontend/domains/settings/hooks";

export const TermsOfService = () => {
  const {
    data: config,
    isLoading,
    isError,
    refetch,
    error,
  } = useGetConfigurations();

  if (isLoading) {
    return <Loader label="Loading terms of service..." />;
  }

  if (isError) {
    return (
      <ErrorPanel
        description="Could not retrieve terms of service."
        retry={refetch}
        error={error as Error}
      />
    );
  }

  return (
    <SpaceBetween size="s">
      <Box variant="strong">
        Before continuing, please review the terms of service below.
      </Box>
      <Container>
        {config?.termsOfService ? (
          <pre>{config.termsOfService}</pre>
        ) : (
          <Alert
            type="warning"
            header="Terms of Service have not been configured yet."
          >
            Please contact your administrator!
          </Alert>
        )}
      </Container>
    </SpaceBetween>
  );
};
