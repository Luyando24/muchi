/**
 * Shared grading-scale resolution for primary (G1–7) and secondary classes.
 * G5–7 schools often configure scales on a 0–150 mark basis; the gradebook
 * stores percentages 0–100 in the DB but displays raw marks 0–150.
 */

export type ClassSection = "lower_primary" | "upper_primary" | "secondary";

export interface GradingScaleEntry {
  id?: string;
  school_id?: string;
  grade: string;
  min_percentage: number;
  max_percentage: number;
  description?: string;
  section?: string | null;
}

export const UPPER_PRIMARY_MAX_MARKS = 150;

const SECTION_ALIASES: Record<ClassSection, string[]> = {
  lower_primary: [
    "lower_primary",
    "lower primary",
    "primary_lower",
    "primary-junior",
    "g1-4",
    "grades1-4",
    "junior",
  ],
  upper_primary: [
    "upper_primary",
    "upper primary",
    "primary_upper",
    "primary-senior",
    "g5-7",
    "grades5-7",
    "upper",
  ],
  secondary: [
    "secondary",
    "secondary_school",
    "standard",
    "high school",
    "g8-12",
    "grades8-12",
  ],
};

const G57_LETTER_GRADES = new Set([
  "A+",
  "A",
  "B+",
  "B",
  "C+",
  "C",
  "D",
  "E",
  "F",
]);

function normalizeSection(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "_");
}

export function isG57Class(gradeOrClassName: string): boolean {
  const raw = (gradeOrClassName || "").toLowerCase().trim();
  if (raw.includes("form")) return false;
  const match = raw.match(/(\d{1,2})/);
  if (match) {
    const level = parseInt(match[1], 10);
    return level >= 5 && level <= 7;
  }
  return false;
}

export function isG14Class(gradeOrClassName: string): boolean {
  const raw = (gradeOrClassName || "").toLowerCase().trim();
  if (raw.includes("form")) return false;
  const match = raw.match(/(\d{1,2})/);
  if (match) {
    const level = parseInt(match[1], 10);
    return level >= 1 && level <= 4;
  }
  return false;
}

export function detectClassSection(className: string): ClassSection {
  const raw = (className || "").toLowerCase().trim();
  if (raw.includes("form")) return "secondary";

  const match = raw.match(/(\d{1,2})/);
  if (match) {
    const level = parseInt(match[1], 10);
    if (level >= 8) return "secondary";
    if (level >= 5) return "upper_primary";
    if (level >= 1) return "lower_primary";
  }

  if (raw.includes("grade 1") || raw.includes("grade 2") || raw.includes("grade 3") || raw.includes("grade 4")) {
    return "lower_primary";
  }
  if (raw.includes("grade 5") || raw.includes("grade 6") || raw.includes("grade 7")) {
    return "upper_primary";
  }

  return "secondary";
}

export function resolveClassSection(
  className: string,
  schoolType?: string,
): ClassSection {
  const type = (schoolType || "").toLowerCase();
  if (type === "lower primary") return "lower_primary";
  if (type === "upper primary") return "upper_primary";
  if (type === "secondary school" || type === "secondary") return "secondary";
  return detectClassSection(className);
}

/** True when scale ranges are configured on the G5–7 raw mark scale (0–150). */
export function usesOutOf150Scale(scales: GradingScaleEntry[]): boolean {
  return scales.length > 0 && scales.some((s) => Number(s.max_percentage) > 100);
}

export function filterScalesForSection(
  allScales: GradingScaleEntry[],
  classSection: ClassSection,
): GradingScaleEntry[] {
  const scalesWithSection = allScales.filter((s) => s.section && s.section.trim() !== "");
  if (scalesWithSection.length > 0) {
    const aliases = SECTION_ALIASES[classSection] || [classSection];
    const sectionScales = scalesWithSection.filter((s) =>
      aliases.some(
        (alias) => normalizeSection(s.section!) === normalizeSection(alias),
      ),
    );
    if (sectionScales.length > 0) return sectionScales;
  }

  if (classSection === "upper_primary") {
    return allScales.filter((s) => {
      const g = s.grade.trim().toUpperCase();
      return G57_LETTER_GRADES.has(g);
    });
  }

  if (classSection === "lower_primary") {
    const keywords = ["A RED", "B ORANGE", "C YELLOW", "D BLUE"];
    return allScales.filter((s) =>
      keywords.some((kw) => s.grade.trim().toUpperCase().includes(kw)),
    );
  }

  const secPatterns = new Set([
    "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE",
    "1", "2", "3", "4", "5", "6", "7", "8", "9",
  ]);
  const secScales = allScales.filter((s) =>
    secPatterns.has(s.grade.trim().toUpperCase()),
  );
  if (secScales.length > 0) return secScales;

  return allScales;
}

/**
 * Score used when matching against min_percentage / max_percentage.
 * @param rawMark - Mark as entered in the gradebook (0–150 for G5–7, else 0–100)
 * @param storedPercentage - Value persisted in student_grades (0–100)
 */
export function getScaleLookupScore(
  classSection: ClassSection,
  sectionScales: GradingScaleEntry[],
  options: { rawMark?: number; storedPercentage?: number },
): number {
  const raw = options.rawMark;
  const stored = options.storedPercentage;

  if (classSection === "upper_primary") {
    if (usesOutOf150Scale(sectionScales)) {
      if (raw !== undefined && !Number.isNaN(raw)) return raw;
      if (stored !== undefined && !Number.isNaN(stored)) {
        return (stored / 100) * UPPER_PRIMARY_MAX_MARKS;
      }
    }
    if (raw !== undefined && !Number.isNaN(raw)) {
      return (raw / UPPER_PRIMARY_MAX_MARKS) * 100;
    }
    return stored ?? 0;
  }

  if (raw !== undefined && !Number.isNaN(raw)) return raw;
  return stored ?? 0;
}

export function findScaleMatch(
  scales: GradingScaleEntry[],
  lookupScore: number,
): GradingScaleEntry | null {
  if (!scales.length || Number.isNaN(lookupScore)) return null;
  const sorted = [...scales].sort(
    (a, b) => Number(b.min_percentage) - Number(a.min_percentage),
  );
  return (
    sorted.find(
      (s) =>
        lookupScore >= Number(s.min_percentage) &&
        lookupScore <= Number(s.max_percentage),
    ) ?? null
  );
}

function builtinUpperPrimaryFallback(lookupScore: number): GradingScaleEntry {
  if (lookupScore >= 129) return { grade: "A+", min_percentage: 129, max_percentage: 150, description: "Distinction" };
  if (lookupScore >= 114) return { grade: "A", min_percentage: 114, max_percentage: 128, description: "Distinction" };
  if (lookupScore >= 99) return { grade: "B+", min_percentage: 99, max_percentage: 113, description: "Merit" };
  if (lookupScore >= 84) return { grade: "B", min_percentage: 84, max_percentage: 98, description: "Credit" };
  if (lookupScore >= 69) return { grade: "C+", min_percentage: 69, max_percentage: 83, description: "Definite Pass" };
  if (lookupScore >= 60) return { grade: "C", min_percentage: 60, max_percentage: 68, description: "Pass" };
  return { grade: "F", min_percentage: 0, max_percentage: 59, description: "Fail" };
}

function builtinUpperPrimaryFallbackPercent(percentage: number): GradingScaleEntry {
  if (percentage >= 86) return { grade: "A+", min_percentage: 86, max_percentage: 100, description: "Distinction" };
  if (percentage >= 76) return { grade: "A", min_percentage: 76, max_percentage: 85, description: "Distinction" };
  if (percentage >= 66) return { grade: "B+", min_percentage: 66, max_percentage: 75, description: "Merit" };
  if (percentage >= 56) return { grade: "B", min_percentage: 56, max_percentage: 65, description: "Credit" };
  if (percentage >= 46) return { grade: "C+", min_percentage: 46, max_percentage: 55, description: "Definite Pass" };
  if (percentage >= 40) return { grade: "C", min_percentage: 40, max_percentage: 45, description: "Pass" };
  return { grade: "F", min_percentage: 0, max_percentage: 39, description: "Fail" };
}

function builtinLowerPrimaryFallback(percentage: number): GradingScaleEntry {
  if (percentage >= 75) return { grade: "A Red", min_percentage: 75, max_percentage: 100, description: "Excellent" };
  if (percentage >= 60) return { grade: "B Orange", min_percentage: 60, max_percentage: 74, description: "Very Good" };
  if (percentage >= 50) return { grade: "C Yellow", min_percentage: 50, max_percentage: 59, description: "Good" };
  return { grade: "D Blue", min_percentage: 0, max_percentage: 49, description: "Average Below" };
}

function builtinSecondaryFallback(percentage: number): GradingScaleEntry {
  if (percentage >= 75) return { grade: "One", min_percentage: 75, max_percentage: 100, description: "Distinction" };
  if (percentage >= 70) return { grade: "Two", min_percentage: 70, max_percentage: 74, description: "Distinction" };
  if (percentage >= 65) return { grade: "Three", min_percentage: 65, max_percentage: 69, description: "Merit" };
  if (percentage >= 60) return { grade: "Four", min_percentage: 60, max_percentage: 64, description: "Merit" };
  if (percentage >= 55) return { grade: "Five", min_percentage: 55, max_percentage: 59, description: "Credit" };
  if (percentage >= 50) return { grade: "Six", min_percentage: 50, max_percentage: 54, description: "Credit" };
  if (percentage >= 45) return { grade: "Seven", min_percentage: 45, max_percentage: 49, description: "Satisfactory" };
  if (percentage >= 40) return { grade: "Eight", min_percentage: 40, max_percentage: 44, description: "Satisfactory" };
  return { grade: "Nine", min_percentage: 0, max_percentage: 39, description: "Unsatisfactory" };
}

export function resolveGradingScale(
  allScales: GradingScaleEntry[],
  classSection: ClassSection,
  options: { rawMark?: number; storedPercentage?: number },
): GradingScaleEntry {
  const sectionScales = filterScalesForSection(allScales, classSection);
  const lookupScore = getScaleLookupScore(classSection, sectionScales, options);
  const match = findScaleMatch(sectionScales, lookupScore);
  if (match) return match;

  if (classSection === "upper_primary") {
    if (usesOutOf150Scale(sectionScales)) {
      return builtinUpperPrimaryFallback(lookupScore);
    }
    return builtinUpperPrimaryFallbackPercent(lookupScore);
  }
  if (classSection === "lower_primary") {
    return builtinLowerPrimaryFallback(lookupScore);
  }
  return builtinSecondaryFallback(lookupScore);
}

export function resolveGradingScaleForStudent(
  allScales: GradingScaleEntry[],
  studentGradeOrClass: string,
  schoolType: string,
  options: { rawMark?: number; storedPercentage?: number },
): GradingScaleEntry {
  const type = (schoolType || "").toLowerCase();
  const isCombined = type === "combined primary" || type === "primary school";
  const isUpper = type === "upper primary" || (isCombined && isG57Class(studentGradeOrClass));
  const isLower = type === "lower primary" || (isCombined && isG14Class(studentGradeOrClass));

  let classSection: ClassSection = "secondary";
  if (isUpper) classSection = "upper_primary";
  else if (isLower) classSection = "lower_primary";
  else classSection = resolveClassSection(studentGradeOrClass, schoolType);

  return resolveGradingScale(allScales, classSection, options);
}

/** Stored DB percentage (integer 0–100) from a raw G5–7 mark. */
export function rawMarkToStoredPercentage(
  rawMark: number,
  classSection: ClassSection,
): number {
  if (classSection === "upper_primary") {
    return Math.round((rawMark / UPPER_PRIMARY_MAX_MARKS) * 100);
  }
  return Math.round(rawMark);
}

/** Display raw mark in gradebook from stored percentage. */
export function storedPercentageToRawMark(
  storedPercentage: number,
  classSection: ClassSection,
): number {
  if (classSection === "upper_primary") {
    return Math.round(((storedPercentage / 100) * UPPER_PRIMARY_MAX_MARKS) * 10) / 10;
  }
  return storedPercentage;
}
