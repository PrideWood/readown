<script setup lang="ts">
import { computed, ref } from 'vue';
import { useNotebookStore } from '../composables/notebook';

const { items, total, removeItem } = useNotebookStore();
const keyword = ref('');

const filteredItems = computed(() => {
  const q = keyword.value.trim().toLowerCase();
  if (!q) return items.value;
  return items.value.filter((item) => {
    return (
      item.text.toLowerCase().includes(q) ||
      item.context.toLowerCase().includes(q) ||
      item.paperId.toLowerCase().includes(q)
    );
  });
});

function escapeCsv(value: string): string {
  const text = value ?? '';
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function formatExportTimestamp(date: Date): string {
  const pad = (num: number) => String(num).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

function exportCsv(): void {
  if (typeof window === 'undefined' || items.value.length === 0) return;

  const header = ['word_or_phrase', 'context_sentence'];
  const rows = items.value.map((item) => [item.text, item.context]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => escapeCsv(cell ?? '')).join(','))
    .join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const timestamp = formatExportTimestamp(new Date());
  anchor.href = url;
  anchor.download = `readown-notebook-${timestamp}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="read-grid">
    <article class="card">
      <h2>Vocabulary Notebook</h2>
      <div class="notebook-toolbar">
        <p>{{ filteredItems.length }}/{{ total }} item(s)</p>
        <input v-model="keyword" class="notebook-search" placeholder="Filter by word, context, or paper id" />
        <button type="button" class="notebook-export-btn" :disabled="total === 0" @click="exportCsv">
          Export All CSV
        </button>
      </div>
    </article>

    <article v-for="item in filteredItems" :key="item.id" class="card notebook-item">
      <div class="notebook-item-head">
        <h3>{{ item.text }}</h3>
        <span class="notebook-meta">{{ new Date(item.createdAt).toLocaleString() }}</span>
      </div>
      <p class="notebook-meta">Source: {{ item.paperId }}<template v-if="item.pageKey"> · {{ item.pageKey }}</template></p>
      <p class="notebook-context">{{ item.context || 'No context captured.' }}</p>
      <button type="button" @click="removeItem(item.id)">Delete</button>
    </article>

    <p v-if="filteredItems.length === 0" class="card">No vocabulary items match the current filter.</p>
  </div>
</template>
