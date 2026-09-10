export interface ClassSubjectAllocationRow {
  id: string;
  subject_id?: string | null;
  teacher_id?: string | null;
  teacher_name?: string | null;
  subjects?: ClassSubjectRecord | ClassSubjectRecord[] | null;
  profiles?: TeacherProfileRecord | TeacherProfileRecord[] | null;
}

interface ClassSubjectRecord {
  id: string;
  name: string;
  code?: string | null;
  department?: string | null;
}

interface TeacherProfileRecord {
  id?: string;
  full_name?: string | null;
}

export interface ClassSubjectAllocation {
  classSubjectId: string;
  teacherId: string | null;
  teacherName: string | null;
}

export interface GroupedClassSubject {
  id: string;
  name: string;
  code: string | null;
  department: string | null;
  allocations: ClassSubjectAllocation[];
  teachers: Array<{ id: string; name: string | null }>;
  classSubjectId: string | null;
  teacherId: string | null;
  teacherName: string | null;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export function groupClassSubjectAllocations(
  rows: ClassSubjectAllocationRow[] = [],
): GroupedClassSubject[] {
  const grouped = new Map<string, GroupedClassSubject>();

  for (const row of rows) {
    const subject = firstRelation(row.subjects);
    const subjectId = subject?.id ?? row.subject_id;

    if (!subject || !subjectId) continue;

    let groupedSubject = grouped.get(subjectId);
    if (!groupedSubject) {
      groupedSubject = {
        id: subjectId,
        name: subject.name,
        code: subject.code ?? null,
        department: subject.department ?? null,
        allocations: [],
        teachers: [],
        classSubjectId: null,
        teacherId: null,
        teacherName: null,
      };
      grouped.set(subjectId, groupedSubject);
    }

    const profile = firstRelation(row.profiles);
    const teacherName = profile?.full_name ?? row.teacher_name ?? null;
    const allocation = {
      classSubjectId: row.id,
      teacherId: row.teacher_id ?? null,
      teacherName,
    };

    groupedSubject.allocations.push(allocation);

    if (!groupedSubject.classSubjectId) {
      groupedSubject.classSubjectId = allocation.classSubjectId;
      groupedSubject.teacherId = allocation.teacherId;
      groupedSubject.teacherName = allocation.teacherName;
    }

    if (
      allocation.teacherId &&
      !groupedSubject.teachers.some((teacher) => teacher.id === allocation.teacherId)
    ) {
      groupedSubject.teachers.push({
        id: allocation.teacherId,
        name: allocation.teacherName,
      });
    }
  }

  return Array.from(grouped.values()).sort((left, right) => {
    const leftLabel = left.code || left.name;
    const rightLabel = right.code || right.name;
    return leftLabel.localeCompare(rightLabel, undefined, { numeric: true });
  });
}
