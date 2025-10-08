import React from "react";
import type { Patient } from "@shared/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, Download } from "lucide-react";

interface Props {
  patient: Patient;
}

export default function PatientInfoCard({ patient }: Props) {
  const downloadQR = () => {
    if (!patient.cardQrData) return;
    const a = document.createElement("a");
    a.href = patient.cardQrData;
    a.download = `qr-${patient.cardId}.png`;
    a.click();
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Patient Information</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={downloadQR}>
            <QrCode className="h-4 w-4 mr-1" /> Download QR Code
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid md:grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-muted-foreground">Full Name</div>
          <div className="font-medium">
            {[patient.firstName, patient.lastName].filter(Boolean).join(" ") ||
              "—"}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">NRC Number</div>
          <div className="font-mono">{patient.nrc}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Phone</div>
          <div>{patient.phone || "—"}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Email</div>
          <div>{"—"}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Date of Birth</div>
          <div>{patient.dob || "—"}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Address</div>
          <div>{patient.address || "—"}</div>
        </div>
      </CardContent>
    </Card>
  );
}
