<script setup lang="ts">
import { computed } from 'vue';
import { withBase } from 'vitepress';
import type { SectionType } from '../composables/content';
import { getSectionsByType } from '../composables/content';

const baseCards: { title: string; link: string; type: SectionType }[] = [
  { title: 'Close Reading', link: '/specialized/careful-reading/', type: 'mcq-reading' },
  { title: 'Long Matching', link: '/specialized/long-matching/', type: 'matching' },
  { title: 'Cloze', link: '/specialized/cloze/', type: 'cloze' },
  { title: 'Translation', link: '/specialized/translation/', type: 'translation' }
];

const cards = computed(() =>
  baseCards.map((card) => ({
    ...card,
    sections: getSectionsByType(card.type).length
  }))
);
</script>

<template>
  <div class="read-grid exam-cards">
    <a v-for="card in cards" :key="card.title" class="card exam-card" :href="withBase(card.link)">
      <h3>{{ card.title }}</h3>
      <div class="card-meta stacked">
        <span>{{ card.sections }} section(s)</span>
      </div>
    </a>
  </div>
</template>
