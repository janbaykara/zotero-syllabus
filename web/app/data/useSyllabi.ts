import useSWR from "swr";
import { fetchJSON } from "../lib/fetch";

export function useSyllabi() {
  return useSWR("/api/syllabi", fetchJSON);
}
