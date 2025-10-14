import Dexie, { Table } from "dexie";
import type {
  Task,
  Student,
  School,
  StaffUser,
  SyncQueueItem,
} from "@shared/api";

export class SchoolManagementDb extends Dexie {
  schools!: Table<School, string>;
  students!: Table<Student, string>;
  staffUsers!: Table<StaffUser, string>;
  tasks!: Table<Task, string>;
  syncQueue!: Table<SyncQueueItem, string>;

  constructor() {
    super("school_management_db_v1");
    this.version(1).stores({
      tasks: "id,taskNumber,schoolId,assigneeId,status,updatedAt",
      syncQueue: "id,createdAt",
    });
    this.version(2).stores({
      schools: "id,code,name,district,province,schoolType",
      students: "id,nrc,schoolId,firstName,lastName,grade,isActive",
      staffUsers: "id,email,schoolId,role,isActive,firstName,lastName",
    });
  }
}

export const db = new SchoolManagementDb();
