// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { componentTypes, validatorTypes } from "@aws-northstar/ui";
import { Alert, FormField } from "@cloudscape-design/components";
import moment from "moment";

import { MonitoredLease } from "@amzn/innovation-sandbox-commons/data/lease/lease";
import { DateTimeFormField } from "@amzn/innovation-sandbox-frontend/components/DateTimeFormField";
import { Divider } from "@amzn/innovation-sandbox-frontend/components/Divider";
import { DurationStatus } from "@amzn/innovation-sandbox-frontend/components/DurationStatus";
import { Form } from "@amzn/innovation-sandbox-frontend/components/Form";
import { ThresholdSettings } from "@amzn/innovation-sandbox-frontend/components/ThresholdSettings";
import { thresholdValidator } from "@amzn/innovation-sandbox-frontend/components/ThresholdSettings/validator";

export type LeaseDurationFormProps = {
  expirationDate: MonitoredLease["expirationDate"];
  durationThresholds: MonitoredLease["durationThresholds"];
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isUpdating?: boolean;
};

export type LeaseDurationFormData = {
  expirationDate: MonitoredLease["expirationDate"];
  durationThresholds: MonitoredLease["durationThresholds"];
  expiryDateEnabled: boolean;
};

export const LeaseDurationForm = ({
  expirationDate,
  durationThresholds,
  onSubmit,
  onCancel,
  isUpdating,
}: LeaseDurationFormProps) => {
  return (
    <Form
      insideTab
      isSubmitting={isUpdating}
      onCancel={onCancel}
      onSubmit={onSubmit}
      initialValues={{
        expirationDate,
        durationThresholds,
        expiryDateEnabled: !!expirationDate,
      }}
      validate={(data) => {
        const formValues = data as LeaseDurationFormData;
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
            name: "duration",
            title: "Lease Duration",
            fields: [
              {
                component: componentTypes.PLAIN_TEXT,
                name: "info",
                label: (
                  <Alert type="info">
                    {expirationDate ? (
                      <>
                        This lease currently expires{" "}
                        <DurationStatus date={expirationDate} />
                      </>
                    ) : (
                      <>This lease currently does not expire</>
                    )}
                  </Alert>
                ),
              },
              {
                component: componentTypes.RADIO,
                name: "expiryDateEnabled",
                label: <FormField label="Expiry Date" />,
                options: [
                  {
                    label: expirationDate
                      ? "Remove expiry date"
                      : "Do not set an expiry date",
                    value: false,
                  },
                  {
                    label: "Set an expiry date",
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
                CustomComponent: DateTimeFormField,
                isCurrency: false,
                name: "expirationDate",
                showError: true,
                validate: [
                  (date: Date) => {
                    if (!date) {
                      return "Please enter a valid date and time";
                    }

                    // Convert to moment object for easier comparison
                    const selectedDateTime = moment(date);
                    const oneHourFromNow = moment().add(1, "hour");

                    // Check if the date/time is at least 1 hour in the future
                    if (selectedDateTime.isBefore(oneHourFromNow)) {
                      return "Please select a date and time at least 1 hour in the future";
                    }
                  },
                ],
                condition: {
                  when: "expiryDateEnabled",
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
                  when: "expiryDateEnabled",
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
                showError: true,
                condition: {
                  when: "expiryDateEnabled",
                  is: true,
                  then: {
                    visible: true,
                  },
                },
              },
            ],
          },
        ],
      }}
    />
  );
};
