import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo.js";
import {
  handleLogin,
  handleStudentLogin,
  handleStudentAlternativeLogin,
  handleRegisterStaff,
  handleRegisterSchool,
  handleRegisterSuperAdmin,
  handleListSuperAdmins,
  handleDeleteSuperAdmin
} from "./routes/auth.js";
import {
  handleListStudents,
  handleGetStudent,
  handleCreateStudent,
  handleUpdateStudent,
  handleDeleteStudent,
  handleSearchStudents,
  handleBulkImportStudents,
  handleGetStudentsByGrade,
  handleGetStudentStats
} from "./routes/students.js";
import {
  handleCreateWebsite,
  handleGetWebsite,
  handleUpdateWebsite,
  handlePublishWebsite,
  handleListThemes,
  handleListPages,
  handleGetPage,
  handleUpdatePage
} from "./routes/websites.js";
import {
  handleListSchools,
  handleGetSchool,
  handleCreateSchool,
  handleUpdateSchool,
  handleDeleteSchool
} from "./routes/schools.js";
import {
  handleGetDashboardStats,
  handleGetSchoolsWithSubscriptions,
  handleGetSubscriptions
} from "./routes/dashboard.js";
import {
  handleGetSubscriptions as handleGetAllSubscriptions,
  handleGetPlans,
  handleGetPaymentMethods,
  handleGetBillingHistory,
  handleCreateSubscription,
  handleUpdateSubscription,
  handleCancelSubscription,
  handleAddPaymentMethod,
  handleSetDefaultPaymentMethod,
  handleDeletePaymentMethod
} from "./routes/subscriptions.js";
import {
  handleGetSystemSettings,
  handleUpdateSystemSetting,
  handleGetEmailSettings,
  handleUpdateEmailSettings,
  handleTestEmail,
  handleGetSecuritySettings,
  handleUpdateSecuritySettings,
  handleGetBackupSettings,
  handleUpdateBackupSettings,
  handleTriggerBackup,
  handleGetSettingsAudit
} from "./routes/system-settings.js";
import {
  handleListTeachers,
  handleGetTeacher,
  handleGetCurrentTeacher,
  handleCreateTeacher,
  handleUpdateTeacher,
  handleDeleteTeacher,
  handleSearchTeachers,
  handleGetTeacherStats
} from './routes/teachers.js';
import {
  handleListClasses,
  handleGetClass,
  handleCreateClass,
  handleUpdateClass,
  handleDeleteClass,
  handleSearchClasses,
  handleGetClassStats
} from "./routes/classes.js";
import notificationsRouter from "./routes/notifications.js";
import supportRouter from "./routes/support.js";
import databaseRouter from "./routes/database.js";
import setupRouter from "./routes/setup.js";
import {
  handleListSubjects,
  handleGetSubject,
  handleCreateSubject,
  handleUpdateSubject,
  handleDeleteSubject,
  handleSearchSubjects
} from "./routes/subjects.js";
import {
  handleListAssignments,
  handleGetAssignment,
  handleCreateAssignment,
  handleUpdateAssignment,
  handleDeleteAssignment,
  handleGetAssignmentStats,
} from "./routes/assignments.js";
import {
  handleListAttendance,
  handleGetAttendance,
  handleRecordAttendance,
  handleUpdateAttendance,
  handleDeleteAttendance,
  handleRecordBulkAttendance,
  handleGetAttendanceStats,
  handleGetAttendanceForPeriod
} from "./routes/attendance.js";
import {
  handleListFeeStructures, handleCreateFeeStructure, handleUpdateFeeStructure, handleDeleteFeeStructure,
  handleListInvoices, handleCreateInvoice, handleListPayments, handleRecordPayment, handleGetFinanceStats
} from "./routes/finance.js";
import {
  handleListTimeSlots, handleCreateTimeSlot, handleUpdateTimeSlot, handleDeleteTimeSlot,
  handleGetTimetable, handleCreateTimetableEntry, handleUpdateTimetableEntry, handleDeleteTimetableEntry
} from "./routes/timetable.js";
import {
  handleListTermGrades, handleRecordTermGrade, handleGenerateReportCard, handleListReportCards
} from "./routes/grades.js";
import {
  handleListAdmissionPeriods, handleCreateAdmissionPeriod, handleListApplications, handleCreateApplication, handleUpdateApplicationStatus
} from "./routes/admissions.js";
import {
  handleListParents, handleCreateParent, handleLinkParentToStudent, handleGetParentChildren
} from "./routes/parents.js";
import { handleGetReportStats } from "./routes/reports.js";

export function createServer() {
  console.log("Creating Express server...");
  const app = express();

  // Middleware
  app.use(cors({ origin: 'https://muchi.vercel.app' }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Authentication routes
  app.post("/api/auth/login", handleLogin);
  app.post("/api/auth/student-login", handleStudentLogin);
  app.post("/api/auth/student-alternative-login", handleStudentAlternativeLogin);
  app.post("/api/auth/register-staff", handleRegisterStaff);
  app.post("/api/auth/register-school", handleRegisterSchool);
  app.post("/api/auth/register-superadmin", handleRegisterSuperAdmin);

  // Super Admin Management routes
  app.get("/api/auth/list-superadmins", handleListSuperAdmins);
  app.delete("/api/auth/delete-superadmin/:userId", handleDeleteSuperAdmin);

  // Student routes
  app.get("/api/students", handleListStudents);
  app.get("/api/students/stats", handleGetStudentStats);
  app.get("/api/students/grade/:grade", handleGetStudentsByGrade);
  app.post("/api/students/search", handleSearchStudents);
  app.post("/api/students/bulk-import", handleBulkImportStudents);
  app.get("/api/students/:studentId", handleGetStudent);
  app.post("/api/students", handleCreateStudent);
  app.put("/api/students/:studentId", handleUpdateStudent);
  app.delete("/api/students/:studentId", handleDeleteStudent);

  // Teacher routes
  app.get("/api/teachers", handleListTeachers);
  app.get("/api/teachers/current", handleGetCurrentTeacher);
  app.get("/api/teachers/stats", handleGetTeacherStats);
  app.post("/api/teachers/search", handleSearchTeachers);
  app.get("/api/teachers/:teacherId", handleGetTeacher);
  app.post("/api/teachers", handleCreateTeacher);
  app.put("/api/teachers/:teacherId", handleUpdateTeacher);
  app.delete("/api/teachers/:teacherId", handleDeleteTeacher);

  // Class routes
  app.get("/api/classes", handleListClasses);
  app.get("/api/classes/stats", handleGetClassStats);
  app.post("/api/classes/search", handleSearchClasses);
  app.get("/api/classes/:classId", handleGetClass);
  app.post("/api/classes", handleCreateClass);
  app.put("/api/classes/:classId", handleUpdateClass);
  app.delete("/api/classes/:classId", handleDeleteClass);

  // Subject routes
  app.get("/api/subjects", handleListSubjects);
  app.post("/api/subjects/search", handleSearchSubjects);
  app.get("/api/subjects/:subjectId", handleGetSubject);
  app.post("/api/subjects", handleCreateSubject);
  app.put("/api/subjects/:subjectId", handleUpdateSubject);
  app.delete("/api/subjects/:subjectId", handleDeleteSubject);

  // Assignment routes
  app.get("/api/assignments", handleListAssignments);
  app.get("/api/assignments/stats", handleGetAssignmentStats);
  app.get("/api/assignments/:assignmentId", handleGetAssignment);
  app.post("/api/assignments", handleCreateAssignment);
  app.put("/api/assignments/:assignmentId", handleUpdateAssignment);
  app.delete("/api/assignments/:assignmentId", handleDeleteAssignment);

  // Attendance routes
  app.get("/api/attendance", handleListAttendance);
  app.get("/api/attendance/stats", handleGetAttendanceStats);
  app.get("/api/attendance/period", handleGetAttendanceForPeriod);
  app.post("/api/attendance/bulk", handleRecordBulkAttendance);
  app.get("/api/attendance/:id", handleGetAttendance);
  app.post("/api/attendance", handleRecordAttendance);
  app.put("/api/attendance/:id", handleUpdateAttendance);
  app.delete("/api/attendance/:id", handleDeleteAttendance);

  // Setup routes for migrations and schema alignment
  app.use("/api/setup", setupRouter);

  // Website routes
  app.post("/api/websites", handleCreateWebsite);
  app.get("/api/websites", handleGetWebsite);
  app.put("/api/websites", handleUpdateWebsite);
  app.post("/api/websites/publish", handlePublishWebsite);

  // Theme routes
  app.get("/api/themes", handleListThemes);

  // Page routes
  app.get("/api/pages", handleListPages);
  app.get("/api/pages/:pageId", handleGetPage);
  app.put("/api/pages/:pageId", handleUpdatePage);

  // School routes
  app.get("/api/schools", handleListSchools);
  app.get("/api/schools/:id", handleGetSchool);
  app.post("/api/schools", handleCreateSchool);
  app.put("/api/schools/:id", handleUpdateSchool);
  app.delete("/api/schools/:id", handleDeleteSchool);

  // Dashboard routes
  app.get("/api/dashboard/stats", (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    handleGetDashboardStats(req, res);
  });
  app.get("/api/dashboard/schools", (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    handleGetSchoolsWithSubscriptions(req, res);
  });
  app.get("/api/dashboard/subscriptions", (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    handleGetSubscriptions(req, res);
  });

  // Subscription Management routes
  app.get("/api/subscriptions", handleGetAllSubscriptions);
  app.post("/api/subscriptions", handleCreateSubscription);
  app.put("/api/subscriptions/:id", handleUpdateSubscription);
  app.delete("/api/subscriptions/:id", handleCancelSubscription);

  // Plan routes
  app.get("/api/plans", handleGetPlans);

  // Payment Method routes
  app.get("/api/payment-methods", handleGetPaymentMethods);
  app.post("/api/payment-methods", handleAddPaymentMethod);
  app.put("/api/payment-methods/:id/default", handleSetDefaultPaymentMethod);
  app.delete("/api/payment-methods/:id", handleDeletePaymentMethod);

  // Billing History routes
  app.get("/api/billing-history", handleGetBillingHistory);

  // System Settings routes
  app.get("/api/system-settings", handleGetSystemSettings);
  app.put("/api/system-settings", handleUpdateSystemSetting);

  // Email Settings routes
  app.get("/api/email-settings", handleGetEmailSettings);
  app.put("/api/email-settings", handleUpdateEmailSettings);
  app.post("/api/email-settings/test", handleTestEmail);

  // Security Settings routes
  app.get("/api/security-settings", handleGetSecuritySettings);
  app.put("/api/security-settings", handleUpdateSecuritySettings);

  // Backup Settings routes
  app.get("/api/backup-settings", handleGetBackupSettings);
  app.put("/api/backup-settings", handleUpdateBackupSettings);
  app.post("/api/backup-settings/trigger", handleTriggerBackup);

  // Settings Audit routes
  app.get("/api/settings-audit", handleGetSettingsAudit);

  // Notifications routes
  app.use("/api/notifications", notificationsRouter);

  // Support routes
  app.use("/api/support", supportRouter);

  // Database management routes
  app.use("/api/database", databaseRouter);

  // --- Finance Routes ---
  app.get("/api/finance/fee-structures", handleListFeeStructures);
  app.post("/api/finance/fee-structures", handleCreateFeeStructure);
  app.put("/api/finance/fee-structures/:id", handleUpdateFeeStructure);
  app.delete("/api/finance/fee-structures/:id", handleDeleteFeeStructure);
  app.get("/api/finance/invoices", handleListInvoices);
  app.post("/api/finance/invoices", handleCreateInvoice);
  app.get("/api/finance/payments", handleListPayments);
  app.post("/api/finance/payments", handleRecordPayment);
  app.get("/api/finance/stats", handleGetFinanceStats);

  // --- Timetable Routes ---
  app.get("/api/timetable/slots", handleListTimeSlots);
  app.post("/api/timetable/slots", handleCreateTimeSlot);
  app.put("/api/timetable/slots/:id", handleUpdateTimeSlot);
  app.delete("/api/timetable/slots/:id", handleDeleteTimeSlot);
  app.get("/api/timetable/entries", handleGetTimetable);
  app.post("/api/timetable/entries", handleCreateTimetableEntry);
  app.put("/api/timetable/entries/:id", handleUpdateTimetableEntry);
  app.delete("/api/timetable/entries/:id", handleDeleteTimetableEntry);

  // --- Grades Routes ---
  app.get("/api/grades/term", handleListTermGrades);
  app.post("/api/grades/term", handleRecordTermGrade);
  app.get("/api/grades/reports", handleListReportCards);
  app.post("/api/grades/reports", handleGenerateReportCard);

  // --- Admissions Routes ---
  app.get("/api/admissions/periods", handleListAdmissionPeriods);
  app.post("/api/admissions/periods", handleCreateAdmissionPeriod);
  app.get("/api/admissions/applications", handleListApplications);
  app.post("/api/admissions/applications", handleCreateApplication);
  app.put("/api/admissions/applications/:id/status", handleUpdateApplicationStatus);

  // --- Parent Routes ---
  app.get("/api/parents", handleListParents);
  app.post("/api/parents", handleCreateParent);
  app.post("/api/parents/link", handleLinkParentToStudent);
  app.get("/api/parents/:id/children", handleGetParentChildren);

  // --- Report Routes ---
  app.get("/api/reports/stats", handleGetReportStats);

  // Setup routes
  app.use("/api/setup", setupRouter);

  return app;
}
