<script setup lang="ts">
import { ref } from 'vue';
import TextSizeControl from './TextSizeControl.vue';

defineProps<{
  sourceText: string;
  reference: string;
  notes?: string[];
}>();

const show = ref(false);
</script>

<template>
  <section class="card panel-card question-panel">
    <div class="question-panel-header">
      <h3>Translation</h3>
      <div class="question-panel-tools">
        <TextSizeControl />
      </div>
    </div>
    <p class="question-explain">{{ sourceText }}</p>
    <button type="button" class="option-btn" @click="show = !show">{{ show ? 'Hide' : 'Show' }} reference answer</button>
    <p v-if="show" class="question-explain">{{ reference }}</p>
    <ul v-if="show && notes && notes.length" style="margin: 0.4rem 0 0; color: var(--read-muted);">
      <li v-for="note in notes" :key="note">{{ note }}</li>
    </ul>
  </section>
</template>
