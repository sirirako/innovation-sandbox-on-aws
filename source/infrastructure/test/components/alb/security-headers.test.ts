// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { App, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { ApplicationLoadBalancer, ApplicationProtocol } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { describe, it } from "vitest";

import { SecurityHeaders } from "../../../lib/components/alb/security-headers";

describe("SecurityHeaders", () => {
  const app = new App();
  const stack = new Stack(app, "TestStack");
  
  // Create a mock VPC
  const vpc = new Vpc(stack, "TestVpc", {
    maxAzs: 2,
  });
  
  // Create a mock ALB
  const loadBalancer = new ApplicationLoadBalancer(stack, "TestAlb", {
    vpc,
    internetFacing: true,
  });
  
  // Create a mock listener
  const listener = loadBalancer.addListener("TestListener", {
    port: 443,
    protocol: ApplicationProtocol.HTTPS,
    // In a real test, we would use a certificate from ACM
    // For now, we'll use a dummy certificate that will be replaced in the actual implementation
    certificates: [],
  });
  
  // Create the SecurityHeaders construct
  new SecurityHeaders(stack, "TestSecurityHeaders", {
    loadBalancer,
    listener,
    namespace: "test",
  });
  
  const template = Template.fromStack(stack);
  
  it("creates a Lambda function for security headers", () => {
    template.hasResourceProperties("AWS::Lambda::Function", {
      Handler: "index.handler",
      Runtime: "nodejs18.x",
      Code: {
        ZipFile: expect.stringContaining("content-security-policy"),
      },
    });
  });
  
  it("creates a listener rule for API security headers", () => {
    template.hasResourceProperties("AWS::ElasticLoadBalancingV2::ListenerRule", {
      Priority: 5,
      Conditions: [
        {
          Field: "path-pattern",
          Values: ["/api", "/api/*"],
        },
      ],
      Actions: [
        {
          Type: "fixed-response",
          FixedResponseConfig: {
            ContentType: "application/json",
            StatusCode: "200",
            MessageBody: expect.stringContaining("Security headers added"),
          },
        },
      ],
    });
  });
});