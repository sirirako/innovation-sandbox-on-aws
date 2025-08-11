// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { componentTypes } from "@aws-northstar/ui";
import { useNavigate } from "react-router-dom";

import { LeaseTemplate } from "@amzn/innovation-sandbox-commons/data/lease-template/lease-template";
import { Form } from "@amzn/innovation-sandbox-frontend/components/Form";
import { basicFormFields } from "@amzn/innovation-sandbox-frontend/domains/leaseTemplates/formFields/basic";
import { useUpdateLeaseTemplate } from "@amzn/innovation-sandbox-frontend/domains/leaseTemplates/hooks";
import { LeaseTemplateFormData } from "@amzn/innovation-sandbox-frontend/domains/leaseTemplates/types";

interface BasicDetailsFormProps {
  leaseTemplate: LeaseTemplate;
}

export const BasicDetailsForm = ({ leaseTemplate }: BasicDetailsFormProps) => {
  const navigate = useNavigate();

  const { mutateAsync: updateLeaseTemplate, isPending: isUpdating } =
    useUpdateLeaseTemplate();

  const onSubmit = async (data: any) => {
    const formValues = data as LeaseTemplateFormData;
    await updateLeaseTemplate(formValues);
    navigate("/lease_templates");
  };

  const onCancel = () => {
    navigate("/lease_templates");
  };

  return (
    <Form
      insideTab
      isSubmitting={isUpdating}
      onCancel={onCancel}
      onSubmit={onSubmit}
      initialValues={{
        ...leaseTemplate,
      }}
      schema={{
        submitLabel: "Update Basic Details",
        fields: [
          {
            component: componentTypes.SUB_FORM,
            ...basicFormFields(),
          },
        ],
      }}
    />
  );
};
