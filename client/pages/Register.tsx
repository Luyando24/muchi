import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Api } from "@/lib/api";
import { saveSession } from "@/lib/auth";
import { useNavigate, Link } from "react-router-dom";
import { School } from "lucide-react";
import { handleError, validateStaffData } from "@/lib/errors";

export default function Register() {
  const [schoolName, setSchoolName] = useState("");
  const [schoolType, setSchoolType] = useState<"primary" | "secondary" | "college">("secondary");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match");
      }
      
      validateStaffData({ email, password, firstName, lastName });
      
      const res = await Api.registerSchool({
        schoolName,
        schoolType,
        email,
        password,
        firstName,
        lastName,
        phoneNumber,
        role: "admin",
      });
      
      saveSession({
        userId: res.userId,
        role: "admin",
        schoolId: res.schoolId,
        tokens: { accessToken: res.userId, expiresInSec: 3600 },
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
                    variant={schoolType === "college" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setSchoolType("college")}
                  >
                    College
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

              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
                <Input
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Input
                  placeholder="Phone Number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Confirm Password"
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
