import { useBooleanPref } from "./booleanPref";

export function useReadingScheduleCollectionPref() {
  return useBooleanPref("generateReadingScheduleCollection");
}
