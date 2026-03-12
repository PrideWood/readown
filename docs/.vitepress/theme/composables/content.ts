import catalog from '/.generated/sections.generated.json';

export type SectionType = 'mcq-reading' | 'matching' | 'cloze' | 'translation';

export interface SectionMeta {
  title: string;
  sectionId: string;
  examType: string;
  session: string;
  part: string;
  type: SectionType;
  interactive: boolean;
  route: string;
  relativePath: string;
}

export interface SectionEntry {
  meta: SectionMeta;
  data: Record<string, unknown>;
}

interface SessionNode {
  examType: string;
  session: string;
  sections: SectionMeta[];
}

interface ExamNode {
  examType: string;
  sessions: Record<string, SessionNode>;
}

interface Catalog {
  exams: Record<string, ExamNode>;
  sectionsByRelativePath: Record<string, SectionEntry>;
  sectionsById: Record<string, SectionEntry>;
}

const data = catalog as Catalog;

export function getExamTypes(): string[] {
  return ['cet4', 'cet6', 'kaoyan', 'gaokao'];
}

export function getExamSessions(examType: string): SessionNode[] {
  const exam = data.exams[examType];
  if (!exam) return [];

  return Object.values(exam.sessions)
    .map((session) => ({
      ...session,
      sections: [...session.sections].sort((a, b) => a.sectionId.localeCompare(b.sectionId))
    }))
    .sort((a, b) => b.session.localeCompare(a.session));
}

export function getSessionSections(examType: string, session: string): SectionMeta[] {
  return getExamSessions(examType).find((item) => item.session === session)?.sections ?? [];
}

export function getSectionByRelativePath(relativePath: string): SectionEntry | undefined {
  return data.sectionsByRelativePath[relativePath];
}

export function getSectionById(sectionId: string): SectionEntry | undefined {
  return data.sectionsById[sectionId];
}

export function getAllSections(): SectionMeta[] {
  return Object.values(data.sectionsById)
    .map((entry) => entry.meta)
    .sort((a, b) => a.sectionId.localeCompare(b.sectionId));
}

export function getSectionsByType(type: SectionType): SectionMeta[] {
  return getAllSections().filter((section) => section.type === type);
}
