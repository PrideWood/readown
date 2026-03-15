async function build_all_sessions(tp) {
  const vault = app.vault;
  const build_session = tp.user.build_session;

  if (!build_session) {
    new Notice("build_session is not available. Check Templater user scripts.");
    return;
  }

  async function listChildren(folderPath) {
    const folder = vault.getAbstractFileByPath(folderPath);
    if (!folder || !folder.children) return [];
    return folder.children;
  }

  function isFolder(item) {
    return item && item.children;
  }

  const sourceRoot = "source-exams";
  const sourceRootFolder = vault.getAbstractFileByPath(sourceRoot);

  if (!sourceRootFolder || !sourceRootFolder.children) {
    new Notice("source-exams folder not found.");
    return;
  }

  const sessionsToBuild = [];

  try {
    const examTypeFolders = await listChildren(sourceRoot);

    for (const examFolder of examTypeFolders) {
      if (!isFolder(examFolder)) continue;

      const examType = examFolder.name;
      const sessionFolders = examFolder.children || [];

      for (const sessionFolder of sessionFolders) {
        if (!isFolder(sessionFolder)) continue;

        const session = sessionFolder.name;
        sessionsToBuild.push({ examType, session });
      }
    }

    if (sessionsToBuild.length === 0) {
      new Notice("No sessions found under source-exams.");
      return;
    }

    console.log("Sessions to build:", sessionsToBuild);

    let successCount = 0;
    const failed = [];

    for (const item of sessionsToBuild) {
      try {
        console.log(`Building session: ${item.examType}/${item.session}`);
        await build_session(tp, {
          examType: item.examType,
          session: item.session,
        });
        successCount++;
      } catch (err) {
        console.error(`Failed to build ${item.examType}/${item.session}:`, err);
        failed.push({
          examType: item.examType,
          session: item.session,
          error: String(err),
        });
      }
    }

    if (failed.length === 0) {
      new Notice(`Built all sessions successfully (${successCount})`);
    } else {
      new Notice(`Built ${successCount} sessions, ${failed.length} failed. Check console.`);
      console.error("Failed sessions:", failed);
    }
  } catch (err) {
    console.error("build_all_sessions error:", err);
    new Notice("build_all_sessions failed. Check console.");
  }
}

module.exports = build_all_sessions;