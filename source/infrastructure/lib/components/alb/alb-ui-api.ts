// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { CfnOutput, Duration, RemovalPolicy, Stack, Token } from "aws-cdk-lib";
import { RestApi as ApiGatewayRestApi } from "aws-cdk-lib/aws-apigateway";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import {
  Cluster,
  ContainerImage,
  FargateService,
  FargateTaskDefinition,
  LogDrivers,
} from "aws-cdk-lib/aws-ecs";
import {
  ApplicationLoadBalancer,
  ApplicationProtocol,
  ApplicationTargetGroup,
  IpAddressType,
  ListenerAction,
  TargetType,
} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Effect, PolicyStatement, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  ObjectOwnership,
  StorageClass,
} from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import path from "path";

import { IsbKmsKeys } from "@amzn/innovation-sandbox-infrastructure/components/kms";
import { getContextFromMapping } from "@amzn/innovation-sandbox-infrastructure/helpers/cdk-context";
import { addCfnGuardSuppression } from "@amzn/innovation-sandbox-infrastructure/helpers/cfn-guard";
import { isDevMode } from "@amzn/innovation-sandbox-infrastructure/helpers/deployment-mode";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import { Vpc } from "aws-cdk-lib/aws-ec2";

export interface AlbUiApiProps {
  restApi: ApiGatewayRestApi;
  namespace: string;
  vpc?: ec2.Vpc; // Optional VPC, if not provided, ALB will be internet-facing
}

export class AlbUiApi extends Construct {
  public readonly loggingBucket: Bucket;
  public readonly loadBalancer: ApplicationLoadBalancer;

  constructor(scope: Construct, id: string, props: AlbUiApiProps) {
    super(scope, id);
    const kmsKey = IsbKmsKeys.get(scope, props.namespace);

    console.log("🚀 Deploying ALB + Container architecture...");

    // Create S3 bucket for ALB access logs
    this.loggingBucket = new Bucket(this, "IsbAlbAccessLogsBucket", {
      removalPolicy: isDevMode(scope)
        ? RemovalPolicy.DESTROY
        : RemovalPolicy.RETAIN,
      encryption: BucketEncryption.S3_MANAGED, // Use S3-managed encryption instead of KMS for ALB logs
      objectOwnership: ObjectOwnership.OBJECT_WRITER,
      publicReadAccess: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: false, // Access logs do not need versioning
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

    // Create ALB log group
    new LogGroup(this, "IsbAlbLogGroup", {
      retention: RetentionDays.ONE_MONTH,
      encryptionKey: kmsKey,
    });

    // Create a VPC for the ALB and Fargate service if not provided
    const vpc =
      props.vpc ||
      new Vpc(this, "IsbVpc", {
        maxAzs: 2,
        natGateways: 1,
      });

    // Create ALB
    this.loadBalancer = new ApplicationLoadBalancer(
      this,
      "IsbApplicationLoadBalancer",
      {
        vpc,
        internetFacing: true,
        ipAddressType: IpAddressType.IPV4,
        // Always disable deletion protection during development to allow clean rollbacks
        deletionProtection: false,
      },
    );

    // Explicitly disable access logging
    this.loadBalancer.setAttribute("access_logs.s3.enabled", "false");

    // Access logging for ALB is disabled because it requires a region to be specified
    // If you need access logging, ensure the stack has a region specified when deployed
    // See: https://docs.aws.amazon.com/cdk/latest/guide/environments.html

    // Grant permissions for ELB to write logs to the S3 bucket
    this.loggingBucket.addToResourcePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        principals: [new ServicePrincipal("delivery.logs.amazonaws.com")],
        actions: ["s3:PutObject"],
        resources: [this.loggingBucket.arnForObjects("isb-alb-logs/*")],
        conditions: {
          StringEquals: {
            "s3:x-amz-acl": "bucket-owner-full-control",
          },
        },
      }),
    );

    // Create an ECS cluster
    const cluster = new Cluster(this, "IsbApiCluster", {
      vpc,
    });

    // Create a task definition for the API Gateway proxy
    const taskDefinition = new FargateTaskDefinition(
      this,
      "IsbApiProxyTaskDef",
      {
        memoryLimitMiB: 2048, // Increased to accommodate container memory
        cpu: 512, // Increased CPU as well
      },
    );

    // Copy frontend build files to the container build context
    const containerAssetPath = path.join(__dirname, "api-proxy-container");
    const frontendDistPath = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "..",
      "frontend",
      "dist",
    );
    const containerPublicPath = path.join(containerAssetPath, "public");

    // Create a shell command to copy frontend files to the container build context
    // This will be executed during CDK deployment
    const copyCommand = `mkdir -p ${containerPublicPath} && cp -r ${frontendDistPath}/* ${containerPublicPath}/`;

    // Create directories for auth JS files
    const authDirCommand = `mkdir -p ${containerPublicPath}/api/auth`;

    try {
      require("child_process").execSync(copyCommand);
      require("child_process").execSync(authDirCommand);
      console.log(
        `Successfully copied frontend files to container build context: ${copyCommand}`,
      );
    } catch (error) {
      console.error(`Failed to copy frontend files: ${error}`);
      // Continue deployment even if copy fails - this allows for development without frontend files
    }

    // Add container to the task definition
    const container = taskDefinition.addContainer("IsbApiProxyContainer", {
      image: ContainerImage.fromAsset(containerAssetPath),
      environment: {
        // Fix the API endpoint URL format
        API_ENDPOINT: props.restApi.url.replace("https://", ""),
        // Remove DEBUG variable to avoid TypeError
        NODE_ENV: "development",
      },
      logging: LogDrivers.awsLogs({
        streamPrefix: "isb-api-proxy",
        logRetention: RetentionDays.ONE_WEEK, // Simplified logging configuration
      }),
      // Increase memory and CPU for better performance
      memoryLimitMiB: 1024, // Increased memory for serving static files
      essential: true,
    });

    // Add port mapping
    container.addPortMappings({
      containerPort: 8080,
    });

    // Create a security group for the Fargate service
    const fargateSecurityGroup = new ec2.SecurityGroup(
      this,
      "IsbApiProxySecurityGroup",
      {
        vpc,
        description: "Security group for API Gateway proxy Fargate service",
        allowAllOutbound: true, // Allow outbound traffic to API Gateway
      },
    );

    // Create a Fargate service
    const fargateService = new FargateService(this, "IsbApiProxyService", {
      cluster,
      taskDefinition,
      desiredCount: 1, // Reduce to 1 instance for initial deployment
      assignPublicIp: true, // Need public IP to access API Gateway
      securityGroups: [fargateSecurityGroup],
      // Add health check grace period to give container time to start up
      healthCheckGracePeriod: Duration.seconds(60),
    });

    // Grant permissions to access API Gateway
    taskDefinition.addToTaskRolePolicy(
      new PolicyStatement({
        actions: ["execute-api:Invoke"],
        effect: Effect.ALLOW,
        resources: [`${props.restApi.arnForExecuteApi()}*`],
      }),
    );

    // Create target group for API Gateway proxy (Fargate)
    const apiTargetGroup = new ApplicationTargetGroup(
      this,
      "IsbApiTargetGroup",
      {
        vpc,
        port: 8080,
        protocol: ApplicationProtocol.HTTP,
        targetType: TargetType.IP,
        healthCheck: {
          path: "/health",
          interval: Duration.seconds(60), // Increase interval
          timeout: Duration.seconds(30), // Increase timeout
          healthyThresholdCount: 2,
          unhealthyThresholdCount: 5, // Increase threshold
        },
      },
    );

    // Register the Fargate service as a target
    apiTargetGroup.addTarget(fargateService);

    // Get certificate ARN from CDK context (set via .env file)
    const certificateArn = scope.node.tryGetContext('certificateArn');

    if (certificateArn) {
      console.log(`🔒 Using HTTPS with certificate: ${certificateArn}`);
      
      // Import the certificate from ACM
      const certificate = Certificate.fromCertificateArn(
        this,
        "Certificate",
        certificateArn,
      );

      // Create HTTPS listener with the certificate
      this.loadBalancer.addListener("IsbHttpsListener", {
        port: 443,
        protocol: ApplicationProtocol.HTTPS,
        certificates: [certificate],
        defaultAction: ListenerAction.forward([apiTargetGroup]),
      });

      // Create HTTP listener that redirects to HTTPS
      this.loadBalancer.addListener("IsbHttpListener", {
        port: 80,
        protocol: ApplicationProtocol.HTTP,
        defaultAction: ListenerAction.redirect({
          protocol: ApplicationProtocol.HTTPS,
          port: "443",
          permanent: true,
        }),
      });

      // Output HTTPS URL
      new CfnOutput(this, "AlbUrl", {
        key: "AlbUrl",
        value: `https://${this.loadBalancer.loadBalancerDnsName}`,
        description: "ALB HTTPS URL",
      });
    } else {
      console.log(`⚠️  No certificate ARN provided - using HTTP only`);
      console.log(`   To enable HTTPS, set CERTIFICATE_ARN in your .env file`);
      
      // Create HTTP listener only
      this.loadBalancer.addListener("IsbHttpListener", {
        port: 80,
        protocol: ApplicationProtocol.HTTP,
        defaultAction: ListenerAction.forward([apiTargetGroup]),
      });

      // Output HTTP URL
      new CfnOutput(this, "AlbUrl", {
        key: "AlbUrl", 
        value: `http://${this.loadBalancer.loadBalancerDnsName}`,
        description: "ALB HTTP URL (HTTPS not configured)",
      });
    }

    // We don't need a separate API route since the container handles both static files and API proxying

    // Note: Security headers should be implemented at the application level
    // For a production environment, consider:
    // 1. Using CloudFront in front of ALB in regions where it's available
    // 2. Configuring a reverse proxy like NGINX to add security headers
    // 3. Ensuring your application sets appropriate security headers

    // Note: Frontend assets are now served directly from the container
    // No need for S3 deployment or bucket policies since we're using container-based hosting

    // Grant permissions for logs delivery service to write to the logging bucket
    kmsKey.addToResourcePolicy(
      new PolicyStatement({
        principals: [new ServicePrincipal("delivery.logs.amazonaws.com")],
        actions: ["kms:Encrypt", "kms:Decrypt", "kms:GenerateDataKey*"],
        resources: ["*"],
        conditions: {
          StringEquals: {
            "AWS:SourceAccount": Stack.of(this).account,
          },
        },
      }),
    );

    // Add CFN Guard suppressions
    addCfnGuardSuppression(this.loggingBucket, ["S3_BUCKET_LOGGING_ENABLED"]);
  }
}
