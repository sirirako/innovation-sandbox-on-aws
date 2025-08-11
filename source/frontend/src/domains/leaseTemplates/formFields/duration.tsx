// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { componentTypes, validatorTypes } from "@aws-northstar/ui";
import { FormField } from "@cloudscape-design/components";

import { Divider } from "@amzn/innovation-sandbox-frontend/components/Divider";
import { NumberFormField } from "@amzn/innovation-sandbox-frontend/components/NumberFormField";
import { ThresholdSettings } from "@amzn/innovation-sandbox-frontend/components/ThresholdSettings";
import { thresholdValidator } from "@amzn/innovation-sandbox-frontend/components/ThresholdSettings/validator";
import { validateNumber } from "@amzn/innovation-sandbox-frontend/helpers/validators";

interface DurationFieldsProps {
  alwaysShowValidationErrors?: boolean;
  globalMaxDuration?: number;
}

export const durationFields = (props?: DurationFieldsProps) => ({
  name: "duration",
  title: "Lease Duration",
  fields: [
    {
      component: componentTypes.RADIO,
      name: "maxDurationEnabled",
      label: <FormField label="Maximum Duration" />,
      options: [
        {
          label: "Do not set a maximum duration",
          value: false,
        },
        {
          label: "Set a maximum duration",
          value: true,
        },
      ],
      validate: [
        {
          type: validatorTypes.REQUIRED,
          message: "Please select an option",
        },
      ],
    },
    {
      component: componentTypes.CUSTOM,
      CustomComponent: NumberFormField,
      isCurrency: false,
      name: "leaseDurationInHours",
      showError: props?.alwaysShowValidationErrors,
      label: <FormField label="Maximum Lease Duration (in hours)" />,
      validate: [
        validateNumber,
        (val: number) =>
          !!props?.globalMaxDuration && val > props.globalMaxDuration
            ? `Maximum lease duration is ${props.globalMaxDuration} hours`
            : undefined,
      ],
      condition: {
        when: "maxDurationEnabled",
        is: true,
        then: {
          visible: true,
        },
      },
    },
    {
      component: componentTypes.PLAIN_TEXT,
      name: "divider",
      label: <Divider />,
      condition: {
        when: "maxDurationEnabled",
        is: true,
        then: {
          visible: true,
        },
      },
    },
    {
      component: componentTypes.CUSTOM,
      CustomComponent: ThresholdSettings,
      name: "durationThresholds",
      label: "Duration Thresholds",
      description: "Determine what happens as time passes.",
      thresholdType: "duration",
      validate: [thresholdValidator("duration")],
      showError: props?.alwaysShowValidationErrors,
      condition: {
        when: "maxDurationEnabled",
        is: true,
        then: {
          visible: true,
        },
      },
    },
  ],
});
