<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  prompt: string;
  reference: string;
  notes?: string[];
}>();

const show = ref(false);
</script>

<template>
  <section class="card panel-card">
    <h3>Translation</h3>
    <p class="question-explain">{{ prompt }}</p>
    <button type="button" class="option-btn" @click="show = !show">{{ show ? 'Hide' : 'Show' }} reference answer</button>
    <p v-if="show" class="question-explain">{{ reference }}</p>
    <ul v-if="show && notes && notes.length" style="margin: 0.4rem 0 0; color: var(--read-muted);">
      <li v-for="note in notes" :key="note">{{ note }}</li>
    </ul>
  </section>
</template>
