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
  // Prioritize "Grade" or "G" prefixes and explicitly exclude "Form" (Secondary)
  const isG57Grade = (gradeStr.includes("5") || gradeStr.includes("6") || gradeStr.includes("7")) && 
                     !gradeStr.includes("1") && // Avoid matching 15, 16, 17
                     !gradeStr.includes("form") &&
                     (gradeStr.includes("grade") || gradeStr.includes("g"));

  const isG14Grade = (gradeStr.includes("1") || gradeStr.includes("2") || gradeStr.includes("3") || gradeStr.includes("4")) && 
                     !gradeStr.includes("10") && !gradeStr.includes("11") && !gradeStr.includes("12") &&
                     !gradeStr.includes("form") &&
                     (gradeStr.includes("grade") || gradeStr.includes("g"));

  // Selection Logic
  // 1. If explicitly Lower Primary school, use Junior format
  // 2. If explicitly Upper Primary school, use G5-7 format
  // 3. If Combined Primary, use grade-based detection
  // 4. Default to standard secondary report card
  
  if (isUpperPrimarySchool || (isCombinedPrimarySchool && isG57Grade)) {
    return <PrimaryReportCard data={data} term={term} examType={examType} academicYear={academicYear} className={className} />;
  }

  if (isLowerPrimarySchool || (isCombinedPrimarySchool && isG14Grade)) {
    return <JuniorReportCard data={data} term={term} examType={examType} academicYear={academicYear} className={className} />;
  }

  return <ReportCard data={data} term={term} examType={examType} academicYear={academicYear} className={className} />;
};
