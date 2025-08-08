# Innovation Sandbox Deployment Architectures

This document explains the two available deployment architectures for the Innovation Sandbox application.

## 🏗️ **Available Architectures**

### 1. **ALB + Container Architecture** (Recommended)
- **Command**: `npm run deploy:alb`
- **Status**: ✅ **Current working setup**
- **Best for**: Production deployments, GovCloud environments

### 2. **Original Architecture** (CloudFront + S3)
- **Command**: `npm run deploy:compute`
- **Status**: ✅ **Fully implemented**
- **Best for**: Traditional web hosting, global CDN distribution

---

## 🎯 **ALB + Container Architecture** (Recommended)

### **Architecture Overview**
```
Internet → ALB (HTTPS) → Fargate Container → {
  Static Files: Served directly from container
  API Requests: Proxied to API Gateway → Lambda Functions
}
```

### **Key Features**
- ✅ **HTTPS Support**: Built-in SSL/TLS with self-signed certificates
- ✅ **Container-based**: All static files served from Fargate container
- ✅ **API Proxy**: Seamless API Gateway integration
- ✅ **GovCloud Compatible**: Works without CloudFront
- ✅ **Scalable**: Auto-scaling Fargate containers
- ✅ **Cost Effective**: No Lambda invocations for static files

### **Components Deployed**
- Application Load Balancer with HTTPS listener
- Fargate ECS service with API proxy container
- S3 bucket for logging
- API Gateway with Lambda functions
- AWS IAM Identity Center integration

### **Deployment Command**
```bash
npm run deploy:alb
```

### **What Happens During Deployment**
1. Builds React frontend application
2. Creates container image with frontend files
3. Deploys ALB with HTTPS certificate
4. Deploys Fargate service with container
5. Configures API Gateway integration

---

## 📦 **Original Architecture** (CloudFront + S3)

### **Architecture Overview**
```
Internet → CloudFront (HTTPS) → {
  Static Files: S3 Bucket (with Origin Access Control)
  API Requests: API Gateway → Lambda Functions
}
```

### **Key Features**
- ✅ **HTTPS Support**: Built-in SSL/TLS with CloudFront
- ✅ **Global CDN**: CloudFront edge locations worldwide
- ✅ **S3-based**: Static files served directly from S3
- ✅ **No Size Limits**: Full file size support
- ✅ **High Performance**: CloudFront caching and edge optimization
- ✅ **Cost Effective**: S3 storage + CloudFront distribution

### **Components Deployed**
- CloudFront distribution with HTTPS
- S3 bucket for frontend assets (with Origin Access Control)
- S3 bucket for CloudFront access logs
- API Gateway with Lambda functions
- CloudFront functions for path rewriting and SPA routing
- AWS IAM Identity Center integration

### **Deployment Command**
```bash
npm run deploy:compute
```

### **What Happens During Deployment**
1. Builds React frontend application
2. Creates S3 buckets for assets and logging
3. Deploys CloudFront distribution with HTTPS
4. Uploads frontend files to S3 with cache invalidation
5. Configures API Gateway integration with CloudFront behaviors

---

## 🚀 **Deployment Commands Reference**

### **Individual Architecture Deployment**
```bash
# Deploy ALB + Container architecture (recommended)
npm run deploy:alb

# Deploy original architecture (legacy)
npm run deploy:compute
```

### **Full Stack Deployment**
```bash
# Deploy complete stack with original architecture (default)
npm run deploy:all

# Deploy complete stack with ALB architecture (container-based)
npm run deploy:all-alb
```

### **Component-Specific Deployment**
```bash
# Deploy account pool
npm run deploy:account-pool

# Deploy Identity Center integration
npm run deploy:idc

# Deploy data layer
npm run deploy:data
```

---

## 🔄 **Switching Between Architectures**

You can switch between architectures by running the appropriate deployment command:

```bash
# Switch to ALB + Container architecture
npm run deploy:alb

# Switch to original architecture
npm run deploy:compute
```

**Note**: Switching architectures will update the same CloudFormation stack (`InnovationSandbox-Compute`), so the previous architecture components will be replaced.

---

## 📋 **Architecture Comparison**

| Feature | ALB + Container | CloudFront + S3 |
|---------|----------------|-----------------|
| **HTTPS Support** | ✅ Built-in | ✅ Built-in |
| **File Size Limits** | ✅ No limits | ✅ No limits |
| **Performance** | ✅ Fast (direct serving) | ✅ Excellent (CDN caching) |
| **Global Distribution** | ❌ Single region | ✅ Worldwide edge locations |
| **GovCloud Support** | ✅ Full support | ⚠️ Limited (no CloudFront) |
| **Scalability** | ✅ Auto-scaling containers | ✅ Automatic CDN scaling |
| **Cost** | ⚠️ Container + ALB costs | ✅ Lower (S3 + CloudFront) |
| **Complexity** | ⚠️ More components | ✅ Standard web architecture |
| **Maintenance** | ⚠️ Container updates | ✅ Simple S3 deployments |
| **Caching** | ❌ No built-in caching | ✅ Advanced CloudFront caching |

---

## 🎯 **Recommendations**

### **Use ALB + Container Architecture When:**
- ✅ Deploying in GovCloud (CloudFront not available)
- ✅ Need single-region deployment
- ✅ Want container-based architecture
- ✅ Prefer all components in one region
- ✅ Need custom container configurations

### **Use CloudFront + S3 Architecture When:**
- ✅ Need global CDN distribution
- ✅ Want optimal performance worldwide
- ✅ Prefer traditional web hosting architecture
- ✅ Need advanced caching capabilities
- ✅ Want lower operational costs
- ✅ Deploying in standard AWS regions

---

## 🔧 **Environment Variables**

Both architectures use the same environment variables from your `.env` file:

```bash
# Required for both architectures
ORG_MGT_ACCOUNT_ID=your-org-account-id
IDC_ACCOUNT_ID=your-idc-account-id
ACCEPT_SOLUTION_TERMS_OF_USE=Yes
DEPLOYMENT_MODE=development
PRIVATE_ECR_REPO=your-ecr-repo
```

---

## 🆘 **Troubleshooting**

### **Common Issues**

1. **CloudFront deployment taking too long**
   - **Solution**: CloudFront distributions can take 15-20 minutes to deploy
   - **Status**: This is normal AWS behavior

2. **Container build failures (ALB Architecture)**
   - **Solution**: Ensure frontend builds successfully
   - **Command**: `npm run --workspace @amzn/innovation-sandbox-frontend build`

3. **GovCloud deployment issues with CloudFront**
   - **Solution**: Use ALB + Container architecture instead
   - **Command**: `npm run deploy:alb`

### **Getting Help**

If you encounter issues with either architecture:
1. Check the CloudFormation stack events in AWS Console
2. Review CloudWatch logs for the respective components
3. Ensure all environment variables are properly set
4. Verify AWS permissions for deployment

---

**Recommendations**: 
- Use **CloudFront + S3 Architecture** (`npm run deploy:compute`) for standard AWS regions when you need global CDN distribution and optimal worldwide performance
- Use **ALB + Container Architecture** (`npm run deploy:alb`) for GovCloud deployments or when you prefer container-based architectures