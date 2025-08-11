// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { FieldInputProps } from "@aws-northstar/ui";
import { FormField, SpaceBetween } from "@cloudscape-design/components";

import { NumberInput } from "@amzn/innovation-sandbox-frontend/components/NumberInput";

interface NumberFormFieldProps {
  input: FieldInputProps<number>;
  label?: string;
  description?: string;
  showError?: boolean;
  isCurrency?: boolean;
  helperText?: string;
  endText?: string;
  meta: {
    error?: string;
    submitFailed?: boolean;
  };
}

export const NumberFormField = ({
  input,
  label,
  description,
  showError,
  helperText,
  endText,
  isCurrency,
  meta: { error, submitFailed },
}: NumberFormFieldProps) => {
  const shouldShowError = showError || (error && submitFailed);

  return (
    <FormField
      label={label}
      description={description}
      errorText={shouldShowError ? error : null}
    >
      <SpaceBetween size="xxs">
        <SpaceBetween size="xs" direction="horizontal" alignItems="center">
          <NumberInput
            isInvalid={!!shouldShowError && !!error}
            isCurrency={isCurrency}
            onChange={input.onChange}
            value={input.value}
          />
          <span>{endText}</span>
        </SpaceBetween>
        {helperText && <div data-helper-text>{helperText}</div>}
      </SpaceBetween>
    </FormField>
  );
};
