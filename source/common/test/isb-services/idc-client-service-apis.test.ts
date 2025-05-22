// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import {
  DescribeUserCommand,
  GetUserIdCommand,
  IdentitystoreClient,
  ListGroupMembershipsCommand,
  ListGroupMembershipsForMemberCommand,
  ListGroupsCommand,
} from "@aws-sdk/client-identitystore";
import {
  CreateAccountAssignmentCommand,
  DeleteAccountAssignmentCommand,
  DescribePermissionSetCommand,
  ListAccountAssignmentsCommand,
  ListPermissionSetsCommand,
  PermissionSet,
  PrincipalType,
  SSOAdminClient,
  TargetType,
} from "@aws-sdk/client-sso-admin";
import { mockClient } from "aws-sdk-client-mock";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearCache } from "@amzn/innovation-sandbox-commons/isb-services/idc-cache.js";
import {
  IsbGroupAttrs,
  IsbPermissionSetAttrs,
} from "@amzn/innovation-sandbox-commons/isb-services/idc-service.js";
import { IsbServices } from "@amzn/innovation-sandbox-commons/isb-services/index.js";
import {
  IsbRole,
  IsbUser,
} from "@amzn/innovation-sandbox-commons/types/isb-types.js";

const test_env = {
  ISB_NAMESPACE: "abc",
  IDENTITY_STORE_ID: "d-111111111111",
  SSO_INSTANCE_ARN: "arn:aws:sso:::instance/ssoins-111111",
  USER_AGENT_EXTRA: "test-user-agent",
};

vi.mock("@amzn/innovation-sandbox-commons/utils/cross-account-roles.js", () => {
  return {
    withTemporaryCredentials: vi.fn(
      () => (originalMethod: any) => originalMethod,
    ),
  };
});

describe("Idc service api", () => {
  const identityStoreMock = mockClient(IdentitystoreClient);
  const ssoAdminMock = mockClient(SSOAdminClient);
  const idcHelper = IsbServices.idcService(test_env);

  const defaultIsbGroupAttrs: IsbGroupAttrs = (idcHelper as any)
    .defaultIsbGroupAttrs;
  const defaultIsbPermissionSetAttrs: IsbPermissionSetAttrs = (idcHelper as any)
    .defaultIsbPermissionSetAttrs;

  beforeEach(() => {
    identityStoreMock.reset();
    ssoAdminMock.reset();
    clearCache();
  });

  describe("users and assignment", async () => {
    const testGroupId = "TestGroup1";
    const testUserId = "TestUser1";
    const testIdcUser = {
      UserId: testUserId,
      DisplayName: "Test User",
      UserName: "testuser",
      Emails: [
        {
          Value: "testuser@example.com",
          Primary: true,
        },
        {
          Value: "testuser1@example.com",
          Primary: false,
        },
      ],
    };
    const testGroups = Object.values(defaultIsbGroupAttrs).map((groupAttrs) => {
      return {
        DisplayName: groupAttrs.name,
        GroupId: testGroupId,
        IdentityStoreId: test_env.IDENTITY_STORE_ID,
      };
    });
    const isbUserGroup = defaultIsbGroupAttrs["User"];
    const testUserGroup = {
      DisplayName: isbUserGroup.name,
      GroupId: testGroupId,
      IdentityStoreId: test_env.IDENTITY_STORE_ID,
    };

    it.each<[role: IsbRole, noUserInGroup: boolean]>([
      ["User", false],
      ["Manager", false],
      ["Admin", false],
      ["User", true],
    ])("should list users for role %s", async (role, noUserInGroup) => {
      identityStoreMock.on(ListGroupsCommand).resolves({
        Groups: testGroups,
      });

      if (noUserInGroup) {
        identityStoreMock.on(ListGroupMembershipsCommand).resolves({
          GroupMemberships: [],
        });
      } else {
        identityStoreMock.on(ListGroupMembershipsCommand).resolves({
          GroupMemberships: [
            {
              IdentityStoreId: test_env.IDENTITY_STORE_ID,
              MemberId: {
                UserId: testUserId,
              },
            },
          ],
        });
      }

      identityStoreMock.on(DescribeUserCommand).resolves(testIdcUser);

      const users: IsbUser[] = [];
      switch (role) {
        case "Admin":
          users.push(...(await idcHelper.listIsbAdmins()).result);
          break;
        case "Manager":
          users.push(...(await idcHelper.listIsbManagers()).result);
          break;
        case "User":
          users.push(...(await idcHelper.listIsbUsers()).result);
          break;
      }
      if (noUserInGroup) {
        expect(users.length).toBe(0);
      } else {
        expect(users.length).toBe(1);
        expect(users[0]).toMatchObject({
          userId: testUserId,
          displayName: testIdcUser.DisplayName,
          userName: testIdcUser.UserName,
          email: testIdcUser.Emails[0]!.Value,
        });
      }
    });

    it("should get list of users with pagination", async () => {
      const nextTextToken = "TestToken";
      identityStoreMock.on(ListGroupsCommand).resolves({
        Groups: testGroups,
      });

      identityStoreMock.on(ListGroupMembershipsCommand).resolves({
        GroupMemberships: [
          {
            IdentityStoreId: test_env.IDENTITY_STORE_ID,
            MemberId: {
              UserId: testUserId,
            },
          },
        ],
        NextToken: nextTextToken,
      });

      identityStoreMock.on(DescribeUserCommand).resolves(testIdcUser);

      const response = await idcHelper.listIsbUsers({ pageSize: 2 });
      const users = response.result;
      expect(users.length).toBe(1);
      expect(users[0]).toMatchObject({
        userId: testUserId,
        displayName: testIdcUser.DisplayName,
        userName: testIdcUser.UserName,
        email: testIdcUser.Emails[0]!.Value,
      });
      expect(response.nextPageIdentifier).toEqual(nextTextToken);
    });

    it("should get user from email when all roles are assigned", async () => {
      const testEmail = "user@example.com";

      identityStoreMock.on(GetUserIdCommand).resolves({
        UserId: testUserId,
      });
      identityStoreMock.on(DescribeUserCommand).resolves(testIdcUser);
      identityStoreMock.on(ListGroupsCommand).resolves({
        Groups: testGroups,
      });
      identityStoreMock.on(ListGroupMembershipsForMemberCommand).resolves({
        GroupMemberships: [
          {
            GroupId: testGroupId,
            IdentityStoreId: test_env.IDENTITY_STORE_ID,
          },
        ],
      });
      const user = await idcHelper.getUserFromEmail(testEmail);
      expect(user).toEqual({
        userId: testUserId,
        displayName: testIdcUser.DisplayName,
        userName: testIdcUser.UserName,
        email: testIdcUser.Emails[0]!.Value,
        roles: ["User", "Manager", "Admin"],
      });
    });

    it("should get user from email with some roles assigned", async () => {
      const testEmail = "user@example.com";

      identityStoreMock.on(GetUserIdCommand).resolves({
        UserId: testUserId,
      });
      identityStoreMock.on(DescribeUserCommand).resolves(testIdcUser);
      identityStoreMock.on(ListGroupsCommand).resolves({
        Groups: [testUserGroup],
      });
      identityStoreMock.on(ListGroupMembershipsForMemberCommand).resolves({
        GroupMemberships: [
          {
            GroupId: testGroupId,
            IdentityStoreId: test_env.IDENTITY_STORE_ID,
          },
        ],
      });
      const user = await idcHelper.getUserFromEmail(testEmail);
      expect(user).toEqual({
        userId: testUserId,
        displayName: testIdcUser.DisplayName,
        userName: testIdcUser.UserName,
        email: testIdcUser.Emails[0]!.Value,
        roles: ["User"],
      });
    });

    it("should return an undefined when the user isn't in any of the ISB groups", async () => {
      const testEmail = "user@example.com";

      identityStoreMock.on(GetUserIdCommand).resolves({
        UserId: testUserId,
      });
      identityStoreMock.on(DescribeUserCommand).resolves(testIdcUser);
      identityStoreMock.on(ListGroupsCommand).resolves({
        Groups: [],
      });
      identityStoreMock.on(ListGroupMembershipsForMemberCommand).resolves({
        GroupMemberships: [
          {
            GroupId: testGroupId,
            IdentityStoreId: test_env.IDENTITY_STORE_ID,
          },
        ],
      });
      expect(await idcHelper.getUserFromEmail(testEmail)).toEqual(undefined);
    });

    it("should get user from user name", async () => {
      const userName = "userName1";

      identityStoreMock.on(GetUserIdCommand).resolves({
        UserId: testUserId,
      });
      identityStoreMock.on(DescribeUserCommand).resolves(testIdcUser);
      identityStoreMock.on(ListGroupsCommand).resolves({
        Groups: testGroups,
      });
      identityStoreMock.on(ListGroupMembershipsForMemberCommand).resolves({
        GroupMemberships: [
          {
            GroupId: testGroupId,
            IdentityStoreId: test_env.IDENTITY_STORE_ID,
          },
        ],
      });
      const user = await idcHelper.getUserFromUsername(userName);
      expect(user).toEqual({
        userId: testUserId,
        displayName: testIdcUser.DisplayName,
        userName: testIdcUser.UserName,
        email: testIdcUser.Emails[0]!.Value,
        roles: ["User", "Manager", "Admin"],
      });
    });
  });

  describe("Account assignment and removal", async () => {
    const samplePermissionSetArns: string[] = [
      "arn:aws:sso:::permissionSet/ssoins-11111111/ps-11111111",
      "arn:aws:sso:::permissionSet/ssoins-22222222/ps-22222222",
    ];
    const testUser: IsbUser = {
      userId: "User1",
      email: "testuser@example.com",
      roles: ["User", "Manager"],
    };
    const testAccountId = "111111111111";
    const testPermissionSetArn =
      "arn:aws:sso:::permissionSet/ssoins-11111111/ps-11111111";
    const samplePermissionSetUser: PermissionSet = {
      Name: defaultIsbPermissionSetAttrs["User"].name,
      Description: defaultIsbPermissionSetAttrs["User"].description,
      PermissionSetArn: testPermissionSetArn,
    };
    const samplePermissionSetManager: PermissionSet = {
      Name: defaultIsbPermissionSetAttrs["Manager"].name,
      Description: defaultIsbPermissionSetAttrs["Manager"].description,
      PermissionSetArn: testPermissionSetArn,
    };

    it("should assign an account to a user", async () => {
      ssoAdminMock.on(CreateAccountAssignmentCommand).resolves({});
      ssoAdminMock
        .on(ListPermissionSetsCommand)
        .resolves({ PermissionSets: samplePermissionSetArns });
      ssoAdminMock
        .on(DescribePermissionSetCommand)
        .resolvesOnce({ PermissionSet: samplePermissionSetUser })
        .resolvesOnce({ PermissionSet: samplePermissionSetManager });

      await idcHelper
        .transactionalGrantUserAccess(testAccountId, testUser)
        .complete();

      const commandCalls = ssoAdminMock.commandCalls(
        CreateAccountAssignmentCommand,
      );
      expect(commandCalls.length).toBe(1);
      const hasMatchingCall = commandCalls.every((call) =>
        expect(call.args[0].input).toEqual({
          InstanceArn: test_env.SSO_INSTANCE_ARN,
          PermissionSetArn: testPermissionSetArn,
          PrincipalId: testUser.userId,
          PrincipalType: "USER",
          TargetId: testAccountId,
          TargetType: TargetType.AWS_ACCOUNT,
        }),
      );
      expect(hasMatchingCall).toBeTruthy();
    });

    it("should throw an error if the api fails", async () => {
      ssoAdminMock
        .on(ListPermissionSetsCommand)
        .resolves({ PermissionSets: samplePermissionSetArns });
      ssoAdminMock
        .on(DescribePermissionSetCommand)
        .resolves({ PermissionSet: samplePermissionSetUser });
      ssoAdminMock
        .on(CreateAccountAssignmentCommand)
        .rejects(new Error("Unexpected Error"));
      await expect(
        idcHelper
          .transactionalGrantUserAccess(testAccountId, testUser)
          .complete(),
      ).rejects.toThrow("Transaction Failed: Error: Unexpected Error");
    });

    it("should delete account assignment for a user", async () => {
      ssoAdminMock.on(DeleteAccountAssignmentCommand).resolves({});
      ssoAdminMock
        .on(ListPermissionSetsCommand)
        .resolves({ PermissionSets: samplePermissionSetArns });
      ssoAdminMock
        .on(DescribePermissionSetCommand)
        .resolvesOnce({ PermissionSet: samplePermissionSetUser })
        .resolvesOnce({ PermissionSet: samplePermissionSetManager });

      await idcHelper.revokeUserAccess(testAccountId, testUser);

      const commandCalls = ssoAdminMock.commandCalls(
        DeleteAccountAssignmentCommand,
      );
      expect(commandCalls.length).toBe(1);
      const hasMatchingCall = commandCalls.every((call) =>
        expect(call.args[0].input).toEqual({
          InstanceArn: test_env.SSO_INSTANCE_ARN,
          PermissionSetArn: testPermissionSetArn,
          PrincipalId: testUser.userId,
          PrincipalType: "USER",
          TargetId: testAccountId,
          TargetType: TargetType.AWS_ACCOUNT,
        }),
      );
      expect(hasMatchingCall).toBeTruthy();
    });

    it("should revoke access to all users with ISB User PS", async () => {
      ssoAdminMock.on(DeleteAccountAssignmentCommand).resolves({});
      ssoAdminMock
        .on(ListPermissionSetsCommand)
        .resolves({ PermissionSets: samplePermissionSetArns });
      ssoAdminMock
        .on(DescribePermissionSetCommand)
        .resolvesOnce({ PermissionSet: samplePermissionSetUser })
        .resolvesOnce({ PermissionSet: samplePermissionSetManager });
      ssoAdminMock.on(ListAccountAssignmentsCommand).resolves({
        AccountAssignments: [
          {
            AccountId: testAccountId,
            PermissionSetArn: testPermissionSetArn,
            PrincipalId: testUser.userId,
            PrincipalType: PrincipalType.USER,
          },
          {
            AccountId: testAccountId,
            PermissionSetArn: testPermissionSetArn,
            PrincipalId: testUser.userId,
            PrincipalType: PrincipalType.USER,
          },
          {
            AccountId: testAccountId,
            PermissionSetArn: testPermissionSetArn,
            PrincipalId: testUser.userId,
            PrincipalType: PrincipalType.GROUP, //won't be removed because a group, not a user
          },
          {
            AccountId: testAccountId,
            PermissionSetArn: testPermissionSetArn + "SomethingElse", //won't be removed as it is another PS
            PrincipalId: testUser.userId,
            PrincipalType: PrincipalType.GROUP,
          },
        ],
      });

      await idcHelper.revokeAllUserAccess(testAccountId);

      const commandCalls = ssoAdminMock.commandCalls(
        DeleteAccountAssignmentCommand,
      );
      expect(commandCalls.length).toBe(2);
      const hasMatchingCall = commandCalls.every((call) =>
        expect(call.args[0].input).toEqual({
          InstanceArn: test_env.SSO_INSTANCE_ARN,
          PermissionSetArn: testPermissionSetArn,
          PrincipalId: testUser.userId,
          PrincipalType: "USER",
          TargetId: testAccountId,
          TargetType: TargetType.AWS_ACCOUNT,
        }),
      );
      expect(hasMatchingCall).toBeTruthy();
    });
  });
});
