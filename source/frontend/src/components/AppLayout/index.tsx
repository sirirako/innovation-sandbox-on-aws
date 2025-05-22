// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ReactNode } from "react";

import { AppContext } from "@amzn/innovation-sandbox-frontend/components/AppContext";
import { BaseLayout } from "@amzn/innovation-sandbox-frontend/components/AppLayout/BaseLayout";

export interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <AppContext>
      <BaseLayout>{children}</BaseLayout>
    </AppContext>
  );
};
