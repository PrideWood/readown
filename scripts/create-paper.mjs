#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

console.log('[Deprecated] create:paper now maps to section-based content. Use create:section for new files.');

const args = process.argv.slice(2);
const result = spawnSync('node', ['scripts/create-section.mjs', ...args], {
  stdio: 'inherit'
});

process.exit(result.status ?? 1);
