// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  applyDensity,
  applyMode,
  Density,
  Mode,
} from "@cloudscape-design/global-styles";
import React, { useEffect, useMemo, useState } from "react";

import { BaseContext } from "@amzn/innovation-sandbox-frontend/components/AppContext/context";

interface AppContextProps {
  children: React.ReactNode;
}

export const AppContext = ({ children }: AppContextProps) => {
  // check if theme is set in local storage
  const localTheme =
    localStorage.getItem("theme") === "dark" ? Mode.Dark : Mode.Light;
  const localDensity =
    localStorage.getItem("density") === "compact"
      ? Density.Compact
      : Density.Comfortable;

  const [theme, setTheme] = useState(localTheme);
  const [density, setDensity] = useState(localDensity);

  // default breadcrumb
  const [breadcrumb, setBreadcrumb] = useState([{ text: "Home", href: "/" }]);

  useEffect(() => {
    // apply cloudscape theme
    applyMode(theme);

    // update local storage
    localStorage.setItem("theme", theme === Mode.Dark ? "dark" : "light");
  }, [theme]);

  useEffect(() => {
    // update cloudscape density
    applyDensity(density);

    // update local storage
    localStorage.setItem(
      "density",
      density === Density.Compact ? "compact" : "comfortable",
    );
  }, [density]);

  // set cloudscape theme on initial load
  useEffect(() => {
    setTimeout(() => {
      applyMode(localTheme === "dark" ? Mode.Dark : Mode.Light);
      applyDensity(
        localDensity === "compact" ? Density.Compact : Density.Comfortable,
      );
    });
  }, []);

  const contextValue = useMemo(
    () => ({
      breadcrumb,
      setBreadcrumb,
      theme,
      setTheme,
      density,
      setDensity,
    }),
    [breadcrumb, theme, density],
  );

  return (
    <BaseContext.Provider value={contextValue}>{children}</BaseContext.Provider>
  );
};
