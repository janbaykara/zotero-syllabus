// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from "preact";
import { useCallback, useState } from "preact/hooks";
import { getString, getUiDir } from "../utils/locale";
import { Priority } from "../utils/schemas";
import { PrioritiesEditor } from "./PrioritiesEditor";
import {
  clonePriorities,
  getBuiltInDefaultPriorities,
  getGlobalDefaultPriorities,
  setGlobalDefaultPriorities,
} from "./defaultPriorities";
import { openPreactDialog } from "../utils/preactDialog";

function GlobalPrioritiesDialogBody() {
  const [priorities, setPriorities] = useState<Priority[]>(() =>
    getGlobalDefaultPriorities(),
  );

  const handleChange = useCallback((next: Priority[]) => {
    setPriorities(next);
    setGlobalDefaultPriorities(next);
  }, []);

  const handleReset = useCallback(() => {
    // Load built-ins into the editor (and persist) so the user can review/tweak.
    handleChange(clonePriorities(getBuiltInDefaultPriorities()));
  }, [handleChange]);

  return (
    <div className="p-5 space-y-6" dir={getUiDir()}>
      <div className="space-y-3">
        <p className="text-base leading-snug text-secondary m-0">
          {getString("settings-priorities-global-desc")}
        </p>
        <button
          type="button"
          onClick={handleReset}
          className="text-base text-accent-blue hover:underline cursor-pointer bg-transparent border-0 p-0"
        >
          {getString("settings-priorities-global-reset")}
        </button>
      </div>
      <PrioritiesEditor priorities={priorities} onChange={handleChange} />
    </div>
  );
}

/** Open (or focus) the global priority defaults editor in its own window. */
export function openGlobalPrioritiesDialog(): void {
  openPreactDialog({
    title: getString("settings-priorities-global-title"),
    rootId: "syllabus-global-priorities-root",
    singleton: true,
    content: () => <GlobalPrioritiesDialogBody />,
    buttons: [
      {
        id: "done",
        label: getString("settings-priorities-global-done"),
      },
    ],
    features: {
      width: 580,
      height: 520,
      noDialogMode: true,
      fitContent: false,
    },
  });
}
