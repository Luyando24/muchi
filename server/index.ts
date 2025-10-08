import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleLogin, handlePatientLogin, handlePatientAlternativeLogin, handleRegisterStaff } from "./routes/auth";
import {
  handleSearchResident,
  handleRegisterResident,
  handleUpsertResident,
  handleListResidents,
} from "./routes/residents";
import {
  handleCreateCase,
  handleListCases,
  handleUpdateCase,
  handleGetCase,
  handleDeleteCase,
  handleGetCaseStats,
} from "./routes/cases";
import {
  handleCreatePermit,
  handleListPermits,
  handleUpdatePermit,
  handleGetPermit,
  handleDeletePermit,
  handleGetPermitStats,
  handleCreateVisa,
  handleListVisas,
  handleCheckPermitValidity,
} from "./routes/permits";
import { 
  handleCreateWebsite, 
  handleGetWebsite, 
  handleUpdateWebsite, 
  handlePublishWebsite,
  handleListThemes,
  handleListPages,
  handleGetPage,
  handleUpdatePage
} from "./routes/websites";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
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
  app.post("/api/auth/patient-login", handlePatientLogin);
  app.post("/api/auth/patient-alternative-login", handlePatientAlternativeLogin);
  app.post("/api/auth/register-staff", handleRegisterStaff);

  // Resident routes
  app.post("/api/residents/search", handleSearchResident);
  app.post("/api/residents/register", handleRegisterResident);
  app.post("/api/residents", handleUpsertResident);
  app.get("/api/residents", handleListResidents);

  // Military Case routes
  app.post("/api/cases", handleCreateCase);
  app.get("/api/cases", handleListCases);
  app.put("/api/cases/:caseId", handleUpdateCase);
  app.get("/api/cases/:caseId", handleGetCase);
  app.delete("/api/cases/:caseId", handleDeleteCase);
  app.get("/api/cases/stats", handleGetCaseStats);

  // Immigration Permit routes
  app.post("/api/permits", handleCreatePermit);
  app.get("/api/permits", handleListPermits);
  app.put("/api/permits/:permitId", handleUpdatePermit);
  app.get("/api/permits/:permitId", handleGetPermit);
  app.delete("/api/permits/:permitId", handleDeletePermit);
  app.get("/api/permits/stats", handleGetPermitStats);
  app.get("/api/permits/:permitNumber/validity", handleCheckPermitValidity);

  // Visa routes (subset of permits)
  app.post("/api/visas", handleCreateVisa);
  app.get("/api/visas", handleListVisas);

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

  return app;
}
