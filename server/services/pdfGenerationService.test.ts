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

  it('builds a deterministic sanitized object path with testType', () => {
    expect(getPdfStorageObjectPath({ ...key, testType: 'Post mock' })).toBe(
      'school-123/class-456_Term_1_End_of_Term_Post_mock_2026.pdf',
    );
    expect(getPdfStorageObjectPath({ ...key, testType: 'all' })).toBe(
      'school-123/class-456_Term_1_End_of_Term_2026.pdf',
    );
  });

  it('accepts only an untampered token for the requested class and testType', () => {
    const token = createInternalRenderToken(key);

    expect(verifyInternalRenderToken(key, token)).toBe(true);
    expect(verifyInternalRenderToken({ ...key, classId: 'another-class' }, token)).toBe(false);
    expect(verifyInternalRenderToken(key, `${token.slice(0, -1)}x`)).toBe(false);

    const tokenWithTest = createInternalRenderToken({ ...key, testType: 'Post mock' });
    expect(verifyInternalRenderToken({ ...key, testType: 'Post mock' }, tokenWithTest)).toBe(true);
    expect(verifyInternalRenderToken({ ...key, testType: 'Mid Term' }, tokenWithTest)).toBe(false);
  });
});
