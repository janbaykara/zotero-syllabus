import { createContext } from "preact";
import type { DragDropManager } from "@dnd-kit/abstract";

export type ZoteroDndManager = DragDropManager<any, any>;

export const ZoteroDndContext = createContext<ZoteroDndManager | null>(null);
