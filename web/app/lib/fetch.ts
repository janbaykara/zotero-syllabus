export function fetchJSON(url: string, options: RequestInit = {}) {
  return fetch(url, options).then((response) => response.json());
}
