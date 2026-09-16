export interface Env {
  BUCKET: R2Bucket;
  KV: KVNamespace;
  /** Public page views / file downloads (Workers Analytics Engine). */
  ANALYTICS: AnalyticsEngineDataset;
  JWT_SECRET: string;
  ZOTERO_OAUTH_CLIENT_KEY: string;
  ZOTERO_OAUTH_CLIENT_SECRET: string;
  PUBLIC_BASE_URL: string;
  USER_QUOTA_BYTES: string;
  MAX_OBJECT_BYTES: string;
  MAX_FILES_PER_PUBLISH: string;
  /** Optional. When set, GET /admin?key=… serves the publish ops dashboard. */
  ADMIN_DASHBOARD_SECRET?: string;
  /** Optional. Cloudflare account id for Analytics Engine SQL from /admin. */
  CF_ACCOUNT_ID?: string;
  /** Optional. API token with Account Analytics Read (query views on /admin). */
  CF_ANALYTICS_API_TOKEN?: string;
}

export type OAuthPending = {
  requestToken: string;
  requestTokenSecret: string;
  createdAt: number;
};

export type OAuthReady = {
  token: string;
  userId: string;
  expiresAt: number;
  createdAt: number;
};
