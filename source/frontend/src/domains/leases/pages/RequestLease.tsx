// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { componentTypes, validatorTypes } from "@aws-northstar/ui";
import { useNavigate } from "react-router-dom";

import { Form } from "@amzn/innovation-sandbox-frontend/components/Form";
import { showSuccessToast } from "@amzn/innovation-sandbox-frontend/components/Toast";
import { ReviewTemplate } from "@amzn/innovation-sandbox-frontend/domains/leases/components/ReviewTemplate";
import { SelectLeaseTemplate } from "@amzn/innovation-sandbox-frontend/domains/leases/components/SelectLeaseTemplate";
import { TermsOfService } from "@amzn/innovation-sandbox-frontend/domains/leases/components/TermsOfService";
import { useRequestNewLease } from "@amzn/innovation-sandbox-frontend/domains/leases/hooks";
import { NewLeaseRequest } from "@amzn/innovation-sandbox-frontend/domains/leases/types";
import { useBreadcrumb } from "@amzn/innovation-sandbox-frontend/hooks/useBreadcrumb";
import { useInit } from "@amzn/innovation-sandbox-frontend/hooks/useInit";

export const RequestLease = () => {
  const navigate = useNavigate();
  const setBreadcrumb = useBreadcrumb();

  const { mutateAsync: requestNewLease, isPending: isSubmitting } =
    useRequestNewLease();

  useInit(() => {
    setBreadcrumb([
      { text: "Home", href: "/" },
      { text: "Request lease", href: "/request" },
    ]);
  });

  const onSubmit = async (data: unknown) => {
    const formData = data as NewLeaseRequest;

    const request = {
      leaseTemplateUuid: formData.leaseTemplateUuid,
      comments: formData.comments,
    } as NewLeaseRequest;

    await requestNewLease(request);
    navigate("/");
    showSuccessToast("Your request for a new lease has been submitted.");
  };

  const onCancel = () => {
    navigate("/");
  };

  return (
    <>
      <Form
        isSubmitting={isSubmitting}
        onCancel={onCancel}
        onSubmit={onSubmit}
        schema={{
          header: "Request lease",
          description: "Request to lease an AWS sandbox account.",
          fields: [
            {
              component: componentTypes.WIZARD,
              name: "wizard",
              allowSkipTo: true,
              fields: [
                {
                  name: "lease-template",
                  title: "Select lease template",
                  fields: [
                    {
                      component: componentTypes.CUSTOM,
                      label:
                        "What lease template would you like to use request a lease?",
                      CustomComponent: SelectLeaseTemplate,
                      isRequired: true,
                      name: "leaseTemplateUuid",
                      validate: [
                        {
                          type: validatorTypes.REQUIRED,
                          message: "Please select an option to continue",
                        },
                      ],
                    },
                  ],
                },
                {
                  name: "terms",
                  title: "Terms of Service",
                  fields: [
                    {
                      component: componentTypes.PLAIN_TEXT,
                      name: "terms",
                      label: <TermsOfService />,
                    },
                    {
                      component: componentTypes.CHECKBOX,
                      name: "acceptTerms",
                      label: "I accept the above terms of service.",
                      validate: [
                        {
                          type: validatorTypes.REQUIRED,
                          message:
                            "Please accept the terms of service to continue",
                        },
                      ],
                    },
                  ],
                },
                {
                  name: "review",
                  title: "Review & Submit",
                  fields: [
                    {
                      component: componentTypes.REVIEW,
                      name: "review",
                      Template: ReviewTemplate,
                    },
                    {
                      component: componentTypes.TEXTAREA,
                      name: "comments",
                      label: "Comments",
                      description:
                        "Optional - add additional comments to support your request",
                    },
                  ],
                },
              ],
            },
          ],
        }}
      />
    </>
  );
};
