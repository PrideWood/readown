import { assertField } from './utils.mjs';

function parseWordBank(raw, errors, filePath) {
  const wordBank = Array.isArray(raw) ? raw : [];
  assertField(wordBank.length === 15, `cloze requires exactly 15 wordBank options (found ${wordBank.length})`, errors, filePath);

  const parsed = wordBank.map((item, idx) => {
    const key = String(item?.key ?? '').trim() || String.fromCharCode(65 + idx);
    const text = String(item?.text ?? '').trim();
    assertField(Boolean(text), `wordBank item ${key} missing text`, errors, filePath);
    return { key, text };
  });

  const keySet = new Set();
  for (const option of parsed) {
    if (keySet.has(option.key)) {
      errors.push(`${filePath}: duplicate wordBank key '${option.key}'`);
    }
    keySet.add(option.key);
  }

  return parsed;
}

function parseBlankIdsFromPassage(passage) {
  const ids = [];
  const regex = /\[(\d+)\]/g;
  let match;
  while ((match = regex.exec(passage)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

export function parseCloze(sectionBlock, errors, filePath) {
  const passage = String(sectionBlock.passage ?? '').trim();
  const wordBank = parseWordBank(sectionBlock.wordBank, errors, filePath);
  const answers = sectionBlock.answers && typeof sectionBlock.answers === 'object' && !Array.isArray(sectionBlock.answers)
    ? sectionBlock.answers
    : {};
  const explanations = sectionBlock.explanations && typeof sectionBlock.explanations === 'object' && !Array.isArray(sectionBlock.explanations)
    ? sectionBlock.explanations
    : {};

  assertField(Boolean(passage), 'cloze requires passage', errors, filePath);

  const blankIds = parseBlankIdsFromPassage(passage);
  const uniqueBlankIds = Array.from(new Set(blankIds));

  assertField(uniqueBlankIds.length === 10, `cloze passage must contain exactly 10 blanks like [36] (found ${uniqueBlankIds.length})`, errors, filePath);

  const optionKeys = new Set(wordBank.map((item) => item.key));
  const normalizedBlanks = uniqueBlankIds.map((id) => {
    const answer = String(answers[id] ?? '').trim();
    const explanation = String(explanations[id] ?? '').trim();

    assertField(Boolean(answer), `blank [${id}] missing answer in answers map`, errors, filePath);
    if (answer) {
      assertField(optionKeys.has(answer), `blank [${id}] answer '${answer}' not found in wordBank keys`, errors, filePath);
    }

    return {
      id,
      answer,
      explanation
    };
  });

  return {
    passage,
    blanks: normalizedBlanks,
    wordBank
  };
}
