<%*
try {
  const examType = await tp.system.prompt("Exam type: cet4 / cet6 / kaoyan / gaokao");
  if (!examType) {
    new Notice("Cancelled: no exam type provided.");
    return;
  }

  const session = await tp.system.prompt("Session name: e.g. 2024-june-1");
  if (!session) {
    new Notice("Cancelled: no session provided.");
    return;
  }

  const vault = app.vault;
  const baseFolder = `source-exams/${examType}/${session}`;

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

  function formatExamLabel(examType) {
    const examLabelMap = {
      cet4: "CET-4",
      cet6: "CET-6",
      kaoyan: "Kaoyan",
      gaokao: "Gaokao",
    };
    return examLabelMap[examType] || examType;
  }

  function formatSessionLabel(session) {
    const parts = session.split("-");
    if (parts.length === 2) {
      const [year, month] = parts;
      const monthMap = {
        jan: "January",
        january: "January",
        feb: "February",
        february: "February",
        mar: "March",
        march: "March",
        apr: "April",
        april: "April",
        may: "May",
        jun: "June",
        june: "June",
        jul: "July",
        july: "July",
        aug: "August",
        august: "August",
        sep: "September",
        sept: "September",
        september: "September",
        oct: "October",
        october: "October",
        nov: "November",
        november: "November",
        dec: "December",
        december: "December",
      };
      return `${year} ${monthMap[(month || "").toLowerCase()] || month}`;
    }
    return session;
  }

  function makeDisplayTitle(examType, session) {
    return `${formatExamLabel(examType)} ${formatSessionLabel(session)}`;
  }

  function makeTitle(kind, examType, session) {
    const displayTitle = makeDisplayTitle(examType, session);

    const titleMap = {
      index: displayTitle,
      cloze: `${displayTitle} Section A Cloze`,
      matching: `${displayTitle} Section B Matching`,
      "section-c-reading-1": `${displayTitle} Section C Reading 1`,
      "section-c-reading-2": `${displayTitle} Section C Reading 2`,
      translation: `${displayTitle} Translation`,
    };

    return titleMap[kind] || `${displayTitle} ${kind}`;
  }

  function makeSectionId(kind, examType, session) {
    if (kind === "index") return `${examType}-${session}-index`;
    if (kind === "translation") return `${examType}-${session}-translation`;
    if (kind === "cloze") return `${examType}-${session}-section-a-cloze`;
    if (kind === "matching") return `${examType}-${session}-section-b-matching`;
    return `${examType}-${session}-${kind}`;
  }

  async function readTemplate(path) {
    const file = vault.getAbstractFileByPath(path);
    if (!file) {
      throw new Error(`Template not found: ${path}`);
    }
    return await vault.read(file);
  }

  function fillTemplate(content, replacements) {
    let output = content;
    for (const [key, value] of Object.entries(replacements)) {
      output = output.split(key).join(value);
    }
    return output;
  }

  await ensureFolder(baseFolder);

  const templateMap = {
    index: "templates/source-index.md",
    cloze: "templates/source-cloze.md",
    matching: "templates/source-matching.md",
    "section-c-reading-1": "templates/source-reading.md",
    "section-c-reading-2": "templates/source-reading.md",
    translation: "templates/source-translation.md",
  };

  const fileKinds = [
    "index",
    "cloze",
    "matching",
    "section-c-reading-1",
    "section-c-reading-2",
    "translation",
  ];

  for (const kind of fileKinds) {
    try {
      const filepath = `${baseFolder}/${kind}.md`;

      if (vault.getAbstractFileByPath(filepath)) {
        console.log(`[skip] already exists: ${filepath}`);
        continue;
      }

      const rawTemplate = await readTemplate(templateMap[kind]);
      const title = makeTitle(kind, examType, session);
      const displayTitle = makeDisplayTitle(examType, session);
      const sectionId = makeSectionId(kind, examType, session);

      const rendered = fillTemplate(rawTemplate, {
        "__TITLE__": title,
        "__DISPLAY_TITLE__": displayTitle,
        "__EXAM_TYPE__": examType,
        "__SESSION__": session,
        "__SECTION_ID__": sectionId,
      });

      await vault.create(filepath, rendered);
      console.log(`[created] ${filepath}`);
    } catch (fileErr) {
      console.error(`Failed while creating ${kind}:`, fileErr);
      new Notice(`Failed while creating ${kind}. Check console.`);
      throw fileErr;
    }
  }

  new Notice(`Created source session: ${baseFolder}`);
} catch (err) {
  console.error("create-source-exam-session error:", err);
  new Notice("create-source-exam-session failed. Open console for details.");
}
%>