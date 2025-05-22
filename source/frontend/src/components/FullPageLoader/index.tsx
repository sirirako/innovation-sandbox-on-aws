// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import styles from "./styles.module.scss";

interface FullPageLoaderProps {
  label?: string;
}

export const FullPageLoader = ({
  label = "Loading...",
}: FullPageLoaderProps) => {
  return (
    <div className={styles.container}>
      <div className={styles.loader} />
      <div className={styles.label}>{label}</div>
    </div>
  );
};
