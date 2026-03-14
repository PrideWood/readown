async function build_translation(tp, opts = {}) {
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

  const sourcePath = `source-exams/${examType}/${session}/translation.md`;
  const targetFolder = `exams/${examType}/${session}`;
  const targetPath = `${targetFolder}/translation.md`;

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

  function indentBlock(text, spaces = 2) {
    const pad = " ".repeat(spaces);
    return String(text || "")
      .split("\n")
      .map(line => `${pad}${line}`)
      .join("\n");
  }

  function buildSection(frontmatter, title, sourceText, reference, notes) {
  const fm = buildFrontmatter(frontmatter);

  return `${fm}# ${title}

\`\`\`section
type: translation
sourceText: |-
${indentBlock(sourceText, 2)}
reference: |-
${indentBlock(reference, 2)}
notes: |-
${indentBlock(notes, 2)}
\`\`\`

<SectionRenderer />
`;
}

  try {
    const raw = await readFile(sourcePath);
    const { data, body } = parseFrontmatter(raw);

    const title = data.title || "Translation";
    const sourceText = cleanText(getSection(body, "Source Text"));
    const reference = cleanText(getSection(body, "Reference"));
    const notes = cleanText(getSection(body, "Notes"));

    await ensureFolder(targetFolder);

    const output = buildSection(data, title, sourceText, reference, notes);
    await writeFile(targetPath, output);

    console.log("Translation built successfully:", {
      sourcePath,
      targetPath,
      title,
      sourceLength: sourceText.length,
      referenceLength: reference.length,
      notesLength: notes.length,
    });

    new Notice(`Built translation: ${targetPath}`);
  } catch (err) {
    console.error("build_translation error:", err);
    new Notice("build_translation failed. Check console.");
  }
}

module.exports = build_translation;