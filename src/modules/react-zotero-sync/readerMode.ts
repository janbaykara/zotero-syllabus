import { useBooleanPref } from "./booleanPref";

export function useZoteroReaderMode() {
  return useBooleanPref("readerMode");
}
