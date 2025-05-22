// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { createContext, useContext } from "react";

export type FormValues = Record<string, any>;
export type FormErrors = Record<string, string>;
export type FormInfo = {
  formValues: FormValues;
  formErrors?: FormErrors;
};

export const FormContext = createContext<FormInfo>({
  formValues: {},
  formErrors: {},
});

export const useFormContext = () => useContext(FormContext);
