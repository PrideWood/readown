#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const result = spawnSync('node', ['scripts/parse-sections.mjs', '--validate-only'], {
  stdio: 'inherit'
});

process.exit(result.status ?? 1);
