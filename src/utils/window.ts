export function getCurrentTab(win?: _ZoteroTypes.MainWindow) {
  const mainWindow = win ? win : ztoolkit.getGlobal("Zotero").getMainWindow();
  return mainWindow.Zotero_Tabs.getState().find((tab) => tab.selected);
}

/** OK/Cancel prompt. Auto-accepts in the test environment. */
export function confirmPrompt(title: string, text: string): boolean {
  if ((__env__ as string) === "test") {
    return true;
  }
  const win = Zotero.getMainWindow();
  if (!win) {
    return false;
  }
  try {
    return Services.prompt.confirm(win, title, text);
  } catch (error) {
    ztoolkit.log("Error showing confirm dialog:", error);
    return false;
  }
}
