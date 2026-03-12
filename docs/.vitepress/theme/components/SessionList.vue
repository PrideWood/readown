<script setup lang="ts">
import { computed } from 'vue';
import { withBase } from 'vitepress';
import { getExamSessions } from '../composables/content';
import { useProgressStore } from '../composables/progress';

const props = defineProps<{ examType: string }>();
const { progressState } = useProgressStore();

const sessions = computed(() => getExamSessions(props.examType));

function doneCount(session: { sections: { sectionId: string; interactive: boolean }[] }): number {
  return session.sections.filter((section) => section.interactive && progressState.value[section.sectionId]?.done).length;
}

const summary = computed(() => {
  const total = sessions.value.reduce(
    (acc, session) => acc + session.sections.filter((section) => section.interactive).length,
    0
  );
  const completed = sessions.value.reduce((acc, session) => acc + doneCount(session), 0);
  return { total, completed };
});
</script>

<template>
  <div class="read-grid">
    <article class="card">
      <h3>Progress Summary</h3>
      <p>{{ summary.completed }}/{{ summary.total }} interactive sections completed</p>
    </article>

    <article v-for="session in sessions" :key="session.session" class="card session-card">
      <h3>{{ session.title || session.session }}</h3>
      <div class="card-meta">
        <span>{{ doneCount(session) }}/{{ session.sections.filter((s) => s.interactive).length }} completed</span>
        <span>{{ session.session }}</span>
      </div>
      <a :href="withBase(`/exams/${examType}/${session.session}/`)">Open session</a>
    </article>

    <p v-if="sessions.length === 0" class="card">No sessions yet.</p>
  </div>
</template>
