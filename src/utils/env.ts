import { config } from "../../package.json";

/**
 * True during `zotero-plugin test`. The plugin bundle esbuild-defines
 * `__env__`, but unit-test bundles do not — fall back to the live plugin
 * instance (built with `NODE_ENV=test`).
 */
export function isTestEnv(): boolean {
  if (typeof __env__ !== "undefined" && (__env__ as string) === "test") {
    return true;
  }
  try {
    const instance = (
      Zotero as unknown as Record<string, { data?: { env?: string } }>
    )[config.addonInstance];
    return instance?.data?.env === "test";
  } catch {
    return false;
  }
}
