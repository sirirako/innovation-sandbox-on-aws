// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { App, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { describe, expect, it } from "vitest";

import { S3AccessLambda } from "../../../lib/components/alb/s3-access-lambda";

describe("S3AccessLambda", () => {
  const app = new App();
  const stack = new Stack(app, "TestStack");
  
  // Create a mock S3 bucket
  const bucket = new Bucket(stack, "TestBucket");
  
  // Create the S3AccessLambda construct
  const s3AccessLambda = new S3AccessLambda(stack, "TestS3AccessLambda", {
    bucket,
    namespace: "test",
  });
  
  const template = Template.fromStack(stack);
  
  it("creates a Lambda function", () => {
    template.hasResourceProperties("AWS::Lambda::Function", {
      Handler: "index.handler",
      Runtime: "nodejs18.x",
      Environment: {
        Variables: {
          BUCKET_NAME: {
            Ref: expect.stringMatching(/TestBucket/),
          },
        },
      },
    });
  });
  
  it("creates an IAM role with S3 access permissions", () => {
    template.hasResourceProperties("AWS::IAM::Role", {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Principal: {
              Service: "lambda.amazonaws.com",
            },
          },
        ],
      },
    });
    
    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: expect.arrayContaining([
          expect.objectContaining({
            Action: "s3:GetObject",
            Effect: "Allow",
            Resource: {
              "Fn::Join": expect.anything(),
            },
          }),
        ]),
      },
    });
  });
  
  it("exposes the Lambda function", () => {
    expect(s3AccessLambda.function).toBeDefined();
  });
});