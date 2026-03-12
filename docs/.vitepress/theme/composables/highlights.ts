import { storage } from './storage';

const STORAGE_KEY = 'readown.highlights.v1';

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'orange';

export interface TextHighlight {
  id: string;
  pageKey: string;
  rootIndex: number;
  start: number;
  end: number;
  color: HighlightColor;
  createdAt: string;
}

type HighlightMap = Record<string, TextHighlight[]>;

function loadAll(): HighlightMap {
  return storage.get<HighlightMap>(STORAGE_KEY, {});
}

function persist(all: HighlightMap): void {
  storage.set(STORAGE_KEY, all);
}

function emitHighlightChanged(pageKey: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('readown:highlights-changed', { detail: { pageKey } }));
}

export function getPageHighlights(pageKey: string): TextHighlight[] {
  return [...(loadAll()[pageKey] ?? [])].sort((a, b) => a.start - b.start);
}

export function addPageHighlight(pageKey: string, highlight: Omit<TextHighlight, 'id' | 'createdAt' | 'pageKey'>): TextHighlight {
  const all = loadAll();
  const next: TextHighlight = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: new Date().toISOString(),
    pageKey,
    ...highlight
  };

  all[pageKey] = [...(all[pageKey] ?? []), next].sort((a, b) => a.start - b.start);
  persist(all);
  emitHighlightChanged(pageKey);
  return next;
}

export function removePageHighlight(pageKey: string, highlightId: string): void {
  const all = loadAll();
  all[pageKey] = (all[pageKey] ?? []).filter((item) => item.id !== highlightId);
  if (all[pageKey].length === 0) delete all[pageKey];
  persist(all);
  emitHighlightChanged(pageKey);
}

export function clearPageHighlights(pageKey: string): void {
  const all = loadAll();
  delete all[pageKey];
  persist(all);
  emitHighlightChanged(pageKey);
}
