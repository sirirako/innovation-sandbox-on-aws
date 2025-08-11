// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { FieldInputProps } from "@aws-northstar/ui";
import {
  Alert,
  Button,
  Header,
  SpaceBetween,
} from "@cloudscape-design/components";

import {
  BudgetThreshold,
  DurationThreshold,
} from "@amzn/innovation-sandbox-commons/data/lease-template/lease-template";
import { useFormContext } from "@amzn/innovation-sandbox-frontend/components/Form/context";
import { ThresholdTypes } from "@amzn/innovation-sandbox-frontend/components/ThresholdSettings/constants";
import { ThresholdListContainer } from "@amzn/innovation-sandbox-frontend/components/ThresholdSettings/ThresholdsListContainer";
import { ThresholdsListItem } from "@amzn/innovation-sandbox-frontend/components/ThresholdSettings/ThresholdsListItem";
import { Threshold } from "@amzn/innovation-sandbox-frontend/components/ThresholdSettings/types";
import {
  getThresholdValue,
  validateThreshold,
} from "@amzn/innovation-sandbox-frontend/components/ThresholdSettings/validator";

interface ThresholdSettingsProps {
  input: FieldInputProps<(BudgetThreshold | DurationThreshold)[]>;
  data: Record<string, object>;
  label?: string;
  description?: string;
  showError?: boolean;
  thresholdType: "budget" | "duration";
  meta: {
    submitFailed?: boolean;
    error?: string;
  };
}

export const ThresholdSettings = ({
  input: { value: thresholds, onChange },
  label,
  description,
  showError,
  thresholdType,
  meta: { error, submitFailed },
}: ThresholdSettingsProps) => {
  const type = ThresholdTypes[thresholdType];

  // get max value from other form field
  const {
    formValues: {
      [type.maxValueAttributeName]: maxValueObj,
      [type.maxValueEnabledAttributeName]: maxValueEnabled,
    },
    formErrors,
  } = useFormContext();

  const shouldShowError = showError || ((error || formErrors) && submitFailed);

  const maxValue =
    maxValueEnabled && maxValueObj ? Number(maxValueObj) : undefined;

  // add empty threshold to end of list
  const onAdd = () => {
    onChange([...thresholds, {}]);
  };

  // when threshold value or action is updated, update the list
  const onUpdate = (threshold: Threshold, index: number) => {
    // create new list
    const list = [...thresholds] as any[];

    // replace item at index with new item
    list[index] = {
      action: threshold.action ?? "",
      [type.valueAttributeName]: threshold.value ?? "",
    };

    onChange(list);
  };

  // when threshold is deleted
  const onDelete = (index: number) => {
    // remove item from list
    thresholds.splice(index, 1);
    onChange(thresholds);
  };

  return (
    <SpaceBetween size="s">
      <Header description={description}>
        {label}{" "}
        <span data-counter>
          ({maxValue ? thresholds.length + 1 : thresholds.length})
        </span>
      </Header>
      {(() => {
        if (thresholds.length === 0 && !maxValue) {
          return <Alert type="info">No thresholds created.</Alert>;
        }

        return (
          <ThresholdListContainer>
            {(thresholds || []).map((threshold, index) => (
              <ThresholdsListItem
                key={index} // NOSONAR javascript:S6479 - the thresholds array is generated in the form and is rerendered anyways on update
                label={type.label}
                threshold={{
                  action: threshold.action,
                  value: getThresholdValue(threshold),
                }}
                {...(shouldShowError
                  ? validateThreshold(thresholds, index, maxValue)
                  : undefined)}
                isCurrency={type.isCurrency}
                onChange={(threshold) => onUpdate(threshold, index)}
                onDelete={() => onDelete(index)}
              />
            ))}

            {maxValue && (
              <ThresholdsListItem
                isReadOnly
                label={type.label}
                threshold={{
                  value: type.lastThresholdIsZero ? 0 : maxValue,
                }}
                isCurrency={type.isCurrency}
              />
            )}
          </ThresholdListContainer>
        );
      })()}

      <Button iconName="add-plus" onClick={onAdd}>
        Add a threshold
      </Button>
    </SpaceBetween>
  );
};
