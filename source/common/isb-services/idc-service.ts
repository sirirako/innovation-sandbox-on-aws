// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import {
  CreateGroupCommand,
  DeleteGroupCommand,
  DescribeUserCommand,
  GetUserIdCommand,
  Group,
  IdentitystoreClient,
  IdentitystorePaginationConfiguration,
  ListGroupMembershipsCommand,
  ListGroupMembershipsForMemberCommandInput,
  ListGroupsCommandInput,
  User,
  paginateListGroupMembershipsForMember,
  paginateListGroups,
} from "@aws-sdk/client-identitystore";
import {
  AttachManagedPolicyToPermissionSetCommand,
  CreateAccountAssignmentCommand,
  CreatePermissionSetCommand,
  DeleteAccountAssignmentCommand,
  DeletePermissionSetCommand,
  DescribePermissionSetCommand,
  ListAccountAssignmentsCommandInput,
  ListPermissionSetsCommandInput,
  PermissionSet,
  PrincipalType,
  SSOAdminClient,
  SSOAdminPaginationConfiguration,
  TargetType,
  paginateListAccountAssignments,
  paginateListPermissionSets,
} from "@aws-sdk/client-sso-admin";

import { PaginatedQueryResult } from "@amzn/innovation-sandbox-commons/data/common-types.js";
import {
  cacheAdmins,
  cacheManagers,
  cacheUsers,
  getCachedAdmins,
  getCachedManagers,
  getCachedUsers,
} from "@amzn/innovation-sandbox-commons/isb-services/idc-cache.js";
import {
  IsbRole,
  IsbUser,
} from "@amzn/innovation-sandbox-commons/types/isb-types.js";
import { Transaction } from "@amzn/innovation-sandbox-commons/utils/transactions.js";
import pThrottle from "p-throttle";

export type IsbGroupAttrs = Record<
  IsbRole,
  {
    name: string;
    description: string;
  }
>;

export type IsbPermissionSetAttrs = IsbGroupAttrs;

// IDC supports 20 TPS for all requests
// (https://docs.aws.amazon.com/singlesignon/latest/userguide/limits.html)
const throttle1PerSec = pThrottle({
  limit: 1,
  interval: 1000,
});

const ISB_USER_PS_NAME = "IsbUsersPS";
const ISB_MANAGER_PS_NAME = "IsbManagersPS";
const ISB_ADMIN_PS_NAME = "IsbAdminsPS";

export class IdcService {
  readonly namespace;
  readonly identityStoreClient;
  readonly ssoAdminClient;
  readonly identityStoreId;
  readonly ssoInstanceArn;
  public static defaultPageSize = 50;

  private readonly defaultIsbGroupAttrs: IsbGroupAttrs;

  private readonly defaultIsbPermissionSetAttrs: IsbPermissionSetAttrs;

  private readonly maxGroupNameLength = 128;
  private readonly maxPermissionSetNameLength = 32;

  constructor(props: {
    namespace: string;
    identityStoreId: string;
    ssoInstanceArn: string;
    identityStoreClient: IdentitystoreClient;
    ssoAdminClient: SSOAdminClient;
  }) {
    this.namespace = props.namespace;
    this.identityStoreClient = props.identityStoreClient;
    this.ssoAdminClient = props.ssoAdminClient;
    this.identityStoreId = props.identityStoreId;
    this.ssoInstanceArn = props.ssoInstanceArn;
    this.defaultIsbGroupAttrs = {
      User: {
        name: `${this.namespace}_IsbUsersGroup`.slice(
          0,
          this.maxGroupNameLength,
        ),
        description: "Innovation Sandbox Users",
      },
      Manager: {
        name: `${this.namespace}_IsbManagersGroup`.slice(
          0,
          this.maxGroupNameLength,
        ),
        description: "Innovation Sandbox Managers",
      },
      Admin: {
        name: `${this.namespace}_IsbAdminsGroup`.slice(
          0,
          this.maxGroupNameLength,
        ),
        description: "Innovation Sandbox Administrators",
      },
    };
    this.defaultIsbPermissionSetAttrs = {
      User: {
        name: `${this.namespace}_${ISB_USER_PS_NAME}`.slice(
          0,
          this.maxPermissionSetNameLength,
        ),
        description: "ISB Users Permission Set",
      },
      Manager: {
        name: `${this.namespace}_${ISB_MANAGER_PS_NAME}`.slice(
          0,
          this.maxPermissionSetNameLength,
        ),
        description: "ISB Managers Permission Set",
      },
      Admin: {
        name: `${this.namespace}_${ISB_ADMIN_PS_NAME}`.slice(
          0,
          this.maxPermissionSetNameLength,
        ),
        description: "ISB Administrators Permission Set",
      },
    };
  }

  private async listGroups(): Promise<Group[]> {
    const input: ListGroupsCommandInput = {
      IdentityStoreId: this.identityStoreId,
    };
    const paginatorConfig: IdentitystorePaginationConfiguration = {
      client: this.identityStoreClient,
    };
    const paginator = paginateListGroups(paginatorConfig, input);
    const allGroups: Group[] = [];
    for await (const page of paginator) {
      if (page.Groups) {
        allGroups.push(...page.Groups);
      }
    }
    return allGroups;
  }

  public async listIsbGroups(): Promise<Group[]> {
    const expectedGroupNames = Object.values(this.defaultIsbGroupAttrs).map(
      (group) => group.name,
    );
    return (await this.listGroups()).filter(
      (group) =>
        group.DisplayName && expectedGroupNames.includes(group.DisplayName),
    );
  }

  async createIsbGroups() {
    const existingIsbGroupNames = (await this.listIsbGroups()).map(
      (group) => group.DisplayName,
    );
    const groupsToCreate = Object.values(this.defaultIsbGroupAttrs).filter(
      (group) => !existingIsbGroupNames?.includes(group.name),
    );

    for (const group of groupsToCreate) {
      const createGroupCommand = new CreateGroupCommand({
        IdentityStoreId: this.identityStoreId,
        DisplayName: group.name,
        Description: group.description,
      });
      await this.identityStoreClient.send(createGroupCommand);
    }
  }

  async deleteIsbGroups() {
    const isbGroups = await this.listIsbGroups();
    for (const group of isbGroups) {
      const deleteGroupCommand = new DeleteGroupCommand({
        IdentityStoreId: this.identityStoreId,
        GroupId: group.GroupId,
      });
      await this.identityStoreClient.send(deleteGroupCommand);
    }
  }

  /**
   * requires
   *  "sso:ListPermissionSets",
   *  "sso:DescribePermissionSet",
   */
  private async listPermissionSets(): Promise<PermissionSet[]> {
    const input: ListPermissionSetsCommandInput = {
      InstanceArn: this.ssoInstanceArn,
    };
    const paginatorConfig: SSOAdminPaginationConfiguration = {
      client: this.ssoAdminClient,
    };
    const paginator = paginateListPermissionSets(paginatorConfig, input);
    const allPermissionSets: PermissionSet[] = [];
    const throttledDescribePS = throttle1PerSec(
      async (describePSCommand: DescribePermissionSetCommand) => {
        return this.ssoAdminClient.send(describePSCommand);
      },
    );
    for await (const page of paginator) {
      if (page.PermissionSets) {
        for (const psArn of page.PermissionSets) {
          const describePSCommand = new DescribePermissionSetCommand({
            InstanceArn: this.ssoInstanceArn,
            PermissionSetArn: psArn,
          });
          const currPermissionSet =
            await throttledDescribePS(describePSCommand);
          if (currPermissionSet.PermissionSet) {
            allPermissionSets.push(currPermissionSet.PermissionSet);
          }
        }
      }
    }
    return allPermissionSets;
  }

  async listIsbPermissionSets(): Promise<PermissionSet[]> {
    const expectedPSNames = Object.values(
      this.defaultIsbPermissionSetAttrs,
    ).map((ps) => ps.name);
    return (await this.listPermissionSets()).filter(
      (ps) => ps.Name && expectedPSNames.includes(ps.Name),
    );
  }

  /**
   * requires
   *  "sso:CreatePermissionSet",
   *  "sso:AttachManagedPolicyToPermissionSet",
   */
  async createIsbPermissionSets() {
    const existingPSNames = (await this.listIsbPermissionSets()).map(
      (ps) => ps.Name,
    );
    const psToCreate = Object.values(this.defaultIsbPermissionSetAttrs).filter(
      (ps) => !existingPSNames?.includes(ps.name),
    );
    for (const ps of psToCreate) {
      const createPSCommand = new CreatePermissionSetCommand({
        InstanceArn: this.ssoInstanceArn,
        Name: ps.name,
        Description: ps.description,
      });
      const response = await this.ssoAdminClient.send(createPSCommand);
      if (response.PermissionSet) {
        const attachPolicyCommand =
          new AttachManagedPolicyToPermissionSetCommand({
            InstanceArn: this.ssoInstanceArn,
            PermissionSetArn: response.PermissionSet.PermissionSetArn,
            ManagedPolicyArn: "arn:aws:iam::aws:policy/AdministratorAccess",
          });
        await this.ssoAdminClient.send(attachPolicyCommand);
      } else {
        throw new Error("Failed to create permission sets.");
      }
    }
  }

  /**
   * requires
   *   "sso:DeletePermissionSet",
   */
  async deleteIsbPermissionSets() {
    const isbPermissionSets = await this.listIsbPermissionSets();
    for (const ps of isbPermissionSets) {
      const deletePSCommand = new DeletePermissionSetCommand({
        InstanceArn: this.ssoInstanceArn,
        PermissionSetArn: ps.PermissionSetArn,
      });
      await this.ssoAdminClient.send(deletePSCommand);
    }
  }

  private isbUserFromIdcUser(user: User, roles?: IsbRole[]): IsbUser {
    return {
      displayName: user.DisplayName,
      userName: user.UserName,
      userId: user.UserId,
      email: user.Emails?.filter((emailTuple) => emailTuple.Primary).map(
        (emailTuple) => emailTuple.Value,
      )[0]!,
      roles: roles,
    };
  }

  /**
   * requires actions
   *  "identitystore:ListGroupMemberships",
   *  "identitystore:DescribeUser",
   */
  public async listIsbUsers(
    props: {
      pageSize?: number;
      pageIdentifier?: string;
    } = { pageSize: IdcService.defaultPageSize },
  ): Promise<PaginatedQueryResult<IsbUser>> {
    const cachedUsers = getCachedUsers(props.pageIdentifier ?? "FIRST_PAGE");
    if (cachedUsers) {
      return cachedUsers;
    }
    const userGroupId = (await this.listGroups()).filter(
      (group) => group.DisplayName === this.defaultIsbGroupAttrs["User"].name,
    )[0]!.GroupId;
    const users = await this.listGroupMembers({
      ...props,
      groupId: userGroupId!,
    });
    cacheUsers(props.pageIdentifier ?? "FIRST_PAGE", users);
    return users;
  }

  /**
   * requires actions
   *  "identitystore:ListGroupMemberships",
   *  "identitystore:DescribeUser",
   */
  public async listIsbManagers(
    props: {
      pageSize?: number;
      pageIdentifier?: string;
    } = { pageSize: IdcService.defaultPageSize },
  ): Promise<PaginatedQueryResult<IsbUser>> {
    const cachedManagers = getCachedManagers(
      props.pageIdentifier ?? "FIRST_PAGE",
    );
    if (cachedManagers) {
      return cachedManagers;
    }
    const managerGroupId = (await this.listGroups()).filter(
      (group) =>
        group.DisplayName === this.defaultIsbGroupAttrs["Manager"].name,
    )[0]!.GroupId;
    const managers = await this.listGroupMembers({
      ...props,
      groupId: managerGroupId!,
    });
    cacheManagers(props.pageIdentifier ?? "FIRST_PAGE", managers);
    return managers;
  }

  /**
   * requires actions
   *  "identitystore:ListGroupMemberships",
   *  "identitystore:DescribeUser",
   */
  public async listIsbAdmins(
    props: {
      pageSize?: number;
      pageIdentifier?: string;
    } = { pageSize: IdcService.defaultPageSize },
  ): Promise<PaginatedQueryResult<IsbUser>> {
    const cachedAdmins = getCachedAdmins(props.pageIdentifier ?? "FIRST_PAGE");
    if (cachedAdmins) {
      return cachedAdmins;
    }
    const adminGroupId = (await this.listGroups()).filter(
      (group) => group.DisplayName === this.defaultIsbGroupAttrs["Admin"].name,
    )[0]!.GroupId;
    const admins = await this.listGroupMembers({
      ...props,
      groupId: adminGroupId!,
    });
    cacheAdmins(props.pageIdentifier ?? "FIRST_PAGE", admins);
    return admins;
  }

  async listGroupMembers(props: {
    groupId: string;
    pageSize?: number;
    pageIdentifier?: string;
  }): Promise<PaginatedQueryResult<IsbUser>> {
    const command = new ListGroupMembershipsCommand({
      GroupId: props.groupId,
      IdentityStoreId: this.identityStoreId,
      MaxResults: props.pageSize,
      NextToken: props.pageIdentifier,
    });
    const response = await this.identityStoreClient.send(command);
    const users: IsbUser[] = [];
    const throttledDescribeUser = throttle1PerSec(
      async (descUserCommand: DescribeUserCommand) => {
        const user = await this.identityStoreClient.send(descUserCommand);
        return this.isbUserFromIdcUser(user);
      },
    );
    if (response.GroupMemberships) {
      for (const membership of response.GroupMemberships) {
        const descUserCommand = new DescribeUserCommand({
          IdentityStoreId: this.identityStoreId,
          UserId: membership.MemberId?.UserId,
        });
        const user = await throttledDescribeUser(descUserCommand);
        users.push(user);
      }
    }
    return {
      result: users,
      nextPageIdentifier: response.NextToken ?? null,
    };
  }

  /**
   * requires actions
   *  "identitystore:GetUserId",
   *  "identitystore:DescribeUser",
   *  "identitystore:ListGroupMembershipsForMember"
   */
  public async getUserFromEmail(email: string): Promise<IsbUser | undefined> {
    return this.getUserFromUniqueAttr("emails.value", email);
  }

  /**
   * requires actions
   *  "identitystore:GetUserId",
   *  "identitystore:DescribeUser",
   *  "identitystore:ListGroups",
   *  "identitystore:ListGroupMembershipsForMember"
   */
  public async getUserFromUsername(
    userName: string,
  ): Promise<IsbUser | undefined> {
    return this.getUserFromUniqueAttr("userName", userName);
  }

  private async getUserFromUniqueAttr(
    attr: "emails.value" | "userName",
    value: string,
  ): Promise<IsbUser | undefined> {
    const command = new GetUserIdCommand({
      IdentityStoreId: this.identityStoreId,
      AlternateIdentifier: {
        UniqueAttribute: {
          AttributePath: attr,
          AttributeValue: value,
        },
      },
    });
    const { UserId: userId } = await this.identityStoreClient.send(command);
    const descUserCommand = new DescribeUserCommand({
      IdentityStoreId: this.identityStoreId,
      UserId: userId,
    });
    const user = await this.identityStoreClient.send(descUserCommand);
    const isbGroups = await this.listIsbGroups();
    const input: ListGroupMembershipsForMemberCommandInput = {
      IdentityStoreId: this.identityStoreId,
      MemberId: {
        UserId: userId!,
      },
    };
    const paginatorConfig: IdentitystorePaginationConfiguration = {
      client: this.identityStoreClient,
    };
    const paginator = paginateListGroupMembershipsForMember(
      paginatorConfig,
      input,
    );
    const roles: IsbRole[] = [];
    const groupToRoleMap: Record<string, IsbRole> = {
      [this.defaultIsbGroupAttrs["User"].name]: "User",
      [this.defaultIsbGroupAttrs["Manager"].name]: "Manager",
      [this.defaultIsbGroupAttrs["Admin"].name]: "Admin",
    };
    for await (const page of paginator) {
      if (page.GroupMemberships) {
        for (const groupMembership of page.GroupMemberships) {
          const currGroups = isbGroups.filter(
            (group) => groupMembership.GroupId === group.GroupId,
          );
          roles.push(
            ...currGroups.map((group) => groupToRoleMap[group.DisplayName!]!),
          );
        }
      }
    }
    if (roles.length === 0) {
      // the user isn't an ISB user
      return undefined;
    }
    return this.isbUserFromIdcUser(user, roles);
  }

  /**
   * requires actions
   *  "sso:CreateAccountAssignment",
   *  "sso:ListPermissionSets",
   *  "sso:DescribePermissionSet
   */
  private async grantUserAccess(accountId: string, isbUser: IsbUser) {
    const userPS = (await this.listIsbPermissionSets()).find((ps) =>
      ps.Name?.includes(ISB_USER_PS_NAME),
    )!;
    const command = new CreateAccountAssignmentCommand({
      InstanceArn: this.ssoInstanceArn,
      PermissionSetArn: userPS.PermissionSetArn,
      PrincipalId: isbUser.userId,
      PrincipalType: "USER",
      TargetId: accountId,
      TargetType: TargetType.AWS_ACCOUNT,
    });
    await this.ssoAdminClient.send(command);
  }

  public transactionalGrantUserAccess(accountId: string, isbUser: IsbUser) {
    return new Transaction({
      beginTransaction: () => this.grantUserAccess(accountId, isbUser),
      rollbackTransaction: () => this.revokeUserAccess(accountId, isbUser),
    });
  }

  /**
   * requires actions
   *  "sso:DeleteAccountAssignment",
   *  "sso:ListPermissionSets",
   *  "sso:DescribePermissionSet
   */
  public async revokeUserAccess(accountId: string, isbUser: IsbUser) {
    const userPS = (await this.listIsbPermissionSets()).find((ps) =>
      ps.Name?.includes(ISB_USER_PS_NAME),
    )!;
    const command = new DeleteAccountAssignmentCommand({
      InstanceArn: this.ssoInstanceArn,
      PermissionSetArn: userPS.PermissionSetArn,
      PrincipalId: isbUser.userId,
      PrincipalType: "USER",
      TargetId: accountId,
      TargetType: TargetType.AWS_ACCOUNT,
    });
    await this.ssoAdminClient.send(command);
  }

  /**
   * removes access to all users which have the user Permission Set
   * requires actions
   *  sso:ListPermissionSets,
   *  sso:DescribePermissionSet,
   *  sso:ListAccountAssignments,
   *  sso:DeleteAccountAssignment,
   */
  public async revokeAllUserAccess(accountId: string) {
    const userPS = (await this.listIsbPermissionSets()).find((ps) =>
      ps.Name?.includes(ISB_USER_PS_NAME),
    )!;
    const input: ListAccountAssignmentsCommandInput = {
      InstanceArn: this.ssoInstanceArn,
      AccountId: accountId,
      PermissionSetArn: userPS.PermissionSetArn,
    };
    const paginatorConfig: SSOAdminPaginationConfiguration = {
      client: this.ssoAdminClient,
    };
    const paginator = paginateListAccountAssignments(paginatorConfig, input);
    const throttledDeleteAccountAssignment = throttle1PerSec(
      async (command: DeleteAccountAssignmentCommand) => {
        await this.ssoAdminClient.send(command);
      },
    );
    for await (const page of paginator) {
      if (page.AccountAssignments) {
        for (const accountAssignment of page.AccountAssignments) {
          if (accountAssignment.PrincipalType !== PrincipalType.USER) {
            continue;
          }
          const command = new DeleteAccountAssignmentCommand({
            InstanceArn: this.ssoInstanceArn,
            PermissionSetArn: userPS.PermissionSetArn,
            PrincipalId: accountAssignment.PrincipalId,
            PrincipalType: accountAssignment.PrincipalType,
            TargetId: accountId,
            TargetType: TargetType.AWS_ACCOUNT,
          });
          await throttledDeleteAccountAssignment(command);
        }
      }
    }
  }

  private async getCorrespondingPSAndGroup(
    role: Omit<string, "User">,
  ): Promise<{
    permissionSet: PermissionSet;
    isbGroup: Group;
  }> {
    const isbPermissionSets = await this.listIsbPermissionSets();
    const permissionSet = isbPermissionSets.find(
      (ps) =>
        ps.Name === this.defaultIsbPermissionSetAttrs[role as IsbRole].name,
    )!;
    const isbGroups = await this.listIsbGroups();
    const isbGroup = isbGroups.find(
      (group) =>
        group.DisplayName === this.defaultIsbGroupAttrs[role as IsbRole].name,
    )!;
    return { permissionSet, isbGroup };
  }

  /**
   * requires actions
   *  "sso:CreateAccountAssignment",
   *  "sso:ListPermissionSets",
   *  "sso:DescribePermissionSet
   */
  public async assignGroupAccess(
    accountId: string,
    role: Omit<IsbRole, "User">,
  ) {
    const { permissionSet, isbGroup } =
      await this.getCorrespondingPSAndGroup(role);
    const command = new CreateAccountAssignmentCommand({
      InstanceArn: this.ssoInstanceArn,
      PermissionSetArn: permissionSet.PermissionSetArn,
      PrincipalId: isbGroup.GroupId,
      PrincipalType: "GROUP",
      TargetId: accountId,
      TargetType: TargetType.AWS_ACCOUNT,
    });
    await this.ssoAdminClient.send(command);
  }

  /**
   * requires actions
   *  "sso:DeleteAccountAssignment",
   *  "sso:ListPermissionSets",
   *  "sso:DescribePermissionSet
   */
  public async revokeGroupAccess(
    accountId: string,
    role: Omit<IsbRole, "User">,
  ) {
    const { permissionSet, isbGroup } =
      await this.getCorrespondingPSAndGroup(role);
    const command = new DeleteAccountAssignmentCommand({
      InstanceArn: this.ssoInstanceArn,
      PermissionSetArn: permissionSet.PermissionSetArn,
      PrincipalId: isbGroup.GroupId,
      PrincipalType: "GROUP",
      TargetId: accountId,
      TargetType: TargetType.AWS_ACCOUNT,
    });
    await this.ssoAdminClient.send(command);
  }

  public transactionalAssignGroupAccess(
    accountId: string,
    role: Omit<IsbRole, "User">,
  ) {
    return new Transaction({
      beginTransaction: () => this.assignGroupAccess(accountId, role),
      rollbackTransaction: () => this.revokeGroupAccess(accountId, role),
    });
  }

  public transactionalRevokeGroupAccess(
    accountId: string,
    role: Omit<IsbRole, "User">,
  ) {
    return new Transaction({
      beginTransaction: () => this.revokeGroupAccess(accountId, role),
      rollbackTransaction: () => this.assignGroupAccess(accountId, role),
    });
  }
}
