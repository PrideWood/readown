import { assertField } from './utils.mjs';

export function parseTranslation(sectionBlock, errors, filePath) {
  const prompt = String(sectionBlock.prompt ?? '').trim();
  const reference = String(sectionBlock.reference ?? '').trim();
  const notes = Array.isArray(sectionBlock.notes)
    ? sectionBlock.notes.map((item) => String(item).trim()).filter(Boolean)
    : [];

  assertField(Boolean(reference), 'translation requires reference', errors, filePath);

  return { prompt, reference, notes };
}
