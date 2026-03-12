import { computed, ref } from 'vue';
import { storage } from './storage';

const STORAGE_KEY = 'readown.notebook.v1';

export interface NotebookItem {
  id: string;
  text: string;
  paperId: string;
  pageKey?: string;
  context: string;
  createdAt: string;
}

const items = ref<NotebookItem[]>(storage.get(STORAGE_KEY, [] as NotebookItem[]));

function persist(): void {
  storage.set(STORAGE_KEY, items.value);
}

export function useNotebookStore() {
  function addItem(input: Omit<NotebookItem, 'id' | 'createdAt'>): void {
    const item: NotebookItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      ...input
    };
    items.value.unshift(item);
    persist();
  }

  function removeItem(id: string): void {
    items.value = items.value.filter((item) => item.id !== id);
    persist();
  }

  const total = computed(() => items.value.length);

  return {
    items,
    total,
    addItem,
    removeItem
  };
}
