// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { v4 as uuidv4 } from "uuid";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { UnknownItem } from "@amzn/innovation-sandbox-commons/data/errors.js";
import { GlobalConfigSchema } from "@amzn/innovation-sandbox-commons/data/global-config/global-config.js";
import { DynamoLeaseTemplateStore } from "@amzn/innovation-sandbox-commons/data/lease-template/dynamo-lease-template-store.js";
import {
  LeaseTemplate,
  LeaseTemplateSchema,
} from "@amzn/innovation-sandbox-commons/data/lease-template/lease-template.js";
import { LeaseTemplateLambdaEnvironmentSchema } from "@amzn/innovation-sandbox-commons/lambda/environments/lease-template-lambda-environment.js";
import { generateSchemaData } from "@amzn/innovation-sandbox-commons/test/generate-schema-data.js";
import {
  createAPIGatewayProxyEvent,
  createErrorResponseBody,
  createFailureResponseBody,
  isbAuthorizedUser,
  mockAuthorizedContext,
  responseHeaders,
} from "@amzn/innovation-sandbox-commons/test/lambdas/fixtures.js";
import {
  bulkStubEnv,
  mockAppConfigMiddleware,
} from "@amzn/innovation-sandbox-commons/test/lambdas/utils.js";

const mockUuid = "00000000-0000-0000-0000-000000000000";
vi.mock("uuid", () => ({
  v4: vi.fn(() => mockUuid),
}));

const testEnv = generateSchemaData(LeaseTemplateLambdaEnvironmentSchema);
const mockedGlobalConfig = {
  ...generateSchemaData(GlobalConfigSchema),
  leases: {
    ...generateSchemaData(GlobalConfigSchema).leases,
    maxBudget: 100,
    maxDurationHours: 100,
  },
};

let handler: typeof import("@amzn/innovation-sandbox-lease-templates/lease-templates-handler.js").handler;

beforeAll(async () => {
  bulkStubEnv(testEnv);

  handler = (
    await import(
      "@amzn/innovation-sandbox-lease-templates/lease-templates-handler.js"
    )
  ).handler;
});

beforeEach(() => {
  bulkStubEnv(testEnv);
  mockAppConfigMiddleware(mockedGlobalConfig);
});

afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});

describe("handler", async () => {
  it("should return 500 response when environment variables are misconfigured", async () => {
    vi.unstubAllEnvs();

    const event = createAPIGatewayProxyEvent({
      httpMethod: "GET",
      path: "/leasesTemplates",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${isbAuthorizedUser.token}`,
      },
    });
    expect(
      await handler(event, mockAuthorizedContext(testEnv, mockedGlobalConfig)),
    ).toEqual({
      statusCode: 500,
      body: createErrorResponseBody("An unexpected error occurred."),
      headers: responseHeaders,
    });
  });

  describe("GET /leaseTemplates", () => {
    it("should return 200 response with all lease templates", async () => {
      const leaseTemplates: LeaseTemplate[] = [
        generateSchemaData(LeaseTemplateSchema),
        generateSchemaData(LeaseTemplateSchema),
      ];

      vi.spyOn(DynamoLeaseTemplateStore.prototype, "findAll").mockResolvedValue(
        {
          result: leaseTemplates,
          nextPageIdentifier: null,
        },
      );

      const event = createAPIGatewayProxyEvent({
        httpMethod: "GET",
        path: "/leaseTemplates",
        headers: {
          Authorization: `Bearer ${isbAuthorizedUser.token}`,
        },
      });

      expect(
        await handler(
          event,
          mockAuthorizedContext(testEnv, mockedGlobalConfig),
        ),
      ).toEqual({
        statusCode: 200,
        body: JSON.stringify({
          status: "success",
          data: {
            result: leaseTemplates,
            nextPageIdentifier: null,
          },
        }),
        headers: responseHeaders,
      });
    });
    it("should return 200 response with all lease templates even when error is set", async () => {
      const leaseTemplates: LeaseTemplate[] = [
        generateSchemaData(LeaseTemplateSchema),
        generateSchemaData(LeaseTemplateSchema),
      ];

      vi.spyOn(DynamoLeaseTemplateStore.prototype, "findAll").mockResolvedValue(
        {
          result: leaseTemplates,
          nextPageIdentifier: null,
          error: "Some validation error",
        },
      );

      const event = createAPIGatewayProxyEvent({
        httpMethod: "GET",
        path: "/leaseTemplates",
        headers: {
          Authorization: `Bearer ${isbAuthorizedUser.token}`,
        },
      });

      expect(
        await handler(
          event,
          mockAuthorizedContext(testEnv, mockedGlobalConfig),
        ),
      ).toEqual({
        statusCode: 200,
        body: JSON.stringify({
          status: "success",
          data: {
            result: leaseTemplates,
            nextPageIdentifier: null,
            error: "Some validation error",
          },
        }),
        headers: responseHeaders,
      });
    });

    it("should return 200 with first page of lease template when pagination query parameters are passed in", async () => {
      const leaseTemplates: LeaseTemplate[] = [
        generateSchemaData(LeaseTemplateSchema),
        generateSchemaData(LeaseTemplateSchema),
      ];

      const findAllMethod = vi
        .spyOn(DynamoLeaseTemplateStore.prototype, "findAll")
        .mockReturnValue(
          Promise.resolve({
            result: leaseTemplates,
            nextPageIdentifier: null,
          }),
        );

      const pageIdentifier = "eyAidGVzdCI6ICJ0ZXN0IiB9";
      const pageSize = "2";

      const event = createAPIGatewayProxyEvent({
        httpMethod: "GET",
        path: "/leaseTemplates",
        queryStringParameters: {
          pageIdentifier,
          pageSize,
        },
        headers: {
          Authorization: `Bearer ${isbAuthorizedUser.token}`,
        },
      });

      expect(
        await handler(
          event,
          mockAuthorizedContext(testEnv, mockedGlobalConfig),
        ),
      ).toEqual({
        statusCode: 200,
        body: JSON.stringify({
          status: "success",
          data: {
            result: leaseTemplates,
            nextPageIdentifier: null,
          },
        }),
        headers: responseHeaders,
      });
      expect(findAllMethod.mock.calls).toHaveLength(1);
      expect(findAllMethod.mock.calls[0]).toEqual([
        {
          pageIdentifier: pageIdentifier,
          pageSize: Number(pageSize),
        },
      ]);
    });
    it("should return 400 when invalid pagination query parameters are passed in", async () => {
      const leaseTemplates: LeaseTemplate[] = [
        generateSchemaData(LeaseTemplateSchema),
        generateSchemaData(LeaseTemplateSchema),
      ];

      const findAllMethod = vi
        .spyOn(DynamoLeaseTemplateStore.prototype, "findAll")
        .mockReturnValue(
          Promise.resolve({
            result: leaseTemplates,
            nextPageIdentifier: null,
          }),
        );

      const pageIdentifier = "eyAidGVzdCI6ICJ0ZXN0IiB9";
      const pageSize = "NaN";

      const event = createAPIGatewayProxyEvent({
        httpMethod: "GET",
        path: "/leaseTemplates",
        queryStringParameters: {
          pageIdentifier,
          pageSize,
        },
        headers: {
          Authorization: `Bearer ${isbAuthorizedUser.token}`,
        },
      });

      expect(
        await handler(
          event,
          mockAuthorizedContext(testEnv, mockedGlobalConfig),
        ),
      ).toEqual({
        statusCode: 400,
        body: createFailureResponseBody({
          field: "pageSize",
          message: "Expected number, received nan",
        }),
        headers: responseHeaders,
      });
      expect(findAllMethod.mock.calls).toHaveLength(0);
    });
    it("should return 500 response when db call throws unexpected error", async () => {
      vi.spyOn(
        DynamoLeaseTemplateStore.prototype,
        "findAll",
      ).mockImplementation(() => {
        throw new Error();
      });

      const event = createAPIGatewayProxyEvent({
        httpMethod: "GET",
        path: "/leaseTemplates",
        headers: {
          Authorization: `Bearer ${isbAuthorizedUser.token}`,
        },
      });

      expect(
        await handler(
          event,
          mockAuthorizedContext(testEnv, mockedGlobalConfig),
        ),
      ).toEqual({
        statusCode: 500,
        body: createErrorResponseBody("An unexpected error occurred."),
        headers: responseHeaders,
      });
    });
  });

  describe("POST /leaseTemplates", () => {
    it("should return 201 response when leaseTemplate is created successfully", async () => {
      const leaseTemplate = generateSchemaData(
        LeaseTemplateSchema.omit({ uuid: true, createdBy: true }),
        { maxSpend: 50, leaseDurationInHours: 24 },
      );
      const event = createAPIGatewayProxyEvent({
        httpMethod: "POST",
        path: "/leaseTemplates",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${isbAuthorizedUser.token}`,
        },
        body: JSON.stringify(leaseTemplate),
      });

      const uuid = uuidv4();

      vi.spyOn(DynamoLeaseTemplateStore.prototype, "create").mockResolvedValue({
        ...leaseTemplate,
        uuid,
        createdBy: isbAuthorizedUser.user.email,
      });

      expect(
        await handler(
          event,
          mockAuthorizedContext(testEnv, mockedGlobalConfig),
        ),
      ).toEqual({
        statusCode: 201,
        body: JSON.stringify({
          status: "success",
          data: {
            ...leaseTemplate,
            uuid,
            createdBy: isbAuthorizedUser.user.email,
          },
        }),
        headers: responseHeaders,
      });
    });
    it("should return 400 response when body is missing", async () => {
      const event = createAPIGatewayProxyEvent({
        httpMethod: "POST",
        path: "/leaseTemplates",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${isbAuthorizedUser.token}`,
        },
      });

      expect(
        await handler(
          event,
          mockAuthorizedContext(testEnv, mockedGlobalConfig),
        ),
      ).toEqual({
        statusCode: 415,
        body: createFailureResponseBody({ message: "Body not provided." }),
        headers: responseHeaders,
      });
    });
    it("should return 400 response when body fails to parse", async () => {
      const event = createAPIGatewayProxyEvent({
        httpMethod: "POST",
        path: "/leaseTemplates",
        body: "not-a-json",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${isbAuthorizedUser.token}`,
        },
      });

      expect(
        await handler(
          event,
          mockAuthorizedContext(testEnv, mockedGlobalConfig),
        ),
      ).toEqual({
        statusCode: 415,
        body: createFailureResponseBody({
          message: "Invalid or malformed JSON was provided.",
        }),
        headers: responseHeaders,
      });
    });
    it("should return 400 response when body is malformed", async () => {
      const leaseTemplate = generateSchemaData(LeaseTemplateSchema, {
        uuid: undefined,
        name: undefined,
        maxSpend: 50,
        leaseDurationInHours: 24,
      });

      const event = createAPIGatewayProxyEvent({
        httpMethod: "POST",
        path: "/leaseTemplates",
        body: JSON.stringify(leaseTemplate),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${isbAuthorizedUser.token}`,
        },
      });

      vi.spyOn(DynamoLeaseTemplateStore.prototype, "create").mockResolvedValue({
        ...leaseTemplate,
        uuid: mockUuid,
      });

      expect(
        await handler(
          event,
          mockAuthorizedContext(testEnv, mockedGlobalConfig),
        ),
      ).toEqual({
        statusCode: 400,
        body: createFailureResponseBody(
          { field: "name", message: "Required" },
          {
            field: "input",
            message: "Unrecognized key(s) in object: 'createdBy'",
          },
        ),
        headers: responseHeaders,
      });
    });

    it.each([
      {
        maxSpend: 200, // exceeded max
        leaseDurationInHours: 50,
        expectedErrorMessage: createFailureResponseBody({
          message: `Max budget cannot be greater than the global max budget (${mockedGlobalConfig.leases.maxBudget}).`,
        }),
      },
      {
        maxSpend: 50,
        leaseDurationInHours: 200, // exceeded max
        expectedErrorMessage: createFailureResponseBody({
          message: `Duration cannot be greater than the global max duration (${mockedGlobalConfig.leases.maxDurationHours}).`,
        }),
      },
    ])(
      `should return 400 when lease template values exceed global configuration: $expectedErrorMessage`,
      async ({ maxSpend, leaseDurationInHours, expectedErrorMessage }) => {
        const leaseTemplate = generateSchemaData(
          LeaseTemplateSchema.omit({ uuid: true, createdBy: true }),
          {
            maxSpend,
            leaseDurationInHours,
          },
        );

        const event = createAPIGatewayProxyEvent({
          httpMethod: "POST",
          path: "/leaseTemplates",
          body: JSON.stringify(leaseTemplate),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${isbAuthorizedUser.token}`,
          },
        });

        expect(
          await handler(
            event,
            mockAuthorizedContext(testEnv, mockedGlobalConfig),
          ),
        ).toEqual({
          statusCode: 400,
          body: expectedErrorMessage,
          headers: responseHeaders,
        });
      },
    );

    it.each([
      {
        maxSpend: 200,
        leaseDurationInHours: undefined,
        expectedErrorMessage: createFailureResponseBody({
          message: `A duration must be provided as required by administrator settings. Please contact your administrator if you need to create a lease without specifying a duration.`,
        }),
      },
      {
        maxSpend: undefined,
        leaseDurationInHours: 200, // exceeded max
        expectedErrorMessage: createFailureResponseBody({
          message: `A max budget must be provided as required by administrator settings. Please contact your administrator if you need to create a lease without specifying a max budget.`,
        }),
      },
    ])(
      `should return 400 when unlimited budget/spend is provided when not enabled in AppConfig`,
      async ({ maxSpend, leaseDurationInHours, expectedErrorMessage }) => {
        const mockedGlobalConfig = {
          ...generateSchemaData(GlobalConfigSchema),
          leases: {
            ...generateSchemaData(GlobalConfigSchema).leases,
            maxSpend: 500,
            maxDurationHours: 500,
            requireMaxBudget: true,
            requireMaxDuration: true,
          },
        };

        mockAppConfigMiddleware(mockedGlobalConfig);

        const leaseTemplate = generateSchemaData(
          LeaseTemplateSchema.omit({ uuid: true, createdBy: true }),
          {
            maxSpend,
            leaseDurationInHours,
          },
        );

        const event = createAPIGatewayProxyEvent({
          httpMethod: "POST",
          path: "/leaseTemplates",
          body: JSON.stringify(leaseTemplate),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${isbAuthorizedUser.token}`,
          },
        });

        expect(
          await handler(
            event,
            mockAuthorizedContext(testEnv, mockedGlobalConfig),
          ),
        ).toEqual({
          statusCode: 400,
          body: expectedErrorMessage,
          headers: responseHeaders,
        });
      },
    );

    it("should return 500 response when db call throws unexpected error", async () => {
      const leaseTemplate = generateSchemaData(
        LeaseTemplateSchema.omit({ uuid: true, createdBy: true }),
        { maxSpend: 50, leaseDurationInHours: 24 },
      );

      const event = createAPIGatewayProxyEvent({
        httpMethod: "POST",
        path: "/leaseTemplates",
        body: JSON.stringify(leaseTemplate),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${isbAuthorizedUser.token}`,
        },
      });

      vi.spyOn(DynamoLeaseTemplateStore.prototype, "update").mockImplementation(
        () => {
          throw new Error();
        },
      );

      expect(
        await handler(
          event,
          mockAuthorizedContext(testEnv, mockedGlobalConfig),
        ),
      ).toEqual({
        statusCode: 500,
        body: createErrorResponseBody("An unexpected error occurred."),
        headers: responseHeaders,
      });
    });
  });

  describe("GET /leaseTemplates/{leaseTemplateId}", () => {
    it("should return 200 response with a single lease template", async () => {
      const event = createAPIGatewayProxyEvent({
        httpMethod: "GET",
        path: "/leaseTemplates/{leaseTemplateId}",
        pathParameters: {
          leaseTemplateId: mockUuid,
        },
        headers: {
          Authorization: `Bearer ${isbAuthorizedUser.token}`,
        },
      });

      const leaseTemplate = generateSchemaData(LeaseTemplateSchema);

      vi.spyOn(DynamoLeaseTemplateStore.prototype, "get").mockReturnValue(
        Promise.resolve({
          result: leaseTemplate,
        }),
      );

      expect(
        await handler(
          event,
          mockAuthorizedContext(testEnv, mockedGlobalConfig),
        ),
      ).toEqual({
        statusCode: 200,
        body: JSON.stringify({
          status: "success",
          data: leaseTemplate,
        }),
        headers: responseHeaders,
      });
    });
    it("should return 404 response when lease template is not found", async () => {
      const event = createAPIGatewayProxyEvent({
        httpMethod: "GET",
        path: "/leaseTemplates/{leaseTemplateId}",
        pathParameters: {
          leaseTemplateId: mockUuid,
        },
        headers: {
          Authorization: `Bearer ${isbAuthorizedUser.token}`,
        },
      });

      vi.spyOn(DynamoLeaseTemplateStore.prototype, "get").mockReturnValue(
        Promise.resolve({
          result: undefined,
        }),
      );

      expect(
        await handler(
          event,
          mockAuthorizedContext(testEnv, mockedGlobalConfig),
        ),
      ).toEqual({
        statusCode: 404,
        body: createFailureResponseBody({
          message: `Lease template not found.`,
        }),
        headers: responseHeaders,
      });
    });
    it("should return 500 response when db call throws unexpected error", async () => {
      vi.spyOn(DynamoLeaseTemplateStore.prototype, "get").mockImplementation(
        () => {
          throw new Error();
        },
      );

      const event = createAPIGatewayProxyEvent({
        httpMethod: "GET",
        path: "/leaseTemplates/{leaseTemplateId}",
        headers: {
          Authorization: `Bearer ${isbAuthorizedUser.token}`,
        },
      });

      expect(
        await handler(
          event,
          mockAuthorizedContext(testEnv, mockedGlobalConfig),
        ),
      ).toEqual({
        statusCode: 500,
        body: createErrorResponseBody("An unexpected error occurred."),
        headers: responseHeaders,
      });
    });
  });

  describe("PUT /leaseTemplates/{leaseTemplateId}", () => {
    it("should return 200 response with updated data", async () => {
      const oldLeaseTemplate = generateSchemaData(LeaseTemplateSchema);
      const newLeaseTemplateJsonBody = generateSchemaData(
        LeaseTemplateSchema.omit({ uuid: true }),
        {
          maxSpend: 50,
          leaseDurationInHours: 24,
        },
      );
      const event = createAPIGatewayProxyEvent({
        httpMethod: "PUT",
        path: "/leaseTemplates/{leaseTemplateId}",
        pathParameters: {
          leaseTemplateId: mockUuid,
        },
        body: JSON.stringify(newLeaseTemplateJsonBody),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${isbAuthorizedUser.token}`,
        },
      });

      vi.spyOn(DynamoLeaseTemplateStore.prototype, "update").mockReturnValue(
        Promise.resolve({
          newItem: { ...newLeaseTemplateJsonBody, uuid: oldLeaseTemplate.uuid },
          oldItem: oldLeaseTemplate,
        }),
      );

      expect(
        await handler(
          event,
          mockAuthorizedContext(testEnv, mockedGlobalConfig),
        ),
      ).toEqual({
        statusCode: 200,
        body: JSON.stringify({
          status: "success",
          data: { ...newLeaseTemplateJsonBody, uuid: oldLeaseTemplate.uuid },
        }),
        headers: responseHeaders,
      });
    });
    it("should return 400 response when body is missing", async () => {
      const event = createAPIGatewayProxyEvent({
        httpMethod: "PUT",
        path: "/leaseTemplates/{leaseTemplateId}",
        pathParameters: {
          leaseTemplateId: mockUuid,
        },
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${isbAuthorizedUser.token}`,
        },
      });

      vi.spyOn(DynamoLeaseTemplateStore.prototype, "update").mockReturnValue(
        Promise.resolve({
          newItem: generateSchemaData(LeaseTemplateSchema),
          oldItem: generateSchemaData(LeaseTemplateSchema),
        }),
      );

      expect(
        await handler(
          event,
          mockAuthorizedContext(testEnv, mockedGlobalConfig),
        ),
      ).toEqual({
        statusCode: 415,
        body: createFailureResponseBody({ message: "Body not provided." }),
        headers: responseHeaders,
      });
    });
    it("should return 415 response when body fails to parse", async () => {
      const event = createAPIGatewayProxyEvent({
        httpMethod: "PUT",
        path: "/leaseTemplates/{leaseTemplateId}",
        pathParameters: {
          leaseTemplateId: mockUuid,
        },
        body: "not-a-json",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${isbAuthorizedUser.token}`,
        },
      });

      vi.spyOn(DynamoLeaseTemplateStore.prototype, "update").mockReturnValue(
        Promise.resolve({
          newItem: generateSchemaData(LeaseTemplateSchema),
          oldItem: generateSchemaData(LeaseTemplateSchema),
        }),
      );

      expect(
        await handler(
          event,
          mockAuthorizedContext(testEnv, mockedGlobalConfig),
        ),
      ).toEqual({
        statusCode: 415,
        body: createFailureResponseBody({
          message: "Invalid or malformed JSON was provided.",
        }),
        headers: responseHeaders,
      });
    });
    it("should return 400 response when body is malformed", async () => {
      const leaseTemplate = generateSchemaData(LeaseTemplateSchema, {
        maxSpend: 50,
        leaseDurationInHours: 24,
      });
      const event = createAPIGatewayProxyEvent({
        httpMethod: "PUT",
        path: "/leaseTemplates/{leaseTemplateId}",
        pathParameters: {
          leaseTemplateId: leaseTemplate.uuid,
        },
        body: JSON.stringify(leaseTemplate),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${isbAuthorizedUser.token}`,
        },
      });

      vi.spyOn(DynamoLeaseTemplateStore.prototype, "update").mockReturnValue(
        Promise.resolve({
          newItem: generateSchemaData(LeaseTemplateSchema),
          oldItem: generateSchemaData(LeaseTemplateSchema),
        }),
      );

      expect(
        await handler(
          event,
          mockAuthorizedContext(testEnv, mockedGlobalConfig),
        ),
      ).toEqual({
        statusCode: 400,
        body: createFailureResponseBody({
          field: "input",
          message: "Unrecognized key(s) in object: 'uuid'",
        }),
        headers: responseHeaders,
      });
    });
    it.each([
      {
        maxSpend: 200, // exceeded max
        leaseDurationInHours: 50,
        expectedErrorMessage: createFailureResponseBody({
          message: `Max budget cannot be greater than the global max budget (${mockedGlobalConfig.leases.maxBudget}).`,
        }),
      },
      {
        maxSpend: 50,
        leaseDurationInHours: 200, // exceeded max
        expectedErrorMessage: createFailureResponseBody({
          message: `Duration cannot be greater than the global max duration (${mockedGlobalConfig.leases.maxDurationHours}).`,
        }),
      },
    ])(
      `should return 400 when lease template values exceed global configuration: $expectedErrorMessage`,
      async ({ maxSpend, leaseDurationInHours, expectedErrorMessage }) => {
        const leaseTemplate = generateSchemaData(
          LeaseTemplateSchema.omit({ uuid: true }),
          {
            maxSpend,
            leaseDurationInHours,
          },
        );

        const event = createAPIGatewayProxyEvent({
          httpMethod: "PUT",
          path: "/leaseTemplates/{leaseTemplateId}",
          pathParameters: {
            leaseTemplateId: mockUuid,
          },
          body: JSON.stringify(leaseTemplate),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${isbAuthorizedUser.token}`,
          },
        });

        expect(
          await handler(
            event,
            mockAuthorizedContext(testEnv, mockedGlobalConfig),
          ),
        ).toEqual({
          statusCode: 400,
          body: expectedErrorMessage,
          headers: responseHeaders,
        });
      },
    );

    it.each([
      {
        maxSpend: 200,
        leaseDurationInHours: undefined,
        expectedErrorMessage: createFailureResponseBody({
          message: `A duration must be provided as required by administrator settings. Please contact your administrator if you need to create a lease without specifying a duration.`,
        }),
      },
      {
        maxSpend: undefined,
        leaseDurationInHours: 200, // exceeded max
        expectedErrorMessage: createFailureResponseBody({
          message: `A max budget must be provided as required by administrator settings. Please contact your administrator if you need to create a lease without specifying a max budget.`,
        }),
      },
    ])(
      `should return 400 when unlimited budget/spend is provided when not enabled in AppConfig`,
      async ({ maxSpend, leaseDurationInHours, expectedErrorMessage }) => {
        const mockedGlobalConfig = {
          ...generateSchemaData(GlobalConfigSchema),
          leases: {
            ...generateSchemaData(GlobalConfigSchema).leases,
            maxSpend: 500,
            maxDurationHours: 500,
            requireMaxBudget: true,
            requireMaxDuration: true,
          },
        };

        mockAppConfigMiddleware(mockedGlobalConfig);

        const leaseTemplate = generateSchemaData(
          LeaseTemplateSchema.omit({ uuid: true }),
          {
            maxSpend,
            leaseDurationInHours,
          },
        );

        const event = createAPIGatewayProxyEvent({
          httpMethod: "PUT",
          path: "/leaseTemplates/{leaseTemplateId}",
          pathParameters: {
            leaseTemplateId: mockUuid,
          },
          body: JSON.stringify(leaseTemplate),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${isbAuthorizedUser.token}`,
          },
        });

        expect(
          await handler(
            event,
            mockAuthorizedContext(testEnv, mockedGlobalConfig),
          ),
        ).toEqual({
          statusCode: 400,
          body: expectedErrorMessage,
          headers: responseHeaders,
        });
      },
    );

    it("should return 500 response when db call throws unexpected error", async () => {
      const leaseTemplate = generateSchemaData(
        LeaseTemplateSchema.omit({ uuid: true }),
        {
          maxSpend: 50,
          leaseDurationInHours: 24,
        },
      );
      const event = createAPIGatewayProxyEvent({
        httpMethod: "PUT",
        path: "/leaseTemplates/{leaseTemplateId}",
        pathParameters: {
          leaseTemplateId: mockUuid,
        },
        body: JSON.stringify(leaseTemplate),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${isbAuthorizedUser.token}`,
        },
      });

      vi.spyOn(DynamoLeaseTemplateStore.prototype, "update").mockImplementation(
        () => {
          throw new Error();
        },
      );

      expect(
        await handler(
          event,
          mockAuthorizedContext(testEnv, mockedGlobalConfig),
        ),
      ).toEqual({
        statusCode: 500,
        body: createErrorResponseBody("An unexpected error occurred."),
        headers: responseHeaders,
      });
    });

    it("should return 404 response when item doesn't exist", async () => {
      const leaseTemplate = generateSchemaData(
        LeaseTemplateSchema.omit({ uuid: true }),
        {
          maxSpend: 50,
          leaseDurationInHours: 24,
        },
      );
      const event = createAPIGatewayProxyEvent({
        httpMethod: "PUT",
        path: "/leaseTemplates/{leaseTemplateId}",
        pathParameters: {
          leaseTemplateId: mockUuid,
        },
        body: JSON.stringify(leaseTemplate),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${isbAuthorizedUser.token}`,
        },
      });

      vi.spyOn(DynamoLeaseTemplateStore.prototype, "update").mockImplementation(
        () => {
          throw new UnknownItem("Lease template not found.");
        },
      );

      expect(
        await handler(
          event,
          mockAuthorizedContext(testEnv, mockedGlobalConfig),
        ),
      ).toEqual({
        statusCode: 404,
        body: createFailureResponseBody({
          message: "Lease Template not found.",
        }),
        headers: responseHeaders,
      });
    });
  });

  describe("DELETE /leaseTemplates/{leaseTemplateId}", () => {
    it("should return 200 response with no data", async () => {
      const event = createAPIGatewayProxyEvent({
        httpMethod: "DELETE",
        path: "/leaseTemplates/{leaseTemplateId}",
        pathParameters: {
          leaseTemplateId: mockUuid,
        },
        headers: {
          Authorization: `Bearer ${isbAuthorizedUser.token}`,
        },
      });

      vi.spyOn(DynamoLeaseTemplateStore.prototype, "delete").mockReturnValue(
        Promise.resolve(
          Promise.resolve(generateSchemaData(LeaseTemplateSchema)),
        ),
      );

      expect(
        await handler(
          event,
          mockAuthorizedContext(testEnv, mockedGlobalConfig),
        ),
      ).toEqual({
        statusCode: 200,
        body: JSON.stringify({
          status: "success",
          data: null,
        }),
        headers: responseHeaders,
      });
    });
    it("should return 500 response when db call throws unexpected error", async () => {
      vi.spyOn(DynamoLeaseTemplateStore.prototype, "delete").mockImplementation(
        () => {
          throw new Error();
        },
      );

      const event = createAPIGatewayProxyEvent({
        httpMethod: "DELETE",
        path: "/leaseTemplates/{leaseTemplateId}",
        headers: {
          Authorization: `Bearer ${isbAuthorizedUser.token}`,
        },
      });

      expect(
        await handler(
          event,
          mockAuthorizedContext(testEnv, mockedGlobalConfig),
        ),
      ).toEqual({
        statusCode: 500,
        body: createErrorResponseBody("An unexpected error occurred."),
        headers: responseHeaders,
      });
    });
  });
});
