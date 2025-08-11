// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, BoxProps } from "@cloudscape-design/components";

import styles from "./styles.module.scss";

interface DividerProps {
  marginTop?: "xs" | "s" | "m" | "l" | "xl";
  marginBottom?: "xs" | "s" | "m" | "l" | "xl";
}

export const Divider = ({ marginTop, marginBottom }: DividerProps) => {
  const margin: BoxProps["margin"] = {};

  if (marginTop) {
    margin.top = marginTop;
  }

  if (marginBottom) {
    margin.bottom = marginBottom;
  }

  return (
    <Box margin={margin}>
      <hr className={styles.divider} />
    </Box>
  );
};
