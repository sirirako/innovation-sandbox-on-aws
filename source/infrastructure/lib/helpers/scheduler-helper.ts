// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { Duration } from "aws-cdk-lib";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Function } from "aws-cdk-lib/aws-lambda";
import { CfnSchedule } from "aws-cdk-lib/aws-scheduler";
import { Construct } from "constructs";

export interface SchedulerConfig {
  description: string;
  scheduleExpression: string | Schedule;
  retryAttempts?: number;
  maximumWindowInMinutes?: number;
  input?: string;
  // Original EventBridge Scheduler specific options
  originalScheduleExpression?: string;
  originalMaximumWindowInMinutes?: number;
}

export class SchedulerHelper {
  /**
   * Creates either CloudWatch Events Rule or EventBridge Scheduler based on architecture choice
   */
  static createScheduler(
    scope: Construct,
    id: string,
    lambdaFunction: Function,
    config: SchedulerConfig,
  ): void {
    // Check architecture choice (same context used for UI components)
    // Try multiple methods to determine architecture choice
    const contextValue = scope.node.tryGetContext("useAlbArchitecture");
    const envValue = process.env.USE_ALB_ARCHITECTURE;
    
    // Priority: 1. Context, 2. Environment variable, 3. Default to false (CloudFront + S3)
    let useAlbArchitecture = false;
    
    if (contextValue !== undefined) {
      useAlbArchitecture = contextValue === true || contextValue === 'true';
      console.log(`🔍 SCHEDULER DEBUG: Using CDK context: ${contextValue} -> ${useAlbArchitecture}`);
    } else if (envValue !== undefined) {
      useAlbArchitecture = envValue === 'true';
      console.log(`🔍 SCHEDULER DEBUG: Using environment variable: ${envValue} -> ${useAlbArchitecture}`);
    } else {
      console.log(`🔍 SCHEDULER DEBUG: Using default: false (CloudFront + S3)`);
    }

    if (useAlbArchitecture) {
      // ALB + Container architecture: Use CloudWatch Events Rule (GovCloud compatible)
      console.log(
        `📅 Using CloudWatch Events Rule for ${id} (ALB architecture)`,
      );
      this.createCloudWatchEventsRule(scope, id, lambdaFunction, config);
    } else {
      // CloudFront + S3 architecture: Use EventBridge Scheduler (Original)
      console.log(
        `📅 Using EventBridge Scheduler for ${id} (CloudFront architecture)`,
      );
      this.createEventBridgeScheduler(scope, id, lambdaFunction, config);
    }
  }

  /**
   * Creates CloudWatch Events Rule (GovCloud compatible)
   */
  private static createCloudWatchEventsRule(
    scope: Construct,
    id: string,
    lambdaFunction: Function,
    config: SchedulerConfig,
  ): void {
    // Convert string schedule expression to Schedule object if needed
    let schedule: Schedule;
    if (typeof config.scheduleExpression === "string") {
      // Parse EventBridge Scheduler format to CloudWatch Events format
      if (config.scheduleExpression.startsWith("rate(")) {
        // Extract rate value (e.g., "rate(1 day)" -> "1 day")
        const rateMatch = config.scheduleExpression.match(/rate\((.+)\)/);
        if (rateMatch && rateMatch[1]) {
          const rateParts = rateMatch[1].split(" ");
          if (rateParts.length >= 2 && rateParts[0] && rateParts[1]) {
            const amount = rateParts[0];
            const unit = rateParts[1];
            const numAmount = parseInt(amount);

            switch (unit) {
              case "minute":
              case "minutes":
                schedule = Schedule.rate(Duration.minutes(numAmount));
                break;
              case "hour":
              case "hours":
                schedule = Schedule.rate(Duration.hours(numAmount));
                break;
              case "day":
              case "days":
                schedule = Schedule.rate(Duration.days(numAmount));
                break;
              default:
                throw new Error(`Unsupported rate unit: ${unit}`);
            }
          } else {
            throw new Error(
              `Invalid rate expression format: ${config.scheduleExpression}`,
            );
          }
        } else {
          throw new Error(
            `Invalid rate expression: ${config.scheduleExpression}`,
          );
        }
      } else if (config.scheduleExpression.startsWith("cron(")) {
        // For cron expressions, convert to a simple rate expression for CloudWatch Events
        // This avoids complex cron conversion issues between EventBridge Scheduler and CloudWatch Events

        // Parse the original cron to understand the intent
        const cronMatch = config.scheduleExpression.match(/cron\((.+)\)/);
        if (cronMatch && cronMatch[1]) {
          const cronExpression = cronMatch[1];

          // For the cost reporting case: "cron(25 1 4 * ? *)" means "4th day of every month"
          // Convert this to a simpler rate expression that achieves similar behavior
          if (cronExpression === "25 1 4 * ? *") {
            // Run monthly - use rate(30 days) as approximation
            console.log(
              `⚠️  Converting complex cron "${config.scheduleExpression}" to rate(30 days) for CloudWatch Events compatibility`,
            );
            schedule = Schedule.rate(Duration.days(30));
          } else {
            // For other cron expressions, throw an error with guidance
            throw new Error(
              `Complex cron expressions are not fully supported for CloudWatch Events Rule. ` +
                `Original expression: ${config.scheduleExpression}. ` +
                `Please use rate expressions (e.g., "rate(1 hour)", "rate(7 days)") for ALB architecture, ` +
                `or use CloudFront architecture for full cron support.`,
            );
          }
        } else {
          throw new Error(
            `Invalid cron expression: ${config.scheduleExpression}`,
          );
        }
      } else {
        throw new Error(
          `Unsupported schedule expression: ${config.scheduleExpression}`,
        );
      }
    } else {
      schedule = config.scheduleExpression;
    }

    // Create IAM role for EventBridge to invoke Lambda
    const role = new Role(scope, `${id}LambdaInvokeRole`, {
      description: `allows EventBridge to invoke ${id} lambda`,
      assumedBy: new ServicePrincipal("events.amazonaws.com"),
    });

    lambdaFunction.grantInvoke(role);

    // Create CloudWatch Events Rule
    new Rule(scope, `${id}ScheduledEvent`, {
      description: config.description,
      schedule: schedule,
      targets: [
        new LambdaFunction(lambdaFunction, {
          retryAttempts: config.retryAttempts || 3,
        }),
      ],
    });
  }

  /**
   * Creates EventBridge Scheduler (Original functionality)
   */
  private static createEventBridgeScheduler(
    scope: Construct,
    id: string,
    lambdaFunction: Function,
    config: SchedulerConfig,
  ): void {
    // Create IAM role for EventBridge Scheduler to invoke Lambda
    const role = new Role(scope, `${id}LambdaInvokeRole`, {
      description: `allows EventBridge Scheduler to invoke ${id} lambda`,
      assumedBy: new ServicePrincipal("scheduler.amazonaws.com"),
    });

    lambdaFunction.grantInvoke(role);

    // Create EventBridge Scheduler with original configuration
    const scheduleConfig: any = {
      description: config.description,
      scheduleExpression:
        typeof config.scheduleExpression === "string"
          ? config.scheduleExpression
          : this.convertScheduleToString(config.scheduleExpression),
      flexibleTimeWindow: {
        mode: "FLEXIBLE",
        maximumWindowInMinutes: config.maximumWindowInMinutes || 60,
      },
      target: {
        retryPolicy: {
          maximumRetryAttempts: config.retryAttempts || 2,
        },
        arn: lambdaFunction.functionArn,
        roleArn: role.roleArn,
      },
    };

    // Only add input if provided (matches original behavior)
    if (config.input) {
      scheduleConfig.target.input = config.input;
    }

    new CfnSchedule(scope, `${id}ScheduledEvent`, scheduleConfig);
  }

  /**
   * Converts CDK Schedule object to EventBridge Scheduler string format
   */
  private static convertScheduleToString(schedule: Schedule): string {
    // This is a simplified conversion - in practice, you might need more sophisticated logic
    // For now, we'll provide common patterns
    const scheduleStr = schedule.toString();

    // Handle rate schedules
    if (scheduleStr.includes("rate(")) {
      return scheduleStr;
    }

    // Handle cron schedules
    if (scheduleStr.includes("cron(")) {
      return scheduleStr;
    }

    // Default fallback
    return "rate(1 day)";
  }
}
