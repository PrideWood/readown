<script setup lang="ts">
import { computed } from 'vue';
import { withBase } from 'vitepress';
import { getSessionSections } from '../composables/content';
import { useProgressStore } from '../composables/progress';

const props = defineProps<{ examType: string; session: string }>();
const { progressState } = useProgressStore();

const sections = computed(() => getSessionSections(props.examType, props.session));
</script>

<template>
  <div class="read-grid">
    <article v-for="section in sections" :key="section.sectionId" class="card paper-card">
      <h3>{{ section.title }}</h3>
      <div class="card-meta">
        <span>{{ section.part }} · {{ section.type }}</span>
        <span class="status-pill" :class="{ done: progressState[section.sectionId]?.done }">
          {{
            section.interactive
              ? progressState[section.sectionId]?.done
                ? `Done ${progressState[section.sectionId].score}/${progressState[section.sectionId].total}`
                : 'Interactive'
              : 'Reference'
          }}
        </span>
      </div>
      <a :href="withBase(section.route)">Open section</a>
    </article>

    <p v-if="sections.length === 0" class="card">No sections found in this session.</p>
  </div>
</template>
