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
  <div class="read-grid list-layout section-list-layout">
    <a v-for="section in sections" :key="section.sectionId" class="card paper-card card-link" :href="withBase(section.route)">
      <div class="card-title-row">
        <h3>{{ section.title }}</h3>
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
    </a>

    <p v-if="sections.length === 0" class="card">No sections found in this session.</p>
  </div>
</template>
