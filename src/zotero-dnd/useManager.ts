import { useContext } from "preact/hooks";
import { ZoteroDndContext, type ZoteroDndManager } from "./context";

export function useDndManager(): ZoteroDndManager {
  const manager = useContext(ZoteroDndContext);
  if (!manager) {
    throw new Error("zotero-dnd: useDndManager requires <DndProvider>");
  }
  return manager;
}
