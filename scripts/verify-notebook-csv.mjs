#!/usr/bin/env node

function escapeCsv(value) {
  const text = value ?? '';
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildCsv(items) {
  const header = ['word_or_phrase', 'context_sentence'];
  const rows = items.map((item) => [item.text, item.context]);
  return [header, ...rows]
    .map((row) => row.map((cell) => escapeCsv(cell ?? '')).join(','))
    .join('\r\n');
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}\nExpected: ${JSON.stringify(expected)}\nActual:   ${JSON.stringify(actual)}`);
  }
}

function run() {
  const singleWord = buildCsv([{ text: 'library', context: 'Public libraries matter.' }]).split('\r\n')[1];
  assertEqual(singleWord, 'library,Public libraries matter.', 'Case 1 failed: single-word export');

  const phrase = buildCsv([{ text: 'digital literacy', context: 'Digital literacy is essential.' }]).split('\r\n')[1];
  assertEqual(phrase, 'digital literacy,Digital literacy is essential.', 'Case 2 failed: phrase export');

  const withComma = buildCsv([{ text: 'access', context: 'Devices, internet, and guidance are needed.' }]).split('\r\n')[1];
  assertEqual(withComma, 'access,"Devices, internet, and guidance are needed."', 'Case 3 failed: comma escaping');

  const withQuote = buildCsv([{ text: 'view', context: 'Some call it "obsolete", but it still helps.' }]).split('\r\n')[1];
  assertEqual(withQuote, 'view,"Some call it ""obsolete"", but it still helps."', 'Case 4 failed: quote escaping');

  const multi = buildCsv([
    { text: 'library', context: 'A' },
    { text: 'digital literacy', context: 'B, C' },
    { text: 'public space', context: 'He said "safe".' }
  ]);
  const multiLines = multi.split('\r\n');
  assertEqual(multiLines.length, 4, 'Case 5 failed: multiple items line count');
  assertEqual(multiLines[0], 'word_or_phrase,context_sentence', 'Case 5 failed: header order');

  const empty = buildCsv([]);
  assertEqual(empty, 'word_or_phrase,context_sentence', 'Case 6 failed: empty notebook CSV should only contain header');

  console.log('Notebook CSV export verification passed (cases 1-6).');
}

run();
