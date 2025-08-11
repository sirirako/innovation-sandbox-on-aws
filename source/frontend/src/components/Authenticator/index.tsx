// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from "react";

import { IsbUser } from "@amzn/innovation-sandbox-commons/types/isb-types";
import Animate from "@amzn/innovation-sandbox-frontend/components/Animate";
import { FullPageLoader } from "@amzn/innovation-sandbox-frontend/components/FullPageLoader";
import { AuthService } from "@amzn/innovation-sandbox-frontend/helpers/AuthService";
import { useInit } from "@amzn/innovation-sandbox-frontend/hooks/useInit";

interface AuthenticatorProps {
  children: React.ReactNode;
}

export const Authenticator = ({ children }: AuthenticatorProps) => {
  const [isLoading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<IsbUser | undefined>();

  useInit(async () => {
    const user = await AuthService.getCurrentUser();

    if (user) {
      // Remove the token from the URL without reloading the page
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    setCurrentUser(user);
    setLoading(false);
  });

  if (isLoading) {
    return <FullPageLoader label="Authenticating..." />;
  }

  if (currentUser) {
    return <Animate>{children}</Animate>;
  }

  if (!currentUser) {
    // redirect to login page if user is not logged in
    // warning: could result in endless loop if IDC/auth is not configured correctly
    AuthService.login();
    return <FullPageLoader label="Redirecting..." />;
  }
};
