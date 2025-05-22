// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  Box,
  Button,
  Container,
  SpaceBetween,
  StatusIndicator,
} from "@cloudscape-design/components";
import { useNavigate } from "react-router-dom";

import styles from "@amzn/innovation-sandbox-frontend/components/AccountsSummary/styles.module.scss";
import Animate from "@amzn/innovation-sandbox-frontend/components/Animate";

export const NoAccounts = () => {
  const navigate = useNavigate();

  return (
    <Container>
      <div className={styles.container}>
        <div className={styles.middle}>
          <Animate>
            <SpaceBetween size="m" alignItems="center">
              <StatusIndicator type="warning">
                It looks like there are no accounts in the account pool.
              </StatusIndicator>
              <Box>
                Start adding accounts to get started with Innovation Sandbox.
              </Box>
              <Button onClick={() => navigate("/accounts/new")}>
                Add accounts
              </Button>
            </SpaceBetween>
          </Animate>
        </div>
      </div>
    </Container>
  );
};
