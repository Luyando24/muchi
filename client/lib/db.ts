import Dexie, { Table } from "dexie";
import type {
  Task,
  MilitaryUnit,
  MilitaryBase,
  Personnel,
  SyncQueueItem,
} from "@shared/api";

export class ZAMSADb extends Dexie {
  militaryUnits!: Table<MilitaryUnit, string>;
  militaryBases!: Table<MilitaryBase, string>;
  personnel!: Table<Personnel, string>;
  tasks!: Table<Task, string>;
  syncQueue!: Table<SyncQueueItem, string>;

  constructor() {
    super("zamsa_db_v1");
    this.version(1).stores({
      tasks: "id,taskNumber,unitId,assigneeId,status,updatedAt",
      syncQueue: "id,createdAt",
    });
    this.version(2).stores({
      militaryUnits: "id,code,name,district,province",
      militaryBases: "id,code,name,district,province,isHeadquarters",
      personnel: "id,email,unitId,baseId,role,isActive,serviceNumber",
    });
  }
}

export const db = new ZAMSADb();
