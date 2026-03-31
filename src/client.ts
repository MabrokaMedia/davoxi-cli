import * as https from 'https';
import * as http from 'http';
import * as url from 'url';
import {
  AuthTokens,
  Business,
  AgentDefinition,
  UsageSummary,
  UsageDetail,
  Subscription,
  Invoice,
  ApiKey,
  ApiKeyCreated,
  UserProfile,
} from './types';

export class DavoxiClientError extends Error {
  public readonly status: number;
  public readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'DavoxiClientError';
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export class DavoxiClient {
  private baseUrl: string;
  private token?: string;

  constructor(baseUrl: string, token?: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.token = token;
  }

  private async request<T>(options: RequestOptions): Promise<T> {
    const parsed = new url.URL(options.path, this.baseUrl);
    const isHttps = parsed.protocol === 'https:';
    const lib = isHttps ? https : http;

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': '@davoxi/cli',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const bodyStr = options.body ? JSON.stringify(options.body) : undefined;
    if (bodyStr) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(bodyStr).toString();
    }

    return new Promise<T>((resolve, reject) => {
      const req = lib.request(
        {
          hostname: parsed.hostname,
          port: parsed.port || (isHttps ? 443 : 80),
          path: parsed.pathname + parsed.search,
          method: options.method,
          headers,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            const status = res.statusCode || 0;

            if (status >= 200 && status < 300) {
              try {
                resolve(data ? JSON.parse(data) : ({} as T));
              } catch {
                resolve(data as unknown as T);
              }
            } else {
              let message = `Request failed with status ${status}`;
              let code: string | undefined;
              try {
                const err = JSON.parse(data) as { message?: string; code?: string };
                message = err.message || message;
                code = err.code;
              } catch {
                if (data) message = data;
              }
              reject(new DavoxiClientError(status, message, code));
            }
          });
        }
      );

      req.on('error', (err) => {
        reject(
          new DavoxiClientError(
            0,
            `Connection failed: ${err.message}. Is the API server running?`
          )
        );
      });

      req.setTimeout(30000, () => {
        req.destroy();
        reject(new DavoxiClientError(0, 'Request timed out after 30 seconds'));
      });

      if (bodyStr) req.write(bodyStr);
      req.end();
    });
  }

  // ── Auth ──

  async login(email: string, password: string): Promise<AuthTokens> {
    return this.request<AuthTokens>({
      method: 'POST',
      path: '/auth/login',
      body: { email, password },
    });
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    return this.request<AuthTokens>({
      method: 'POST',
      path: '/auth/refresh',
      body: { refresh_token: refreshToken },
    });
  }

  async whoami(): Promise<UserProfile> {
    return this.request<UserProfile>({
      method: 'GET',
      path: '/users/me',
    });
  }

  // ── Businesses ──

  async listBusinesses(): Promise<Business[]> {
    return this.request<Business[]>({ method: 'GET', path: '/businesses' });
  }

  async getBusiness(id: string): Promise<Business> {
    return this.request<Business>({ method: 'GET', path: `/businesses/${id}` });
  }

  async createBusiness(body: Record<string, unknown>): Promise<Business> {
    return this.request<Business>({ method: 'POST', path: '/businesses', body });
  }

  async updateBusiness(id: string, body: Record<string, unknown>): Promise<Business> {
    return this.request<Business>({
      method: 'PUT',
      path: `/businesses/${id}`,
      body,
    });
  }

  async deleteBusiness(id: string): Promise<void> {
    return this.request<void>({
      method: 'DELETE',
      path: `/businesses/${id}`,
    });
  }

  // ── Agents ──

  async listAgents(businessId: string): Promise<AgentDefinition[]> {
    return this.request<AgentDefinition[]>({
      method: 'GET',
      path: `/businesses/${businessId}/agents`,
    });
  }

  async getAgent(businessId: string, agentId: string): Promise<AgentDefinition> {
    return this.request<AgentDefinition>({
      method: 'GET',
      path: `/businesses/${businessId}/agents/${agentId}`,
    });
  }

  async createAgent(businessId: string, body: Record<string, unknown>): Promise<AgentDefinition> {
    return this.request<AgentDefinition>({
      method: 'POST',
      path: `/businesses/${businessId}/agents`,
      body,
    });
  }

  async updateAgent(
    businessId: string,
    agentId: string,
    body: Record<string, unknown>
  ): Promise<AgentDefinition> {
    return this.request<AgentDefinition>({
      method: 'PUT',
      path: `/businesses/${businessId}/agents/${agentId}`,
      body,
    });
  }

  async deleteAgent(businessId: string, agentId: string): Promise<void> {
    return this.request<void>({
      method: 'DELETE',
      path: `/businesses/${businessId}/agents/${agentId}`,
    });
  }

  // ── Usage ──

  async getUsageSummary(): Promise<UsageSummary> {
    return this.request<UsageSummary>({ method: 'GET', path: '/usage/summary' });
  }

  async getUsageDetail(): Promise<UsageDetail[]> {
    return this.request<UsageDetail[]>({ method: 'GET', path: '/usage' });
  }

  // ── Billing ──

  async getSubscription(): Promise<Subscription> {
    return this.request<Subscription>({ method: 'GET', path: '/billing/subscription' });
  }

  async getInvoices(): Promise<Invoice[]> {
    return this.request<Invoice[]>({ method: 'GET', path: '/billing/invoices' });
  }

  // ── API Keys ──

  async listApiKeys(): Promise<ApiKey[]> {
    return this.request<ApiKey[]>({ method: 'GET', path: '/api-keys' });
  }

  async createApiKey(name: string): Promise<ApiKeyCreated> {
    return this.request<ApiKeyCreated>({
      method: 'POST',
      path: '/api-keys',
      body: { name },
    });
  }

  async revokeApiKey(prefix: string): Promise<void> {
    return this.request<void>({
      method: 'DELETE',
      path: `/api-keys/${prefix}`,
    });
  }
}
