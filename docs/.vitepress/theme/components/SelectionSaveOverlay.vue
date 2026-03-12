<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useNotebookStore } from '../composables/notebook';
import {
  addPageHighlight,
  getPageHighlights,
  removePageHighlight,
  type HighlightColor,
  type TextHighlight
} from '../composables/highlights';

const props = defineProps<{ sectionId: string; pageKey: string }>();
const notebook = useNotebookStore();

const HIGHLIGHT_COLORS: HighlightColor[] = ['yellow', 'green', 'blue', 'pink', 'orange'];
const selectionOverlayRef = ref<HTMLElement | null>(null);

const state = reactive({
  visible: false,
  text: '',
  context: '',
  x: 0,
  y: 0,
  flashVisible: false,
  flashMessage: 'Saved',
  rootIndex: -1,
  highlightPopoverVisible: false,
  highlightPopoverX: 0,
  highlightPopoverY: 0,
  activeHighlightId: ''
});

let selectedRange: Range | null = null;

function getArticleRoots(): HTMLElement[] {
  return Array.from(document.querySelectorAll('.section-article, .paper-article')) as HTMLElement[];
}

function hideSelection(): void {
  state.visible = false;
  selectedRange = null;
}

function hideHighlightPopover(): void {
  state.highlightPopoverVisible = false;
  state.activeHighlightId = '';
}

function flash(message = 'Saved'): void {
  state.flashMessage = message;
  state.flashVisible = true;
  window.setTimeout(() => {
    state.flashVisible = false;
  }, 1300);
}

function stripHighlightsInContainer(container: ParentNode): void {
  const marks = container.querySelectorAll('mark.read-highlight');
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
  });
}

function offsetsToRange(root: HTMLElement, start: number, end: number): Range | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current: Node | null;
  let pos = 0;

  let startNode: Text | null = null;
  let endNode: Text | null = null;
  let startOffset = 0;
  let endOffset = 0;

  while ((current = walker.nextNode())) {
    const textNode = current as Text;
    const len = textNode.textContent?.length ?? 0;

    if (!startNode && start <= pos + len) {
      startNode = textNode;
      startOffset = Math.max(0, start - pos);
    }

    if (!endNode && end <= pos + len) {
      endNode = textNode;
      endOffset = Math.max(0, end - pos);
      break;
    }

    pos += len;
  }

  if (!startNode || !endNode) return null;

  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  return range;
}

function wrapRange(range: Range, color: HighlightColor, id: string): void {
  const mark = document.createElement('mark');
  mark.className = `read-highlight read-highlight-${color}`;
  mark.dataset.highlightId = id;

  const fragment = range.extractContents();
  mark.appendChild(fragment);
  range.insertNode(mark);
}

function trimOffsetsByRootText(rootText: string, start: number, end: number): { start: number; end: number } | null {
  let s = start;
  let e = end;

  while (s < e && /\s/.test(rootText[s] ?? '')) s += 1;
  while (e > s && /\s/.test(rootText[e - 1] ?? '')) e -= 1;

  if (e <= s) return null;
  return { start: s, end: e };
}

function normalizeContextText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function extractSentenceContext(rootText: string, start: number, end: number): string {
  if (!rootText) return '';

  const sentenceBoundary = /[.!?。！？\n]/;
  let left = Math.max(0, start);
  let right = Math.max(left, end);

  while (left > 0) {
    const ch = rootText[left - 1];
    if (sentenceBoundary.test(ch)) break;
    left -= 1;
  }

  while (right < rootText.length) {
    const ch = rootText[right];
    right += 1;
    if (sentenceBoundary.test(ch)) break;
  }

  return normalizeContextText(rootText.slice(left, right));
}

function applyHighlightsForPage(): void {
  const roots = getArticleRoots();
  const highlights = getPageHighlights(props.pageKey);
  roots.forEach((root) => stripHighlightsInContainer(root));

  roots.forEach((root, rootIndex) => {
    const list = highlights.filter((item) => item.rootIndex === rootIndex).sort((a, b) => a.start - b.start);
    const rootText = root.textContent ?? '';

    let prevEnd = -1;
    for (const item of list) {
      if (item.start < prevEnd) continue;
      const trimmed = trimOffsetsByRootText(rootText, item.start, item.end);
      if (!trimmed) continue;
      const range = offsetsToRange(root, trimmed.start, trimmed.end);
      if (!range) continue;
      wrapRange(range, item.color, item.id);
      prevEnd = trimmed.end;
    }
  });
}

function absoluteOffsetFromTextNode(root: HTMLElement, textNode: Text, localOffset: number): number | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let pos = 0;
  let current: Node | null;

  while ((current = walker.nextNode())) {
    const node = current as Text;
    const len = node.textContent?.length ?? 0;
    if (node === textNode) {
      const safeLocalOffset = Math.max(0, Math.min(localOffset, len));
      return pos + safeLocalOffset;
    }
    pos += len;
  }

  return null;
}

function boundaryToRawOffset(root: HTMLElement, container: Node, offset: number): number | null {
  if (!root.contains(container) && container !== root) return null;

  if (container.nodeType === Node.TEXT_NODE) {
    return absoluteOffsetFromTextNode(root, container as Text, offset);
  }

  // The current authoring flow should resolve to text-node boundaries.
  // Returning null here avoids inconsistent offsets at element boundaries.
  return null;
}

function getFirstBodyContentOffset(root: HTMLElement): number | null {
  const scope = (root.querySelector('p, li, blockquote') as HTMLElement | null) ?? root;
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
  let node: Node | null;

  while ((node = walker.nextNode())) {
    const textNode = node as Text;
    const text = textNode.textContent ?? '';
    const first = text.search(/\S/);
    if (first >= 0) {
      return absoluteOffsetFromTextNode(root, textNode, first);
    }
  }

  return null;
}

function rangeToOffsets(root: HTMLElement, range: Range): { start: number; end: number } | null {
  if (!root.contains(range.commonAncestorContainer)) return null;
  const start = boundaryToRawOffset(root, range.startContainer, range.startOffset);
  const end = boundaryToRawOffset(root, range.endContainer, range.endOffset);

  if (start === null || end === null || end <= start) return null;
  return { start, end };
}

function isOverlapping(list: TextHighlight[], start: number, end: number, rootIndex: number): boolean {
  return list.some((item) => item.rootIndex === rootIndex && !(end <= item.start || start >= item.end));
}

function positionSelectionOverlay(rect: DOMRect): void {
  const overlay = selectionOverlayRef.value;
  if (!overlay) return;

  const margin = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = overlay.offsetWidth || 220;
  const h = overlay.offsetHeight || 120;

  let left = rect.left + window.scrollX;
  left = Math.min(window.scrollX + vw - w - margin, Math.max(window.scrollX + margin, left));

  let top = rect.top + window.scrollY - h - 10;
  const minTop = window.scrollY + margin;
  if (top < minTop) top = rect.bottom + window.scrollY + 10;
  const maxTop = window.scrollY + vh - h - margin;
  top = Math.min(maxTop, Math.max(minTop, top));

  state.x = left;
  state.y = top;
}

function positionHighlightPopover(mark: HTMLElement): void {
  const rect = mark.getBoundingClientRect();
  const margin = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = 140;
  const h = 40;

  let left = rect.left + window.scrollX;
  left = Math.min(window.scrollX + vw - w - margin, Math.max(window.scrollX + margin, left));

  let top = rect.bottom + window.scrollY + 8;
  const maxTop = window.scrollY + vh - h - margin;
  top = Math.min(maxTop, Math.max(window.scrollY + margin, top));

  state.highlightPopoverX = left;
  state.highlightPopoverY = top;
}

function showHighlightPopoverForId(highlightId: string): void {
  const mark = document.querySelector(`mark.read-highlight[data-highlight-id="${highlightId}"]`) as HTMLElement | null;
  if (!mark) return;
  state.activeHighlightId = highlightId;
  positionHighlightPopover(mark);
  state.highlightPopoverVisible = true;
}

function onMouseUp(event: MouseEvent): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return hideSelection();

  const text = selection.toString().trim();
  if (!text) return hideSelection();

  const anchorNode = selection.anchorNode;
  const focusNode = selection.focusNode;
  if (!anchorNode || !focusNode) return hideSelection();

  const roots = getArticleRoots();
  const range = selection.getRangeAt(0);
  const rootIndex = roots.findIndex((root) => {
    return root.contains(anchorNode) && root.contains(focusNode) && root.contains(range.commonAncestorContainer);
  });
  if (rootIndex < 0) return hideSelection();

  if (range.collapsed) return hideSelection();

  hideHighlightPopover();

  const rect = range.getBoundingClientRect();
  const root = roots[rootIndex];
  const offsets = rangeToOffsets(root, range);
  const rootText = root.textContent ?? '';
  const trimmed = offsets ? trimOffsetsByRootText(rootText, offsets.start, offsets.end) : null;
  const sentence = trimmed ? extractSentenceContext(rootText, trimmed.start, trimmed.end) : '';

  selectedRange = range.cloneRange();
  state.visible = true;
  state.text = text.slice(0, 80);
  state.context = sentence || normalizeContextText(text);
  state.x = rect.left + window.scrollX;
  state.y = rect.top + window.scrollY;
  state.rootIndex = rootIndex;

  nextTick(() => positionSelectionOverlay(rect));
  if (event.type === 'mouseup') return;
}

function saveSelected(): void {
  if (!state.text) return;
  notebook.addItem({ text: state.text, context: state.context, paperId: props.sectionId, pageKey: props.pageKey });
  hideSelection();
  flash('Saved to notebook');
  window.getSelection()?.removeAllRanges();
}

function addHighlight(color: HighlightColor): void {
  if (!selectedRange || state.rootIndex < 0) return;

  const roots = getArticleRoots();
  const root = roots[state.rootIndex];
  if (!root) return;

  const offsets = rangeToOffsets(root, selectedRange);
  if (!offsets) return;
  const rootText = root.textContent ?? '';
  const trimmed = trimOffsetsByRootText(rootText, offsets.start, offsets.end);
  if (!trimmed) return;

  const firstBodyContentOffset = getFirstBodyContentOffset(root);
  if (firstBodyContentOffset !== null && trimmed.start <= firstBodyContentOffset) {
    hideSelection();
    window.getSelection()?.removeAllRanges();
    flash('Highlighting from the very first character is not supported.');
    return;
  }

  const existing = getPageHighlights(props.pageKey);
  if (isOverlapping(existing, trimmed.start, trimmed.end, state.rootIndex)) {
    hideSelection();
    window.getSelection()?.removeAllRanges();
    return;
  }

  addPageHighlight(props.pageKey, {
    rootIndex: state.rootIndex,
    start: trimmed.start,
    end: trimmed.end,
    color
  });
  hideSelection();
  window.getSelection()?.removeAllRanges();
}

function removeCurrentHighlight(): void {
  if (!state.activeHighlightId) return;
  const id = state.activeHighlightId;
  hideHighlightPopover();
  removePageHighlight(props.pageKey, id);
}

function onDocumentClick(event: MouseEvent): void {
  const target = event.target as HTMLElement | null;
  const mark = target?.closest('mark.read-highlight') as HTMLElement | null;
  if (!mark) return;

  const selected = window.getSelection()?.toString().trim();
  if (selected) return;

  const highlightId = mark.dataset.highlightId;
  if (!highlightId) return;

  hideSelection();
  showHighlightPopoverForId(highlightId);
}

function onDocumentPointerDown(event: MouseEvent): void {
  const target = event.target as HTMLElement | null;
  if (target?.closest('.save-selection') || target?.closest('.highlight-action-popover')) return;

  const selected = window.getSelection()?.toString().trim();
  if (selected) return;

  hideSelection();
  hideHighlightPopover();
}

function onHighlightsChanged(event: Event): void {
  const customEvent = event as CustomEvent<{ pageKey?: string }>;
  if (customEvent.detail?.pageKey !== props.pageKey) return;

  nextTick(() => {
    applyHighlightsForPage();

    if (state.activeHighlightId) {
      const exists = getPageHighlights(props.pageKey).some((item) => item.id === state.activeHighlightId);
      if (!exists) hideHighlightPopover();
    }
  });
}

watch(
  () => props.pageKey,
  async () => {
    hideSelection();
    hideHighlightPopover();
    await nextTick();
    applyHighlightsForPage();
  }
);

onMounted(async () => {
  await nextTick();
  applyHighlightsForPage();
  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('mousedown', onDocumentPointerDown);
  window.addEventListener('readown:highlights-changed', onHighlightsChanged as EventListener);
});

onBeforeUnmount(() => {
  document.removeEventListener('mouseup', onMouseUp);
  document.removeEventListener('click', onDocumentClick);
  document.removeEventListener('mousedown', onDocumentPointerDown);
  window.removeEventListener('readown:highlights-changed', onHighlightsChanged as EventListener);
});
</script>

<template>
  <div
    ref="selectionOverlayRef"
    v-if="state.visible"
    class="save-selection"
    :style="{ left: `${state.x}px`, top: `${state.y}px` }"
  >
    <div class="save-selection-header">Selection</div>
    <strong class="save-selection-text">{{ state.text }}</strong>

    <div class="save-selection-actions" style="margin-bottom: 0.45rem;">
      <button type="button" class="save-primary" @click="saveSelected">Save Word</button>
    </div>

    <div class="save-selection-header">Highlight</div>
    <div class="highlight-palette">
      <button
        v-for="color in HIGHLIGHT_COLORS"
        :key="color"
        type="button"
        class="highlight-swatch"
        :class="`hl-${color}`"
        @click="addHighlight(color)"
      />
    </div>
  </div>

  <div
    v-if="state.highlightPopoverVisible"
    class="highlight-action-popover"
    :style="{ left: `${state.highlightPopoverX}px`, top: `${state.highlightPopoverY}px` }"
  >
    <button type="button" @click="removeCurrentHighlight">Remove current highlight</button>
  </div>

  <div v-if="state.flashVisible" class="selection-flash">{{ state.flashMessage }}</div>
</template>
