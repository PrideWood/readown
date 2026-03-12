#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

import { parseMcqReading } from './section-parsers/mcq-reading.mjs';
import { parseMatching } from './section-parsers/matching.mjs';
import { parseCloze } from './section-parsers/cloze.mjs';
import { parseTranslation } from './section-parsers/translation.mjs';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const examsDir = path.join(docsDir, 'exams');
const outputFile = path.join(docsDir, '.generated', 'sections.generated.json');
const validateOnly = process.argv.includes('--validate-only');

const SUPPORTED_EXAM_TYPES = new Set(['cet4', 'cet6', 'kaoyan', 'gaokao']);
const SUPPORTED_SECTION_TYPES = new Set(['mcq-reading', 'matching', 'cloze', 'translation']);

const parserByType = {
  'mcq-reading': parseMcqReading,
  matching: parseMatching,
  cloze: parseCloze,
  translation: parseTranslation
};

function listSectionFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSectionFiles(fullPath));
      continue;
    }
    if (!entry.name.endsWith('.md')) continue;
    if (entry.name === 'index.md') continue;
    files.push(fullPath);
  }

  return files;
}

function parseFrontmatter(raw, filePath, errors) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    errors.push(`${filePath}: missing frontmatter block`);
    return { data: {}, body: raw };
  }

  try {
    const data = YAML.parse(match[1]) || {};
    const body = raw.slice(match[0].length);
    return { data, body };
  } catch (error) {
    errors.push(`${filePath}: invalid frontmatter YAML (${error.message})`);
    return { data: {}, body: raw };
  }
}

function parseSectionBlock(body, filePath, errors) {
  const match = body.match(/```section\n([\s\S]*?)\n```/);
  if (!match) {
    errors.push(`${filePath}: missing section block (expected fenced block with language 'section')`);
    return {};
  }

  try {
    return YAML.parse(match[1]) || {};
  } catch (error) {
    errors.push(`${filePath}: invalid section block YAML (${error.message})`);
    return {};
  }
}

function validateCommonMetadata(meta, filePath, errors) {
  const required = ['title', 'sectionId', 'examType', 'session', 'part', 'type', 'interactive'];

  for (const key of required) {
    if (meta[key] === undefined || meta[key] === null || meta[key] === '') {
      errors.push(`${filePath}: missing required metadata field '${key}'`);
    }
  }

  if (meta.examType && !SUPPORTED_EXAM_TYPES.has(String(meta.examType))) {
    errors.push(`${filePath}: unsupported examType '${meta.examType}'`);
  }

  if (meta.type && !SUPPORTED_SECTION_TYPES.has(String(meta.type))) {
    errors.push(`${filePath}: unsupported section type '${meta.type}'`);
  }

  if (meta.interactive !== undefined && typeof meta.interactive !== 'boolean') {
    errors.push(`${filePath}: interactive must be true or false`);
  }
}

function routeFromRelative(relativePath) {
  return `/${relativePath.replace(/\\/g, '/').replace(/\.md$/, '')}`;
}

function buildCatalog(entries) {
  const exams = {};
  const sectionsByRelativePath = {};
  const byId = {};

  for (const entry of entries) {
    const examType = entry.meta.examType;
    const session = entry.meta.session;

    if (!exams[examType]) exams[examType] = { examType, sessions: {} };
    if (!exams[examType].sessions[session]) {
      exams[examType].sessions[session] = {
        session,
        examType,
        sections: []
      };
    }

    const summary = {
      title: entry.meta.title,
      sectionId: entry.meta.sectionId,
      examType,
      session,
      part: entry.meta.part,
      type: entry.meta.type,
      interactive: entry.meta.interactive,
      route: entry.route,
      relativePath: entry.relativePath
    };

    exams[examType].sessions[session].sections.push(summary);
    sectionsByRelativePath[entry.relativePath] = {
      meta: summary,
      data: entry.data
    };
    byId[entry.meta.sectionId] = {
      meta: summary,
      data: entry.data
    };
  }

  for (const exam of Object.values(exams)) {
    for (const session of Object.values(exam.sessions)) {
      session.sections.sort((a, b) => a.sectionId.localeCompare(b.sectionId));
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    exams,
    sectionsByRelativePath,
    sectionsById: byId
  };
}

function main() {
  const errors = [];
  const files = listSectionFiles(examsDir);
  const sections = [];
  const seenSectionIds = new Set();

  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(docsDir, filePath).replace(/\\/g, '/');

    const { data: frontmatter, body } = parseFrontmatter(raw, relativePath, errors);
    validateCommonMetadata(frontmatter, relativePath, errors);

    const sectionBlock = parseSectionBlock(body, relativePath, errors);

    if (frontmatter.sectionId) {
      if (seenSectionIds.has(frontmatter.sectionId)) {
        errors.push(`${relativePath}: duplicate sectionId '${frontmatter.sectionId}'`);
      }
      seenSectionIds.add(frontmatter.sectionId);
    }

    const parser = parserByType[frontmatter.type];
    const normalizedData = parser ? parser(sectionBlock, errors, relativePath) : {};

    const inferred = relativePath.split('/');
    const inferredExamType = inferred[1];
    const inferredSession = inferred[2];

    if (frontmatter.examType && inferredExamType && frontmatter.examType !== inferredExamType) {
      errors.push(`${relativePath}: examType '${frontmatter.examType}' does not match folder '${inferredExamType}'`);
    }

    if (frontmatter.session && inferredSession && frontmatter.session !== inferredSession) {
      errors.push(`${relativePath}: session '${frontmatter.session}' does not match folder '${inferredSession}'`);
    }

    sections.push({
      relativePath,
      route: routeFromRelative(relativePath),
      meta: {
        title: String(frontmatter.title || ''),
        sectionId: String(frontmatter.sectionId || ''),
        examType: String(frontmatter.examType || inferredExamType || ''),
        session: String(frontmatter.session || inferredSession || ''),
        part: String(frontmatter.part || ''),
        type: String(frontmatter.type || ''),
        interactive: Boolean(frontmatter.interactive)
      },
      data: normalizedData
    });
  }

  if (errors.length > 0) {
    console.error('Section parsing failed with the following issues:\n');
    for (const err of errors) {
      console.error(`- ${err}`);
    }
    process.exit(1);
  }

  const catalog = buildCatalog(sections);

  if (!validateOnly) {
    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    fs.writeFileSync(outputFile, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
    console.log(`Generated section catalog: ${outputFile}`);
  }

  console.log(`Validated ${sections.length} section file(s).`);
}

main();
