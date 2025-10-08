import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Api } from "@/lib/api";
import { saveSession } from "@/lib/auth";
import { handleError, validateEmail, validateRequired } from "@/lib/errors";

export default function AuthLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      
      const session = await Api.login({ email, password });
      saveSession(session);
      
      // Navigate based on user role
      if (session.role === "military_officer" || session.role === "military_supervisor") {
        navigate("/military");
      } else if (session.role === "immigration_officer") {
        navigate("/immigration");
      } else if (session.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/");
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4">
            <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-3">
              <span className="text-2xl font-bold text-white">I</span>
            </div>
            <h1 className="text-2xl font-bold text-primary mb-1">IPIMS</h1>
            <p className="text-sm text-muted-foreground">Zambia Military & Security Application</p>
          </div>
          <CardTitle>Personnel Login</CardTitle>
        </CardHeader>
        <CardContent>
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
            {error && <div className="text-sm text-red-600">{error}</div>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <div className="mt-4 text-sm text-center text-muted-foreground">
            New unit or office?{" "}
            <a className="underline" href="/register">
              Register your unit
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
