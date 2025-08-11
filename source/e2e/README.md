# Innovation Sandbox E2E Test Suite Setup

## Prerequisites

- Administrative permissions in two non-prod AWS accounts (ideally dedicated for this test suite)
- Local dev environment with solution repo cloned and dependencies installed

## Setup

1. Deploy the full Innovation Sandbox on AWS to one of the accounts. If this account is not the management account of an AWS Organization, you will need to do a multi-account deployment (not recommended for e2e test suite). For more instructions on deployment, see the [Deployment Instructions](../deployment/dev-deployment.md).
1. Add the second account as a member of the first account's organization.
1. Move the second account under your ISB deployments OU. It will be named `{namespace}_InnovationSandboxAccountPool`. This will cause the stackset to automatically perform a deployment of the SandboxAccount stack to this account.
1. Create an administrative role in the second account that the first account can assume into. This will be necessary to perform test actions like setup, teardown, and assertions on resources. Here is an example policy:

   Permission Policy:
   It is easiest just to use the `AdministratorAccess` AWS managed permission policy, however you can customize for a more restricted role with only the necessary permissions.

   Trust Policy:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {
           "AWS": "arn:aws:iam::{ORG_MANAGEMENT_ACCOUNT_ID}:root"
         },
         "Action": "sts:AssumeRole"
       }
     ]
   }
   ```

1. Configure `.env` file with test values. The `example.env` file details necessary fields that you will need to provide to run these tests:
   - DATA_STACK: Data stack name for your test deployment
   - COMPUTE_STACK: Compute stack name for your test deployment
   - SANDBOX_ACCOUNT_ID: AWS Account ID of the test account that you will be using to act as a sandbox
   - SANDBOX_ACCOUNT_ADMIN_ROLE_NAME: Name of an administrative role in that account. Will need to have necessary permissions (full access) to create and delete resources needed for tests
   - EMAIL_FROM: Email address used to send notifications

## Run

To run the test suite simply run the following command from the root of the repo:

```
npm run e2e
```

Because of the nature of the solution, some e2e tests will take an extremely long time to run. While it is not useful to run these all the time, they should occasionally be run to make sure no regressions in functionality have occurred. To run these tests as well, you can run the following command:

```
npm run e2e:slow
```

Tests can easily be marked as "slow" by using the `runIf` method on the vitest `test`, `it`, and `describe` functions like so:

```ts
test.runIf(process.env.RUN_SLOW_TESTS === "true")(() => {
  // Test code here
});
```

Any tests configured this way will only run as part of the `npm run e2e:slow` script and be skipped otherwise.

Happy testing :)
