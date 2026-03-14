<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<template>
  <div class="question-panel-slot">
    <section class="card panel-card question-panel sticky-question-panel">
      <header class="question-panel-header">
        <h3>{{ title }}</h3>
        <div class="question-panel-tools">
          <slot name="tools" />
        </div>
      </header>

      <div class="question-panel-body">
        <slot />
      </div>
    </section>
  </div>
</template>
