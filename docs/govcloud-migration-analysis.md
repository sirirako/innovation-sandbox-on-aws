# AWS GovCloud Support Implementation Summary

## Overview

This document summarizes the implementation of AWS GovCloud support for the Innovation Sandbox solution. The solution now supports dual deployment architectures to ensure compatibility with both standard AWS regions and AWS GovCloud (US) regions.

## Implemented GovCloud Compatibility Features

### 1. Dual Architecture Support ✅ COMPLETED

**Implementation**: Added support for both CloudFront + S3 and ALB + Container architectures

**Key Changes**:

- **Architecture Selection**: Added `useAlbArchitecture` context parameter for deployment-time architecture selection
- **ALB Implementation**: Created complete ALB-based frontend hosting solution
- **Conditional Deployment**: Infrastructure automatically selects appropriate components based on architecture choice

**Files Implemented**:

- `source/infrastructure/lib/components/alb/alb-ui-api.ts` - ALB-based UI and API hosting
- `source/infrastructure/lib/isb-compute-resources.ts` - Dual architecture logic
- `source/infrastructure/lib/helpers/scheduler-helper.ts` - Architecture-aware scheduler selection

### 2. EventBridge Scheduler Compatibility ✅ COMPLETED

**Implementation**: Architecture-aware scheduler selection between EventBridge Scheduler and CloudWatch Events

**Solution**:

- **Automatic Selection**: ALB architecture automatically uses CloudWatch Events Rules instead of EventBridge Scheduler
- **CloudFront Architecture**: Continues to use EventBridge Scheduler (available in standard regions)
- **GovCloud Architecture**: Uses CloudWatch Events Rules (available in GovCloud)

**Technical Details**:

- Created `SchedulerHelper` class for architecture-aware scheduler creation
- Maintains identical functionality across both scheduler types
- Handles cron expression format differences automatically

### 3. Application Insights Conditional Deployment ✅ COMPLETED

**Implementation**: Application Insights only deploys with CloudFront architecture

**Solution**:

- **CloudFront Architecture**: Deploys Application Insights for enhanced monitoring
- **ALB Architecture**: Skips Application Insights deployment (not available in GovCloud)
- **Fallback Monitoring**: Relies on standard CloudWatch monitoring for ALB architecture

## Deployment Instructions

### Standard AWS Regions (CloudFront + S3 Architecture)

```shell
npm run deploy:all
```

### AWS GovCloud Regions (ALB + Container Architecture)

```shell
npm run deploy:all-alb
```

> **Note**: ALB architecture requires a valid SSL certificate ARN configured in your `.env` file as `CERTIFICATE_ARN`.

#### SSL Certificate Setup

For production deployments, use a certificate from AWS Certificate Manager (ACM) with a valid domain. For development/testing purposes, you can create a self-signed certificate:

**Option 1: Self-Signed Certificate (Development/Testing Only)**

1. **Create a self-signed certificate using OpenSSL:**
   ```shell
   # Generate a private key
   openssl genrsa -out private-key.pem 2048
   
   # Generate a certificate signing request
   openssl req -new -key private-key.pem -out csr.pem \
     -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
   
   # Generate the self-signed certificate
   openssl x509 -req -in csr.pem -signkey private-key.pem -out certificate.pem -days 365
   
   # Import the certificate to ACM
   aws acm import-certificate \
     --certificate fileb://certificate.pem \
     --private-key fileb://private-key.pem \
     --region us-east-1
   ```

2. **Get the certificate ARN from the output and add it to your `.env` file:**
   ```shell
   CERTIFICATE_ARN=arn:aws:acm:us-east-1:[account-id]:certificate/[certificate-id]
   ```

3. **Clean up the certificate files:**
   ```shell
   rm private-key.pem csr.pem certificate.pem
   ```

**Option 2: ACM Certificate with Domain Validation (Production)**

1. **Request a certificate through ACM:**
   ```shell
   aws acm request-certificate \
     --domain-name yourdomain.com \
     --validation-method DNS \
     --region us-east-1
   ```

2. **Follow the DNS validation process in the AWS Console**

3. **Use the validated certificate ARN in your `.env` file**

> ⚠️ **Security Warning**: Self-signed certificates should only be used for development and testing. Browsers will show security warnings, and the certificate won't be trusted by default. For production deployments, always use properly validated certificates from ACM or a trusted Certificate Authority.

## Technical Implementation Details

### Architecture Decision Logic

The solution automatically selects appropriate components based on the `useAlbArchitecture` context parameter:

- **CloudFront Architecture** (`useAlbArchitecture=false`): Uses EventBridge Scheduler, Application Insights, CloudFront distribution
- **ALB Architecture** (`useAlbArchitecture=true`): Uses CloudWatch Events Rules, skips Application Insights, deploys ALB

### Key Components

#### SchedulerHelper Class

- **Location**: `source/infrastructure/lib/helpers/scheduler-helper.ts`
- **Purpose**: Provides architecture-aware scheduler creation
- **Functionality**: Automatically selects EventBridge Scheduler or CloudWatch Events based on architecture

#### Dual Architecture Logic

- **Location**: `source/infrastructure/lib/isb-compute-resources.ts`
- **Purpose**: Conditionally deploys CloudFront or ALB components
- **Implementation**: Uses CDK context to determine which architecture to deploy

#### ALB Implementation

- **Location**: `source/infrastructure/lib/components/alb/alb-ui-api.ts`
- **Purpose**: Complete ALB-based frontend and API hosting solution
- **Features**: SSL termination, security headers, S3 static hosting, API Gateway integration

## GovCloud Compatibility Status

| Service               | Standard AWS | GovCloud         | Implementation Status                        |
| --------------------- | ------------ | ---------------- | -------------------------------------------- |
| CloudFront            | ✅ Available | ❌ Not Available | ✅ ALB alternative implemented               |
| EventBridge Scheduler | ✅ Available | ❌ Not Available | ✅ CloudWatch Events alternative implemented |
| Application Insights  | ✅ Available | ❌ Not Available | ✅ Conditional deployment implemented        |
| All Other Services    | ✅ Available | ✅ Available     | ✅ No changes required                       |

## Benefits of Implementation

1. **Seamless GovCloud Support**: Deploy to GovCloud without code modifications
2. **Architecture Flexibility**: Choose optimal architecture for your deployment environment
3. **Feature Parity**: Both architectures provide identical functionality
4. **Cost Optimization**: Potential cost savings by avoiding premium services where alternatives exist
5. **Future-Proof**: Easy to extend support for additional regions or service limitations
