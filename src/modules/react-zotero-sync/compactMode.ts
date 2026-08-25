import { useBooleanPref } from "./booleanPref";

export function useZoteroCompactMode() {
  return useBooleanPref("compactMode");
}
