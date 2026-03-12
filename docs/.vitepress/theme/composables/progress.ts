import { ref } from 'vue';
import { storage } from './storage';

const STORAGE_KEY = 'readown.progress.v2';

export interface SectionProgress {
  sectionId: string;
  done: boolean;
  score: number;
  total: number;
  answers: Record<string, string>;
  submittedAt: string;
}

type ProgressMap = Record<string, SectionProgress>;

const progressState = ref<ProgressMap>(storage.get(STORAGE_KEY, {} as ProgressMap));

function persist(): void {
  storage.set(STORAGE_KEY, progressState.value);
}

export function useProgressStore() {
  function getProgress(sectionId: string): SectionProgress | undefined {
    return progressState.value[sectionId];
  }

  function saveProgress(payload: SectionProgress): void {
    progressState.value[payload.sectionId] = payload;
    persist();
  }

  function clearProgress(sectionId: string): void {
    delete progressState.value[sectionId];
    persist();
  }

  function isDone(sectionId: string): boolean {
    return Boolean(progressState.value[sectionId]?.done);
  }

  return {
    progressState,
    getProgress,
    saveProgress,
    clearProgress,
    isDone
  };
}
