import { h, type ComponentChildren } from "preact";
import { renderComponent } from "./react";

/**
 * Configuration for a tab that can be created dynamically
 */
export interface TabConfig<TParams = any> {
  type: string; // Tab type (e.g., "syllabus", "reading-list")
  title: string | ((params?: TParams) => string); // Tab title (static or dynamic)
  rootElementIdFactory: (params?: TParams) => string; // Generate root element ID from params
  data?: any | ((params?: TParams) => any); // Optional tab data (icon, etc.)
  componentFactory: (params?: TParams) => ComponentChildren; // Preact component factory
  getTabId: (params?: TParams) => string; // Generate unique tab ID from params
  onClose?: (params?: TParams) => void; // Optional cleanup callback
}

/**
 * Internal data structure for a managed tab
 */
interface TabData<TParams = any> {
  config: TabConfig<TParams>;
  tab: _ZoteroTypes.TabInstance | null;
  rootElement: HTMLElement | null;
  params?: TParams; // Store params used to create this tab
}

/**
 * Manages Zotero tabs with Preact content for a specific tab type
 * Each instance manages tabs of one type with typed parameters
 */
export class TabManager<TParams = any> {
  constructor(private readonly config: TabConfig<TParams>) { }

  /**
   * Get a tab by ID
   */
  private getTabOfType(tabId: string) {
    const tabs = ztoolkit.getGlobal("Zotero_Tabs");
    const tabResult = tabs._getTab(tabId);

    if (!tabResult.tab) {
      return null
    }

    if (tabResult.tab.type !== this.config.type) {
      ztoolkit.log("TabManager.getTab: tab is not of type", this.config.type, tabId, tabResult.tab.type);
      return null;
    }

    const deck = tabs.deck;
    const tabPanels = deck.querySelectorAll("tab-content");
    const tabPanel = Array.from(tabPanels).find((panel: any) => {
      return panel.getAttribute("id") === tabId;
    }) as HTMLElement;

    if (!tabPanel) {
      ztoolkit.log("TabManager.getTab: tabPanel not found", tabId, tabPanels);
    }

    return {
      id: tabId,
      zotero: tabResult.tab,
      index: tabResult.tabIndex,
      rootElement: tabPanel.firstChild as HTMLElement,
      params: tabResult.tab.data['params'],
      config: this.config
    }
  }

  private getTabsOfType(win: _ZoteroTypes.MainWindow) {
    const tabs = ztoolkit.getGlobal("Zotero_Tabs");
    const tabIds = Array.from(win.document.querySelectorAll(`#tab-bar-container .tabs-wrapper .tab`)).map((tab: any) => tab.getAttribute("data-id"));
    const allTabs = tabs.getState()
      .map((_, index) => {
        const id = tabIds[index];
        return this.getTabOfType(id);
      })
      .filter(Boolean) as NonNullable<ReturnType<typeof this.getTabOfType>>[];
    return allTabs;
  }

  /**
   * Create a new tab
   */
  private createTab(
    win: _ZoteroTypes.MainWindow,
    params?: TParams,
  ) {
    const tabId = this.config.getTabId(params);
    const tabs = ztoolkit.getGlobal("Zotero_Tabs");

    // Check if tab already exists
    try {
      const existingTab = tabs._getTab(tabId);
      if (existingTab) {
        // Tab already exists, return existing data
        const existingData = this.getTabOfType(tabId);
        if (existingData) {
          return existingData;
        }
        // Tab exists but we don't have data, create it
      }
    } catch {
      // Tab doesn't exist, continue with creation
    }

    // Determine title
    const title =
      typeof this.config.title === "function" ? this.config.title(params) : this.config.title;

    // Determine data
    const data = {
      ...this.config.data,
      params,
    }

    // Create new tab with defined ID
    const tabResult = tabs.add({
      id: tabId,
      type: this.config.type,
      title,
      data,
      onClose: () => {
        // Clean up reference when tab is closed
        if (this.config.onClose) {
          this.config.onClose(params);
        }
      },
    });

    // Create root element
    const rootElementId = this.config.rootElementIdFactory(params);
    const rootElement = win.document.createElement("div");
    rootElement.id = rootElementId;
    rootElement.style.width = "100%";
    rootElement.style.height = "100%";
    tabResult.container.appendChild(rootElement);

    // Get tab instance
    let tabInstance: _ZoteroTypes.TabInstance | null = null;
    try {
      tabInstance = tabs._getTab(tabId)?.tab || null;
    } catch {
      ztoolkit.log(`Failed to get tab instance for ${tabId}`);
      return null;
    }

    if (!tabInstance) {
      return null;
    }

    // Store tab data
    const tabData: TabData<TParams> = {
      config: this.config,
      tab: tabInstance,
      rootElement,
      params,
    };

    // this.tabs.set(tabId, tabData);

    return tabData;
  }

  /**
   * Find or create a tab
   */
  private findOrCreateTab(
    win: _ZoteroTypes.MainWindow,
    params?: TParams,
  ) {
    const tabId = this.config.getTabId(params);

    // First try to find existing tab
    const existing = this.getTabOfType(tabId);
    if (existing) {
      return existing;
    }

    // Create new tab
    return this.createTab(win, params);
  }

  /**
   * Select a tab by ID
   */
  private selectTab(tabId: string, win: _ZoteroTypes.MainWindow): void {
    try {
      win.Zotero_Tabs.select(tabId, true);
    } catch {
      // Tab doesn't exist, nothing to select
    }
  }

  /**
   * Open a tab (find/create, select, and render)
   */
  open(win: _ZoteroTypes.MainWindow, params?: TParams): void {
    const tabData = this.findOrCreateTab(win, params);
    if (!tabData) {
      return;
    }

    const tabId = this.config.getTabId(params);
    this.selectTab(tabId, win);
    this.renderTab(tabId, win);
  }

  /**
   * Render component into a tab's root element
   */
  private renderTab(tabId: string, win: _ZoteroTypes.MainWindow): void {
    const tabData = this.getTabOfType(tabId);
    ztoolkit.log("TabManager.renderTab: tabData", tabData);

    if (!tabData || !tabData.rootElement) {
      ztoolkit.log("TabManager.renderTab: tabData or rootElement not found, can't render", tabId, tabData);
      return;
    }

    const rootElement = tabData.rootElement;

    // Clear and render
    rootElement.textContent = "";
    const component = tabData.config.componentFactory(tabData.params);
    renderComponent(win, rootElement, component, `tab-${tabId}`);

    ztoolkit.log("TabManager.renderTab complete", tabId);
  }

  /**
   * Re-render a tab (for hot reload support)
   */
  renderAllTabs(win: _ZoteroTypes.MainWindow, params?: TParams): void {
    ztoolkit.log("TabManager.rerender: params", params);
    if (params === undefined) {
      // Re-render all tabs of this type
      const allTabs = this.getTabsOfType(win);
      for (const tab of allTabs) {
        ztoolkit.log("TabManager.renderAllTabs on loop: tabId", tab.id);
        this.renderTab(tab.id, win);
      }
      return;
    } else {
      const tabId = this.config.getTabId(params);
      ztoolkit.log("TabManager.rerender by param: tabId", tabId);
      this.renderTab(tabId, win);
    }
  }

  /**
   * Clean up a specific tab
   */
  cleanup(params?: TParams): void {
  }

  /**
   * Clean up all tabs (for window unload)
   */
  cleanupAll(): void {
  }
}
