// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import serverless from "serverless-http";

import { SsoLambdaEnvironmentSchema } from "@amzn/innovation-sandbox-commons/lambda/environments/sso-lambda-environment.js";
import baseMiddlewareBundle from "@amzn/innovation-sandbox-commons/lambda/middleware/base-middleware-bundle.js";
import {
  InvalidGlobalConfiguration,
  isbConfigMiddleware,
} from "@amzn/innovation-sandbox-commons/lambda/middleware/isb-config-middleware.js";
import { app } from "@amzn/innovation-sandbox-sso-handler/server.js";
import { Logger } from "@aws-lambda-powertools/logger";
import { Tracer } from "@aws-lambda-powertools/tracer";

const tracer = new Tracer();
const logger = new Logger();

import middy from "@middy/core";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const errorWrapperMiddleware = (): middy.MiddlewareObj<
  APIGatewayProxyEvent,
  APIGatewayProxyResult
> => {
  const onErrorMiddleware = async (handler: any) => {
    const errorHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Innovation Sandbox on AWS</title>
            <style>
              body {
                font-family: "Open Sans", "Helvetica Neue", Roboto, Arial, sans-serif;
                margin: 40px;
                line-height: 1.6;
              }
              .error-container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                border: 1px solid #ddd;
                border-radius: 5px;
              }
            </style>
          </head>
          <body>
            <div class="error-container">
              <p>We encountered an error while processing your request.</p>
              ${getErrorMessage(handler.error)}
            </div>
          </body>
        </html>
      `;
    function getErrorMessage(error: any): string {
      if (error instanceof InvalidGlobalConfiguration) {
        return `<p>Please ask your Innovation Sandbox administrator to check Global Configuration values in
                AWS AppConfig and the CloudWatch logs</p>
                <p>Error details:
                <pre>${handler.error?.message || "Unexpected error"}</pre>
                </p>`;
      } else {
        return `<p>Please ask your Innovation Sandbox administrator the CloudWatch logs</p>
                <p>Error details:
                <pre>${handler.error?.message || "Unexpected error"}</pre>
                </p>`;
      }
    }
    handler.response = {
      statusCode: 200,
      headers: {
        "Content-Type": "text/html",
      },
      body: errorHtml,
    };
  };
  return {
    onError: onErrorMiddleware,
  };
};

export const handler = baseMiddlewareBundle({
  logger,
  tracer,
  environmentSchema: SsoLambdaEnvironmentSchema,
  moduleName: "SSO Handler",
})
  .use(errorWrapperMiddleware())
  .use(isbConfigMiddleware())
  .handler(async (event, context) => {
    console.log('SSO Handler invoked with event:', JSON.stringify(event, null, 2));
    console.log('SSO Handler context:', JSON.stringify(context, null, 2));
    
    try {
      const result = await serverless(app)(event, context);
      console.log('SSO Handler result:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error('SSO Handler error:', error);
      throw error;
    }
  });
