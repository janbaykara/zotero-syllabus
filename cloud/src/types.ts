export interface Env {
  BUCKET: R2Bucket;
  KV: KVNamespace;
  JWT_SECRET: string;
  ZOTERO_OAUTH_CLIENT_KEY: string;
  ZOTERO_OAUTH_CLIENT_SECRET: string;
  PUBLIC_BASE_URL: string;
  USER_QUOTA_BYTES: string;
  MAX_OBJECT_BYTES: string;
  MAX_FILES_PER_PUBLISH: string;
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
