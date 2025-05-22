// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useAppContext } from "@amzn/innovation-sandbox-frontend/components/AppContext/context";

export interface Breadcrumb {
  text: string;
  href: string;
}

export const useBreadcrumb = () => {
  const { setBreadcrumb } = useAppContext();

  const updateBreadcrumb = (newBreadcrumb: Breadcrumb[]) => {
    setBreadcrumb(newBreadcrumb);
  };

  return updateBreadcrumb;
};
