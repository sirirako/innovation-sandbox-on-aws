// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { componentTypes, validatorTypes } from "@aws-northstar/ui";
import { Alert, Box, FormField } from "@cloudscape-design/components";

import { Divider } from "@amzn/innovation-sandbox-frontend/components/Divider";
import { NumberFormField } from "@amzn/innovation-sandbox-frontend/components/NumberFormField";
import { ThresholdSettings } from "@amzn/innovation-sandbox-frontend/components/ThresholdSettings";
import { thresholdValidator } from "@amzn/innovation-sandbox-frontend/components/ThresholdSettings/validator";
import { validateNumber } from "@amzn/innovation-sandbox-frontend/helpers/validators";

interface BudgetFieldsProps {
  alwaysShowValidationErrors?: boolean;
  globalMaxBudget?: number;
}

export const budgetFields = (props?: BudgetFieldsProps) => ({
  name: "budget",
  title: "Budget",
  fields: [
    {
      component: componentTypes.RADIO,
      name: "maxBudgetEnabled",
      label: <FormField label="Maximum Budget" />,
      options: [
        {
          label: "Do not set a budget",
          value: false,
        },
        {
          label: "Set a max budget",
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
      component: componentTypes.PLAIN_TEXT,
      name: "budgetWarning",
      label: (
        <Box data-inline-block>
          <Alert type="warning">
            If you don't set a max budget, there is a risk that these accounts
            may have cost overruns.{" "}
          </Alert>
        </Box>
      ),
      condition: {
        when: "maxBudgetEnabled",
        is: false,
        then: {
          visible: true,
        },
      },
    },
    {
      component: componentTypes.CUSTOM,
      CustomComponent: NumberFormField,
      isCurrency: true,
      name: "maxSpend",
      showError: props?.alwaysShowValidationErrors,
      label: <FormField label="Maximum Budget Amount" />,
      validate: [
        validateNumber,
        (val: number) =>
          !!props?.globalMaxBudget && val > props.globalMaxBudget
            ? `Maximum budget is $${props.globalMaxBudget}`
            : undefined,
      ],
      condition: {
        when: "maxBudgetEnabled",
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
    },
    {
      component: componentTypes.CUSTOM,
      CustomComponent: ThresholdSettings,
      name: "budgetThresholds",
      label: "Budget Thresholds",
      description: "Determine what happens as budget is consumed.",
      thresholdType: "budget",
      validate: [thresholdValidator("budget")],
      showError: props?.alwaysShowValidationErrors,
    },
  ],
});
