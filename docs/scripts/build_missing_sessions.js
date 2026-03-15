async function build_missing_sessions(tp) {
  const vault = app.vault;
  const build_session = tp.user.build_session;

  if (!build_session) {
    new Notice("build_session is not available. Check Templater user scripts.");
    return;
  }

  function isFolder(item) {
    return item && item.children;
  }

  async function listChildren(folderPath) {
    const folder = vault.getAbstractFileByPath(folderPath);
    if (!folder || !folder.children) return [];
    return folder.children;
  }

  const sourceRoot = "source-exams";
  const targetRoot = "exams";

  const sourceRootFolder = vault.getAbstractFileByPath(sourceRoot);
  if (!sourceRootFolder || !sourceRootFolder.children) {
    new Notice("source-exams folder not found.");
    return;
  }

  const sessionsToBuild = [];
  const skipped = [];

  try {
    const examTypeFolders = await listChildren(sourceRoot);

    for (const examFolder of examTypeFolders) {
      if (!isFolder(examFolder)) continue;

      const examType = examFolder.name;
      const sessionFolders = examFolder.children || [];

      for (const sessionFolder of sessionFolders) {
        if (!isFolder(sessionFolder)) continue;

        const session = sessionFolder.name;
        const targetSessionPath = `${targetRoot}/${examType}/${session}`;
        const targetSessionFolder = vault.getAbstractFileByPath(targetSessionPath);

        if (targetSessionFolder && targetSessionFolder.children) {
          skipped.push({ examType, session });
        } else {
          sessionsToBuild.push({ examType, session });
        }
      }
    }

    console.log("Missing sessions to build:", sessionsToBuild);
    console.log("Existing sessions skipped:", skipped);

    if (sessionsToBuild.length === 0) {
      new Notice("No missing sessions found. Everything is already built.");
      return;
    }

    let successCount = 0;
    const failed = [];

    for (const item of sessionsToBuild) {
      try {
        console.log(`Building missing session: ${item.examType}/${item.session}`);
        await build_session(tp, {
          examType: item.examType,
          session: item.session,
        });
        successCount++;
      } catch (err) {
        console.error(`Failed to build missing session ${item.examType}/${item.session}:`, err);
        failed.push({
          examType: item.examType,
          session: item.session,
          error: String(err),
        });
      }
    }

    if (failed.length === 0) {
      new Notice(`Built ${successCount} missing session(s) successfully.`);
    } else {
      new Notice(`Built ${successCount} missing session(s), ${failed.length} failed. Check console.`);
      console.error("Failed missing sessions:", failed);
    }
  } catch (err) {
    console.error("build_missing_sessions error:", err);
    new Notice("build_missing_sessions failed. Check console.");
  }
}

module.exports = build_missing_sessions;