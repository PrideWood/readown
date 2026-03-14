<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { storage } from '../composables/storage';

type TextSize = 'small' | 'medium' | 'large';

const STORAGE_KEY = 'readown.text-size.v1';
const sizes: TextSize[] = ['small', 'medium', 'large'];
const current = ref<TextSize>('medium');

function apply(size: TextSize): void {
  current.value = size;
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-text-size', size);
  }
  storage.set<TextSize>(STORAGE_KEY, size);
}

onMounted(() => {
  const saved = storage.get<TextSize>(STORAGE_KEY, 'medium');
  apply(sizes.includes(saved) ? saved : 'medium');
});
</script>

<template>
  <div class="text-size-control" aria-label="Text size control">
    <button
      v-for="size in sizes"
      :key="size"
      type="button"
      class="text-size-btn"
      :class="{ active: current === size }"
      @click="apply(size)"
    >
      {{ size === 'small' ? 'S' : size === 'medium' ? 'M' : 'L' }}
    </button>
  </div>
</template>
