// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { FormRenderer, FormRendererProps } from "@aws-northstar/ui";
import { useCallback, useMemo, useState } from "react";

import {
  FormContext,
  FormErrors,
  FormValues,
} from "@amzn/innovation-sandbox-frontend/components/Form/context";
import { showErrorToast } from "@amzn/innovation-sandbox-frontend/components/Toast";

import styles from "./styles.module.scss";

export type FormProps = FormRendererProps & {
  insideTab?: boolean;
  errorHeader?: string;
};

export const Form = ({ insideTab, ...props }: FormProps) => {
  const [formErrors, setFormErrors] = useState<FormErrors>();
  const [formValues, setFormValues] = useState<FormValues>(
    props.initialValues ?? {},
  );

  const handleValuesChange = useCallback(
    (values: Record<string, any>) => {
      // Schedule the state update for the next render cycle
      setTimeout(() => setFormValues(values));

      const errors = props.validate ? props.validate(values) : undefined;
      setFormErrors(errors as FormErrors);
      return errors;
    },
    [props.validate],
  );

  const onSubmit: FormRendererProps["onSubmit"] = async (...args) => {
    try {
      if (props.onSubmit) {
        await props.onSubmit(...args);
      }
    } catch (err: any) {
      const errorText = err.message ?? err.toString();
      showErrorToast(errorText, "Whoops, something went wrong!");
    }
  };

  const contextValues = useMemo(
    () => ({
      formValues,
      formErrors,
    }),
    [formValues, formErrors],
  );

  return (
    <FormContext.Provider value={contextValues}>
      <div
        className={
          insideTab && !props.schema.header ? styles.shiftUp : undefined
        }
      >
        <FormRenderer
          {...props}
          validate={handleValuesChange}
          onSubmit={onSubmit}
        />
      </div>
    </FormContext.Provider>
  );
};
