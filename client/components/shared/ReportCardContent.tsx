import { ReportCard } from "./ReportCard";
import { PrimaryReportCard } from "./PrimaryReportCard";
import { JuniorReportCard } from "./JuniorReportCard";

interface ReportCardContentProps {
  data: any;
  term: string;
  examType: string;
  academicYear: string;
  className?: string;
}

export const ReportCardContent: React.FC<ReportCardContentProps> = ({ data, term, examType, academicYear, className = "" }) => {
  const { student, school } = data;

  // Auto-detect if we should use the specialized formats
  const gradeStr = (student.grade || student.className || student.class || "").toString().toLowerCase();
  const schoolType = (school?.school_type || "").toLowerCase();
  
  // Specific School Types
  const isLowerPrimarySchool = schoolType === "lower primary";
  const isUpperPrimarySchool = schoolType === "upper primary";
  const isCombinedPrimarySchool = schoolType === "combined primary" || schoolType === "primary school";
  
  // Grade-based detection for Combined schools
  // Prioritize digit-based level and explicitly exclude "Form" (Secondary)
  const getGradeLevel = (name: string) => {
    const raw = name.toLowerCase().trim();
    if (raw.includes("form")) return null; // Secondary
    const match = raw.match(/(\d{1,2})/);
    return match ? parseInt(match[1], 10) : null;
  };
  const gradeLevel = getGradeLevel(gradeStr);
  const isG57Grade = gradeLevel !== null && gradeLevel >= 5 && gradeLevel <= 7;
  const isG14Grade = gradeLevel !== null && gradeLevel >= 1 && gradeLevel <= 4;

  // Selection Logic
  // 1. If explicitly Lower Primary school, use Junior format
  // 2. If explicitly Upper Primary school, use G5-7 format
  // 3. If Combined Primary, use grade-based detection
  // 4. Default to standard secondary report card
  
  if (isUpperPrimarySchool || (isCombinedPrimarySchool && isG57Grade)) {
    return <PrimaryReportCard data={data} term={term} examType={examType} academicYear={academicYear} className={className} />;
  }

  if (isLowerPrimarySchool || (isCombinedPrimarySchool && isG14Grade)) {
    return <JuniorReportCard data={data} />;
  }

  return <ReportCard data={data} term={term} examType={examType} academicYear={academicYear} className={className} />;
};
