// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Input } from "@cloudscape-design/components";

import styles from "./styles.module.scss";

interface NumberInputProps {
  value?: number;
  isInvalid?: boolean;
  isCurrency?: boolean;
  isReadOnly?: boolean;
  onChange?: (value: number | undefined) => void;
}

export const NumberInput = ({
  value,
  isInvalid,
  isCurrency,
  isReadOnly,
  onChange,
}: NumberInputProps) => {
  const handleChange = ({ detail }: { detail: { value: string } }) => {
    if (!onChange) return;

    const num = parseInt(detail.value);
    onChange(isNaN(num) ? undefined : num);
  };

  const formattedValue =
    value !== undefined && !Number.isNaN(value) ? value.toString() : "";

  const inputElement = (
    <Input
      readOnly={isReadOnly}
      data-small-input
      invalid={isInvalid}
      onChange={handleChange}
      value={formattedValue}
    />
  );

  if (isCurrency) {
    const containerClassName = `${isInvalid ? styles.error : ""} ${isReadOnly ? styles.readOnly : ""}`;
    return (
      <div className={containerClassName}>
        <div className={styles.container}>
          <div className={styles.left}>USD $</div>
          {inputElement}
        </div>
      </div>
    );
  }

  return (
    <div className={isReadOnly ? styles.readOnly : undefined}>
      {inputElement}
    </div>
  );
};
