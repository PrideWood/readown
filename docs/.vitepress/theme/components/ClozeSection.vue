<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { Eraser } from 'lucide-vue-next';
import { clearPageHighlights } from '../composables/highlights';
import TextSizeControl from './TextSizeControl.vue';
import StickyQuestionPanel from './StickyQuestionPanel.vue';

interface BlankItem {
  id: string;
  answer: string;
  explanation?: string;
}

interface WordBankItem {
  key: string;
  text: string;
}

const props = defineProps<{
  passage: string;
  blanks: BlankItem[];
  wordBank: WordBankItem[];
  interactive: boolean;
  pageKey: string;
  initialAnswers?: Record<string, string>;
}>();

const emit = defineEmits<{
  submit: [payload: { answers: Record<string, string>; score: number; total: number }];
  reset: [];
}>();

const selectedBlankId = ref<string>('');
const state = reactive({ answers: { ...(props.initialAnswers ?? {}) } as Record<string, string>, submitted: false, score: 0 });

const blankLookup = computed(() => {
  const map = new Map<string, BlankItem>();
  for (const blank of props.blanks) map.set(blank.id, blank);
  return map;
});
const usedOptionKeys = computed(() => new Set(Object.values(state.answers).filter(Boolean)));

const paragraphTokens = computed(() => {
  const tokens: Array<{ type: 'text' | 'blank'; text?: string; id?: string }> = [];
  const regex = /\[(\d+)\]/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(props.passage)) !== null) {
    if (match.index > cursor) {
      tokens.push({ type: 'text', text: props.passage.slice(cursor, match.index) });
    }
    tokens.push({ type: 'blank', id: match[1] });
    cursor = regex.lastIndex;
  }

  if (cursor < props.passage.length) {
    tokens.push({ type: 'text', text: props.passage.slice(cursor) });
  }

  return tokens;
});

function onSelectBlank(blankId: string): void {
  if (!props.interactive || state.submitted) return;
  selectedBlankId.value = blankId;
}

function pickOption(optionKey: string): void {
  if (!props.interactive || state.submitted || !selectedBlankId.value) return;
  state.answers[selectedBlankId.value] = optionKey;
}

function submit(): void {
  if (!props.interactive) return;

  const score = props.blanks.reduce((acc, blank) => {
    return state.answers[blank.id] === blank.answer ? acc + 1 : acc;
  }, 0);

  state.submitted = true;
  state.score = score;
  emit('submit', { answers: { ...state.answers }, score, total: props.blanks.length });
}

function reset(): void {
  state.answers = {};
  selectedBlankId.value = '';
  state.submitted = false;
  state.score = 0;
  emit('reset');
}

function blankLabel(blankId: string): string {
  const selectedKey = state.answers[blankId];
  if (!selectedKey) return `[${blankId}]`;
  const item = props.wordBank.find((opt) => opt.key === selectedKey);
  return item ? `${selectedKey}. ${item.text}` : selectedKey;
}

function blankState(blankId: string): string {
  if (!state.submitted) return '';
  const blank = blankLookup.value.get(blankId);
  if (!blank) return '';
  return state.answers[blankId] === blank.answer ? 'correct' : 'wrong';
}

function clearHighlightsForPage(): void {
  clearPageHighlights(props.pageKey);
}

function isOptionUsed(optionKey: string): boolean {
  return usedOptionKeys.value.has(optionKey);
}
</script>

<template>
  <div class="paper-shell">
    <article class="card section-article">
      <div class="passage-head">
        <h3>Cloze Passage</h3>
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
      <p class="cloze-passage">
        <template v-for="(token, idx) in paragraphTokens" :key="`${token.type}-${token.id || idx}`">
          <span v-if="token.type === 'text'">{{ token.text }}</span>
          <button
            v-else
            type="button"
            class="cloze-blank"
            :class="[{ active: selectedBlankId === token.id, filled: !!state.answers[token.id || ''] }, blankState(token.id || '')]"
            @click="onSelectBlank(token.id || '')"
          >
            {{ blankLabel(token.id || '') }}
          </button>
        </template>
      </p>
      <p style="color: var(--read-muted); font-size: 0.82rem;">Click a blank slot, then click an option from the word bank.</p>
    </article>

    <StickyQuestionPanel title="Word Bank">
      <template #tools>
        <TextSizeControl />
      </template>
      <p v-if="interactive && state.submitted"><strong>Score: {{ state.score }}/{{ blanks.length }}</strong></p>

      <div class="word-bank">
        <button
          v-for="option in wordBank"
          :key="option.key"
          type="button"
          class="option-btn"
          :class="{ 'word-used': isOptionUsed(option.key) }"
          :disabled="!interactive || !selectedBlankId || state.submitted"
          @click="pickOption(option.key)"
        >
          {{ option.key }}. {{ option.text }}
        </button>
      </div>

      <div class="panel-actions" v-if="interactive">
        <button type="button" class="submit-btn" :disabled="state.submitted" @click="submit">Submit</button>
        <button type="button" @click="reset">Reset</button>
      </div>
    </StickyQuestionPanel>
  </div>
</template>
