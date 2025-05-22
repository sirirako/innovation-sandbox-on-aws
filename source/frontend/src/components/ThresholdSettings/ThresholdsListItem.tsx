// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  Box,
  Button,
  FormField,
  Select,
  SpaceBetween,
} from "@cloudscape-design/components";
import { FaArrowRight } from "react-icons/fa";

import { ThresholdAction } from "@amzn/innovation-sandbox-commons/data/lease-template/lease-template";
import { NumberInput } from "@amzn/innovation-sandbox-frontend/components/NumberInput";
import { ThresholdActionOptions } from "@amzn/innovation-sandbox-frontend/components/ThresholdSettings/constants";
import { Threshold } from "@amzn/innovation-sandbox-frontend/components/ThresholdSettings/types";

import styles from "./styles.module.scss";

interface ThresholdsListItemProps {
  threshold: Threshold;
  label?: string;
  valueError?: string | null;
  actionError?: string | null;
  isCurrency?: boolean;
  isReadOnly?: boolean;
  onChange?: (threshold: Threshold) => void;
  onDelete?: () => void;
}

export const ThresholdsListItem = ({
  threshold,
  label,
  valueError,
  actionError,
  isCurrency,
  isReadOnly,
  onChange,
  onDelete,
}: ThresholdsListItemProps) => {
  return (
    <div className={styles.row}>
      <Box>
        <SpaceBetween size="xs" direction="horizontal" alignItems="start">
          <div className={styles.cell}>When</div>
          <Box>
            <FormField errorText={valueError}>
              <SpaceBetween size="xs" direction="horizontal" alignItems="start">
                <NumberInput
                  value={threshold.value}
                  isInvalid={!!valueError}
                  isCurrency={isCurrency}
                  isReadOnly={isReadOnly}
                  onChange={(value) => {
                    // update parent
                    if (onChange) {
                      onChange({ ...threshold, value: value ?? 0 });
                    }
                  }}
                />
                <div className={styles.cell}>{label}</div>
              </SpaceBetween>
            </FormField>
          </Box>
        </SpaceBetween>
      </Box>
      <div className={styles.arrow}>
        <FaArrowRight />
      </div>
      <FormField errorText={actionError}>
        {isReadOnly && (
          <Select
            selectedOption={{ value: "Wipe Account" }}
            onChange={() => {}}
            readOnly
          />
        )}
        {!isReadOnly && (
          <Select
            options={ThresholdActionOptions}
            selectedOption={
              ThresholdActionOptions.find(
                (x) => x.value === threshold.action,
              ) ?? null
            }
            invalid={!!actionError}
            onChange={(event) => {
              if (onChange) {
                const newAction = event.detail.selectedOption
                  .value as ThresholdAction;

                onChange({ ...threshold, action: newAction });
              }
            }}
          />
        )}
      </FormField>
      {onDelete && (
        <Box>
          <Button
            iconName="remove"
            variant="icon"
            iconAlt="Remove"
            onClick={onDelete}
          />
        </Box>
      )}
    </div>
  );
};
