async function build_matching(tp, opts = {}) {
  const vault = app.vault;

  const examType = opts.examType || await tp.system.prompt("Exam type (e.g. cet4, cet6, kaoyan, gaokao)");
  if (!examType) {
    new Notice("Cancelled: no exam type provided.");
    return;
  }

  const session = opts.session || await tp.system.prompt("Session (e.g. 2024-june-1)");
  if (!session) {
    new Notice("Cancelled: no session provided.");
    return;
  }

  const sourcePath = `source-exams/${examType}/${session}/matching.md`;
  const targetFolder = `exams/${examType}/${session}`;
  const targetPath = `${targetFolder}/section-b-matching.md`;

  async function ensureFolder(folderPath) {
    const parts = folderPath.split("/");
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      if (!vault.getAbstractFileByPath(current)) {
        await vault.createFolder(current);
      }
    }
  }

  async function readFile(path) {
    const file = vault.getAbstractFileByPath(path);
    if (!file) throw new Error(`File not found: ${path}`);
    return await vault.read(file);
  }

  async function writeFile(path, content) {
    const existing = vault.getAbstractFileByPath(path);
    if (existing) {
      await vault.modify(existing, content);
    } else {
      await vault.create(path, content);
    }
  }

  function cleanText(text) {
    return String(text || "").replace(/\r/g, "").trim();
  }

  function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    return { data: {}, body: raw };
  }

  const fmText = match[1];
  const body = raw.slice(match[0].length);
  const data = {};

  fmText.split("\n").forEach(line => {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (m) {
      let value = m[2].trim();
      value = value.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");

      if (value === "true") value = true;
      if (value === "false") value = false;

      data[m[1]] = value;
    }
  });

  return { data, body };
}

  function buildFrontmatter(data) {
  const picked = {
    examType: data.examType || "",
    session: data.session || "",
    type: data.type || "",
    part: data.part || "",
    title: data.title || "",
    sectionId: data.sectionId || "",
    interactive: data.interactive,
  };

  const lines = ["---"];

  for (const [key, value] of Object.entries(picked)) {
    if (typeof value === "boolean") {
      lines.push(`${key}: ${value}`);
    } else if (value === "true") {
      lines.push(`${key}: true`);
    } else if (value === "false") {
      lines.push(`${key}: false`);
    } else {
      lines.push(`${key}: ${JSON.stringify(value ?? "")}`);
    }
  }

  lines.push("---", "");
  return lines.join("\n");
}

  // 稳定版：不用正则截 section，避免只截到第一段
  function getSection(body, heading) {
    const lines = body.replace(/\r/g, "").split("\n");
    const targetHeading = `## ${heading}`;

    let start = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === targetHeading) {
        start = i + 1;
        break;
      }
    }

    if (start === -1) return "";

    let end = lines.length;
    for (let i = start; i < lines.length; i++) {
      if (lines[i].startsWith("## ")) {
        end = i;
        break;
      }
    }

    return lines.slice(start, end).join("\n").trim();
  }

  function yamlEscapeInline(str) {
    if (str == null) return '""';
    return `"${String(str)
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')}"`;
  }

  function indentBlock(text, spaces = 2) {
    const pad = " ".repeat(spaces);
    return String(text)
      .split("\n")
      .map(line => `${pad}${line}`)
      .join("\n");
  }

  function extractLabeledBlock(content, label, nextLabels = []) {
  const lines = String(content || "").replace(/\r/g, "").split("\n");

  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith(`${label}:`)) {
      start = i;
      break;
    }
  }
  if (start === -1) return "";

  const firstLine = lines[start].trim().replace(`${label}:`, "").trim();
  const collected = [];
  if (firstLine) collected.push(firstLine);

  let i = start + 1;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    const hitNextLabel = nextLabels.some(next => trimmed.startsWith(`${next}:`));
    if (hitNextLabel) break;

    if (/^###\s+\d+\s*$/.test(trimmed)) break;

    collected.push(line);
    i++;
  }

  return cleanText(collected.join("\n"));
}

  function parsePassageTitle(text) {
    return extractLabeledBlock(text, "Passage Title");
  }

  function parseParagraphs(text) {
    const items = [];
    const normalized = text.replace(/\r/g, "");
    const regex = /^###\s+([A-Z])\s*\n([\s\S]*?)(?=^###\s+[A-Z]\s*\n|$)/gm;

    for (const match of normalized.matchAll(regex)) {
      items.push({
        label: match[1],
        text: cleanText(match[2]),
      });
    }

    return items;
  }

 function parseStatements(text) {
  const lines = text.replace(/\r/g, "").split("\n");

  const blocks = [];
  let current = null;

  for (const line of lines) {
    const headingMatch = line.match(/^###\s+(\d+)\s*$/);

    if (headingMatch) {
      if (current) blocks.push(current);
      current = {
        id: headingMatch[1],
        lines: []
      };
      continue;
    }

    if (current) {
      current.lines.push(line);
    }
  }

  if (current) blocks.push(current);

  const statements = [];
  const answers = {};
  const explanation = {};

  for (const block of blocks) {
    const content = block.lines.join("\n").trim();

    const statementText = extractLabeledBlock(content, "Statement", ["Answer", "Explanation"]);
    const explanationText = extractLabeledBlock(content, "Explanation");

    const answerMatch = content.match(/^\s*Answer:\s*([A-Z])\s*$/m);

    statements.push({
      id: block.id,
      text: statementText
    });

    answers[block.id] = answerMatch ? answerMatch[1].trim() : "";
    explanation[block.id] = explanationText || "";
  }

  return { statements, answers, explanation };
}

  function buildSection(frontmatter, title, passageTitle, paragraphs, statements, answers, explanation) {
  const fm = buildFrontmatter(frontmatter);

  const paragraphsYaml = paragraphs.map(p =>
`  - label: ${p.label}
    text: >-
${indentBlock(p.text, 6)}`
  ).join("\n");

  const statementsYaml = statements.map(s =>
`  - id: ${yamlEscapeInline(s.id)}
    text: ${yamlEscapeInline(s.text)}`
  ).join("\n");

  const answersYaml = Object.entries(answers).map(([id, ans]) =>
`  ${yamlEscapeInline(id)}: ${yamlEscapeInline(ans)}`
  ).join("\n");

  const explanationYaml = Object.entries(explanation).map(([id, exp]) =>
`  ${yamlEscapeInline(id)}: ${yamlEscapeInline(exp)}`
  ).join("\n");

  return `${fm}# ${title}

## ${passageTitle}

\`\`\`section
paragraphs:
${paragraphsYaml || "  []"}
statements:
${statementsYaml || "  []"}
answers:
${answersYaml || "  {}"}
explanation:
${explanationYaml || "  {}"}
\`\`\`

<SectionRenderer />
`;
}

  try {
    const raw = await readFile(sourcePath);
    const { data, body } = parseFrontmatter(raw);

    const title = data.title || "Section B Matching";

    const passageTitleSection = getSection(body, "Passage Title");
    const passageTitle = parsePassageTitle(passageTitleSection);

    const paragraphsSection = getSection(body, "Paragraphs");
    const paragraphs = parseParagraphs(paragraphsSection);

    const statementsSection = getSection(body, "Statements");
    const parsedStatements = parseStatements(statementsSection);

console.log("parsedStatements:", parsedStatements);
console.log("answers:", parsedStatements.answers);
console.log("explanation:", parsedStatements.explanation);

    await ensureFolder(targetFolder);

    const output = buildSection(
  data,
  title,
  passageTitle,
  paragraphs,
  parsedStatements.statements,
  parsedStatements.answers,
  parsedStatements.explanation
);

    await writeFile(targetPath, output);

    console.log("Matching built successfully:", {
      sourcePath,
      targetPath,
      title,
      passageTitle,
      paragraphCount: paragraphs.length,
      statementCount: parsedStatements.statements.length,
    });

    new Notice(`Built matching: ${targetPath}`);
  } catch (err) {
    console.error("build_matching error:", err);
    new Notice("build_matching failed. Check console.");
  }
}

module.exports = build_matching;