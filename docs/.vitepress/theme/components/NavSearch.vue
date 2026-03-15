<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vitepress';
import { getAllSections } from '../composables/content';

type SearchItemType = 'section' | 'session' | 'exam';

interface SearchItem {
  key: string;
  type: SearchItemType;
  title: string;
  subtitle: string;
  route: string;
  keywords: string[];
}

const router = useRouter();
const rootRef = ref<HTMLElement | null>(null);
const input = ref('');
const open = ref(false);
const activeIndex = ref(-1);

const items = computed<SearchItem[]>(() => {
  const sections = getAllSections();
  const sectionItems = sections.map((meta) => ({
    key: `section:${meta.sectionId}`,
    type: 'section' as const,
    title: meta.title,
    subtitle: `${meta.examType} · ${meta.session} · ${meta.sectionId}`,
    route: meta.route,
    keywords: [meta.title, meta.examType, meta.session, meta.sectionId, meta.part, meta.type]
  }));

  const sessionMap = new Map<string, SearchItem>();
  for (const meta of sections) {
    const key = `session:${meta.examType}:${meta.session}`;
    if (sessionMap.has(key)) continue;
    sessionMap.set(key, {
      key,
      type: 'session',
      title: `${meta.examType.toUpperCase()} ${meta.session}`,
      subtitle: 'Session',
      route: `/exams/${meta.examType}/${meta.session}/`,
      keywords: [meta.examType, meta.session, `${meta.examType}-${meta.session}`]
    });
  }

  const examMap = new Map<string, SearchItem>();
  for (const meta of sections) {
    const key = `exam:${meta.examType}`;
    if (examMap.has(key)) continue;
    examMap.set(key, {
      key,
      type: 'exam',
      title: meta.examType.toUpperCase(),
      subtitle: 'Exam',
      route: `/exams/${meta.examType}/`,
      keywords: [meta.examType]
    });
  }

  return [...sessionMap.values(), ...examMap.values(), ...sectionItems];
});

function score(item: SearchItem, q: string): number {
  const title = item.title.toLowerCase();
  const subtitle = item.subtitle.toLowerCase();
  const keywords = item.keywords.join(' ').toLowerCase();
  let s = 0;
  if (title === q) s += 120;
  if (keywords === q) s += 100;
  if (title.includes(q)) s += 60;
  if (subtitle.includes(q)) s += 20;
  if (keywords.includes(q)) s += 40;
  if (item.type === 'session') s += 8;
  if (item.type === 'section') s += 4;
  return s;
}

const results = computed(() => {
  const q = input.value.trim().toLowerCase();
  if (!q) return [];
  return items.value
    .map((item) => ({ item, score: score(item, q) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .slice(0, 10)
    .map((entry) => entry.item);
});

function goTo(item: SearchItem): void {
  router.go(item.route);
  input.value = '';
  open.value = false;
  activeIndex.value = -1;
}

function onFocus(): void {
  if (input.value.trim()) open.value = true;
}

function onInput(): void {
  open.value = input.value.trim().length > 0;
  activeIndex.value = results.value.length ? 0 : -1;
}

function onKeydown(event: KeyboardEvent): void {
  if (!open.value || !results.value.length) return;
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    activeIndex.value = (activeIndex.value + 1) % results.value.length;
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    activeIndex.value = (activeIndex.value - 1 + results.value.length) % results.value.length;
  } else if (event.key === 'Enter') {
    event.preventDefault();
    const target = results.value[Math.max(activeIndex.value, 0)];
    if (target) goTo(target);
  } else if (event.key === 'Escape') {
    open.value = false;
  }
}

function onClickOutside(event: MouseEvent): void {
  if (!rootRef.value) return;
  if (!rootRef.value.contains(event.target as Node)) {
    open.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', onClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside);
});
</script>

<template>
  <div ref="rootRef" class="nav-search">
    <input
      v-model="input"
      class="nav-search-input"
      type="search"
      placeholder="search"
      aria-label="Search exams and sessions"
      @focus="onFocus"
      @input="onInput"
      @keydown="onKeydown"
    />

    <div v-if="open" class="nav-search-dropdown">
      <button
        v-for="(item, index) in results"
        :key="item.key"
        type="button"
        class="nav-search-item"
        :class="{ active: index === activeIndex }"
        @click="goTo(item)"
      >
        <span class="nav-search-title">{{ item.title }}</span>
        <span class="nav-search-subtitle">{{ item.subtitle }}</span>
      </button>
      <p v-if="!results.length" class="nav-search-empty">No matching exam/session metadata</p>
    </div>
  </div>
</template>
