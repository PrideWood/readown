import { assertField, toOptionList } from './utils.mjs';

export function parseMcqReading(sectionBlock, errors, filePath) {
  const passage = String(sectionBlock.passage ?? '').trim();
  const questions = Array.isArray(sectionBlock.questions) ? sectionBlock.questions : [];

  assertField(Boolean(passage), 'mcq-reading requires passage', errors, filePath);
  assertField(questions.length > 0, 'mcq-reading requires a non-empty questions array', errors, filePath);

  return {
    passage,
    questions: questions.map((q, idx) => {
      const qid = String(q?.id ?? idx + 1);
      const prompt = String(q?.prompt ?? '').trim();
      const answer = String(q?.answer ?? '').trim();
      const explanation = String(q?.explanation ?? '').trim();
      const options = toOptionList(q?.options, errors, filePath, `question ${qid}`);

      assertField(Boolean(prompt), `question ${qid} missing prompt`, errors, filePath);
      assertField(Boolean(answer), `question ${qid} missing answer`, errors, filePath);
      assertField(options.some((o) => o.key === answer), `question ${qid} answer ${answer} not found in options`, errors, filePath);

      return {
        id: qid,
        prompt,
        options,
        answer,
        explanation
      };
    })
  };
}
