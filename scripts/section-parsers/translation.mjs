import { assertField } from './utils.mjs';

export function parseTranslation(sectionBlock, errors, filePath) {
  const sourceText = String(sectionBlock.sourceText ?? sectionBlock.prompt ?? '').trim();
  const reference = String(sectionBlock.reference ?? '').trim();
  const notes = Array.isArray(sectionBlock.notes)
    ? sectionBlock.notes.map((item) => String(item).trim()).filter(Boolean)
    : String(sectionBlock.notes ?? '')
        .split('\n')
        .map((line) => line.replace(/^\s*-\s*/, '').trim())
        .filter(Boolean);

  assertField(Boolean(reference), 'translation requires reference', errors, filePath);

  return { sourceText, reference, notes };
}
