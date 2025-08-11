// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { LogArchivingEnvironmentSchema } from "@amzn/innovation-sandbox-commons/lambda/environments/log-archiving-lambda-environment";
import { IsbLambdaFunction } from "@amzn/innovation-sandbox-infrastructure/components/isb-lambda-function";
import { IsbKmsKeys } from "@amzn/innovation-sandbox-infrastructure/components/kms";
import { IsbLogGroups } from "@amzn/innovation-sandbox-infrastructure/components/observability/log-groups";
import { getContextFromMapping } from "@amzn/innovation-sandbox-infrastructure/helpers/cdk-context";
import { addCfnGuardSuppression } from "@amzn/innovation-sandbox-infrastructure/helpers/cfn-guard";
import { isDevMode } from "@amzn/innovation-sandbox-infrastructure/helpers/deployment-mode";
import { SchedulerHelper } from "@amzn/innovation-sandbox-infrastructure/helpers/scheduler-helper";
import { IsbComputeResources } from "@amzn/innovation-sandbox-infrastructure/isb-compute-resources";
import { Duration, RemovalPolicy, Stack, Token } from "aws-cdk-lib";
import {
  Effect,
  PolicyStatement,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  ObjectOwnership,
  StorageClass,
} from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import path from "path";

interface LogArchivingProps {
  readonly namespace: string;
}

export class LogArchiving extends Construct {
  constructor(scope: Construct, id: string, props: LogArchivingProps) {
    super(scope, id);
    const kmsKey = IsbKmsKeys.get(scope, props.namespace);
    const archivingBucket = new Bucket(this, "IsbLogsArchive", {
      removalPolicy: isDevMode(scope)
        ? RemovalPolicy.DESTROY
        : RemovalPolicy.RETAIN,
      encryption: BucketEncryption.KMS,
      encryptionKey: kmsKey,
      objectOwnership: ObjectOwnership.OBJECT_WRITER,
      publicReadAccess: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: false, // NOSONAR typescript:S6252 - access logs do not need versioning
      lifecycleRules: [
        {
          enabled: true,
          transitions: [
            {
              storageClass: StorageClass.GLACIER,
              transitionAfter: Duration.days(
                Token.asNumber(
                  getContextFromMapping(scope, "s3LogsArchiveRetentionInDays"),
                ),
              ),
            },
          ],
          expiration: Duration.days(
            Token.asNumber(
              getContextFromMapping(scope, "s3LogsGlacierRetentionInDays"),
            ),
          ),
        },
      ],
    });
    addCfnGuardSuppression(archivingBucket, ["S3_BUCKET_LOGGING_ENABLED"]);

    const stack = Stack.of(scope);
    archivingBucket.addToResourcePolicy(
      new PolicyStatement({
        sid: "S3BucketReadPermissions",
        effect: Effect.ALLOW,
        principals: [
          new ServicePrincipal(`logs.${stack.region}.amazonaws.com`),
        ],
        actions: ["s3:GetBucketAcl"],
        resources: [archivingBucket.bucketArn],
        conditions: {
          StringEquals: {
            "aws:SourceAccount": stack.account,
          },
          ArnLike: {
            "aws:SourceArn": stack.formatArn({
              service: "logs",
              resource: "*",
            }),
          },
        },
      }),
    );
    archivingBucket.addToResourcePolicy(
      new PolicyStatement({
        sid: "S3ObjectWritePermissions",
        effect: Effect.ALLOW,
        principals: [
          new ServicePrincipal(`logs.${stack.region}.amazonaws.com`),
        ],
        actions: ["s3:PutObject"],
        resources: [`${archivingBucket.bucketArn}/*`],
        conditions: {
          StringEquals: {
            "s3:x-amz-acl": "bucket-owner-full-control",
            "aws:SourceAccount": stack.account,
          },
          ArnLike: {
            "aws:SourceArn": stack.formatArn({
              service: "logs",
              resource: "*",
            }),
          },
        },
      }),
    );

    const globalLogGroup = IsbLogGroups.globalLogGroup(scope, props.namespace);
    const EXPORT_PERIOD_DAYS = 7;

    const logArchivingLambda = new IsbLambdaFunction(this, id, {
      description: `Archives ISB logs every ${EXPORT_PERIOD_DAYS} days`,
      entry: path.join(
        __dirname,
        "..",
        "..",
        "..",
        "..",
        "lambdas",
        "metrics",
        "log-archiving",
        "src",
        "log-archiving-handler.ts",
      ),
      handler: "handler",
      namespace: props.namespace,
      environment: {
        DESTINATION_PREFIX: "isb-archive",
        LOG_GROUP_NAME: globalLogGroup.logGroupName,
        DESTINATION_BUCKET_NAME: archivingBucket.bucketName,
        ISB_NAMESPACE: props.namespace,
        EXPORT_PERIOD_DAYS: String(EXPORT_PERIOD_DAYS),
      },
      logGroup: IsbComputeResources.globalLogGroup,
      envSchema: LogArchivingEnvironmentSchema,
      reservedConcurrentExecutions: 1,
    });

    archivingBucket.grantReadWrite(logArchivingLambda.lambdaFunction);
    logArchivingLambda.lambdaFunction.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "logs:CreateExportTask",
          "logs:DescribeExportTasks",
          "logs:DescribeLogStreams",
          "logs:ReadLogGroup",
          "logs:ReadLogStream",
        ],
        resources: [
          `${globalLogGroup.logGroupArn}:*`,
          `${globalLogGroup.logGroupArn}:log-stream/*`,
        ],
      }),
    );

    kmsKey.grantEncryptDecrypt(logArchivingLambda.lambdaFunction);

    // Use architecture-aware scheduler (EventBridge Scheduler for CloudFront, CloudWatch Events for ALB)
    SchedulerHelper.createScheduler(scope, "LogArchivingScheduler", logArchivingLambda.lambdaFunction, {
      description: `Invokes Log Archiving ${EXPORT_PERIOD_DAYS} days`,
      scheduleExpression: `rate(${EXPORT_PERIOD_DAYS} days)`, // Original EventBridge Scheduler format
      retryAttempts: 3,
      maximumWindowInMinutes: 4 * 60, // Original: 4 hours = 240 minutes
    });
  }
}
