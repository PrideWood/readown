<script setup lang="ts">
import { computed } from 'vue';
import { withBase } from 'vitepress';
import type { SectionType } from '../composables/content';
import { getSectionsByType } from '../composables/content';
import { useProgressStore } from '../composables/progress';

const props = defineProps<{ type: SectionType }>();
const { progressState } = useProgressStore();

const sections = computed(() => getSectionsByType(props.type));
</script>

<template>
  <div class="read-grid">
    <article class="card">
      <h3>Total</h3>
      <p>{{ sections.length }} section(s)</p>
    </article>

    <article v-for="section in sections" :key="section.sectionId" class="card paper-card">
      <h3>{{ section.title }}</h3>
      <div class="card-meta">
        <span>{{ section.examType.toUpperCase() }} / {{ section.session }} / {{ section.part }}</span>
        <span class="status-pill" :class="{ done: progressState[section.sectionId]?.done }">
          {{ section.interactive ? (progressState[section.sectionId]?.done ? 'Done' : 'Interactive') : 'Reference' }}
        </span>
      </div>
      <a :href="withBase(section.route)">Open section</a>
    </article>

    <p v-if="sections.length === 0" class="card">No sections found for this practice type.</p>
  </div>
</template>
