// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { App, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { RestApi } from "aws-cdk-lib/aws-apigateway";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { describe, expect, it } from "vitest";

import { AlbUiApi } from "../../../lib/components/alb/alb-ui-api";

describe("AlbUiApi", () => {
  const app = new App();
  const stack = new Stack(app, "TestStack");
  
  // Create a mock API Gateway
  const restApi = new RestApi(stack, "TestApi");
  
  // Create a mock VPC
  const vpc = new Vpc(stack, "TestVpc", {
    maxAzs: 2,
  });
  
  // Create the AlbUiApi construct
  new AlbUiApi(stack, "TestAlbUiApi", {
    restApi,
    namespace: "test",
    vpc,
  });
  
  const template = Template.fromStack(stack);
  
  it("creates an S3 bucket for frontend assets", () => {
    template.hasResourceProperties("AWS::S3::Bucket", {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: "aws:kms",
            },
          },
        ],
      },
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
      VersioningConfiguration: {
        Status: "Enabled",
      },
    });
  });
  
  it("creates an S3 bucket for ALB access logs", () => {
    template.hasResourceProperties("AWS::S3::Bucket", {
      LifecycleConfiguration: {
        Rules: [
          {
            Status: "Enabled",
          },
        ],
      },
    });
  });
  
  it("creates an Application Load Balancer", () => {
    template.hasResourceProperties("AWS::ElasticLoadBalancingV2::LoadBalancer", {
      Type: "application",
      Scheme: "internet-facing",
      IpAddressType: "ipv4",
    });
  });
  
  it("creates an HTTPS listener", () => {
    template.hasResourceProperties("AWS::ElasticLoadBalancingV2::Listener", {
      Protocol: "HTTPS",
      Port: 443,
    });
  });
  
  it("creates an HTTP listener that redirects to HTTPS", () => {
    template.hasResourceProperties("AWS::ElasticLoadBalancingV2::Listener", {
      Protocol: "HTTP",
      Port: 80,
      DefaultActions: [
        {
          Type: "redirect",
          RedirectConfig: {
            Protocol: "HTTPS",
            Port: "443",
            StatusCode: "HTTP_301",
          },
        },
      ],
    });
  });
  
  it("creates target groups for S3 access and API Gateway", () => {
    template.hasResourceProperties("AWS::ElasticLoadBalancingV2::TargetGroup", {
      TargetType: "lambda",
    });
  });
  
  it("creates a Lambda function for S3 access", () => {
    template.hasResourceProperties("AWS::Lambda::Function", {
      Handler: "index.handler",
      Runtime: "nodejs18.x",
    });
  });
  
  it("creates a bucket deployment for frontend assets", () => {
    template.hasResourceProperties("Custom::CDKBucketDeployment", {
      DestinationBucketName: {
        Ref: expect.stringMatching(/TestAlbUiApiIsbFrontEndBucket/),
      },
    });
  });
  
  it("configures ALB access logging", () => {
    template.hasResourceProperties("AWS::ElasticLoadBalancingV2::LoadBalancer", {
      LoadBalancerAttributes: expect.arrayContaining([
        {
          Key: "access_logs.s3.enabled",
          Value: "true",
        },
      ]),
    });
  });
});