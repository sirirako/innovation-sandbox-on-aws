// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import TopNavigation, {
  TopNavigationProps,
} from "@cloudscape-design/components/top-navigation";
import { Density, Mode } from "@cloudscape-design/global-styles";
import { FC, useMemo } from "react";

import { IsbUser } from "@amzn/innovation-sandbox-commons/types/isb-types";
import { useAppContext } from "@amzn/innovation-sandbox-frontend/components/AppContext/context";
import { spacerSvg } from "@amzn/innovation-sandbox-frontend/components/AppLayout/constants";
import { useAppLayoutContext } from "@aws-northstar/ui/components/AppLayout";

export interface NavHeaderProps {
  title: string;
  logo?: string;
  href?: string;
  user?: IsbUser;
  onExit?: () => void;
}

export const NavHeader: FC<NavHeaderProps> = ({
  title,
  href = "/",
  logo,
  user,
  onExit,
}) => {
  const { theme, density, setTheme, setDensity } = useAppContext();
  const { setToolsOpen, setToolsHide } = useAppLayoutContext();

  const utilities: TopNavigationProps.Utility[] = useMemo(() => {
    const menu: TopNavigationProps.Utility[] = [
      {
        type: "menu-dropdown",
        iconName: "settings",
        ariaLabel: "Settings",
        items: [
          {
            id: "theme",
            text: "Theme",
            items: [
              {
                id: "theme.light",
                text: "Light",
                iconName: theme === Mode.Light ? "check" : undefined,
                iconSvg: theme !== Mode.Light ? spacerSvg : undefined,
              },
              {
                id: "theme.dark",
                text: "Dark",
                iconName: theme === Mode.Dark ? "check" : undefined,
                iconSvg: theme !== Mode.Dark ? spacerSvg : undefined,
              },
            ],
          },
          {
            id: "density",
            text: "Density",
            items: [
              {
                id: "density.comfortable",
                text: "Comfortable",
                iconName: density === Density.Comfortable ? "check" : undefined,
                iconSvg:
                  density !== Density.Comfortable ? spacerSvg : undefined,
              },
              {
                id: "density.compact",
                text: "Compact",
                iconName: density === Density.Compact ? "check" : undefined,
                iconSvg: density !== Density.Compact ? spacerSvg : undefined,
              },
            ],
          },
        ],
        onItemClick: (e) => {
          switch (e.detail.id) {
            case "theme.light":
              setTheme(Mode.Light);
              break;
            case "theme.dark":
              setTheme(Mode.Dark);
              break;
            case "density.comfortable":
              setDensity(Density.Comfortable);
              break;
            case "density.compact":
              setDensity(Density.Compact);
              break;
            default:
              break;
          }
        },
      },
      {
        type: "button",
        iconName: "status-info",
        onClick: () => {
          setToolsHide(false);
          setToolsOpen((prev) => !prev);
        },
      },
    ];

    if (user) {
      menu.push({
        type: "menu-dropdown",
        text: user.displayName,
        description: user.email,
        iconName: "user-profile",
        items: [{ id: "exit", text: "Exit" }],
        onItemClick: onExit,
      });
    }

    return menu;
  }, [theme, density, setDensity, setTheme, user, onExit]);

  const topNavLogo = logo ? { src: logo, alt: title } : undefined;

  return (
    <>
      <div id="app-header">
        <TopNavigation
          utilities={utilities}
          i18nStrings={{
            overflowMenuTitleText: title,
            overflowMenuTriggerText: title,
          }}
          identity={{
            title: title,
            href: href,
            logo: topNavLogo,
          }}
        />
      </div>
    </>
  );
};
