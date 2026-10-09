import { isTestEnv } from "./env";

export function getCurrentTab(win?: _ZoteroTypes.MainWindow) {
  const mainWindow = win ? win : ztoolkit.getGlobal("Zotero").getMainWindow();
  return mainWindow.Zotero_Tabs.getState().find((tab) => tab.selected);
}

/** Blocking alert. No-ops in the test environment. */
export function alertPrompt(title: string, text: string): void {
  if (isTestEnv()) {
    return;
  }
  const win = Zotero.getMainWindow();
  if (!win) {
    return;
  }
  try {
    Services.prompt.alert(win, title, text);
  } catch (error) {
    try {
      ztoolkit.log("Error showing alert dialog:", error);
    } catch {
      // Tests (and early boot) may not have ztoolkit.
    }
  }
}

/** OK/Cancel prompt. Auto-accepts in the test environment. */
export function confirmPrompt(title: string, text: string): boolean {
  if (isTestEnv()) {
    return true;
  }
  const win = Zotero.getMainWindow();
  if (!win) {
    return false;
  }
  try {
    return Services.prompt.confirm(win, title, text);
  } catch (error) {
    try {
      ztoolkit.log("Error showing confirm dialog:", error);
    } catch {
      // Tests (and early boot) may not have ztoolkit.
    }
    return false;
  }
}

/**
 * OK/Cancel prompt with a checkbox.
 * Returns `{ ok, checked }`. Auto-accepts in the test environment.
 */
export function confirmPromptWithCheck(
  title: string,
  text: string,
  checkMsg: string,
  defaultChecked = false,
): { ok: boolean; checked: boolean } {
  if (isTestEnv()) {
    return { ok: true, checked: defaultChecked };
  }
  const win = Zotero.getMainWindow();
  if (!win) {
    return { ok: false, checked: defaultChecked };
  }
  try {
    const prompt = Services.prompt as typeof Services.prompt & {
      confirmCheck: (
        parent: Window | null,
        dialogTitle: string,
        dialogText: string,
        checkMessage: string,
        checkState: { value: boolean },
      ) => boolean;
    };
    const checkState = { value: defaultChecked };
    const ok = prompt.confirmCheck(win, title, text, checkMsg, checkState);
    return { ok, checked: !!checkState.value };
  } catch (error) {
    try {
      ztoolkit.log("Error showing confirmCheck dialog:", error);
    } catch {
      // Tests (and early boot) may not have ztoolkit.
    }
    return { ok: false, checked: defaultChecked };
  }
}

/**
 * Three-button prompt (button0 / button1 / button2).
 * Returns 0, 1, or 2 for the pressed button; -1 if unavailable.
 * In test env returns 0 (first button — Keep for unpin dialogs).
 */
export function confirmExPrompt(
  title: string,
  text: string,
  button0: string,
  button1: string,
  button2: string,
): number {
  if (isTestEnv()) {
    return 0;
  }
  const win = Zotero.getMainWindow();
  if (!win) {
    return -1;
  }
  try {
    const prompt = Services.prompt as typeof Services.prompt & {
      BUTTON_TITLE_IS_STRING: number;
      BUTTON_POS_0: number;
      BUTTON_POS_1: number;
      BUTTON_POS_2: number;
      confirmEx: (
        parent: Window | null,
        dialogTitle: string,
        text: string,
        buttonFlags: number,
        button0Title: string,
        button1Title: string,
        button2Title: string,
        checkMsg: string | null,
        checkState: { value: boolean },
      ) => number;
    };
    const flags =
      prompt.BUTTON_TITLE_IS_STRING * prompt.BUTTON_POS_0 +
      prompt.BUTTON_TITLE_IS_STRING * prompt.BUTTON_POS_1 +
      prompt.BUTTON_TITLE_IS_STRING * prompt.BUTTON_POS_2;
    return prompt.confirmEx(
      win,
      title,
      text,
      flags,
      button0,
      button1,
      button2,
      null,
      { value: false },
    );
  } catch (error) {
    try {
      ztoolkit.log("Error showing confirmEx dialog:", error);
    } catch {
      // Tests (and early boot) may not have ztoolkit.
    }
    return -1;
  }
}
