// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  Box,
  ColumnLayout,
  Container,
  CopyToClipboard,
  FormField,
  Header,
  Popover,
  SpaceBetween,
  StatusIndicator,
} from "@cloudscape-design/components";

import {
  isExpiredLease,
  isMonitoredLease,
  isPendingLease,
  Lease,
} from "@amzn/innovation-sandbox-commons/data/lease/lease";
import { BudgetProgressBar } from "@amzn/innovation-sandbox-frontend/components/BudgetProgressBar";
import { BudgetStatus } from "@amzn/innovation-sandbox-frontend/components/BudgetStatus";
import { DurationStatus } from "@amzn/innovation-sandbox-frontend/components/DurationStatus";
import { LeaseStatusBadge } from "@amzn/innovation-sandbox-frontend/domains/leases/components/LeaseStatusBadge";
import moment from "moment";

export const LeaseSummary = ({ lease }: { lease: Lease }) => {
  const isPending = isPendingLease(lease);
  const isMonitored = isMonitoredLease(lease);
  const isExpired = isExpiredLease(lease);
  const isMonitoredOrExpired = isMonitored || isExpired;

  const renderTimePopover = (date: string) => (
    <Popover
      position="top"
      size="large"
      dismissButton={false}
      content={moment(date).format("lll")}
    >
      <Box>{moment(date).fromNow()}</Box>
    </Popover>
  );

  return (
    <Container header={<Header>Lease Summary</Header>}>
      <ColumnLayout columns={2}>
        <SpaceBetween size="l">
          <Box>
            <FormField label="Lease ID" />
            <CopyToClipboard
              variant="inline"
              textToCopy={lease.uuid}
              copySuccessText="Copied Lease ID"
              copyErrorText="Failed to copy Lease ID"
            />
          </Box>
          <Box>
            <FormField label="AWS Account ID" />
            {isMonitoredOrExpired ? (
              <CopyToClipboard
                variant="inline"
                textToCopy={lease.awsAccountId}
                copySuccessText="Copied AWS Account ID"
                copyErrorText="Failed to copy AWS Account ID"
              />
            ) : (
              <StatusIndicator type="warning">
                No account assigned
              </StatusIndicator>
            )}
          </Box>
          <Box>
            <FormField label="Lease Template" />
            <Box>{lease.originalLeaseTemplateName}</Box>
          </Box>
          <Box>
            <FormField label="Requested by" />
            <Box>{lease.userEmail}</Box>
          </Box>
          {isMonitoredOrExpired && (
            <Box>
              <FormField label="Approved by" />
              <Box>
                {lease.approvedBy === "AUTO_APPROVED" ? (
                  <StatusIndicator type="success">
                    Auto approved
                  </StatusIndicator>
                ) : (
                  lease.approvedBy
                )}
              </Box>
            </Box>
          )}
          <Box>
            <FormField label="Status" />
            <Box>
              <LeaseStatusBadge lease={lease} />
            </Box>
          </Box>
        </SpaceBetween>
        <SpaceBetween size="l">
          <Box>
            <FormField label={isPending ? "Max Budget" : "Budget Status"} />
            {isPending ? (
              <BudgetStatus maxSpend={lease.maxSpend} />
            ) : (
              <BudgetProgressBar
                currentValue={
                  !isMonitoredOrExpired ? 0 : lease.totalCostAccrued
                }
                maxValue={lease.maxSpend}
              />
            )}
          </Box>

          {isMonitoredOrExpired && (
            <Box>
              <FormField label="Lease started" />
              {renderTimePopover(lease.startDate)}
            </Box>
          )}

          <Box>
            <FormField label="Lease expiry" />
            <DurationStatus
              date={isMonitoredOrExpired ? lease.expirationDate : undefined}
              durationInHours={lease.leaseDurationInHours}
            />
          </Box>

          {isMonitoredOrExpired && (
            <Box>
              <FormField label="Last monitored" />
              {renderTimePopover(lease.lastCheckedDate)}
            </Box>
          )}

          <Box>
            <FormField label="Comments from requester" />
            {lease.comments ? (
              lease.comments
            ) : (
              <StatusIndicator type="info">
                No comments provided
              </StatusIndicator>
            )}
          </Box>
        </SpaceBetween>
      </ColumnLayout>
    </Container>
  );
};
