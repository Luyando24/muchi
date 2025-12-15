import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Api } from "@/lib/api";
import { saveSession } from "@/lib/auth";
import { useNavigate, Link } from "react-router-dom";
import { School } from "lucide-react";
import { handleError, validateEmail, validateRequired } from "@/lib/errors";

export default function Register() {
  const [schoolName, setSchoolName] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [schoolType, setSchoolType] = useState<"primary" | "secondary" | "combined">("secondary");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("");
  const [province, setProvince] = useState("");
  const [isGovernment, setIsGovernment] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      if (adminPassword !== confirmPassword) {
        throw new Error("Passwords do not match");
      }

      validateRequired(schoolName, "School Name");
      validateRequired(schoolCode, "School Code");
      validateRequired(address, "Address");
      validateRequired(district, "District");
      validateRequired(province, "Province");
      validateRequired(adminFirstName, "First Name");
      validateRequired(adminLastName, "Last Name");
      validateRequired(adminEmail, "Email");
      validateRequired(adminPassword, "Password");

      if (!validateEmail(adminEmail)) {
        throw new Error("Please enter a valid email address");
      }
      
      const res = await Api.registerSchool({
        schoolName,
        schoolCode,
        schoolType: schoolType as "primary" | "secondary" | "combined",
        address,
        district,
        province,
        isGovernment,
        adminFirstName: adminFirstName,
        adminLastName: adminLastName,
        adminEmail: adminEmail,
        adminPassword: adminPassword,
      });
      
      saveSession({
        userId: res.adminUserId,
        role: "admin",
        schoolId: res.schoolId,
        tokens: { accessToken: res.adminUserId, expiresInSec: 3600 },
      });
      
      navigate("/dashboard");
    } catch (e: any) {
      const errorMessage = String(e?.message || e);
      setError(errorMessage);
      handleError(e, "School Registration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-4 flex items-center justify-center">
          <School className="h-10 w-10 text-primary" />
          <h1 className="ml-2 text-2xl font-bold text-primary">School Management System</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Register Your School</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <div className="flex w-full space-x-2">
                  <Button
                    type="button"
                    variant={schoolType === "primary" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setSchoolType("primary")}
                  >
                    Primary School
                  </Button>
                  <Button
                    type="button"
                    variant={schoolType === "secondary" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setSchoolType("secondary")}
                  >
                    Secondary School
                  </Button>
                  <Button
                    type="button"
                    variant={schoolType === "combined" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setSchoolType("combined")}
                  >
                    Combined School
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Input
                  placeholder="School Name"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Input
                  placeholder="School Code"
                  value={schoolCode}
                  onChange={(e) => setSchoolCode(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Input
                  placeholder="Address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="District"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  required
                />
                <Input
                  placeholder="Province"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isGovernment"
                  checked={isGovernment}
                  onChange={(e) => setIsGovernment(e.target.checked)}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="isGovernment" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Government School
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Admin First Name"
                  value={adminFirstName}
                  onChange={(e) => setAdminFirstName(e.target.value)}
                  required
                />
                <Input
                  placeholder="Admin Last Name"
                  value={adminLastName}
                  onChange={(e) => setAdminLastName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="Admin Email Address"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Admin Password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Confirm Admin Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              {error && <div className="text-sm text-red-500">{error}</div>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Registering..." : "Register School"}
              </Button>

              <div className="text-center text-sm">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline">
                  Login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
        <div className="mt-4 text-center text-xs text-gray-500">
          Zambia Education Portal &copy; {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
