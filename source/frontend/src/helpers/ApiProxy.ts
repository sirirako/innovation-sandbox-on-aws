// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AuthService } from "@amzn/innovation-sandbox-frontend/helpers/AuthService";
import { config } from "@amzn/innovation-sandbox-frontend/helpers/config";
import { ApiResponse } from "@amzn/innovation-sandbox-frontend/types";

type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface IApiProxy {
  get<T>(url: string): Promise<T>;
  post<T>(url: string, data?: unknown): Promise<T>;
  put<T>(url: string, data?: unknown): Promise<T>;
  patch<T>(url: string, data?: unknown): Promise<T>;
  delete<T>(url: string, data?: unknown): Promise<T>;
}

export class ApiProxy implements IApiProxy {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? config.ApiUrl;
  }

  private async generateHeaders() {
    // retrieve access token
    const accessToken = AuthService.getAccessToken();

    // pass auth header with each request
    return {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };
  }

  private async callApi<T>(
    method: ApiMethod,
    url: string,
    body?: Record<string, any>,
  ): Promise<T> {
    const headers = await this.generateHeaders();

    const response = await fetch(`${this.baseUrl}${url}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      let data;

      try {
        data = await response.json();
      } catch (err) {
        console.error("API Response was not valid JSON", err);
      }

      if (data?.data?.errors?.length) {
        const errorDetails = data.data.errors[0];

        if (errorDetails.field && errorDetails.message) {
          throw new Error(`${errorDetails.field}: ${errorDetails.message}`);
        }

        if (errorDetails.message) {
          throw new Error(errorDetails.message);
        }
      }
      throw new Error(`HTTP error ${response.status}`);
    }

    const { status, data, ...rest }: ApiResponse<T> =
      (await response.json()) as ApiResponse<T>;

    if (status !== "success") {
      console.error("API error", {
        request: { method, url, body },
        response: { status, data, ...rest },
      });
      throw new Error(`API error: ${method} ${url}`);
    }

    return data;
  }

  public async get<T>(url: string): Promise<T> {
    return this.callApi("GET", url);
  }

  public async post<T>(url: string, data?: Record<string, any>): Promise<T> {
    return this.callApi("POST", url, data);
  }

  public async put<T>(url: string, data?: Record<string, any>): Promise<T> {
    return this.callApi("PUT", url, data);
  }

  public async patch<T>(url: string, data?: Record<string, any>): Promise<T> {
    return this.callApi("PATCH", url, data);
  }

  public async delete<T>(url: string, data?: Record<string, any>): Promise<T> {
    return this.callApi("DELETE", url, data);
  }
}
