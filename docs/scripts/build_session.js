async function build_session(tp) {
  const vault = app.vault;

  const build_cloze = tp.user.build_cloze;
  const build_matching = tp.user.build_matching;
  const build_reading = tp.user.build_reading;
  const build_translation = tp.user.build_translation;

  const examType = await tp.system.prompt("Exam type (e.g. cet4, cet6, kaoyan, gaokao)");
  if (!examType) {
    new Notice("Cancelled: no exam type provided.");
    return;
  }

  const session = await tp.system.prompt("Session (e.g. 2024-june-1)");
  if (!session) {
    new Notice("Cancelled: no session provided.");
    return;
  }

  const targetFolder = `exams/${examType}/${session}`;
  const indexPath = `${targetFolder}/index.md`;

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

  async function writeFile(path, content) {
    const existing = vault.getAbstractFileByPath(path);
    if (existing) {
      await vault.modify(existing, content);
    } else {
      await vault.create(path, content);
    }
  }

  function formatExamLabel(examType) {
    const map = {
      cet4: "CET-4",
      cet6: "CET-6",
      kaoyan: "Kaoyan",
      gaokao: "Gaokao",
    };
    return map[examType] || examType;
  }

  function formatSessionLabel(session) {
    const parts = session.split("-");
    if (parts.length >= 2) {
      const year = parts[0];
      const rawMonth = parts[1];
      const map = {
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
      const month = map[(rawMonth || "").toLowerCase()] || rawMonth;
      const suffix = parts.length > 2 ? `-${parts.slice(2).join("-")}` : "";
      return `${year} ${month}${suffix}`;
    }
    return session;
  }

  function buildIndex(examType, session) {
    const displayTitle = `${formatExamLabel(examType)} ${formatSessionLabel(session)}`;
    return `# ${displayTitle}

<SectionList exam-type="${examType}" session="${session}" />
`;
  }

  try {
    await ensureFolder(targetFolder);

    await build_cloze(tp, { examType, session });
    await build_matching(tp, { examType, session });
    await build_reading(tp, { examType, session, readingNumber: "1" });
    await build_reading(tp, { examType, session, readingNumber: "2" });
    await build_translation(tp, { examType, session });

    await writeFile(indexPath, buildIndex(examType, session));

    console.log("Session built successfully:", { examType, session, targetFolder });
    new Notice(`Built full session: ${targetFolder}`);
  } catch (err) {
    console.error("build_session error:", err);
    new Notice("build_session failed. Check console.");
  }
}

module.exports = build_session;