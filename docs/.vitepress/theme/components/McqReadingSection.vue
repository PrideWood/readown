<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { Eraser } from 'lucide-vue-next';
import { clearPageHighlights } from '../composables/highlights';
import TextSizeControl from './TextSizeControl.vue';
import StickyQuestionPanel from './StickyQuestionPanel.vue';

interface OptionItem {
  key: string;
  text: string;
}

interface QuestionItem {
  id: string;
  prompt: string;
  options: OptionItem[];
  answer: string;
  explanation: string;
}

const props = defineProps<{
  passage: string;
  questions: QuestionItem[];
  pageKey: string;
  initialAnswers?: Record<string, string>;
}>();

const emit = defineEmits<{
  submit: [payload: { answers: Record<string, string>; score: number; total: number }];
  reset: [];
}>();

const selected = reactive<Record<string, string>>({ ...(props.initialAnswers ?? {}) });
const state = reactive({ submitted: false, score: 0 });

function isSameAnswers(a: Record<string, string>, b: Record<string, string>): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => a[key] === b[key]);
}

watch(
  () => props.initialAnswers,
  (value) => {
    const next = { ...(value ?? {}) };
    // Keep submit result visible when parent echoes back the same answers after save.
    if (state.submitted && isSameAnswers(selected, next)) return;
    for (const key of Object.keys(selected)) delete selected[key];
    Object.assign(selected, next);
    state.submitted = false;
    state.score = 0;
  }
);

const total = computed(() => props.questions.length);

function choose(id: string, option: string): void {
  if (state.submitted) return;
  selected[id] = option;
}

function submit(): void {
  const score = props.questions.reduce((acc, q) => (selected[q.id] === q.answer ? acc + 1 : acc), 0);
  state.submitted = true;
  state.score = score;
  emit('submit', { answers: { ...selected }, score, total: total.value });
}

function reset(): void {
  for (const key of Object.keys(selected)) delete selected[key];
  state.submitted = false;
  state.score = 0;
  emit('reset');
}

function cls(question: QuestionItem, option: OptionItem): string {
  if (!state.submitted) return selected[question.id] === option.key ? 'selected' : '';
  if (option.key === question.answer) return 'correct';
  if (selected[question.id] === option.key && option.key !== question.answer) return 'wrong';
  return '';
}

function clearHighlightsForPage(): void {
  clearPageHighlights(props.pageKey);
}
</script>

<template>
  <div class="paper-shell">
    <article class="card section-article">
      <div class="passage-head">
        <h3>Passage</h3>
        <button
          type="button"
          class="passage-clear-btn"
          title="Clear all highlights"
          aria-label="Clear all highlights"
          @click="clearHighlightsForPage"
        >
          <Eraser :size="16" />
        </button>
      </div>
      <p style="white-space: pre-line;">{{ passage }}</p>
    </article>

    <StickyQuestionPanel title="MCQ Practice">
      <template #tools>
        <TextSizeControl />
      </template>
      <p v-if="state.submitted"><strong>Score: {{ state.score }}/{{ total }}</strong></p>

      <div v-for="q in questions" :key="q.id" class="question-item">
        <h4 class="question-title">{{ q.id }}. {{ q.prompt }}</h4>
        <button
          v-for="opt in q.options"
          :key="opt.key"
          class="option-btn"
          :class="cls(q, opt)"
          type="button"
          @click="choose(q.id, opt.key)"
        >
          {{ opt.key }}. {{ opt.text }}
        </button>
        <p v-if="state.submitted" class="question-explain">Answer: {{ q.answer }} | {{ q.explanation }}</p>
      </div>

      <div class="panel-actions">
        <button type="button" class="submit-btn" :disabled="state.submitted" @click="submit">Submit</button>
        <button type="button" @click="reset">Reset</button>
      </div>
    </StickyQuestionPanel>
  </div>
</template>
