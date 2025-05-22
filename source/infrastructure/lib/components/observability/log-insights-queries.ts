// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { IsbComputeResources } from "@amzn/innovation-sandbox-infrastructure/isb-compute-resources";
import { CfnQueryDefinition } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

export interface LogInsightsQueryProps {
  namespace: string;
}

export class LogInsightsQueries extends Construct {
  constructor(scope: Construct, id: string, props: LogInsightsQueryProps) {
    super(scope, id);

    const query_root_folder = `ISB-${props.namespace}/`;

    new CfnQueryDefinition(this, "LogQuery", {
      name: query_root_folder + "LogQuery",
      logGroupNames: [IsbComputeResources.globalLogGroup.logGroupName],
      queryString: `# Innovation Sandbox Log Query
# Remember to set the time range for this log query in the widget above
fields @timestamp, @message
# Replace /PasteReferenceIDHere/ with a reference ID such as an AWS Account ID,
# Lease UUID, user email address, or other unique identifier
| filter @message like /PasteReferenceIDHere/
| filter isPresent(message) or isPresent(errorMessage) or isPresent(message.errorMessage)
| filter level != 'DEBUG'
| filter message != 'Lambda invocation event'
| sort @timestamp desc
| display @timestamp, concat(message, message.errorMessage, errorMessage) as msg`,
    });

    new CfnQueryDefinition(this, "ErrorsLogs", {
      name: query_root_folder + "ErrorLogs",
      logGroupNames: [IsbComputeResources.globalLogGroup.logGroupName],
      queryString: `# Innovation Sandbox Errors Query
# View all errors and warnings that have been raised by the core operational
# components of Innovation Sandbox
# Remember to set the time range for this log query in the widget above
fields @timestamp, @message, message.errorMessage
| filter level = 'ERROR' or level = "WARN"
| filter message != 'Lambda invocation event'
| sort @timestamp desc
| display @timestamp, level, concat(message, message.errorMessage, errorMessage) as msg`,
    });

    new CfnQueryDefinition(this, "AccountCleanupLogs", {
      name: query_root_folder + "AccountCleanupLogs",
      logGroupNames: [IsbComputeResources.cleanupLogGroup.logGroupName],
      queryString: `# Innovation Sandbox Account Cleanup Logs
# View all logs from the account cleanup process for a given state machine execution id.
# Results show resource deletion failures that occurred and aws nuke summary logs.
# Remember to set the time range for this log query in the widget above
fields @timestamp, type as resourceType, owner as region, name, msg
# Replace /PasteStateMachineExecutionIdHere/ with the account cleanup state machine execution id for the account under investigation.
| filter @logStream like /PasteStateMachineExecutionIdHere/
| filter # Comment out this filter to see all logs from the state machine execution.
  component = "libnuke"
   or state = "failed"
| sort @timestamp desc
| sort time desc`,
    });
  }
}
