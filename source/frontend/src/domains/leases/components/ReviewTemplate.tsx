// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { KeyValuePair } from "@aws-northstar/ui";
import {
  Alert,
  Box,
  Container,
  SpaceBetween,
  StatusIndicator,
} from "@cloudscape-design/components";

import { BudgetStatus } from "@amzn/innovation-sandbox-frontend/components/BudgetStatus";
import { DurationStatus } from "@amzn/innovation-sandbox-frontend/components/DurationStatus";
import { Loader } from "@amzn/innovation-sandbox-frontend/components/Loader";
import { useGetLeaseTemplateById } from "@amzn/innovation-sandbox-frontend/domains/leaseTemplates/hooks";

type ReviewTemplateProps = {
  data: { leaseTemplateUuid: string };
};

export const ReviewTemplate = (props: ReviewTemplateProps) => {
  const {
    data: leaseTemplate,
    isLoading,
    isError,
    error,
  } = useGetLeaseTemplateById(props.data.leaseTemplateUuid);

  if (isLoading) {
    return <Loader data-testid="loader" />;
  }

  if (isError) {
    return (
      <Alert type="error">
        Error loading lease template:{" "}
        {error instanceof Error ? error.message : "Unknown error"}
      </Alert>
    );
  }

  if (!leaseTemplate) {
    return null;
  }

  return (
    <SpaceBetween size="s">
      <KeyValuePair
        label="Lease Template Selected"
        value={
          <Box margin={{ top: "xs" }}>
            <Container>
              <SpaceBetween size="xs">
                <Box>
                  <Box>
                    <strong>{leaseTemplate.name}</strong>
                  </Box>
                  <Box>
                    <small>{leaseTemplate.description}</small>
                  </Box>
                </Box>

                <Box data-muted>
                  <strong>Expires: </strong>
                  <DurationStatus
                    durationInHours={leaseTemplate.leaseDurationInHours}
                  />
                </Box>
                <Box data-muted>
                  <strong>Max budget: </strong>
                  <BudgetStatus maxSpend={leaseTemplate.maxSpend} />
                </Box>
                <Box>
                  {!leaseTemplate.requiresApproval ? (
                    <StatusIndicator type="success">
                      No approval required
                    </StatusIndicator>
                  ) : (
                    <StatusIndicator type="warning">
                      Requires approval
                    </StatusIndicator>
                  )}
                </Box>
              </SpaceBetween>
            </Container>
          </Box>
        }
      />
    </SpaceBetween>
  );
};
