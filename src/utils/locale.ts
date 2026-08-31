import { config } from "../../package.json";
import { FluentMessageId } from "../../typings/i10n";

export {
  initLocale,
  getString,
  getLocaleID,
  getAppLocale,
  isRtlLocale,
  getUiDir,
};

const RTL_LANGS = new Set(["ar", "fa", "he", "ur"]);

function getAppLocale(): string {
  try {
    const services =
      typeof Services !== "undefined"
        ? Services
        : ztoolkit.getGlobal("Services");
    const appLocale = services?.locale?.appLocaleAsBCP47;
    if (appLocale) {
      return appLocale;
    }
  } catch {
    // fall through
  }
  try {
    return Zotero.locale || "en-US";
  } catch {
    return "en-US";
  }
}

function isRtlLocale(): boolean {
  const locale = getAppLocale();
  try {
    const loc = new Intl.Locale(locale) as Intl.Locale & {
      textInfo?: { direction?: string };
      getTextInfo?: () => { direction?: string };
    };
    const direction = loc.textInfo?.direction || loc.getTextInfo?.()?.direction;
    if (direction) {
      return direction === "rtl";
    }
  } catch {
    // fall through to language-tag check
  }
  return RTL_LANGS.has(locale.split("-")[0] || "");
}

function getUiDir(): "rtl" | "ltr" {
  return isRtlLocale() ? "rtl" : "ltr";
}

/**
 * Initialize locale data
 */
function initLocale() {
  const l10n = new (
    typeof Localization === "undefined"
      ? ztoolkit.getGlobal("Localization")
      : Localization
  )([`${config.addonRef}-addon.ftl`], true);
  addon.data.locale = {
    current: l10n,
  };
}

/**
 * Get locale string, see https://firefox-source-docs.mozilla.org/l10n/fluent/tutorial.html#fluent-translation-list-ftl
 * @param localString ftl key
 * @param options.branch branch name
 * @param options.args args
 * @example
 * ```ftl
 * # addon.ftl
 * addon-static-example = This is default branch!
 *     .branch-example = This is a branch under addon-static-example!
 * addon-dynamic-example =
    { $count ->
        [one] I have { $count } apple
       *[other] I have { $count } apples
    }
 * ```
 * ```js
 * getString("addon-static-example"); // This is default branch!
 * getString("addon-static-example", { branch: "branch-example" }); // This is a branch under addon-static-example!
 * getString("addon-dynamic-example", { args: { count: 1 } }); // I have 1 apple
 * getString("addon-dynamic-example", { args: { count: 2 } }); // I have 2 apples
 * ```
 */
function getString(localString: FluentMessageId): string;
function getString(localString: FluentMessageId, branch: string): string;
function getString(
  localeString: FluentMessageId,
  options: { branch?: string | undefined; args?: Record<string, unknown> },
): string;
function getString(...inputs: any[]) {
  if (inputs.length === 1) {
    return _getString(inputs[0]);
  } else if (inputs.length === 2) {
    if (typeof inputs[1] === "string") {
      return _getString(inputs[0], { branch: inputs[1] });
    } else {
      return _getString(inputs[0], inputs[1]);
    }
  } else {
    throw new Error("Invalid arguments");
  }
}

interface Pattern {
  value: string | null;
  attributes: Array<{
    name: string;
    value: string;
  }> | null;
}

function _getString(
  localeString: FluentMessageId,
  options: { branch?: string | undefined; args?: Record<string, unknown> } = {},
): string {
  const localStringWithPrefix = `${config.addonRef}-${localeString}`;
  const { branch, args } = options;
  const pattern = addon.data.locale?.current.formatMessagesSync([
    { id: localStringWithPrefix, args },
  ])[0] as Pattern;

  if (!pattern) {
    return localStringWithPrefix;
  }
  if (branch && pattern.attributes) {
    return (
      pattern.attributes.find((attr) => attr.name === branch)?.value ||
      localStringWithPrefix
    );
  } else {
    return pattern.value || localStringWithPrefix;
  }
}

function getLocaleID(id: FluentMessageId) {
  return `${config.addonRef}-${id}`;
}
