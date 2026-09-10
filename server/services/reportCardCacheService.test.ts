import { describe, expect, it } from 'vitest';
import {
  summarizeSystemPrecomputeProgress,
  type SystemSchoolPrecomputeProgress,
} from './reportCardCacheService.js';

function schoolProgress(
  overrides: Partial<SystemSchoolPrecomputeProgress>,
): SystemSchoolPrecomputeProgress {
  return {
    schoolId: 'school-id',
    schoolName: 'School',
    totalClasses: 0,
    calculatedClasses: 0,
    remainingClasses: 0,
    calculationProgressPercentage: 100,
    totalPdfs: 0,
    builtPdfs: 0,
    remainingPdfs: 0,
    pdfProgressPercentage: 100,
    isCalculationCompleted: true,
    isPdfCompleted: true,
    isQueued: false,
    ...overrides,
  };
}

describe('system report-card progress aggregation', () => {
  it('weights progress by submitted classes and excludes schools without results', () => {
    const summary = summarizeSystemPrecomputeProgress([
      schoolProgress({
        schoolId: 'small-school',
        totalClasses: 2,
        calculatedClasses: 1,
        remainingClasses: 1,
        calculationProgressPercentage: 50,
        totalPdfs: 2,
        builtPdfs: 0,
        remainingPdfs: 2,
        pdfProgressPercentage: 0,
        isCalculationCompleted: false,
        isPdfCompleted: false,
      }),
      schoolProgress({
        schoolId: 'large-school',
        totalClasses: 8,
        calculatedClasses: 8,
        totalPdfs: 8,
        builtPdfs: 8,
      }),
      schoolProgress({ schoolId: 'no-results' }),
    ]);

    expect(summary).toEqual({
      schoolsWithResults: 2,
      schoolsCalculationComplete: 1,
      schoolsPdfComplete: 1,
      schoolsFullyComplete: 1,
      totalClasses: 10,
      calculatedClasses: 9,
      remainingClasses: 1,
      calculationProgressPercentage: 90,
      totalPdfs: 10,
      builtPdfs: 8,
      remainingPdfs: 2,
      pdfProgressPercentage: 80,
    });
  });

  it('reports a complete empty workload without counting a completed school', () => {
    expect(summarizeSystemPrecomputeProgress([])).toMatchObject({
      schoolsWithResults: 0,
      schoolsCalculationComplete: 0,
      totalClasses: 0,
      calculationProgressPercentage: 100,
      totalPdfs: 0,
      pdfProgressPercentage: 100,
    });
  });
});
