export function assertField(condition, message, errors, filePath) {
  if (!condition) {
    errors.push(`${filePath}: ${message}`);
  }
}

export function toOptionList(optionMap, errors, filePath, contextLabel) {
  if (!optionMap || typeof optionMap !== 'object' || Array.isArray(optionMap)) {
    errors.push(`${filePath}: ${contextLabel} options must be an object like { A: "...", B: "..." }`);
    return [];
  }

  const entries = Object.entries(optionMap)
    .filter(([key, text]) => typeof key === 'string' && key.trim() && typeof text === 'string' && text.trim())
    .map(([key, text]) => ({ key: key.trim(), text: text.trim() }));

  if (entries.length < 2) {
    errors.push(`${filePath}: ${contextLabel} must contain at least two valid options`);
  }

  return entries;
}

export function normalizeMapValues(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const mapped = {};
  for (const [key, value] of Object.entries(raw)) {
    mapped[String(key)] = String(value ?? '');
  }
  return mapped;
}
