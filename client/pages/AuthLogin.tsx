import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Api } from "@shared/api";
import { saveSession, useAuth } from "@/lib/auth";
import { handleError, validateEmail, validateRequired } from "@/lib/errors";
import { School } from "lucide-react";

export default function AuthLogin() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState<"staff" | "student" | "parent">("staff");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Redirect if already logged in
  useEffect(() => {
    if (session) {
      navigate("/dashboard");
    }
  }, [session, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      validateRequired(email, "Email");
      validateRequired(password, "Password");
      
      if (!validateEmail(email)) {
        throw new Error("Please enter a valid email address");
      }
      
      const session = await Api.login({ email, password, userType });
      saveSession(session);
      
      // Navigate based on user role
      if (session.role === "student") {
        navigate("/student-portal");
      } else {
        navigate("/dashboard");
      }
    } catch (e: any) {
      const errorMessage = String(e?.message || e);
      setError(errorMessage);
      handleError(e, "Login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mb-4">
            <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-3">
              <School className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-primary mb-1">School Management System</h1>
            <p className="text-sm text-muted-foreground">Zambia Education Portal</p>
          </div>
          <CardTitle>Sign In</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2 mb-4">
            <Button 
              type="button" 
              variant={userType === "staff" ? "default" : "outline"} 
              className="flex-1"
              onClick={() => setUserType("staff")}
            >
              Staff
            </Button>
            <Button 
              type="button" 
              variant={userType === "student" ? "default" : "outline"} 
              className="flex-1"
              onClick={() => setUserType("student")}
            >
              Student
            </Button>
            <Button 
              type="button" 
              variant={userType === "parent" ? "default" : "outline"} 
              className="flex-1"
              onClick={() => setUserType("parent")}
            >
              Parent
            </Button>
          </div>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label className="text-sm" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={userType === "student" ? "student.id@school.edu.zm" : "your.email@example.com"}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <div className="mt-4 text-sm text-center text-muted-foreground">
            New to the system?{" "}
            <Link className="text-primary hover:underline" to="/register">
              Register your school
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
