// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import {
  CloudFormationClient,
  CreateChangeSetCommand,
  DeleteStackCommand,
  DescribeChangeSetCommand,
  DescribeStacksCommand,
  ExecuteChangeSetCommand,
} from "@aws-sdk/client-cloudformation";
import { fromTemporaryCredentials } from "@aws-sdk/credential-providers";
import { App, Stack, type StackProps } from "aws-cdk-lib";
import kms from "aws-cdk-lib/aws-kms";
import s3 from "aws-cdk-lib/aws-s3";
import { setTimeout } from "node:timers/promises";

type IsbAccountCleanerTestResourcesStackProps = StackProps & {
  roleArn: string;
};

export class IsbAccountCleanerTestResourcesStack extends Stack {
  readonly app: App;
  readonly cloudFormationClient: CloudFormationClient;
  constructor(
    app: App,
    id: string,
    props: IsbAccountCleanerTestResourcesStackProps,
  ) {
    super(app, id, props);
    this.cloudFormationClient = new CloudFormationClient({
      credentials: fromTemporaryCredentials({
        params: {
          RoleArn: props.roleArn,
          RoleSessionName: "e2e-test",
        },
      }),
    });

    this.app = app;

    const key = new kms.Key(this, "Key");

    // const vpc = new ec2.Vpc(this, "Vpc", {
    //   ipAddresses: ec2.IpAddresses.cidr("10.0.0.0/16"),
    //   subnetConfiguration: [
    //     {
    //       cidrMask: 24,
    //       name: "public",
    //       subnetType: ec2.SubnetType.PUBLIC,
    //     },
    //     {
    //       cidrMask: 24,
    //       name: "private-egress",
    //       subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
    //     },
    //     {
    //       cidrMask: 28,
    //       name: "private-isolated",
    //       subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
    //     },
    //   ],
    // });

    // const securityGroup = new ec2.SecurityGroup(this, "SecurityGroup", { vpc });

    // new ec2.Instance(this, "Ec2", {
    //   vpc,
    //   machineImage: ec2.MachineImage.latestAmazonLinux2023(),
    //   instanceType: ec2.InstanceType.of(
    //     ec2.InstanceClass.T3,
    //     ec2.InstanceSize.MICRO,
    //   ),
    //   securityGroup,
    // });

    // new rds.DatabaseCluster(this, "DatabaseCluster", {
    //   engine: rds.DatabaseClusterEngine.auroraPostgres({
    //     version: rds.AuroraPostgresEngineVersion.VER_16_3,
    //   }),
    //   storageEncryptionKey: key,
    //   vpc,
    //   writer: rds.ClusterInstance.provisioned("writer", {
    //     instanceType: ec2.InstanceType.of(
    //       ec2.InstanceClass.T3,
    //       ec2.InstanceSize.MEDIUM,
    //     ),
    //   }),
    // });

    new s3.Bucket(this, "Bucket", { encryptionKey: key });

    // new lambda.Function(this, "Lambda", {
    //   code: new lambda.InlineCode(
    //     "exports.handler = async (event) => console.log(event)",
    //   ),
    //   runtime: lambda.Runtime.NODEJS_20_X,
    //   handler: "index.handler",
    // });

    // new dynamodb.Table(this, "DynamoDbTable", {
    //   partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
    //   encryptionKey: key,
    //   deletionProtection: true,
    // });
  }

  async deploy() {
    const cloudAssembly = this.app.synth();

    const changeSetName = `${this.stackName}-changeset`;
    await this.cloudFormationClient.send(
      new CreateChangeSetCommand({
        StackName: this.stackName,
        TemplateBody: JSON.stringify(
          cloudAssembly.getStackArtifact(this.artifactId).template,
        ),
        ChangeSetName: changeSetName,
        Capabilities: ["CAPABILITY_IAM", "CAPABILITY_NAMED_IAM"],
        ChangeSetType: "CREATE",
      }),
    );

    const waitForChangeSet = async () => {
      while (true) {
        const { Status } = await this.cloudFormationClient.send(
          new DescribeChangeSetCommand({
            ChangeSetName: changeSetName,
            StackName: this.stackName,
          }),
        );

        if (Status == "CREATE_COMPLETE") {
          break;
        } else if (Status == "FAILED") {
          throw new Error(`Change set failed with status: ${Status}`);
        }
        await setTimeout(5_000);
      }
    };

    await waitForChangeSet();

    await this.cloudFormationClient.send(
      new ExecuteChangeSetCommand({
        StackName: this.stackName,
        ChangeSetName: changeSetName,
        RetainExceptOnCreate: true,
      }),
    );

    const waitForDeployment = async () => {
      while (true) {
        const { Stacks } = await this.cloudFormationClient.send(
          new DescribeStacksCommand({ StackName: this.stackName }),
        );

        const status = Stacks?.[0]?.StackStatus;

        if (status == "CREATE_COMPLETE") {
          break;
        } else if (status != "CREATE_IN_PROGRESS") {
          throw new Error(`Stack deployment failed with status: ${status}`);
        }
        await setTimeout(5_000);
      }
    };

    await waitForDeployment();
    console.log(`Stack deployed successfully: ${this.stackName}`);
  }

  async destroy() {
    await this.cloudFormationClient.send(
      new DeleteStackCommand({
        StackName: this.stackName,
      }),
    );

    const waitForDeletion = async () => {
      while (true) {
        try {
          const { Stacks } = await this.cloudFormationClient.send(
            new DescribeStacksCommand({ StackName: this.stackName }),
          );

          const status = Stacks?.[0]?.StackStatus;

          if (status === undefined) {
            return;
          } else if (status == "DELETE_FAILED") {
            throw new Error(`Stack deletion failed with status: ${status}`);
          }
          await setTimeout(5_000);
        } catch (error: any) {
          if (error.name === "ValidationError") {
            console.log(`Stack deleted successfully: ${this.stackName}`);
            return;
          }
          throw error;
        }
      }
    };

    await waitForDeletion();
  }
}
