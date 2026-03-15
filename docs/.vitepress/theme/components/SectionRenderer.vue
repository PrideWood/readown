<script setup lang="ts">
import { computed } from 'vue';
import { useData } from 'vitepress';
import { getSectionByRelativePath } from '../composables/content';
import { useProgressStore } from '../composables/progress';
import McqReadingSection from './McqReadingSection.vue';
import MatchingSection from './MatchingSection.vue';
import ClozeSection from './ClozeSection.vue';
import TranslationSection from './TranslationSection.vue';
import SelectionSaveOverlay from './SelectionSaveOverlay.vue';

const { page } = useData();
const progress = useProgressStore();

const current = computed(() => getSectionByRelativePath(page.value.relativePath));
const meta = computed(() => current.value?.meta);
const sectionData = computed(() => current.value?.data ?? {});
const saved = computed(() => (meta.value ? progress.getProgress(meta.value.sectionId) : undefined));

function onSubmit(payload: { answers: Record<string, string>; score: number; total: number }): void {
  if (!meta.value) return;
  progress.saveProgress({
    sectionId: meta.value.sectionId,
    done: true,
    score: payload.score,
    total: payload.total,
    answers: payload.answers,
    submittedAt: new Date().toISOString()
  });
}

function onReset(): void {
  if (!meta.value) return;
  progress.clearProgress(meta.value.sectionId);
}
</script>

<template>
  <section v-if="meta" class="read-grid section-layout" :class="`section-${meta.type}`">
    <McqReadingSection
      v-if="meta.type === 'mcq-reading'"
      :passage="(sectionData as any).passage || ''"
      :questions="(sectionData as any).questions || []"
      :page-key="page.relativePath"
      :initial-answers="saved?.answers || {}"
      @submit="onSubmit"
      @reset="onReset"
    />

    <MatchingSection
      v-else-if="meta.type === 'matching'"
      :interactive="meta.interactive"
      :instructions="(sectionData as any).instructions || ''"
      :paragraphs="(sectionData as any).paragraphs || []"
      :statements="(sectionData as any).statements || []"
      :page-key="page.relativePath"
      :initial-answers="saved?.answers || {}"
      @submit="onSubmit"
      @reset="onReset"
    />

    <ClozeSection
      v-else-if="meta.type === 'cloze'"
      :interactive="meta.interactive"
      :passage="(sectionData as any).passage || ''"
      :blanks="(sectionData as any).blanks || []"
      :word-bank="(sectionData as any).wordBank || []"
      :page-key="page.relativePath"
      :initial-answers="saved?.answers || {}"
      @submit="onSubmit"
      @reset="onReset"
    />

    <TranslationSection
      v-else-if="meta.type === 'translation'"
      :source-text="(sectionData as any).sourceText || (sectionData as any).prompt || ''"
      :reference="(sectionData as any).reference || ''"
      :notes="(sectionData as any).notes || []"
    />

    <article v-else class="card">Unsupported section type.</article>

    <SelectionSaveOverlay :section-id="meta.sectionId" :page-key="page.relativePath" />
  </section>

  <article v-else class="card">Section metadata not found. Run <code>npm run parse:sections</code>.</article>
</template>
