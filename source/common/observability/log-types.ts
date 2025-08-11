// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AwsAccountIdSchema } from "@amzn/innovation-sandbox-commons/data/common-schemas.js";
import { LeaseTerminatedReasonTypeSchema } from "@amzn/innovation-sandbox-commons/events/lease-terminated-event.js";
import z from "zod";

export const AccountDriftLogSchema = z.object({
  logDetailType: z.literal("AccountDrift"),
  accountId: AwsAccountIdSchema,
  expectedOu: z.string().optional(),
  actualOu: z.string().optional(),
});

export const LeaseApprovedLogSchema = z.object({
  logDetailType: z.literal("LeaseApproved"),
  leaseId: z.string(),
  leaseTemplateId: z.string(),
  accountId: AwsAccountIdSchema,
  maxBudget: z.number().optional(),
  maxDurationHours: z.number().optional(),
  autoApproved: z.boolean(),
});

export const LeaseTerminatedLogSchema = z.object({
  logDetailType: z.literal("LeaseTerminated"),
  leaseId: z.string(),
  leaseTemplateId: z.string(),
  accountId: AwsAccountIdSchema,
  startDate: z.string(),
  terminationDate: z.string(),
  maxBudget: z.number().optional(),
  actualSpend: z.number(),
  maxDurationHours: z.number().optional(),
  actualDurationHours: z.number(),
  reasonForTermination: LeaseTerminatedReasonTypeSchema,
});

export const DeploymentSummaryLogSchema = z.object({
  logDetailType: z.literal("DeploymentSummary"),
  numLeaseTemplates: z.number().nonnegative(),
  accountPool: z.object({
    available: z.number().nonnegative(),
    active: z.number().nonnegative(),
    frozen: z.number().nonnegative(),
    cleanup: z.number().nonnegative(),
    quarantine: z.number().nonnegative(),
  }),
});

export const CostReportingSchema = z.object({
  logDetailType: z.literal("CostReporting"),
  startDate: z.string(),
  endDate: z.string(),
  sandboxAccountsCost: z.number(),
  solutionOperatingCost: z.number(),
  numAccounts: z.number(),
});

export const AccountCleanupFailure = z.object({
  logDetailType: z.literal("AccountCleanupSuccess"),
  accountId: AwsAccountIdSchema,
  durationMinutes: z.number(),
  stateMachineExecutionArn: z.string(),
  stateMachineExecutionURL: z.string(),
});

export const AccountCleanupSuccess = z.object({
  logDetailType: z.literal("AccountCleanupFailure"),
  accountId: AwsAccountIdSchema,
  durationMinutes: z.number(),
  stateMachineExecutionArn: z.string(),
  stateMachineExecutionURL: z.string(),
});

export const SubscribableLogSchema = z.discriminatedUnion("logDetailType", [
  AccountDriftLogSchema,
  LeaseTerminatedLogSchema,
  LeaseApprovedLogSchema,
  DeploymentSummaryLogSchema,
  CostReportingSchema,
  AccountCleanupFailure,
  AccountCleanupSuccess,
]);

export type SubscribableLog = z.infer<typeof SubscribableLogSchema>;
