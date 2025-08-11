// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { FieldInputProps } from "@aws-northstar/ui";
import {
  Box,
  DatePicker,
  FormField,
  SpaceBetween,
  TimeInput,
} from "@cloudscape-design/components";
import moment from "moment";
import { useState } from "react";

interface DateTimeFormFieldProps {
  input: FieldInputProps<string>;
  label?: string;
  description?: string;
  showError?: boolean;
  meta: {
    error?: string;
    submitFailed?: boolean;
  };
}

export const DateTimeFormField = ({
  input,
  label,
  description,
  showError,
  meta: { error, submitFailed },
}: DateTimeFormFieldProps) => {
  const shouldShowError = showError || (error && submitFailed);

  // Track date and time separately
  const [selectedDate, setSelectedDate] = useState<string>(
    input.value ? moment(input.value).format("YYYY-MM-DD") : "",
  );
  const [selectedTime, setSelectedTime] = useState<string>(
    input.value ? moment(input.value).format("HH:mm") : "",
  );

  const onDateChange = (date: string) => {
    setSelectedDate(date);
    updateCombinedDateTime(date, selectedTime);
  };

  const onTimeChange = (time: string) => {
    setSelectedTime(time);
    updateCombinedDateTime(selectedDate, time);
  };

  const updateCombinedDateTime = (date: string, time: string) => {
    // Only combine if both date and time are valid
    if (date && time) {
      const combinedDateTime = moment(`${date} ${time}`, "YYYY-MM-DD HH:mm");

      if (combinedDateTime.isValid()) {
        input.onChange(combinedDateTime.toISOString());
        return;
      }
    }

    input.onChange(undefined);
  };

  return (
    <FormField
      label={label}
      description={description}
      errorText={shouldShowError ? error : null}
    >
      <SpaceBetween size="xxs">
        <SpaceBetween size="l" direction="horizontal" alignItems="center">
          <Box>
            <small data-muted>Date</small>
            <DatePicker
              invalid={!!shouldShowError && !!error}
              onChange={({ detail: { value } }) => onDateChange(value)}
              value={selectedDate}
            />
          </Box>
          <Box>
            <small data-muted>Time</small>
            <TimeInput
              invalid={!!shouldShowError && !!error}
              onChange={({ detail: { value } }) => onTimeChange(value)}
              format="hh:mm"
              value={selectedTime}
            />
          </Box>
        </SpaceBetween>
      </SpaceBetween>
    </FormField>
  );
};
