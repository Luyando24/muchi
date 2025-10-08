import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Api } from "@/lib/api";
import { saveSession } from "@/lib/auth";
import { useNavigate, Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { handleError, validateStaffData } from "@/lib/errors";

export default function Register() {
  const [departmentName, setDepartmentName] = useState("");
  const [departmentType, setDepartmentType] = useState<"military" | "immigration">("military");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [badgeNumber, setBadgeNumber] = useState("");
  const [rank, setRank] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      validateStaffData({ email, password, firstName, lastName });
      
      const res = await Api.registerOfficer({
        stationName: departmentType === "military" ? departmentName : undefined,
        immigrationOfficeName: departmentType === "immigration" ? departmentName : undefined,
        email,
        password,
        firstName,
        lastName,
        badgeNumber,
        rank,
        role: "admin",
      });
      saveSession({
        userId: res.userId,
        role: "admin",
        stationId: res.stationId,
        immigrationOfficeId: res.immigrationOfficeId,
        tokens: { accessToken: res.userId, expiresInSec: 3600 },
      });
      
      // Navigate based on department type
      if (departmentType === "military") {
        navigate("/military");
      } else {
        navigate("/immigration");
      }
    } catch (e: any) {
      const errorMessage = String(e?.message || e);
      setError(errorMessage);
      handleError(e, "Staff Registration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mb-4">
            <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-3">
              <span className="text-2xl font-bold text-white">I</span>
            </div>
            <h1 className="text-2xl font-bold text-primary mb-1">ZAMSA</h1>
            <p className="text-sm text-muted-foreground">Zambia Military & Security Application</p>
          </div>
          <CardTitle>Register Department/Office</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={submit}>
            <div className="space-y-1">
              <label htmlFor="department-type" className="text-sm">
                Department Type
              </label>
              <select
                id="department-type"
                value={departmentType}
                onChange={(e) => setDepartmentType(e.target.value as "military" | "immigration")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="military">Military Unit</option>
                <option value="immigration">Immigration Office</option>
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="department" className="text-sm">
                {departmentType === "military" ? "Military Unit Name" : "Immigration Office Name"}
              </label>
              <Input
                id="department"
                value={departmentName}
                onChange={(e) => setDepartmentName(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm" htmlFor="first">
                  First Name
                </label>
                <Input
                  id="first"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm" htmlFor="last">
                  Last Name
                </label>
                <Input
                  id="last"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm" htmlFor="badge">
                  Service Number
                </label>
                <Input
                  id="badge"
                  value={badgeNumber}
                  onChange={(e) => setBadgeNumber(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm" htmlFor="rank">
                  Rank (Optional)
                </label>
                <Input
                  id="rank"
                  value={rank}
                  onChange={(e) => setRank(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm" htmlFor="email">
                Official Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm" htmlFor="pass">
                Password
              </label>
              <Input
                id="pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Registering..." : "Register Department"}
            </Button>
            <div className="text-sm text-center text-muted-foreground">
              Already have an account?{" "}
              <Link className="underline" to="/login">
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
