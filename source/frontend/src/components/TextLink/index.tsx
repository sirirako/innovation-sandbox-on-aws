// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Link, LinkProps } from "@cloudscape-design/components";
import { useNavigate } from "react-router-dom";

interface TextLinkProps extends LinkProps {
  to?: string;
  children: React.ReactNode;
}

export const TextLink = ({ to, children, ...rest }: TextLinkProps) => {
  const navigate = useNavigate();

  return (
    <Link
      {...rest}
      onFollow={(e) => {
        if (to) {
          e.preventDefault();
          navigate(to);
        }
      }}
      href={to}
    >
      {children}
    </Link>
  );
};
