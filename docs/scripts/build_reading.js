async function build_reading(tp, opts = {}) {
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

  const readingNumber = opts.readingNumber || await tp.system.prompt("Reading number (e.g. 1 or 2)");
  if (!readingNumber) {
    new Notice("Cancelled: no reading number provided.");
    return;
  }

  const normalizedNumber = String(readingNumber).trim();

  if (!/^\d+$/.test(normalizedNumber)) {
    new Notice("Reading number must be a number like 1 or 2.");
    return;
  }

  const readingName = `section-c-reading-${normalizedNumber}`;

  const sourcePath = `source-exams/${examType}/${session}/${readingName}.md`;
  const targetFolder = `exams/${examType}/${session}`;
  const targetPath = `${targetFolder}/${readingName}.md`;

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

  // 稳定版：按行切 section，避免只取第一段
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

  function extractPromptBlock(content) {
  const lines = String(content || "").replace(/\r/g, "").split("\n");

  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith("Prompt:")) {
      start = i;
      break;
    }
  }
  if (start === -1) return "";

  const firstLine = lines[start].trim().replace(/^Prompt:\s*/, "").trim();
  const collected = [];
  if (firstLine) collected.push(firstLine);

  let i = start + 1;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 遇到选项就停止
    if (/^\s*-?\s*[A-D][.\)）]\s*/.test(trimmed)) break;

    // 遇到后续字段就停止
    if (/^\s*Answer:\s*/.test(trimmed)) break;
    if (/^\s*Explanation:\s*/.test(trimmed)) break;

    // 遇到下一个题号块也停止
    if (/^###\s+\d+\s*$/.test(trimmed)) break;

    collected.push(line);
    i++;
  }

  return cleanText(collected.join("\n"));
}

  function parseQuestions(text) {
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

    const questions = [];

    for (const block of blocks) {
      const content = block.lines.join("\n").trim();

      const prompt = extractPromptBlock(content);

      const explanation = extractLabeledBlock(content, "Explanation");
      const answerMatch = content.match(/^\s*Answer:\s*([A-Z])\s*$/m);

      const options = { A: "", B: "", C: "", D: "" };
      const contentLines = content.split("\n");

      for (const line of contentLines) {
        const opt = line.match(/^\s*-?\s*([A-D])[.\)）]\s*(.*)$/);
        if (opt) {
          options[opt[1]] = opt[2].trim();
        }
      }

      questions.push({
        id: block.id,
        prompt,
        options,
        answer: answerMatch ? answerMatch[1].trim() : "",
        explanation
      });
    }

    return questions;
  }

  function buildSection(frontmatter, title, passage, questions) {
  const fm = buildFrontmatter(frontmatter);

  const questionsYaml = questions.map(q =>
`  - id: ${yamlEscapeInline(q.id)}
    prompt: ${yamlEscapeInline(q.prompt)}
    options:
      A: ${yamlEscapeInline(q.options.A || "")}
      B: ${yamlEscapeInline(q.options.B || "")}
      C: ${yamlEscapeInline(q.options.C || "")}
      D: ${yamlEscapeInline(q.options.D || "")}
    answer: ${yamlEscapeInline(q.answer)}
    explanation: ${yamlEscapeInline(q.explanation)}`
  ).join("\n\n");

  return `${fm}# ${title}

\`\`\`section
passage: |-
${indentBlock(passage, 2)}
questions:
${questionsYaml || "  []"}
\`\`\`

<SectionRenderer />
`;
}

  try {
    const raw = await readFile(sourcePath);
    const { data, body } = parseFrontmatter(raw);

    const title = data.title || "Section C Reading";
    const passage = cleanText(getSection(body, "Passage"));
    const questions = parseQuestions(getSection(body, "Questions"));

    await ensureFolder(targetFolder);

    const output = buildSection(data, title, passage, questions);
    await writeFile(targetPath, output);

    console.log("Reading built successfully:", {
      sourcePath,
      targetPath,
      title,
      questionCount: questions.length,
      questions
    });

    new Notice(`Built reading: ${targetPath}`);
  } catch (err) {
    console.error("build_reading error:", err);
    new Notice("build_reading failed. Check console.");
  }
}

module.exports = build_reading;