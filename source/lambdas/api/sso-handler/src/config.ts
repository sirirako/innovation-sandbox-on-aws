// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { SsoLambdaEnvironment } from "@amzn/innovation-sandbox-commons/lambda/environments/sso-lambda-environment.js";
import { IsbLambdaContext } from "@amzn/innovation-sandbox-commons/lambda/middleware/base-middleware-bundle.js";
import { ContextWithConfig } from "@amzn/innovation-sandbox-commons/lambda/middleware/isb-config-middleware.js";
import { IsbClients } from "@amzn/innovation-sandbox-commons/sdk-clients/index.js";

export interface SSOConfig {
  sessionDuration: string;
  webAppUrl: string;
  idpSignInUrl: string;
  idpSignOutUrl: string;
  idpAudience: string;
  callBackPathFromRoot: string;
  loginPath: string;
  logoutPath: string;
  loginStatusPath: string;
  loginCallbackPath: string;
  jwtSecret: string;
  idpCert: string;
}

export const ssoConfigStaticValues = {
  callBackPathFromRoot: "/api/auth/login/callback",
  loginPath: "/auth/login",
  logoutPath: "/auth/logout",
  loginStatusPath: "/auth/login/status",
  loginCallbackPath: "/auth/login/callback",
};

export async function getSSOConfig(
  context: IsbLambdaContext<SsoLambdaEnvironment> & ContextWithConfig,
): Promise<SSOConfig> {
  const globalConfig = context.globalConfig;
  const env = context.env;
  const secretsMangerHelper = IsbClients.secretsManager(env);
  const allSecrets = await secretsMangerHelper.getStringSecrets(
    env.JWT_SECRET_NAME,
    env.IDP_CERT_SECRET_NAME,
  );

  return {
    ...ssoConfigStaticValues,
    sessionDuration: globalConfig.auth.sessionDurationInMinutes + "m",
    webAppUrl: globalConfig.auth.webAppUrl.replace(/\/$/, ""),
    idpSignInUrl: globalConfig.auth.idpSignInUrl,
    idpSignOutUrl: globalConfig.auth.idpSignOutUrl,
    idpAudience: globalConfig.auth.idpAudience,
    jwtSecret: allSecrets[env.JWT_SECRET_NAME]!,
    idpCert: allSecrets[env.IDP_CERT_SECRET_NAME]!,
  };
}
