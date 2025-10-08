import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Api } from "@/lib/api";
import { saveSession, useAuth } from "@/lib/auth";
import type { LabTest, Patient } from "@shared/api";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Copy,
  Download,
  IdCard,
  LogOut,
  QrCode,
  CalendarDays,
  FileText,
  Settings,
  Home,
  Brain,
  Sparkles,
} from "lucide-react";
import PatientInfoCard from "@/components/patient/PatientInfoCard";
import UpcomingAppointments from "@/components/patient/UpcomingAppointments";
import PatientTestResults from "@/components/patient/PatientTestResults";
import TopNav from "@/components/navigation/TopNav";
import BottomNav from "@/components/navigation/BottomNav";

export default function PatientPortal() {
  const { session, setSession } = useAuth();
  const [hospitalCardId, setHospitalCardId] = useState("");
  const [dob, setDob] = useState("");
  const [loginMethod, setLoginMethod] = useState<"card" | "alternative">("card");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [tests, setTests] = useState<LabTest[]>([]);
  const [show, setShow] = useState<"qr" | "id" | null>(null);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      let s;
      if (loginMethod === "card") {
        s = await Api.patientLogin({ hospitalCardId });
      } else {
        s = await Api.patientAlternativeLogin({ email, phone, password });
      }
      saveSession(s);
      setSession(s as any);
      if (s.patientId) load(s.patientId);
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  };

  const load = async (patientId: string) => {
    const p = await db.patients.get(patientId);
    setPatient(p || null);
    const list = await Api.listPatientTests(patientId);
    setTests(list.items);
  };

  const bookAppointment = async () => {
    if (!patient) return;
    const when = new Date();
    when.setDate(when.getDate() + 1);
    await db.appointments.add({
      id: crypto.randomUUID(),
      patientId: patient.id,
      hospitalId: "local",
      scheduledFor: when.toISOString(),
      reason: "Check-up",
      status: "scheduled",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any);
  };

  useEffect(() => {
    if (session?.patientId) load(session.patientId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.patientId]);

  if (!session?.patientId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mb-4">
              <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-3">
                <span className="text-2xl font-bold text-white">F</span>
              </div>
              <h1 className="text-2xl font-bold text-primary mb-1">Flova</h1>
              <p className="text-sm text-muted-foreground">Digital Health Platform</p>
            </div>
            <CardTitle>Patient Login</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant={loginMethod === "card" ? "default" : "outline"}
                  onClick={() => setLoginMethod("card")}
                  className="flex-1"
                >
                  Hospital Card
                </Button>
                <Button
                  type="button"
                  variant={loginMethod === "alternative" ? "default" : "outline"}
                  onClick={() => setLoginMethod("alternative")}
                  className="flex-1"
                >
                  Email/Phone
                </Button>
              </div>
              
              <form className="space-y-4" onSubmit={login}>
                {loginMethod === "card" ? (
                  <>
                    <div className="space-y-1">
                      <label className="text-sm" htmlFor="hospitalCardId">
                        Hospital Card ID
                      </label>
                      <Input
                        id="hospitalCardId"
                        value={hospitalCardId}
                        onChange={(e) => setHospitalCardId(e.target.value.toUpperCase())}
                        placeholder="Enter 6-character ID"
                        maxLength={6}
                        required
                      />
                    </div>

                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="text-sm" htmlFor="email">
                        Email (optional)
                      </label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm" htmlFor="phone">
                        Phone (optional)
                      </label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Enter your phone number"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm" htmlFor="password">
                        Password
                      </label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Note: You must provide either email or phone number along with your password.
                    </div>
                  </>
                )}
                {error && <div className="text-sm text-red-600">{error}</div>}
                <Button type="submit" className="w-full">
                  Sign In
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!patient) return <div className="p-6">Loading...</div>;

  const logout = () => {
    localStorage.clear();
    window.dispatchEvent(new CustomEvent("auth:changed"));
    setSession(null as any);
  };

  return (
    <div className="pb-16 md:pb-0">
      <TopNav
        items={[
          { to: "/portal", label: "Portal" },
          { to: "/portal#digital-card", label: "Card" },
          { to: "/portal#appointments", label: "Appointments" },
          { to: "/portal#test-results", label: "Tests" },
          { to: "/portal/health-assistant", label: "AI Assistant" },
        ]}
        onLogout={logout}
      />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Patient Portal</h1>
        </div>

        {/* AI Health Assistant CTA */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <Brain className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                    My Personal Health Assistant
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    AI-powered support for sexual health, mental wellness, and personalized insights
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => window.location.href = '/portal/health-assistant'}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Get Started
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2" id="digital-card">
            <Card>
              <CardHeader>
                <CardTitle>My Digital Card</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant={show === "qr" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShow("qr")}
                  >
                    <QrCode className="h-4 w-4 mr-1" /> Show QR
                  </Button>
                  <Button
                    variant={show === "id" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShow("id")}
                  >
                    <IdCard className="h-4 w-4 mr-1" /> Show ID
                  </Button>
                </div>
                {show === null ? (
                  <div className="text-sm text-muted-foreground">
                    Select an option above to reveal your digital card or ID.
                  </div>
                ) : show === "qr" ? (
                  <div className="flex flex-col items-center gap-3">
                    {patient.cardQrData ? (
                      <img
                        src={patient.cardQrData}
                        alt="Patient QR"
                        className="h-48 w-48"
                      />
                    ) : (
                      <div className="h-48 w-48 bg-muted animate-pulse rounded" />
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigator.clipboard.writeText(
                            JSON.stringify({ cardId: patient.cardId }),
                          )
                        }
                      >
                        <Copy className="h-4 w-4 mr-1" /> Copy QR payload
                      </Button>
                      {patient.cardQrData ? (
                        <a
                          href={patient.cardQrData}
                          download={`qr-${patient.cardId}.png`}
                        >
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-1" /> Download QR
                          </Button>
                        </a>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-2">
                    <div className="text-sm text-muted-foreground">
                      Digital ID
                    </div>
                    <div className="text-2xl font-mono">{patient.cardId}</div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigator.clipboard.writeText(patient.cardId)
                      }
                    >
                      <Copy className="h-4 w-4 mr-1" /> Copy ID
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="md:col-span-1">
            <PatientInfoCard patient={patient} />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div id="appointments">
            <UpcomingAppointments patientId={patient.id} />
          </div>
          <div id="test-results">
            <PatientTestResults patientId={patient.id} />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <Button
              variant="outline"
              className="justify-start"
              onClick={bookAppointment}
            >
              <CalendarDays className="h-4 w-4 mr-2 text-primary" /> Book
              Appointment
            </Button>
            <Button variant="outline" className="justify-start">
              <FileText className="h-4 w-4 mr-2 text-primary" /> View Medical
              History
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() =>
                patient.cardQrData && window.open(patient.cardQrData, "_blank")
              }
            >
              <QrCode className="h-4 w-4 mr-2 text-primary" /> Download QR Code
            </Button>
            <Button variant="outline" className="justify-start">
              <Settings className="h-4 w-4 mr-2 text-primary" /> Update Profile
            </Button>
          </CardContent>
        </Card>
      </div>

      <BottomNav
        items={[
          {
            to: "/portal",
            label: "Portal",
            icon: <Home className="h-5 w-5" />,
          },
          {
            to: "/portal#digital-card",
            label: "Card",
            icon: <QrCode className="h-5 w-5" />,
          },
          {
            to: "/portal#appointments",
            label: "Visits",
            icon: <CalendarDays className="h-5 w-5" />,
          },
          {
            to: "/portal/health-assistant",
            label: "AI Health",
            icon: <Brain className="h-5 w-5" />,
          },
        ]}
      />
    </div>
  );
}
