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
  const { student, grades, gradingScale, school } = data;

  // Auto-detect if we should use the specialized formats
  const gradeStr = (student.grade || student.className || student.class || "").toString().toLowerCase();
  const isPrimarySchool = (school?.school_type || "").toLowerCase().includes("primary");
  
  const isPrimaryG57 = isPrimarySchool && 
                       (gradeStr.includes("5") || gradeStr.includes("6") || gradeStr.includes("7")) && 
                       !gradeStr.includes("1") && // Avoid matching 15, 16, 17
                       (gradeStr.includes("grade") || gradeStr.includes("g"));

  const isPrimaryG14 = isPrimarySchool && 
                       (gradeStr.includes("1") || gradeStr.includes("2") || gradeStr.includes("3") || gradeStr.includes("4")) && 
                       !gradeStr.includes("10") && !gradeStr.includes("11") && !gradeStr.includes("12") &&
                       (gradeStr.includes("grade") || gradeStr.includes("g"));

  if (isPrimaryG57) {
    return <PrimaryReportCard data={data} term={term} examType={examType} academicYear={academicYear} className={className} />;
  }

  if (isPrimaryG14) {
    return <JuniorReportCard data={data} term={term} examType={examType} academicYear={academicYear} className={className} />;
  }

  return <ReportCard data={data} term={term} examType={examType} academicYear={academicYear} className={className} />;
};
