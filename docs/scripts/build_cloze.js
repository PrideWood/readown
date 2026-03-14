async function build_cloze(tp, opts = {}) {
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

  const sourcePath = `source-exams/${examType}/${session}/cloze.md`;
  const targetFolder = `exams/${examType}/${session}`;
  const targetPath = `${targetFolder}/section-a-cloze.md`;

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
    return text.replace(/\r/g, "").trim();
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

  function parseWordBank(text) {
    const items = [];
    const lines = text.split("\n");

    for (const line of lines) {
      const m = line.match(/^\s*-\s*([A-O])\.\s*(.*)$/);
      if (m) {
        items.push({
          key: m[1],
          text: m[2].trim()
        });
      }
    }

    return items;
  }

  function parseAnswers(text) {
    const result = {};
    const lines = text.split("\n");

    for (const line of lines) {
      const m = line.match(/^\s*(\d+)\s*:\s*([A-Z])\s*$/);
      if (m) {
        result[m[1]] = m[2];
      }
    }

    return result;
  }

  function parseExplanations(text) {
    const result = {};
    const blocks = text.split(/\n(?=\d+\s*:)/g);

    for (const block of blocks) {
      const m = block.match(/^\s*(\d+)\s*:\s*([\s\S]*)$/);
      if (m) {
        result[m[1]] = cleanText(m[2]);
      }
    }

    return result;
  }

  function yamlEscapeInline(str) {
    if (str == null) return '""';
    return `"${String(str)
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')}"`;
  }

  function indentBlock(text, spaces = 2) {
    const pad = " ".repeat(spaces);
    return text
      .split("\n")
      .map(line => `${pad}${line}`)
      .join("\n");
  }

  function buildSection(frontmatter, title, passage, wordBank, answers, explanations) {
  const fm = buildFrontmatter(frontmatter);

  const wordBankYaml = wordBank.map(item =>
`  - key: ${item.key}
    text: ${yamlEscapeInline(item.text)}`
  ).join("\n");

  const answersYaml = Object.entries(answers).map(([num, ans]) =>
`  ${yamlEscapeInline(num)}: ${yamlEscapeInline(ans)}`
  ).join("\n");

  const explanationsYaml = Object.entries(explanations).map(([num, exp]) =>
`  ${yamlEscapeInline(num)}: ${yamlEscapeInline(exp)}`
  ).join("\n");

  return `${fm}# ${title}

\`\`\`section
type: cloze
passage: |-
${indentBlock(passage, 2)}
wordBank:
${wordBankYaml || "  []"}
answers:
${answersYaml || "  {}"}
explanations:
${explanationsYaml || "  {}"}
\`\`\`

<SectionRenderer />
`;
}

  try {
    const raw = await readFile(sourcePath);
    const { data, body } = parseFrontmatter(raw);

    const title = data.title || `Section A Cloze`;
    const passage = cleanText(getSection(body, "Passage"));
    const wordBank = parseWordBank(getSection(body, "Word Bank"));
    const answers = parseAnswers(getSection(body, "Answers"));
    const explanations = parseExplanations(getSection(body, "Explanations"));

    await ensureFolder(targetFolder);

    const output = buildSection(data, title, passage, wordBank, answers, explanations);
    await writeFile(targetPath, output);

    console.log("Cloze built successfully:", {
      sourcePath,
      targetPath,
      title,
      wordBankCount: wordBank.length,
      answerCount: Object.keys(answers).length,
      explanationCount: Object.keys(explanations).length,
    });

    new Notice(`Built cloze: ${targetPath}`);
  } catch (err) {
    console.error("build_cloze error:", err);
    new Notice("build_cloze failed. Check console.");
  }
}

module.exports = build_cloze;