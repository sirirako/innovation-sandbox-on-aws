// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { vi } from "vitest";
import { mock } from "vitest-mock-extended";

/**
 * creates a mock of a class while maintaining the actual implementation
 * of requested functions defined on the parent interface rather than mocking them
 */
export function createMockOf<Class>(
  classToMock: abstract new (...args: any[]) => Class,
  options?: {
    usingRealFunctions?: Array<keyof Class>;
    withObjects?: { [K in keyof Class]?: any };
  },
) {
  const mockClass = mock<Class>();

  if (options?.usingRealFunctions) {
    Object.getOwnPropertyNames(classToMock.prototype).forEach((funcName) => {
      const method = classToMock.prototype[funcName];

      if (
        typeof method === "function" &&
        options.usingRealFunctions?.includes(funcName as keyof Class & string)
      ) {
        (mockClass[funcName as keyof Class] as unknown) = vi
          .fn()
          .mockImplementation((...args: any[]) =>
            method.bind(mockClass)(...args),
          );
      }
    });
  }

  if (options?.withObjects) {
    Object.entries(options.withObjects).forEach(([key, value]) => {
      (mockClass[key as keyof Class] as any) = value;
    });
  }

  return mockClass;
}

/**
 * creates a class that extends an interface while maintaining the actual implementation
 * of functions defined on the parent interface rather than mocking them
 *
 * This allows "meta functions" defined on the interface to still work correctly as these functions
 * often extend child behavior by referencing other abstract functions defined on the interface
 */
export function createInterfacedMock<TInterface, TChild extends TInterface>(
  parentInterface: abstract new (...args: any[]) => TInterface,
  _childClass: new (...args: any[]) => TChild,
) {
  const mockChild = mock<TChild>();

  Object.getOwnPropertyNames(parentInterface.prototype).forEach(
    (methodName) => {
      const method = parentInterface.prototype[methodName];
      if (typeof method === "function" && methodName !== "constructor") {
        (mockChild[methodName as keyof TChild] as unknown) = vi
          .fn()
          .mockImplementation((...args: any[]) =>
            method.bind(mockChild)(...args),
          );
      }
    },
  );

  return mockChild;
}
