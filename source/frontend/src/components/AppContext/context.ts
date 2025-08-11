// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Density, Mode } from "@cloudscape-design/global-styles";
import { createContext, useContext } from "react";

import { Breadcrumb } from "@amzn/innovation-sandbox-frontend/hooks/useBreadcrumb";

type ThemeMode = Mode.Light | Mode.Dark;
type ThemeDensity = Density.Comfortable | Density.Compact;

// Define the type for the app context
interface BaseContextType {
  theme: ThemeMode;
  density: ThemeDensity;
  breadcrumb: Breadcrumb[];
  setBreadcrumb: (newBreadcrumb: Breadcrumb[]) => void;
  setTheme: (theme: ThemeMode) => void;
  setDensity: (density: ThemeDensity) => void;
}

// Create the app context
export const BaseContext = createContext<BaseContextType>({
  breadcrumb: [],
  theme: Mode.Light,
  density: Density.Comfortable,
  setBreadcrumb: () => {},
  setTheme: () => {},
  setDensity: () => {},
});

// hook to get context (syntactic sugar)
export const useAppContext = () => useContext(BaseContext);
