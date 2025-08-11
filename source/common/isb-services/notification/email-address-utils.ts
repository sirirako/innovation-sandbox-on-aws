// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  collect,
  stream,
} from "@amzn/innovation-sandbox-commons/data/utils.js";
import { IdcService } from "@amzn/innovation-sandbox-commons/isb-services/idc-service.js";

export async function allManagers(idcService: IdcService) {
  const managers = await collect(
    stream(idcService, idcService.listIsbManagers, {}),
  );
  return Array.from(new Set([...managers.map((manager) => manager.email)]));
}

export async function allAdmins(idcService: IdcService) {
  const admins = await collect(
    stream(idcService, idcService.listIsbAdmins, {}),
  );
  return Array.from(new Set([...admins.map((admin) => admin.email)]));
}

export async function union(...recipients: (string[] | Promise<string[]>)[]) {
  const resolvedArrays = await Promise.all(recipients);
  return Array.from(new Set(resolvedArrays.flat()));
}
