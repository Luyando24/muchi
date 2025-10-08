import React, { useEffect, useMemo, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { db } from "@/lib/db";
import type { LabTest, Patient, Hospital } from "@shared/api";
import QRCodeCard from "@/components/QRCodeCard";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import PatientProfileNav from "@/components/navigation/PatientProfileNav";
import VitalsModal from "@/components/patient/VitalsModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, Clock, CircleDashed, XCircle } from "lucide-react";
import { handleError, withErrorHandling } from "@/lib/errors";

export default function PatientRecord() {
  const { patientId } = useParams();
  const location = useLocation();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [tests, setTests] = useState<LabTest[]>([]);
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const { session } = useAuth();

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!patientId) return;
      const p = await db.patients.get(patientId);
      if (!cancelled) {
        setPatient(p || null);
        setFirstName(p?.firstName || "");
        setLastName(p?.lastName || "");
        setLoading(false);
        
        // Show welcome message if coming from QR scan (check URL params or referrer)
        const urlParams = new URLSearchParams(window.location.search);
        const fromQRScan = urlParams.get('fromQRScan') === 'true';
        if (p && !hasShownWelcome && (fromQRScan || document.referrer.includes('/scan'))) {
          setTimeout(() => {
            toast({
              title: "Patient Record Loaded",
              description: `Welcome! Viewing ${p.firstName} ${p.lastName}'s medical record.`,
              duration: 4000,
              className: "bg-green-50 border-green-200 text-green-800",
            });
          }, 100);
          setHasShownWelcome(true);
        }
      }
      if (p?.id) {
        const list = await Api.listPatientTests(p.id);
        if (!cancelled) setTests(list.items);
      }
      
      // Fetch hospital information if available
      if (session?.hospitalId) {
        const h = await db.hospitals.get(session.hospitalId);
        if (!cancelled) setHospital(h || null);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [patientId, location.state, hasShownWelcome]);

  const refreshTests = async () => {
    if (!patient) return;
    const list = await Api.listPatientTests(patient.id);
    setTests(list.items);
  };

  const save = async () => {
    if (!patient) return;
    
    const result = await withErrorHandling(async () => {
      const updated = await Api.upsertPatient({
        patient: { id: patient.id, nrc: patient.nrc, firstName, lastName },
      });
      setPatient(updated.patient);
      return updated.patient;
    }, "Save Patient");
  };

  const createVitals = async () => {
    if (!patient || !session?.hospitalId) return;
    setIsVitalsModalOpen(true);
  };

  const handleVitalsRecorded = () => {
    refreshTests();
    toast({
      title: "Vitals Recorded",
      description: "The new vital signs have been saved.",
      className: "bg-green-50 border-green-200 text-green-800",
    });
  };

  const statusBadge = useMemo(
    () => ({
      ordered: (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" /> ordered
        </Badge>
      ),
      in_progress: (
        <Badge variant="outline" className="gap-1">
          <CircleDashed className="h-3 w-3" /> in progress
        </Badge>
      ),
      completed: (
        <Badge className="gap-1">
          <CheckCircle2 className="h-3 w-3" /> completed
        </Badge>
      ),
      cancelled: (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" /> cancelled
        </Badge>
      ),
    }),
    [],
  );

  if (loading) return <div className="p-6">Loading...</div>;
  if (!patient) return <div className="p-6">Patient not found</div>;

  return (
    <>
      <PatientProfileNav patientId={patient.id} />
      <div className="p-6 grid gap-6 md:grid-cols-2">
      <QRCodeCard 
        patient={patient} 
        hospitalName={hospital?.name || "Digital Health Hospital"}
      />
      <Card>
        <CardHeader>
          <CardTitle>Patient Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm">First Name</label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm">Last Name</label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={save}>Save</Button>
            <Button variant="secondary" onClick={createVitals}>
              Record Vitals
            </Button>
            <Button variant="outline" onClick={refreshTests}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Vital Tests & Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead className="text-right">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground"
                  >
                    No tests yet
                  </TableCell>
                </TableRow>
              ) : null}
              {tests.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.type}</TableCell>
                  <TableCell>{statusBadge[t.status]}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {t.resultSummary || "—"}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {new Date(t.updatedAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {session?.hospitalId && (
        <VitalsModal
          isOpen={isVitalsModalOpen}
          onClose={() => setIsVitalsModalOpen(false)}
          patientId={patient.id}
          hospitalId={session.hospitalId}
          onVitalsRecorded={handleVitalsRecorded}
        />
      )}
    </div>
    </>
  );
}
