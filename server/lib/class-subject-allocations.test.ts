import { describe, expect, it } from 'vitest';
import { groupClassSubjectAllocations } from './class-subject-allocations.js';

describe('groupClassSubjectAllocations', () => {
  it('returns one subject with every teacher allocation preserved', () => {
    const subjects = groupClassSubjectAllocations([
      {
        id: 'allocation-1',
        subject_id: 'biology',
        teacher_id: 'teacher-1',
        teacher_name: null,
        subjects: { id: 'biology', name: 'Biology', code: 'BIO', department: 'Sciences' },
        profiles: { id: 'teacher-1', full_name: 'Teacher One' },
      },
      {
        id: 'allocation-2',
        subject_id: 'biology',
        teacher_id: 'teacher-2',
        teacher_name: 'Teacher Two Snapshot',
        subjects: [{ id: 'biology', name: 'Biology', code: 'BIO', department: 'Sciences' }],
        profiles: [{ id: 'teacher-2', full_name: 'Teacher Two' }],
      },
    ]);

    expect(subjects).toHaveLength(1);
    expect(subjects[0]).toMatchObject({
      id: 'biology',
      name: 'Biology',
      allocations: [
        { classSubjectId: 'allocation-1', teacherId: 'teacher-1', teacherName: 'Teacher One' },
        { classSubjectId: 'allocation-2', teacherId: 'teacher-2', teacherName: 'Teacher Two' },
      ],
      teachers: [
        { id: 'teacher-1', name: 'Teacher One' },
        { id: 'teacher-2', name: 'Teacher Two' },
      ],
    });
  });

  it('keeps an unassigned allocation without creating an empty teacher', () => {
    const [subject] = groupClassSubjectAllocations([
      {
        id: 'allocation-1',
        subject_id: 'english',
        teacher_id: null,
        subjects: { id: 'english', name: 'English', code: 'ENG', department: 'Languages' },
        profiles: null,
      },
    ]);

    expect(subject.allocations).toEqual([
      { classSubjectId: 'allocation-1', teacherId: null, teacherName: null },
    ]);
    expect(subject.teachers).toEqual([]);
  });
});
