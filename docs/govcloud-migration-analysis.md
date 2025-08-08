# AWS GovCloud Migration Analysis for Innovation Sandbox

## Executive Summary

This document analyzes the Innovation Sandbox on AWS project for compatibility with AWS GovCloud (US) regions. Several AWS services used in the current implementation are not available in GovCloud and will require alternative solutions or architectural changes.

## Services Not Available in AWS GovCloud

### 1. Amazon CloudFront ✅ (Migrated to ALB)
**Previous Usage**: 
- Frontend web application distribution
- API Gateway caching and routing
- Security headers and content security policies
- Static asset delivery from S3

**Migration Status**: COMPLETED - Replaced with Application Load Balancer (ALB)

**Files Updated**:
- Created `source/infrastructure/lib/components/alb/alb-ui-api.ts`
- Created `source/infrastructure/lib/components/alb/s3-access-lambda.ts`
- Created `source/infrastructure/lib/components/alb/security-headers.ts`
- Updated `source/infrastructure/lib/isb-compute-resources.ts`

### 2. Amazon EventBridge Scheduler ❌
**Current Usage**:
- Lease monitoring scheduled events (hourly execution)
- Account drift monitoring
- Cost reporting schedules
- Log archiving schedules

**Impact**: MEDIUM - Affects automated monitoring and maintenance

**Files Affected**:
- `source/infrastructure/lib/components/account-management/lease-monitoring-lambda.ts`
- `source/infrastructure/lib/components/account-management/account-drift-monitoring-lambda.ts`
- `source/infrastructure/lib/components/observability/cost-reporting-lambda.ts`
- `source/infrastructure/lib/components/observability/log-archiving.ts`

### 3. AWS Application Insights ❌
**Current Usage**:
- Application performance monitoring
- Resource group-based monitoring
- Automated dashboards and alerts

**Impact**: LOW - Monitoring enhancement, not core functionality

**Files Affected**:
- `source/infrastructure/lib/components/observability/app-insights.ts`
- `source/infrastructure/lib/isb-compute-stack.ts`

## Services Available in GovCloud ✅

The following core services ARE available and will work without modification:
- AWS Organizations
- IAM Identity Center (AWS SSO)
- DynamoDB
- Lambda
- API Gateway
- S3
- KMS
- CloudWatch
- EventBridge (Events, not Scheduler)
- SQS
- SNS
- CodeBuild
- Step Functions
- AWS AppConfig
- Systems Manager (SSM)
- CloudFormation
- ECR
## Required Architectural Changes

### 1. CloudFront Replacement Strategy

#### Option A: Application Load Balancer (ALB) + S3 (Recommended)
**Architecture**:
```
Users → ALB → Lambda (API) + S3 Static Website
```

**Implementation**:
- Replace CloudFront distribution with Application Load Balancer
- Configure ALB with multiple target groups:
  - API Gateway for `/api/*` paths
  - S3 static website hosting for frontend assets
- Implement security headers using Lambda@Edge alternative (ALB rules)
- Use ALB SSL termination with ACM certificates

**Benefits**:
- Native GovCloud support
- Similar functionality to CloudFront
- Integrated with AWS WAF for security

**Considerations**:
- Higher latency than CloudFront (no global edge locations)
- More complex routing configuration
- Additional cost for ALB

#### Option B: API Gateway + S3 Static Website
**Architecture**:
```
Users → API Gateway → Lambda (API)
Users → S3 Static Website (Frontend)
```

**Implementation**:
- Separate frontend and API completely
- Use S3 static website hosting for frontend
- Direct API Gateway access for backend
- Implement CORS properly for cross-origin requests

**Benefits**:
- Simpler architecture
- Lower cost
- Clear separation of concerns

**Considerations**:
- Two separate endpoints for users
- CORS complexity
- No unified caching strategy

### 2. EventBridge Scheduler Replacement

#### Option A: CloudWatch Events (EventBridge Rules) + Lambda
**Implementation**:
- Replace `CfnSchedule` with `Rule` from `aws-events`
- Use `ScheduleExpression` with rate or cron expressions
- Lambda functions remain the same

**Code Changes**:
```typescript
// Replace this:
new CfnSchedule(scope, "LeaseMonitoringScheduledEvent", {
  scheduleExpression: "rate(1 hour)",
  target: { arn: lambda.functionArn }
});

// With this:
new Rule(scope, "LeaseMonitoringScheduledEvent", {
  schedule: Schedule.rate(Duration.hours(1)),
  targets: [new LambdaFunction(lambda)]
});
```

#### Option B: Step Functions + CloudWatch Events
**Implementation**:
- Use Step Functions for complex scheduling workflows
- CloudWatch Events to trigger Step Functions
- Better for multi-step processes

### 3. Application Insights Replacement

#### Option A: CloudWatch Dashboards + Alarms
**Implementation**:
- Create custom CloudWatch dashboards
- Set up CloudWatch alarms for key metrics
- Use CloudWatch Insights for log analysis

#### Option B: Remove Application Insights
**Implementation**:
- Simply remove the Application Insights component
- Rely on existing CloudWatch monitoring
- Add custom metrics if needed
## Implementation Plan

### Phase 1: EventBridge Scheduler Migration (Low Risk)
**Estimated Effort**: 1-2 days

1. **Replace EventBridge Scheduler with CloudWatch Events**
   - Update `lease-monitoring-lambda.ts`
   - Update `account-drift-monitoring-lambda.ts`
   - Update `cost-reporting-lambda.ts`
   - Update `log-archiving.ts`

2. **Testing**
   - Verify scheduled functions execute correctly
   - Test error handling and retry logic

### Phase 2: Application Insights Removal (Low Risk)
**Estimated Effort**: 0.5 days

1. **Remove Application Insights**
   - Remove `app-insights.ts` component
   - Update `isb-compute-stack.ts`
   - Remove related imports and references

2. **Optional: Add CloudWatch Dashboards**
   - Create custom dashboards for key metrics
   - Set up alarms for critical thresholds

### Phase 3: CloudFront Migration (High Risk)
**Estimated Effort**: 3-5 days

1. **Choose Architecture** (Recommend Option A: ALB + S3)

2. **Implement ALB Solution**
   - Create new `alb-ui-api.ts` component
   - Configure target groups for API and S3
   - Set up SSL certificates
   - Implement security headers

3. **Update Frontend Build**
   - Modify build process for S3 static hosting
   - Update API endpoint configuration
   - Test CORS settings

4. **Update Infrastructure**
   - Replace CloudFront component in compute stack
   - Update outputs and references
   - Update deployment scripts

### Phase 4: Testing and Validation
**Estimated Effort**: 2-3 days

1. **Integration Testing**
   - Deploy to GovCloud test environment
   - Test all user workflows
   - Verify security configurations

2. **Performance Testing**
   - Compare performance with CloudFront version
   - Optimize ALB configuration if needed

3. **Security Review**
   - Verify security headers
   - Test WAF integration
   - Review access logs

## Code Changes Required

### 1. EventBridge Scheduler → CloudWatch Events

**File**: `source/infrastructure/lib/components/account-management/lease-monitoring-lambda.ts`

```typescript
// Remove:
import { CfnSchedule } from "aws-cdk-lib/aws-scheduler";

// Add:
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";

// Replace CfnSchedule with Rule:
new Rule(scope, "LeaseMonitoringScheduledEvent", {
  description: "triggers LeaseMonitoring every hour",
  schedule: Schedule.rate(Duration.hours(1)),
  targets: [new LambdaFunction(lambda.lambdaFunction)]
});
```

### 2. CloudFront → ALB

**New File**: `source/infrastructure/lib/components/alb/alb-ui-api.ts`

```typescript
import {
  ApplicationLoadBalancer,
  ApplicationTargetGroup,
  ListenerAction,
  ListenerCondition,
  Protocol,
  TargetType
} from "aws-cdk-lib/aws-elasticloadbalancingv2";

export class AlbUiApi extends Construct {
  constructor(scope: Construct, id: string, props: AlbUiApiProps) {
    // Implementation for ALB-based solution
  }
}
```

### 3. Remove Application Insights

**File**: `source/infrastructure/lib/isb-compute-stack.ts`

```typescript
// Remove these lines:
import { ApplicationInsights } from "@amzn/innovation-sandbox-infrastructure/components/observability/app-insights";

new ApplicationInsights(this, "IsbApplicationInsights", {
  namespace: namespaceParam.namespace.valueAsString,
});
```
## Risk Assessment

### High Risk Items
1. **CloudFront Migration**
   - **Risk**: Frontend application may not work correctly with ALB
   - **Mitigation**: Thorough testing, gradual rollout
   - **Fallback**: Separate S3 static website + API Gateway

### Medium Risk Items
1. **EventBridge Scheduler Migration**
   - **Risk**: Scheduled tasks may not execute as expected
   - **Mitigation**: CloudWatch Events is mature and well-tested
   - **Fallback**: Manual Lambda invocation for critical tasks

### Low Risk Items
1. **Application Insights Removal**
   - **Risk**: Loss of monitoring capabilities
   - **Mitigation**: CloudWatch provides sufficient monitoring
   - **Fallback**: Custom CloudWatch dashboards

## GovCloud-Specific Considerations

### 1. Compliance Requirements
- Ensure all data remains within GovCloud boundaries
- Verify encryption standards meet FedRAMP requirements
- Review access controls and audit logging

### 2. Service Limitations
- Some AWS services have limited features in GovCloud
- Check service quotas and limits
- Verify third-party integrations work in GovCloud

### 3. Networking
- VPC endpoints may be required for some services
- Consider network latency without CloudFront edge locations
- Plan for cross-region connectivity if needed

## Testing Strategy

### 1. Unit Tests
- Update existing unit tests for modified components
- Add tests for new ALB component
- Verify EventBridge Events functionality

### 2. Integration Tests
- Test complete user workflows
- Verify API functionality through ALB
- Test scheduled Lambda executions

### 3. Performance Tests
- Compare response times with CloudFront version
- Test under load to verify ALB performance
- Monitor resource utilization

### 4. Security Tests
- Verify security headers are properly set
- Test WAF integration
- Validate SSL/TLS configuration

## Deployment Considerations

### 1. Blue/Green Deployment
- Deploy new architecture alongside existing
- Gradually shift traffic to new infrastructure
- Keep rollback plan ready

### 2. DNS Management
- Plan DNS cutover strategy
- Consider using Route 53 weighted routing
- Prepare for potential downtime

### 3. Monitoring
- Set up comprehensive monitoring before cutover
- Create runbooks for common issues
- Plan for 24/7 monitoring during transition

## Cost Impact

### CloudFront → ALB Migration
- **Savings**: No CloudFront data transfer costs
- **Additional Costs**: ALB hourly charges (~$16-22/month)
- **Net Impact**: Likely cost neutral or slight increase

### EventBridge Scheduler → CloudWatch Events
- **Savings**: No EventBridge Scheduler costs
- **Additional Costs**: Minimal CloudWatch Events costs
- **Net Impact**: Cost savings

### Application Insights Removal
- **Savings**: Application Insights costs eliminated
- **Net Impact**: Cost savings

## Conclusion

The Innovation Sandbox can be successfully migrated to AWS GovCloud with moderate effort. The main challenges are:

1. **CloudFront replacement** - Requires architectural changes but feasible with ALB
2. **EventBridge Scheduler replacement** - Straightforward migration to CloudWatch Events
3. **Application Insights removal** - Minimal impact on functionality

**Total Estimated Effort**: 6-10 days
**Risk Level**: Medium (primarily due to CloudFront migration)
**Recommended Approach**: Phased migration starting with low-risk items

The solution will maintain full functionality while complying with GovCloud requirements and potentially reducing overall costs.
