// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  Button,
  ContentLayout,
  Header,
  SpaceBetween,
} from "@cloudscape-design/components";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { IsbUser } from "@amzn/innovation-sandbox-commons/types/isb-types";
import { Divider } from "@amzn/innovation-sandbox-frontend/components/Divider";
import { InfoLink } from "@amzn/innovation-sandbox-frontend/components/InfoLink";
import { Markdown } from "@amzn/innovation-sandbox-frontend/components/Markdown";
import { AccountsPanel } from "@amzn/innovation-sandbox-frontend/domains/home/components/AccountsPanel";
import { ApprovalsPanel } from "@amzn/innovation-sandbox-frontend/domains/home/components/ApprovalsPanel";
import { MyLeases } from "@amzn/innovation-sandbox-frontend/domains/home/components/MyLeases";
import { AuthService } from "@amzn/innovation-sandbox-frontend/helpers/AuthService";
import { useBreadcrumb } from "@amzn/innovation-sandbox-frontend/hooks/useBreadcrumb";
import { useInit } from "@amzn/innovation-sandbox-frontend/hooks/useInit";
import { useAppLayoutContext } from "@aws-northstar/ui/components/AppLayout";

export const Home = () => {
  const navigate = useNavigate();
  const setBreadcrumb = useBreadcrumb();
  const [user, setUser] = useState<IsbUser>();
  const { setTools } = useAppLayoutContext();

  useInit(async () => {
    setBreadcrumb([{ text: "Home", href: "/" }]);
    setTools(<Markdown file={"home"} />);

    // get user details
    const currentUser = await AuthService.getCurrentUser();
    setUser(currentUser);
  });

  const body = () => {
    if (user?.roles?.includes("Admin")) {
      return (
        <SpaceBetween size="m">
          <Divider />
          <ApprovalsPanel />
          <Divider />
          <AccountsPanel />
          <Divider />
          <MyLeases />
        </SpaceBetween>
      );
    }

    if (user?.roles?.includes("Manager")) {
      return (
        <SpaceBetween size="m">
          <Divider />
          <ApprovalsPanel />
          <Divider />
          <MyLeases />
        </SpaceBetween>
      );
    }

    return (
      <SpaceBetween size="m">
        <Divider />
        <MyLeases />
      </SpaceBetween>
    );
  };

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          actions={
            <Button onClick={() => navigate("/request")} variant="primary">
              Request a new lease
            </Button>
          }
          info={<InfoLink markdown="home" />}
        >
          Welcome to Innovation Sandbox on AWS
        </Header>
      }
    >
      {body()}
    </ContentLayout>
  );
};
