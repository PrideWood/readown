import { assertField } from './utils.mjs';

export function parseMatching(sectionBlock, errors, filePath) {
  const paragraphs = Array.isArray(sectionBlock.paragraphs) ? sectionBlock.paragraphs : [];
  const statements = Array.isArray(sectionBlock.statements) ? sectionBlock.statements : [];
  const answers = sectionBlock.answers && typeof sectionBlock.answers === 'object' && !Array.isArray(sectionBlock.answers)
    ? sectionBlock.answers
    : {};
  const explanations = sectionBlock.explanations && typeof sectionBlock.explanations === 'object' && !Array.isArray(sectionBlock.explanations)
    ? sectionBlock.explanations
    : {};

  assertField(paragraphs.length > 0, 'matching requires paragraphs array', errors, filePath);
  assertField(statements.length > 0, 'matching requires statements array', errors, filePath);

  const normalizedParagraphs = paragraphs.map((item, idx) => {
    const label = String(item?.label ?? '').trim() || String.fromCharCode(65 + idx);
    const text = String(item?.text ?? '').trim();
    assertField(Boolean(text), `paragraph ${label} missing text`, errors, filePath);
    return { label, text };
  });

  const paragraphLabels = new Set(normalizedParagraphs.map((p) => p.label));

  const normalizedStatements = statements.map((item, idx) => {
    const id = String(item?.id ?? idx + 1);
    const text = String(item?.text ?? '').trim();
    assertField(Boolean(text), `statement ${id} missing text`, errors, filePath);

    const answer = String(answers[id] ?? '').trim();
    if (answer) {
      assertField(paragraphLabels.has(answer), `statement ${id} answer '${answer}' not found in paragraph labels`, errors, filePath);
    }

    return {
      id,
      text,
      answer,
      explanation: String(explanations[id] ?? '').trim()
    };
  });

  return {
    instructions: String(sectionBlock.instructions ?? '').trim(),
    paragraphs: normalizedParagraphs,
    statements: normalizedStatements
  };
}
