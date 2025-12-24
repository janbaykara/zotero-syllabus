import { getLocaleID, getString } from "../utils/locale";
import {
  getSyllabusStatus,
  getSyllabusDescription,
  getSyllabusClassNumber,
  setSyllabusStatus,
  setSyllabusDescription,
  setSyllabusClassNumber,
  SyllabusStatus,
  STATUS_COLORS,
  STATUS_LABELS,
} from "../utils/syllabus";

function example(
  target: any,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor,
) {
  const original = descriptor.value;
  descriptor.value = function (...args: any) {
    try {
      ztoolkit.log(`Calling example ${target.name}.${String(propertyKey)}`);
      return original.apply(this, args);
    } catch (e) {
      ztoolkit.log(`Error in example ${target.name}.${String(propertyKey)}`, e);
      throw e;
    }
  };
  return descriptor;
}

export class BasicExampleFactory {
  @example
  static registerNotifier() {
    const callback = {
      notify: async (
        event: string,
        type: string,
        ids: number[] | string[],
        extraData: { [key: string]: any },
      ) => {
        if (!addon?.data.alive) {
          this.unregisterNotifier(notifierID);
          return;
        }
        addon.hooks.onNotify(event, type, ids, extraData);
      },
    };

    // Register the callback in Zotero as an item observer
    const notifierID = Zotero.Notifier.registerObserver(callback, [
      "tab",
      "item",
      "file",
    ]);

    Zotero.Plugins.addObserver({
      shutdown: ({ id }) => {
        if (id === addon.data.config.addonID)
          this.unregisterNotifier(notifierID);
      },
    });
  }

  @example
  static exampleNotifierCallback() {
    new ztoolkit.ProgressWindow(addon.data.config.addonName)
      .createLine({
        text: "Open Tab Detected!",
        type: "success",
        progress: 100,
      })
      .show();
  }

  @example
  private static unregisterNotifier(notifierID: string) {
    Zotero.Notifier.unregisterObserver(notifierID);
  }

  @example
  static registerPrefs() {
    Zotero.PreferencePanes.register({
      pluginID: addon.data.config.addonID,
      src: rootURI + "content/preferences.xhtml",
      label: getString("prefs-title"),
      image: `chrome://${addon.data.config.addonRef}/content/icons/favicon.png`,
    });
  }
}

export class KeyExampleFactory {
  @example
  static registerShortcuts() {
    // Register an event key for Alt+L
    ztoolkit.Keyboard.register((ev, keyOptions) => {
      ztoolkit.log(ev, keyOptions.keyboard);
      if (keyOptions.keyboard?.equals("shift,l")) {
        addon.hooks.onShortcuts("larger");
      }
      if (ev.shiftKey && ev.key === "S") {
        addon.hooks.onShortcuts("smaller");
      }
    });

    new ztoolkit.ProgressWindow(addon.data.config.addonName)
      .createLine({
        text: "Example Shortcuts: Alt+L/S/C",
        type: "success",
      })
      .show();
  }

  @example
  static exampleShortcutLargerCallback() {
    new ztoolkit.ProgressWindow(addon.data.config.addonName)
      .createLine({
        text: "Larger!",
        type: "default",
      })
      .show();
  }

  @example
  static exampleShortcutSmallerCallback() {
    new ztoolkit.ProgressWindow(addon.data.config.addonName)
      .createLine({
        text: "Smaller!",
        type: "default",
      })
      .show();
  }
}

export class UIExampleFactory {
  @example
  static registerStyleSheet(win: _ZoteroTypes.MainWindow) {
    const doc = win.document;
    const styles = ztoolkit.UI.createElement(doc, "link", {
      properties: {
        type: "text/css",
        rel: "stylesheet",
        href: `chrome://${addon.data.config.addonRef}/content/zoteroPane.css`,
      },
    });
    doc.documentElement?.appendChild(styles);
    doc.getElementById("zotero-item-pane-content")?.classList.add("makeItRed");
  }

  @example
  static registerRightClickMenuItem() {
    const menuIcon = `chrome://${addon.data.config.addonRef}/content/icons/favicon@0.5x.png`;
    // item menuitem with icon
    ztoolkit.Menu.register("item", {
      tag: "menuitem",
      id: "zotero-itemmenu-addontemplate-test",
      label: getString("menuitem-label"),
      commandListener: (ev) => addon.hooks.onDialogEvents("dialogExample"),
      icon: menuIcon,
    });
  }

  @example
  static registerRightClickMenuPopup(win: Window) {
    ztoolkit.Menu.register(
      "item",
      {
        tag: "menu",
        label: getString("menupopup-label"),
        children: [
          {
            tag: "menuitem",
            label: getString("menuitem-submenulabel"),
            oncommand: "alert('Hello World! Sub Menuitem.')",
          },
        ],
      },
      "before",
      win.document?.querySelector(
        "#zotero-itemmenu-addontemplate-test",
      ) as XUL.MenuItem,
    );
  }

  @example
  static registerWindowMenuWithSeparator() {
    ztoolkit.Menu.register("menuFile", {
      tag: "menuseparator",
    });
    // menu->File menuitem
    ztoolkit.Menu.register("menuFile", {
      tag: "menuitem",
      label: getString("menuitem-filemenulabel"),
      oncommand: "alert('Hello World! File Menuitem.')",
    });
  }

  @example
  static async registerExtraColumn() {
    const field = "test1";
    await Zotero.ItemTreeManager.registerColumns({
      pluginID: addon.data.config.addonID,
      dataKey: field,
      label: "text column",
      dataProvider: (item: Zotero.Item, dataKey: string) => {
        return field + String(item.id);
      },
      iconPath: "chrome://zotero/skin/cross.png",
    });
  }

  @example
  static async registerExtraColumnWithCustomCell() {
    const field = "test2";
    await Zotero.ItemTreeManager.registerColumns({
      pluginID: addon.data.config.addonID,
      dataKey: field,
      label: "custom column",
      dataProvider: (item: Zotero.Item, dataKey: string) => {
        return field + String(item.id);
      },
      renderCell(index, data, column, isFirstColumn, doc) {
        ztoolkit.log("Custom column cell is rendered!");
        const span = doc.createElement("span");
        span.className = `cell ${column.className}`;
        span.style.background = "#0dd068";
        span.innerText = "⭐" + data;
        return span;
      },
    });
  }

  @example
  static async registerSyllabusStatusColumn() {
    const field = "syllabus-status";
    // @ts-expect-error - onEdit may not be in types but is supported by Zotero API
    await Zotero.ItemTreeManager.registerColumns({
      pluginID: addon.data.config.addonID,
      dataKey: field,
      label: "Syllabus Status",
      dataProvider: (item: Zotero.Item, dataKey: string) => {
        const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
        const selectedCollection = zoteroPane.getSelectedCollection();

        if (selectedCollection) {
          const status = getSyllabusStatus(item, selectedCollection.id);
          // Return sortable value with status encoded: "0_essential", "1_recommended", etc.
          // This ensures proper sort order: Essential < Recommended < Optional < Blank
          // The prefix determines sort order, the suffix is the actual status for display
          if (status === SyllabusStatus.ESSENTIAL) return "0_essential";
          if (status === SyllabusStatus.RECOMMENDED) return "1_recommended";
          if (status === SyllabusStatus.OPTIONAL) return "2_optional";
          return "3_"; // empty/blank
        }

        // If not in a collection view, return empty
        return "3_";
      },
      renderCell: (index, data, column, isFirstColumn, doc) => {
        // Parse the data to extract the status for display
        // data format: "0_essential", "1_recommended", "2_optional", or "3_"
        const parts = String(data).split("_");
        const status = parts.length > 1 ? parts[1] : "";

        const container = doc.createElement("span");
        container.className = `cell ${column.className}`;
        container.style.display = "flex";
        container.style.alignItems = "center";
        container.style.gap = "6px";

        if (status && STATUS_LABELS[status as SyllabusStatus]) {
          const statusEnum = status as SyllabusStatus;
          // Create colored dot
          const dot = doc.createElement("span");
          dot.style.width = "8px";
          dot.style.height = "8px";
          dot.style.borderRadius = "50%";
          dot.style.backgroundColor = STATUS_COLORS[statusEnum];
          dot.style.flexShrink = "0";
          container.appendChild(dot);

          // Create text label
          const label = doc.createElement("span");
          label.textContent = STATUS_LABELS[statusEnum];
          container.appendChild(label);
        }

        return container;
      },
      onEdit: async (item: Zotero.Item, dataKey: string, newValue: string) => {
        const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
        const selectedCollection = zoteroPane.getSelectedCollection();

        if (!selectedCollection) {
          ztoolkit.log("No collection selected, cannot update status");
          return;
        }

        // Validate the status value
        if (
          newValue &&
          ![SyllabusStatus.ESSENTIAL, SyllabusStatus.RECOMMENDED, SyllabusStatus.OPTIONAL].includes(newValue as SyllabusStatus)
        ) {
          ztoolkit.log(`Invalid status value: ${newValue}`);
          return;
        }

        await setSyllabusStatus(
          item,
          selectedCollection.id,
          newValue as SyllabusStatus | "",
        );
        await item.saveTx();

        // Refresh the item tree to show the updated value
        zoteroPane.refresh();
      },
    });
  }

  @example
  static async registerSyllabusDescriptionColumn() {
    const field = "syllabus-description";
    // @ts-expect-error - onEdit may not be in types but is supported by Zotero API
    await Zotero.ItemTreeManager.registerColumns({
      pluginID: addon.data.config.addonID,
      dataKey: field,
      label: "Syllabus Description",
      dataProvider: (item: Zotero.Item, dataKey: string) => {
        const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
        const selectedCollection = zoteroPane.getSelectedCollection();

        if (selectedCollection) {
          return getSyllabusDescription(item, selectedCollection.id);
        }

        // If not in a collection view, return empty
        return "";
      },
      onEdit: async (item: Zotero.Item, dataKey: string, newValue: string) => {
        const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
        const selectedCollection = zoteroPane.getSelectedCollection();

        if (!selectedCollection) {
          ztoolkit.log("No collection selected, cannot update description");
          return;
        }

        await setSyllabusDescription(item, selectedCollection.id, newValue);
        await item.saveTx();

        // Refresh the item tree to show the updated value
        zoteroPane.refresh();
      },
    });
  }

  @example
  static async registerSyllabusClassNumberColumn() {
    const field = "syllabus-class-number";
    // @ts-expect-error - onEdit may not be in types but is supported by Zotero API
    await Zotero.ItemTreeManager.registerColumns({
      pluginID: addon.data.config.addonID,
      dataKey: field,
      label: "Class No.",
      dataProvider: (item: Zotero.Item, dataKey: string) => {
        const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
        const selectedCollection = zoteroPane.getSelectedCollection();

        if (selectedCollection) {
          const classNumber = getSyllabusClassNumber(
            item,
            selectedCollection.id,
          );
          const status = getSyllabusStatus(item, selectedCollection.id);

          // Get status sort order: 0=essential, 1=recommended, 2=optional, 3=blank
          let statusOrder = "3"; // default to blank
          if (status === SyllabusStatus.ESSENTIAL) statusOrder = "0";
          else if (status === SyllabusStatus.RECOMMENDED) statusOrder = "1";
          else if (status === SyllabusStatus.OPTIONAL) statusOrder = "2";

          // Return composite sortable value: "classNumber_statusOrder"
          // Pad class number to 5 digits for proper numeric sorting (supports up to 99999)
          // Items without class number get "99999" to sort last
          const paddedClassNumber =
            classNumber !== undefined
              ? String(classNumber).padStart(5, "0")
              : "99999";
          return `${paddedClassNumber}_${statusOrder}`;
        }

        // If not in a collection view, return empty
        return "99999_3";
      },
      renderCell: (index, data, column, isFirstColumn, doc) => {
        // Parse the composite value to extract just the class number for display
        // data format: "00001_0" or "99999_3"
        const parts = String(data).split("_");
        const classNumberStr = parts[0];

        // If it's the "no class number" placeholder, display empty
        if (classNumberStr === "99999") {
          const span = doc.createElement("span");
          span.className = `cell ${column.className}`;
          span.textContent = "";
          return span;
        }

        // Remove leading zeros and display the class number
        const classNumber = parseInt(classNumberStr, 10);
        const span = doc.createElement("span");
        span.className = `cell ${column.className}`;
        span.textContent = String(classNumber);
        return span;
      },
      onEdit: async (item: Zotero.Item, dataKey: string, newValue: string) => {
        const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
        const selectedCollection = zoteroPane.getSelectedCollection();

        if (!selectedCollection) {
          ztoolkit.log("No collection selected, cannot update session number");
          return;
        }

        // Parse and validate the session number
        const trimmedValue = newValue.trim();
        if (trimmedValue === "") {
          await setSyllabusClassNumber(item, selectedCollection.id, undefined);
        } else {
          const sessionNum = parseInt(trimmedValue, 10);
          if (isNaN(sessionNum) || sessionNum < 1) {
            ztoolkit.log(`Invalid session number: ${trimmedValue}`);
            return;
          }
          await setSyllabusClassNumber(item, selectedCollection.id, sessionNum);
        }

        await item.saveTx();

        // Refresh the item tree to show the updated value
        zoteroPane.refresh();
      },
    });
  }

  @example
  static registerItemPaneCustomInfoRow() {
    Zotero.ItemPaneManager.registerInfoRow({
      rowID: "example",
      pluginID: addon.data.config.addonID,
      editable: true,
      label: {
        l10nID: getLocaleID("item-info-row-example-label"),
      },
      position: "afterCreators",
      onGetData: ({ item }) => {
        return item.getField("title");
      },
      onSetData: ({ item, value }) => {
        item.setField("title", value);
      },
    });
  }

  @example
  static registerSyllabusItemPaneSection() {
    Zotero.ItemPaneManager.registerSection({
      paneID: "syllabus",
      pluginID: addon.data.config.addonID,
      header: {
        l10nID: getLocaleID("item-section-syllabus-head-text"),
        icon: "chrome://zotero/skin/16/universal/book.svg",
      },
      sidenav: {
        l10nID: getLocaleID("item-section-syllabus-sidenav-tooltip"),
        icon: "chrome://zotero/skin/20/universal/book.svg",
      },
      onItemChange: ({ item, setEnabled, tabType }) => {
        // Only enable in library view (not reader)
        const enabled = tabType === "library" && item?.isRegularItem();
        setEnabled(enabled);
        return true;
      },
      onRender: ({ body, item, editable }) => {
        const zoteroPane = ztoolkit.getGlobal("ZoteroPane");
        const selectedCollection = zoteroPane.getSelectedCollection();
        const doc = body.ownerDocument || ztoolkit.getGlobal("document");

        // Clear previous content
        body.textContent = "";

        if (!selectedCollection) {
          const message = ztoolkit.UI.createElement(doc, "div", {
            namespace: "html",
            properties: {
              innerText: "Select a collection to view syllabus settings",
            },
            styles: {
              padding: "10px",
              color: "#666",
            },
          });
          body.appendChild(message);
          return;
        }

        const collectionId = selectedCollection.id;
        const currentStatus = getSyllabusStatus(item, collectionId);
        const currentDescription = getSyllabusDescription(item, collectionId);
        const currentclassNumber = getSyllabusClassNumber(
          item,
          collectionId,
        );

        // Create container
        const container = ztoolkit.UI.createElement(doc, "div", {
          namespace: "html",
          styles: {
            padding: "10px",
            display: "flex",
            flexDirection: "column",
            gap: "15px",
          },
        });

        // Status dropdown
        const statusLabel = ztoolkit.UI.createElement(doc, "label", {
          namespace: "html",
          properties: {
            innerText: "Status:",
          },
          styles: {
            fontWeight: "bold",
            marginBottom: "5px",
          },
        });
        container.appendChild(statusLabel);

        const statusSelect = ztoolkit.UI.createElement(doc, "select", {
          namespace: "html",
          id: "syllabus-status-select",
          attributes: {
            disabled: !editable ? "true" : undefined,
          },
          styles: {
            padding: "5px",
            fontSize: "13px",
            width: "100%",
          },
        });

        const options = [
          { value: "", label: "(None)" },
          {
            value: SyllabusStatus.ESSENTIAL,
            label: STATUS_LABELS[SyllabusStatus.ESSENTIAL],
            color: STATUS_COLORS[SyllabusStatus.ESSENTIAL],
          },
          {
            value: SyllabusStatus.RECOMMENDED,
            label: STATUS_LABELS[SyllabusStatus.RECOMMENDED],
            color: STATUS_COLORS[SyllabusStatus.RECOMMENDED],
          },
          {
            value: SyllabusStatus.OPTIONAL,
            label: STATUS_LABELS[SyllabusStatus.OPTIONAL],
            color: STATUS_COLORS[SyllabusStatus.OPTIONAL],
          },
        ];

        options.forEach((opt) => {
          const option = ztoolkit.UI.createElement(doc, "option", {
            namespace: "html",
            properties: {
              value: opt.value,
              innerText: opt.label,
              selected: opt.value === currentStatus,
            },
            styles: opt.color
              ? {
                color: opt.color,
                fontWeight: "500",
              }
              : undefined,
          });
          statusSelect.appendChild(option);
        });

        if (editable) {
          statusSelect.addEventListener("change", async (e) => {
            const target = e.target as HTMLSelectElement;
            await setSyllabusStatus(item, collectionId, target.value as any);
            await item.saveTx();
            zoteroPane.refresh();
          });
        }

        container.appendChild(statusSelect);

        // Session number input
        const sessionLabel = ztoolkit.UI.createElement(doc, "label", {
          namespace: "html",
          properties: {
            innerText: "Class No.:",
          },
          styles: {
            fontWeight: "bold",
            marginTop: "10px",
            marginBottom: "5px",
          },
        });
        container.appendChild(sessionLabel);

        const sessionInput = ztoolkit.UI.createElement(doc, "input", {
          namespace: "html",
          id: "syllabus-class-number-input",
          attributes: {
            type: "number",
            min: "1",
            step: "1",
            disabled: !editable ? "true" : undefined,
            placeholder: "e.g., 1, 2, 3...",
          },
          properties: {
            value: currentclassNumber?.toString() || "",
          },
          styles: {
            padding: "5px",
            fontSize: "13px",
            width: "100%",
          },
        }) as HTMLInputElement;

        if (editable) {
          sessionInput.addEventListener("change", async () => {
            const value = sessionInput.value.trim();
            const sessionNum = value ? parseInt(value, 10) : undefined;
            if (value && (isNaN(sessionNum!) || sessionNum! < 1)) {
              // Invalid input, reset to current value
              sessionInput.value = currentclassNumber?.toString() || "";
              return;
            }
            await setSyllabusClassNumber(item, collectionId, sessionNum);
            await item.saveTx();
            zoteroPane.refresh();
          });
        }

        container.appendChild(sessionInput);

        // Description textarea
        const descLabel = ztoolkit.UI.createElement(doc, "label", {
          namespace: "html",
          properties: {
            innerText: "Description:",
          },
          styles: {
            fontWeight: "bold",
            marginTop: "10px",
            marginBottom: "5px",
          },
        });
        container.appendChild(descLabel);

        const descTextarea = ztoolkit.UI.createElement(doc, "textarea", {
          namespace: "html",
          id: "syllabus-description-textarea",
          attributes: {
            disabled: !editable ? "true" : undefined,
            rows: "4",
          },
          styles: {
            padding: "5px",
            fontSize: "13px",
            width: "100%",
            resize: "vertical",
            fontFamily: "inherit",
          },
        }) as HTMLTextAreaElement;

        // Set value after creation
        descTextarea.value = currentDescription;

        if (editable) {
          let saveTimeout: ReturnType<typeof setTimeout> | undefined;
          descTextarea.addEventListener("input", async () => {
            // Debounce saves
            if (saveTimeout) {
              clearTimeout(saveTimeout);
            }
            saveTimeout = setTimeout(async () => {
              await setSyllabusDescription(item, collectionId, descTextarea.value);
              await item.saveTx();
              zoteroPane.refresh();
            }, 500);
          });
        }

        container.appendChild(descTextarea);

        body.appendChild(container);
      },
    });
  }

  @example
  static registerItemPaneSection() {
    Zotero.ItemPaneManager.registerSection({
      paneID: "example",
      pluginID: addon.data.config.addonID,
      header: {
        l10nID: getLocaleID("item-section-example1-head-text"),
        icon: "chrome://zotero/skin/16/universal/book.svg",
      },
      sidenav: {
        l10nID: getLocaleID("item-section-example1-sidenav-tooltip"),
        icon: "chrome://zotero/skin/20/universal/save.svg",
      },
      onRender: ({ body, item, editable, tabType }) => {
        body.textContent = JSON.stringify({
          id: item?.id,
          editable,
          tabType,
        });
      },
    });
  }

  @example
  static async registerReaderItemPaneSection() {
    Zotero.ItemPaneManager.registerSection({
      paneID: "reader-example",
      pluginID: addon.data.config.addonID,
      header: {
        l10nID: getLocaleID("item-section-example2-head-text"),
        // Optional
        l10nArgs: `{"status": "Initialized"}`,
        // Can also have a optional dark icon
        icon: "chrome://zotero/skin/16/universal/book.svg",
      },
      sidenav: {
        l10nID: getLocaleID("item-section-example2-sidenav-tooltip"),
        icon: "chrome://zotero/skin/20/universal/save.svg",
      },
      // Optional
      bodyXHTML:
        '<html:h1 id="test">THIS IS TEST</html:h1><browser disableglobalhistory="true" remote="true" maychangeremoteness="true" type="content" flex="1" id="browser" style="width: 180%; height: 280px"/>',
      // Optional, Called when the section is first created, must be synchronous
      onInit: ({ item }) => {
        ztoolkit.log("Section init!", item?.id);
      },
      // Optional, Called when the section is destroyed, must be synchronous
      onDestroy: (props) => {
        ztoolkit.log("Section destroy!");
      },
      // Optional, Called when the section data changes (setting item/mode/tabType/inTrash), must be synchronous. return false to cancel the change
      onItemChange: ({ item, setEnabled, tabType }) => {
        ztoolkit.log(`Section item data changed to ${item?.id}`);
        setEnabled(tabType === "reader");
        return true;
      },
      // Called when the section is asked to render, must be synchronous.
      onRender: ({
        body,
        item,
        setL10nArgs,
        setSectionSummary,
        setSectionButtonStatus,
      }) => {
        ztoolkit.log("Section rendered!", item?.id);
        const title = body.querySelector("#test") as HTMLElement;
        title.style.color = "red";
        title.textContent = "LOADING";
        setL10nArgs(`{ "status": "Loading" }`);
        setSectionSummary("loading!");
        setSectionButtonStatus("test", { hidden: true });
      },
      // Optional, can be asynchronous.
      onAsyncRender: async ({
        body,
        item,
        setL10nArgs,
        setSectionSummary,
        setSectionButtonStatus,
      }) => {
        ztoolkit.log("Section secondary render start!", item?.id);
        await Zotero.Promise.delay(1000);
        ztoolkit.log("Section secondary render finish!", item?.id);
        const title = body.querySelector("#test") as HTMLElement;
        title.style.color = "green";
        title.textContent = item.getField("title");
        setL10nArgs(`{ "status": "Loaded" }`);
        setSectionSummary("rendered!");
        setSectionButtonStatus("test", { hidden: false });
      },
      // Optional, Called when the section is toggled. Can happen anytime even if the section is not visible or not rendered
      onToggle: ({ item }) => {
        ztoolkit.log("Section toggled!", item?.id);
      },
      // Optional, Buttons to be shown in the section header
      sectionButtons: [
        {
          type: "test",
          icon: "chrome://zotero/skin/16/universal/empty-trash.svg",
          l10nID: getLocaleID("item-section-example2-button-tooltip"),
          onClick: ({ item, paneID }) => {
            ztoolkit.log("Section clicked!", item?.id);
            Zotero.ItemPaneManager.unregisterSection(paneID);
          },
        },
      ],
    });
  }
}

export class PromptExampleFactory {
  @example
  static registerNormalCommandExample() {
    ztoolkit.Prompt.register([
      {
        name: "Normal Command Test",
        label: "Plugin Template",
        callback(prompt) {
          ztoolkit.getGlobal("alert")("Command triggered!");
        },
      },
    ]);
  }

  @example
  static registerAnonymousCommandExample(window: Window) {
    ztoolkit.Prompt.register([
      {
        id: "search",
        callback: async (prompt) => {
          // https://github.com/zotero/zotero/blob/7262465109c21919b56a7ab214f7c7a8e1e63909/chrome/content/zotero/integration/quickFormat.js#L589
          function getItemDescription(item: Zotero.Item) {
            const nodes = [];
            let str = "";
            let author,
              authorDate = "";
            if (item.firstCreator) {
              author = authorDate = item.firstCreator;
            }
            let date = item.getField("date", true, true) as string;
            if (date && (date = date.substr(0, 4)) !== "0000") {
              authorDate += " (" + parseInt(date) + ")";
            }
            authorDate = authorDate.trim();
            if (authorDate) nodes.push(authorDate);

            const publicationTitle = item.getField(
              "publicationTitle",
              false,
              true,
            );
            if (publicationTitle) {
              nodes.push(`<i>${publicationTitle}</i>`);
            }
            let volumeIssue = item.getField("volume");
            const issue = item.getField("issue");
            if (issue) volumeIssue += "(" + issue + ")";
            if (volumeIssue) nodes.push(volumeIssue);

            const publisherPlace = [];
            let field;
            if ((field = item.getField("publisher")))
              publisherPlace.push(field);
            if ((field = item.getField("place"))) publisherPlace.push(field);
            if (publisherPlace.length) nodes.push(publisherPlace.join(": "));

            const pages = item.getField("pages");
            if (pages) nodes.push(pages);

            if (!nodes.length) {
              const url = item.getField("url");
              if (url) nodes.push(url);
            }

            // compile everything together
            for (let i = 0, n = nodes.length; i < n; i++) {
              const node = nodes[i];

              if (i != 0) str += ", ";

              if (typeof node === "object") {
                const label =
                  Zotero.getMainWindow().document.createElement("label");
                label.setAttribute("value", str);
                label.setAttribute("crop", "end");
                str = "";
              } else {
                str += node;
              }
            }
            if (str.length) str += ".";
            return str;
          }
          function filter(ids: number[]) {
            ids = ids.filter(async (id) => {
              const item = (await Zotero.Items.getAsync(id)) as Zotero.Item;
              return item.isRegularItem() && !(item as any).isFeedItem;
            });
            return ids;
          }
          const text = prompt.inputNode.value;
          prompt.showTip("Searching...");
          const s = new Zotero.Search();
          s.addCondition("quicksearch-titleCreatorYear", "contains", text);
          s.addCondition("itemType", "isNot", "attachment");
          let ids = await s.search();
          // prompt.exit will remove current container element.
          // @ts-expect-error ignore
          prompt.exit();
          const container = prompt.createCommandsContainer();
          container.classList.add("suggestions");
          ids = filter(ids);
          console.log(ids.length);
          if (ids.length == 0) {
            const s = new Zotero.Search();
            const operators = [
              "is",
              "isNot",
              "true",
              "false",
              "isInTheLast",
              "isBefore",
              "isAfter",
              "contains",
              "doesNotContain",
              "beginsWith",
            ];
            let hasValidCondition = false;
            let joinMode = "all";
            if (/\s*\|\|\s*/.test(text)) {
              joinMode = "any";
            }
            text.split(/\s*(&&|\|\|)\s*/g).forEach((conditinString: string) => {
              const conditions = conditinString.split(/\s+/g);
              if (
                conditions.length == 3 &&
                operators.indexOf(conditions[1]) != -1
              ) {
                hasValidCondition = true;
                s.addCondition(
                  "joinMode",
                  joinMode as _ZoteroTypes.Search.Operator,
                  "",
                );
                s.addCondition(
                  conditions[0] as string,
                  conditions[1] as _ZoteroTypes.Search.Operator,
                  conditions[2] as string,
                );
              }
            });
            if (hasValidCondition) {
              ids = await s.search();
            }
          }
          ids = filter(ids);
          console.log(ids.length);
          if (ids.length > 0) {
            ids.forEach((id: number) => {
              const item = Zotero.Items.get(id);
              const title = item.getField("title");
              const ele = ztoolkit.UI.createElement(window.document!, "div", {
                namespace: "html",
                classList: ["command"],
                listeners: [
                  {
                    type: "mousemove",
                    listener: function () {
                      // @ts-expect-error ignore
                      prompt.selectItem(this);
                    },
                  },
                  {
                    type: "click",
                    listener: () => {
                      prompt.promptNode.style.display = "none";
                      ztoolkit.getGlobal("Zotero_Tabs").select("zotero-pane");
                      ztoolkit.getGlobal("ZoteroPane").selectItem(item.id);
                    },
                  },
                ],
                styles: {
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "start",
                },
                children: [
                  {
                    tag: "span",
                    styles: {
                      fontWeight: "bold",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    },
                    properties: {
                      innerText: title,
                    },
                  },
                  {
                    tag: "span",
                    styles: {
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    },
                    properties: {
                      innerHTML: getItemDescription(item),
                    },
                  },
                ],
              });
              container.appendChild(ele);
            });
          } else {
            // @ts-expect-error ignore
            prompt.exit();
            prompt.showTip("Not Found.");
          }
        },
      },
    ]);
  }

  @example
  static registerConditionalCommandExample() {
    ztoolkit.Prompt.register([
      {
        name: "Conditional Command Test",
        label: "Plugin Template",
        // The when function is executed when Prompt UI is woken up by `Shift + P`, and this command does not display when false is returned.
        when: () => {
          const items = ztoolkit.getGlobal("ZoteroPane").getSelectedItems();
          return items.length > 0;
        },
        callback(prompt) {
          prompt.inputNode.placeholder = "Hello World!";
          const items = ztoolkit.getGlobal("ZoteroPane").getSelectedItems();
          ztoolkit.getGlobal("alert")(
            `You select ${items.length} items!\n\n${items
              .map(
                (item, index) =>
                  String(index + 1) + ". " + item.getDisplayTitle(),
              )
              .join("\n")}`,
          );
        },
      },
    ]);
  }
}

export class HelperExampleFactory {
  @example
  static async dialogExample() {
    const dialogData: { [key: string | number]: any } = {
      inputValue: "test",
      checkboxValue: true,
      loadCallback: () => {
        ztoolkit.log(dialogData, "Dialog Opened!");
      },
      unloadCallback: () => {
        ztoolkit.log(dialogData, "Dialog closed!");
      },
    };
    const dialogHelper = new ztoolkit.Dialog(10, 2)
      .addCell(0, 0, {
        tag: "h1",
        properties: { innerHTML: "Helper Examples" },
      })
      .addCell(1, 0, {
        tag: "h2",
        properties: { innerHTML: "Dialog Data Binding" },
      })
      .addCell(2, 0, {
        tag: "p",
        properties: {
          innerHTML:
            "Elements with attribute 'data-bind' are binded to the prop under 'dialogData' with the same name.",
        },
        styles: {
          width: "200px",
        },
      })
      .addCell(3, 0, {
        tag: "label",
        namespace: "html",
        attributes: {
          for: "dialog-checkbox",
        },
        properties: { innerHTML: "bind:checkbox" },
      })
      .addCell(
        3,
        1,
        {
          tag: "input",
          namespace: "html",
          id: "dialog-checkbox",
          attributes: {
            "data-bind": "checkboxValue",
            "data-prop": "checked",
            type: "checkbox",
          },
          properties: { label: "Cell 1,0" },
        },
        false,
      )
      .addCell(4, 0, {
        tag: "label",
        namespace: "html",
        attributes: {
          for: "dialog-input",
        },
        properties: { innerHTML: "bind:input" },
      })
      .addCell(
        4,
        1,
        {
          tag: "input",
          namespace: "html",
          id: "dialog-input",
          attributes: {
            "data-bind": "inputValue",
            "data-prop": "value",
            type: "text",
          },
        },
        false,
      )
      .addCell(5, 0, {
        tag: "h2",
        properties: { innerHTML: "Toolkit Helper Examples" },
      })
      .addCell(
        6,
        0,
        {
          tag: "button",
          namespace: "html",
          attributes: {
            type: "button",
          },
          listeners: [
            {
              type: "click",
              listener: (e: Event) => {
                addon.hooks.onDialogEvents("clipboardExample");
              },
            },
          ],
          children: [
            {
              tag: "div",
              styles: {
                padding: "2.5px 15px",
              },
              properties: {
                innerHTML: "example:clipboard",
              },
            },
          ],
        },
        false,
      )
      .addCell(
        7,
        0,
        {
          tag: "button",
          namespace: "html",
          attributes: {
            type: "button",
          },
          listeners: [
            {
              type: "click",
              listener: (e: Event) => {
                addon.hooks.onDialogEvents("filePickerExample");
              },
            },
          ],
          children: [
            {
              tag: "div",
              styles: {
                padding: "2.5px 15px",
              },
              properties: {
                innerHTML: "example:filepicker",
              },
            },
          ],
        },
        false,
      )
      .addCell(
        8,
        0,
        {
          tag: "button",
          namespace: "html",
          attributes: {
            type: "button",
          },
          listeners: [
            {
              type: "click",
              listener: (e: Event) => {
                addon.hooks.onDialogEvents("progressWindowExample");
              },
            },
          ],
          children: [
            {
              tag: "div",
              styles: {
                padding: "2.5px 15px",
              },
              properties: {
                innerHTML: "example:progressWindow",
              },
            },
          ],
        },
        false,
      )
      .addCell(
        9,
        0,
        {
          tag: "button",
          namespace: "html",
          attributes: {
            type: "button",
          },
          listeners: [
            {
              type: "click",
              listener: (e: Event) => {
                addon.hooks.onDialogEvents("vtableExample");
              },
            },
          ],
          children: [
            {
              tag: "div",
              styles: {
                padding: "2.5px 15px",
              },
              properties: {
                innerHTML: "example:virtualized-table",
              },
            },
          ],
        },
        false,
      )
      .addButton("Confirm", "confirm")
      .addButton("Cancel", "cancel")
      .addButton("Help", "help", {
        noClose: true,
        callback: (e) => {
          dialogHelper.window?.alert(
            "Help Clicked! Dialog will not be closed.",
          );
        },
      })
      .setDialogData(dialogData)
      .open("Dialog Example");
    addon.data.dialog = dialogHelper;
    await dialogData.unloadLock.promise;
    addon.data.dialog = undefined;
    if (addon.data.alive)
      ztoolkit.getGlobal("alert")(
        `Close dialog with ${dialogData._lastButtonId}.\nCheckbox: ${dialogData.checkboxValue}\nInput: ${dialogData.inputValue}.`,
      );
    ztoolkit.log(dialogData);
  }

  @example
  static clipboardExample() {
    new ztoolkit.Clipboard()
      .addText(
        "![Plugin Template](https://github.com/windingwind/zotero-plugin-template)",
        "text/unicode",
      )
      .addText(
        '<a href="https://github.com/windingwind/zotero-plugin-template">Plugin Template</a>',
        "text/html",
      )
      .copy();
    ztoolkit.getGlobal("alert")("Copied!");
  }

  @example
  static async filePickerExample() {
    const path = await new ztoolkit.FilePicker(
      "Import File",
      "open",
      [
        ["PNG File(*.png)", "*.png"],
        ["Any", "*.*"],
      ],
      "image.png",
    ).open();
    ztoolkit.getGlobal("alert")(`Selected ${path}`);
  }

  @example
  static progressWindowExample() {
    new ztoolkit.ProgressWindow(addon.data.config.addonName)
      .createLine({
        text: "ProgressWindow Example!",
        type: "success",
        progress: 100,
      })
      .show();
  }

  @example
  static vtableExample() {
    ztoolkit.getGlobal("alert")("See src/modules/preferenceScript.ts");
  }
}
