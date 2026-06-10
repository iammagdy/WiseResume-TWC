export const SEARCH_PREFILL_KEY = 'wr-search-prefill';
export const SEARCH_OPEN_INTENT_KEY = 'wr-search-open';

export type WorkspaceSearchOpenDetail = {
  prefill?: string;
};

export function openWorkspaceSearch(prefill = '') {
  if (prefill) {
    sessionStorage.setItem(SEARCH_PREFILL_KEY, prefill);
  } else {
    sessionStorage.removeItem(SEARCH_PREFILL_KEY);
  }
  sessionStorage.setItem(SEARCH_OPEN_INTENT_KEY, '1');
  window.dispatchEvent(
    new CustomEvent<WorkspaceSearchOpenDetail>('open-command-palette', {
      detail: { prefill },
    }),
  );
}
