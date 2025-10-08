import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { FileText, Activity, Calendar, Settings, ArrowLeft } from "lucide-react";

interface PatientProfileNavProps {
  patientId: string;
}

export default function PatientProfileNav({ patientId }: PatientProfileNavProps) {
  const { session } = useAuth();
  const isClinicStaff = session?.role !== "patient";
  
  // Define navigation items based on user role
  const navItems = isClinicStaff 
    ? [
        { to: `/clinic/patient/${patientId}`, label: "Overview", icon: <FileText className="h-4 w-4 mr-2" /> },
        { to: `/clinic/patient/${patientId}/tests`, label: "Lab Tests", icon: <Activity className="h-4 w-4 mr-2" /> },
        { to: `/clinic/patient/${patientId}/appointments`, label: "Appointments", icon: <Calendar className="h-4 w-4 mr-2" /> },
      ]
    : [
        { to: `/portal/profile`, label: "My Profile", icon: <FileText className="h-4 w-4 mr-2" /> },
        { to: `/portal/tests`, label: "My Tests", icon: <Activity className="h-4 w-4 mr-2" /> },
        { to: `/portal/appointments`, label: "My Appointments", icon: <Calendar className="h-4 w-4 mr-2" /> },
      ];

  return (
    <div className="sticky top-0 z-40 bg-background/70 backdrop-blur border-b mb-6">
      <div className="container mx-auto">
        <div className="flex items-center py-2">
          <Button variant="ghost" size="sm" asChild className="mr-4">
            <Link to={isClinicStaff ? "/clinic/patients" : "/portal"}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {isClinicStaff ? "Back to Patients" : "Back to Portal"}
            </Link>
          </Button>
          
          <nav className="flex items-center space-x-1 overflow-x-auto">
            {navItems.map((item) => (
              <Button 
                key={item.to} 
                variant="ghost" 
                size="sm" 
                asChild
              >
                <Link to={item.to} className="flex items-center">
                  {item.icon}
                  {item.label}
                </Link>
              </Button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}