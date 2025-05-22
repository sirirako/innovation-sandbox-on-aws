// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Container } from "@cloudscape-design/components";

import styles from "@amzn/innovation-sandbox-frontend/components/AccountsSummary/styles.module.scss";
import { Loader } from "@amzn/innovation-sandbox-frontend/components/Loader";

export const AccountsLoading = () => {
  return (
    <Container>
      <div className={styles.container}>
        <div className={styles.middle}>
          <Loader label="Loading account info..." />
        </div>
      </div>
    </Container>
  );
};
