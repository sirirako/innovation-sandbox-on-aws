// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { componentTypes } from "@aws-northstar/ui";

import { LeaseTemplate } from "@amzn/innovation-sandbox-commons/data/lease-template/lease-template";
import { Form } from "@amzn/innovation-sandbox-frontend/components/Form";
import { thresholdValidator } from "@amzn/innovation-sandbox-frontend/components/ThresholdSettings/validator";
import { durationFields } from "@amzn/innovation-sandbox-frontend/domains/leaseTemplates/formFields/duration";

type DurationFormProps = {
  leaseDurationInHours: LeaseTemplate["leaseDurationInHours"];
  durationThresholds: LeaseTemplate["durationThresholds"];
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isUpdating?: boolean;
  globalMaxDuration?: number;
};

export type DurationFormData = {
  leaseDurationInHours: LeaseTemplate["leaseDurationInHours"];
  durationThresholds: LeaseTemplate["durationThresholds"];
  maxDurationEnabled: boolean;
};
export const DurationForm = ({
  leaseDurationInHours,
  durationThresholds,
  onSubmit,
  onCancel,
  isUpdating,
  globalMaxDuration,
}: DurationFormProps) => {
  return (
    <Form
      insideTab
      isSubmitting={isUpdating}
      onCancel={onCancel}
      onSubmit={onSubmit}
      initialValues={{
        leaseDurationInHours,
        durationThresholds,
        maxDurationEnabled:
          leaseDurationInHours === undefined ? false : leaseDurationInHours > 0,
      }}
      validate={(data) => {
        const formValues = data as DurationFormData;
        const validateDuration = thresholdValidator("duration");

        const durationError = validateDuration(
          formValues.durationThresholds,
          formValues,
        );

        if (durationError) {
          return {
            durationThresholds: durationError,
          };
        }
      }}
      schema={{
        submitLabel: "Update Duration Settings",
        fields: [
          {
            component: componentTypes.SUB_FORM,
            ...durationFields({
              alwaysShowValidationErrors: true,
              globalMaxDuration,
            }),
          },
        ],
      }}
    />
  );
};
