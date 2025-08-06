"use client";

import React from "react";

import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Hospital, User, Lock, KeyRound } from "lucide-react";
import { useAuth } from "../components/auth-context";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [twoFACode, setTwoFACode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTwoFA, setShowTwoFA] = useState(false);
  const [tempSessionId, setTempSessionId] = useState("");
  const [useCombinedLogin, setUseCombinedLogin] = useState(false);
  const { login, verify2FA, loginWithTwoFA } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (useCombinedLogin && twoFACode) {
        // Combined login with 2FA code
        const success = await loginWithTwoFA(username, password, twoFACode);
        if (!success) {
          setError("Invalid credentials or 2FA code");
        }
      } else {
        // Standard two-step login
        const result = await login(username, password);
        if (!result.success) {
          setError("Invalid username or password");
        } else if (result.needsSetup) {
          // 2FA setup required - user will be redirected by main app
          setError(""); // Clear any previous errors
          // The main app will detect the user has twoFactorEnabled: false and show setup
        } else if (result.requires2FA && result.tempSessionId) {
          // 2FA required
          setTempSessionId(result.tempSessionId);
          setShowTwoFA(true);
          setError(""); // Clear any previous errors
        }
      }
      // If success and no 2FA, user will be redirected by auth context
    } catch (err) {
      console.error(err);
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle the case where we detect basic-auth session ID
  const handleBasicAuthTransition = async () => {
    setError("");
    setLoading(true);

    try {
      // Call the transition endpoint to get a new 2FA session
      const response = await fetch(
        "https://localhost:8443/api/auth/2fa/transition",
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${btoa(`${username}:${password}`)}`,
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      if (response.ok && data.success && data.requires2FA) {
        // Got new 2FA session, show 2FA input
        setTempSessionId(data.tempSessionId);
        setShowTwoFA(true);
        setError("");
      } else if (response.ok && data.success && !data.requires2FA) {
        // User doesn't have 2FA enabled
        setError("User does not have 2FA enabled");
      } else {
        setError("Failed to create 2FA session. Please try again.");
      }
    } catch (err) {
      console.error("Basic auth transition error:", err);
      setError("Failed to transition to 2FA. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Check if we need to show 2FA for basic-auth session
  useEffect(() => {
    const sessionData = localStorage.getItem("medical-app-session");
    if (sessionData) {
      const session = JSON.parse(sessionData);
      if (session.sessionId === "basic-auth" && username && password) {
        // We have basic-auth session and credentials, trigger transition
        handleBasicAuthTransition();
      }
    }
  }, [username, password]);

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const success = await verify2FA(tempSessionId, twoFACode);
      if (!success) {
        setError("Invalid 2FA code. Please try again.");
      }
      // If successful, user will be redirected by auth context
    } catch (err) {
      console.error(err);
      setError("2FA verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setShowTwoFA(false);
    setTwoFACode("");
    setTempSessionId("");
    setError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
            <Hospital className="h-6 w-6 text-primary-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Medical Portal</CardTitle>
          <CardDescription>
            Secure access for healthcare professionals
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showTwoFA ? (
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

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="combinedLogin"
                    checked={useCombinedLogin}
                    onChange={(e) => setUseCombinedLogin(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="combinedLogin" className="text-sm">
                    I have my 2FA code ready (single-step login)
                  </Label>
                </div>
              </div>

              {useCombinedLogin && (
                <div className="space-y-2">
                  <Label htmlFor="twoFACodeLogin">2FA Code</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="twoFACodeLogin"
                      type="text"
                      placeholder="123456"
                      value={twoFACode}
                      onChange={(e) =>
                        setTwoFACode(
                          e.target.value.replace(/\D/g, "").slice(0, 6),
                        )
                      }
                      className="pl-10 text-center text-lg tracking-widest"
                      maxLength={6}
                      required={useCombinedLogin}
                    />
                  </div>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={
                  loading || (useCombinedLogin && twoFACode.length !== 6)
                }
              >
                {loading
                  ? "Signing in..."
                  : useCombinedLogin
                    ? "Sign In with 2FA"
                    : "Sign In"}
              </Button>

              {useCombinedLogin && (
                <p className="text-xs text-gray-600 text-center">
                  This will automatically include your 2FA code in the request
                  headers
                </p>
              )}
            </form>
          ) : (
            <form onSubmit={handle2FASubmit} className="space-y-4">
              <div className="text-center mb-4">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <KeyRound className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold">
                  Two-Factor Authentication
                </h3>
                <p className="text-sm text-gray-600">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="twoFACode">Authentication Code</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="twoFACode"
                    type="text"
                    placeholder="123456"
                    value={twoFACode}
                    onChange={(e) =>
                      setTwoFACode(
                        e.target.value.replace(/\D/g, "").slice(0, 6),
                      )
                    }
                    className="pl-10 text-center text-lg tracking-widest"
                    maxLength={6}
                    required
                  />
                </div>
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || twoFACode.length !== 6}
                >
                  {loading ? "Verifying..." : "Verify Code"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleBackToLogin}
                  disabled={loading}
                >
                  Back to Login
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
