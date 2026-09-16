# Zotero Syllabus publish Worker

Static syllabus hosting on **Cloudflare R2** behind a gatekeeper Worker. Users sign in with **Zotero OAuth**; the plugin never receives R2 credentials.

## Architecture (short)

- Private R2 bucket: `users/{zoteroUserId}/syllabi/{libraryId}/{collectionKey}/`
- Worker enforces JWT identity, path prefix, and per-user storage quota (KV)
- Public reads: `GET /u/{userId}/{libraryId}/{collectionKey}/`
- Relative links in `index.html` → `files/{attachmentKey}.pdf`

## Manual platform setup

### 1. Cloudflare account

1. Create or sign in to a Cloudflare account (prefer a dedicated account for blast-radius isolation).
2. Enable **Workers**, **R2**, and **Workers KV**.
3. Under **Billing**, set a **spending alert** (and a hard spend limit if available).

### 2. R2 bucket

```bash
cd cloud
pnpm install
npx wrangler r2 bucket create zotero-syllabus-publish
```

Keep the bucket **private**. The Worker serves public GETs.

### 3. KV namespace

```bash
npx wrangler kv namespace create SYLLABUS_USAGE
```

Copy the namespace **id** into [`wrangler.toml`](wrangler.toml) under `[[kv_namespaces]]`.

### 4. Configure `wrangler.toml`

1. Set `bucket_name` / KV `id`.
2. Set `[vars].PUBLIC_BASE_URL` to your workers.dev URL after first deploy (or a custom domain later), e.g. `https://read.zotero-syllabus.workers.dev` (`{worker-name}.{account-subdomain}.workers.dev`).
3. Adjust `USER_QUOTA_BYTES`, `MAX_OBJECT_BYTES`, `MAX_FILES_PER_PUBLISH` as needed.

### 5. Secrets

```bash
npx wrangler secret put JWT_SECRET
npx wrangler secret put ZOTERO_OAUTH_CLIENT_KEY
npx wrangler secret put ZOTERO_OAUTH_CLIENT_SECRET
# Optional: ops dashboard at /admin?key=…
npx wrangler secret put ADMIN_DASHBOARD_SECRET
```

Generate a long random `JWT_SECRET`. OAuth client values come from the next step.

### 6. Zotero OAuth app

1. Register an app at [zotero.org/oauth/apps](https://www.zotero.org/oauth/apps).
2. Callback URL: `https://read.zotero-syllabus.workers.dev/auth/zotero/callback` (match your Worker URL).
3. Put Client Key / Client Secret into the Worker secrets above.
4. Never put these secrets in the plugin XPI or git.

### 7. Deploy

```bash
npx wrangler deploy
```

Confirm `GET /health` returns `{"ok":true}`.

**If Publish says OAuth is not set up:** the Worker is up but secrets are missing. From `cloud/`:

```bash
npx wrangler secret put JWT_SECRET
npx wrangler secret put ZOTERO_OAUTH_CLIENT_KEY
npx wrangler secret put ZOTERO_OAUTH_CLIENT_SECRET
```

Then redeploy is not required for secrets (they apply immediately), and try Publish again.

### 8. Point the plugin at the Worker

In [`addon/prefs.js`](../addon/prefs.js) (or via Zotero prefs), set:

```text
extensions.zotero.syllabus.publishApiBaseUrl = https://read.zotero-syllabus.workers.dev
```

Match the Worker origin exactly (no trailing slash).

### 9. Smoke test

1. Syllabus view → printer menu → **Publish online…** → confirm → approve Zotero OAuth in the browser if prompted → wait for upload → public URL opens / is copied.
2. Open the URL in a private window; click a title that had a PDF.
3. On the publish banner, **Unpublish** → confirm → public URL returns 404 and the banner clears.
4. Sign in as a second Zotero user (clear plugin publish JWT prefs or use another profile) and confirm you cannot overwrite the first user’s `/u/{otherId}/…` objects via the API.
5. Fill the quota (or temporarily lower `USER_QUOTA_BYTES`) and confirm over-quota returns an error.

### 10. Ongoing ops

- Rotate `JWT_SECRET` / OAuth secrets if leaked (users must re-auth on next Publish).
- Watch R2 Class A operations and storage; tune per-user quota.
- Users can revoke the OAuth app under zotero.org settings; clearing `publishJwt` / related prefs in Zotero also drops the local session.
- **Admin dashboard** (optional): set `ADMIN_DASHBOARD_SECRET`, then open `https://<PUBLIC_BASE_URL>/admin?key=<secret>`. Lists published syllabi with public URLs, per-syllabus storage size, and attachment file counts (from an R2 scan). Wrong/missing key returns 404. Prefer a long random secret — query keys can appear in access logs / browser history. Read throughput is not on this page; use the Cloudflare dashboard for bandwidth.
- OAuth poll handoff stores the short-lived JWT under `_oauth/ready/{state}.json` in R2 (strongly consistent). Do not move that back to KV alone — edge caching made the plugin stick on “Waiting for Zotero sign-in” after the browser already finished.

## API (Worker)

| Method   | Path                                        | Auth         | Purpose                                                                                                                                                                                    |
| -------- | ------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET      | `/admin?key=`                               | Admin secret | Ops HTML: syllabus count, storage, files, public links (404 if secret unset/wrong)                                                                                                         |
| POST     | `/auth/zotero/start`                        | —            | Start OAuth; returns `{ authorizeUrl, state }`                                                                                                                                             |
| GET      | `/auth/zotero/callback`                     | —            | OAuth redirect target                                                                                                                                                                      |
| GET      | `/auth/zotero/poll?state=`                  | —            | Plugin polls for JWT                                                                                                                                                                       |
| GET      | `/v1/me`                                    | Bearer JWT   | Usage / quota                                                                                                                                                                              |
| GET/HEAD | `/v1/objects`                               | Bearer JWT   | Single-object metadata                                                                                                                                                                     |
| GET      | `/v1/syllabus/objects`                      | Bearer JWT   | Fast list of object sizes under a syllabus (for skip-unchanged)                                                                                                                            |
| PUT      | `/v1/objects`                               | Bearer JWT   | Upload one object (`X-Object-Path`, optional `X-Object-Fingerprint`, library/collection headers). Allowed paths: `index.html`, `bibliography.ris`, `bibliography.bib`, `og-image.jpg`, `files/{key}.{ext}` |
| DELETE   | `/v1/syllabus?libraryId=&collectionKey=`    | Bearer JWT   | Wipe one published syllabus (all R2 keys under the prefix); public URLs then 404. Plugin **Unpublish** calls this.                                                                         |
| GET      | `/u/{userId}/{libraryId}/{collectionKey}/…` | —            | Public HTML / files                                                                                                                                                                        |
| GET      | `/health`                                   | —            | Liveness                                                                                                                                                                                   |

Identity uses Zotero OAuth with `identity=1` (userID without creating a long-lived Zotero library API key for the app).
