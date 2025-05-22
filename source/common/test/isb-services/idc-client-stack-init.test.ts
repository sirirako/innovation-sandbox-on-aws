// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import {
  CreateGroupCommand,
  DeleteGroupCommand,
  Group,
  IdentitystoreClient,
  ListGroupsCommand,
} from "@aws-sdk/client-identitystore";
import {
  AttachManagedPolicyToPermissionSetCommand,
  CreatePermissionSetCommand,
  DeletePermissionSetCommand,
  DescribePermissionSetCommand,
  ListPermissionSetsCommand,
  PermissionSet,
  SSOAdminClient,
} from "@aws-sdk/client-sso-admin";
import { mockClient } from "aws-sdk-client-mock";
import { beforeEach, describe, expect, it } from "vitest";

import {
  IsbGroupAttrs,
  IsbPermissionSetAttrs,
} from "@amzn/innovation-sandbox-commons/isb-services/idc-service.js";
import { IsbServices } from "@amzn/innovation-sandbox-commons/isb-services/index.js";

const test_env = {
  ISB_NAMESPACE: "abc",
  IDENTITY_STORE_ID: "d-111111111111",
  SSO_INSTANCE_ARN: "arn:aws:sso:::instance/ssoins-111111",
  USER_AGENT_EXTRA: "test-user-agent",
};

const identityStoreMock = mockClient(IdentitystoreClient);
const ssoAdminClientMock = mockClient(SSOAdminClient);

describe("IdcService initialization", () => {
  const idcHelper = IsbServices.idcService(test_env);

  beforeEach(() => {
    identityStoreMock.reset();
    ssoAdminClientMock.reset();
  });

  describe("Identity Store", () => {
    const defaultIsbGroupAttrs: IsbGroupAttrs = (idcHelper as any)
      .defaultIsbGroupAttrs;
    it("should list groups when calling listGroups()", async () => {
      const mockGroups: Group[] = [
        {
          GroupId: "Users",
          IdentityStoreId: test_env.IDENTITY_STORE_ID,
          DisplayName: "Users",
        },
        {
          GroupId: "Admins",
          IdentityStoreId: test_env.IDENTITY_STORE_ID,
          DisplayName: "Admins",
        },
      ];
      identityStoreMock.on(ListGroupsCommand).resolves({ Groups: mockGroups });

      const result = await (idcHelper as any).listGroups();

      expect(result).toEqual(mockGroups);
      expect(identityStoreMock.commandCalls(ListGroupsCommand).length).toBe(1);
      expect(
        identityStoreMock.commandCalls(ListGroupsCommand)[0]!.args[0].input,
      ).toEqual({ IdentityStoreId: test_env.IDENTITY_STORE_ID });
    });

    it("should create all the default idc groups on when there were no groups", async () => {
      identityStoreMock.on(ListGroupsCommand).resolves({
        Groups: [],
      });

      await idcHelper.createIsbGroups();

      const createGroupCalls =
        identityStoreMock.commandCalls(CreateGroupCommand);
      expect(createGroupCalls.length).toBe(
        Object.keys(defaultIsbGroupAttrs).length,
      );

      const hasMatchingCall = createGroupCalls.some((call) =>
        expect(call.args[0].input).toMatchObject({
          IdentityStoreId: test_env.IDENTITY_STORE_ID,
          DisplayName: defaultIsbGroupAttrs["User"].name,
        }),
      );
      expect(hasMatchingCall).toBeTruthy();
    });

    it("should create all the default idc groups on when the existing groups are from else where", async () => {
      identityStoreMock.on(ListGroupsCommand).resolves({
        Groups: [
          {
            GroupId: "Users",
            IdentityStoreId: test_env.IDENTITY_STORE_ID,
            DisplayName: "Non_Isb_Users",
          },
          {
            GroupId: "Admins",
            IdentityStoreId: test_env.IDENTITY_STORE_ID,
            DisplayName: "Non_Isb_Admins",
          },
        ],
      });

      await idcHelper.createIsbGroups();

      const createGroupCalls =
        identityStoreMock.commandCalls(CreateGroupCommand);
      expect(createGroupCalls.length).toBe(
        Object.keys(defaultIsbGroupAttrs).length,
      );

      const hasMatchingCall = createGroupCalls.some((call) =>
        expect(call.args[0].input).toMatchObject({
          IdentityStoreId: test_env.IDENTITY_STORE_ID,
          DisplayName: defaultIsbGroupAttrs["User"].name,
        }),
      );
      expect(hasMatchingCall).toBeTruthy();
    });

    it("should create only the missing groups", async () => {
      identityStoreMock.on(ListGroupsCommand).resolves({
        Groups: [
          {
            GroupId: "Users",
            IdentityStoreId: test_env.IDENTITY_STORE_ID,
            DisplayName: defaultIsbGroupAttrs["User"].name,
          },
          {
            GroupId: "Admins",
            IdentityStoreId: test_env.IDENTITY_STORE_ID,
            DisplayName: "Non_Isb_Admins",
          },
        ],
      });

      await idcHelper.createIsbGroups();

      const createGroupCalls =
        identityStoreMock.commandCalls(CreateGroupCommand);
      expect(createGroupCalls.length).toBe(
        Object.keys(defaultIsbGroupAttrs).length - 1,
      );

      const hasMatchingCall = createGroupCalls.some((call) =>
        expect(call.args[0].input).toMatchObject({
          IdentityStoreId: test_env.IDENTITY_STORE_ID,
          DisplayName: defaultIsbGroupAttrs["Manager"].name,
        }),
      );
      expect(hasMatchingCall).toBeTruthy();
    });

    it("should delete all the isb groups when calling deleteIdcGroups()", async () => {
      const mockGroups: Group[] = [
        {
          GroupId: "Users",
          IdentityStoreId: test_env.IDENTITY_STORE_ID,
          DisplayName: defaultIsbGroupAttrs["User"].name,
        },
        {
          GroupId: "Managers",
          IdentityStoreId: test_env.IDENTITY_STORE_ID,
          DisplayName: defaultIsbGroupAttrs["Manager"].name,
        },
        {
          GroupId: "Admins",
          IdentityStoreId: test_env.IDENTITY_STORE_ID,
          DisplayName: defaultIsbGroupAttrs["Admin"].name,
        },
        {
          GroupId: "Non_Isb_Users",
          IdentityStoreId: test_env.IDENTITY_STORE_ID,
          DisplayName: "Non_Isb_Users",
        },
      ];
      identityStoreMock.on(ListGroupsCommand).resolves({ Groups: mockGroups });

      await idcHelper.deleteIsbGroups();

      const deleteGroupCalls =
        identityStoreMock.commandCalls(DeleteGroupCommand);
      expect(deleteGroupCalls.length).toBe(
        Object.keys(defaultIsbGroupAttrs).length,
      );

      const hasMatchingCall = deleteGroupCalls.some((call) =>
        expect(call.args[0].input).toMatchObject({
          IdentityStoreId: test_env.IDENTITY_STORE_ID,
          GroupId: "Users",
        }),
      );
      expect(hasMatchingCall).toBeTruthy();
    });

    it("should delete only the isb groups that exist when calling deleteIdcGroups()", async () => {
      const mockGroups: Group[] = [
        {
          GroupId: "Users",
          IdentityStoreId: test_env.IDENTITY_STORE_ID,
          DisplayName: defaultIsbGroupAttrs["User"].name,
        },
        {
          GroupId: "Admins",
          IdentityStoreId: test_env.IDENTITY_STORE_ID,
          DisplayName: defaultIsbGroupAttrs["Manager"].name,
        },
        {
          GroupId: "Non_Isb_Users",
          IdentityStoreId: test_env.IDENTITY_STORE_ID,
          DisplayName: "Non_Isb_Users",
        },
      ];
      identityStoreMock.on(ListGroupsCommand).resolves({ Groups: mockGroups });

      await idcHelper.deleteIsbGroups();

      const deleteGroupCalls =
        identityStoreMock.commandCalls(DeleteGroupCommand);
      expect(deleteGroupCalls.length).toBe(
        Object.keys(defaultIsbGroupAttrs).length - 1,
      );

      const hasMatchingCall = deleteGroupCalls.some((call) =>
        expect(call.args[0].input).toMatchObject({
          IdentityStoreId: test_env.IDENTITY_STORE_ID,
          GroupId: "Users",
        }),
      );
      expect(hasMatchingCall).toBeTruthy();
    });

    it("should truncate group names when too long", async () => {
      const testNamespace = "a".repeat(114);
      const idcHelper = IsbServices.idcService({
        ...test_env,
        ISB_NAMESPACE: testNamespace,
      });
      const defaultIsbGroupAttrs: IsbGroupAttrs = (idcHelper as any)
        .defaultIsbGroupAttrs;
      const maxGroupNameLength: number = (idcHelper as any).maxGroupNameLength;
      const allNamesLength128 = Object.values(defaultIsbGroupAttrs).every(
        (attr) => attr.name.length <= maxGroupNameLength,
      );
      expect(allNamesLength128).toBeTruthy();
      expect(defaultIsbGroupAttrs.User.name).toEqual(
        testNamespace + "_IsbUsersGroup",
      );
      expect(defaultIsbGroupAttrs.Manager.name).toEqual(
        testNamespace + "_IsbManagersGr",
      );
      expect(defaultIsbGroupAttrs.Admin.name).toEqual(
        testNamespace + "_IsbAdminsGrou",
      );
    });
  });

  describe("SSO", () => {
    const samplePermissionSetArns: string[] = [
      "arn:aws:sso:::permissionSet/ssoins-11111111/ps-11111111",
      "arn:aws:sso:::permissionSet/ssoins-22222222/ps-22222222",
    ];
    const samplePermissionSet: PermissionSet = {
      Name: "Users",
      Description: "Test Users",
      PermissionSetArn:
        "arn:aws:sso:::permissionSet/ssoins-11111111/ps-11111111",
    };
    const defaultIsbPermissionSetAttrs: IsbPermissionSetAttrs = (
      idcHelper as any
    ).defaultIsbPermissionSetAttrs;

    it("should list permission sets when calling listPermissionSets()", async () => {
      ssoAdminClientMock
        .on(ListPermissionSetsCommand)
        .resolves({ PermissionSets: samplePermissionSetArns });
      ssoAdminClientMock
        .on(DescribePermissionSetCommand)
        .resolves({ PermissionSet: samplePermissionSet });

      const result = await (idcHelper as any).listPermissionSets();

      expect(result).toEqual([samplePermissionSet, samplePermissionSet]);
      expect(
        ssoAdminClientMock.commandCalls(ListPermissionSetsCommand).length,
      ).toBe(1);
      expect(
        ssoAdminClientMock.commandCalls(ListPermissionSetsCommand)[0]!.args[0]
          .input,
      ).toEqual({ InstanceArn: test_env.SSO_INSTANCE_ARN });

      const describePSCalls = ssoAdminClientMock.commandCalls(
        DescribePermissionSetCommand,
      );
      expect(describePSCalls.length).toBe(2);
      const hasMatchingCall = describePSCalls.some((call) =>
        expect(call.args[0].input).toMatchObject({
          InstanceArn: test_env.SSO_INSTANCE_ARN,
          PermissionSetArn: samplePermissionSetArns[0],
        }),
      );
      expect(hasMatchingCall).toBeTruthy();
    });

    it("should create all the default idc permission sets when there are no permission sets already", async () => {
      ssoAdminClientMock
        .on(ListPermissionSetsCommand)
        .resolves({ PermissionSets: [] });
      ssoAdminClientMock
        .on(CreatePermissionSetCommand)
        .resolves({ PermissionSet: samplePermissionSet });
      ssoAdminClientMock
        .on(DescribePermissionSetCommand)
        .resolves({ PermissionSet: samplePermissionSet });
      ssoAdminClientMock
        .on(AttachManagedPolicyToPermissionSetCommand)
        .resolves({});

      await idcHelper.createIsbPermissionSets();

      const createPSCalls = ssoAdminClientMock.commandCalls(
        CreatePermissionSetCommand,
      );
      expect(createPSCalls.length).toBe(
        Object.keys(defaultIsbPermissionSetAttrs).length,
      );
      const hasMatchingCall = createPSCalls.some((call) =>
        expect(call.args[0].input).toEqual({
          InstanceArn: test_env.SSO_INSTANCE_ARN,
          Name: defaultIsbPermissionSetAttrs["User"].name,
          Description: defaultIsbPermissionSetAttrs["User"].description,
        }),
      );
      expect(hasMatchingCall).toBeTruthy();

      const attachPolicyCalls = ssoAdminClientMock.commandCalls(
        AttachManagedPolicyToPermissionSetCommand,
      );
      expect(attachPolicyCalls.length).toBe(
        Object.keys(defaultIsbPermissionSetAttrs).length,
      );
      const hasMatchingCallPolicy = attachPolicyCalls.some((call) =>
        expect(call.args[0].input).toEqual({
          InstanceArn: test_env.SSO_INSTANCE_ARN,
          ManagedPolicyArn: "arn:aws:iam::aws:policy/AdministratorAccess",
          PermissionSetArn: samplePermissionSet.PermissionSetArn,
        }),
      );
      expect(hasMatchingCallPolicy).toBeTruthy();
    });

    it("should create all the default idc permission sets when there are non isb permission sets already", async () => {
      ssoAdminClientMock
        .on(ListPermissionSetsCommand)
        .resolves({ PermissionSets: samplePermissionSetArns });
      ssoAdminClientMock
        .on(CreatePermissionSetCommand)
        .resolves({ PermissionSet: samplePermissionSet });
      ssoAdminClientMock
        .on(DescribePermissionSetCommand)
        .resolves({ PermissionSet: samplePermissionSet });
      ssoAdminClientMock
        .on(AttachManagedPolicyToPermissionSetCommand)
        .resolves({});

      await idcHelper.createIsbPermissionSets();

      const createPSCalls = ssoAdminClientMock.commandCalls(
        CreatePermissionSetCommand,
      );
      expect(createPSCalls.length).toBe(
        Object.keys(defaultIsbPermissionSetAttrs).length,
      );
      const hasMatchingCall = createPSCalls.some((call) =>
        expect(call.args[0].input).toEqual({
          InstanceArn: test_env.SSO_INSTANCE_ARN,
          Name: defaultIsbPermissionSetAttrs["User"].name,
          Description: defaultIsbPermissionSetAttrs["User"].description,
        }),
      );
      expect(hasMatchingCall).toBeTruthy();

      const attachPolicyCalls = ssoAdminClientMock.commandCalls(
        AttachManagedPolicyToPermissionSetCommand,
      );
      expect(attachPolicyCalls.length).toBe(
        Object.keys(defaultIsbPermissionSetAttrs).length,
      );
      const hasMatchingCallPolicy = attachPolicyCalls.every((call) =>
        expect(call.args[0].input).toEqual({
          InstanceArn: test_env.SSO_INSTANCE_ARN,
          ManagedPolicyArn: "arn:aws:iam::aws:policy/AdministratorAccess",
          PermissionSetArn: samplePermissionSet.PermissionSetArn,
        }),
      );
      expect(hasMatchingCallPolicy).toBeTruthy();
    });

    it("should create only the missing permission sets", async () => {
      ssoAdminClientMock
        .on(ListPermissionSetsCommand)
        .resolves({ PermissionSets: samplePermissionSetArns });
      ssoAdminClientMock.on(DescribePermissionSetCommand).resolves({
        PermissionSet: {
          Name: defaultIsbPermissionSetAttrs["User"].name,
          Description: defaultIsbPermissionSetAttrs["User"].description,
          PermissionSetArn:
            "arn:aws:sso:::permissionSet/ssoins-11111111/ps-11111111",
        },
      });
      ssoAdminClientMock
        .on(CreatePermissionSetCommand)
        .resolves({ PermissionSet: samplePermissionSet });

      await idcHelper.createIsbPermissionSets();

      const createPSCalls = ssoAdminClientMock.commandCalls(
        CreatePermissionSetCommand,
      );
      expect(createPSCalls.length).toBe(
        Object.keys(defaultIsbPermissionSetAttrs).length - 1,
      );
      const hasMatchingCall = createPSCalls.some((call) =>
        expect(call.args[0].input).toEqual({
          InstanceArn: test_env.SSO_INSTANCE_ARN,
          Name: defaultIsbPermissionSetAttrs["Manager"].name,
          Description: defaultIsbPermissionSetAttrs["Manager"].description,
        }),
      );
      expect(hasMatchingCall).toBeTruthy();

      const attachPolicyCalls = ssoAdminClientMock.commandCalls(
        AttachManagedPolicyToPermissionSetCommand,
      );
      expect(attachPolicyCalls.length).toBe(
        Object.keys(defaultIsbPermissionSetAttrs).length - 1,
      );
      const hasMatchingCallPolicy = attachPolicyCalls.every((call) =>
        expect(call.args[0].input).toEqual({
          InstanceArn: test_env.SSO_INSTANCE_ARN,
          ManagedPolicyArn: "arn:aws:iam::aws:policy/AdministratorAccess",
          PermissionSetArn: samplePermissionSet.PermissionSetArn,
        }),
      );
      expect(hasMatchingCallPolicy).toBeTruthy();
    });

    it("should delete only the isb permission sets when calling deletePermissionSets()", async () => {
      ssoAdminClientMock
        .on(ListPermissionSetsCommand)
        .resolves({ PermissionSets: samplePermissionSetArns });
      ssoAdminClientMock
        .on(DescribePermissionSetCommand)
        .resolvesOnce({
          PermissionSet: {
            Name: defaultIsbPermissionSetAttrs["User"].name,
            Description: defaultIsbPermissionSetAttrs["User"].description,
            PermissionSetArn:
              "arn:aws:sso:::permissionSet/ssoins-11111111/ps-11111111",
          },
        })
        .resolves({ PermissionSet: samplePermissionSet });
      ssoAdminClientMock
        .on(CreatePermissionSetCommand)
        .resolves({ PermissionSet: samplePermissionSet });

      await idcHelper.deleteIsbPermissionSets();

      const deletePSCalls = ssoAdminClientMock.commandCalls(
        DeletePermissionSetCommand,
      );
      expect(deletePSCalls.length).toBe(1);
      const hasMatchingCall = deletePSCalls.some((call) =>
        expect(call.args[0].input).toEqual({
          InstanceArn: test_env.SSO_INSTANCE_ARN,
          PermissionSetArn: samplePermissionSetArns[0],
        }),
      );
      expect(hasMatchingCall).toBeTruthy();
    });
  });

  it("should truncate permission set names when too long", async () => {
    const testNamespace = "a".repeat(20);
    const idcHelper = IsbServices.idcService({
      ...test_env,
      ISB_NAMESPACE: testNamespace,
    });
    const defaultIsbPermissionSetAttrs: IsbPermissionSetAttrs = (
      idcHelper as any
    ).defaultIsbPermissionSetAttrs;
    const maxPermissionSetNameLength: number = (idcHelper as any)
      .maxPermissionSetNameLength;
    const allNamesLength32 = Object.values(defaultIsbPermissionSetAttrs).every(
      (attr) => attr.name.length <= maxPermissionSetNameLength,
    );
    expect(allNamesLength32).toBeTruthy();
    expect(defaultIsbPermissionSetAttrs.User.name).toEqual(
      testNamespace + "_IsbUsersPS",
    );
    expect(defaultIsbPermissionSetAttrs.Manager.name).toEqual(
      testNamespace + "_IsbManagers",
    );
    expect(defaultIsbPermissionSetAttrs.Admin.name).toEqual(
      testNamespace + "_IsbAdminsPS",
    );
  });
});
