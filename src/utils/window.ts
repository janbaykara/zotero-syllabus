/**
 * Check if the window is alive.
 * Useful to prevent opening duplicate windows.
 * @param win
 */
export function isWindowAlive(win?: Window) {
  return win && !Components.utils.isDeadWrapper(win) && !win.closed;
}

export function getCurrentTab(win?: _ZoteroTypes.MainWindow) {
  const mainWindow = win ? win : ztoolkit.getGlobal("Zotero").getMainWindow();
  return mainWindow.Zotero_Tabs.getState().find((tab) => tab.selected);
}
