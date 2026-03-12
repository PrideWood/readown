<script setup lang="ts">
import { computed, reactive } from 'vue';
import { Eraser } from 'lucide-vue-next';
import { clearPageHighlights } from '../composables/highlights';

interface ParagraphItem {
  label: string;
  text: string;
}

interface StatementItem {
  id: string;
  text: string;
  answer?: string;
  explanation?: string;
}

const props = defineProps<{
  paragraphs: ParagraphItem[];
  statements: StatementItem[];
  instructions?: string;
  interactive: boolean;
  pageKey: string;
  initialAnswers?: Record<string, string>;
}>();

const emit = defineEmits<{
  submit: [payload: { answers: Record<string, string>; score: number; total: number }];
  reset: [];
}>();

const labels = computed(() => props.paragraphs.map((p) => p.label));
const state = reactive({ answers: { ...(props.initialAnswers ?? {}) } as Record<string, string>, submitted: false, score: 0 });

function submit(): void {
  if (!props.interactive) return;

  const score = props.statements.reduce((acc, item) => {
    return item.answer && state.answers[item.id] === item.answer ? acc + 1 : acc;
  }, 0);

  state.submitted = true;
  state.score = score;
  emit('submit', { answers: { ...state.answers }, score, total: props.statements.length });
}

function reset(): void {
  state.answers = {};
  state.submitted = false;
  state.score = 0;
  emit('reset');
}

function answerState(statementId: string, correctAnswer?: string): string {
  if (!state.submitted || !correctAnswer) return '';
  return state.answers[statementId] === correctAnswer ? 'correct' : 'wrong';
}

function clearHighlightsForPage(): void {
  clearPageHighlights(props.pageKey);
}
</script>

<template>
  <div class="paper-shell">
    <article class="card section-article">
      <div class="passage-head">
        <h3>Paragraphs</h3>
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
      <p v-if="instructions" style="color: var(--read-muted);">{{ instructions }}</p>

      <div v-for="paragraph in paragraphs" :key="paragraph.label" class="question-item">
        <h4 class="question-title">{{ paragraph.label }}</h4>
        <p>{{ paragraph.text }}</p>
      </div>
    </article>

    <section class="card panel-card question-panel">
      <h3>Statements</h3>
      <p v-if="interactive && state.submitted"><strong>Score: {{ state.score }}/{{ statements.length }}</strong></p>

      <div class="question-item" v-for="statement in statements" :key="statement.id">
        <h4 class="question-title">{{ statement.id }}. {{ statement.text }}</h4>

        <select
          v-if="interactive"
          v-model="state.answers[statement.id]"
          class="notebook-search"
          :class="{ 'select-correct': answerState(statement.id, statement.answer) === 'correct', 'select-wrong': answerState(statement.id, statement.answer) === 'wrong' }"
          style="min-width: 110px;"
        >
          <option value="">Select paragraph</option>
          <option v-for="label in labels" :key="label" :value="label">{{ label }}</option>
        </select>

        <p v-else class="question-explain">Reference mode</p>

        <p v-if="state.submitted && statement.answer" class="question-explain">
          Answer: {{ statement.answer }}<span v-if="statement.explanation"> | {{ statement.explanation }}</span>
        </p>
        <p
          v-if="state.submitted && state.answers[statement.id]"
          class="question-explain"
          :class="{ 'result-correct': answerState(statement.id, statement.answer) === 'correct', 'result-wrong': answerState(statement.id, statement.answer) === 'wrong' }"
        >
          Your choice: {{ state.answers[statement.id] }}
        </p>
      </div>

      <div class="panel-actions" v-if="interactive">
        <button type="button" class="submit-btn" :disabled="state.submitted" @click="submit">Submit</button>
        <button type="button" @click="reset">Reset</button>
      </div>
    </section>
  </div>
</template>
