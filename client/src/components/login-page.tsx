import type React from "react";

import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { Shield, User, Lock } from "lucide-react";
import { useAuth } from "./auth-context";
import { TwoFactorSetup } from "./two-factor-setup";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(true);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const success = await login(username, password);
      if (success) {
        setShowTwoFactorSetup(true);
      } else {
        setError("Invalid username or password");
      }
    } catch (err) {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (showTwoFactorSetup) {
    return <TwoFactorSetup onComplete={() => setShowTwoFactorSetup(false)} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
            <Shield className="h-6 w-6 text-primary-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Medical Portal</CardTitle>
          <CardDescription>
            Secure access for healthcare professionals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <div className="mt-6 text-sm text-gray-600">
            <p className="font-semibold mb-2">Demo Credentials:</p>
            <div className="space-y-1 text-xs">
              <p>
                <strong>Admin:</strong> admin / admin123
              </p>
              <p>
                <strong>Doctor:</strong> dr.smith / doctor123
              </p>
              <p>
                <strong>Nurse:</strong> nurse.jane / nurse123
              </p>
              <p>
                <strong>Pharmacist:</strong> pharm.bob / pharm123
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
