#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const [, , examType, session, fileName, type, part, ...titleParts] = process.argv;
const title = titleParts.join(' ').trim();

const allowedExamTypes = new Set(['cet4', 'cet6', 'kaoyan', 'gaokao']);
const allowedTypes = new Set(['mcq-reading', 'matching', 'cloze', 'translation']);

if (!allowedExamTypes.has(examType) || !session || !fileName || !allowedTypes.has(type) || !part || !title) {
  console.error('Usage: npm run create:section -- <examType> <session> <fileName> <type> <part> "Section Title"');
  console.error('Example: npm run create:section -- cet4 2025-june section-a-cloze cloze section-a "Section A Cloze"');
  process.exit(1);
}

const root = process.cwd();
const sessionDir = path.join(root, 'docs', 'exams', examType, session);
const sectionFile = path.join(sessionDir, `${fileName}.md`);
const sectionId = `${examType}-${session}-${fileName}`.replace(/[^a-z0-9-]/g, '-');

if (fs.existsSync(sectionFile)) {
  console.error(`File already exists: ${sectionFile}`);
  process.exit(1);
}

fs.mkdirSync(sessionDir, { recursive: true });

const sessionIndex = path.join(sessionDir, 'index.md');
if (!fs.existsSync(sessionIndex)) {
  fs.writeFileSync(sessionIndex, `# ${examType.toUpperCase()} ${session}\n\n<SectionList exam-type="${examType}" session="${session}" />\n`, 'utf8');
}

const examIndex = path.join(root, 'docs', 'exams', examType, 'index.md');
if (!fs.existsSync(examIndex)) {
  fs.writeFileSync(examIndex, `# ${examType.toUpperCase()} Sessions\n\n<SessionList exam-type="${examType}" />\n`, 'utf8');
}

const sectionBlockByType = {
  'mcq-reading': `passage: Replace with passage text\nquestions:\n  - id: "1"\n    prompt: Replace with question\n    options:\n      A: Option A\n      B: Option B\n      C: Option C\n      D: Option D\n    answer: "A"\n    explanation: Replace with explanation`,
  matching: `instructions: Match statements to paragraph letters\nparagraphs:\n  - label: "A"\n    text: Paragraph A\n  - label: "B"\n    text: Paragraph B\nstatements:\n  - id: "46"\n    text: Statement text\nanswers:\n  "46": "A"\nexplanations:\n  "46": Replace with explanation`,
  cloze: `passage: Replace with cloze passage using blanks like [36]...[45]\nwordBank:\n  - key: "A"\n    text: Option A\n  - key: "B"\n    text: Option B\n  - key: "C"\n    text: Option C\n  - key: "D"\n    text: Option D\n  - key: "E"\n    text: Option E\n  - key: "F"\n    text: Option F\n  - key: "G"\n    text: Option G\n  - key: "H"\n    text: Option H\n  - key: "I"\n    text: Option I\n  - key: "J"\n    text: Option J\n  - key: "K"\n    text: Option K\n  - key: "L"\n    text: Option L\n  - key: "M"\n    text: Option M\n  - key: "N"\n    text: Option N\n  - key: "O"\n    text: Option O\nanswers:\n  "36": "A"\n  "37": "B"\n  "38": "C"\n  "39": "D"\n  "40": "E"\n  "41": "F"\n  "42": "G"\n  "43": "H"\n  "44": "I"\n  "45": "J"\nexplanations:\n  "36": Optional explanation`,
  translation: `prompt: Replace with translation prompt\nreference: Replace with reference answer\nnotes:\n  - Optional note`
};

const interactive = type === 'translation' ? 'false' : 'true';

const content = `---\ntitle: ${title}\nsectionId: ${sectionId}\nexamType: ${examType}\nsession: ${session}\npart: ${part}\ntype: ${type}\ninteractive: ${interactive}\n---\n\n# ${title}\n\n<div class="section-article">\n\nPaste source content here.\n\n</div>\n\n\`\`\`section\n${sectionBlockByType[type]}\n\`\`\`\n\n<SectionRenderer />\n`;

fs.writeFileSync(sectionFile, content, 'utf8');
console.log(`Created section: ${sectionFile}`);
console.log('Next step: npm run parse:sections');
