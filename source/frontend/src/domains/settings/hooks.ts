// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useQuery } from "@tanstack/react-query";

import { SettingService } from "./service";

export const useGetConfigurations = () => {
  return useQuery({
    queryKey: ["configurations"],
    queryFn: async () => await new SettingService().getConfigurations(),
  });
};
