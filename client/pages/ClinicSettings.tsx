import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import TopNav from "@/components/navigation/TopNav";
import { db } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { Api } from "@/lib/api";

export default function ClinicSettings() {
  const { session } = useAuth();
  const [facilityName, setFacilityName] = useState("");
  const [facilityCode, setFacilityCode] = useState("");
  const [facilityPhone, setFacilityPhone] = useState("");
  const [loading, setLoading] = useState(false);

  // Load hospital data on component mount
  useEffect(() => {
    const loadHospital = async () => {
      if (session?.hospitalId) {
        const hospital = await db.hospitals.get(session.hospitalId);
        if (hospital) {
          setFacilityName(hospital.name || "");
          setFacilityCode(hospital.code || "");
          setFacilityPhone(hospital.phone || "");
        }
      }
    };
    loadHospital();
  }, [session]);

  // Save hospital settings
  const saveHospitalSettings = async () => {
    if (!session?.hospitalId) {
      toast({
        title: "Error",
        description: "No hospital ID found in session",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await Api.updateHospital({
        id: session.hospitalId,
        name: facilityName,
        code: facilityCode,
        phone: facilityPhone,
      });

      // Update local database
      await db.hospitals.put(result.hospital);

      toast({
        title: "Settings saved",
        description: "Hospital settings have been updated successfully",
      });
    } catch (error) {
      console.error("Failed to save hospital settings:", error);
      toast({
        title: "Error",
        description: "Failed to save hospital settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-16 md:pb-0">
      <TopNav
        brand="Clinic"
        items={[
          { to: "/clinic", label: "Dashboard" },
          { to: "/clinic/patients", label: "Patients" },
          { to: "/clinic/tests", label: "Tests" },
          { to: "/clinic/settings", label: "Settings" },
        ]}
      />
      <div className="container mx-auto p-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Facility</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm" htmlFor="facility-name">
                Facility name
              </label>
              <Input
                id="facility-name"
                placeholder="e.g., University Teaching Hospital"
                value={facilityName}
                onChange={(e) => setFacilityName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">This name will appear on patient health cards</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm" htmlFor="facility-code">
                Facility code
              </label>
              <Input 
                id="facility-code" 
                placeholder="e.g., UTH-01" 
                value={facilityCode}
                onChange={(e) => setFacilityCode(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm" htmlFor="facility-phone">
                Phone
              </label>
              <Input 
                id="facility-phone" 
                placeholder="e.g., +260 97 000 0000" 
                value={facilityPhone}
                onChange={(e) => setFacilityPhone(e.target.value)}
              />
            </div>
            <Button onClick={saveHospitalSettings} disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Dark mode</div>
                <div className="text-sm text-muted-foreground">
                  Use dark theme for clinic devices
                </div>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Notifications</div>
                <div className="text-sm text-muted-foreground">
                  Enable desktop notifications (appointments, lab results)
                </div>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Auto-sync</div>
                <div className="text-sm text-muted-foreground">
                  Sync data in background when online
                </div>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Data & Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Clear local cache to force re-sync from server.
            </div>
            <Button variant="outline">Clear local data</Button>
            <div className="text-sm text-muted-foreground">
              Export anonymized logs for audit purposes.
            </div>
            <Button variant="outline">Export audit logs</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
