#!/usr/bin/env node

function optionState({ submitted, selectedOption, correctOption, optionKey }) {
  if (!submitted) return selectedOption === optionKey ? 'selected' : '';
  if (optionKey === correctOption) return 'correct';
  if (selectedOption === optionKey && selectedOption !== correctOption) return 'wrong';
  return '';
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    console.error(`FAIL ${label}: expected '${expected}', got '${actual}'`);
    process.exitCode = 1;
  }
}

// A: choose correct
assertEqual(optionState({ submitted: true, selectedOption: 'B', correctOption: 'B', optionKey: 'B' }), 'correct', 'A-correct-selected');
assertEqual(optionState({ submitted: true, selectedOption: 'B', correctOption: 'B', optionKey: 'A' }), '', 'A-no-wrong');

// B: choose wrong
assertEqual(optionState({ submitted: true, selectedOption: 'A', correctOption: 'B', optionKey: 'A' }), 'wrong', 'B-wrong-selected-red');
assertEqual(optionState({ submitted: true, selectedOption: 'A', correctOption: 'B', optionKey: 'B' }), 'correct', 'B-correct-still-visible');

// C: choose nothing
assertEqual(optionState({ submitted: true, selectedOption: '', correctOption: 'C', optionKey: 'A' }), '', 'C-no-random-wrong');
assertEqual(optionState({ submitted: true, selectedOption: '', correctOption: 'C', optionKey: 'C' }), 'correct', 'C-answer-reveal');

// D: before submit/reset
assertEqual(optionState({ submitted: false, selectedOption: 'D', correctOption: 'A', optionKey: 'D' }), 'selected', 'D-pre-submit-selected-only');
assertEqual(optionState({ submitted: false, selectedOption: 'D', correctOption: 'A', optionKey: 'A' }), '', 'D-pre-submit-no-correct');

if (!process.exitCode) {
  console.log('MCQ feedback logic verification passed (A/B/C/D).');
}
