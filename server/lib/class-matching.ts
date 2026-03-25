
/**
 * Normalizes a class name for robust matching.
 * Strips common prefixes, all whitespace, and non-alphanumeric characters,
 * then lowercases the result.
 *
 * Examples:
 *   "FORM 1 T3"  → "1t3"
 *   "FORM 1T3"   → "1t3"
 *   "Form1T3"    → "1t3"
 *   "Grade 10A"  → "10a"
 */
export function normalizeClassName(name: string): string {
  if (!name) return "";
  return name
    .trim()
    // Remove common class-name prefixes (followed by optional whitespace)
    .replace(/^(Grade|Form|Class|Level|Year)\s*/i, "")
    // Collapse all whitespace
    .replace(/\s+/g, "")
    // Remove anything that is not a letter or digit
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

/**
 * Finds the best matching class from a list of classes.
 */
export function findBestClassMatch(
  inputName: string,
  classes: { id: string; name: string }[]
): { id: string; name: string } | null {
  if (!inputName || !classes || classes.length === 0) return null;

  const trimmedInput = inputName.trim();
  
  // 1. Try exact match (case-insensitive)
  const exactMatch = classes.find(
    (c) => c.name.toLowerCase() === trimmedInput.toLowerCase()
  );
  if (exactMatch) return exactMatch;

  // 2. Try normalized match
  const normalizedInput = normalizeClassName(trimmedInput);
  if (!normalizedInput) return null;

  const normalizedMatch = classes.find(
    (c) => normalizeClassName(c.name) === normalizedInput
  );
  
  if (normalizedMatch) return normalizedMatch;

  // 3. Try partial match (if input is contained in class name or vice-versa after normalization)
  const partialMatch = classes.find((c) => {
    const normClass = normalizeClassName(c.name);
    return normClass.includes(normalizedInput) || normalizedInput.includes(normClass);
  });

  return partialMatch || null;
}
