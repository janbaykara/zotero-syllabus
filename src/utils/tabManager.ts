import { h, type ComponentChildren } from "preact";
import { renderComponent } from "./react";

/**
 * Configuration for a tab that can be created dynamically
 */
export interface TabConfig {
  type: string; // Tab type (e.g., "syllabus", "reading-list")
  title: string | ((params?: any) => string); // Tab title (static or dynamic)
  rootElementIdFactory: (params?: any) => string; // Generate root element ID from params
  data?: any | ((params?: any) => any); // Optional tab data (icon, etc.)
  componentFactory: (params?: any) => ComponentChildren; // Preact component factory
  getTabId: (params?: any) => string; // Generate unique tab ID from params
  onClose?: (params?: any) => void; // Optional cleanup callback
}

/**
 * Internal data structure for a managed tab
 */
interface TabData {
  config: TabConfig;
  tab: _ZoteroTypes.TabInstance | null;
  rootElement: HTMLElement | null;
  params?: any; // Store params used to create this tab
}

/**
 * Manages Zotero tabs with Preact content
 * Supports multiple tabs of the same type with different parameters
 */
export class TabManager {
  private static instance: TabManager | null = null;
  private tabs: Map<string, TabData> = new Map(); // Map of tabId -> TabData
  private configs: Map<string, TabConfig> = new Map(); // Map of type -> TabConfig

  private constructor() { }

  /**
   * Get the singleton instance
   */
  static getInstance(): TabManager {
    if (!TabManager.instance) {
      TabManager.instance = new TabManager();
    }
    return TabManager.instance;
  }

  /**
   * Register a tab configuration
   */
  registerTabType(config: TabConfig): void {
    this.configs.set(config.type, config);
  }

  /**
   * Find an existing tab by ID
   */
  private findTab(tabId: string, win: _ZoteroTypes.MainWindow): TabData | null {
    const tabData = this.tabs.get(tabId);
    if (!tabData) {
      return null;
    }

    const tabs = ztoolkit.getGlobal("Zotero_Tabs");

    // Verify tab still exists in Zotero
    try {
      const tabResult = tabs._getTab(tabId);
      if (tabResult && tabResult.tab) {
        // Tab exists, ensure root element is set up
        if (!tabData.rootElement) {
          this.setupRootElement(tabId, tabData, win);
        }
        return tabData;
      }
    } catch {
      // Tab doesn't exist in Zotero, remove from our tracking
      this.tabs.delete(tabId);
      return null;
    }

    return null;
  }

  /**
   * Set up root element for a tab
   */
  private setupRootElement(
    tabId: string,
    tabData: TabData,
    win: _ZoteroTypes.MainWindow,
  ): void {
    const rootElementId = tabData.config.rootElementIdFactory(tabData.params);
    let rootElement = win.document.getElementById(rootElementId) as HTMLElement;

    if (!rootElement) {
      rootElement = win.document.createElement("div");
      rootElement.id = rootElementId;
      rootElement.style.width = "100%";
      rootElement.style.height = "100%";

      const tabs = ztoolkit.getGlobal("Zotero_Tabs");
      try {
        const tabResult = tabs._getTab(tabId);
        if (tabResult) {
          const deck = tabs.deck;
          const tabPanels = deck.querySelectorAll("tabpanel");
          const tabPanel = Array.from(tabPanels).find((panel: any) => {
            return (
              panel.getAttribute("id") === `zotero-view-tab-${tabId}` ||
              panel.getAttribute("data-tab-id") === tabId
            );
          }) as HTMLElement;
          if (tabPanel) {
            tabPanel.appendChild(rootElement);
          } else {
            deck.appendChild(rootElement);
          }
        }
      } catch {
        // Tab doesn't exist, can't set up root element
        return;
      }
    }

    tabData.rootElement = rootElement;
  }

  /**
   * Create a new tab
   */
  private createTab(
    type: string,
    win: _ZoteroTypes.MainWindow,
    params?: any,
  ): TabData | null {
    const config = this.configs.get(type);
    if (!config) {
      ztoolkit.log(`Tab config not found for type: ${type}`);
      return null;
    }

    const tabId = config.getTabId(params);
    const tabs = ztoolkit.getGlobal("Zotero_Tabs");

    // Check if tab already exists
    try {
      const existingTab = tabs._getTab(tabId);
      if (existingTab) {
        // Tab already exists, return existing data
        const existingData = this.tabs.get(tabId);
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
      typeof config.title === "function" ? config.title(params) : config.title;

    // Determine data
    const data =
      typeof config.data === "function" ? config.data(params) : config.data;

    // Create new tab with defined ID
    const tabResult = tabs.add({
      id: tabId,
      type: config.type,
      title,
      data,
      onClose: () => {
        // Clean up reference when tab is closed
        this.tabs.delete(tabId);
        if (config.onClose) {
          config.onClose(params);
        }
      },
    });

    // Create root element
    const rootElementId = config.rootElementIdFactory(params);
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
    const tabData: TabData = {
      config,
      tab: tabInstance,
      rootElement,
      params,
    };

    this.tabs.set(tabId, tabData);

    return tabData;
  }

  /**
   * Find or create a tab
   */
  private findOrCreateTab(
    type: string,
    win: _ZoteroTypes.MainWindow,
    params?: any,
  ): TabData | null {
    const config = this.configs.get(type);
    if (!config) {
      return null;
    }

    const tabId = config.getTabId(params);

    // First try to find existing tab
    const existing = this.findTab(tabId, win);
    if (existing) {
      return existing;
    }

    // Create new tab
    return this.createTab(type, win, params);
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
   * Render component into a tab's root element
   */
  private renderTab(tabId: string, win: _ZoteroTypes.MainWindow): void {
    const tabData = this.tabs.get(tabId);
    if (!tabData || !tabData.rootElement) {
      return;
    }

    const rootElement = tabData.rootElement;

    // Ensure root element is attached to DOM
    if (!rootElement.isConnected) {
      const tabs = ztoolkit.getGlobal("Zotero_Tabs");
      try {
        const tabResult = tabs._getTab(tabId);
        if (tabResult) {
          const deck = tabs.deck;
          const tabPanels = deck.querySelectorAll("tabpanel");
          const tabPanel = Array.from(tabPanels).find((panel: any) => {
            return (
              panel.getAttribute("id") === `zotero-view-tab-${tabId}` ||
              panel.getAttribute("data-tab-id") === tabId
            );
          }) as HTMLElement;
          if (tabPanel) {
            tabPanel.appendChild(rootElement);
          } else {
            deck.appendChild(rootElement);
          }
        }
      } catch {
        // Tab doesn't exist, can't render
        return;
      }
    }

    // Clear and render
    rootElement.textContent = "";
    const component = tabData.config.componentFactory(tabData.params);
    renderComponent(win, rootElement, component, `tab-${tabId}`);
  }

  /**
   * Open a tab (find/create, select, and render)
   */
  openTab(
    type: string,
    win: _ZoteroTypes.MainWindow,
    params?: any,
  ): void {
    const tabData = this.findOrCreateTab(type, win, params);
    if (!tabData) {
      return;
    }

    const tabId = tabData.config.getTabId(params);
    this.selectTab(tabId, win);
    this.renderTab(tabId, win);
  }

  /**
   * Re-render a tab (for hot reload support)
   */
  rerenderTab(
    type: string,
    win: _ZoteroTypes.MainWindow,
    params?: any,
  ): void {
    const config = this.configs.get(type);
    if (!config) {
      return;
    }

    const tabId = config.getTabId(params);
    const tabData = this.tabs.get(tabId);

    // If we don't have tab data, try to find/create it
    if (!tabData) {
      const found = this.findOrCreateTab(type, win, params);
      if (!found) {
        return;
      }
    }

    this.renderTab(tabId, win);
  }

  /**
   * Clean up a specific tab
   */
  cleanupTab(type: string, params?: any): void {
    const config = this.configs.get(type);
    if (!config) {
      return;
    }

    const tabId = config.getTabId(params);
    this.tabs.delete(tabId);
  }

  /**
   * Clean up all tabs (for window unload)
   */
  cleanupAll(): void {
    this.tabs.clear();
  }
}

