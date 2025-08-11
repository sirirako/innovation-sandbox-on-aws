// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box } from "@cloudscape-design/components";

import styles from "./styles.module.scss";

interface ThresholdListContainerProps {
  children: React.ReactNode;
}

export const ThresholdListContainer = ({
  children,
}: ThresholdListContainerProps) => {
  return (
    <div className={styles.container}>
      <div className={styles.row}>
        <Box>
          <Box>
            <strong>Threshold</strong>
          </Box>
          <Box>
            <small data-muted>When should this threshold be triggered?</small>
          </Box>
        </Box>
        <Box />
        <Box>
          <Box>
            <strong>Action</strong>
          </Box>
          <Box>
            <small data-muted>
              What should happen when the threshold is triggered?
            </small>
          </Box>
        </Box>
      </div>
      {children}
    </div>
  );
};
