<script setup lang="ts">
import { computed } from 'vue';
import { withBase } from 'vitepress';
import { getExamSessions, getExamTypes } from '../composables/content';

const labels: Record<string, string> = {
  cet4: 'CET-4',
  cet6: 'CET-6',
  kaoyan: 'Kaoyan',
  gaokao: 'Gaokao'
};

const cards = computed(() =>
  getExamTypes().map((type) => ({
    type,
    label: labels[type] ?? type.toUpperCase(),
    sessions: getExamSessions(type).length,
    sections: getExamSessions(type).reduce((count, session) => count + session.sections.length, 0)
  }))
);
</script>

<template>
  <div class="read-grid exam-cards">
    <a v-for="card in cards" :key="card.type" class="card exam-card" :href="withBase(`/exams/${card.type}/`)">
      <h3>{{ card.label }}</h3>
      <div class="card-meta stacked">
        <span>{{ card.sessions }} session(s)</span>
        <span>{{ card.sections }} section(s)</span>
      </div>
    </a>
  </div>
</template>
