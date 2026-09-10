import { describe, expect, it } from 'vitest';
import {
  createInternalRenderToken,
  getPdfStorageObjectPath,
  verifyInternalRenderToken,
  type PdfKey,
} from './pdfGenerationService.js';

const key: PdfKey = {
  schoolId: 'school-123',
  classId: 'class-456',
  term: 'Term 1',
  examType: 'End of Term',
  academicYear: '2026',
};

describe('PDF storage identity', () => {
  it('builds a deterministic sanitized object path', () => {
    expect(getPdfStorageObjectPath(key)).toBe(
      'school-123/class-456_Term_1_End_of_Term_2026.pdf',
    );
  });

  it('accepts only an untampered token for the requested class', () => {
    const token = createInternalRenderToken(key);

    expect(verifyInternalRenderToken(key, token)).toBe(true);
    expect(verifyInternalRenderToken({ ...key, classId: 'another-class' }, token)).toBe(false);
    expect(verifyInternalRenderToken(key, `${token.slice(0, -1)}x`)).toBe(false);
  });
});
