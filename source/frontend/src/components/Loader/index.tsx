// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, SpaceBetween } from "@cloudscape-design/components";

import styles from "./styles.module.scss";

interface LoaderProps {
  label?: string;
}

export const Loader = ({ label = "Loading..." }: LoaderProps) => {
  return (
    <Box margin={{ bottom: "xs" }}>
      <SpaceBetween size="s" direction="horizontal" alignItems="center">
        <div className={styles.loaderContainer}>
          <span className={styles.loader} />
        </div>
        <span>{label}</span>
      </SpaceBetween>
    </Box>
  );
};
